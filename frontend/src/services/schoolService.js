import { db } from '../config/firebase';
import { collection, doc, setDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';

// A Super Admin's school. Lean model for now: one school per admin.
export const schoolService = {
  async getMySchool(uid) {
    if (!uid) return null;
    const snap = await getDocs(query(collection(db, 'schools'), where('createdBy', '==', uid)));
    if (snap.empty) return null;
    return snap.docs[0].data();
  },

  async createSchool(uid, name) {
    const id = doc(collection(db, 'schools')).id;
    const school = { id, name: (name || '').trim(), createdBy: uid, createdAt: Date.now() };
    await setDoc(doc(db, 'schools', id), school);
    return school;
  },

  async updateSchool(id, name) {
    await updateDoc(doc(db, 'schools', id), { name: (name || '').trim() });
  },
};
