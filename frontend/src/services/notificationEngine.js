import { notificationService } from './notificationService';
import { quizService } from './quizService';
import { classService } from './classService';
import { assignmentService } from './assignmentService';
import { analyzeResults } from './studentIntel';
import { analyzeClass } from './classIntel';
import {
  studentAlerts,
  studentAssignmentAlerts,
  teacherAlerts,
  teacherSubmissionAlerts,
  parentAlerts,
} from './notificationRules';

const CHILD_KEY = 'mwanaai_child_email';

const persist = async (uid, alerts) => {
  for (const a of alerts) {
    try {
      await notificationService.createIfNew(uid, a);
    } catch (e) {
      /* one failure shouldn't stop the rest */
    }
  }
};

// Proactively turn the data each role already has into in-app notifications.
// Best-effort: runs on bell mount, writes only alerts that don't exist yet.
export async function generateNotifications(user, role) {
  if (!user || !user.uid) return;
  try {
    if (role === 'teacher') {
      const classes = await classService.listClassesForTeacher(user.uid);
      for (const c of classes) {
        const [results, members, assignments] = await Promise.all([
          quizService.listByClass(c.id),
          classService.getMembers(c.id),
          assignmentService.listForClass(c.id),
        ]);
        const nameById = {};
        members.forEach((m) => { nameById[m.studentId] = m.studentName; });
        const topicOf = {};
        assignments.forEach((a) => { topicOf[a.id] = (a.topic && a.topic.trim()) || a.title || 'General'; });

        const intel = analyzeClass({ results, topicOf, nameById });
        await persist(user.uid, teacherAlerts(c.name, c.id, intel));

        const subs = results
          .filter((r) => r.assignmentId)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        await persist(user.uid, teacherSubmissionAlerts(c.name, c.id, subs, nameById));
      }
    } else if (role === 'parent') {
      const email = localStorage.getItem(CHILD_KEY);
      if (email) {
        const child = await classService.findStudentByEmail(email);
        if (child) {
          const results = await quizService.listResults(child.uid);
          const name = (child.displayName || 'Your child').split(' ')[0];
          await persist(user.uid, parentAlerts(name, child.uid, analyzeResults(results)));
        }
      }
    } else {
      // student
      const results = await quizService.listResults(user.uid);
      await persist(user.uid, studentAlerts(analyzeResults(results)));

      const classes = await classService.listClassesForStudent(user.uid);
      const ids = classes.map((c) => c.classId);
      const [assignments, done] = await Promise.all([
        assignmentService.listForStudent(ids),
        assignmentService.completedByStudent(user.uid),
      ]);
      await persist(user.uid, studentAssignmentAlerts(assignments.filter((a) => !done.has(a.id))));
    }
  } catch (e) {
    /* best effort — never block the UI */
  }
}
