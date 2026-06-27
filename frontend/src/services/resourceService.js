import { db } from '../config/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';

// Per-class resource library. Teachers add resources (syllabus, notes, a
// YouTube link, pasted text…); we store the EXTRACTED TEXT plus metadata in
// Firestore so enrolled students can read them and the AI can work on them.
// (No file storage needed — text powers all the AI features.)

// Cap stored text so a single document stays well within Firestore's 1 MB
// limit and the model's rate limit.
const MAX_TEXT = 16000;

export const resourceService = {
  // Add a resource to a class. `cls` is the class object ({ id, name }).
  async add(teacher, cls, { title, kind, sourceName, text }) {
    const id = doc(collection(db, 'resources')).id;
    const clean = (text || '').trim();
    const data = {
      id,
      classId: cls.id,
      className: cls.name || '',
      teacherId: teacher.uid,
      teacherName: teacher.displayName || 'Teacher',
      title: (title || sourceName || 'Resource').slice(0, 140),
      kind, // 'file' | 'youtube' | 'text' | 'link'
      sourceName: sourceName || '',
      text: clean.slice(0, MAX_TEXT),
      chars: clean.length,
      truncated: clean.length > MAX_TEXT,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'resources', id), data);
    return data;
  },

  async listForClass(classId) {
    const snap = await getDocs(query(collection(db, 'resources'), where('classId', '==', classId)));
    return snap.docs.map((d) => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  async remove(id) {
    await deleteDoc(doc(db, 'resources', id));
  },
};
