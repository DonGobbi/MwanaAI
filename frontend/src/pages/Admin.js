import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { schoolService } from '../services/schoolService';
import { inviteService } from '../services/inviteService';
import { emailService } from '../services/emailService';
import { accountService } from '../services/accountService';
import { auditService } from '../services/auditService';
import { subjectService } from '../services/subjectService';
import { classroomService } from '../services/classroomService';
import firebaseService from '../services/firebaseService';
import { GRADE_LEVELS, SUBJECTS, getGradeLevel } from '../config/curriculum';
import { useSchoolSubjects } from '../hooks/useSchoolSubjects';
import { calculateAge } from '../utils/age';
import Spinner, { PageLoader } from '../components/Spinner';
import ConfirmDialog from '../components/ConfirmDialog';
import ActionMenu from '../components/ActionMenu';
import {
  FiHome, FiBookOpen, FiGrid, FiUsers, FiUserCheck, FiMail, FiCopy, FiX, FiSend,
  FiCheckCircle, FiArrowRight, FiSettings, FiShield, FiPlus, FiKey, FiSlash, FiRefreshCw,
  FiSearch, FiChevronLeft, FiChevronRight, FiEye, FiClock, FiArchive,
} from 'react-icons/fi';

// Turns the result of emailService.sendInvite into a short admin-facing note.
const sendNote = (r) =>
  r?.sent
    ? 'Invite emailed ✓'
    : r?.reason === 'email_not_configured'
    ? 'Invite created ✓ — copy the link to share (email not set up yet)'
    : 'Invite created ✓ — couldn’t email it, copy the link to share';

const CopyButton = ({ invite }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const link = emailService.inviteLink({
      email: invite.email, role: invite.role, gradeLevel: invite.gradeLevel,
      subjects: invite.subjects, schoolName: invite.schoolName,
    });
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
      gradeLevel: invite.gradeLevel,
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

// Lifecycle badge for an actual account (vs. an invite).
const ACCOUNT_STATUS_STYLES = {
  active: 'bg-green-100 text-green-700',
  deactivated: 'bg-red-100 text-red-700',
  suspended: 'bg-red-100 text-red-700',
  archived: 'bg-amber-100 text-amber-700',
};
const AccountStatusBadge = ({ status }) => {
  const s = (status || 'active').toLowerCase();
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${ACCOUNT_STATUS_STYLES[s] || 'bg-gray-100 text-gray-600'}`}>
      {s}
    </span>
  );
};

// Pending invitations only — people who've joined move to the accounts list.
// Searchable + paginated so it never becomes an endless scroll.
const INVITES_PAGE_SIZE = 8;

const InviteList = ({ invites, schoolName, onRemove }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const pending = useMemo(() => invites.filter((i) => i.status !== 'accepted'), [invites]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? pending.filter((i) => (i.email || '').toLowerCase().includes(q)) : pending;
  }, [pending, search]);
  useEffect(() => { setPage(0); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / INVITES_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * INVITES_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + INVITES_PAGE_SIZE);

  if (pending.length === 0) {
    return <p className="text-sm text-gray-400">No pending invitations. Anyone who has joined appears in the accounts list below.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {pending.length} pending {pending.length === 1 ? 'invitation' : 'invitations'}
        </p>
      </div>
      {pending.length > INVITES_PAGE_SIZE && (
        <div className="relative mb-2 max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email"
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500" />
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-3">No invitations match your search.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {pageItems.map((i) => {
            const meta = [(i.gradeLabel || i.gradeLevel) || '', i.subjects?.length ? `${i.subjects.length} subject${i.subjects.length !== 1 ? 's' : ''}` : '']
              .filter(Boolean).join(' · ');
            return (
              <li key={i.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{i.email}</p>
                  {meta && <p className="text-xs text-gray-400">{meta}</p>}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-amber-100 text-amber-700">Pending</span>
                <EmailButton invite={i} schoolName={schoolName} />
                <CopyButton invite={i} />
                <button onClick={() => onRemove(i.id)} className="text-gray-300 hover:text-red-500 p-1 flex-shrink-0" aria-label="Revoke invitation"><FiX className="w-4 h-4" /></button>
              </li>
            );
          })}
        </ul>
      )}
      {filtered.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Showing {start + 1}–{Math.min(filtered.length, start + INVITES_PAGE_SIZE)} of {filtered.length}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} aria-label="Previous page"
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"><FiChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs text-gray-500 px-2 tabular-nums">Page {safePage + 1} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} aria-label="Next page"
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"><FiChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
};

// Lifecycle actions a member row can trigger (kind → target status + copy).
const STATUS_ACTIONS = {
  deactivate: { status: 'deactivated', tone: 'danger', verb: 'Deactivate', audit: 'Deactivated account', message: "They won't be able to sign in until you reactivate them. Their data is kept." },
  reactivate: { status: 'active', tone: 'primary', verb: 'Reactivate', audit: 'Reactivated account', message: "They'll be able to sign in again straight away." },
  archive: { status: 'archived', tone: 'danger', verb: 'Archive', audit: 'Archived account', message: "They'll be moved to the archive and won't be able to sign in. You can restore them here within 45 days." },
  restore: { status: 'active', tone: 'primary', verb: 'Restore', audit: 'Restored account', message: "They'll be moved back to active and can sign in again." },
};

const ARCHIVE_RETENTION_DAYS = 45;
const daysLeftInArchive = (archivedAt) => {
  if (!archivedAt) return null;
  return Math.max(0, ARCHIVE_RETENTION_DAYS - Math.floor((Date.now() - archivedAt) / 86400000));
};

// Actual enrolled accounts for one role: see details, reset password,
// (de)activate, and archive. School Admins may manage teacher/student/parent
// accounts in their school; only a Super Admin may manage other admins.
const MEMBERS_PAGE_SIZE = 10;

const MembersList = ({ school, role, actor, canDeactivate }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [openId, setOpenId] = useState('');
  const [note, setNote] = useState({}); // uid -> transient message
  const [confirmAction, setConfirmAction] = useState(null); // { user, status } pending confirmation
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | deactivated
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    try {
      const all = await accountService.listBySchool(school.id);
      setMembers(all.filter((u) => (u.userType || '') === role));
    } catch (err) {
      console.error('Could not load members:', err);
    } finally {
      setLoading(false);
    }
  }, [school.id, role]);
  useEffect(() => { load(); }, [load]);

  const flash = (uid, msg) => {
    setNote((p) => ({ ...p, [uid]: msg }));
    setTimeout(() => setNote((p) => { const n = { ...p }; delete n[uid]; return n; }), 2500);
  };

  const changeStatus = async (u, status, auditAction) => {
    setBusyId(u.uid);
    try {
      await accountService.setStatus(u.uid, status, actor?.uid);
      setMembers((p) => p.map((m) => (m.uid === u.uid ? { ...m, status, ...(status === 'archived' ? { archivedAt: Date.now() } : {}) } : m)));
      auditService.log({
        schoolId: school.id, actor, action: auditAction || `Set status: ${status}`,
        targetType: role, targetId: u.uid, targetName: u.displayName || u.email,
      });
    } catch (err) {
      console.error('setStatus failed:', err);
      const msg = err?.code === 'permission-denied'
        ? "Permission denied. If you just set this up, the latest security rules may not be published yet."
        : 'Could not update the account. Please try again.';
      flash(u.uid, msg);
    } finally {
      setBusyId('');
    }
  };

  const sendReset = async (u) => {
    try {
      await firebaseService.resetPassword(u.email);
      flash(u.uid, 'Password reset email sent ✓');
      auditService.log({
        schoolId: school.id, actor, action: 'Sent password reset',
        targetType: role, targetId: u.uid, targetName: u.displayName || u.email,
      });
    } catch (err) {
      flash(u.uid, 'Could not send the reset email.');
    }
  };

  const counts = useMemo(() => {
    let active = 0, deactivated = 0, archived = 0;
    members.forEach((u) => {
      const st = (u.status || 'active').toLowerCase();
      if (st === 'archived') archived += 1;
      else if (st === 'deactivated') deactivated += 1;
      else active += 1;
    });
    return { active, deactivated, archived, nonArchived: active + deactivated };
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((u) => {
      const st = (u.status || 'active').toLowerCase();
      // Archived accounts are hidden from every view except the Archived filter.
      if (statusFilter === 'all' && st === 'archived') return false;
      if (statusFilter === 'active' && st !== 'active') return false;
      if (statusFilter === 'deactivated' && st !== 'deactivated') return false;
      if (statusFilter === 'archived' && st !== 'archived') return false;
      if (!q) return true;
      return (u.displayName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    });
  }, [members, search, statusFilter]);

  // Snap back to the first page whenever the result set changes.
  useEffect(() => { setPage(0); }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / MEMBERS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * MEMBERS_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + MEMBERS_PAGE_SIZE);

  if (loading) return <p className="text-sm text-gray-400">Loading accounts…</p>;
  if (members.length === 0) return <p className="text-sm text-gray-400">No {role} accounts yet — invites appear here once they sign up.</p>;

  return (
    <div>
      {/* Toolbar: search + always-visible status filter chips */}
      <div className="mb-3 space-y-2">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="w-full pl-9 pr-3 py-2 rounded-lg border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'all', label: 'All', n: counts.nonArchived },
            { key: 'active', label: 'Active', n: counts.active },
            { key: 'deactivated', label: 'Deactivated', n: counts.deactivated },
            { key: 'archived', label: 'Archived', n: counts.archived },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                statusFilter === f.key
                  ? 'bg-primary-600 text-white'
                  : f.key === 'archived' && f.n > 0
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label} ({f.n})
            </button>
          ))}
        </div>
      </div>

      {statusFilter === 'archived' && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
          Archived accounts can't sign in and are kept for {ARCHIVE_RETENTION_DAYS} days. Restore one anytime from its ⋮ menu.
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          {statusFilter === 'archived' ? 'No archived accounts.' : 'No accounts match your search.'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {pageItems.map((u) => {
            const status = (u.status || 'active').toLowerCase();
            const open = openId === u.uid;
            const age = calculateAge(u.dateOfBirth);
            const initials = (u.displayName || u.email || 'U').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
            const daysLeft = status === 'archived' ? daysLeftInArchive(u.archivedAt) : null;
            return (
              <li key={u.uid} className="py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">{initials}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.displayName || u.email}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    {status === 'archived' && (
                      <p className="text-xs text-amber-600">
                        Archived{u.archivedAt ? ` ${new Date(u.archivedAt).toLocaleDateString()}` : ''}{daysLeft != null ? ` · deletes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : ''}
                      </p>
                    )}
                  </div>
                  <AccountStatusBadge status={status} />
                  <ActionMenu
                    items={[
                      { label: open ? 'Hide details' : 'View details', icon: <FiEye className="w-4 h-4" />, onClick: () => setOpenId(open ? '' : u.uid) },
                      status !== 'archived' && { label: 'Send password reset', icon: <FiKey className="w-4 h-4" />, onClick: () => sendReset(u) },
                      canDeactivate && status === 'active' && { label: 'Deactivate account', icon: <FiSlash className="w-4 h-4" />, tone: 'danger', onClick: () => setConfirmAction({ user: u, kind: 'deactivate' }) },
                      canDeactivate && status === 'deactivated' && { label: 'Reactivate account', icon: <FiRefreshCw className="w-4 h-4" />, tone: 'success', onClick: () => setConfirmAction({ user: u, kind: 'reactivate' }) },
                      canDeactivate && status !== 'archived' && { label: 'Archive account', icon: <FiArchive className="w-4 h-4" />, tone: 'danger', onClick: () => setConfirmAction({ user: u, kind: 'archive' }) },
                      canDeactivate && status === 'archived' && { label: 'Restore account', icon: <FiRefreshCw className="w-4 h-4" />, tone: 'success', onClick: () => setConfirmAction({ user: u, kind: 'restore' }) },
                    ]}
                  />
                </div>
                {note[u.uid] && <p className={`text-xs mt-1 ml-12 ${note[u.uid].includes('✓') ? 'text-green-600' : 'text-amber-600'}`}>{note[u.uid]}</p>}
                {open && (
                  <div className="mt-2 ml-12 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 rounded-lg p-3 text-xs">
                    <div><p className="text-gray-400">Gender</p><p className="text-gray-800">{u.gender || '—'}</p></div>
                    <div><p className="text-gray-400">Age</p><p className="text-gray-800">{age != null ? age : '—'}</p></div>
                    <div><p className="text-gray-400">Phone</p><p className="text-gray-800">{u.phone || '—'}</p></div>
                    <div><p className="text-gray-400">Class</p><p className="text-gray-800">{getGradeLevel(u.gradeLevel)?.label || '—'}</p></div>
                    {role === 'student' && <div><p className="text-gray-400">Section</p><p className="text-gray-800">{u.classroomName || '—'}</p></div>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer: showing-X-of-N + pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Showing {start + 1}–{Math.min(filtered.length, start + MEMBERS_PAGE_SIZE)} of {filtered.length}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}
                aria-label="Previous page"
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 px-2 tabular-nums">Page {safePage + 1} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}
                aria-label="Next page"
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        tone={confirmAction ? STATUS_ACTIONS[confirmAction.kind].tone : 'danger'}
        title={confirmAction ? `${STATUS_ACTIONS[confirmAction.kind].verb} ${confirmAction.user.displayName || confirmAction.user.email || 'this account'}?` : ''}
        message={confirmAction ? STATUS_ACTIONS[confirmAction.kind].message : ''}
        confirmLabel={confirmAction ? STATUS_ACTIONS[confirmAction.kind].verb : ''}
        busy={!!confirmAction && busyId === confirmAction.user.uid}
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          const { user, kind } = confirmAction;
          const cfg = STATUS_ACTIONS[kind];
          await changeStatus(user, cfg.status, cfg.audit);
          setConfirmAction(null);
        }}
      />
    </div>
  );
};

// A role tab = invite people in + manage the accounts that have joined.
const PeopleSection = ({ inviteUI, school, role, actor, canDeactivate, accountsTitle, icon: Icon }) => (
  <div className="space-y-5">
    {inviteUI}
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1"><Icon className="text-primary-600" /><h2 className="font-bold text-gray-900">{accountsTitle}</h2></div>
      <p className="text-sm text-gray-500 mb-3">Accounts that have joined. View details, send a password reset, or deactivate access.</p>
      <MembersList school={school} role={role} actor={actor} canDeactivate={canDeactivate} />
    </div>
  </div>
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
  const [accounts, setAccounts] = useState([]);
  const [invites, setInvites] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [acc, inv, subj, rooms] = await Promise.all([
          accountService.listBySchool(school.id),
          inviteService.listForSchool(school.id),
          subjectService.listForSchool(school.id),
          classroomService.listForSchool(school.id),
        ]);
        if (active) { setAccounts(acc); setInvites(inv); setSubjects(subj); setClassrooms(rooms); }
      } catch (err) {
        /* ignore */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [school.id]);

  // Real, joined accounts by role (archived excluded); pending = invited, not joined.
  const live = accounts.filter((u) => (u.status || 'active').toLowerCase() !== 'archived');
  const countRole = (role) => live.filter((u) => (u.userType || '') === role).length;
  const pending = (role) => invites.filter((i) => i.role === role && i.status !== 'accepted').length;
  const studentCount = countRole('student');
  const teacherCount = countRole('teacher');
  const adminCount = countRole('admin');
  const activeSubjects = subjects.filter((s) => (s.status || 'active') === 'active').length;
  const activeRooms = classrooms.filter((c) => (c.status || 'active') === 'active').length;
  const pendSub = (n) => (n > 0 ? `${n} pending invite${n !== 1 ? 's' : ''}` : 'none pending');
  const v = (n) => (loading ? '…' : n);

  const stepDesc = (count, pend, empty) =>
    count || pend ? `${count} active · ${pend} pending` : empty;
  const steps = [
    { done: true, label: 'School created', desc: school.name },
    ...(isSuper
      ? [{
          done: adminCount > 0 || pending('admin') > 0,
          label: 'Add a school admin',
          desc: stepDesc(adminCount, pending('admin'), 'Delegate teacher & student enrolment'),
          tab: 'admins',
        }]
      : []),
    {
      done: teacherCount > 0 || pending('teacher') > 0,
      label: 'Invite teachers',
      desc: stepDesc(teacherCount, pending('teacher'), 'Add the teachers who will run classes'),
      tab: 'teachers',
    },
    {
      done: studentCount > 0 || pending('student') > 0,
      label: 'Enrol students',
      desc: stepDesc(studentCount, pending('student'), 'Add students to their class & subjects'),
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
          {loading ? 'Loading…' : `${studentCount} student${studentCount !== 1 ? 's' : ''} · ${teacherCount} teacher${teacherCount !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Stats — real, joined accounts (not invites) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={FiUsers} value={v(studentCount)} label="Students" sub={pendSub(pending('student'))} color="bg-sky-100 text-sky-600" />
        <StatTile icon={FiUserCheck} value={v(teacherCount)} label="Teachers" sub={pendSub(pending('teacher'))} color="bg-violet-100 text-violet-600" />
        {isSuper ? (
          <StatTile icon={FiShield} value={v(adminCount)} label="School admins" sub={pendSub(pending('admin'))} color="bg-rose-100 text-rose-600" />
        ) : (
          <StatTile icon={FiGrid} value={v(activeRooms)} label="Classrooms" sub={activeRooms ? 'active' : 'add in Classrooms'} color="bg-amber-100 text-amber-600" />
        )}
        <StatTile icon={FiBookOpen} value={v(activeSubjects)} label="Subjects" sub={activeSubjects ? 'active' : 'add in Subjects'} color="bg-emerald-100 text-emerald-600" />
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
  const [classroomId, setClassroomId] = useState('');
  const [classrooms, setClassrooms] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const { subjects: subjectChoices } = useSchoolSubjects(school.id);

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

  // Active classrooms the student can be assigned to.
  useEffect(() => {
    classroomService.listForSchool(school.id)
      .then((all) => setClassrooms(all.filter((c) => (c.status || 'active') === 'active')))
      .catch(() => {});
  }, [school.id]);

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
      const classroom = classrooms.find((c) => c.id === classroomId);
      await inviteService.create(admin, school, { email, role: 'student', gradeLevel, gradeLabel, subjects, classroomId, classroomName: classroom?.name || '' });
      const sent = await emailService.sendInvite({ email, role: 'student', schoolName: school.name, gradeLevel, gradeLabel, subjects });
      auditService.log({ schoolId: school.id, actor: admin, action: 'Invited a student', targetType: 'student', targetId: email, targetName: classroom ? `${email} · ${classroom.name}` : email });
      setEmail(''); setGradeLevel(''); setSubjects([]); setClassroomId(''); setMsg(sendNote(sent));
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
          <select value={gradeLevel} onChange={(e) => { setGradeLevel(e.target.value); setClassroomId(''); }}
            className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
            <option value="">Class</option>
            <optgroup label="Primary">{GRADE_LEVELS.filter((g) => g.stage === 'Primary').map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
            <optgroup label="Secondary">{GRADE_LEVELS.filter((g) => g.stage === 'Secondary').map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
          </select>
        </div>
        {(() => {
          const opts = classrooms.filter((c) => !gradeLevel || c.level === gradeLevel);
          return opts.length > 0 ? (
            <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)}
              className="w-full sm:w-1/2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
              <option value="">Section / classroom (optional)</option>
              {opts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : null;
        })()}
        <div>
          <p className="text-xs text-gray-500 mb-1">Subjects ({subjects.length})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {subjectChoices.map((s) => {
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
      ) : (
        <InviteList invites={list} schoolName={school.name} onRemove={remove} />
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
      auditService.log({ schoolId: school.id, actor: admin, action: `Invited a ${role}`, targetType: role, targetId: email, targetName: email });
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
      ) : (
        <InviteList invites={list} schoolName={school.name} onRemove={remove} />
      )}
    </div>
  );
};

// ---- Super Admin home: all registered schools + register a new one ----
const SchoolsList = ({ admin, onOpen }) => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [page, setPage] = useState(0);
  const [confirmSchool, setConfirmSchool] = useState(null); // { school, status }
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      setSchools(await schoolService.listSchools());
    } catch (err) {
      console.error('Could not load schools:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const register = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setMsg('');
    try {
      const created = await schoolService.createSchool(admin.uid, name);
      setName(''); setMsg('School registered ✓');
      auditService.log({
        schoolId: created.id, actor: admin, action: 'Registered school',
        targetType: 'school', targetId: created.id, targetName: created.name,
      });
      load();
    } catch (err) {
      setMsg(err.message || 'Could not register the school.');
    } finally {
      setSaving(false);
    }
  };

  const changeSchoolStatus = async (s, status) => {
    setBusyId(s.id);
    try {
      await schoolService.setStatus(s.id, status);
      setSchools((prev) => prev.map((x) => (x.id === s.id ? { ...x, status } : x)));
      auditService.log({
        schoolId: s.id, actor: admin,
        action: status === 'active' ? 'Restored school access' : 'Suspended school',
        targetType: 'school', targetId: s.id, targetName: s.name,
      });
    } catch (err) {
      console.error('school setStatus failed:', err);
    } finally {
      setBusyId('');
    }
  };

  const SCHOOLS_PAGE_SIZE = 9;
  const q = schoolSearch.trim().toLowerCase();
  const visibleSchools = q ? schools.filter((s) => (s.name || '').toLowerCase().includes(q)) : schools;
  useEffect(() => { setPage(0); }, [schoolSearch]);
  const schoolTotalPages = Math.max(1, Math.ceil(visibleSchools.length / SCHOOLS_PAGE_SIZE));
  const schoolSafePage = Math.min(page, schoolTotalPages - 1);
  const schoolStart = schoolSafePage * SCHOOLS_PAGE_SIZE;
  const pagedSchools = visibleSchools.slice(schoolStart, schoolStart + SCHOOLS_PAGE_SIZE);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Schools</h1>
        <p className="text-gray-600 text-sm mb-6">
          The schools registered so far. Open a school to add its admins, teachers, students and parents.
        </p>

        {/* Register a school */}
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-2 mb-1"><FiPlus className="text-primary-600" /><h2 className="font-bold text-gray-900">Register a school</h2></div>
          <p className="text-sm text-gray-500 mb-3">Add a school to the platform, then open it to set up its people.</p>
          <form onSubmit={register} className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Blantyre Secondary School"
              className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
            <button type="submit" disabled={saving || !name.trim()}
              className="inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-5 rounded-lg transition-colors flex-shrink-0">
              {saving ? <Spinner className="w-4 h-4" /> : 'Register'}
            </button>
          </form>
          {msg && <p className={`text-xs mt-2 ${msg.includes('✓') ? 'text-green-600' : 'text-amber-600'}`}>{msg}</p>}
        </div>

        {/* Schools */}
        {loading ? (
          <PageLoader />
        ) : schools.length === 0 ? (
          <div className="card p-8 text-center">
            <FiHome className="w-8 h-8 text-primary-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">No schools yet</p>
            <p className="text-sm text-gray-500">Register your first school above to get started.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="relative flex-1 max-w-sm">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input value={schoolSearch} onChange={(e) => setSchoolSearch(e.target.value)} placeholder="Search schools"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{visibleSchools.length} of {schools.length}</span>
            </div>
            {visibleSchools.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No schools match your search.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pagedSchools.map((s) => {
                    const suspended = (s.status || 'active').toLowerCase() !== 'active';
                    return (
                      <div key={s.id} className="card p-5 flex items-center justify-between gap-3">
                        <button onClick={() => onOpen(s)} className="flex items-center gap-3 text-left min-w-0 flex-1 group">
                          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0"><FiHome className="w-5 h-5" /></div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-800 truncate group-hover:text-primary-700">{s.name}</p>
                              <AccountStatusBadge status={s.status} />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Registered {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => onOpen(s)} className="text-xs text-primary-600 hover:underline inline-flex items-center gap-1 font-medium">
                            Manage <FiArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <ActionMenu
                            items={[
                              suspended
                                ? { label: 'Restore access', icon: <FiRefreshCw className="w-4 h-4" />, tone: 'success', onClick: () => setConfirmSchool({ school: s, status: 'active' }) }
                                : { label: 'Suspend school', icon: <FiSlash className="w-4 h-4" />, tone: 'danger', onClick: () => setConfirmSchool({ school: s, status: 'suspended' }) },
                            ]}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {schoolTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400">Showing {schoolStart + 1}–{Math.min(visibleSchools.length, schoolStart + SCHOOLS_PAGE_SIZE)} of {visibleSchools.length}</p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={schoolSafePage === 0} aria-label="Previous page"
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"><FiChevronLeft className="w-4 h-4" /></button>
                      <span className="text-xs text-gray-500 px-2 tabular-nums">Page {schoolSafePage + 1} of {schoolTotalPages}</span>
                      <button onClick={() => setPage((p) => Math.min(schoolTotalPages - 1, p + 1))} disabled={schoolSafePage >= schoolTotalPages - 1} aria-label="Next page"
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"><FiChevronRight className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmSchool}
        tone={confirmSchool?.status === 'active' ? 'primary' : 'danger'}
        title={`${confirmSchool?.status === 'active' ? 'Restore' : 'Suspend'} ${confirmSchool?.school?.name || 'this school'}?`}
        message={confirmSchool?.status === 'active'
          ? 'Everyone at this school will be able to sign in again.'
          : 'Everyone at this school — admins, teachers, students and parents — will be unable to sign in until you restore access.'}
        confirmLabel={confirmSchool?.status === 'active' ? 'Restore access' : 'Suspend school'}
        busy={!!confirmSchool && busyId === confirmSchool.school.id}
        onCancel={() => setConfirmSchool(null)}
        onConfirm={async () => { const { school, status } = confirmSchool; await changeSchoolStatus(school, status); setConfirmSchool(null); }}
      />
    </div>
  );
};

// ---- Activity history (audit trail) for one school ----
const AUDIT_PAGE_SIZE = 15;

const formatDateTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const actionIcon = (action) => {
  const a = (action || '').toLowerCase();
  if (a.includes('deactivat') || a.includes('suspend') || a.includes('archiv')) return <FiSlash className="w-4 h-4 text-red-500" />;
  if (a.includes('reactivat') || a.includes('restor')) return <FiRefreshCw className="w-4 h-4 text-green-600" />;
  if (a.includes('password')) return <FiKey className="w-4 h-4 text-primary-600" />;
  if (a.includes('invited')) return <FiMail className="w-4 h-4 text-primary-600" />;
  if (a.includes('register')) return <FiPlus className="w-4 h-4 text-primary-600" />;
  return <FiClock className="w-4 h-4 text-gray-400" />;
};

const AuditLog = ({ school }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const all = await auditService.listForSchool(school.id);
        if (active) setLogs(all);
      } catch (err) {
        console.error('Could not load history:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [school.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? logs.filter((l) => `${l.actorName} ${l.action} ${l.targetName}`.toLowerCase().includes(q)) : logs;
  }, [logs, search]);
  useEffect(() => { setPage(0); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / AUDIT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * AUDIT_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + AUDIT_PAGE_SIZE);

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1"><FiClock className="text-primary-600" /><h2 className="font-bold text-gray-900">Activity history</h2></div>
      <p className="text-sm text-gray-500 mb-3">A record of admin actions in this school — who did what, and when.</p>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-400">No activity recorded yet. Admin actions (invites, deactivations, password resets and more) will appear here.</p>
      ) : (
        <>
          {logs.length > AUDIT_PAGE_SIZE && (
            <div className="relative mb-3 max-w-sm">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search activity"
                className="w-full pl-9 pr-3 py-2 rounded-lg border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500" />
            </div>
          )}
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No activity matches your search.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pageItems.map((l) => (
                <li key={l.id} className="flex items-start gap-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">{actionIcon(l.action)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{l.actorName}</span> · {l.action}
                      {l.targetName ? <> — <span className="text-gray-600">{l.targetName}</span></> : null}
                    </p>
                    <p className="text-xs text-gray-400">{formatDateTime(l.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {filtered.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">Showing {start + 1}–{Math.min(filtered.length, start + AUDIT_PAGE_SIZE)} of {filtered.length}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} aria-label="Previous page"
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"><FiChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs text-gray-500 px-2 tabular-nums">Page {safePage + 1} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} aria-label="Next page"
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"><FiChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ---- Subjects: per-school catalogue (seed defaults, add, (de)activate) ----
const SUBJECT_LEVELS = [
  { value: 'all', label: 'All levels' },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
];
const subjectLevelLabel = (v) => SUBJECT_LEVELS.find((l) => l.value === v)?.label || 'All levels';
const SUBJECTS_PAGE_SIZE = 10;

const SubjectsManager = ({ school, actor }) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [level, setLevel] = useState('all');
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [statusBusyId, setStatusBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      setSubjects(await subjectService.listForSchool(school.id));
    } catch (err) {
      console.error('Could not load subjects:', err);
    } finally {
      setLoading(false);
    }
  }, [school.id]);
  useEffect(() => { load(); }, [load]);

  const denied = (err) => err?.code === 'permission-denied'
    ? 'Permission denied — the latest security rules may not be published yet.'
    : null;

  const add = async (e) => {
    e.preventDefault(); setMsg('');
    if (!name.trim()) { setMsg('Enter a subject name.'); return; }
    setBusy(true);
    try {
      const created = await subjectService.add(school.id, actor, { name, code, level });
      auditService.log({ schoolId: school.id, actor, action: 'Added subject', targetType: 'subject', targetId: created.id, targetName: created.name });
      setName(''); setCode(''); setLevel('all'); setMsg('Subject added ✓');
      load();
    } catch (err) {
      setMsg(denied(err) || err.message || 'Could not add the subject.');
    } finally {
      setBusy(false);
    }
  };

  const seed = async () => {
    setSeeding(true); setMsg('');
    try {
      const added = await subjectService.seedDefaults(school.id, actor, subjects);
      if (added) auditService.log({ schoolId: school.id, actor, action: `Imported ${added} standard subjects`, targetType: 'subject' });
      setMsg(added ? `Added ${added} standard subjects ✓` : 'All standard subjects are already here.');
      load();
    } catch (err) {
      setMsg(denied(err) || 'Could not import subjects.');
    } finally {
      setSeeding(false);
    }
  };

  const toggle = async (s) => {
    const next = (s.status || 'active') === 'active' ? 'inactive' : 'active';
    setStatusBusyId(s.id);
    try {
      await subjectService.setStatus(s.id, next);
      setSubjects((p) => p.map((x) => (x.id === s.id ? { ...x, status: next } : x)));
      auditService.log({ schoolId: school.id, actor, action: next === 'active' ? 'Activated subject' : 'Deactivated subject', targetType: 'subject', targetId: s.id, targetName: s.name });
    } catch (err) {
      console.error('subject setStatus failed:', err);
      setMsg(denied(err) || 'Could not update the subject.');
    } finally {
      setStatusBusyId('');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? subjects.filter((s) => (s.name || '').toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q)) : subjects;
  }, [subjects, search]);
  useEffect(() => { setPage(0); }, [search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / SUBJECTS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * SUBJECTS_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + SUBJECTS_PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Add a subject */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1"><FiBookOpen className="text-primary-600" /><h2 className="font-bold text-gray-900">Add a subject</h2></div>
        <p className="text-sm text-gray-500 mb-3">Add a subject to this school's catalogue and choose the level it's taught at.</p>
        <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Subject name (e.g. Computer Studies)"
            className="sm:col-span-5 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (optional)"
            className="sm:col-span-3 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
          <select value={level} onChange={(e) => setLevel(e.target.value)}
            className="sm:col-span-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
            {SUBJECT_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <button type="submit" disabled={busy}
            className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {busy ? <Spinner className="w-4 h-4" /> : <><FiPlus /> Add</>}
          </button>
        </form>
        {msg && <p className={`text-xs mt-2 ${msg.includes('✓') ? 'text-green-600' : 'text-amber-600'}`}>{msg}</p>}
      </div>

      {/* Catalogue */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1"><FiBookOpen className="text-primary-600" /><h2 className="font-bold text-gray-900">Subjects</h2></div>
        <p className="text-sm text-gray-500 mb-3">This school's subjects. Deactivate one to stop offering it (it isn't deleted).</p>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : subjects.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-3">No subjects yet. Start with the standard Malawi curriculum, then add your own.</p>
            <button onClick={seed} disabled={seeding}
              className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {seeding ? <Spinner className="w-4 h-4" /> : <><FiPlus /> Add the standard Malawi subjects</>}
            </button>
          </div>
        ) : (
          <>
            {subjects.length > SUBJECTS_PAGE_SIZE && (
              <div className="relative mb-3 max-w-sm">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subjects"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
            )}
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No subjects match your search.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {pageItems.map((s) => {
                  const active = (s.status || 'active') === 'active';
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {s.name}{s.code ? <span className="text-gray-400 font-normal"> · {s.code}</span> : null}
                        </p>
                        <p className="text-xs text-gray-400">{subjectLevelLabel(s.level)}</p>
                      </div>
                      <AccountStatusBadge status={active ? 'active' : 'inactive'} />
                      <ActionMenu
                        items={[
                          active
                            ? { label: 'Deactivate subject', icon: <FiSlash className="w-4 h-4" />, tone: 'danger', onClick: () => toggle(s) }
                            : { label: 'Activate subject', icon: <FiRefreshCw className="w-4 h-4" />, tone: 'success', onClick: () => toggle(s) },
                        ]}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
            {filtered.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Showing {start + 1}–{Math.min(filtered.length, start + SUBJECTS_PAGE_SIZE)} of {filtered.length}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} aria-label="Previous page"
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"><FiChevronLeft className="w-4 h-4" /></button>
                  <span className="text-xs text-gray-500 px-2 tabular-nums">Page {safePage + 1} of {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} aria-label="Next page"
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"><FiChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ---- Classrooms: per-school sections (Form 1 A / B / C) ----
const CLASSROOMS_PAGE_SIZE = 10;

const ClassroomsManager = ({ school, actor }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('');
  const [mode, setMode] = useState('single'); // 'single' | 'sections'
  const [sectionsInput, setSectionsInput] = useState('');
  const [capacity, setCapacity] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [statusBusyId, setStatusBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      setRooms(await classroomService.listForSchool(school.id));
    } catch (err) {
      console.error('Could not load classrooms:', err);
    } finally {
      setLoading(false);
    }
  }, [school.id]);
  useEffect(() => { load(); }, [load]);

  const denied = (err) => err?.code === 'permission-denied'
    ? 'Permission denied — the latest security rules may not be published yet.'
    : null;

  const add = async (e) => {
    e.preventDefault(); setMsg('');
    if (!level) { setMsg('Pick a level.'); return; }
    const levelLabel = getGradeLevel(level)?.label || level;
    setBusy(true);
    try {
      if (mode === 'single') {
        if (rooms.some((r) => r.level === level && !(r.section || '').trim())) {
          setMsg(`${levelLabel} already exists as a single class.`);
          return;
        }
        const created = await classroomService.add(school.id, actor, { level, levelLabel, section: '', capacity });
        auditService.log({ schoolId: school.id, actor, action: 'Added classroom', targetType: 'classroom', targetId: created.id, targetName: created.name });
        setMsg(`Added ${created.name} ✓`);
      } else {
        const list = sectionsInput.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
        if (!list.length) { setMsg('Enter at least one section, e.g. A, B, C.'); return; }
        const added = await classroomService.addSections(school.id, actor, { level, levelLabel, sections: list, capacity }, rooms);
        if (added) auditService.log({ schoolId: school.id, actor, action: `Added ${added} classroom${added !== 1 ? 's' : ''}`, targetType: 'classroom', targetName: `${levelLabel} · ${added} section${added !== 1 ? 's' : ''}` });
        setMsg(added ? `Added ${added} section${added !== 1 ? 's' : ''} ✓` : 'Those sections already exist.');
      }
      setSectionsInput(''); setCapacity('');
      load();
    } catch (err) {
      setMsg(denied(err) || err.message || 'Could not add the classroom.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (r) => {
    const next = (r.status || 'active') === 'active' ? 'inactive' : 'active';
    setStatusBusyId(r.id);
    try {
      await classroomService.setStatus(r.id, next);
      setRooms((p) => p.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
      auditService.log({ schoolId: school.id, actor, action: next === 'active' ? 'Activated classroom' : 'Deactivated classroom', targetType: 'classroom', targetId: r.id, targetName: r.name });
    } catch (err) {
      console.error('classroom setStatus failed:', err);
      setMsg(denied(err) || 'Could not update the classroom.');
    } finally {
      setStatusBusyId('');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rooms.filter((r) => (r.name || '').toLowerCase().includes(q)) : rooms;
  }, [rooms, search]);
  useEffect(() => { setPage(0); }, [search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / CLASSROOMS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * CLASSROOMS_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + CLASSROOMS_PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Add a classroom */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1"><FiGrid className="text-primary-600" /><h2 className="font-bold text-gray-900">Add a classroom</h2></div>
        <p className="text-sm text-gray-500 mb-3">Split a busy level into sections — e.g. Form 1 <strong>A</strong>, <strong>B</strong>, <strong>C</strong>.</p>
        <form onSubmit={add} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select value={level} onChange={(e) => setLevel(e.target.value)}
              className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">
              <option value="">Level / Form</option>
              <optgroup label="Primary">
                {GRADE_LEVELS.filter((g) => g.stage === 'Primary').map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </optgroup>
              <optgroup label="Secondary">
                {GRADE_LEVELS.filter((g) => g.stage === 'Secondary').map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </optgroup>
            </select>
            <input value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Capacity per class (optional)" inputMode="numeric"
              className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
          </div>

          {/* How is this level organised? */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">How is this level organised?</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setMode('single')}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${mode === 'single' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Single class
              </button>
              <button type="button" onClick={() => setMode('sections')}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${mode === 'sections' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Split into sections (A, B, C…)
              </button>
            </div>
          </div>

          {mode === 'sections' && (
            <input value={sectionsInput} onChange={(e) => setSectionsInput(e.target.value)} placeholder="Sections — e.g. A, B, C"
              className="w-full sm:w-2/3 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button type="submit" disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {busy ? <Spinner className="w-4 h-4" /> : <><FiPlus /> {mode === 'single' ? 'Add class' : 'Add sections'}</>}
            </button>
            {level && (
              <span className="text-xs text-gray-400">
                {mode === 'single' ? (
                  <>Creates <span className="font-medium text-gray-600">{getGradeLevel(level)?.label}</span> as one class.</>
                ) : sectionsInput.trim() ? (
                  <>Creates <span className="font-medium text-gray-600">{sectionsInput.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean).slice(0, 6).map((s) => `${getGradeLevel(level)?.label} ${s}`).join(', ')}</span></>
                ) : (
                  <>e.g. {getGradeLevel(level)?.label} A, {getGradeLevel(level)?.label} B, {getGradeLevel(level)?.label} C</>
                )}
              </span>
            )}
          </div>
        </form>
        {msg && <p className={`text-xs mt-2 ${msg.includes('✓') ? 'text-green-600' : 'text-amber-600'}`}>{msg}</p>}
      </div>

      {/* List */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1"><FiGrid className="text-primary-600" /><h2 className="font-bold text-gray-900">Classrooms</h2></div>
        <p className="text-sm text-gray-500 mb-3">This school's classrooms. Deactivate one to stop using it (it isn't deleted).</p>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No classrooms yet. Add one above (e.g. Form 1 A).</p>
        ) : (
          <>
            {rooms.length > CLASSROOMS_PAGE_SIZE && (
              <div className="relative mb-3 max-w-sm">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search classrooms"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
            )}
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No classrooms match your search.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {pageItems.map((r) => {
                  const activeRoom = (r.status || 'active') === 'active';
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                        <p className="text-xs text-gray-400">{r.levelLabel || r.level}{r.capacity ? ` · capacity ${r.capacity}` : ''}</p>
                      </div>
                      <AccountStatusBadge status={activeRoom ? 'active' : 'inactive'} />
                      <ActionMenu
                        items={[
                          activeRoom
                            ? { label: 'Deactivate classroom', icon: <FiSlash className="w-4 h-4" />, tone: 'danger', onClick: () => toggle(r) }
                            : { label: 'Activate classroom', icon: <FiRefreshCw className="w-4 h-4" />, tone: 'success', onClick: () => toggle(r) },
                        ]}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
            {filtered.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Showing {start + 1}–{Math.min(filtered.length, start + CLASSROOMS_PAGE_SIZE)} of {filtered.length}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} aria-label="Previous page"
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"><FiChevronLeft className="w-4 h-4" /></button>
                  <span className="text-xs text-gray-500 px-2 tabular-nums">Page {safePage + 1} of {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} aria-label="Next page"
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"><FiChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ---- Manage one school: admins, teachers, students, parents ----
const ManageSchool = ({ school, admin, isSuper, tab, onTab, onBack }) => {
  const [name, setName] = useState(school.name);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [schoolStatus, setSchoolStatus] = useState((school.status || 'active').toLowerCase());
  const [statusBusy, setStatusBusy] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const changeSchoolStatus = async (status) => {
    setStatusBusy(true); setMsg('');
    try {
      await schoolService.setStatus(school.id, status);
      setSchoolStatus(status);
    } catch (err) {
      setMsg(err.message || 'Could not update school access.');
    } finally {
      setStatusBusy(false);
    }
  };

  const saveName = async () => {
    if (!name.trim()) return;
    setSaving(true); setMsg('');
    try {
      await schoolService.updateSchool(school.id, name);
      setMsg('Saved ✓');
    } catch (err) {
      setMsg(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  // Both Super Admins and School Admins manage admins/teachers/students/parents.
  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiGrid },
    { id: 'admins', label: 'School Admins', icon: FiShield },
    { id: 'teachers', label: 'Teachers', icon: FiUserCheck },
    { id: 'students', label: 'Students', icon: FiUsers },
    { id: 'parents', label: 'Parents', icon: FiUsers },
    { id: 'subjects', label: 'Subjects', icon: FiBookOpen },
    { id: 'classrooms', label: 'Classrooms', icon: FiGrid },
    { id: 'history', label: 'History', icon: FiClock },
    ...(isSuper ? [{ id: 'settings', label: 'Settings', icon: FiSettings }] : []),
  ];
  // The URL drives the active tab; fall back to overview for an unknown one.
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'overview';

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container py-8 max-w-5xl">
        {isSuper && (
          <button onClick={onBack} className="text-sm text-primary-600 hover:underline mb-4">← Back to schools</button>
        )}
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
          {schoolStatus !== 'active' && <AccountStatusBadge status={schoolStatus} />}
        </div>
        <p className="text-gray-600 text-sm mb-6">
          {isSuper
            ? 'Manage this school — admins, teachers, students and parents.'
            : "Manage your school's admins, teachers, students and parents."}
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-gray-200 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => onTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                activeTab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && <Overview school={school} isSuper={isSuper} onGo={onTab} />}

        {activeTab === 'admins' && (
          <PeopleSection school={school} role="admin" actor={admin} canDeactivate={isSuper}
            accountsTitle="School admin accounts" icon={FiShield}
            inviteUI={
              <RoleInvites school={school} admin={admin} role="admin" icon={FiShield}
                title="School Admins" placeholder="admin@example.com"
                description="Invite a school admin to help run this school. They can add admins, teachers, students and parents — but can't register schools or super admins." />
            } />
        )}

        {activeTab === 'teachers' && (
          <PeopleSection school={school} role="teacher" actor={admin} canDeactivate
            accountsTitle="Teacher accounts" icon={FiUserCheck}
            inviteUI={
              <RoleInvites school={school} admin={admin} role="teacher" icon={FiUserCheck}
                title="Teachers" placeholder="teacher@example.com"
                description="Invite a teacher. When they sign up with this email they join as a teacher and can create their classes." />
            } />
        )}

        {activeTab === 'students' && (
          <PeopleSection school={school} role="student" actor={admin} canDeactivate
            accountsTitle="Student accounts" icon={FiUsers}
            inviteUI={<StudentInvites school={school} admin={admin} />} />
        )}

        {activeTab === 'parents' && (
          <PeopleSection school={school} role="parent" actor={admin} canDeactivate
            accountsTitle="Parent accounts" icon={FiUsers}
            inviteUI={
              <RoleInvites school={school} admin={admin} role="parent" icon={FiUsers}
                title="Parents" placeholder="parent@example.com"
                description="Invite a parent. When they sign up with this email they can follow their child's progress." />
            } />
        )}

        {activeTab === 'subjects' && <SubjectsManager school={school} actor={admin} />}

        {activeTab === 'classrooms' && <ClassroomsManager school={school} actor={admin} />}

        {activeTab === 'history' && <AuditLog school={school} />}

        {activeTab === 'settings' && isSuper && (
          <div className="space-y-6">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-1"><FiHome className="text-primary-600" /><h2 className="font-bold text-gray-900">School name</h2></div>
              <p className="text-sm text-gray-500 mb-3">Rename this school.</p>
              <div className="flex gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
                <button onClick={saveName} disabled={saving || !name.trim()}
                  className="inline-flex items-center bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium px-5 rounded-lg transition-colors">
                  {saving ? <Spinner className="w-4 h-4" /> : 'Save'}
                </button>
              </div>
              {msg && <p className="text-xs text-green-600 mt-2">{msg}</p>}
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 mb-1"><FiBookOpen className="text-primary-600" /><h2 className="font-bold text-gray-900">Curriculum</h2></div>
              <p className="text-sm text-gray-500 mb-3">{GRADE_LEVELS.length} classes and {SUBJECTS.length} subjects available (Malawi curriculum).</p>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => <span key={s.value} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full">{s.label}</span>)}
              </div>
            </div>

            {/* School access — suspending blocks every member at sign-in. */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-1"><FiShield className="text-primary-600" /><h2 className="font-bold text-gray-900">School access</h2></div>
              <p className="text-sm text-gray-500 mb-3">
                {schoolStatus === 'suspended'
                  ? 'This school is suspended — none of its admins, teachers, students or parents can sign in.'
                  : 'Suspend the whole school to immediately block everyone from signing in. You can restore access any time.'}
              </p>
              <div className="flex items-center gap-3">
                <AccountStatusBadge status={schoolStatus} />
                {schoolStatus === 'suspended' ? (
                  <button onClick={() => changeSchoolStatus('active')} disabled={statusBusy}
                    className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    {statusBusy ? <Spinner className="w-4 h-4" /> : <><FiRefreshCw /> Restore access</>}
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmSuspend(true)}
                    disabled={statusBusy}
                    className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    {statusBusy ? <Spinner className="w-4 h-4" /> : <><FiSlash /> Suspend school</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmSuspend}
        tone="danger"
        title={`Suspend ${school.name}?`}
        message="Everyone at this school — admins, teachers, students and parents — will be unable to sign in until you restore access."
        confirmLabel="Suspend school"
        busy={statusBusy}
        onCancel={() => setConfirmSuspend(false)}
        onConfirm={async () => { await changeSchoolStatus('suspended'); setConfirmSuspend(false); }}
      />
    </div>
  );
};

// Loads a school by the :schoolId in the URL and renders ManageSchool with the
// :tab from the URL. A School Admin is kept inside their own school.
const ManageSchoolRoute = ({ admin, isSuper, userProfile }) => {
  const { schoolId, tab } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const s = await schoolService.getSchool(schoolId);
        if (active) setSchool(s);
      } catch (err) {
        if (active) setSchool(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [schoolId]);

  // A School Admin can only manage their own school.
  if (!isSuper && userProfile?.schoolId && schoolId !== userProfile.schoolId) {
    return <Navigate to={`/admin/schools/${userProfile.schoolId}/overview`} replace />;
  }

  if (loading) {
    return <div className="bg-gray-50 min-h-screen"><div className="container py-8 max-w-5xl"><PageLoader /></div></div>;
  }
  if (!school) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container py-10 max-w-2xl text-center">
          <div className="card p-8">
            <FiHome className="w-8 h-8 text-primary-600 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-gray-900 mb-1">School not found</h1>
            <p className="text-sm text-gray-500 mb-4">This school may have been removed.</p>
            {isSuper && <button onClick={() => navigate('/admin')} className="text-sm text-primary-600 hover:underline">← Back to schools</button>}
          </div>
        </div>
      </div>
    );
  }
  return (
    <ManageSchool
      school={school}
      admin={admin}
      isSuper={isSuper}
      tab={tab}
      onTab={(t) => navigate(`/admin/schools/${schoolId}/${t}`)}
      onBack={() => navigate('/admin')}
    />
  );
};

// /admin/schools/:schoolId (no tab) → land on the Overview tab.
const SchoolOverviewRedirect = () => {
  const { schoolId } = useParams();
  return <Navigate to={`/admin/schools/${schoolId}/overview`} replace />;
};

const NoSchoolAssigned = () => (
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

const Admin = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  if (!userProfile) {
    return <div className="bg-gray-50 min-h-screen"><div className="container py-8 max-w-5xl"><PageLoader /></div></div>;
  }
  // Only Super Admins and School Admins may see this page.
  if (userProfile.userType !== 'superadmin' && userProfile.userType !== 'admin') {
    return <Navigate to="/" replace />;
  }
  const isSuper = userProfile.userType === 'superadmin';

  return (
    <Routes>
      <Route
        index
        element={
          isSuper ? (
            <SchoolsList admin={currentUser} onOpen={(s) => navigate(`/admin/schools/${s.id}/overview`)} />
          ) : userProfile.schoolId ? (
            <Navigate to={`/admin/schools/${userProfile.schoolId}/overview`} replace />
          ) : (
            <NoSchoolAssigned />
          )
        }
      />
      <Route path="schools/:schoolId" element={<SchoolOverviewRedirect />} />
      <Route path="schools/:schoolId/:tab" element={<ManageSchoolRoute admin={currentUser} isSuper={isSuper} userProfile={userProfile} />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default Admin;
