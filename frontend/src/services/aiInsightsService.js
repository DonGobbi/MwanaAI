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
