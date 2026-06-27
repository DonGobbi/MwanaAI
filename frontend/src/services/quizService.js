import { db } from '../config/firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';

const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;
// Try the strong model first, then fall back to the faster model, which has
// higher free-tier rate limits — so a busy minute doesn't break quiz creation.
const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

// Generates and marks quizzes, and stores results for progress tracking.
export const quizService = {
  // Generate multiple-choice questions tailored to subject, level and (optional)
  // exam type. Returns an array of { question, options[4], correctIndex, explanation }.
  async generate({ subject, level, ageHint, topic, examType, count = 5, difficulty }) {
    const topicLine = topic
      ? `Focus on this topic: ${topic}.`
      : `Cover a range of topics a ${level} student studies in ${subject}.`;
    const examLine = examType
      ? `Make them in the style of the Malawi ${examType} national examination.`
      : '';
    const difficultyLine = difficulty
      ? `Make the questions ${difficulty} difficulty for this level.`
      : '';

    const system =
      'You are an expert exam setter for the Malawi school curriculum. You write clear, fair multiple-choice questions and return ONLY valid JSON.';
    const user = `Generate ${count} multiple-choice questions for a ${level} student (about ${ageHint} years old) in ${subject}. ${topicLine} ${examLine} ${difficultyLine}
Rules:
- Exactly 4 options per question, with exactly one correct answer.
- Use simple, clear language suited to the student's level and Malawian context.
- Give a short explanation of why the correct answer is right.
Return JSON exactly in this shape:
{"questions":[{"question":"string","options":["string","string","string","string"],"correctIndex":0,"explanation":"string"}]}`;

    if (!API_KEY) {
      throw new Error('No AI key is configured. Please set REACT_APP_GROQ_API_KEY.');
    }

    let content = null;
    let lastError = '';
    for (const model of MODELS) {
      try {
        const res = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            temperature: 0.5,
            max_tokens: 3000,
            response_format: { type: 'json_object' },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          content = data.choices?.[0]?.message?.content;
          if (content) break;
        } else {
          const body = await res.text();
          lastError = `${model}: HTTP ${res.status} ${body.slice(0, 200)}`;
          console.warn('[quiz] generation failed,', lastError);
          // 429 = rate limited -> try the next (cheaper) model.
          if (res.status !== 429 && res.status !== 503) {
            // Other errors are unlikely to differ between models, but keep trying.
          }
        }
      } catch (err) {
        lastError = `${model}: ${err.message}`;
        console.warn('[quiz] generation error,', lastError);
      }
    }

    if (!content) {
      throw new Error(
        lastError.includes('429')
          ? 'The AI is busy right now (rate limit). Please wait a few seconds and try again.'
          : 'Could not generate the quiz. Please try again.'
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content.replace(/```json\s*|\s*```/g, '').trim());
    } catch (err) {
      throw new Error('The quiz came back in an unexpected format. Please try again.');
    }

    const questions = (parsed.questions || []).filter(
      (q) =>
        q &&
        typeof q.question === 'string' &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        Number.isInteger(q.correctIndex) &&
        q.correctIndex >= 0 &&
        q.correctIndex < 4
    );

    if (!questions.length) {
      throw new Error('No questions were generated. Please try again.');
    }
    return questions;
  },

  // Persist a completed quiz result for progress tracking.
  async saveResult(userId, result) {
    if (!userId) return null;
    const id = doc(collection(db, 'quiz_results')).id;
    await setDoc(doc(db, 'quiz_results', id), {
      id,
      userId,
      ...result,
      createdAt: Date.now(),
    });
    return id;
  },

  // List a user's past results, newest first (sorted client-side, no index needed).
  async listResults(userId) {
    if (!userId) return [];
    const q = query(collection(db, 'quiz_results'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  // All results tied to one class (assignment quizzes carry the classId) — used
  // by the teacher to analyse how the class is doing in this subject, by topic.
  async listByClass(classId) {
    if (!classId) return [];
    const q = query(collection(db, 'quiz_results'), where('classId', '==', classId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  },
};
