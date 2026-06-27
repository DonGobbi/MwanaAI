import { groqChat } from './groqClient';

// Student study tools. Generates flashcards either grounded in the student's
// material (a class resource or pasted notes) or from the subject + level
// curriculum when only a topic is given.
const MAX_SOURCE = 12000;

export const studyService = {
  async flashcards({ subject, level, topic, sourceText = '', count = 12 }) {
    const grounded = sourceText.trim().length > 20;
    const focus = topic && topic.trim() ? ` on the topic "${topic.trim()}"` : '';

    const system = `You are MwanaAI, making clear study flashcards for a ${level || 'school'} student studying ${
      subject || 'their subject'
    } in Malawi. Each card has a short front (a question, term or prompt) and a concise, correct back (the answer/definition). Return ONLY valid JSON.`;

    const user = grounded
      ? `Create ${count} flashcards${focus} based ONLY on the material below. Keep them faithful to it.

MATERIAL:
${sourceText.slice(0, MAX_SOURCE)}

Return JSON exactly: {"cards":[{"front":"string","back":"string"}]}`
      : `Create ${count} flashcards${focus || ` covering key ${subject} ideas a ${level} student should know`}, accurate and aligned to the Malawian curriculum.

Return JSON exactly: {"cards":[{"front":"string","back":"string"}]}`;

    const content = await groqChat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { json: true, maxTokens: 2000, temperature: 0.5 }
    );

    let parsed;
    try {
      parsed = JSON.parse(content.replace(/```json\s*|\s*```/g, '').trim());
    } catch (err) {
      throw new Error('The flashcards came back in an unexpected format. Please try again.');
    }
    const cards = (parsed.cards || [])
      .filter((c) => c && typeof c.front === 'string' && typeof c.back === 'string' && c.front.trim() && c.back.trim())
      .map((c) => ({ front: c.front.trim(), back: c.back.trim() }));

    if (!cards.length) throw new Error('No flashcards were generated. Please try again.');
    return cards;
  },
};
