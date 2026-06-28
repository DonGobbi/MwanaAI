import { db } from '../config/firebase';
import { collection, doc, getDocs, query, where, updateDoc } from 'firebase/firestore';

// Account lifecycle management for admins. Reading any user is allowed for
// signed-in users (rosters); writing another user's status is gated in the
// security rules to Super Admins (anyone) and School Admins (teacher/student/
// parent in their own school).
export const accountService = {
  // Every account attached to a school. Role is filtered client-side so we
  // don't need a composite index (schoolId alone is a single-field query).
  async listBySchool(schoolId) {
    if (!schoolId) return [];
    const snap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId)));
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => (a.displayName || a.email || '').localeCompare(b.displayName || b.email || ''));
  },

  // Platform-wide head-count by role (Super Admin dashboard). Archived and the
  // super admin are excluded. NOTE: scans the users collection — fine while the
  // platform is small; swap for maintained aggregate counters at large scale.
  async platformStats() {
    const snap = await getDocs(collection(db, 'users'));
    const counts = { student: 0, teacher: 0, admin: 0, parent: 0, total: 0 };
    snap.docs.forEach((d) => {
      const u = d.data();
      if ((u.status || 'active').toLowerCase() === 'archived') return;
      if (counts[u.userType] != null) {
        counts[u.userType] += 1;
        counts.total += 1;
      }
    });
    return counts;
  },

  // active | deactivated | archived. Records who acted and when so it can feed
  // an audit trail / the 45-day archive sweep later.
  async setStatus(uid, status, actorUid) {
    const patch = { status, updatedAt: new Date().toISOString() };
    if (status === 'deactivated') {
      patch.deactivatedAt = Date.now();
      patch.deactivatedBy = actorUid || '';
    }
    if (status === 'archived') {
      patch.archivedAt = Date.now();
    }
    await updateDoc(doc(db, 'users', uid), patch);
  },
};
