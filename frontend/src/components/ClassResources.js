import React, { useState, useEffect, useCallback, useRef } from 'react';
import { resourceService } from '../services/resourceService';
import { extractFromFile } from '../utils/extractText';
import { youtubeService } from '../services/youtubeService';
import ResourceAI from './ResourceAI';
import Spinner from './Spinner';
import EmptyState from './EmptyState';
import {
  FiFolder, FiUploadCloud, FiYoutube, FiFileText, FiImage, FiX, FiPlus, FiChevronDown,
} from 'react-icons/fi';

const KIND_ICON = { image: FiImage, youtube: FiYoutube, file: FiFileText, text: FiFileText };
const KIND_LABEL = {
  youtube: 'Video transcript', image: 'Image', text: 'Notes', file: 'Document',
  lesson: 'Lesson plan', quiz: 'Quiz', notes: 'Revision notes', questions: 'Exam questions',
};

function timeAgo(ts) {
  if (!ts) return '';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

// One resource row the teacher can expand to summarize / ask MwanaAI about it.
const ResourceItem = ({ r, onRemove }) => {
  const [open, setOpen] = useState(false);
  const Icon = KIND_ICON[r.kind] || FiFileText;
  return (
    <li className="py-2.5">
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
          <Icon className="w-4 h-4 text-primary-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
            <p className="text-xs text-gray-400">
              {KIND_LABEL[r.kind] || 'Document'}
              {r.chars ? ` · ${r.chars.toLocaleString()} chars` : ''} · {timeAgo(r.createdAt)}
            </p>
          </div>
          <FiChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={() => onRemove(r.id)} className="text-gray-300 hover:text-red-500 p-1 flex-shrink-0" aria-label="Remove">
          <FiX className="w-4 h-4" />
        </button>
      </div>
      {open && <ResourceAI resource={r} />}
    </li>
  );
};

// Teacher's per-class resource library: add syllabus / notes / a YouTube link /
// pasted text; enrolled students can then read them and the AI can use them.
const ClassResources = ({ cls, teacher }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [paste, setPaste] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setList(await resourceService.listForClass(cls.id));
    } catch (err) {
      console.error('Could not load resources:', err);
    } finally {
      setLoading(false);
    }
  }, [cls.id]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 3500);
  };

  const addFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (e.target) e.target.value = '';
    if (!files.length) return;
    setBusy('file');
    for (const file of files) {
      try {
        const item = await extractFromFile(file);
        await resourceService.add(teacher, cls, {
          title: item.name,
          kind: item.kind === 'image' ? 'image' : 'file',
          sourceName: item.name,
          // Images have no extracted text; note that for students/AI.
          text: item.text || (item.image ? '(image resource — open to view)' : ''),
        });
      } catch (err) {
        flash(err.message || `Could not add "${file.name}".`);
      }
    }
    setBusy('');
    flash('Added ✓');
    load();
  };

  const addYouTube = async () => {
    const url = ytUrl.trim();
    if (!url) return;
    setBusy('yt');
    try {
      const { title, transcript } = await youtubeService.getTranscript(url);
      await resourceService.add(teacher, cls, {
        title: title || 'YouTube video',
        kind: 'youtube',
        sourceName: url,
        text: transcript,
      });
      setYtUrl('');
      flash('Video transcript added ✓');
      load();
    } catch (err) {
      flash(err.message || 'Could not read that video.');
    } finally {
      setBusy('');
    }
  };

  const addPaste = async () => {
    if (!paste.trim()) return;
    setBusy('paste');
    try {
      await resourceService.add(teacher, cls, {
        title: pasteTitle.trim() || 'Pasted notes',
        kind: 'text',
        sourceName: '',
        text: paste,
      });
      setPaste('');
      setPasteTitle('');
      flash('Notes added ✓');
      load();
    } catch (err) {
      flash(err.message || 'Could not add that.');
    } finally {
      setBusy('');
    }
  };

  const remove = async (id) => {
    try {
      await resourceService.remove(id);
      load();
    } catch (err) {
      console.error('Could not remove resource:', err);
    }
  };

  return (
    <div className="card p-5 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <FiFolder className="text-primary-600" />
        <h2 className="font-bold text-gray-900">Class resources</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Add the syllabus, notes, a YouTube link or pasted text. Students in this class can read them,
        and MwanaAI can use them to help.
      </p>

      {/* Add controls */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Upload */}
        <input ref={fileRef} type="file" multiple onChange={addFiles}
          accept="image/*,.pdf,.docx,.txt,.md,.csv" className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy === 'file'}
          className="border-2 border-dashed border-gray-200 hover:border-primary-300 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition-colors disabled:opacity-60">
          {busy === 'file' ? <Spinner className="w-5 h-5" label="Reading…" /> : <FiUploadCloud className="w-6 h-6" />}
          <span>Upload files</span>
          <span className="text-xs text-gray-400">PDF, Word, images, text</span>
        </button>

        {/* YouTube + paste */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-lg border border-gray-300 px-2 min-w-0 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
              <FiYoutube className="text-red-600 flex-shrink-0" />
              <input value={ytUrl} onChange={(e) => setYtUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addYouTube(); } }}
                placeholder="Add a YouTube link" className="flex-1 border-0 focus:ring-0 text-sm py-2 bg-transparent min-w-0" />
            </div>
            <button type="button" onClick={addYouTube} disabled={busy === 'yt' || !ytUrl.trim()}
              className="bg-secondary-600 hover:bg-secondary-700 disabled:opacity-50 text-white text-sm font-medium px-3 rounded-lg transition-colors flex-shrink-0">
              {busy === 'yt' ? <Spinner className="w-4 h-4" /> : 'Add'}
            </button>
          </div>
          <input value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)}
            placeholder="Title for pasted notes (optional)"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
          <div className="flex gap-2">
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={2}
              placeholder="…or paste notes/text to share"
              className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
            <button type="button" onClick={addPaste} disabled={busy === 'paste' || !paste.trim()}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-3 rounded-lg transition-colors flex-shrink-0 self-stretch inline-flex items-center gap-1">
              {busy === 'paste' ? <Spinner className="w-4 h-4" /> : <><FiPlus /> Add</>}
            </button>
          </div>
        </div>
      </div>

      {msg && <p className={`text-xs mt-2 ${msg.includes('✓') ? 'text-green-600' : 'text-amber-600'}`}>{msg}</p>}

      {/* List */}
      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : list.length === 0 ? (
          <EmptyState compact icon={FiFolder} title="No resources yet"
            description="Add your first resource above to share it with this class." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map((r) => <ResourceItem key={r.id} r={r} onRemove={remove} />)}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ClassResources;
