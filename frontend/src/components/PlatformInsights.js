import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FiZap, FiRefreshCw, FiSend, FiCheck, FiX, FiAlertTriangle } from 'react-icons/fi';
import Card from './Card';
import Markdown from './Markdown';
import { useAuth } from '../contexts/AuthContext';
import { aiInsights } from '../services/aiInsightsService';
import { runPlatformAssistant, executeAction } from '../services/assistantAgent';
import { accountService } from '../services/accountService';
import { schoolService } from '../services/schoolService';
import { auditService } from '../services/auditService';

const SUGGESTIONS = [
  'Give me a full summary of the platform',
  'Which schools have no teachers?',
  'Which school is the most active?',
  'Are any schools suspended or empty?',
];

const ago = (ts) => {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const ROLE = { admin: 'school admin', teacher: 'teacher', student: 'student', parent: 'parent' };
const MEMBER_CAP = 150; // safety cap so a huge platform can't blow the token budget

// Turn the live platform data into a compact, factual snapshot for the opening
// briefing. Flags are computed here (deterministic) so the AI never has to guess.
function buildSnapshot({ stats, schools, members, admins, activity, schoolName, generatedAt, viewer }) {
  const suspended = schools.filter((s) => (s.status || 'active').toLowerCase() !== 'active').length;
  const totals = `${stats.student} students, ${stats.teacher} teachers, ${stats.admin} school admins, ${stats.parent} parents across ${schools.length} school(s) (${suspended} not active). ${stats.deactivated} account(s) deactivated. ${stats.total} active accounts in total.`;

  const capped = (members || []).slice(0, MEMBER_CAP);
  const truncated = (members || []).length > MEMBER_CAP;
  const bySchoolMembers = {};
  capped.forEach((m) => {
    const sid = m.schoolId || '__none__';
    (bySchoolMembers[sid] = bySchoolMembers[sid] || []).push(m);
  });
  const memberLine = (m) =>
    `  - ${m.displayName || 'Unnamed'} <${m.email || 'no email on file'}> — ${ROLE[m.userType] || m.userType || 'unknown role'} (${(m.status || 'active').toLowerCase()})`;

  const schoolLines = schools
    .map((s) => {
      const b = stats.bySchool[s.id] || { student: 0, teacher: 0, admin: 0, parent: 0 };
      const summary = `${b.student || 0} students, ${b.teacher || 0} teachers, ${b.admin || 0} school admins, ${b.parent || 0} parents`;
      const list = bySchoolMembers[s.id] || [];
      const people = list.length ? list.map(memberLine).join('\n') : '  (no members yet)';
      return `${s.name} (${(s.status || 'active').toLowerCase()}) — ${summary}:\n${people}`;
    })
    .join('\n');
  const orphans = bySchoolMembers.__none__ || [];
  const orphanBlock = orphans.length ? `\nNot assigned to any school:\n${orphans.map(memberLine).join('\n')}` : '';

  const adminLines = (admins || [])
    .map((a) => `  - ${a.displayName || 'Unnamed'} <${a.email || 'no email on file'}> — super administrator (${(a.status || 'active').toLowerCase()})`)
    .join('\n');
  const adminBlock = adminLines ? `\n\nPlatform super administrators (oversee the whole platform, not attached to a school):\n${adminLines}` : '';

  const flags = [];
  schools.forEach((s) => {
    const b = stats.bySchool[s.id] || {};
    const st = (s.status || 'active').toLowerCase();
    if (['suspended', 'deactivated', 'archived'].includes(st)) flags.push(`${s.name} is ${st}`);
    if ((b.student || 0) > 0 && (b.teacher || 0) === 0) flags.push(`${s.name} has ${b.student} student(s) but no teacher`);
    if ((b.total || 0) === 0) flags.push(`${s.name} has no accounts yet`);
  });

  const activityLines = activity
    .slice(0, 20)
    .map((l) => {
      const where = schoolName[l.schoolId] ? ` at ${schoolName[l.schoolId]}` : '';
      const who = l.targetName ? ` "${l.targetName}"` : '';
      return `- ${l.actorName} — ${l.action}${who}${where} · ${ago(l.createdAt)}`;
    })
    .join('\n');

  const viewerLine = viewer
    ? `You are assisting ${viewer.name}${viewer.email ? ` <${viewer.email}>` : ''} — the platform super administrator. When they say "me", "I" or "my", they mean this account.\n\n`
    : '';

  return `PLATFORM SNAPSHOT${generatedAt ? ` (live from the database, as of ${generatedAt})` : ''}
${viewerLine}Totals: ${totals}

Schools and the people in them${truncated ? ` (showing the first ${MEMBER_CAP} of ${members.length} accounts)` : ''}:
${schoolLines || '(no schools yet)'}${orphanBlock}${adminBlock}

Flags (computed):
${flags.length ? flags.map((f) => `- ${f}`).join('\n') : '- none'}

Recent activity (newest first):
${activityLines || '(no recent activity recorded)'}`;
}

let _mid = 0;
const nextId = () => `m${(_mid += 1)}`;

const PlatformInsights = () => {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState([]); // { id, role, content, error?, pendingAction?, actionResult? }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true); // initial briefing
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');
  const [executingId, setExecutingId] = useState('');
  const threadRef = useRef(null);

  const viewer = useMemo(() => ({
    role: userProfile?.userType || 'superadmin',
    schoolId: userProfile?.schoolId || '',
    schoolName: userProfile?.schoolName || '',
    name: currentUser?.displayName || userProfile?.displayName || currentUser?.email || 'the administrator',
    email: currentUser?.email || '',
    uid: currentUser?.uid || '',
  }), [currentUser, userProfile]);

  // Opening briefing — also starts a fresh conversation.
  const startConversation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [stats, schools, members, admins, activity] = await Promise.all([
        accountService.platformStats(),
        schoolService.listSchools(),
        accountService.listAll(),
        accountService.listSuperAdmins(),
        auditService.listRecent(25),
      ]);
      const schoolName = {};
      schools.forEach((s) => { schoolName[s.id] = s.name; });
      const generatedAt = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
      const snap = buildSnapshot({ stats, schools, members, admins, activity, schoolName, generatedAt, viewer });
      const text = await aiInsights.platformBriefing({ snapshot: snap });
      setMessages([{ id: 'briefing', role: 'assistant', content: text }]);
    } catch (err) {
      console.error('Platform insights failed:', err);
      setError(err.message || 'Could not generate insights right now.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  // viewer only changes on login; safe to depend on it.
  }, [viewer]);

  useEffect(() => { startConversation(); }, [startConversation]);

  // Keep the thread scrolled to the newest message.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, asking]);

  const send = async (q) => {
    const text = (q ?? input).trim();
    if (!text || asking || loading) return;
    setInput('');
    const userMsg = { id: nextId(), role: 'user', content: text };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    setAsking(true);
    try {
      // Pass the whole conversation (minus the briefing) so the AI has context
      // for follow-ups like "the email is stella@x.com".
      const history = withUser
        .filter((m) => m.id !== 'briefing' && (m.role === 'user' || m.role === 'assistant') && m.content)
        .map((m) => ({ role: m.role, content: m.content }));
      const { answer, pendingAction } = await runPlatformAssistant({ history, viewer });
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content: answer, pendingAction: pendingAction || null }]);
    } catch (err) {
      console.error('Platform ask failed:', err);
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content: '', error: err.message || 'Could not answer that right now.' }]);
    } finally {
      setAsking(false);
    }
  };

  const confirmAction = async (msg) => {
    if (!msg.pendingAction || executingId) return;
    setExecutingId(msg.id);
    try {
      const result = await executeAction(msg.pendingAction, viewer);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, pendingAction: null, actionResult: { ok: true, text: result } } : m)));
    } catch (err) {
      console.error('Action failed:', err);
      const text = err?.code === 'permission-denied' ? 'Permission denied — the latest security rules may not be published yet.' : (err.message || 'Could not complete that action.');
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, actionResult: { ok: false, text } } : m)));
    } finally {
      setExecutingId('');
    }
  };

  const cancelAction = (msg) => {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, pendingAction: null, actionResult: { ok: true, text: 'Cancelled — nothing was changed.' } } : m)));
  };

  const showSuggestions = !loading && messages.filter((m) => m.role === 'user').length === 0;

  return (
    <Card className="p-0 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
            <FiZap className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight">Assistant</h2>
            <p className="text-xs text-gray-400">Ask about your platform, or tell me to do something</p>
          </div>
        </div>
        <button onClick={startConversation} disabled={loading} title="New conversation"
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Conversation thread */}
      <div ref={threadRef} className="px-4 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: '60vh', minHeight: '240px' }}>
        {loading ? (
          <div className="animate-pulse space-y-2 py-2">
            <div className="h-3 bg-gray-100 rounded w-1/3" />
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
            <p className="text-xs text-gray-400 pt-1">Analysing your platform…</p>
          </div>
        ) : error && messages.length === 0 ? (
          <div className="text-sm">
            <p className="text-red-600 mb-2">{error}</p>
            <button onClick={startConversation} className="text-primary-600 hover:underline">Try again</button>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : ''}>
              {m.role === 'user' ? (
                <div className="max-w-[85%] bg-primary-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2 text-sm whitespace-pre-wrap">{m.content}</div>
              ) : (
                <div className="max-w-[92%]">
                  <div className="bg-gray-50 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                    {m.error ? <p className="text-sm text-red-600">{m.error}</p> : <Markdown content={m.content} />}
                  </div>

                  {m.pendingAction && (
                    <div className={`mt-2 rounded-lg p-3 border ${m.pendingAction.danger ? 'border-red-200 bg-red-50' : 'border-primary-200 bg-primary-50'}`}>
                      <div className="flex items-start gap-2">
                        <FiAlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${m.pendingAction.danger ? 'text-red-500' : 'text-primary-600'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900">{m.pendingAction.summary}</p>
                          {m.pendingAction.impact && <p className="text-xs text-gray-600 mt-0.5">{m.pendingAction.impact}.</p>}
                          <div className="flex items-center gap-2 mt-3">
                            <button onClick={() => confirmAction(m)} disabled={executingId === m.id}
                              className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-60 ${m.pendingAction.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'}`}>
                              <FiCheck className="w-4 h-4" /> {executingId === m.id ? 'Working…' : (m.pendingAction.confirmLabel || 'Confirm')}
                            </button>
                            <button onClick={() => cancelAction(m)} disabled={executingId === m.id}
                              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-60">
                              <FiX className="w-4 h-4" /> Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {m.actionResult && (
                    <p className={`text-sm mt-1.5 ${m.actionResult.ok ? 'text-green-700' : 'text-red-600'}`}>{m.actionResult.text}</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        {asking && <p className="text-xs text-gray-400">Thinking…</p>}
      </div>

      {/* Suggestions (first turn only) + the message box */}
      <div className="px-4 py-3 border-t border-gray-100">
        {showSuggestions && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} disabled={asking}
                className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message the assistant…"
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <button type="submit" disabled={asking || loading || !input.trim()}
            className="p-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50" aria-label="Send">
            <FiSend className="w-4 h-4" />
          </button>
        </form>
      </div>
    </Card>
  );
};

export default PlatformInsights;
