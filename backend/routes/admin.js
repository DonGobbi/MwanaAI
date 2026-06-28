const express = require('express');
const router = express.Router();
const { admin, db, realAdmin } = require('../config/firebase');

// If the server has no real credentials, say so up front (503) — before any
// token work — so the frontend can fall back to a client-side tombstone.
const requireConfigured = (req, res, next) => {
  if (!realAdmin) {
    return res.status(503).json({ success: false, error: 'Admin features are not configured on the server.' });
  }
  next();
};

// Verify the caller's Firebase ID token.
const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized - no token provided' });
  }
  try {
    req.user = await admin.auth().verifyIdToken(header.split('Bearer ')[1]);
    next();
  } catch (_) {
    return res.status(401).json({ success: false, error: 'Unauthorized - invalid token' });
  }
};

// Load the caller's profile and require an admin role.
const requireAdmin = async (req, res, next) => {
  try {
    const snap = await db.collection('users').doc(req.user.uid).get();
    const me = snap.exists ? snap.data() : {};
    if (me.userType !== 'superadmin' && me.userType !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admins only' });
    }
    req.me = me;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @route   DELETE /api/admin/users/:uid
 * @desc    Permanently delete an ARCHIVED account — removes the Firebase Auth
 *          login AND the Firestore record. A Super Admin may delete anyone; a
 *          School Admin only a teacher/student/parent in their own school.
 * @access  Admin
 */
router.delete('/users/:uid', requireConfigured, verifyToken, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  if (uid === req.user.uid) {
    return res.status(400).json({ success: false, error: "You can't delete your own account here." });
  }
  try {
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const target = snap.data();
    if (target.userType === 'superadmin') {
      return res.status(403).json({ success: false, error: 'A super admin cannot be deleted here.' });
    }
    if ((target.status || '').toLowerCase() !== 'archived') {
      return res.status(400).json({ success: false, error: 'Only archived accounts can be permanently deleted.' });
    }
    const isSuper = req.me.userType === 'superadmin';
    const sameSchool = req.me.schoolId && target.schoolId && req.me.schoolId === target.schoolId;
    const manageableRole = ['teacher', 'student', 'parent'].includes(target.userType);
    if (!isSuper && !(sameSchool && manageableRole)) {
      return res.status(403).json({ success: false, error: 'You are not allowed to delete this user.' });
    }

    // Remove the login (ignore if it was already gone), then the profile.
    try {
      await admin.auth().deleteUser(uid);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
    }
    await db.collection('users').doc(uid).delete();

    // History is retained in the audit trail even though the account is gone.
    try {
      const id = db.collection('audit_logs').doc().id;
      await db.collection('audit_logs').doc(id).set({
        id,
        schoolId: target.schoolId || '',
        actorId: req.user.uid,
        actorName: req.me.displayName || req.me.email || 'Admin',
        actorEmail: req.me.email || '',
        action: 'Permanently deleted account',
        targetType: target.userType || '',
        targetId: uid,
        targetName: target.displayName || target.email || '',
        detail: 'login + record removed',
        createdAt: Date.now(),
      });
    } catch (_) {
      /* audit is best-effort */
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('admin delete failed:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
