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
