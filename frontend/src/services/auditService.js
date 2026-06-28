import { db } from '../config/firebase';
import { collection, doc, getDocs, query, where, setDoc } from 'firebase/firestore';

// A lightweight, best-effort audit trail of admin actions. Logging must never
// break the action it describes, so log() swallows its own errors.
//
// A log entry: { actor, action, targetType, targetId, targetName, schoolId, detail }
// where `actor` is the signed-in user object (currentUser).
export const auditService = {
  async log({ schoolId, actor, action, targetType, targetId, targetName, detail }) {
    try {
      const id = doc(collection(db, 'audit_logs')).id;
      await setDoc(doc(db, 'audit_logs', id), {
        id,
        schoolId: schoolId || '',
        actorId: actor?.uid || '',
        actorName: actor?.displayName || actor?.email || 'Someone',
        actorEmail: actor?.email || '',
        action: action || '',
        targetType: targetType || '',
        targetId: targetId || '',
        targetName: targetName || '',
        detail: detail || '',
        createdAt: Date.now(),
      });
    } catch (err) {
      // Never let an audit failure surface to the user / abort the action.
      console.error('audit log failed (non-fatal):', err);
    }
  },

  // Most recent entries for a school, newest first. We filter by schoolId only
  // (a single-field query — no composite index) and sort/cap client-side.
  async listForSchool(schoolId, max = 300) {
    if (!schoolId) return [];
    const snap = await getDocs(query(collection(db, 'audit_logs'), where('schoolId', '==', schoolId)));
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, max);
  },
};
