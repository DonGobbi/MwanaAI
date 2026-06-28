import { db } from '../config/firebase';
import { collection, doc, getDocs, query, where, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { SUBJECTS } from '../config/curriculum';

// Stable slug used as the subject's value across the app (classes, quizzes,
// student profiles all key off this). Standard subjects keep their curriculum
// slug; custom ones get a slug from their name.
export const slugifySubject = (s) =>
  (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Per-school subject catalogue. Seeded from the standard Malawi list, then
// extended by admins. Subjects are deactivated, never deleted, so data that
// references them (classes, quizzes) is never orphaned.
export const subjectService = {
  async listForSchool(schoolId) {
    if (!schoolId) return [];
    const snap = await getDocs(query(collection(db, 'subjects'), where('schoolId', '==', schoolId)));
    return snap.docs.map((d) => d.data()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  },

  async add(schoolId, actor, { name, code, level }) {
    const id = doc(collection(db, 'subjects')).id;
    const subject = {
      id,
      schoolId,
      name: (name || '').trim(),
      value: slugifySubject(name),
      code: (code || '').trim().toUpperCase(),
      level: level || 'all',
      status: 'active',
      createdAt: Date.now(),
      createdBy: actor?.uid || '',
    };
    await setDoc(doc(db, 'subjects', id), subject);
    return subject;
  },

  // active | inactive
  async setStatus(id, status) {
    await updateDoc(doc(db, 'subjects', id), { status, updatedAt: Date.now() });
  },

  // Import the standard Malawi subjects for a school, skipping any already
  // present (by name). Returns how many were added.
  async seedDefaults(schoolId, actor, existing = []) {
    const have = new Set(existing.map((s) => (s.name || '').toLowerCase()));
    const batch = writeBatch(db);
    let added = 0;
    SUBJECTS.forEach((s) => {
      if (have.has(s.label.toLowerCase())) return;
      const id = doc(collection(db, 'subjects')).id;
      batch.set(doc(db, 'subjects', id), {
        id, schoolId, name: s.label, value: s.value, code: '', level: 'all',
        status: 'active', createdAt: Date.now(), createdBy: actor?.uid || '',
      });
      added += 1;
    });
    if (added) await batch.commit();
    return added;
  },
};
