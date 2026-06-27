import { db } from '../config/firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';

// Short, human-friendly class code (no easily confused characters).
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const classService = {
  // ---- Teacher ----
  // A class is one subject taught at one level (e.g. Geography · Form 1).
  // Subject + level are set once here and inherited everywhere in the class.
  async createClass(teacher, { subject, subjectLabel, level, levelLabel }) {
    const id = doc(collection(db, 'classes')).id;
    const cls = {
      id,
      name: `${subjectLabel} · ${levelLabel}`,
      subject,
      subjectLabel,
      level,
      levelLabel,
      code: generateCode(),
      teacherId: teacher.uid,
      teacherName: teacher.displayName || 'Teacher',
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'classes', id), cls);
    return cls;
  },

  async listClassesForTeacher(teacherId) {
    const snap = await getDocs(query(collection(db, 'classes'), where('teacherId', '==', teacherId)));
    return snap.docs.map((d) => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  async getMembers(classId) {
    const snap = await getDocs(query(collection(db, 'class_members'), where('classId', '==', classId)));
    return snap.docs.map((d) => d.data()).sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
  },

  // ---- Student ----
  async joinClass(student, code) {
    const clean = code.trim().toUpperCase();
    const snap = await getDocs(query(collection(db, 'classes'), where('code', '==', clean)));
    if (snap.empty) throw new Error('No class found with that code. Please check and try again.');
    const cls = snap.docs[0].data();
    const memberId = `${cls.id}_${student.uid}`;
    await setDoc(doc(db, 'class_members', memberId), {
      id: memberId,
      classId: cls.id,
      className: cls.name,
      teacherName: cls.teacherName || '',
      studentId: student.uid,
      studentName: student.displayName || 'Student',
      studentEmail: student.email || '',
      joinedAt: Date.now(),
    });
    return cls;
  },

  async listClassesForStudent(studentId) {
    const snap = await getDocs(query(collection(db, 'class_members'), where('studentId', '==', studentId)));
    return snap.docs.map((d) => d.data()).sort((a, b) => (b.joinedAt || 0) - (a.joinedAt || 0));
  },

  // ---- Shared: a student's progress summary (for teachers and parents) ----
  async getStudentSummary(studentId) {
    const qz = await getDocs(query(collection(db, 'quiz_results'), where('userId', '==', studentId)));
    const quizzes = qz.docs.map((d) => d.data());
    const quizCount = quizzes.length;
    const avgScore = quizCount
      ? Math.round(quizzes.reduce((a, r) => a + (r.percentage || 0), 0) / quizCount)
      : null;

    const ls = await getDocs(query(collection(db, 'lesson_progress'), where('userId', '==', studentId)));
    const lessonsCompleted = ls.size;

    const times = [
      ...quizzes.map((q) => q.createdAt || 0),
      ...ls.docs.map((d) => d.data().completedAt || 0),
    ];
    const lastActive = times.length ? Math.max(...times) : null;

    const recent = quizzes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
    return { quizCount, avgScore, lessonsCompleted, lastActive, recent };
  },

  // ---- Parent: find a student by email ----
  async findStudentByEmail(email) {
    const clean = email.trim();
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', clean)));
    if (snap.empty) return null;
    return snap.docs[0].data();
  },
};
