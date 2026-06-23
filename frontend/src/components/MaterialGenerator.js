import React, { useState, useRef } from 'react';
import { materialService, OUTPUT_TYPES } from '../services/materialService';
import { extractFromFile } from '../utils/extractText';
import { youtubeService } from '../services/youtubeService';
import { useDictation } from '../hooks/useDictation';
import { SUBJECTS, GRADE_LEVELS, getSubject, getGradeLevel } from '../config/curriculum';
import { printDoc } from '../utils/printReport';
import Markdown from './Markdown';
import Spinner from './Spinner';
import { FiUploadCloud, FiFileText, FiImage, FiX, FiMic, FiPrinter, FiZap, FiYoutube } from 'react-icons/fi';

const KIND_ICON = { image: FiImage, youtube: FiYoutube };

// Generate lesson plans / quizzes / notes GROUNDED in the teacher's own
// materials — uploaded textbook pages, the syllabus, screenshots or notes.
const MaterialGenerator = () => {
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('form-2');
  const [outputType, setOutputType] = useState('lesson');
  const [count, setCount] = useState(10);

  const [materials, setMaterials] = useState([]); // { kind, name, text, image }
  const [pasted, setPasted] = useState('');
  const [instructions, setInstructions] = useState('');

  const [ytUrl, setYtUrl] = useState('');
  const [ytLoading, setYtLoading] = useState(false);
  const [ytMsg, setYtMsg] = useState('');

  const [reading, setReading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const fileRef = useRef(null);
  const dictation = useDictation({
    onText: (t) => setInstructions(t),
  });

  const needsCount = outputType === 'quiz' || outputType === 'questions';

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (e.target) e.target.value = '';
    if (!files.length) return;
    setError('');
    setReading(true);
    for (const file of files) {
      try {
        const item = await extractFromFile(file);
        setMaterials((prev) => [...prev, item]);
      } catch (err) {
        setError(err.message || `Could not read "${file.name}".`);
      }
    }
    setReading(false);
  };

  const removeMaterial = (idx) => setMaterials((prev) => prev.filter((_, i) => i !== idx));

  const addYouTube = async () => {
    const url = ytUrl.trim();
    if (!url) return;
    setYtMsg('');
    setYtLoading(true);
    try {
      const { title, transcript, truncated } = await youtubeService.getTranscript(url);
      setMaterials((prev) => [
        ...prev,
        { kind: 'youtube', name: title || 'YouTube video', text: transcript },
      ]);
      setYtUrl('');
      setYtMsg(truncated ? 'Added ✓ (long video — transcript shortened)' : 'Transcript added ✓');
    } catch (err) {
      setYtMsg(err.message || 'Could not read that video.');
    } finally {
      setYtLoading(false);
    }
  };

  const generate = async () => {
    setError('');
    if (!subject) {
      setError('Pick a subject first.');
      return;
    }
    // Fold any pasted text in as one more source.
    const all = [...materials];
    if (pasted.trim()) all.push({ kind: 'text', name: 'Pasted notes', text: pasted.trim() });
    if (all.length === 0 && !instructions.trim()) {
      setError('Add some material — upload a file, paste text, or say what to cover.');
      return;
    }
    if (dictation.listening) dictation.stop();

    setLoading(true);
    setResult('');
    try {
      const out = await materialService.generate({
        outputType,
        instructions,
        subject: getSubject(subject)?.label || subject,
        level: getGradeLevel(level)?.label || level,
        count,
        materials: all,
      });
      setResult(out);
    } catch (err) {
      setError(err.message || 'Could not generate that.');
    } finally {
      setLoading(false);
    }
  };

  const outputLabel = OUTPUT_TYPES.find((o) => o.value === outputType)?.label || 'Document';

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <FiZap className="text-primary-600" />
        <h2 className="font-bold text-gray-900">Generate from your materials</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Upload the syllabus, textbook pages, a screenshot or notes, paste text, or drop in a
        <strong> YouTube link</strong> — MwanaAI builds a lesson plan, quiz or revision notes
        <strong> from your material</strong>, not out of the blue.
      </p>

      {/* Subject / level / output */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <select value={subject} onChange={(e) => setSubject(e.target.value)}
          className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
          <option value="">Subject</option>
          {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)}
          className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
          {GRADE_LEVELS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <select value={outputType} onChange={(e) => setOutputType(e.target.value)}
          className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
          {OUTPUT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Upload dropzone */}
      <input ref={fileRef} type="file" multiple onChange={handleFiles}
        accept="image/*,.pdf,.docx,.txt,.md,.csv" className="hidden" />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={reading}
        className="w-full border-2 border-dashed border-gray-200 hover:border-primary-300 rounded-xl p-4 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors disabled:opacity-60">
        <FiUploadCloud className="w-5 h-5" />
        {reading ? 'Reading your file…' : 'Upload images, PDF, Word (.docx) or text files'}
      </button>

      {/* YouTube */}
      <div className="mt-3">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-gray-300 px-2 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
            <FiYoutube className="text-red-600 flex-shrink-0" />
            <input
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addYouTube();
                }
              }}
              placeholder="Paste a YouTube link — MwanaAI reads its transcript"
              className="flex-1 border-0 focus:ring-0 text-sm py-2 bg-transparent"
            />
          </div>
          <button type="button" onClick={addYouTube} disabled={ytLoading || !ytUrl.trim()}
            className="bg-secondary-600 hover:bg-secondary-700 disabled:opacity-50 text-white text-sm font-medium px-4 rounded-lg transition-colors flex-shrink-0">
            {ytLoading ? <Spinner className="w-4 h-4" label="Reading…" /> : 'Add video'}
          </button>
        </div>
        {ytMsg && (
          <p className={`text-xs mt-1 ${ytMsg.includes('✓') ? 'text-green-600' : 'text-amber-600'}`}>{ytMsg}</p>
        )}
      </div>

      {/* Attached materials */}
      {materials.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {materials.map((m, i) => {
            const Icon = KIND_ICON[m.kind] || FiFileText;
            return (
              <span key={i} className="inline-flex items-center gap-1.5 bg-gray-100 rounded-lg pl-2 pr-1 py-1 text-xs text-gray-700">
                <Icon className="w-3.5 h-3.5 text-primary-600" />
                <span className="max-w-[160px] truncate">{m.name}</span>
                {m.pages ? <span className="text-gray-400">· {m.pages}p</span> : null}
                <button onClick={() => removeMaterial(i)} className="text-gray-400 hover:text-red-500 px-1" aria-label="Remove">
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Paste text */}
      <textarea
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        rows={3}
        placeholder="…or paste the syllabus / notes here (optional)"
        className="w-full mt-3 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
      />

      {/* Instructions + voice */}
      <div className="mt-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          What do you want? <span className="font-normal text-gray-400">(optional — you can talk)</span>
        </label>
        <div className="flex items-start gap-2">
          {dictation.supported && (
            <button type="button" onClick={() => dictation.toggle(instructions)}
              title={dictation.listening ? 'Stop' : 'Talk — describe what you need'}
              className={`flex-shrink-0 p-2.5 rounded-full ${
                dictation.listening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
              }`}>
              <FiMic className="w-5 h-5" />
            </button>
          )}
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            placeholder={dictation.listening
              ? 'Listening… keep talking, then tap the mic'
              : 'e.g. "A 40-minute lesson with a group activity" or "10 MSCE-style questions"'}
            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          />
        </div>
      </div>

      {needsCount && (
        <div className="flex items-center gap-2 mt-3 text-sm">
          <span className="text-gray-500">Number of questions:</span>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}
            className="rounded-lg border-gray-300 shadow-sm text-sm py-1 focus:border-primary-500 focus:ring-primary-500">
            {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

      <button onClick={generate} disabled={loading || reading}
        className="mt-4 inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
        {loading ? <Spinner className="w-4 h-4" label="Generating…" /> : `✨ Generate ${outputLabel.toLowerCase()}`}
      </button>

      {/* Result */}
      {result && (
        <div className="mt-5 border-t border-gray-100 pt-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800">{outputLabel}</h3>
            <button onClick={() => printDoc(outputLabel, result)}
              className="inline-flex items-center gap-1.5 text-sm border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
              <FiPrinter /> Print / PDF
            </button>
          </div>
          <Markdown content={result} />
        </div>
      )}
    </div>
  );
};

export default MaterialGenerator;
