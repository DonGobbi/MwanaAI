import { groqTools } from './groqClient';
import { accountService } from './accountService';
import { schoolService } from './schoolService';
import { auditService } from './auditService';
import { classroomService } from './classroomService';
import { subjectService } from './subjectService';
import { quizService } from './quizService';
import { inviteService } from './inviteService';
import { emailService } from './emailService';

// An agentic assistant: instead of a fixed snapshot, the model is given TOOLS
// that read live data from the database and decides which to call to answer a
// question. Every tool is scoped to what the viewer is allowed to see — a super
// admin sees the whole platform; a school admin sees only their own school.

const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'School Admin', teacher: 'Teacher', student: 'Student', parent: 'Parent' };
// Natural phrases people use → the canonical role value.
const ROLE_ALIASES = {
  admin: 'admin', 'school admin': 'admin', schooladmin: 'admin', 'school administrator': 'admin', administrator: 'admin', 'school-admin': 'admin',
  teacher: 'teacher', tutor: 'teacher', instructor: 'teacher', educator: 'teacher',
  student: 'student', pupil: 'student', learner: 'student',
  parent: 'parent', guardian: 'parent',
};
const normalizeRole = (r) => ROLE_ALIASES[(r || '').trim().toLowerCase()] || (r || '').trim().toLowerCase();
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
const onlySuper = (viewer) => viewer.role === 'superadmin';
async function findSchool(name, viewer) {
  const schools = await schoolsForViewer(viewer);
  const q = (name || '').trim().toLowerCase();
  return schools.find((s) => s.name.toLowerCase() === q) || schools.find((s) => s.name.toLowerCase().includes(q));
}
async function findPerson(nameOrEmail, viewer) {
  const people = await peopleForViewer(viewer);
  const q = (nameOrEmail || '').trim().toLowerCase();
  return (
    people.find((p) => (p.email || '').toLowerCase() === q) ||
    people.find((p) => (p.displayName || '').toLowerCase() === q) ||
    people.find((p) => (p.displayName || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q))
  );
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

  // ---- ACTION tools: they only PREPARE an action (resolve the target + impact)
  // and return a proposal. Nothing changes until the user confirms. ----
  async suspend_school(args, viewer) {
    if (!onlySuper(viewer)) return { error: 'Only a super administrator can suspend a school.' };
    const s = await findSchool(args.school, viewer);
    if (!s) return { error: `No school matching "${args.school}".` };
    if ((s.status || 'active').toLowerCase() !== 'active') return { error: `${s.name} is already ${s.status}.` };
    const stats = await accountService.platformStats().catch(() => null);
    const c = stats?.bySchool?.[s.id];
    return { proposal: { type: 'suspend_school', schoolId: s.id, schoolName: s.name, summary: `Suspend ${s.name}`, impact: c ? `${c.total} member(s) (incl. ${c.student || 0} students) will be blocked from signing in` : 'its members will be blocked from signing in', confirmLabel: 'Suspend school', danger: true } };
  },
  async reactivate_school(args, viewer) {
    if (!onlySuper(viewer)) return { error: 'Only a super administrator can reactivate a school.' };
    const s = await findSchool(args.school, viewer);
    if (!s) return { error: `No school matching "${args.school}".` };
    if ((s.status || 'active').toLowerCase() === 'active') return { error: `${s.name} is already active.` };
    return { proposal: { type: 'reactivate_school', schoolId: s.id, schoolName: s.name, summary: `Reactivate ${s.name}`, impact: 'its members will be able to sign in again', confirmLabel: 'Reactivate school' } };
  },
  async deactivate_account(args, viewer) {
    const u = await findPerson(args.name_or_email, viewer);
    if (!u) return { error: `No account matching "${args.name_or_email}".` };
    if (u.userType === 'superadmin') return { error: 'A super administrator account cannot be deactivated here.' };
    if ((u.status || 'active').toLowerCase() === 'deactivated') return { error: `${u.displayName || u.email} is already deactivated.` };
    return { proposal: { type: 'deactivate_account', uid: u.uid, name: u.displayName || u.email, summary: `Deactivate ${u.displayName || u.email}`, impact: 'they will be blocked from signing in (their data is kept)', confirmLabel: 'Deactivate account', danger: true } };
  },
  async reactivate_account(args, viewer) {
    const u = await findPerson(args.name_or_email, viewer);
    if (!u) return { error: `No account matching "${args.name_or_email}".` };
    if ((u.status || 'active').toLowerCase() !== 'deactivated') return { error: `${u.displayName || u.email} is not deactivated.` };
    return { proposal: { type: 'reactivate_account', uid: u.uid, name: u.displayName || u.email, summary: `Reactivate ${u.displayName || u.email}`, confirmLabel: 'Reactivate account' } };
  },
  async invite_user(args, viewer) {
    const role = normalizeRole(args.role);
    if (!['admin', 'teacher', 'student', 'parent'].includes(role)) return { error: 'Role must be a school admin, teacher, student or parent.' };
    if (!args.email || !args.email.includes('@')) return { error: `A valid email address is required to invite a ${ROLE_LABEL[role] || role}. Please ask the user for their email address.` };
    // Hard guard against a fabricated email: the address MUST appear verbatim in
    // what the user actually wrote this turn. If not, refuse and ask for it.
    if (!(viewer.userText || '').toLowerCase().includes(args.email.trim().toLowerCase())) {
      return { error: `You did not provide an email address for this person. Do NOT invent one — ask the user: "What is the email address of the ${ROLE_LABEL[role] || role} you want to invite to ${args.school}?"` };
    }
    const s = await findSchool(args.school, viewer);
    if (!s) return { error: `No school matching "${args.school}". Which school should they join?` };
    return { proposal: { type: 'invite_user', schoolId: s.id, schoolName: s.name, email: args.email.trim().toLowerCase(), role, summary: `Invite ${args.email.trim().toLowerCase()} as a ${ROLE_LABEL[role] || role} to ${s.name}`, impact: 'an invitation email will be sent to them', confirmLabel: 'Send invite' } };
  },
  async add_subject(args, viewer) {
    if (!args.subject) return { error: 'Which subject should I add?' };
    const s = await findSchool(args.school, viewer);
    if (!s) return { error: `No school matching "${args.school}".` };
    return { proposal: { type: 'add_subject', schoolId: s.id, schoolName: s.name, subjectName: args.subject.trim(), summary: `Add the subject "${args.subject.trim()}" to ${s.name}`, confirmLabel: 'Add subject' } };
  },
};

// Run a confirmed action (called by the UI AFTER the user clicks Confirm).
export async function executeAction(action, viewer) {
  const actor = { uid: viewer.uid, displayName: viewer.name, email: viewer.email };
  const log = (entry) => auditService.log({ actor, ...entry });
  switch (action.type) {
    case 'suspend_school':
      await schoolService.setStatus(action.schoolId, 'suspended');
      log({ schoolId: action.schoolId, action: 'Suspended school', targetType: 'school', targetId: action.schoolId, targetName: action.schoolName });
      return `Done — ${action.schoolName} is now suspended.`;
    case 'reactivate_school':
      await schoolService.setStatus(action.schoolId, 'active');
      log({ schoolId: action.schoolId, action: 'Restored school', targetType: 'school', targetId: action.schoolId, targetName: action.schoolName });
      return `Done — ${action.schoolName} is active again.`;
    case 'deactivate_account':
      await accountService.setStatus(action.uid, 'deactivated', viewer.uid);
      log({ action: 'Deactivated account', targetType: 'user', targetId: action.uid, targetName: action.name });
      return `Done — ${action.name}'s account is deactivated.`;
    case 'reactivate_account':
      await accountService.setStatus(action.uid, 'active', viewer.uid);
      log({ action: 'Reactivated account', targetType: 'user', targetId: action.uid, targetName: action.name });
      return `Done — ${action.name}'s account is active again.`;
    case 'invite_user': {
      const school = { id: action.schoolId, name: action.schoolName };
      await inviteService.create(actor, school, { email: action.email, role: action.role });
      try { await emailService.sendInvite({ email: action.email, role: action.role, schoolName: action.schoolName }); } catch (_) { /* email best-effort */ }
      log({ schoolId: action.schoolId, action: `Invited ${action.role}`, targetType: action.role, targetName: action.email });
      return `Done — invited ${action.email} as a ${action.role} to ${action.schoolName}.`;
    }
    case 'add_subject':
      await subjectService.add(action.schoolId, actor, { name: action.subjectName });
      log({ schoolId: action.schoolId, action: 'Added subject', targetType: 'subject', targetName: action.subjectName });
      return `Done — added "${action.subjectName}" to ${action.schoolName}.`;
    default:
      throw new Error('Unknown action.');
  }
}

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
  // Action tools — these only PREPARE the action; the user must confirm.
  {
    type: 'function',
    function: { name: 'suspend_school', description: 'Prepare to suspend (block sign-in for) a whole school. Does NOT take effect until the user confirms.', parameters: { type: 'object', properties: { school: { type: 'string', description: 'school name' } }, required: ['school'] } },
  },
  {
    type: 'function',
    function: { name: 'reactivate_school', description: 'Prepare to reactivate a suspended school. Requires user confirmation.', parameters: { type: 'object', properties: { school: { type: 'string' } }, required: ['school'] } },
  },
  {
    type: 'function',
    function: { name: 'deactivate_account', description: "Prepare to deactivate one person's account (blocks their sign-in; data kept). Requires user confirmation.", parameters: { type: 'object', properties: { name_or_email: { type: 'string' } }, required: ['name_or_email'] } },
  },
  {
    type: 'function',
    function: { name: 'reactivate_account', description: 'Prepare to reactivate a deactivated account. Requires user confirmation.', parameters: { type: 'object', properties: { name_or_email: { type: 'string' } }, required: ['name_or_email'] } },
  },
  {
    type: 'function',
    function: { name: 'invite_user', description: 'Prepare to invite a new person (sends an invitation email on confirm). Requires user confirmation. A "school admin" / "administrator" is the role "admin".', parameters: { type: 'object', properties: { email: { type: 'string' }, role: { type: 'string', description: 'one of: admin (a school admin/administrator), teacher, student, parent. Natural phrases like "school admin" map to admin.' }, school: { type: 'string' } }, required: ['email', 'role', 'school'] } },
  },
  {
    type: 'function',
    function: { name: 'add_subject', description: 'Prepare to add a subject to a school. Requires user confirmation.', parameters: { type: 'object', properties: { subject: { type: 'string' }, school: { type: 'string' } }, required: ['subject', 'school'] } },
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
NEVER fabricate or auto-generate any value the user did not give you — above all, NEVER invent an email address, a person's name, or an ID. If an action needs a detail you were not given (for example, the email address of the person to invite), do NOT call the action tool with a guessed value: STOP and ASK the user to provide that exact detail.
How to choose tools:
- If the request mentions NAMES, a LIST of people, emails, or "everyone"/"everything", you MUST call find_people to fetch the actual people. Counts from get_stats are NOT enough — get_stats has no names.
- For a "full summary of everything", call find_people (the people, with names), get_schools (schools, classrooms, subjects) AND get_stats (totals) before answering, then list the actual names.
- Use get_person for one named person, and get_activity_log for admin history.
You may call several tools in sequence. Once you have the facts, reply in clear, professional and courteous Markdown — and when names were requested, ACTUALLY LIST the people by name. If the data genuinely has no answer, say so plainly.

You can also PREPARE actions: suspend_school, reactivate_school, deactivate_account, reactivate_account, invite_user, add_subject. CRITICAL: these tools only PREPARE the action and compute its impact — NOTHING is changed until the user clicks Confirm. After calling an action tool, clearly state exactly what will happen (including any impact) and tell the user to confirm. NEVER say an action is already done. If an action tool returns an error (target not found, already in that state, missing detail), explain it and ask for what's needed.`;
}

// Answer a free-text question by letting the model query the database via tools.
export async function runPlatformAssistant({ question, viewer }) {
  const messages = [
    { role: 'system', content: systemPrompt(viewer) },
    { role: 'user', content: question },
  ];
  let pendingAction = null; // an action awaiting the user's confirmation
  // Tools get the viewer plus the exact text the user wrote this turn, so an
  // action tool can refuse values (e.g. an email) the user never actually gave.
  const ctx = { ...viewer, userText: question };

  for (let step = 0; step < MAX_STEPS; step++) {
    const msg = await groqTools(messages, TOOL_DEFS, { maxTokens: 1200 });
    messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { answer: msg.content || 'I could not find an answer to that.', pendingAction };
    }

    for (const call of msg.tool_calls) {
      let result;
      try {
        const fn = TOOLS[call.function?.name];
        // The model sometimes sends `null` or malformed args — always hand the
        // tool a plain object.
        let args = {};
        try { args = JSON.parse(call.function?.arguments || '{}') || {}; } catch (_) { args = {}; }
        result = fn ? await fn(args, ctx) : { error: `unknown tool ${call.function?.name}` };
      } catch (err) {
        result = { error: err.message };
      }
      if (result && result.proposal) pendingAction = result.proposal; // capture the latest proposed action
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 6000) });
    }
  }

  // Ran out of steps — ask for a final answer with no more tools.
  const finalMsg = await groqTools(
    [...messages, { role: 'user', content: 'Now answer the original question using the information already gathered. Do not call any more tools.' }],
    [],
    { maxTokens: 1000 }
  );
  return { answer: finalMsg.content || 'I gathered some data but could not compose a final answer.', pendingAction };
}
