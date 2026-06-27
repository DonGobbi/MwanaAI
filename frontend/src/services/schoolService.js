import { db } from '../config/firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';

// A Super Admin's school. Lean model for now: one school per Super Admin, with
// School Admins (delegates) attached to it via their profile's schoolId.
export const schoolService = {
  async getMySchool(uid) {
    if (!uid) return null;
    const snap = await getDocs(query(collection(db, 'schools'), where('createdBy', '==', uid)));
    if (snap.empty) return null;
    return snap.docs[0].data();
  },

  // A School Admin loads the school they were assigned to (by id from profile).
  async getSchool(id) {
    if (!id) return null;
    const snap = await getDoc(doc(db, 'schools', id));
    return snap.exists() ? snap.data() : null;
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
