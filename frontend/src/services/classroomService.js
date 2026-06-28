import { db } from '../config/firebase';
import { collection, doc, getDocs, query, where, setDoc, updateDoc } from 'firebase/firestore';

// Per-school classrooms (sections) — e.g. Form 1 A / B / C. A classroom is a
// level plus a section label; students are assigned to one. Deactivated, never
// deleted, so a student's classroom reference is never orphaned.
export const classroomService = {
  async listForSchool(schoolId) {
    if (!schoolId) return [];
    const snap = await getDocs(query(collection(db, 'classrooms'), where('schoolId', '==', schoolId)));
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
  },

  async add(schoolId, actor, { level, levelLabel, section, capacity }) {
    const id = doc(collection(db, 'classrooms')).id;
    const name = `${levelLabel || level} ${(section || '').trim()}`.trim();
    const classroom = {
      id,
      schoolId,
      name,
      level: level || '',
      levelLabel: levelLabel || '',
      section: (section || '').trim(),
      capacity: Number(capacity) || 0,
      status: 'active',
      createdAt: Date.now(),
      createdBy: actor?.uid || '',
    };
    await setDoc(doc(db, 'classrooms', id), classroom);
    return classroom;
  },

  // active | inactive
  async setStatus(id, status) {
    await updateDoc(doc(db, 'classrooms', id), { status, updatedAt: Date.now() });
  },
};
