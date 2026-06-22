import { db } from '../config/firebase';
import { screenInput } from './promptGuard';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';

const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;
// A larger, more capable model so the tutor understands the student well —
// including short, informal or voice-transcribed questions.
const TEXT_MODEL = 'llama-3.3-70b-versatile';
// Vision-capable model used when the student attaches a photo of their work.
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// Builds the tutor's system prompt, tailored to the student's subject and
// grade/form level so explanations are pitched at the right age.
function buildTutorSystemPrompt({ subject, level, ageHint }) {
  const subjectText = subject || 'their schoolwork';
  const levelText = level || 'school';
  const ageText = ageHint ? `about ${ageHint} years old` : 'a school student';

  return `You are MwanaAI, a warm, friendly and encouraging personal tutor for students in Malawi. Talk to the student like a kind human teacher sitting next to them — natural, supportive and patient, never robotic.

You are currently helping a student in ${levelText} (${ageText}) with ${subjectText}.

YOUR STYLE
- Be conversational and warm. Greet naturally, use the student's words, and react to what they say ("Good question!", "Nice try — let's look closer").
- Keep answers SHORT and easy to read. Never send a big wall of text. Break ideas into small pieces.
- Use Markdown so it is easy to follow: **bold** for key words, numbered steps for working, and bullet points for lists. Add a blank line between ideas.
- Pitch every explanation at a ${levelText} student. Use simple words; when you introduce a new term, define it in one short sentence.
- Use everyday Malawian examples (markets, maize, kwacha, football, local places) when they make things clearer.

UNDERSTANDING THE STUDENT
- Students often write short, informal English, with spelling mistakes, or using voice-to-text that gets words wrong. Read their message generously and work out what they most likely mean.
- If you genuinely cannot tell what they are asking, do NOT guess or lecture — ask ONE short, friendly clarifying question (e.g. "Do you mean how to solve for x, or what x stands for?").
- Briefly restate what you understood the question to be when it helps avoid confusion.

HOW YOU TEACH (like a real tutor)
- Focus on exactly what the student is stuck on.
- For problems with a definite answer (maths, science), guide them through the working step by step so they LEARN it — don't just give the final answer for their homework.
- After helping, be proactive: recommend a next step and OFFER more, e.g. "Would you like a practice question?", "Want me to explain it another way?", or "Should we try a harder one?".
- Check understanding with a short question or a quick practice example when it fits.
- If the student shares a photo of their work, read it carefully, tell them what you see, and help with what is actually written there.
- If they make a mistake, gently point it out and explain why, then encourage them.
- If the message is not about schoolwork, kindly and briefly steer them back to learning.

Always keep everything safe, positive and age-appropriate.`;
}

export const aiTutoring = {
  async generateResponse({ subject, level, ageHint, question, context = [], image = null }) {
    // Safety: screen the student's typed question for prompt-injection /
    // jailbreak attempts with Prompt Guard 2 before sending it to the tutor.
    const verdict = await screenInput(question);
    if (!verdict.safe) {
      const blocked = new Error(
        "I can't help with that request. Please ask a genuine question about your subject."
      );
      blocked.code = 'PROMPT_BLOCKED';
      blocked.verdict = verdict;
      throw blocked;
    }

    try {
      // When the student attaches a photo of their work, send the image to the
      // vision model as multimodal content; otherwise use the fast text model.
      const userContent = image
        ? [
            { type: 'text', text: question },
            { type: 'image_url', image_url: { url: image } },
          ]
        : question;

      const messages = [
        {
          role: 'system',
          content: buildTutorSystemPrompt({ subject, level, ageHint }),
        },
        ...context,
        {
          role: 'user',
          content: userContent,
        },
      ];

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: image ? VISION_MODEL : TEXT_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error('Failed to generate response. Please try again.');
    }
  },

  async saveInteraction(userId, interaction) {
    try {
      await addDoc(collection(db, 'learning_interactions'), {
        userId,
        ...interaction,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error saving interaction:', error);
    }
  },

  async generateExercise(subject, topic, difficulty = 'medium') {
    try {
      const prompt = `Generate a ${difficulty} difficulty exercise about ${topic} in ${subject}. 
                     Include: 
                     1. A clear question
                     2. Multiple choice options (A-D)
                     3. The correct answer
                     4. A detailed explanation of the solution`;

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert education content creator, specializing in creating engaging and culturally relevant exercises for Malawian students.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate exercise');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error generating exercise:', error);
      throw new Error('Failed to generate exercise. Please try again.');
    }
  },

  async getPersonalizedHints(userId, subject, topic) {
    try {
      // Get user's recent interactions with this topic
      const interactionsQuery = query(
        collection(db, 'learning_interactions'),
        where('userId', '==', userId),
        where('subject', '==', subject),
        where('topic', '==', topic),
        orderBy('timestamp', 'desc'),
        limit(5)
      );

      const interactions = await getDocs(interactionsQuery);
      const recentQuestions = interactions.docs.map(
        (doc) => doc.data().question
      );

      // Generate personalized hints based on recent questions
      const prompt = `Based on these recent questions from the student about ${topic} in ${subject}:
                     ${recentQuestions.join('\n')}
                     
                     Generate 3 helpful hints or suggested areas to focus on.`;

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages: [
            {
              role: 'system',
              content:
                'You are an intelligent learning assistant that analyzes student questions to provide personalized learning suggestions.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate hints');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error generating hints:', error);
      throw new Error('Failed to generate hints. Please try again.');
    }
  },
};
