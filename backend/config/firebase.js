const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

let firebaseApp, db, auth, storage;
let realAdmin = false;

// A service account turns on the REAL Admin SDK (full privileges, bypasses
// security rules) — needed for true account deletion and the auto-purge sweep.
// Preferred: a JSON key file at backend/firebase-service-account-key.json
// (gitignored). Fallback: FIREBASE_PROJECT_ID / _CLIENT_EMAIL / _PRIVATE_KEY.
function loadServiceAccount() {
  try {
    return require('../firebase-service-account-key.json');
  } catch (_) {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      return {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    }
    return null;
  }
}

const serviceAccount = loadServiceAccount();

if (serviceAccount && (serviceAccount.private_key || serviceAccount.privateKey)) {
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  db = admin.firestore();
  auth = admin.auth();
  storage = admin.storage();
  realAdmin = true;
  console.log('Firebase Admin SDK initialized with real credentials.');
} else {
  console.warn(
    'No Firebase service account found — using a mock. Admin-only features ' +
      '(true account deletion, 45-day auto-purge) stay disabled until you add ' +
      'backend/firebase-service-account-key.json.'
  );

  const mockDoc = {
    get: async () => ({ exists: false, data: () => ({}), id: 'mock-id' }),
    set: async () => Promise.resolve(),
    update: async () => Promise.resolve(),
    delete: async () => Promise.resolve(),
  };
  const mockFirestore = {
    collection: () => ({
      doc: () => mockDoc,
      where: () => ({
        get: async () => ({ empty: true, docs: [], forEach: () => {} }),
        limit: () => ({ get: async () => ({ empty: true, docs: [], forEach: () => {} }) }),
      }),
      add: async () => Promise.resolve({ id: 'mock-id-' + Date.now() }),
      get: async () => ({ empty: true, docs: [], forEach: () => {} }),
    }),
    batch: () => ({ set: () => {}, update: () => {}, delete: () => {}, commit: async () => Promise.resolve() }),
  };
  db = mockFirestore;
  auth = {
    verifyIdToken: async () => ({ uid: 'mock-user' }),
    getUser: async () => ({ uid: 'mock-user', email: 'mock@example.com' }),
    getUserByEmail: async () => ({ uid: 'mock-user', email: 'mock@example.com' }),
    createUser: async () => ({ uid: 'mock-user', email: 'mock@example.com' }),
    createCustomToken: async () => 'mock-token',
    deleteUser: async () => Promise.resolve(),
  };
  storage = {
    bucket: () => ({
      file: () => ({ getSignedUrl: async () => ['https://mock-storage-url.com'], save: async () => {}, delete: async () => {} }),
      upload: async () => Promise.resolve(),
    }),
  };
  firebaseApp = { name: 'mock-app' };
  realAdmin = false;
}

module.exports = { admin, db, auth, storage, firebaseApp, realAdmin };
