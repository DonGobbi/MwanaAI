import React, { useState, useEffect, useCallback } from 'react';
import { FiZap, FiRefreshCw, FiSend } from 'react-icons/fi';
import Card from './Card';
import Markdown from './Markdown';
import { useAuth } from '../contexts/AuthContext';
import { aiInsights } from '../services/aiInsightsService';
import { runPlatformAssistant } from '../services/assistantAgent';
import { accountService } from '../services/accountService';
import { schoolService } from '../services/schoolService';
import { auditService } from '../services/auditService';

const SUGGESTIONS = [
  'Which schools have no teachers?',
  'Which school is the most active?',
  'Are any schools suspended or empty?',
  'How big is the platform overall?',
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

// Turn the live platform data into a compact, factual snapshot the AI reasons
// over. Flags are computed here (deterministic) so the AI never has to guess,
// and the actual people in each school are listed so it can answer "who" too.
function buildSnapshot({ stats, schools, members, admins, activity, schoolName, generatedAt, viewer }) {
  const suspended = schools.filter((s) => (s.status || 'active').toLowerCase() !== 'active').length;
  const totals = `${stats.student} students, ${stats.teacher} teachers, ${stats.admin} school admins, ${stats.parent} parents across ${schools.length} school(s) (${suspended} not active). ${stats.deactivated} account(s) deactivated. ${stats.total} active accounts in total.`;

  // Group the real accounts by school (capped for very large platforms).
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

  // Platform super administrators (no school) — so "everyone" includes them.
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
    ? `You are assisting ${viewer.name}${viewer.email ? ` <${viewer.email}>` : ''} — the platform super administrator who is asking these questions. When they say "me", "I" or "my", they mean this account, and they are one of the platform super administrators listed below.\n\n`
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

const PlatformInsights = () => {
  const { currentUser, userProfile } = useAuth();
  const [snapshot, setSnapshot] = useState('');
  const [briefing, setBriefing] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setAnswer('');
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
      const viewer = {
        name: currentUser?.displayName || userProfile?.displayName || currentUser?.email || 'the administrator',
        email: currentUser?.email || '',
        uid: currentUser?.uid || '',
      };
      const snap = buildSnapshot({ stats, schools, members, admins, activity, schoolName, generatedAt, viewer });
      setSnapshot(snap);
      const text = await aiInsights.platformBriefing({ snapshot: snap });
      setBriefing(text);
    } catch (err) {
      console.error('Platform insights failed:', err);
      setError(err.message || 'Could not generate insights right now.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, userProfile]);

  useEffect(() => { load(); }, [load]);

  const ask = async (q) => {
    const query = (q ?? question).trim();
    if (!query || asking) return;
    setQuestion(query);
    setAsking(true);
    setAnswer('');
    setError('');
    try {
      // The agent queries the database on demand via tools, scoped to who's
      // asking — so it can answer anything the viewer is allowed to see.
      const viewer = {
        role: userProfile?.userType || 'superadmin',
        schoolId: userProfile?.schoolId || '',
        schoolName: userProfile?.schoolName || '',
        name: currentUser?.displayName || userProfile?.displayName || currentUser?.email || 'the administrator',
        email: currentUser?.email || '',
        uid: currentUser?.uid || '',
      };
      const text = await runPlatformAssistant({ question: query, viewer });
      setAnswer(text);
    } catch (err) {
      console.error('Platform ask failed:', err);
      setError(err.message || 'Could not answer that right now.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
            <FiZap className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight">Platform Insights</h2>
            <p className="text-xs text-gray-400">AI summary of your whole platform</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          title="Refresh"
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2 py-2">
          <div className="h-3 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-5/6" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
          <p className="text-xs text-gray-400 pt-1">Analysing your platform…</p>
        </div>
      ) : error && !briefing ? (
        <div className="text-sm text-gray-600">
          <p className="text-red-600 mb-2">{error}</p>
          <button onClick={load} className="text-primary-600 hover:underline text-sm">Try again</button>
        </div>
      ) : (
        <Markdown content={briefing} />
      )}

      {/* Ask anything */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={asking || loading}
              className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); ask(); }}
          className="flex items-center gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about your platform…"
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={asking || loading || !question.trim()}
            className="p-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
            aria-label="Ask"
          >
            <FiSend className="w-4 h-4" />
          </button>
        </form>

        {asking && <p className="text-xs text-gray-400 mt-2">Thinking…</p>}
        {answer && !asking && (
          <div className="mt-3 bg-gray-50 rounded-lg p-3">
            <Markdown content={answer} />
          </div>
        )}
        {error && briefing && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    </Card>
  );
};

export default PlatformInsights;
