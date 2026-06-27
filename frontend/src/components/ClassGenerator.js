import React, { useState, useEffect, useRef } from 'react';
import { materialService, OUTPUT_TYPES } from '../services/materialService';
import { resourceService } from '../services/resourceService';
import { extractFromFile } from '../utils/extractText';
import { useDictation } from '../hooks/useDictation';
import { printDoc } from '../utils/printReport';
import Markdown from './Markdown';
import Spinner from './Spinner';
import { FiZap, FiUploadCloud, FiX, FiMic, FiPrinter, FiSave, FiFileText } from 'react-icons/fi';

// AI generation scoped to ONE class. The class already pins the subject and
// level, so the teacher never re-selects them — they just choose what to make
// (lesson / quiz / notes / exam), optionally ground it on the class's uploaded
// resources, and save it straight back to the class for students.
const ClassGenerator = ({ cls, teacher }) => {
  const subjectLabel = cls.subjectLabel || cls.name || 'this subject';
  const levelLabel = cls.levelLabel || '';

  const [outputType, setOutputType] = useState('lesson');
  const [count, setCount] = useState(10);
  const [topic, setTopic] = useState('');

  const [classResources, setClassResources] = useState([]);
  const [useResources, setUseResources] = useState(true);
  const [extra, setExtra] = useState([]); // freshly added { name, text, image }
  const [reading, setReading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [savedTitle, setSavedTitle] = useState('');

  const fileRef = useRef(null);
  const dictation = useDictation({ onText: setTopic });

  const usableResources = classResources.filter((r) => (r.text || '').trim().length > 20);
  const needsCount = outputType === 'quiz' || outputType === 'questions';
  const outputLabel = OUTPUT_TYPES.find((o) => o.value === outputType)?.label || 'Resource';

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await resourceService.listForClass(cls.id);
        if (active) setClassResources(list);
      } catch (err) {
        /* ignore — generation still works without resources */
      }
    })();
    return () => {
      active = false;
    };
  }, [cls.id]);

  const addFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (e.target) e.target.value = '';
    if (!files.length) return;
    setReading(true);
    for (const file of files) {
      try {
        const item = await extractFromFile(file);
        setExtra((prev) => [...prev, item]);
      } catch (err) {
        setError(err.message || `Could not read "${file.name}".`);
      }
    }
    setReading(false);
  };

  const generate = async () => {
    setError('');
    const materials = [];
    if (useResources) usableResources.forEach((r) => materials.push({ name: r.title, text: r.text }));
    extra.forEach((m) => materials.push(m));

    if (materials.length === 0 && !topic.trim()) {
      setError('Use your class resources, add a file, or type a topic to cover.');
      return;
    }
    if (dictation.listening) dictation.stop();

    setLoading(true);
    setResult('');
    setSaveMsg('');
    try {
      const out = await materialService.generate({
        outputType,
        instructions: topic,
        subject: subjectLabel,
        level: levelLabel,
        count,
        materials,
      });
      setResult(out);
      setSavedTitle(topic.trim() ? `${outputLabel}: ${topic.trim()}` : `${outputLabel} — ${subjectLabel}`);
    } catch (err) {
      setError(err.message || 'Could not generate that.');
    } finally {
      setLoading(false);
    }
  };

  const saveToClass = async () => {
    if (!result) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await resourceService.add(teacher, cls, {
        title: (savedTitle || outputLabel).slice(0, 140),
        kind: outputType,
        sourceName: '',
        text: result,
      });
      setSaveMsg('Saved to this class & shared with students ✓');
      setClassResources(await resourceService.listForClass(cls.id));
    } catch (err) {
      setSaveMsg(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-5 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <FiZap className="text-primary-600" />
        <h2 className="font-bold text-gray-900">Create with AI</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        MwanaAI knows this class is <strong>{subjectLabel}{levelLabel ? ` · ${levelLabel}` : ''}</strong>.
        Choose what to make — it's generated for this class.
      </p>

      {/* What to make */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <label className="text-sm">
          <span className="block text-xs text-gray-500 mb-1">What to make</span>
          <select value={outputType} onChange={(e) => setOutputType(e.target.value)}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
            {OUTPUT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        {needsCount && (
          <label className="text-sm">
            <span className="block text-xs text-gray-500 mb-1">How many questions</span>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
              {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
      </div>

      {/* Ground it */}
      <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 mb-3 space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
          <input type="checkbox" checked={useResources} onChange={(e) => setUseResources(e.target.checked)}
            disabled={usableResources.length === 0}
            className="rounded text-primary-600 focus:ring-primary-500" />
          Base it on my class resources
          <span className="text-gray-400">({usableResources.length})</span>
        </label>
        {usableResources.length === 0 && (
          <p className="text-xs text-gray-400">No readable resources yet — add the syllabus/notes below or in “Class resources”.</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" multiple onChange={addFiles}
            accept="image/*,.pdf,.docx,.txt,.md,.csv" className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={reading}
            className="inline-flex items-center gap-1.5 text-xs border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg disabled:opacity-60">
            {reading ? <Spinner className="w-4 h-4" /> : <FiUploadCloud className="w-4 h-4" />} Add a file
          </button>
          {extra.map((m, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-lg pl-2 pr-1 py-1 text-xs text-gray-700">
              <FiFileText className="w-3.5 h-3.5 text-primary-600" />
              <span className="max-w-[140px] truncate">{m.name}</span>
              <button onClick={() => setExtra((prev) => prev.filter((_, j) => j !== i))}
                className="text-gray-400 hover:text-red-500 px-0.5"><FiX className="w-3.5 h-3.5" /></button>
            </span>
          ))}
        </div>
      </div>

      {/* Topic / brief + voice */}
      <div className="flex items-start gap-2 mb-3">
        {dictation.supported && (
          <button type="button" onClick={() => dictation.toggle(topic)}
            title={dictation.listening ? 'Stop' : 'Talk'}
            className={`flex-shrink-0 p-2.5 rounded-full ${
              dictation.listening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
            }`}>
            <FiMic className="w-5 h-5" />
          </button>
        )}
        <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2}
          placeholder={dictation.listening
            ? 'Listening… keep talking, then tap the mic'
            : `Topic or focus (optional) — e.g. "Map reading" or "a 40-min lesson with a group activity"`}
          className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <button onClick={generate} disabled={loading || reading}
        className="inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
        {loading ? <Spinner className="w-4 h-4" label="Generating…" /> : `✨ Generate ${outputLabel.toLowerCase()}`}
      </button>

      {/* Result */}
      {result && (
        <div className="mt-5 border-t border-gray-100 pt-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold text-gray-800">{outputLabel}</h3>
            <div className="flex gap-2">
              <button onClick={() => printDoc(outputLabel, result)}
                className="inline-flex items-center gap-1.5 text-sm border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                <FiPrinter /> Print / PDF
              </button>
              <button onClick={saveToClass} disabled={saving}
                className="inline-flex items-center gap-1.5 text-sm bg-secondary-600 hover:bg-secondary-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
                {saving ? <Spinner className="w-4 h-4" /> : <><FiSave /> Save to class</>}
              </button>
            </div>
          </div>
          {saveMsg && <p className={`text-xs mb-2 ${saveMsg.includes('✓') ? 'text-green-600' : 'text-amber-600'}`}>{saveMsg}</p>}
          <Markdown content={result} />
        </div>
      )}
    </div>
  );
};

export default ClassGenerator;
