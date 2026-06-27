import { db } from '../config/firebase';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

// In-app notifications. Each notification is addressed to one user (userId) and
// is created by that same user's client (so the rules stay owner-only). A
// deterministic id from a dedupe key means the same alert is never recreated or
// its read-state reset.
export const notificationService = {
  async createIfNew(userId, { type, title, body, link = '', dedupeKey }) {
    if (!userId || !dedupeKey || !title) return null;
    const id = `${userId}__${dedupeKey}`;
    const ref = doc(db, 'notifications', id);
    // Existence check: the owner-only read rule denies a get() on a *missing*
    // document (resource is null), which throws — that simply means "doesn't
    // exist yet", so fall through and create. If it exists, skip (so we never
    // reset its read-state).
    try {
      const existing = await getDoc(ref);
      if (existing.exists()) return null;
    } catch (e) {
      /* missing doc -> create it below */
    }
    const data = { id, userId, type: type || 'info', title, body: body || '', link, read: false, createdAt: Date.now() };
    await setDoc(ref, data);
    return data;
  },

  async listForUser(userId, max = 30) {
    if (!userId) return [];
    const snap = await getDocs(query(collection(db, 'notifications'), where('userId', '==', userId)));
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, max);
  },

  async markRead(id) {
    if (id) await updateDoc(doc(db, 'notifications', id), { read: true });
  },

  async markAllRead(items) {
    await Promise.all(
      (items || []).filter((n) => !n.read).map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true }))
    );
  },

  async remove(id) {
    if (id) await deleteDoc(doc(db, 'notifications', id));
  },
};
