import { db } from '../config/firebase';
import {
  collection, doc, setDoc, getDocs, deleteDoc, updateDoc, query, where,
} from 'firebase/firestore';

// Student learning goals — simple, owner-only. Shown on Progress (full control)
// and surfaced on the dashboard as gentle in-app reminders.
export const goalService = {
  async create(userId, { title, subject = '', targetDate = '' }) {
    const id = doc(collection(db, 'goals')).id;
    const g = {
      id,
      userId,
      title: (title || '').trim().slice(0, 160),
      subject,
      targetDate, // 'YYYY-MM-DD' or ''
      done: false,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'goals', id), g);
    return g;
  },

  async listForUser(userId) {
    if (!userId) return [];
    const snap = await getDocs(query(collection(db, 'goals'), where('userId', '==', userId)));
    return snap.docs
      .map((d) => d.data())
      .sort(
        (a, b) =>
          (a.done ? 1 : 0) - (b.done ? 1 : 0) || // unfinished first
          (a.targetDate || '￿').localeCompare(b.targetDate || '￿') || // soonest due
          (b.createdAt || 0) - (a.createdAt || 0)
      );
  },

  async setDone(id, done) {
    await updateDoc(doc(db, 'goals', id), { done });
  },

  async remove(id) {
    await deleteDoc(doc(db, 'goals', id));
  },
};
