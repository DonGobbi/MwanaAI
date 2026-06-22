import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { classService } from '../services/classService';

function timeAgo(ts) {
  if (!ts) return 'never';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(ts).toLocaleDateString();
}

const Teacher = () => {
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const [active, setActive] = useState(null); // selected class
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const loadClasses = useCallback(async () => {
    if (!currentUser) return;
    try {
      setClasses(await classService.listClassesForTeacher(currentUser.uid));
    } catch (err) {
      console.error('Could not load classes:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const createClass = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !currentUser) return;
    setCreating(true);
    try {
      await classService.createClass(currentUser, newName);
      setNewName('');
      loadClasses();
    } catch (err) {
      console.error('Could not create class:', err);
    } finally {
      setCreating(false);
    }
  };

  const openClass = async (cls) => {
    setActive(cls);
    setLoadingMembers(true);
    setMembers([]);
    try {
      const roster = await classService.getMembers(cls.id);
      const withProgress = await Promise.all(
        roster.map(async (m) => ({ ...m, summary: await classService.getStudentSummary(m.studentId) }))
      );
      setMembers(withProgress);
    } catch (err) {
      console.error('Could not load roster:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  // ---- Class detail ----
  if (active) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container py-8 max-w-3xl">
          <button onClick={() => setActive(null)} className="text-sm text-primary-600 hover:underline mb-4">
            ← Back to classes
          </button>
          <div className="bg-white rounded-lg shadow p-5 mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{active.name}</h1>
              <p className="text-sm text-gray-500">{members.length} student{members.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Class code</p>
              <p className="text-2xl font-bold tracking-widest text-primary-600">{active.code}</p>
              <p className="text-xs text-gray-400">Share with students to join</p>
            </div>
          </div>

          {loadingMembers ? (
            <p className="text-gray-500">Loading students…</p>
          ) : members.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              No students have joined yet. Share the code <span className="font-bold">{active.code}</span> with your class.
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">Student</th>
                    <th className="text-center px-2 py-2">Quizzes</th>
                    <th className="text-center px-2 py-2">Avg</th>
                    <th className="text-center px-2 py-2">Lessons</th>
                    <th className="text-right px-4 py-2">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{m.studentName}</p>
                        <p className="text-xs text-gray-400">{m.studentEmail}</p>
                      </td>
                      <td className="text-center px-2 py-3 text-gray-600">{m.summary.quizCount}</td>
                      <td className="text-center px-2 py-3">
                        <span className={`font-semibold ${
                          m.summary.avgScore == null ? 'text-gray-300'
                          : m.summary.avgScore >= 80 ? 'text-green-600'
                          : m.summary.avgScore >= 50 ? 'text-primary-600' : 'text-amber-600'
                        }`}>
                          {m.summary.avgScore == null ? '—' : `${m.summary.avgScore}%`}
                        </span>
                      </td>
                      <td className="text-center px-2 py-3 text-gray-600">{m.summary.lessonsCompleted}</td>
                      <td className="text-right px-4 py-3 text-xs text-gray-400">{timeAgo(m.summary.lastActive)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Classes list ----
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Classes</h1>
        <p className="text-gray-600 text-sm mb-6">Create a class, share the code, and track your students' progress.</p>

        <form onSubmit={createClass} className="bg-white rounded-lg shadow p-4 mb-6 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New class name (e.g. Form 2 Maths)"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <button type="submit" disabled={creating || !newName.trim()}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-5 rounded-md">
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            You have no classes yet. Create your first one above.
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map((c) => (
              <button key={c.id} onClick={() => openClass(c)}
                className="w-full text-left bg-white rounded-lg shadow p-4 hover:shadow-md flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-400">Created {new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Code</p>
                  <p className="text-lg font-bold tracking-widest text-primary-600">{c.code}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Teacher;
