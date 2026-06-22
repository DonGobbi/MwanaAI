import { db } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';

// Stores each student's tutor conversations in Firestore so they can resume
// them later. Images (homework photos) are NOT persisted — only a flag — to
// keep documents small and well under Firestore's 1MB per-document limit.
export const conversationService = {
  // Create or update a conversation. Returns the conversation id.
  async save(userId, convo) {
    if (!userId) throw new Error('User not authenticated');
    const id = convo.id || doc(collection(db, 'conversations')).id;
    const ref = doc(db, 'conversations', id);

    const messages = (convo.messages || [])
      .filter((m) => m.id !== 'welcome' && !String(m.id).startsWith('hint'))
      .map((m) => ({
        role: m.role,
        content: m.content || '',
        hasImage: !!m.image,
      }));

    await setDoc(
      ref,
      {
        id,
        userId,
        title: convo.title || 'New chat',
        subject: convo.subject || '',
        gradeLevel: convo.gradeLevel || '',
        messages,
        createdAt: convo.createdAt || Date.now(),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    return id;
  },

  // List a user's conversations, newest first. Sorted client-side so no
  // composite Firestore index is required.
  async list(userId) {
    if (!userId) return [];
    const q = query(collection(db, 'conversations'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  async get(id) {
    if (!id) return null;
    const snap = await getDoc(doc(db, 'conversations', id));
    return snap.exists() ? snap.data() : null;
  },

  async remove(id) {
    if (!id) return;
    await deleteDoc(doc(db, 'conversations', id));
  },
};
