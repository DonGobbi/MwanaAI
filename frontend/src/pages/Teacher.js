import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { classService } from '../services/classService';
import { quizService } from '../services/quizService';
import { aiInsights } from '../services/aiInsightsService';
import { assignmentService } from '../services/assignmentService';
import EmptyState from '../components/EmptyState';
import Markdown from '../components/Markdown';
import MaterialGenerator from '../components/MaterialGenerator';
import Spinner, { PageLoader } from '../components/Spinner';
import { printStudentReport } from '../utils/printReport';
import { SUBJECTS, GRADE_LEVELS, EXAM_TYPES, getSubject, getGradeLevel } from '../config/curriculum';
import { FiUsers, FiZap, FiBarChart2, FiClipboard, FiPrinter } from 'react-icons/fi';

function timeAgo(ts) {
  if (!ts) return 'never';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(ts).toLocaleDateString();
}

// AI Lesson Planner — generate a ready-to-use lesson plan for any topic,
// and assign a matching quiz to a class in one click.
const LessonPlanner = ({ classes, teacher }) => {
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('form-2');
  const [topic, setTopic] = useState('');
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignClass, setAssignClass] = useState('');
  const [assignMsg, setAssignMsg] = useState('');

  const assignQuiz = async () => {
    const cls = (classes || []).find((c) => c.id === assignClass);
    if (!cls) return;
    setAssignMsg('');
    try {
      await assignmentService.create(teacher, cls, {
        subject,
        subjectLabel: getSubject(subject)?.label || subject,
        topic: topic.trim(),
        count: 5,
      });
      setAssignMsg(`Assigned to ${cls.name} ✓`);
    } catch (err) {
      setAssignMsg('Could not assign.');
    }
  };

  const generate = async () => {
    setError('');
    if (!subject || !topic.trim()) {
      setError('Pick a subject and type a topic.');
      return;
    }
    setLoading(true);
    setPlan('');
    try {
      const result = await aiInsights.lessonPlan({
        subject: getSubject(subject)?.label || subject,
        level: getGradeLevel(level)?.label || level,
        topic: topic.trim(),
      });
      setPlan(result);
    } catch (err) {
      setError(err.message || 'Could not generate the lesson plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <FiZap className="text-primary-600" />
        <h2 className="font-bold text-gray-900">AI Lesson Planner</h2>
      </div>
      <p className="text-sm text-gray-500 mb-3">
        Generate a ready-to-teach lesson plan for any topic — objectives, activities, assessment and homework.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
        <select value={subject} onChange={(e) => setSubject(e.target.value)}
          className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
          <option value="">Subject</option>
          {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)}
          className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
          {GRADE_LEVELS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g. Photosynthesis)"
          className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <button onClick={generate} disabled={loading}
        className="inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
        {loading ? <Spinner className="w-4 h-4" label="Generating…" /> : 'Generate lesson plan'}
      </button>

      {classes && classes.length > 0 && subject && topic.trim() && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Assign a 5-question quiz on this topic:</span>
          <select value={assignClass} onChange={(e) => setAssignClass(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm text-xs py-1 focus:border-primary-500 focus:ring-primary-500">
            <option value="">Choose class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={assignQuiz} disabled={!assignClass}
            className="bg-secondary-600 hover:bg-secondary-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1 rounded-lg transition-colors">
            Assign
          </button>
          {assignMsg && <span className="text-xs text-green-600">{assignMsg}</span>}
        </div>
      )}

      {plan && (
        <div className="mt-4 border-t border-gray-100 pt-4 animate-fade-in">
          <Markdown content={plan} />
        </div>
      )}
    </div>
  );
};

// Create and track assignments for one class.
const Assignments = ({ cls, teacher, memberCount }) => {
  const [list, setList] = useState([]);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [examType, setExamType] = useState('');
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const items = await assignmentService.listForClass(cls.id);
      const withCounts = await Promise.all(
        items.map(async (a) => ({ ...a, done: await assignmentService.completionCount(a.id) }))
      );
      setList(withCounts);
    } catch (err) {
      console.error('Could not load assignments:', err);
    }
  }, [cls.id]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!subject) return;
    setBusy(true);
    try {
      await assignmentService.create(teacher, cls, {
        subject,
        subjectLabel: getSubject(subject)?.label || subject,
        topic,
        examType,
        count,
      });
      setTopic('');
      load();
    } catch (err) {
      console.error('Could not create assignment:', err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await assignmentService.remove(id);
      load();
    } catch (err) {
      console.error('Could not remove assignment:', err);
    }
  };

  return (
    <div className="card p-5 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <FiClipboard className="text-primary-600" />
        <h2 className="font-bold text-gray-900">Assignments</h2>
      </div>
      <p className="text-sm text-gray-500 mb-3">Set a quiz task for the class. Students see it on their dashboard.</p>

      <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <select value={subject} onChange={(e) => setSubject(e.target.value)}
          className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
          <option value="">Subject</option>
          {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (optional)"
          className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
        <select value={examType} onChange={(e) => setExamType(e.target.value)}
          className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
          {EXAM_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
        </select>
        <div className="flex gap-2">
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}
            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
            <option value={5}>5 questions</option>
            <option value={10}>10 questions</option>
          </select>
          <button type="submit" disabled={busy || !subject}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 rounded-lg transition-colors">
            {busy ? '…' : 'Assign'}
          </button>
        </div>
      </form>

      {list.length > 0 && (
        <ul className="divide-y divide-gray-100">
          {list.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                <p className="text-xs text-gray-400">
                  {a.examType && a.examType !== '' ? `${a.examType} · ` : ''}{a.count} questions ·{' '}
                  {a.done}/{memberCount} completed
                </p>
              </div>
              <button onClick={() => remove(a.id)} className="text-gray-300 hover:text-red-500 text-lg px-2">×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Drill into one student's full history and get an AI recommendation.
const StudentDetail = ({ member, onBack }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rec, setRec] = useState('');
  const [loadingRec, setLoadingRec] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await quizService.listResults(member.studentId);
        if (active) setResults(r);
      } catch (err) {
        console.error('Could not load student history:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [member.studentId]);

  const bySubject = {};
  results.forEach((r) => {
    const k = r.subjectLabel || r.subject || 'Other';
    if (!bySubject[k]) bySubject[k] = { sum: 0, n: 0 };
    bySubject[k].sum += r.percentage || 0;
    bySubject[k].n += 1;
  });
  const subjectRows = Object.entries(bySubject)
    .map(([name, v]) => ({ name, avg: Math.round(v.sum / v.n), count: v.n }))
    .sort((a, b) => b.avg - a.avg);
  const avg = results.length
    ? Math.round(results.reduce((a, r) => a + (r.percentage || 0), 0) / results.length)
    : null;

  const getRec = async () => {
    setLoadingRec(true);
    setRec('');
    try {
      const rr = await aiInsights.studentRecommendation({
        name: member.studentName,
        level: 'their class',
        subjectScores: subjectRows.map((s) => ({ subject: s.name, avg: s.avg, count: s.count })),
      });
      setRec(rr);
    } catch (err) {
      setRec(`*${err.message || 'Could not get a recommendation.'}*`);
    } finally {
      setLoadingRec(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-sm text-primary-600 hover:underline">← Back to class</button>
          <button
            onClick={() =>
              printStudentReport({
                name: member.studentName,
                email: member.studentEmail,
                quizzes: results.length,
                avg,
                lessons: member.summary?.lessonsCompleted ?? 0,
                subjectRows,
                results,
              })
            }
            className="inline-flex items-center gap-1.5 text-sm border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <FiPrinter /> Print report
          </button>
        </div>

        <div className="card p-5 mb-5">
          <h1 className="text-2xl font-bold text-gray-900">{member.studentName}</h1>
          <p className="text-sm text-gray-400 mb-4">{member.studentEmail}</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-2xl font-bold text-primary-600">{results.length}</p><p className="text-xs text-gray-500">Quizzes</p></div>
            <div><p className="text-2xl font-bold text-primary-600">{avg == null ? '—' : `${avg}%`}</p><p className="text-xs text-gray-500">Average</p></div>
            <div><p className="text-2xl font-bold text-primary-600">{member.summary?.lessonsCompleted ?? 0}</p><p className="text-xs text-gray-500">Lessons</p></div>
          </div>
        </div>

        {/* AI recommendation */}
        <div className="card p-5 mb-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <FiZap className="text-primary-600" />
              <h2 className="font-bold text-gray-900">AI recommendation</h2>
            </div>
            <button onClick={getRec} disabled={loadingRec}
              className="inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {loadingRec ? <Spinner className="w-4 h-4" label="Thinking…" /> : rec ? 'Refresh' : '✨ How can I help this student?'}
            </button>
          </div>
          {rec && (
            <div className="mt-4 border-t border-gray-100 pt-4 animate-fade-in"><Markdown content={rec} /></div>
          )}
        </div>

        {loading ? (
          <PageLoader label="Loading history…" />
        ) : results.length === 0 ? (
          <div className="card p-6">
            <EmptyState compact icon={FiBarChart2} title="No quizzes yet"
              description="This student hasn't taken any quizzes yet." />
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-2">By subject</h2>
            <div className="card divide-y divide-gray-100 mb-6">
              {subjectRows.map((s) => (
                <div key={s.name} className="px-4 py-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800">{s.name}</span>
                    <span className="text-gray-500">{s.avg}% · {s.count} quiz{s.count > 1 ? 'zes' : ''}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${s.avg >= 80 ? 'bg-green-500' : s.avg >= 50 ? 'bg-primary-500' : 'bg-amber-500'}`}
                      style={{ width: `${s.avg}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-2">Quiz history</h2>
            <div className="card divide-y divide-gray-100">
              {results.slice(0, 25).map((r) => (
                <div key={r.id} className="flex justify-between items-center px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {r.subjectLabel || r.subject}{r.examType && r.examType !== 'General' ? ` · ${r.examType}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</p>
                  </div>
                  <span className={`text-sm font-semibold ${r.percentage >= 80 ? 'text-green-600' : r.percentage >= 50 ? 'text-primary-600' : 'text-amber-600'}`}>
                    {r.score}/{r.total} · {r.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Teacher = () => {
  const { currentUser } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const [active, setActive] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [insights, setInsights] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);

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
    setSelectedStudent(null);
    setLoadingMembers(true);
    setMembers([]);
    setInsights('');
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

  const analyzeClass = async () => {
    setLoadingInsights(true);
    setInsights('');
    try {
      const rows = members.map((m) => ({
        name: m.studentName,
        quizzes: m.summary.quizCount,
        avg: m.summary.avgScore,
        lessons: m.summary.lessonsCompleted,
      }));
      const result = await aiInsights.classInsights({ className: active.name, rows });
      setInsights(result);
    } catch (err) {
      setInsights(`*${err.message || 'Could not analyse the class.'}*`);
    } finally {
      setLoadingInsights(false);
    }
  };

  // ---- Single student detail ----
  if (active && selectedStudent) {
    return <StudentDetail member={selectedStudent} onBack={() => setSelectedStudent(null)} />;
  }

  // ---- Class detail ----
  if (active) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container py-8 max-w-3xl">
          <button onClick={() => setActive(null)} className="text-sm text-primary-600 hover:underline mb-4">
            ← Back to classes
          </button>
          <div className="card p-5 mb-5 flex flex-wrap items-center justify-between gap-3">
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

          {/* AI Class Insights */}
          <div className="card p-5 mb-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FiBarChart2 className="text-primary-600" />
                <h2 className="font-bold text-gray-900">AI Class Insights</h2>
              </div>
              <button onClick={analyzeClass} disabled={loadingMembers || loadingInsights}
                className="inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                {loadingInsights ? <Spinner className="w-4 h-4" label="Analysing…" /> : '✨ Analyse class'}
              </button>
            </div>
            {insights ? (
              <div className="mt-4 border-t border-gray-100 pt-4 animate-fade-in">
                <Markdown content={insights} />
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-2">
                Get an AI summary of how this class is doing, who needs help, and what to teach next.
              </p>
            )}
          </div>

          <Assignments cls={active} teacher={currentUser} memberCount={members.length} />

          {loadingMembers ? (
            <PageLoader label="Loading students…" />
          ) : members.length === 0 ? (
            <div className="card p-6">
              <EmptyState compact icon={FiUsers} title="No students yet"
                description={`Share the code ${active.code} with your class so students can join.`} />
            </div>
          ) : (
            <div className="card overflow-hidden">
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
                    <tr key={m.id} onClick={() => setSelectedStudent(m)}
                      className="cursor-pointer hover:bg-gray-50">
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
      <div className="container py-8 max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Teacher Tools</h1>
        <p className="text-gray-600 text-sm mb-6">Plan lessons with AI, create classes, and track your students.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: content-creation tools */}
          <div className="lg:col-span-2 space-y-6">
            <MaterialGenerator />
            <LessonPlanner classes={classes} teacher={currentUser} />
          </div>

          {/* Right: class management */}
          <aside className="lg:sticky lg:top-6">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <FiUsers className="text-primary-600" />
                <h2 className="font-bold text-gray-900">Your classes</h2>
              </div>

              <form onSubmit={createClass} className="flex gap-2 mb-4">
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="New class name"
                  className="flex-1 min-w-0 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
                <button type="submit" disabled={creating || !newName.trim()}
                  className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 rounded-lg transition-colors flex-shrink-0">
                  {creating ? '…' : 'Create'}
                </button>
              </form>

              {loading ? (
                <PageLoader />
              ) : classes.length === 0 ? (
                <EmptyState compact icon={FiUsers} title="No classes yet"
                  description="Create your first class, then share its code with students." />
              ) : (
                <div className="space-y-2">
                  {classes.map((c) => (
                    <button key={c.id} onClick={() => openClass(c)}
                      className="w-full text-left rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 p-3 flex items-center justify-between transition-colors">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                        <p className="text-xs text-gray-400">Created {new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-xs text-gray-400">Code</p>
                        <p className="text-base font-bold tracking-widest text-primary-600">{c.code}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Teacher;
