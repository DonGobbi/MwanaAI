import { db } from '../config/firebase';
import { collection, doc, setDoc, deleteDoc, getDoc, getDocs, query, where } from 'firebase/firestore';

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
  async createClass(teacher, { subject, subjectLabel, level, levelLabel, schoolId }) {
    // One class per subject+level per teacher — no duplicates.
    const mine = await getDocs(query(collection(db, 'classes'), where('teacherId', '==', teacher.uid)));
    if (mine.docs.some((d) => d.data().subject === subject && d.data().level === level)) {
      throw new Error(`You already have a ${subjectLabel} · ${levelLabel} class.`);
    }
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
      // The school the class belongs to — lets admin-enrolled students (same
      // school + level + subject) appear in this class automatically.
      schoolId: schoolId || '',
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'classes', id), cls);
    return cls;
  },

  async getClass(id) {
    if (!id) return null;
    const s = await getDoc(doc(db, 'classes', id));
    return s.exists() ? s.data() : null;
  },

  async listClassesForTeacher(teacherId) {
    const snap = await getDocs(query(collection(db, 'classes'), where('teacherId', '==', teacherId)));
    return snap.docs.map((d) => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  // Delete a class. Also removes the teacher's assignments for it (the teacher
  // owns those); student class_members reference it but are harmless if orphaned.
  async deleteClass(classId) {
    if (!classId) return;
    try {
      const a = await getDocs(query(collection(db, 'assignments'), where('classId', '==', classId)));
      await Promise.all(a.docs.map((d) => deleteDoc(doc(db, 'assignments', d.id))));
    } catch (err) {
      /* best effort */
    }
    await deleteDoc(doc(db, 'classes', classId));
  },

  // A class roster = students an admin enrolled into this subject + level (their
  // profile matches the class's school/level/subject) UNION students who joined
  // with the class code. So enrolled students appear without needing the code.
  // Accepts a class object (preferred) or a classId.
  async getMembers(cls) {
    const classObj = typeof cls === 'string' ? await this.getClass(cls) : cls;
    if (!classObj) return [];

    // Which school to match enrolled students against. New classes carry a
    // schoolId; for older ones, fall back to the teacher's school.
    let schoolId = classObj.schoolId;
    if (!schoolId && classObj.teacherId) {
      try {
        const td = await getDoc(doc(db, 'users', classObj.teacherId));
        if (td.exists()) schoolId = td.data().schoolId;
      } catch (_) {
        /* ignore */
      }
    }

    const byId = {};
    if (schoolId && classObj.level && classObj.subject) {
      const snap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId)));
      snap.docs.forEach((d) => {
        const u = d.data();
        if (u.userType === 'student' && u.gradeLevel === classObj.level && Array.isArray(u.subjects) && u.subjects.includes(classObj.subject)) {
          byId[u.uid] = {
            id: `${classObj.id}_${u.uid}`,
            classId: classObj.id,
            className: classObj.name,
            studentId: u.uid,
            studentName: u.displayName || 'Student',
            studentEmail: u.email || '',
            joinedAt: u.createdAt || 0,
          };
        }
      });
    }

    // Code-joined students fill in anyone not already matched by enrolment.
    const cm = await getDocs(query(collection(db, 'class_members'), where('classId', '==', classObj.id)));
    cm.docs.forEach((d) => {
      const m = d.data();
      if (!byId[m.studentId]) byId[m.studentId] = m;
    });

    return Object.values(byId).sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
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

  // The classes a student belongs to = those they were enrolled in by an admin
  // (profile matches a class's school/level/subject) UNION any they joined by
  // code — so an enrolled student sees their classes (and their assignments)
  // without needing the code.
  async listClassesForStudent(studentId) {
    if (!studentId) return [];
    const byClassId = {};

    const cm = await getDocs(query(collection(db, 'class_members'), where('studentId', '==', studentId)));
    cm.docs.forEach((d) => {
      const m = d.data();
      byClassId[m.classId] = m;
    });

    try {
      const ud = await getDoc(doc(db, 'users', studentId));
      const u = ud.exists() ? ud.data() : null;
      if (u && u.schoolId && u.gradeLevel && Array.isArray(u.subjects) && u.subjects.length) {
        const cs = await getDocs(query(collection(db, 'classes'), where('schoolId', '==', u.schoolId)));
        cs.docs.forEach((d) => {
          const c = d.data();
          if (c.level === u.gradeLevel && u.subjects.includes(c.subject) && !byClassId[c.id]) {
            byClassId[c.id] = {
              id: `${c.id}_${studentId}`,
              classId: c.id,
              className: c.name,
              teacherName: c.teacherName || '',
              studentId,
              joinedAt: c.createdAt || 0,
            };
          }
        });
      }
    } catch (_) {
      /* ignore */
    }

    return Object.values(byClassId).sort((a, b) => (b.joinedAt || 0) - (a.joinedAt || 0));
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
