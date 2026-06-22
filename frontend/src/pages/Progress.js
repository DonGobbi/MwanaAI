import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { quizService } from '../services/quizService';
import { classService } from '../services/classService';

const Progress = () => {
  const { currentUser } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Classes the student has joined
  const [myClasses, setMyClasses] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!currentUser) return;
      try {
        const data = await quizService.listResults(currentUser.uid);
        if (active) setResults(data);
      } catch (err) {
        console.error('Could not load progress:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [currentUser]);

  const loadClasses = useCallback(async () => {
    if (!currentUser) return;
    try {
      setMyClasses(await classService.listClassesForStudent(currentUser.uid));
    } catch (err) {
      console.error('Could not load classes:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const joinClass = async (e) => {
    e.preventDefault();
    if (!joinCode.trim() || !currentUser) return;
    setJoining(true);
    setJoinMsg('');
    try {
      const cls = await classService.joinClass(currentUser, joinCode);
      setJoinMsg(`Joined "${cls.name}" ✓`);
      setJoinCode('');
      loadClasses();
    } catch (err) {
      setJoinMsg(err.message || 'Could not join. Check the code.');
    } finally {
      setJoining(false);
    }
  };

  const totalQuizzes = results.length;
  const avg =
    totalQuizzes > 0
      ? Math.round(results.reduce((a, r) => a + (r.percentage || 0), 0) / totalQuizzes)
      : 0;

  const bySubject = {};
  results.forEach((r) => {
    const key = r.subjectLabel || r.subject || 'Other';
    if (!bySubject[key]) bySubject[key] = { total: 0, sum: 0 };
    bySubject[key].total += 1;
    bySubject[key].sum += r.percentage || 0;
  });
  const subjectRows = Object.entries(bySubject)
    .map(([name, v]) => ({ name, avg: Math.round(v.sum / v.total), count: v.total }))
    .sort((a, b) => b.avg - a.avg);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Progress</h1>
        <p className="text-gray-600 text-sm mb-6">See how you're doing across your quizzes.</p>

        {/* My classes */}
        <div className="card p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">My classes</h2>
          {myClasses.length > 0 ? (
            <ul className="mb-3 space-y-1">
              {myClasses.map((c) => (
                <li key={c.id} className="text-sm text-gray-700">
                  • {c.className} <span className="text-gray-400">({c.teacherName})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 mb-3">You haven't joined a class yet.</p>
          )}
          <form onSubmit={joinClass} className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter class code"
              maxLength={6}
              className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 uppercase tracking-widest"
            />
            <button type="submit" disabled={joining || !joinCode.trim()}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 rounded-lg">
              {joining ? 'Joining…' : 'Join'}
            </button>
          </form>
          {joinMsg && <p className="text-xs text-gray-500 mt-2">{joinMsg}</p>}
        </div>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : totalQuizzes === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-600 mb-4">You haven't taken any quizzes yet.</p>
            <Link to="/quiz" className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium px-5 py-2 rounded-lg">
              Take your first quiz
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="card p-5 text-center">
                <p className="text-3xl font-bold text-primary-600">{totalQuizzes}</p>
                <p className="text-sm text-gray-500">Quizzes taken</p>
              </div>
              <div className="card p-5 text-center">
                <p className="text-3xl font-bold text-primary-600">{avg}%</p>
                <p className="text-sm text-gray-500">Average score</p>
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-2">By subject</h2>
            <div className="card divide-y divide-gray-100 mb-6">
              {subjectRows.map((s) => (
                <div key={s.name} className="px-4 py-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800">{s.name}</span>
                    <span className="text-gray-500">{s.avg}% · {s.count} quiz{s.count > 1 ? 'zes' : ''}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${s.avg >= 80 ? 'bg-green-500' : s.avg >= 50 ? 'bg-primary-500' : 'bg-amber-500'}`}
                      style={{ width: `${s.avg}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-2">Recent quizzes</h2>
            <div className="card divide-y divide-gray-100">
              {results.slice(0, 20).map((r) => (
                <div key={r.id} className="flex justify-between items-center px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {r.subjectLabel || r.subject}
                      {r.examType && r.examType !== 'General' ? ` · ${r.examType}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                      {r.levelLabel || r.gradeLevel} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${r.percentage >= 80 ? 'text-green-600' : r.percentage >= 50 ? 'text-primary-600' : 'text-amber-600'}`}>
                    {r.score}/{r.total} · {r.percentage}%
                  </span>
                </div>
              ))}
            </div>

            <div className="text-center mt-6">
              <Link to="/quiz" className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium px-5 py-2 rounded-lg">
                Take another quiz
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Progress;
