import { db } from '../config/firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';

// Schools are the top level. A Super Admin registers and manages many schools;
// each School Admin is attached to one school via their profile's schoolId.
export const schoolService = {
  // Every registered school (Super Admin view), newest first.
  async listSchools() {
    const snap = await getDocs(collection(db, 'schools'));
    return snap.docs.map((d) => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

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

  // Suspend or restore a whole school (Super Admin only, enforced by rules).
  // A suspended school blocks every member at sign-in (see AuthContext gate).
  async setStatus(id, status) {
    await updateDoc(doc(db, 'schools', id), { status, updatedAt: Date.now() });
  },
};
