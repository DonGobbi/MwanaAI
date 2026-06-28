import { db } from '../config/firebase';
import { collection, doc, getDocs, query, where, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

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

  // A single classroom for a level. `section` blank ⇒ the whole level is one
  // class (name "Form 1"); set ⇒ a section (name "Form 1 A").
  async add(schoolId, actor, { level, levelLabel, section, capacity }) {
    const id = doc(collection(db, 'classrooms')).id;
    const sec = (section || '').trim();
    const name = `${levelLabel || level} ${sec}`.trim();
    const classroom = {
      id,
      schoolId,
      name,
      level: level || '',
      levelLabel: levelLabel || '',
      section: sec,
      capacity: Number(capacity) || 0,
      status: 'active',
      createdAt: Date.now(),
      createdBy: actor?.uid || '',
    };
    await setDoc(doc(db, 'classrooms', id), classroom);
    return classroom;
  },

  // Create several sections of a level at once (e.g. A, B, C), skipping any
  // section that already exists for that level. Returns how many were added.
  async addSections(schoolId, actor, { level, levelLabel, sections = [], capacity }, existing = []) {
    const have = new Set(existing.filter((r) => r.level === level).map((r) => (r.section || '').toLowerCase()));
    const seen = new Set();
    const toAdd = sections
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .filter((s) => {
        const k = s.toLowerCase();
        if (have.has(k) || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    if (!toAdd.length) return 0;
    const batch = writeBatch(db);
    toAdd.forEach((section) => {
      const id = doc(collection(db, 'classrooms')).id;
      batch.set(doc(db, 'classrooms', id), {
        id, schoolId, name: `${levelLabel || level} ${section}`.trim(),
        level: level || '', levelLabel: levelLabel || '', section,
        capacity: Number(capacity) || 0, status: 'active', createdAt: Date.now(), createdBy: actor?.uid || '',
      });
    });
    await batch.commit();
    return toAdd.length;
  },

  // active | inactive
  async setStatus(id, status) {
    await updateDoc(doc(db, 'classrooms', id), { status, updatedAt: Date.now() });
  },
};
