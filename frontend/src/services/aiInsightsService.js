import { groqChat } from './groqClient';

const TONE_AND_GROUNDING =
  'Write in clear, professional and courteous prose suitable for a senior administrator: complete, well-formed ' +
  'sentences, an academic yet accessible tone, and a respectful register. Be precise, practical and concise. ' +
  'Every figure and fact you state comes from a live database snapshot supplied to you. Base every statement ' +
  'ONLY on that data — never invent, estimate or assume schools, numbers, names, dates or trends. If the data ' +
  'does not contain the answer, say so politely and suggest where in the platform the administrator can look.';

const PLATFORM_SYSTEM =
  'You are the platform operations assistant for MwanaAI, an education platform for schools in Malawi. ' +
  'You support the super administrator in understanding the health of the entire platform across all schools. ' +
  TONE_AND_GROUNDING;

const schoolSystem = (schoolName) =>
  'You are the operations assistant for MwanaAI, an education platform for schools in Malawi. ' +
  `You support the administrator of ${schoolName || 'their school'} in understanding the health of THEIR school. ` +
  'You only have data for that one school — never report on, compare with, or speculate about other schools. ' +
  TONE_AND_GROUNDING;

// AI-powered tools that turn data and topics into useful, ready-to-use content.
export const aiInsights = {
  // A short, prioritised operations briefing, grounded in a text snapshot
  // (totals, per-school counts, flags, recent activity). Returns Markdown.
  // scope: 'platform' (super admin, whole platform) or 'school' (school admin,
  // their one school) — picks the system prompt and tailors the examples.
  async platformBriefing({ snapshot, scope = 'platform', schoolName }) {
    const isSchool = scope === 'school';
    const subject = isSchool ? (schoolName || 'your school') : 'the platform';
    const attentionEg = isSchool
      ? 'e.g. students but no teacher, a deactivated teacher or student, accounts about to be auto-deleted, no recent activity'
      : 'e.g. a school with students but no teacher, a suspended school, accounts about to be auto-deleted';
    return groqChat(
      [
        { role: 'system', content: isSchool ? schoolSystem(schoolName) : PLATFORM_SYSTEM },
        {
          role: 'user',
          content: `Here is the current snapshot of ${subject}:

${snapshot}

Write a brief operations briefing in Markdown with these sections:
**What needs attention** — the 2-4 most important issues, most urgent first (${attentionEg}). If nothing stands out, say ${subject} looks healthy.
**What's happening** — 1-2 sentences on recent activity and overall size.
**Suggested next step** — one concrete action the administrator could take.
Keep it under ~160 words. Base everything ONLY on the snapshot above.`,
        },
      ],
      { maxTokens: 700 }
    );
  },

  // Answer a super admin's free-text question about the platform, grounded ONLY
  // in the snapshot. Returns Markdown.
  async platformAsk({ question, snapshot }) {
    return groqChat(
      [
        { role: 'system', content: PLATFORM_SYSTEM },
        {
          role: 'user',
          content: `Platform snapshot:

${snapshot}

Question: ${question}

Answer in short Markdown, using ONLY the snapshot. If the snapshot doesn't contain enough to answer, say so plainly and suggest where in the platform they could look.`,
        },
      ],
      { maxTokens: 700 }
    );
  },

  // A full, ready-to-teach lesson plan for a topic (Markdown).
  async lessonPlan({ subject, level, topic }) {
    return groqChat(
      [
        {
          role: 'system',
          content:
            'You are an expert teacher and curriculum planner for schools in Malawi. You write clear, practical lesson plans in Markdown that a teacher can use straight away.',
        },
        {
          role: 'user',
          content: `Create a lesson plan to teach "${topic}" in ${subject} for a ${level} class in Malawi.
Use these Markdown headings: **Learning Objectives**, **Introduction** (an engaging hook), **Key Concepts** (explained simply, with one worked example), **Class Activity**, **Assessment** (3 questions with answers), and **Homework**.
Keep it practical and use Malawian examples where helpful.`,
        },
      ],
      { maxTokens: 1800 }
    );
  },

  // A short report analysing a class's performance for the teacher (Markdown).
  async classInsights({ className, rows }) {
    const data = rows
      .map(
        (r) =>
          `- ${r.name}: ${r.quizzes} quizzes, average ${r.avg == null ? 'no score yet' : r.avg + '%'}, ${r.lessons} lessons completed`
      )
      .join('\n');
    return groqChat(
      [
        {
          role: 'system',
          content:
            'You are a supportive teaching assistant. You analyse class performance data and give a short, practical report in Markdown for the teacher.',
        },
        {
          role: 'user',
          content: `Class: ${className}
Student performance:
${data || '(no students yet)'}

Write a brief report with these Markdown sections: **Summary**, **Students who may need extra help**, and **3 Recommendations**. Be encouraging and specific. If there is little or no data, say so kindly and suggest assigning a quiz to get started.`,
        },
      ],
      { maxTokens: 1200 }
    );
  },

  // Class analysis SCOPED to this class's subject, focused on the specific
  // topics students are struggling with (not overall cross-subject averages).
  async classTopicInsights({ className, subject, level, topicStats, studentWeak, missedConcepts = [] }) {
    const topics = topicStats
      .map(
        (t) =>
          `- ${t.topic}: average ${t.avg}% over ${t.attempts} attempt(s) by ${t.students} student(s)${
            t.fails ? `, ${t.fails} score(s) below 50%` : ''
          }`
      )
      .join('\n');
    const students = studentWeak.length
      ? studentWeak
          .map((s) => `- ${s.name}: weak in ${s.weak.map((w) => `${w.topic} (${w.avg}%)`).join(', ')}`)
          .join('\n')
      : '(no individual weak spots stand out yet)';
    const missed = missedConcepts.length
      ? missedConcepts.map((m) => `- "${m.q}" (missed ${m.n} time${m.n !== 1 ? 's' : ''})`).join('\n')
      : '';

    return groqChat(
      [
        {
          role: 'system',
          content: `You are a supportive teaching assistant for a ${subject || 'subject'} class at ${
            level || 'school'
          } level in Malawi. You analyse how this class is doing IN THIS SUBJECT and point to the exact topics that need attention. Be specific, practical and encouraging.`,
        },
        {
          role: 'user',
          content: `Class: ${className} (${subject || 'subject'}${level ? `, ${level}` : ''}).

Performance by topic (weakest first):
${topics}

Students with weak topics:
${students}
${missed ? `\nQuestions the class missed most often:\n${missed}\n` : ''}
Write a short report in Markdown with these sections:
**How the class is doing** — 1-2 sentences on this subject.
**Topics to re-teach** — the weakest topics and why students likely struggled.
**Students who need attention** — name them and the specific topic.
**Next steps** — 2-3 concrete actions (e.g. re-teach X, assign a focused quiz on Y).
Base everything ONLY on the data above. If a section has no data, say so briefly.`,
        },
      ],
      { maxTokens: 1100 }
    );
  },

  // A teacher-facing recommendation for one student, scoped to one class's
  // subject and broken down by topic.
  async studentRecommendation({ name, subject, level, topicScores }) {
    const data =
      topicScores.map((s) => `- ${s.topic}: ${s.avg}% over ${s.count} quiz(zes)`).join('\n') ||
      '(no quizzes in this class yet)';
    return groqChat(
      [
        {
          role: 'system',
          content: `You are a teaching assistant helping a teacher in Malawi support one student in their ${
            subject || 'subject'
          } class (${level || 'school'}). Give a short, practical recommendation in Markdown.`,
        },
        {
          role: 'user',
          content: `Student: ${name}. Their ${subject || 'subject'} quiz results by topic:
${data}

In short Markdown: what this student is doing well in this subject, the specific topics they need to work on, and 2 concrete things the teacher can do to help.`,
        },
      ],
      { maxTokens: 700 }
    );
  },

  // Targeted feedback after a quiz, based on the questions the student missed.
  async quizFeedback({ subject, level, score, total, wrong }) {
    const items = wrong
      .map((w, i) => `${i + 1}. Question: ${w.question}\n   Correct answer: ${w.correct}\n   I answered: ${w.your}`)
      .join('\n');
    const prompt =
      wrong.length === 0
        ? `I scored ${score}/${total} (full marks) on a ${subject} quiz. In a short Markdown note, congratulate me and suggest one slightly harder thing to try next.`
        : `I did a ${subject} quiz and scored ${score}/${total}. Here are the questions I got wrong:
${items}

In short Markdown: list the specific **topics/concepts to review** (grouped), give one quick tip for each, and end with a sentence of encouragement.`;
    return groqChat(
      [
        {
          role: 'system',
          content: `You are MwanaAI, a warm, encouraging tutor for a ${level} student in Malawi.`,
        },
        { role: 'user', content: prompt },
      ],
      { maxTokens: 800 }
    );
  },

  // A warm, jargon-free progress note for a PARENT about their child, grounded
  // in the child's quiz data, with simple things they can do at home (Markdown).
  async parentSummary({ childName, level, summary }) {
    const name = childName || 'your child';
    const subjects = summary.bySubject.length
      ? summary.bySubject
          .map(
            (s) =>
              `- ${s.label}: average ${s.avg}%${s.count >= 4 ? `, recently ${s.recentAvg}% (${s.trend})` : ''} over ${s.count} quiz(zes)`
          )
          .join('\n')
      : '(no quizzes taken yet)';
    const missed = summary.recentMissed.length
      ? summary.recentMissed.slice(0, 8).map((m) => `- [${m.subject}] ${m.q}`).join('\n')
      : '';

    return groqChat(
      [
        {
          role: 'system',
          content: `You are MwanaAI, writing a warm, jargon-free progress note for the PARENT of a ${
            level || 'school'
          } child in Malawi. Speak to the parent directly ("your child"). Avoid technical terms. Be encouraging and practical, suggesting things a parent can do at home even if they are not an expert in the subject.`,
        },
        {
          role: 'user',
          content: `Child: ${name}.
Quiz performance by subject (weakest first):
${subjects}
${missed ? `\nSome things they recently got wrong:\n${missed}\n` : ''}
Write a short note in Markdown with these sections:
**How ${name} is doing** — 1-2 plain sentences.
**Doing well** — their stronger subjects.
**Working on** — the areas to improve, gently.
**How you can help at home** — 2-3 simple, specific things a parent can do.
Base everything ONLY on the data above. If there is little data, say so kindly and encourage regular practice.`,
        },
      ],
      { maxTokens: 900 }
    );
  },

  // A personalised study plan grounded in the student's subjects, trends and the
  // exact questions they recently missed (Markdown). Sharper than studyPlan().
  async studyPlanSmart({ level, summary }) {
    const subjects = summary.bySubject
      .map(
        (s) =>
          `- ${s.label}: average ${s.avg}% over ${s.count} quiz(zes)${
            s.count >= 4 ? `, recently ${s.recentAvg}% (${s.trend})` : ''
          }`
      )
      .join('\n');
    const missed = summary.recentMissed.length
      ? summary.recentMissed.map((m) => `- [${m.subject}] "${m.q}" (correct answer: ${m.a})`).join('\n')
      : '(no specific missed questions recorded yet)';

    return groqChat(
      [
        {
          role: 'system',
          content: `You are MwanaAI, a warm, encouraging study coach for a ${level} student in Malawi. You build short, practical, motivating study plans in Markdown grounded ONLY in the student's own data.`,
        },
        {
          role: 'user',
          content: `My quiz performance by subject (weakest first):
${subjects}

Specific questions I recently got wrong:
${missed}

Give me a plan in Markdown with these sections:
**Focus first** — my 1-2 weakest areas, and where the missed questions are shown, name the exact concepts to revise.
**This week** — 3-4 clear, doable steps.
**Tips** — 2 quick study tips.
Keep it short, specific and positive. Base everything ONLY on the data above.`,
        },
      ],
      { maxTokens: 1100 }
    );
  },

  // A personalised study plan for a student based on their quiz averages (Markdown).
  async studyPlan({ level, subjectScores }) {
    const data = subjectScores
      .map((s) => `- ${s.subject}: average ${s.avg}% over ${s.count} quiz(zes)`)
      .join('\n');
    return groqChat(
      [
        {
          role: 'system',
          content: `You are MwanaAI, a warm and encouraging study coach for a ${level} student in Malawi. You give short, practical, motivating study plans in Markdown.`,
        },
        {
          role: 'user',
          content: `Here are my recent quiz averages by subject:
${data}

Give me: **What to focus on first** (my weakest areas), a simple **Plan for this week** (a few clear steps), and **2-3 study tips**. Keep it short, positive and doable.`,
        },
      ],
      { maxTokens: 1000 }
    );
  },
};
