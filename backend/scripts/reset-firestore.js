/*
 * DANGER: wipes ALL MwanaAI data so you can start fresh.
 *
 * Deletes every document in every collection AND every Firebase Auth user,
 * then (optionally) creates one Super Admin to log in with.
 *
 * Setup (one time):
 *   1. Firebase Console > Project settings > Service accounts >
 *      "Generate new private key" > download the JSON.
 *   2. Save it as  backend/serviceAccount.json  (it is git-ignored).
 *
 * Run (from the project root):
 *   docker compose exec \
 *     -e CONFIRM=WIPE \
 *     -e SUPERADMIN_EMAIL="you@example.com" \
 *     -e SUPERADMIN_PASSWORD="a-strong-password" \
 *     -e SUPERADMIN_NAME="Your Name" \
 *     backend node scripts/reset-firestore.js
 *
 * Omit the SUPERADMIN_* vars to wipe only (then sign up in the app afterwards).
 */
const path = require('path');
const admin = require('firebase-admin');

if (process.env.CONFIRM !== 'WIPE') {
  console.error('Refusing to run. This DELETES ALL DATA. Set CONFIRM=WIPE to proceed.');
  process.exit(1);
}

const keyPath = process.env.SERVICE_ACCOUNT || path.join(__dirname, '..', 'serviceAccount.json');
let serviceAccount;
try {
  serviceAccount = require(keyPath);
} catch (e) {
  console.error(`Could not read service account at ${keyPath}.`);
  console.error('Generate one in Firebase Console > Project settings > Service accounts, save as backend/serviceAccount.json.');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const auth = admin.auth();

// Every collection MwanaAI uses.
const COLLECTIONS = [
  'users',
  'quiz_results',
  'lesson_progress',
  'classes',
  'class_members',
  'assignments',
  'schools',
  'invites',
  'goals',
  'resources',
  'conversations',
  'notifications',
];

async function wipeCollections() {
  for (const c of COLLECTIONS) {
    await db.recursiveDelete(db.collection(c)); // handles any subcollections too
    console.log(`  cleared collection: ${c}`);
  }
}

async function wipeAuthUsers() {
  let total = 0;
  let pageToken;
  do {
    const res = await auth.listUsers(1000, pageToken);
    const uids = res.users.map((u) => u.uid);
    if (uids.length) {
      await auth.deleteUsers(uids);
      total += uids.length;
    }
    pageToken = res.pageToken;
  } while (pageToken);
  console.log(`  deleted ${total} auth user(s)`);
}

async function createSuperadmin() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const displayName = process.env.SUPERADMIN_NAME || 'Administrator';
  if (!email || !password) {
    console.log('  (no SUPERADMIN_EMAIL/PASSWORD set — skipping; sign up in the app instead)');
    return;
  }
  const user = await auth.createUser({ email, password, displayName, emailVerified: true });
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email,
    displayName,
    userType: 'superadmin',
    createdAt: Date.now(),
  });
  console.log(`  created Super Admin: ${email}`);
}

(async () => {
  console.log(`\nResetting MwanaAI — project: ${serviceAccount.project_id}\n`);
  console.log('Wiping Firestore collections…');
  await wipeCollections();
  console.log('Wiping Auth users…');
  await wipeAuthUsers();
  console.log('Creating Super Admin…');
  await createSuperadmin();
  console.log('\n✅ Done. Fresh start ready — log in as the Super Admin and set up your school.\n');
  process.exit(0);
})().catch((e) => {
  console.error('Reset failed:', e);
  process.exit(1);
});
