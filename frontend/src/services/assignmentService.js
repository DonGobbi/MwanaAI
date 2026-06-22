import { db } from '../config/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';

// Teachers assign work (a topic/quiz) to a class; students see it as a task.
// Completion is tracked via the quiz_results doc that carries the assignmentId.
export const assignmentService = {
  async create(teacher, cls, { subject, subjectLabel, topic, examType, count }) {
    const id = doc(collection(db, 'assignments')).id;
    const assignment = {
      id,
      classId: cls.id,
      className: cls.name,
      teacherId: teacher.uid,
      subject,
      subjectLabel,
      topic: topic || '',
      examType: examType || '',
      count: count || 5,
      title: `${subjectLabel}${topic ? ': ' + topic : ''}`,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'assignments', id), assignment);
    return assignment;
  },

  async remove(id) {
    if (id) await deleteDoc(doc(db, 'assignments', id));
  },

  async listForClass(classId) {
    const snap = await getDocs(query(collection(db, 'assignments'), where('classId', '==', classId)));
    return snap.docs.map((d) => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  // Assignments across all the classes a student belongs to.
  async listForStudent(classIds) {
    if (!classIds || !classIds.length) return [];
    const all = [];
    for (const cid of classIds) {
      const snap = await getDocs(query(collection(db, 'assignments'), where('classId', '==', cid)));
      snap.docs.forEach((d) => all.push(d.data()));
    }
    return all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  // How many students have completed an assignment.
  async completionCount(assignmentId) {
    const snap = await getDocs(query(collection(db, 'quiz_results'), where('assignmentId', '==', assignmentId)));
    return snap.size;
  },

  // The set of assignmentIds a given student has completed.
  async completedByStudent(studentId) {
    const snap = await getDocs(query(collection(db, 'quiz_results'), where('userId', '==', studentId)));
    const done = new Set();
    snap.docs.forEach((d) => {
      const a = d.data().assignmentId;
      if (a) done.add(a);
    });
    return done;
  },
};
