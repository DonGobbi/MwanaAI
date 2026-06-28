import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { classService } from '../services/classService';
import { quizService } from '../services/quizService';
import { assignmentService } from '../services/assignmentService';
import { goalService } from '../services/goalService';
import { useCourses } from '../hooks/useCourses';
import { computeStreak } from '../utils/streak';
import { computeBadges } from '../utils/badges';
import { analyzeResults } from '../services/studentIntel';
import {
  FiBookOpen,
  FiMessageCircle,
  FiEdit3,
  FiBarChart2,
  FiUsers,
  FiArrowRight,
  FiZap,
  FiTarget,
  FiAward,
  FiClipboard,
  FiTrendingUp,
  FiFolder,
  FiUserCheck,
  FiPlus,
  FiLayers,
  FiHome,
} from 'react-icons/fi';

const STUDENT_CARDS = [
  { to: '/learn', icon: FiBookOpen, title: 'Learn', text: 'Guided lessons by topic.', color: 'bg-sky-100 text-sky-600' },
  { to: '/quiz', icon: FiEdit3, title: 'Practice', text: 'Quizzes & exams.', color: 'bg-amber-100 text-amber-600' },
  { to: '/flashcards', icon: FiLayers, title: 'Flashcards', text: 'Revise with cards.', color: 'bg-primary-100 text-primary-600' },
  { to: '/tutor', icon: FiMessageCircle, title: 'Tutor', text: 'Ask or upload homework.', color: 'bg-violet-100 text-violet-600' },
  { to: '/resources', icon: FiFolder, title: 'Resources', text: 'Materials from teachers.', color: 'bg-rose-100 text-rose-600' },
  { to: '/progress', icon: FiBarChart2, title: 'Progress', text: 'Track your scores.', color: 'bg-emerald-100 text-emerald-600' },
];

const LANDING_FEATURES = [
  { icon: FiZap, title: 'Help with any subject', text: 'Maths, Science, English, Chichewa and more — ask about anything in class.' },
  { icon: FiTarget, title: 'Explained for your level', text: 'Tell us your class or form and lessons are pitched to fit your age.' },
  { icon: FiAward, title: 'Learn, practise, track', text: 'Guided lessons, quizzes and exam practice — and watch your progress grow.' },
];

const ActionCard = ({ to, icon: Icon, title, text, color }) => (
  <Link to={to} className="group card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <p className="font-semibold text-gray-900 flex items-center gap-1">
      {title}
      <FiArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary-600" />
    </p>
    <p className="text-sm text-gray-500 mt-0.5">{text}</p>
  </Link>
);

const StatTile = ({ icon: Icon, value, label, color }) => (
  <div className="card p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1 truncate">{label}</p>
    </div>
  </div>
);

const JoinClassCard = () => {
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState([]);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!currentUser) return;
    try {
      setClasses(await classService.listClassesForStudent(currentUser.uid));
    } catch (e) {
      /* ignore */
    }
  }, [currentUser]);

  useEffect(() => {
    load();
  }, [load]);

  const join = async (e) => {
    e.preventDefault();
    if (!code.trim() || !currentUser) return;
    setBusy(true);
    setMsg('');
    try {
      const cls = await classService.joinClass(currentUser, code);
      setMsg(`Joined "${cls.name}" ✓`);
      setCode('');
      load();
    } catch (err) {
      setMsg(err.message || 'Could not join. Check the code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <FiUsers className="text-primary-600" />
        <p className="font-semibold text-gray-900">Join a class</p>
      </div>
      <p className="text-sm text-gray-500 mb-3">Got a class code from your teacher? Enter it to join.</p>
      {classes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {classes.map((c) => (
            <span key={c.id} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full">{c.className}</span>
          ))}
        </div>
      )}
      <form onSubmit={join} className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Class code" maxLength={6}
          className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 uppercase tracking-widest text-sm" />
        <button type="submit" disabled={busy || !code.trim()}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 rounded-lg transition-colors">
          {busy ? '…' : 'Join'}
        </button>
      </form>
      {msg && <p className="text-xs text-gray-500 mt-2">{msg}</p>}
    </div>
  );
};

// Assignments (tasks set by teachers).
const StudentAssignments = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [done, setDone] = useState(new Set());

  useEffect(() => {
    let active = true;
    (async () => {
      if (!currentUser) return;
      try {
        const classes = await classService.listClassesForStudent(currentUser.uid);
        const ids = classes.map((c) => c.classId);
        const [assignments, completed] = await Promise.all([
          assignmentService.listForStudent(ids),
          assignmentService.completedByStudent(currentUser.uid),
        ]);
        if (active) {
          setItems(assignments);
          setDone(completed);
        }
      } catch (err) {
        console.error('Could not load assignments:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [currentUser]);

  if (!items.length) return null;

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <FiClipboard className="text-primary-600" />
        <p className="font-semibold text-gray-900">Your assignments</p>
      </div>
      <ul className="space-y-2">
        {items.map((a) => {
          const isDone = done.has(a.id);
          return (
            <li key={a.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                <p className="text-xs text-gray-400">{a.className} · {a.count} questions</p>
              </div>
              {isDone ? (
                <span className="text-xs text-green-600 font-medium flex-shrink-0">Done ✓</span>
              ) : (
                <button onClick={() => navigate('/quiz', { state: { assignment: a } })}
                  className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors">
                  Start
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// Gentle in-app reminder of the student's active learning goals.
const GoalsReminder = () => {
  const { currentUser } = useAuth();
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!currentUser) return;
      try {
        const all = await goalService.listForUser(currentUser.uid);
        if (active) setGoals(all.filter((g) => !g.done).slice(0, 4));
      } catch (err) {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [currentUser]);

  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FiTarget className="text-primary-600" />
          <h2 className="font-bold text-gray-900">Your goals</h2>
        </div>
        <Link to="/progress" className="text-sm text-primary-600 hover:underline">Manage</Link>
      </div>
      {goals.length === 0 ? (
        <p className="text-sm text-gray-500">
          No active goals. <Link to="/progress" className="text-primary-600 hover:underline">Set one →</Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {goals.map((g) => {
            const overdue = g.targetDate && g.targetDate < today;
            return (
              <li key={g.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-700 truncate">{g.title}</span>
                {g.targetDate && (
                  <span className={`text-xs flex-shrink-0 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {overdue ? 'Overdue' : 'Due'} {new Date(g.targetDate + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

// "Revise next" — the one thing the AI suggests focusing on, from real scores.
const ReviseNextCard = ({ focus }) => {
  const tone =
    focus.kind === 'master'
      ? 'border-emerald-400'
      : focus.kind === 'declining'
      ? 'border-amber-400'
      : 'border-primary-500';
  return (
    <div className={`card p-5 border-l-4 ${tone}`}>
      <div className="flex items-center gap-2 mb-1">
        <FiZap className="text-primary-600" />
        <h2 className="font-bold text-gray-900">Revise next</h2>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        <span className="font-semibold text-gray-900">{focus.label}</span> — {focus.line}{' '}
        <span className="text-gray-400">(avg {focus.avg}%)</span>
      </p>
      <div className="flex items-center gap-3">
        <Link to={`/quiz?subject=${focus.subject}&focus=1`}
          className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          Practise {focus.label} <FiArrowRight className="w-4 h-4" />
        </Link>
        <Link to="/progress" className="text-sm text-primary-600 hover:underline">See full study plan</Link>
      </div>
    </div>
  );
};

// The full, data-rich student dashboard.
const StudentHome = ({ firstName }) => {
  const { currentUser } = useAuth();
  const { levelLabel, subjects } = useCourses();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!currentUser) return;
      try {
        const [results, summary] = await Promise.all([
          quizService.listResults(currentUser.uid),
          classService.getStudentSummary(currentUser.uid),
        ]);
        const quizCount = results.length;
        const avg = quizCount
          ? Math.round(results.reduce((a, r) => a + (r.percentage || 0), 0) / quizCount)
          : 0;
        const bySubject = {};
        results.forEach((r) => {
          const k = r.subjectLabel || r.subject || 'Other';
          if (!bySubject[k]) bySubject[k] = { sum: 0, n: 0 };
          bySubject[k].sum += r.percentage || 0;
          bySubject[k].n += 1;
        });
        const subjectStats = Object.entries(bySubject).map(([name, v]) => ({ name, avg: Math.round(v.sum / v.n), count: v.n }));
        const badges = computeBadges({
          quizCount,
          avgScore: avg,
          perfectCount: results.filter((r) => r.percentage === 100).length,
          streak: computeStreak(results),
          lessonsCompleted: summary.lessonsCompleted,
          subjectStats,
        });
        if (active) {
          setStats({
            quizCount,
            avg,
            streak: computeStreak(results),
            lessons: summary.lessonsCompleted,
            earnedBadges: badges.filter((b) => b.earned),
            focus: analyzeResults(results).focus,
          });
        }
      } catch (err) {
        console.error('Could not load dashboard stats:', err);
        if (active) setStats({ quizCount: 0, avg: 0, streak: 0, lessons: 0, earnedBadges: [] });
      }
    })();
    return () => {
      active = false;
    };
  }, [currentUser]);

  const s = stats || { quizCount: 0, avg: 0, streak: 0, lessons: 0, earnedBadges: [], focus: null };

  return (
    <>
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6 sm:p-8 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome back{firstName ? `, ${firstName}` : ''} 👋</h1>
          <p className="text-primary-50 mt-1">{levelLabel ? `Class: ${levelLabel}` : 'Pick up where you left off, or start something new.'}</p>
        </div>
        {s.streak > 0 && (
          <span className="bg-white/15 rounded-xl px-4 py-2 text-lg font-semibold">🔥 {s.streak}-day streak</span>
        )}
      </div>

      {/* Learning progress */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile icon={FiEdit3} value={s.quizCount} label="Quizzes taken" color="bg-sky-100 text-sky-600" />
        <StatTile icon={FiTrendingUp} value={`${s.avg}%`} label="Average score" color="bg-emerald-100 text-emerald-600" />
        <StatTile icon={FiBookOpen} value={s.lessons} label="Lessons done" color="bg-violet-100 text-violet-600" />
        <StatTile icon={FiAward} value={s.earnedBadges.length} label="Badges earned" color="bg-amber-100 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revise next — personalised from real quiz scores */}
          {s.focus && <ReviseNextCard focus={s.focus} />}

          {/* My courses */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">My courses</h2>
              <Link to="/courses" className="text-sm text-primary-600 hover:underline">View all</Link>
            </div>
            {subjects.length === 0 ? (
              <div className="card p-5 text-sm text-gray-500">Your courses will appear here.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {subjects.map((sub) => (
                  <div key={sub.value} className="card p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{sub.label}</p>
                      <p className="text-xs text-gray-400">{levelLabel}</p>
                    </div>
                    <Link to={`/learn?subject=${sub.value}`}
                      className="text-sm bg-primary-50 text-primary-700 hover:bg-primary-100 font-medium px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors">
                      Continue →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignments from teachers */}
          <StudentAssignments />

          {/* Quick actions */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {STUDENT_CARDS.map((c) => <ActionCard key={c.to} {...c} />)}
            </div>
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <GoalsReminder />

          {/* Achievements */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FiAward className="text-amber-500" />
                <h2 className="font-bold text-gray-900">Achievements</h2>
              </div>
              <Link to="/progress" className="text-sm text-primary-600 hover:underline">View all</Link>
            </div>
            {s.earnedBadges.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {s.earnedBadges.slice(0, 12).map((b) => (
                  <span key={b.id} title={`${b.name} — ${b.desc}`} className="text-2xl">{b.icon}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Take quizzes and finish lessons to earn your first badge.</p>
            )}
          </div>

          <JoinClassCard />
        </div>
      </div>
    </>
  );
};

const DashboardCard = ({ to, icon: Icon, title, text, color }) => (
  <Link to={to} className="card p-5 hover:shadow-md transition-shadow">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <p className="text-lg font-bold text-gray-900 mb-1">{title}</p>
    <p className="text-sm text-gray-600">{text}</p>
  </Link>
);

const Banner = ({ firstName, subtitle, children }) => (
  <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6 sm:p-8 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold">Welcome{firstName ? `, ${firstName}` : ''} 👋</h1>
      <p className="text-primary-50 mt-1">{subtitle}</p>
    </div>
    {children}
  </div>
);

// Data-rich teacher dashboard.
const TeacherHome = ({ firstName }) => {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!currentUser) return;
      try {
        const classes = await classService.listClassesForTeacher(currentUser.uid);
        const ids = classes.map((c) => c.id);
        const memberLists = await Promise.all(classes.map((c) => classService.getMembers(c)));
        const students = new Set(memberLists.flat().map((m) => m.studentId)).size;
        const submissions = (await assignmentService.teacherSubmissions(ids, 0)).length;
        if (active) setData({ classes, students, submissions });
      } catch (err) {
        console.error('Could not load teacher dashboard:', err);
        if (active) setData({ classes: [], students: 0, submissions: 0 });
      }
    })();
    return () => {
      active = false;
    };
  }, [currentUser]);

  const d = data || { classes: [], students: 0, submissions: 0 };

  return (
    <>
      <Banner firstName={firstName} subtitle="Manage your classes and track your students." />

      {/* First thing a teacher needs: a class. */}
      {data && d.classes.length === 0 ? (
        <div className="card p-6 mb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-3">
            <FiPlus className="w-6 h-6" />
          </div>
          <h2 className="font-bold text-gray-900 mb-1">Create your first class</h2>
          <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
            Start with a class for a subject and level you teach (e.g. Geography · Form 1). You'll get a join
            code for your students, and the AI will help you plan lessons and quizzes for that class.
          </p>
          <Link to="/teacher" className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium px-5 py-2 rounded-lg">
            Create a class
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatTile icon={FiFolder} value={d.classes.length} label="Classes" color="bg-sky-100 text-sky-600" />
          <StatTile icon={FiUsers} value={d.students} label="Students" color="bg-violet-100 text-violet-600" />
          <StatTile icon={FiClipboard} value={d.submissions} label="Submissions" color="bg-amber-100 text-amber-600" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <DashboardCard to="/teacher" icon={FiUsers} title="My Classes" text="Create classes, generate lessons with AI and track student progress." color="bg-sky-100 text-sky-600" />
        <DashboardCard to="/tutor" icon={FiMessageCircle} title="Tutor" text="Try the AI tutor yourself." color="bg-violet-100 text-violet-600" />
      </div>

      {d.classes.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Your classes</h2>
            <Link to="/teacher" className="text-sm text-primary-600 hover:underline">Open</Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {d.classes.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-800">{c.name}</span>
                <span className="text-sm font-bold tracking-widest text-primary-600">{c.code}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

// Data-rich parent dashboard — shows the linked child's key stats up front.
const ParentHome = ({ firstName }) => {
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const email = localStorage.getItem('mwanaai_child_email');
      if (!email) {
        if (active) setLoading(false);
        return;
      }
      try {
        const found = await classService.findStudentByEmail(email);
        if (found) {
          const summary = await classService.getStudentSummary(found.uid);
          if (active) setChild({ name: found.displayName || 'Your child', summary });
        }
      } catch (err) {
        console.error('Could not load child:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Banner firstName={firstName} subtitle="Follow your child's learning progress." />

      {!loading && child && (
        <>
          <p className="text-sm text-gray-500 mb-2">{child.name}'s progress</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatTile icon={FiEdit3} value={child.summary.quizCount} label="Quizzes" color="bg-sky-100 text-sky-600" />
            <StatTile icon={FiTrendingUp} value={child.summary.avgScore == null ? '—' : `${child.summary.avgScore}%`} label="Average" color="bg-emerald-100 text-emerald-600" />
            <StatTile icon={FiBookOpen} value={child.summary.lessonsCompleted} label="Lessons" color="bg-violet-100 text-violet-600" />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DashboardCard to="/child" icon={FiUserCheck} title="My Child" text={child ? "See full progress and print a report." : "Enter your child's email to see their progress."} color="bg-emerald-100 text-emerald-600" />
      </div>
    </>
  );
};

// Super Admin / School Admin dashboard.
const AdminHome = ({ firstName, role }) => {
  const isSuper = role === 'superadmin';
  return (
    <>
      <div className="rounded-2xl bg-gradient-to-r from-secondary-900 to-primary-700 text-white p-6 sm:p-8 mb-6 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-bold">Welcome{firstName ? `, ${firstName}` : ''} 👋</h1>
        <p className="text-primary-50 mt-1">
          {isSuper ? 'Register schools and manage their admins, teachers, students and parents.' : "Manage your school's admins, teachers, students and parents."}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DashboardCard to="/admin" icon={FiHome} title={isSuper ? 'Schools' : 'My School'}
          text={isSuper
            ? 'Register a school, then open it to add admins, teachers, students and parents.'
            : 'Add admins, teachers, students and parents to your school.'}
          color="bg-sky-100 text-sky-600" />
        <DashboardCard to="/tutor" icon={FiMessageCircle} title="Tutor" text="Try the AI tutor yourself." color="bg-violet-100 text-violet-600" />
      </div>
    </>
  );
};

const Home = () => {
  const { currentUser, userProfile } = useAuth();
  const role = userProfile?.userType || 'student';
  const firstName = currentUser?.displayName ? currentUser.displayName.split(' ')[0] : '';

  // ---- Logged-in dashboard ----
  if (currentUser) {
    return (
      <div className="min-h-screen">
        <div className="container py-8 max-w-6xl">
          {role === 'superadmin' || role === 'admin' ? (
            <AdminHome firstName={firstName} role={role} />
          ) : role === 'teacher' ? (
            <TeacherHome firstName={firstName} />
          ) : role === 'parent' ? (
            <ParentHome firstName={firstName} />
          ) : (
            <StudentHome firstName={firstName} />
          )}
        </div>
      </div>
    );
  }

  // ---- Public landing ----
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary-900 via-primary-800 to-primary-600 text-white">
        <div className="container py-20 md:py-28 text-center relative z-10">
          <span className="inline-block bg-white/15 text-white text-sm px-4 py-1.5 rounded-full mb-5">AI learning for Malawi 🇲🇼</span>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">Your personal AI tutor</h1>
          <p className="text-lg md:text-xl text-primary-50 max-w-2xl mx-auto mb-8">
            Guided lessons, exam practice and a friendly AI tutor — explained step by step for your class level.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-8 py-3 rounded-xl hover:bg-primary-50 transition-colors shadow-sm">
              Start learning free <FiArrowRight />
            </Link>
            <Link to="/login" className="border border-white/60 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors">Log in</Link>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {LANDING_FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-gray-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 border-t border-gray-100">
        <div className="container py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Ready to learn?</h2>
          <p className="text-gray-600 mb-8">Create a free account, pick your class and subject, and start learning.</p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-primary-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-primary-700 transition-colors">
            Get started <FiArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
