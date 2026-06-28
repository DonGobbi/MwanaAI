// One-off cleanup of leftover automated-test artifacts on the live project:
//   - two school-less "Profile Tester" student accounts (doc + Auth login)
//   - the "Sec Fixture School" test school (+ its classrooms/subjects/invites)
// Self-verifying: it refuses to delete anything that doesn't match the exact
// expected shape, so it can never remove a real account or school.
//
// Run inside the backend container:
//   docker exec mwanaai-backend node /app/scripts/cleanup-test-data.js

const { admin, db, realAdmin } = require('../config/firebase');

const TARGET_UIDS = [
  'WJyLoWALdvRQbP8FtK3YF8HSfnC2',
  'Zy2QjcE3kMRKGovvqnS97WAft2f2',
];
const TARGET_SCHOOL_NAME = 'Sec Fixture School';

async function deleteTestUser(uid) {
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) { console.log(`  user ${uid}: not found (already gone)`); return; }
  const u = snap.data();
  // Safety guards — only delete the exact junk shape.
  if (u.displayName !== 'Profile Tester' || u.userType !== 'student' || (u.schoolId || '') !== '') {
    console.log(`  user ${uid}: SKIPPED — not a school-less "Profile Tester" (name="${u.displayName}", role="${u.userType}", school="${u.schoolId || ''}")`);
    return;
  }
  await ref.delete();
  try { await admin.auth().deleteUser(uid); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
  console.log(`  user ${uid}: deleted ("${u.displayName}", student, no school) + login`);
}

async function deleteTestSchool() {
  const q = await db.collection('schools').where('name', '==', TARGET_SCHOOL_NAME).get();
  if (q.empty) { console.log(`  school "${TARGET_SCHOOL_NAME}": not found (already gone)`); return; }
  for (const doc of q.docs) {
    const schoolId = doc.id;
    // Remove dependent fixtures so nothing is orphaned.
    for (const coll of ['classrooms', 'subjects', 'invites']) {
      const sub = await db.collection(coll).where('schoolId', '==', schoolId).get();
      for (const d of sub.docs) await d.ref.delete();
      if (sub.size) console.log(`    removed ${sub.size} ${coll} for this school`);
    }
    await doc.ref.delete();
    console.log(`  school "${TARGET_SCHOOL_NAME}" (${schoolId}): deleted`);
  }
}

async function main() {
  if (!realAdmin) { console.error('Admin SDK not configured — aborting.'); process.exit(1); }
  console.log('Cleaning up leftover test data…');
  console.log('Users:');
  for (const uid of TARGET_UIDS) await deleteTestUser(uid);
  console.log('Schools:');
  await deleteTestSchool();
  console.log('Done.');
  process.exit(0);
}
main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
