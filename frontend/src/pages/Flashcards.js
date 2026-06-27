import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../hooks/useCourses';
import { studyService } from '../services/studyService';
import { classService } from '../services/classService';
import { resourceService } from '../services/resourceService';
import { getSubject } from '../config/curriculum';
import Spinner from '../components/Spinner';
import { FiLayers, FiChevronLeft, FiChevronRight, FiShuffle, FiRefreshCw } from 'react-icons/fi';

const Flashcards = () => {
  const { currentUser } = useAuth();
  const { levelLabel, subjects: myCourses } = useCourses();
  const location = useLocation();

  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [paste, setPaste] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [count, setCount] = useState(12);

  const [resources, setResources] = useState([]); // { id, label, text }
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Default to the student's first subject (or ?subject=).
  useEffect(() => {
    if (subject || !myCourses.length) return;
    const wanted = new URLSearchParams(location.search).get('subject');
    setSubject(myCourses.find((s) => s.value === wanted)?.value || myCourses[0].value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myCourses.length]);

  // Load the student's class resources as optional study material.
  const loadResources = useCallback(async () => {
    if (!currentUser) return;
    try {
      const classes = await classService.listClassesForStudent(currentUser.uid);
      const lists = await Promise.all(classes.map((c) => resourceService.listForClass(c.classId)));
      const flat = [];
      classes.forEach((c, i) => {
        lists[i].forEach((r) => {
          if ((r.text || '').trim().length > 20) flat.push({ id: r.id, label: `${c.className} — ${r.title}`, text: r.text });
        });
      });
      setResources(flat);
    } catch (err) {
      /* resources are optional */
    }
  }, [currentUser]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const generate = async () => {
    setError('');
    if (!subject) {
      setError('Pick a subject.');
      return;
    }
    const sourceText = paste.trim() || resources.find((r) => r.id === resourceId)?.text || '';
    if (!sourceText && !topic.trim()) {
      setError('Add a topic, choose a resource, or paste some notes.');
      return;
    }
    setLoading(true);
    setCards([]);
    try {
      const deck = await studyService.flashcards({
        subject: getSubject(subject)?.label || subject,
        level: levelLabel,
        topic,
        sourceText,
        count,
      });
      setCards(deck);
      setIdx(0);
      setFlipped(false);
    } catch (err) {
      setError(err.message || 'Could not make flashcards.');
    } finally {
      setLoading(false);
    }
  };

  const go = (delta) => {
    setFlipped(false);
    setIdx((i) => (i + delta + cards.length) % cards.length);
  };

  const shuffle = () => {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setCards(shuffled);
    setIdx(0);
    setFlipped(false);
  };

  // ---- Studying a deck ----
  if (cards.length > 0) {
    const card = cards[idx];
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container py-8 max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Flashcards</h1>
            <button onClick={() => setCards([])} className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1">
              <FiRefreshCw className="w-4 h-4" /> New deck
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-2 text-center">Card {idx + 1} of {cards.length} · tap the card to flip</p>

          <button
            onClick={() => setFlipped((f) => !f)}
            className={`w-full min-h-[16rem] rounded-2xl border p-6 flex items-center justify-center text-center transition-colors ${
              flipped ? 'bg-secondary-900 text-white border-secondary-900' : 'bg-white border-gray-200'
            }`}
          >
            <div>
              <p className={`text-xs uppercase tracking-wider mb-3 ${flipped ? 'text-primary-300' : 'text-gray-400'}`}>
                {flipped ? 'Answer' : 'Question'}
              </p>
              <p className={`text-lg font-medium leading-relaxed ${flipped ? 'text-white' : 'text-gray-900'}`}>
                {flipped ? card.back : card.front}
              </p>
            </div>
          </button>

          <div className="flex items-center justify-between mt-5">
            <button onClick={() => go(-1)} className="inline-flex items-center gap-1 text-sm border border-gray-300 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg">
              <FiChevronLeft /> Prev
            </button>
            <button onClick={shuffle} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600">
              <FiShuffle className="w-4 h-4" /> Shuffle
            </button>
            <button onClick={() => go(1)} className="inline-flex items-center gap-1 text-sm bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
              Next <FiChevronRight />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Setup ----
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-2xl">
        <div className="flex items-center gap-2 mb-1">
          <FiLayers className="text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Flashcards</h1>
        </div>
        <p className="text-gray-600 text-sm mb-6">
          Make a deck to revise — from a topic, one of your class resources, or your own notes.
        </p>

        <div className="card p-5">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <p className="text-xs text-gray-400 mb-2">{levelLabel || 'Your class'}</p>
            <div className="flex flex-wrap gap-2">
              {myCourses.map((s) => (
                <button key={s.value} type="button" onClick={() => setSubject(s.value)}
                  className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                    subject === s.value ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Photosynthesis, Fractions, Map reading"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm mb-3" />

          {resources.length > 0 && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">…or from a class resource (optional)</label>
              <select value={resourceId} onChange={(e) => setResourceId(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
                <option value="">None</option>
                {resources.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          )}

          <label className="block text-sm font-medium text-gray-700 mb-1">…or paste your notes (optional)</label>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={3}
            placeholder="Paste notes to turn into flashcards"
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm mb-3" />

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-500">
              Cards
              <select value={count} onChange={(e) => setCount(Number(e.target.value))}
                className="rounded-lg border-gray-300 shadow-sm text-sm py-1 focus:border-primary-500 focus:ring-primary-500">
                {[8, 12, 16, 20].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button onClick={generate} disabled={loading}
              className="ml-auto inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              {loading ? <Spinner className="w-4 h-4" label="Making cards…" /> : '✨ Make flashcards'}
            </button>
          </div>

          {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default Flashcards;
