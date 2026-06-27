import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { schoolService } from '../services/schoolService';
import { inviteService } from '../services/inviteService';
import { emailService } from '../services/emailService';
import { GRADE_LEVELS, SUBJECTS, getGradeLevel } from '../config/curriculum';
import Spinner, { PageLoader } from '../components/Spinner';
import { FiHome, FiBookOpen, FiGrid, FiUsers, FiUserCheck, FiMail, FiCopy, FiX, FiSend } from 'react-icons/fi';

// Turns the result of emailService.sendInvite into a short admin-facing note.
const sendNote = (r) =>
  r?.sent
    ? 'Invite emailed ✓'
    : r?.reason === 'email_not_configured'
    ? 'Invite created ✓ — copy the link to share (email not set up yet)'
    : 'Invite created ✓ — couldn’t email it, copy the link to share';

const ADMIN_TABS = [
  { id: 'school', label: 'School', icon: FiHome },
  { id: 'students', label: 'Students', icon: FiUsers },
  { id: 'teachers', label: 'Teachers', icon: FiUserCheck },
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

// ---- Students ----
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

// ---- Teachers ----
const TeacherInvites = ({ school, admin }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const all = await inviteService.listForSchool(school.id);
      setList(all.filter((i) => i.role === 'teacher'));
    } catch (err) {
      console.error('Could not load invites:', err);
    } finally {
      setLoading(false);
    }
  }, [school.id]);
  useEffect(() => { load(); }, [load]);

  const invite = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!/\S+@\S+\.\S+/.test(email)) return setMsg('Enter a valid email.');
    setBusy(true);
    try {
      await inviteService.create(admin, school, { email, role: 'teacher' });
      const sent = await emailService.sendInvite({ email, role: 'teacher', schoolName: school.name });
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
      <div className="flex items-center gap-2 mb-1"><FiUserCheck className="text-primary-600" /><h2 className="font-bold text-gray-900">Teachers</h2></div>
      <p className="text-sm text-gray-500 mb-3">
        Invite a teacher. When they sign up with this email they join as a teacher and can create their classes.
      </p>
      <form onSubmit={invite} className="flex gap-2 mb-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@example.com"
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
        <p className="text-sm text-gray-400">No teachers invited yet.</p>
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
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('school');

  const load = useCallback(async () => {
    if (!currentUser) return;
    try {
      const s = await schoolService.getMySchool(currentUser.uid);
      setSchool(s);
      if (s) setName(s.name);
    } catch (err) {
      console.error('Could not load school:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
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

  if (userProfile && userProfile.userType !== 'superadmin') {
    return <Navigate to="/" replace />;
  }
  if (loading) {
    return <div className="bg-gray-50 min-h-screen"><div className="container py-8 max-w-4xl"><PageLoader /></div></div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">School administration</h1>
        <p className="text-gray-600 text-sm mb-6">Manage your school, classes, subjects and people.</p>

        {!school ? (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1"><FiHome className="text-primary-600" /><h2 className="font-bold text-gray-900">Create your school</h2></div>
            <p className="text-sm text-gray-500 mb-3">Name your school to get started.</p>
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="School name (e.g. Blantyre Secondary School)"
                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
              <button onClick={save} disabled={saving || !name.trim()}
                className="inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-5 rounded-lg transition-colors">
                {saving ? <Spinner className="w-4 h-4" /> : 'Create school'}
              </button>
            </div>
            {msg && <p className="text-xs text-green-600 mt-2">{msg}</p>}
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-5 border-b border-gray-200 overflow-x-auto">
              {ADMIN_TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                    tab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}>
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>

            {tab === 'school' && (
              <div className="space-y-6">
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-1"><FiHome className="text-primary-600" /><h2 className="font-bold text-gray-900">School</h2></div>
                  <p className="text-sm text-gray-500 mb-3">Your school details.</p>
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

            {tab === 'students' && <StudentInvites school={school} admin={currentUser} />}
            {tab === 'teachers' && <TeacherInvites school={school} admin={currentUser} />}
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
