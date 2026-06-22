import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { classService } from '../services/classService';
import Onboarding, { ONBOARDED_KEY } from '../components/Onboarding';
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
} from 'react-icons/fi';

const STUDENT_CARDS = [
  { to: '/learn', icon: FiBookOpen, title: 'Learn', text: 'Guided lessons by topic, for your class.', color: 'bg-sky-100 text-sky-600' },
  { to: '/tutor', icon: FiMessageCircle, title: 'Tutor', text: 'Ask anything or upload your homework.', color: 'bg-violet-100 text-violet-600' },
  { to: '/quiz', icon: FiEdit3, title: 'Practice', text: 'Quizzes and PSLCE/JCE/MSCE exams.', color: 'bg-amber-100 text-amber-600' },
  { to: '/progress', icon: FiBarChart2, title: 'Progress', text: 'Track your scores over time.', color: 'bg-emerald-100 text-emerald-600' },
];

const LANDING_FEATURES = [
  { icon: FiZap, title: 'Help with any subject', text: 'Maths, Science, English, Chichewa and more — ask about anything in class.' },
  { icon: FiTarget, title: 'Explained for your level', text: 'Tell us your class or form and lessons are pitched to fit your age.' },
  { icon: FiAward, title: 'Learn, practise, track', text: 'Guided lessons, quizzes and exam practice — and watch your progress grow.' },
];

const ActionCard = ({ to, icon: Icon, title, text, color }) => (
  <Link
    to={to}
    className="group card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
  >
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

// Inline "join a class" card for students, shown on the dashboard.
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
      <p className="text-sm text-gray-500 mb-3">
        Got a class code from your teacher? Enter it to join.
      </p>
      {classes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {classes.map((c) => (
            <span key={c.id} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full">
              {c.className}
            </span>
          ))}
        </div>
      )}
      <form onSubmit={join} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Class code"
          maxLength={6}
          className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 uppercase tracking-widest text-sm"
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 rounded-lg transition-colors"
        >
          {busy ? '…' : 'Join'}
        </button>
      </form>
      {msg && <p className="text-xs text-gray-500 mt-2">{msg}</p>}
    </div>
  );
};

const Home = () => {
  const { currentUser, userProfile } = useAuth();
  const role = userProfile?.userType || 'student';
  const firstName = currentUser?.displayName ? currentUser.displayName.split(' ')[0] : '';

  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    // Only for confirmed students (userProfile loaded) so teachers/parents
    // never see the student onboarding while their profile is still loading.
    if (currentUser && userProfile?.userType === 'student' && !localStorage.getItem(ONBOARDED_KEY)) {
      setShowOnboarding(true);
    }
  }, [currentUser, userProfile]);

  // ---- Logged-in dashboard ----
  if (currentUser) {
    return (
      <div className="min-h-screen">
        {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}
        <div className="container py-8 max-w-4xl">
          {/* Welcome banner */}
          <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-secondary-600 text-white p-6 sm:p-8 mb-6 shadow-sm">
            <h1 className="text-2xl sm:text-3xl font-bold">
              Welcome{firstName ? `, ${firstName}` : ''} 👋
            </h1>
            <p className="text-primary-50 mt-1">
              {role === 'teacher'
                ? 'Manage your classes and track your students.'
                : role === 'parent'
                ? "Follow your child's learning progress."
                : 'Pick up where you left off, or start something new.'}
            </p>
          </div>

          {role === 'teacher' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ActionCard to="/teacher" icon={FiUsers} title="My Classes" text="Create classes and track student progress." color="bg-sky-100 text-sky-600" />
              <ActionCard to="/tutor" icon={FiMessageCircle} title="Tutor" text="Try the AI tutor yourself." color="bg-violet-100 text-violet-600" />
            </div>
          ) : role === 'parent' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ActionCard to="/child" icon={FiUsers} title="My Child" text="View your child's progress by email." color="bg-emerald-100 text-emerald-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {STUDENT_CARDS.map((c) => (
                  <ActionCard key={c.to} {...c} />
                ))}
              </div>
              <JoinClassCard />
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- Public landing ----
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-secondary-600 text-white">
        <div className="container py-20 md:py-28 text-center relative z-10">
          <span className="inline-block bg-white/15 text-white text-sm px-4 py-1.5 rounded-full mb-5">
            AI learning for Malawi 🇲🇼
          </span>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            Your personal AI tutor
          </h1>
          <p className="text-lg md:text-xl text-primary-50 max-w-2xl mx-auto mb-8">
            Guided lessons, exam practice and a friendly AI tutor — explained step
            by step for your class level.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-8 py-3 rounded-xl hover:bg-primary-50 transition-colors shadow-sm">
              Start learning free <FiArrowRight />
            </Link>
            <Link to="/login" className="border border-white/60 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors">
              Log in
            </Link>
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
