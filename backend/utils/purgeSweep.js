const { admin, db, realAdmin } = require('../config/firebase');

const RETENTION_MS = 45 * 24 * 60 * 60 * 1000; // 45 days
const DAY_MS = 24 * 60 * 60 * 1000;

// Permanently remove accounts archived more than 45 days ago: the Firebase Auth
// login AND the Firestore record. The audit trail keeps the history. Runs only
// when the real Admin SDK is configured. Returns the number purged.
async function purgeExpiredArchived() {
  if (!realAdmin) return 0;
  const cutoff = Date.now() - RETENTION_MS;
  let purged = 0;
  try {
    const snap = await db.collection('users').where('status', '==', 'archived').get();
    for (const docSnap of snap.docs) {
      const u = docSnap.data();
      if (u.userType === 'superadmin') continue;
      if (!u.archivedAt || u.archivedAt > cutoff) continue; // not yet 45 days

      try {
        await admin.auth().deleteUser(docSnap.id);
      } catch (err) {
        if (err.code !== 'auth/user-not-found') {
          console.error('Auto-purge: could not delete login', docSnap.id, err.message);
          continue; // leave the record so we retry next run
        }
      }
      await docSnap.ref.delete();

      try {
        const id = db.collection('audit_logs').doc().id;
        await db.collection('audit_logs').doc(id).set({
          id,
          schoolId: u.schoolId || '',
          actorId: 'system',
          actorName: 'System (auto-purge)',
          actorEmail: '',
          action: 'Auto-deleted after 45 days',
          targetType: u.userType || '',
          targetId: docSnap.id,
          targetName: u.displayName || u.email || '',
          detail: 'archive retention expired',
          createdAt: Date.now(),
        });
      } catch (_) {
        /* audit is best-effort */
      }
      purged += 1;
    }
    if (purged) console.log(`Auto-purge: removed ${purged} account(s) archived over 45 days.`);
  } catch (err) {
    console.error('Auto-purge sweep failed:', err.message);
  }
  return purged;
}

// Sweep shortly after boot, then once a day while the backend runs.
function scheduleArchivePurge() {
  if (!realAdmin) return;
  setTimeout(() => { purgeExpiredArchived(); }, 30 * 1000);
  setInterval(() => { purgeExpiredArchived(); }, DAY_MS);
  console.log('Archive auto-purge scheduled (daily, 45-day retention).');
}

module.exports = { purgeExpiredArchived, scheduleArchivePurge };
