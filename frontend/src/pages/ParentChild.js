import React, { useState, useEffect } from 'react';
import { classService } from '../services/classService';
import { printStudentReport } from '../utils/printReport';
import Spinner from '../components/Spinner';
import { FiPrinter } from 'react-icons/fi';

const STORAGE_KEY = 'mwanaai_child_email';

const ParentChild = () => {
  const [email, setEmail] = useState('');
  const [child, setChild] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookup = async (value) => {
    const target = (value ?? email).trim();
    if (!target) {
      setError("Please enter your child's email.");
      return;
    }
    setError('');
    setLoading(true);
    setChild(null);
    setSummary(null);
    try {
      const found = await classService.findStudentByEmail(target);
      if (!found) {
        setError("No student found with that email. Check the spelling, or ask your child to sign up first.");
        return;
      }
      setChild(found);
      localStorage.setItem(STORAGE_KEY, target);
      setSummary(await classService.getStudentSummary(found.uid));
    } catch (err) {
      setError(err.message || 'Could not load progress. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Remember the last child looked up.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setEmail(saved);
      lookup(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Child's Progress</h1>
        <p className="text-gray-600 text-sm mb-6">
          Enter your child's account email to see how they are doing.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup();
          }}
          className="card p-4 mb-6 flex gap-2"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="child@example.com"
            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <button type="submit" disabled={loading}
            className="inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-5 rounded-lg transition-colors">
            {loading ? <Spinner className="w-5 h-5" /> : 'View'}
          </button>
        </form>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-700">{error}</div>
        )}

        {child && summary && (
          <>
            <div className="card p-5 mb-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-semibold text-gray-800">{child.displayName || 'Student'}</p>
                  <p className="text-xs text-gray-400">{child.email}</p>
                </div>
                <button
                  onClick={() =>
                    printStudentReport({
                      name: child.displayName || 'Student',
                      email: child.email,
                      quizzes: summary.quizCount,
                      avg: summary.avgScore,
                      lessons: summary.lessonsCompleted,
                      results: summary.recent,
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-sm border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                >
                  <FiPrinter /> Print
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary-600">{summary.quizCount}</p>
                  <p className="text-xs text-gray-500">Quizzes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary-600">
                    {summary.avgScore == null ? '—' : `${summary.avgScore}%`}
                  </p>
                  <p className="text-xs text-gray-500">Average</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary-600">{summary.lessonsCompleted}</p>
                  <p className="text-xs text-gray-500">Lessons done</p>
                </div>
              </div>
            </div>

            {summary.recent.length > 0 && (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Recent quizzes</h2>
                <div className="card divide-y divide-gray-100">
                  {summary.recent.map((r) => (
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
                      <span className={`text-sm font-semibold ${
                        r.percentage >= 80 ? 'text-green-600' : r.percentage >= 50 ? 'text-primary-600' : 'text-amber-600'
                      }`}>
                        {r.score}/{r.total} · {r.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ParentChild;
