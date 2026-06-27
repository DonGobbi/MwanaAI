import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { schoolService } from '../services/schoolService';
import { inviteService } from '../services/inviteService';
import { emailService } from '../services/emailService';
import { GRADE_LEVELS, SUBJECTS, getGradeLevel } from '../config/curriculum';
import Spinner, { PageLoader } from '../components/Spinner';
import {
  FiHome, FiBookOpen, FiGrid, FiUsers, FiUserCheck, FiMail, FiCopy, FiX, FiSend,
  FiCheckCircle, FiArrowRight, FiSettings, FiShield,
} from 'react-icons/fi';

// Turns the result of emailService.sendInvite into a short admin-facing note.
const sendNote = (r) =>
  r?.sent
    ? 'Invite emailed ✓'
    : r?.reason === 'email_not_configured'
    ? 'Invite created ✓ — copy the link to share (email not set up yet)'
    : 'Invite created ✓ — couldn’t email it, copy the link to share';

const ONBOARD_STEPS = [
  { icon: FiHome, title: 'Create your school', text: 'Name it to get started.' },
  { icon: FiShield, title: 'Add school admins', text: 'Delegates who enrol people.' },
  { icon: FiUserCheck, title: 'Invite teachers', text: 'They run classes and set work.' },
  { icon: FiUsers, title: 'Enrol students', text: 'Into their class & subjects.' },
];

const CopyButton = ({ email }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const link = `${window.location.origin}/signup?email=${encodeURIComponent(email)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      /* clipboard blocked */
    }
  };
  return (
    <button onClick={copy} className="text-xs text-primary-600 hover:underline inline-flex items-center gap-1 flex-shrink-0">
      <FiCopy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
};

// Re-send the invite email for an existing invite (best-effort).
const EmailButton = ({ invite, schoolName }) => {
  const [state, setState] = useState(''); // '' | 'sending' | 'sent' | 'fail'
  const send = async () => {
    setState('sending');
    const r = await emailService.sendInvite({
      email: invite.email,
      role: invite.role,
      schoolName,
      gradeLabel: invite.gradeLabel || invite.gradeLevel,
      subjects: invite.subjects,
    });
    setState(r?.sent ? 'sent' : 'fail');
    setTimeout(() => setState(''), 2000);
  };
  return (
    <button onClick={send} disabled={state === 'sending'}
      className="text-xs text-primary-600 hover:underline inline-flex items-center gap-1 flex-shrink-0 disabled:opacity-50"
      title="Email the invite link">
      <FiSend className="w-3.5 h-3.5" />
      {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Sent!' : state === 'fail' ? 'Failed' : 'Email'}
    </button>
  );
};

const StatusBadge = ({ status }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
    status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
  }`}>
    {status === 'accepted' ? 'Joined' : 'Pending'}
  </span>
);

const StatTile = ({ icon: Icon, value, label, sub, color }) => (
  <div className="card p-4">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1 truncate">{label}</p>
      </div>
    </div>
    {sub != null && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
  </div>
);

// ---- Overview: a smart, at-a-glance command center ----
const Overview = ({ school, isSuper, onGo }) => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const all = await inviteService.listForSchool(school.id);
        if (active) setInvites(all);
      } catch (err) {
        /* ignore */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [school.id]);

  const students = invites.filter((i) => i.role === 'student');
  const teachers = invites.filter((i) => i.role === 'teacher');
  const admins = invites.filter((i) => i.role === 'admin');
  const joined = (arr) => arr.filter((i) => i.status === 'accepted').length;

  const steps = [
    { done: true, label: 'School created', desc: school.name },
    ...(isSuper
      ? [{
          done: admins.length > 0,
          label: 'Add a school admin',
          desc: admins.length ? `${admins.length} admin${admins.length !== 1 ? 's' : ''} · ${joined(admins)} joined` : 'Delegate teacher & student enrolment',
          tab: 'admins',
        }]
      : []),
    {
      done: teachers.length > 0,
      label: 'Invite teachers',
      desc: teachers.length ? `${teachers.length} invited · ${joined(teachers)} joined` : 'Add the teachers who will run classes',
      tab: 'teachers',
    },
    {
      done: students.length > 0,
      label: 'Enrol students',
      desc: students.length ? `${students.length} invited · ${joined(students)} joined` : 'Add students to their class & subjects',
      tab: 'students',
    },
  ];
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-secondary-900 to-primary-700 text-white p-6 sm:p-7 shadow-sm">
        <p className="text-primary-100 text-xs uppercase tracking-wide">School</p>
        <h2 className="text-2xl sm:text-3xl font-bold">{school.name}</h2>
        <p className="text-primary-50/90 text-sm mt-1">
          {loading ? 'Loading…' : `${students.length} student${students.length !== 1 ? 's' : ''} · ${teachers.length} teacher${teachers.length !== 1 ? 's' : ''} invited`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={FiUsers} value={students.length} label="Students" sub={`${joined(students)} joined`} color="bg-sky-100 text-sky-600" />
        <StatTile icon={FiUserCheck} value={teachers.length} label="Teachers" sub={`${joined(teachers)} joined`} color="bg-violet-100 text-violet-600" />
        {isSuper ? (
          <StatTile icon={FiShield} value={admins.length} label="School admins" sub={`${joined(admins)} joined`} color="bg-rose-100 text-rose-600" />
        ) : (
          <StatTile icon={FiGrid} value={GRADE_LEVELS.length} label="Classes" sub="grades available" color="bg-amber-100 text-amber-600" />
        )}
        <StatTile icon={FiBookOpen} value={SUBJECTS.length} label="Subjects" sub="offered" color="bg-emerald-100 text-emerald-600" />
      </div>

      {/* Setup checklist */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Set up your school</h3>
          <span className="text-xs text-gray-400">{completed}/{steps.length} done</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div className="h-2 rounded-full bg-primary-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <ul className="space-y-1">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-3 py-1.5">
              {s.done ? (
                <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800">{s.label}</p>
                <p className="text-xs text-gray-400 truncate">{s.desc}</p>
              </div>
              {s.tab && (
                <button onClick={() => onGo(s.tab)}
                  className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1 flex-shrink-0">
                  {s.done ? 'Manage' : 'Add'} <FiArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {completed === steps.length && (
          <p className="text-sm text-green-600 mt-4">🎉 Your school is set up — everyone can sign in and start learning.</p>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={() => onGo('students')}
          className="card p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <span>
            <span className="block font-semibold text-gray-900">Enrol a student</span>
            <span className="text-xs text-gray-500">Set their class &amp; subjects</span>
          </span>
          <FiArrowRight className="text-primary-600 flex-shrink-0" />
        </button>
        <button onClick={() => onGo(isSuper ? 'admins' : 'teachers')}
          className="card p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between">
          <span>
            <span className="block font-semibold text-gray-900">{isSuper ? 'Add a school admin' : 'Invite a teacher'}</span>
            <span className="text-xs text-gray-500">{isSuper ? 'They enrol teachers & students' : 'They create classes'}</span>
          </span>
          <FiArrowRight className="text-primary-600 flex-shrink-0" />
        </button>
      </div>
    </div>
  );
};

// ---- Students (with class + subjects) ----
const StudentInvites = ({ school, admin }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const all = await inviteService.listForSchool(school.id);
      setList(all.filter((i) => i.role === 'student'));
    } catch (err) {
      console.error('Could not load invites:', err);
    } finally {
      setLoading(false);
    }
  }, [school.id]);
  useEffect(() => { load(); }, [load]);

  const toggle = (v) => setSubjects((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  const invite = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!/\S+@\S+\.\S+/.test(email)) return setMsg('Enter a valid email.');
    if (!gradeLevel) return setMsg('Pick a class.');
    if (!subjects.length) return setMsg('Pick at least one subject.');
    setBusy(true);
    try {
      const gradeLabel = getGradeLevel(gradeLevel)?.label || gradeLevel;
      await inviteService.create(admin, school, { email, role: 'student', gradeLevel, gradeLabel, subjects });
      const sent = await emailService.sendInvite({ email, role: 'student', schoolName: school.name, gradeLabel, subjects });
      setEmail(''); setGradeLevel(''); setSubjects([]); setMsg(sendNote(sent));
      load();
    } catch (err) {
      setMsg(err.message || 'Could not create invite.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try { await inviteService.remove(id); setList((p) => p.filter((i) => i.id !== id)); }
    catch (err) { console.error(err); }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1"><FiUsers className="text-primary-600" /><h2 className="font-bold text-gray-900">Students</h2></div>
      <p className="text-sm text-gray-500 mb-3">
        Invite a student and set their class &amp; subjects. When they sign up with this email, their account is set up automatically.
      </p>

      <form onSubmit={invite} className="space-y-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com"
            className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
          <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
            <option value="">Class</option>
            <optgroup label="Primary">{GRADE_LEVELS.filter((g) => g.stage === 'Primary').map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
            <optgroup label="Secondary">{GRADE_LEVELS.filter((g) => g.stage === 'Secondary').map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
          </select>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Subjects ({subjects.length})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {SUBJECTS.map((s) => {
              const on = subjects.includes(s.value);
              return (
                <label key={s.value} className={`flex items-center gap-2 rounded-lg border p-2 text-sm cursor-pointer transition-colors ${
                  on ? 'border-primary-400 bg-primary-50 text-primary-800' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(s.value)} className="rounded text-primary-600 focus:ring-primary-500" />
                  {s.label}
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy}
            className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {busy ? <Spinner className="w-4 h-4" /> : <><FiMail /> Invite student</>}
          </button>
          {msg && <span className={`text-xs ${msg.includes('✓') ? 'text-green-600' : 'text-amber-600'}`}>{msg}</span>}
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-400">No students invited yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {list.map((i) => (
            <li key={i.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{i.email}</p>
                <p className="text-xs text-gray-400">
                  {i.gradeLabel || i.gradeLevel}{i.subjects?.length ? ` · ${i.subjects.length} subject${i.subjects.length !== 1 ? 's' : ''}` : ''}
                </p>
              </div>
              <StatusBadge status={i.status} />
              <EmailButton invite={i} schoolName={school.name} />
              <CopyButton email={i.email} />
              <button onClick={() => remove(i.id)} className="text-gray-300 hover:text-red-500 p-1 flex-shrink-0" aria-label="Remove"><FiX className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ---- Email-only invites (teachers and school admins share this shape) ----
const RoleInvites = ({ school, admin, role, title, description, icon: Icon, placeholder }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const all = await inviteService.listForSchool(school.id);
      setList(all.filter((i) => i.role === role));
    } catch (err) {
      console.error('Could not load invites:', err);
    } finally {
      setLoading(false);
    }
  }, [school.id, role]);
  useEffect(() => { load(); }, [load]);

  const invite = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!/\S+@\S+\.\S+/.test(email)) return setMsg('Enter a valid email.');
    setBusy(true);
    try {
      await inviteService.create(admin, school, { email, role });
      const sent = await emailService.sendInvite({ email, role, schoolName: school.name });
      setEmail(''); setMsg(sendNote(sent));
      load();
    } catch (err) {
      setMsg(err.message || 'Could not create invite.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try { await inviteService.remove(id); setList((p) => p.filter((i) => i.id !== id)); }
    catch (err) { console.error(err); }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1"><Icon className="text-primary-600" /><h2 className="font-bold text-gray-900">{title}</h2></div>
      <p className="text-sm text-gray-500 mb-3">{description}</p>
      <form onSubmit={invite} className="flex gap-2 mb-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={placeholder}
          className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
        <button type="submit" disabled={busy}
          className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 rounded-lg transition-colors flex-shrink-0">
          {busy ? <Spinner className="w-4 h-4" /> : <><FiMail /> Invite</>}
        </button>
      </form>
      {msg && <p className={`text-xs mb-3 ${msg.includes('✓') ? 'text-green-600' : 'text-amber-600'}`}>{msg}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-400">None invited yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {list.map((i) => (
            <li key={i.id} className="flex items-center gap-3 py-2.5">
              <p className="text-sm font-medium text-gray-800 truncate flex-1 min-w-0">{i.email}</p>
              <StatusBadge status={i.status} />
              <EmailButton invite={i} schoolName={school.name} />
              <CopyButton email={i.email} />
              <button onClick={() => remove(i.id)} className="text-gray-300 hover:text-red-500 p-1 flex-shrink-0" aria-label="Remove"><FiX className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Admin = () => {
  const { currentUser, userProfile } = useAuth();
  const isSuper = userProfile?.userType === 'superadmin';
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('overview');

  const load = useCallback(async () => {
    if (!currentUser || !userProfile) return;
    try {
      const s = isSuper
        ? await schoolService.getMySchool(currentUser.uid)
        : await schoolService.getSchool(userProfile.schoolId);
      setSchool(s);
      if (s) setName(s.name);
    } catch (err) {
      console.error('Could not load school:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, userProfile, isSuper]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true); setMsg('');
    try {
      if (school) { await schoolService.updateSchool(school.id, name); setMsg('Saved ✓'); }
      else { const s = await schoolService.createSchool(currentUser.uid, name); setSchool(s); setMsg('School created ✓'); }
      load();
    } catch (err) {
      setMsg(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  // Only Super Admins and School Admins may see this page.
  if (userProfile && userProfile.userType !== 'superadmin' && userProfile.userType !== 'admin') {
    return <Navigate to="/" replace />;
  }
  if (loading) {
    return <div className="bg-gray-50 min-h-screen"><div className="container py-8 max-w-7xl"><PageLoader /></div></div>;
  }

  // A School Admin whose school can't be found (rare).
  if (!isSuper && !school) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container py-10 max-w-2xl text-center">
          <div className="card p-8">
            <FiShield className="w-8 h-8 text-primary-600 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-gray-900 mb-1">No school assigned yet</h1>
            <p className="text-sm text-gray-500">Ask your Super Admin to add you to a school, then sign in again.</p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Onboarding: Super Admin with no school yet ----
  if (isSuper && !school) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container py-10 max-w-4xl">
          <div className="text-center mb-7">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <FiHome className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to MwanaAI 👋</h1>
            <p className="text-gray-500 mt-1">Let's set up your school — it only takes a minute.</p>
          </div>

          <div className="card p-6 mb-6 max-w-2xl mx-auto">
            <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-1">School name</label>
            <div className="flex gap-2">
              <input id="schoolName" value={name} onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && save()}
                placeholder="e.g. Blantyre Secondary School"
                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" autoFocus />
              <button onClick={save} disabled={saving || !name.trim()}
                className="inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-5 rounded-lg transition-colors">
                {saving ? <Spinner className="w-4 h-4" /> : 'Create school'}
              </button>
            </div>
            {msg && <p className="text-xs text-green-600 mt-2">{msg}</p>}
          </div>

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 text-center">What happens next</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ONBOARD_STEPS.map((s, i) => (
              <div key={s.title} className="card p-4 flex gap-3 items-start">
                <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0 relative">
                  <s.icon className="w-4 h-4" />
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                  <p className="text-xs text-gray-500">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Tabs depend on role: Super Admins also manage School Admins + Settings.
  const tabs = isSuper
    ? [
        { id: 'overview', label: 'Overview', icon: FiGrid },
        { id: 'admins', label: 'School Admins', icon: FiShield },
        { id: 'students', label: 'Students', icon: FiUsers },
        { id: 'teachers', label: 'Teachers', icon: FiUserCheck },
        { id: 'settings', label: 'Settings', icon: FiSettings },
      ]
    : [
        { id: 'overview', label: 'Overview', icon: FiGrid },
        { id: 'students', label: 'Students', icon: FiUsers },
        { id: 'teachers', label: 'Teachers', icon: FiUserCheck },
      ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-7xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">School administration</h1>
        <p className="text-gray-600 text-sm mb-6">
          {isSuper ? 'Manage your school, school admins, teachers and students.' : "Manage your school's teachers and students."}
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-gray-200 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <Overview school={school} isSuper={isSuper} onGo={setTab} />}

        {tab === 'admins' && isSuper && (
          <RoleInvites school={school} admin={currentUser} role="admin" icon={FiShield}
            title="School Admins" placeholder="admin@example.com"
            description="Invite a school admin to help you run the school. They can enrol teachers and students, but can't create schools or other admins." />
        )}

        {tab === 'students' && <StudentInvites school={school} admin={currentUser} />}

        {tab === 'teachers' && (
          <RoleInvites school={school} admin={currentUser} role="teacher" icon={FiUserCheck}
            title="Teachers" placeholder="teacher@example.com"
            description="Invite a teacher. When they sign up with this email they join as a teacher and can create their classes." />
        )}

        {tab === 'settings' && isSuper && (
          <div className="space-y-6">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-1"><FiHome className="text-primary-600" /><h2 className="font-bold text-gray-900">School name</h2></div>
              <p className="text-sm text-gray-500 mb-3">Rename your school.</p>
              <div className="flex gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
                <button onClick={save} disabled={saving || !name.trim()}
                  className="inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-5 rounded-lg transition-colors">
                  {saving ? <Spinner className="w-4 h-4" /> : 'Save'}
                </button>
              </div>
              {msg && <p className="text-xs text-green-600 mt-2">{msg}</p>}
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 mb-1"><FiGrid className="text-primary-600" /><h2 className="font-bold text-gray-900">Classes</h2></div>
              <p className="text-sm text-gray-500 mb-3">The grades students can be enrolled in (Malawi curriculum).</p>
              <div className="flex flex-wrap gap-2">
                {GRADE_LEVELS.map((g) => <span key={g.value} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{g.label}</span>)}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 mb-1"><FiBookOpen className="text-primary-600" /><h2 className="font-bold text-gray-900">Subjects</h2></div>
              <p className="text-sm text-gray-500 mb-3">Subjects offered (from the curriculum).</p>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => <span key={s.value} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full">{s.label}</span>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
