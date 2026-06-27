import { groqChat } from './groqClient';

// AI that works strictly ON a single shared resource — summarize it, or answer
// a question grounded in its text (and say clearly when the answer isn't there).
const MAX = 14000; // keep input within the model's rate limit
const clip = (t) => (t || '').slice(0, MAX);

export const resourceAI = {
  async summarize({ title, text, level }) {
    return groqChat(
      [
        {
          role: 'system',
          content: `You are MwanaAI, a clear, friendly study assistant for schools in Malawi. You summarize teaching material${
            level ? ` for a ${level} student` : ''
          }. Base everything ONLY on the material provided — never add facts that are not in it.`,
        },
        {
          role: 'user',
          content: `Summarize this resource titled "${title}" in clear Markdown: a one-line **Overview**, then **Key points** as short bullets, and **Key terms** (term — short definition) if there are any.\n\nMATERIAL:\n${clip(
            text
          )}`,
        },
      ],
      { maxTokens: 1000 }
    );
  },

  async ask({ title, text, question, level }) {
    return groqChat(
      [
        {
          role: 'system',
          content: `You are MwanaAI, answering a question using ONLY a single resource${
            level ? ` for a ${level} student` : ''
          }. Rules:
- Use only the material provided. Do not use outside knowledge.
- If the answer is not in the material, say clearly: "This isn't covered in this resource," and suggest asking the teacher or checking another resource.
- Be clear and well-structured in Markdown, pitched to the student.`,
        },
        {
          role: 'user',
          content: `Resource title: "${title}".\n\nMATERIAL:\n${clip(text)}\n\nQuestion: ${question}`,
        },
      ],
      { maxTokens: 900 }
    );
  },
};
