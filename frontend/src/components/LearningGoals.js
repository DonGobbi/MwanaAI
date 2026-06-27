import React, { useState, useEffect, useCallback } from 'react';
import { goalService } from '../services/goalService';
import { SUBJECTS } from '../config/curriculum';
import { FiTarget, FiPlus, FiX } from 'react-icons/fi';

const todayISO = () => new Date().toISOString().slice(0, 10);

function fmtDate(d) {
  if (!d) return '';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  } catch (_) {
    return d;
  }
}

// Student learning goals with gentle in-app reminders (overdue / due-soon).
const LearningGoals = ({ userId }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setGoals(await goalService.listForUser(userId));
    } catch (err) {
      console.error('Could not load goals:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await goalService.create(userId, { title, subject, targetDate: date });
      setTitle('');
      setSubject('');
      setDate('');
      load();
    } catch (err) {
      console.error('Could not add goal:', err);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (g) => {
    setGoals((prev) => prev.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)));
    try {
      await goalService.setDone(g.id, !g.done);
      load();
    } catch (err) {
      load();
    }
  };

  const remove = async (id) => {
    try {
      await goalService.remove(id);
      setGoals((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error('Could not remove goal:', err);
    }
  };

  const today = todayISO();

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <FiTarget className="text-primary-600" />
        <h2 className="font-bold text-gray-900">Learning goals</h2>
      </div>
      <p className="text-sm text-gray-500 mb-3">Set goals for yourself and tick them off as you go.</p>

      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 mb-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Master fractions"
          className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
        <select value={subject} onChange={(e) => setSubject(e.target.value)}
          className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
          <option value="">Subject (optional)</option>
          {SUBJECTS.map((s) => <option key={s.value} value={s.label}>{s.label}</option>)}
        </select>
        <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
        <button type="submit" disabled={busy || !title.trim()}
          className="inline-flex items-center justify-center gap-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 rounded-lg transition-colors">
          <FiPlus /> Add
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : goals.length === 0 ? (
        <p className="text-sm text-gray-400">No goals yet. Add one above to stay on track.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {goals.map((g) => {
            const overdue = g.targetDate && !g.done && g.targetDate < today;
            const dueSoon = g.targetDate && !g.done && g.targetDate >= today;
            return (
              <li key={g.id} className="flex items-center gap-3 py-2.5">
                <input type="checkbox" checked={g.done} onChange={() => toggle(g)}
                  className="rounded text-primary-600 focus:ring-primary-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${g.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{g.title}</p>
                  <p className="text-xs text-gray-400">
                    {g.subject ? g.subject : 'General'}
                    {g.targetDate && (
                      <>
                        {' · '}
                        <span className={overdue ? 'text-red-500 font-medium' : dueSoon ? 'text-amber-600' : ''}>
                          {overdue ? 'Overdue' : 'Due'} {fmtDate(g.targetDate)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <button onClick={() => remove(g.id)} className="text-gray-300 hover:text-red-500 p-1 flex-shrink-0" aria-label="Remove goal">
                  <FiX className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LearningGoals;
