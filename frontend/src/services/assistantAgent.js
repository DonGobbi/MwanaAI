import { groqTools } from './groqClient';
import { accountService } from './accountService';
import { schoolService } from './schoolService';
import { auditService } from './auditService';
import { classroomService } from './classroomService';
import { subjectService } from './subjectService';
import { quizService } from './quizService';

// An agentic assistant: instead of a fixed snapshot, the model is given TOOLS
// that read live data from the database and decides which to call to answer a
// question. Every tool is scoped to what the viewer is allowed to see — a super
// admin sees the whole platform; a school admin sees only their own school.

const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'School Admin', teacher: 'Teacher', student: 'Student', parent: 'Parent' };
const MAX_STEPS = 5;
const dateStr = (ts) => (ts ? new Date(ts).toDateString() : '');

// ---- scoped data helpers ----
async function schoolsForViewer(viewer) {
  const all = await schoolService.listSchools();
  return viewer.role === 'admin' ? all.filter((s) => s.id === viewer.schoolId) : all;
}
async function peopleForViewer(viewer) {
  if (viewer.role === 'admin') {
    const list = await accountService.listBySchool(viewer.schoolId);
    return list.filter((u) => !['archived', 'deleted'].includes((u.status || 'active').toLowerCase()));
  }
  const [members, supers] = await Promise.all([accountService.listAll(), accountService.listSuperAdmins()]);
  return [...members, ...supers];
}
async function auditForViewer(viewer, max = 200) {
  return viewer.role === 'admin'
    ? auditService.listForSchool(viewer.schoolId, max)
    : auditService.listRecent(max);
}

// ---- tool executors ----
const TOOLS = {
  async find_people(args, viewer) {
    const [people, schools] = await Promise.all([peopleForViewer(viewer), schoolsForViewer(viewer)]);
    const nameById = Object.fromEntries(schools.map((s) => [s.id, s.name]));
    let res = people;
    if (args.role) {
      const r = args.role.toLowerCase();
      res = res.filter((u) => (u.userType || '').toLowerCase() === r || (ROLE_LABEL[u.userType] || '').toLowerCase() === r || r.includes((u.userType || '').toLowerCase()));
    }
    if (args.status) res = res.filter((u) => (u.status || 'active').toLowerCase() === args.status.toLowerCase());
    if (args.school) {
      const q = args.school.toLowerCase();
      res = res.filter((u) => (nameById[u.schoolId] || '').toLowerCase().includes(q));
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      res = res.filter((u) => (u.displayName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
    }
    return {
      count: res.length,
      people: res.slice(0, 80).map((u) => ({
        name: u.displayName || u.email || 'Unnamed',
        email: u.email || '',
        role: ROLE_LABEL[u.userType] || u.userType || 'unknown',
        school: nameById[u.schoolId] || (u.schoolId ? '(unknown school)' : '(no school)'),
        status: (u.status || 'active'),
      })),
    };
  },

  async get_person(args, viewer) {
    const people = await peopleForViewer(viewer);
    const q = (args.name_or_email || '').trim().toLowerCase();
    const u =
      people.find((p) => (p.email || '').toLowerCase() === q) ||
      people.find((p) => (p.displayName || '').toLowerCase() === q) ||
      people.find((p) => (p.displayName || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q));
    if (!u) return { found: false, message: `No account matching "${args.name_or_email}" is visible to you.` };

    const schools = await schoolsForViewer(viewer);
    const schoolNm = schools.find((s) => s.id === u.schoolId)?.name || (u.schoolId ? '(unknown school)' : '(no school)');
    const profile = {
      name: u.displayName || u.email || 'Unnamed',
      email: u.email || '',
      role: ROLE_LABEL[u.userType] || u.userType,
      school: schoolNm,
      status: (u.status || 'active'),
      phone: u.phone || '',
      gender: u.gender || '',
      dateOfBirth: u.dateOfBirth || '',
      classLevel: u.gradeLevel || '',
      joined: dateStr(typeof u.createdAt === 'number' ? u.createdAt : Date.parse(u.createdAt)) || '',
    };

    let learningActivity = null;
    if (u.userType === 'student') {
      try {
        const results = await quizService.listResults(u.uid);
        const n = results.length;
        const scores = results.map((r) => (typeof r.scorePercentage === 'number' ? r.scorePercentage : r.total ? Math.round((r.score / r.total) * 100) : null)).filter((x) => x != null);
        const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
        const last = n ? Math.max(...results.map((r) => r.createdAt || 0)) : 0;
        learningActivity = n
          ? { quizzesTaken: n, averageScore: avg != null ? `${avg}%` : 'no scores recorded', lastQuiz: dateStr(last) || 'unknown' }
          : { quizzesTaken: 0, note: 'This student has not taken any quizzes yet.' };
      } catch (_) {
        learningActivity = { note: 'Could not load learning activity.' };
      }
    }

    let adminActionsOnAccount = [];
    try {
      const log = await auditForViewer(viewer, 200);
      adminActionsOnAccount = log
        .filter((l) => l.targetId === u.uid || (l.targetName && l.targetName === (u.displayName || u.email)))
        .slice(0, 10)
        .map((l) => ({ action: l.action, by: l.actorName, when: dateStr(l.createdAt) }));
    } catch (_) { /* ignore */ }

    return { found: true, profile, learningActivity, adminActionsOnAccount };
  },

  async get_schools(args, viewer) {
    const schools = await schoolsForViewer(viewer);
    const stats = viewer.role === 'admin' ? null : await accountService.platformStats().catch(() => null);
    const out = [];
    for (const s of schools) {
      let classrooms = [];
      let subjects = [];
      try { classrooms = (await classroomService.listForSchool(s.id)).filter((c) => (c.status || 'active') !== 'inactive').map((c) => c.name); } catch (_) {}
      try { subjects = (await subjectService.listForSchool(s.id)).filter((x) => (x.status || 'active') !== 'inactive').map((x) => x.name); } catch (_) {}
      const counts = stats?.bySchool?.[s.id];
      out.push({ name: s.name, status: (s.status || 'active'), members: counts ? counts.total : undefined, counts: counts || undefined, classrooms, subjects });
    }
    return { count: out.length, schools: out };
  },

  async get_activity_log(args, viewer) {
    const limit = Math.min(args.limit || 25, 60);
    let log = await auditForViewer(viewer, 200);
    if (args.person) {
      const q = args.person.toLowerCase();
      log = log.filter((l) => (l.actorName || '').toLowerCase().includes(q) || (l.targetName || '').toLowerCase().includes(q));
    }
    if (args.school && viewer.role !== 'admin') {
      const schools = await schoolService.listSchools();
      const ids = schools.filter((s) => s.name.toLowerCase().includes(args.school.toLowerCase())).map((s) => s.id);
      log = log.filter((l) => ids.includes(l.schoolId));
    }
    return {
      count: Math.min(log.length, limit),
      entries: log.slice(0, limit).map((l) => ({ actor: l.actorName, action: l.action, target: l.targetName || '', when: dateStr(l.createdAt) })),
    };
  },

  async get_stats(args, viewer) {
    if (viewer.role === 'admin') {
      const list = (await accountService.listBySchool(viewer.schoolId)).filter((u) => !['archived', 'deleted'].includes((u.status || 'active').toLowerCase()));
      const c = { students: 0, teachers: 0, schoolAdmins: 0, parents: 0 };
      const map = { student: 'students', teacher: 'teachers', admin: 'schoolAdmins', parent: 'parents' };
      list.forEach((u) => { const k = map[u.userType]; if (k) c[k] += 1; });
      return { scope: 'your school', ...c, totalAccounts: list.length };
    }
    const [s, schools] = await Promise.all([accountService.platformStats(), schoolService.listSchools()]);
    return { scope: 'whole platform', students: s.student, teachers: s.teacher, schoolAdmins: s.admin, parents: s.parent, deactivated: s.deactivated, totalAccounts: s.total, schools: schools.length };
  },
};

const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'find_people',
      description: 'Returns the ACTUAL people (their NAMES, emails, roles, school and status). Use this whenever names, a list of people, emails, or "everyone"/"everything" are requested — get_stats only gives counts, never names. Filter by role, school, status, or a name/email search; call with no filters to list everyone.',
      parameters: {
        type: 'object',
        properties: {
          role: { type: 'string', description: 'student, teacher, school admin, parent, or super admin' },
          school: { type: 'string', description: 'school name (partial match ok)' },
          status: { type: 'string', description: 'active or deactivated' },
          search: { type: 'string', description: 'a name or email substring to search for' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_person',
      description: "Full details about ONE person plus their activity (a student's quiz activity, and any admin actions taken on their account). Use for 'tell me about <name>' or 'check the activity of <name>'.",
      parameters: { type: 'object', properties: { name_or_email: { type: 'string' } }, required: ['name_or_email'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_schools',
      description: 'List schools with their status, member counts, classrooms and subjects.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_activity_log',
      description: 'Recent admin actions (the audit log): who archived / restored / invited / deactivated / deleted whom, and when. Optionally filter by a person or school.',
      parameters: { type: 'object', properties: { person: { type: 'string' }, school: { type: 'string' }, limit: { type: 'number' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_stats',
      description: 'Headcounts and totals ONLY (the NUMBER of students, teachers, school admins, parents and schools). Does NOT return any names — for names use find_people.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

function systemPrompt(viewer) {
  const isSuper = viewer.role === 'superadmin';
  const scope = isSuper
    ? 'You are assisting the platform SUPER ADMINISTRATOR. You may look up data for the ENTIRE platform — every school and everyone in them.'
    : `You are assisting a SCHOOL ADMINISTRATOR of "${viewer.schoolName || 'their school'}". You may ONLY look up data for that one school; you cannot and must not report on other schools.`;
  return `You are the operations assistant for MwanaAI, an education platform for schools in Malawi. ${scope}
You are speaking with ${viewer.name}${viewer.email ? ` <${viewer.email}>` : ''} (${ROLE_LABEL[viewer.role] || viewer.role}); when they say "me", "I" or "my", they mean this person.
You have tools that read LIVE data from the database. Always CALL the tools to get facts — never guess, invent or rely on memory.
How to choose tools:
- If the request mentions NAMES, a LIST of people, emails, or "everyone"/"everything", you MUST call find_people to fetch the actual people. Counts from get_stats are NOT enough — get_stats has no names.
- For a "full summary of everything", call find_people (the people, with names), get_schools (schools, classrooms, subjects) AND get_stats (totals) before answering, then list the actual names.
- Use get_person for one named person, and get_activity_log for admin history.
You may call several tools in sequence. Once you have the facts, reply in clear, professional and courteous Markdown — and when names were requested, ACTUALLY LIST the people by name. If the data genuinely has no answer, say so plainly.`;
}

// Answer a free-text question by letting the model query the database via tools.
export async function runPlatformAssistant({ question, viewer }) {
  const messages = [
    { role: 'system', content: systemPrompt(viewer) },
    { role: 'user', content: question },
  ];

  for (let step = 0; step < MAX_STEPS; step++) {
    const msg = await groqTools(messages, TOOL_DEFS, { maxTokens: 1200 });
    messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content || 'I could not find an answer to that.';
    }

    for (const call of msg.tool_calls) {
      let result;
      try {
        const fn = TOOLS[call.function?.name];
        // The model sometimes sends `null` or malformed args — always hand the
        // tool a plain object.
        let args = {};
        try { args = JSON.parse(call.function?.arguments || '{}') || {}; } catch (_) { args = {}; }
        result = fn ? await fn(args, viewer) : { error: `unknown tool ${call.function?.name}` };
      } catch (err) {
        result = { error: err.message };
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 6000) });
    }
  }

  // Ran out of steps — ask for a final answer with no more tools.
  const finalMsg = await groqTools(
    [...messages, { role: 'user', content: 'Now answer the original question using the information already gathered. Do not call any more tools.' }],
    [],
    { maxTokens: 1000 }
  );
  return finalMsg.content || 'I gathered some data but could not compose a final answer.';
}
