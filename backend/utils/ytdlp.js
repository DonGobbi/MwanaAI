const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Keeps yt-dlp current so YouTube transcript fetching keeps working as YouTube
// changes its internals. Best-effort by design: it never blocks server start,
// quietly tolerates being offline, and is throttled so it doesn't run on every
// nodemon restart.

const MARKER = path.join(os.tmpdir(), '.ytdlp-last-update');
const THROTTLE_MS = 20 * 60 * 60 * 1000; // at most ~once a day
const DAY_MS = 24 * 60 * 60 * 1000;

function updatedRecently() {
  try {
    return Date.now() - fs.statSync(MARKER).mtimeMs < THROTTLE_MS;
  } catch (_) {
    return false;
  }
}

function touchMarker() {
  try {
    fs.writeFileSync(MARKER, new Date().toISOString());
  } catch (_) {
    /* ignore */
  }
}

function runUpdate() {
  return new Promise((resolve) => {
    execFile(
      'python3',
      ['-m', 'pip', 'install', '--no-cache-dir', '--break-system-packages', '-U', 'yt-dlp'],
      { timeout: 120000 },
      (error, stdout) => {
        if (error) {
          console.log('[yt-dlp] update skipped:', String(error.message).split('\n')[0]);
          resolve(false);
          return;
        }
        const note =
          (stdout || '')
            .split('\n')
            .map((l) => l.trim())
            .reverse()
            .find((l) => /yt-dlp|already satisfied|Successfully/i.test(l)) || 'checked';
        console.log('[yt-dlp]', note);
        touchMarker();
        resolve(true);
      }
    );
  });
}

// Update on startup (throttled), then once a day for long-running containers.
function scheduleYtDlpUpdates() {
  if (process.env.YTDLP_AUTO_UPDATE === 'false') {
    console.log('[yt-dlp] auto-update disabled (YTDLP_AUTO_UPDATE=false)');
    return;
  }
  if (updatedRecently()) {
    console.log('[yt-dlp] update recently done — skipping for now');
  } else {
    runUpdate();
  }
  const timer = setInterval(runUpdate, DAY_MS);
  if (timer.unref) timer.unref(); // don't keep the process alive just for this
}

module.exports = { scheduleYtDlpUpdates, runUpdate };
