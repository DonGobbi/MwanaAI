import { groqChat } from './groqClient';

// AI-powered tools that turn data and topics into useful, ready-to-use content.
export const aiInsights = {
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
  async classTopicInsights({ className, subject, level, topicStats, studentWeak }) {
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

  // A teacher-facing recommendation for how to help one specific student.
  async studentRecommendation({ name, level, subjectScores }) {
    const data =
      subjectScores.map((s) => `- ${s.subject}: ${s.avg}% over ${s.count} quiz(zes)`).join('\n') ||
      '(no quizzes yet)';
    return groqChat(
      [
        {
          role: 'system',
          content:
            'You are a teaching assistant helping a teacher in Malawi. Give a short, practical recommendation in Markdown about how to support one specific student.',
        },
        {
          role: 'user',
          content: `Student: ${name} (${level}).
Quiz averages by subject:
${data}

In short Markdown: what this student is doing well, where they need support, and 2 specific things the teacher can do to help.`,
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
