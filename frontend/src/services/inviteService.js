import { db } from '../config/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';

// School invites (the admin roster). One invite per email per school (the doc id
// is deterministic so re-inviting updates rather than duplicates). When the
// invited person signs up with that email, their profile is auto-populated.
export const inviteService = {
  async create(admin, school, { email, role, gradeLevel = '', gradeLabel = '', subjects = [] }) {
    const clean = (email || '').trim().toLowerCase();
    if (!clean) throw new Error('Email is required.');
    const id = `${school.id}_${clean}`;
    const data = {
      id,
      email: clean,
      role, // 'student' | 'teacher'
      schoolId: school.id,
      schoolName: school.name || '',
      gradeLevel,
      gradeLabel,
      subjects,
      status: 'pending',
      invitedBy: admin.uid,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'invites', id), data);
    return data;
  },

  async listForSchool(schoolId) {
    if (!schoolId) return [];
    const snap = await getDocs(query(collection(db, 'invites'), where('schoolId', '==', schoolId)));
    return snap.docs.map((d) => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  async remove(id) {
    await deleteDoc(doc(db, 'invites', id));
  },
};
