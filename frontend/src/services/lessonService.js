import { db } from '../config/firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';

const API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = process.env.REACT_APP_GROQ_API_KEY;
// Strong model first, fast model as a rate-limit fallback.
const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

// Calls Groq, trying each model in turn so a throttled minute doesn't fail.
async function callGroq(messages, { json = false, maxTokens = 2000 } = {}) {
  if (!API_KEY) throw new Error('No AI key is configured.');
  let lastError = '';
  for (const model of MODELS) {
    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.6,
          max_tokens: maxTokens,
          ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      } else {
        lastError = `${model}: HTTP ${res.status}`;
        console.warn('[lessons] call failed,', lastError);
      }
    } catch (err) {
      lastError = `${model}: ${err.message}`;
      console.warn('[lessons] call error,', lastError);
    }
  }
  throw new Error(
    lastError.includes('429')
      ? 'The AI is busy right now. Please wait a few seconds and try again.'
      : 'Something went wrong. Please try again.'
  );
}

const topicsCacheKey = (subject, level) => `mwanaai_topics_${subject}_${level}`;
const lessonCacheKey = (subject, level, topic) => `mwanaai_lesson_${subject}_${level}_${topic}`;

export const lessonService = {
  // A syllabus-style list of topics for a subject + level. Cached locally so the
  // list is instant on repeat visits.
  async getTopics({ subject, level, ageHint }) {
    const cached = localStorage.getItem(topicsCacheKey(subject, level));
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        /* ignore bad cache */
      }
    }
    const content = await callGroq(
      [
        {
          role: 'system',
          content:
            'You are a curriculum planner for the Malawi school system. You return ONLY valid JSON.',
        },
        {
          role: 'user',
          content: `List the main topics a ${level} student (about ${ageHint} years old) studies in ${subject}, in a sensible learning order from basic to advanced. Give 8 to 12 topics. Return JSON exactly like: {"topics":[{"title":"string","description":"one short sentence"}]}`,
        },
      ],
      { json: true, maxTokens: 1200 }
    );
    let topics = [];
    try {
      topics = (JSON.parse(content).topics || []).filter((t) => t && t.title);
    } catch (e) {
      throw new Error('Could not load topics. Please try again.');
    }
    if (topics.length) {
      localStorage.setItem(topicsCacheKey(subject, level), JSON.stringify(topics));
    }
    return topics;
  },

  // A full guided lesson on a topic, in Markdown. Cached locally per topic.
  async getLesson({ subject, level, ageHint, topic }) {
    const cached = localStorage.getItem(lessonCacheKey(subject, level, topic));
    if (cached) return cached;

    const content = await callGroq(
      [
        {
          role: 'system',
          content: `You are MwanaAI, a warm, patient teacher for students in Malawi. Write a clear lesson for a ${level} student (about ${ageHint} years old). Use simple language and Malawian examples. Format with Markdown: a short intro, key ideas as headings/bullets, ONE worked example, and a short summary. Keep it focused — not too long.`,
        },
        {
          role: 'user',
          content: `Teach me this ${subject} topic: "${topic}". Explain it step by step so I understand it well.`,
        },
      ],
      { maxTokens: 1600 }
    );
    localStorage.setItem(lessonCacheKey(subject, level, topic), content);
    return content;
  },

  // Mark a topic complete for the student.
  async markComplete(userId, { subject, level, topic }) {
    if (!userId) return;
    const id = `${userId}_${subject}_${level}_${topic}`.replace(/[^a-zA-Z0-9_]/g, '_');
    await setDoc(doc(db, 'lesson_progress', id), {
      id,
      userId,
      subject,
      level,
      topic,
      completedAt: Date.now(),
    });
  },

  // Returns a Set of completed topic titles for a subject + level.
  async getCompleted(userId, subject, level) {
    if (!userId) return new Set();
    const q = query(collection(db, 'lesson_progress'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const set = new Set();
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.subject === subject && data.level === level) set.add(data.topic);
    });
    return set;
  },
};
