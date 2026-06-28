import React, { useState, useEffect } from 'react';
import { classService } from '../services/classService';
import { quizService } from '../services/quizService';
import { assignmentService } from '../services/assignmentService';
import { aiInsights } from '../services/aiInsightsService';
import { analyzeResults } from '../services/studentIntel';
import { getGradeLevel } from '../config/curriculum';
import { printStudentReport } from '../utils/printReport';
import Markdown from '../components/Markdown';
import Spinner from '../components/Spinner';
import { FiPrinter, FiZap, FiAlertTriangle, FiClipboard } from 'react-icons/fi';

const STORAGE_KEY = 'mwanaai_child_email';

const ParentChild = () => {
  const [email, setEmail] = useState('');
  const [child, setChild] = useState(null);
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);
  const [tasks, setTasks] = useState([]); // upcoming assessments not yet done
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // AI parent summary
  const [aiNote, setAiNote] = useState('');
  const [loadingNote, setLoadingNote] = useState(false);

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
    setResults([]);
    setTasks([]);
    setAiNote('');
    try {
      const found = await classService.findStudentByEmail(target);
      if (!found) {
        setError("No student found with that email. Check the spelling, or ask your child to sign up first.");
        return;
      }
      setChild(found);
      localStorage.setItem(STORAGE_KEY, target);
      const [sum, all] = await Promise.all([
        classService.getStudentSummary(found.uid),
        quizService.listResults(found.uid),
      ]);
      setSummary(sum);
      setResults(all);

      // Upcoming assessments: assignments in the child's classes not yet done.
      try {
        const classes = await classService.listClassesForStudent(found.uid);
        const classIds = classes.map((c) => c.classId);
        const [assignments, completed] = await Promise.all([
          assignmentService.listForStudent(classIds),
          assignmentService.completedByStudent(found.uid),
        ]);
        setTasks(assignments.filter((a) => !completed.has(a.id)));
      } catch (taskErr) {
        /* non-critical */
      }
    } catch (err) {
      setError(err.message || 'Could not load progress. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAiNote = async () => {
    if (!child) return;
    setLoadingNote(true);
    setAiNote('');
    try {
      const note = await aiInsights.parentSummary({
        childName: (child.displayName || 'your child').split(' ')[0],
        level: getGradeLevel(child.gradeLevel)?.label || 'school',
        summary: analyzeResults(results),
      });
      setAiNote(note);
    } catch (err) {
      setAiNote(`*${err.message || 'Could not build the summary.'}*`);
    } finally {
      setLoadingNote(false);
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

  const intel = analyzeResults(results);
  const declining = (intel.bySubject || []).filter((s) => s.trend === 'down');
  const firstName = (child?.displayName || 'Your child').split(' ')[0];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-3xl">
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

            {/* Alert: recent scores slipping in one or more subjects */}
            {declining.length > 0 && (
              <div className="mb-5 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg animate-fade-in">
                <div className="flex items-start gap-2">
                  <FiAlertTriangle className="text-amber-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-800">
                      {firstName}'s scores are slipping in {declining.length === 1 ? 'a subject' : `${declining.length} subjects`}
                    </p>
                    <ul className="text-sm text-amber-700 mt-1 space-y-0.5">
                      {declining.map((s) => (
                        <li key={s.subject}>• {s.label}: recent {s.recentAvg}% (was {s.avg}% overall)</li>
                      ))}
                    </ul>
                    <p className="text-xs text-amber-600 mt-1">A little encouragement and practice at home can help turn this around.</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI parent summary — plain language, with how to help at home */}
            <div className="card p-5 mb-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <FiZap className="text-primary-600" />
                  <h2 className="font-bold text-gray-900">How is my child doing?</h2>
                </div>
                <button onClick={getAiNote} disabled={loadingNote || summary.quizCount === 0}
                  className="inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  {loadingNote ? <Spinner className="w-4 h-4" label="Thinking…" /> : aiNote ? 'Refresh' : '✨ Get a summary'}
                </button>
              </div>
              {aiNote ? (
                <div className="mt-4 border-t border-gray-100 pt-4 animate-fade-in"><Markdown content={aiNote} /></div>
              ) : (
                <p className="text-sm text-gray-500 mt-2">
                  {summary.quizCount === 0
                    ? 'Once your child takes a few quizzes, MwanaAI can summarise how they are doing and how you can help at home.'
                    : 'Get a plain-language summary of your child’s progress — what they’re doing well, what to work on, and simple ways to help at home.'}
                </p>
              )}
            </div>

            {tasks.length > 0 && (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Upcoming assessments</h2>
                <p className="text-sm text-gray-500 mb-2">Tasks {firstName} hasn't done yet — a good chance to encourage them.</p>
                <div className="card divide-y divide-gray-100 mb-5">
                  {tasks.slice(0, 10).map((a) => (
                    <div key={a.id} className="flex justify-between items-center px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FiClipboard className="text-primary-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{a.title || a.subjectLabel}</p>
                          <p className="text-xs text-gray-400">
                            {a.className}{a.examType ? ` · ${a.examType}` : ''} · {a.count} questions
                          </p>
                        </div>
                      </div>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">To do</span>
                    </div>
                  ))}
                </div>
              </>
            )}

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
