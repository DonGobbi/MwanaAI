const express = require('express');
const router = express.Router();
const { execFile } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

// Fetches the transcript (captions) of a YouTube video so the AI can generate
// lesson plans / quizzes grounded in the video's actual content.
//
// We shell out to yt-dlp, which is actively maintained against YouTube's
// frequent changes (the reason hand-rolled scraping breaks). It runs on the
// server, so the browser's CORS limits don't apply.

// Pull the 11-character video id out of any common YouTube URL (or a bare id).
function parseVideoId(input) {
  if (!input) return null;
  const raw = String(input).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/live\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m) return m[1];
  }
  return null;
}

function run(cmd, args, timeoutMs) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 1024 * 1024 * 16 }, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

// json3 → plain text (events[].segs[].utf8).
function parseJson3(raw) {
  const data = JSON.parse(raw);
  return (data.events || [])
    .filter((e) => e.segs)
    .map((e) => e.segs.map((s) => s.utf8).join(''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// WebVTT → plain text (drop header, timestamps and inline tags).
function parseVtt(raw) {
  const seen = new Set();
  const out = [];
  for (let line of raw.split('\n')) {
    line = line.trim();
    if (!line || line === 'WEBVTT' || line.startsWith('NOTE') || line.startsWith('Kind:') || line.startsWith('Language:')) continue;
    if (line.includes('-->') || /^\d+$/.test(line)) continue;
    const text = line.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    // Auto-captions repeat lines as they scroll — de-dupe consecutive repeats.
    if (text && !seen.has(text)) {
      seen.add(text);
      out.push(text);
    }
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

async function readTranscriptFrom(dir) {
  const files = await fs.readdir(dir);
  // Prefer a real English json3, then any json3, then English vtt, then any vtt.
  const pick = (exts, enOnly) =>
    files.find((f) => exts.some((e) => f.endsWith(e)) && (!enOnly || /\.en\b|\.en[-.]/.test(f)));
  const order = [
    pick(['.json3'], true),
    pick(['.json3'], false),
    pick(['.vtt'], true),
    pick(['.vtt'], false),
  ].filter(Boolean);

  for (const file of order) {
    try {
      const raw = await fs.readFile(path.join(dir, file), 'utf8');
      const text = file.endsWith('.json3') ? parseJson3(raw) : parseVtt(raw);
      if (text && text.length > 20) return text;
    } catch (_) {
      /* try the next candidate */
    }
  }
  return '';
}

async function readTitle(dir) {
  try {
    return (await fs.readFile(path.join(dir, 'title.txt'), 'utf8')).trim();
  } catch (_) {
    return '';
  }
}

/**
 * @route   GET /api/youtube/transcript?url=...
 * @desc    Return the transcript of a YouTube video (via yt-dlp)
 * @access  Public
 */
router.get('/transcript', async (req, res) => {
  const videoId = parseVideoId(req.query.url || req.query.v);
  if (!videoId) {
    return res.status(400).json({ success: false, error: 'Please provide a valid YouTube link.' });
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yt-'));
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      '--quiet',
      '--no-warnings',
      '--no-playlist',
      '--skip-download',
      '--no-simulate',
      '--print-to-file',
      '%(title)s',
      path.join(dir, 'title.txt'),
      '--write-subs',
      '--write-auto-subs',
      '--sub-langs',
      'en.*,en',
      '--sub-format',
      'json3/vtt/best',
      '-o',
      path.join(dir, '%(id)s.%(ext)s'),
      url,
    ];

    // yt-dlp exits non-zero if any one sub variant 429s, even when another
    // succeeded — so we ignore the exit code and check for a usable file.
    const { stderr } = await run('yt-dlp', args, 45000);
    const transcript = await readTranscriptFrom(dir);

    if (!transcript) {
      const reason = /Sign in to confirm|bot/i.test(stderr)
        ? 'YouTube is rate-limiting transcript downloads right now. Please try again in a minute.'
        : 'No captions/transcript could be found for this video.';
      return res.status(404).json({ success: false, error: reason });
    }

    const title = await readTitle(dir);
    const MAX = 16000; // keep the model within its rate limit
    return res.status(200).json({
      success: true,
      videoId,
      title,
      truncated: transcript.length > MAX,
      transcript: transcript.slice(0, MAX),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Could not get the transcript. Please try again.' });
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

module.exports = router;
