import { db } from '../config/firebase';
import { collection, doc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { API_BASE } from '../config/api';

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

  // Every live account across the platform (Super Admin directory). Excludes
  // archived/deleted and the super admin. Full scan — fine while small.
  async listAll() {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs
      .map((d) => d.data())
      .filter((u) => !['archived', 'deleted'].includes((u.status || 'active').toLowerCase()) && u.userType !== 'superadmin')
      .sort((a, b) => (a.displayName || a.email || '').localeCompare(b.displayName || b.email || ''));
  },

  // True permanent delete via the backend (Admin SDK): removes the Firebase
  // Auth login AND the Firestore record. Returns { ok } on success, or
  // { ok: false, status } so the caller can fall back to a tombstone when the
  // backend isn't configured (503) or is unreachable (status 0).
  async hardDelete(uid, idToken) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${uid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) return { ok: true };
      const data = await res.json().catch(() => ({}));
      return { ok: false, status: res.status, error: data.error };
    } catch (_) {
      return { ok: false, status: 0, error: 'unreachable' };
    }
  },

  // Platform super administrators (not attached to any school). Single-field
  // query — no composite index. Excludes archived/deleted.
  async listSuperAdmins() {
    const snap = await getDocs(query(collection(db, 'users'), where('userType', '==', 'superadmin')));
    return snap.docs
      .map((d) => d.data())
      .filter((u) => !['archived', 'deleted'].includes((u.status || 'active').toLowerCase()));
  },

  // Permanent delete as a tombstone: an archived account is anonymized and
  // marked 'deleted' (blocked at sign-in, hidden from rosters). A minimal
  // record stays for history; the audit log keeps who/when. No backend needed.
  async purge(uid, actorUid) {
    await updateDoc(doc(db, 'users', uid), {
      status: 'deleted',
      deletedAt: Date.now(),
      deletedBy: actorUid || '',
      displayName: '(deleted account)',
      email: '',
      phone: '',
      gender: '',
      dateOfBirth: '',
      photoURL: '',
      bio: '',
      location: '',
      updatedAt: new Date().toISOString(),
    });
  },

  // Platform-wide head-count by role (Super Admin dashboard). Archived and the
  // super admin are excluded. NOTE: scans the users collection — fine while the
  // platform is small; swap for maintained aggregate counters at large scale.
  async platformStats() {
    const snap = await getDocs(collection(db, 'users'));
    const counts = { student: 0, teacher: 0, admin: 0, parent: 0, total: 0, deactivated: 0 };
    const bySchool = {}; // schoolId -> { student, teacher, admin, parent, total }
    snap.docs.forEach((d) => {
      const u = d.data();
      const status = (u.status || 'active').toLowerCase();
      if (status === 'archived' || status === 'deleted') return;
      if (status === 'deactivated') counts.deactivated += 1;
      if (counts[u.userType] == null) return;
      counts[u.userType] += 1;
      counts.total += 1;
      if (u.schoolId) {
        const b = bySchool[u.schoolId] || (bySchool[u.schoolId] = { student: 0, teacher: 0, admin: 0, parent: 0, total: 0 });
        b[u.userType] += 1;
        b.total += 1;
      }
    });
    return { ...counts, bySchool };
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
