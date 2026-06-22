const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

// For development purposes, create a mock implementation
const isDevelopment = process.env.NODE_ENV === 'development';

let firebaseApp, db, auth, storage;

if (isDevelopment) {
  console.log('Running in development mode with mock Firebase implementation');

  // Mock implementations for development
  const mockDoc = {
    get: async () => ({
      exists: false,
      data: () => ({}),
      id: 'mock-id',
    }),
    set: async (data) => Promise.resolve(),
    update: async (data) => Promise.resolve(),
    delete: async () => Promise.resolve(),
  };

  const mockFirestore = {
    collection: (name) => ({
      doc: (id) => mockDoc,
      where: () => ({
        get: async () => ({
          empty: true,
          docs: [],
          forEach: (callback) => {},
        }),
        limit: () => ({
          get: async () => ({
            empty: true,
            docs: [],
            forEach: (callback) => {},
          }),
        }),
      }),
      add: async (data) => Promise.resolve({ id: 'mock-id-' + Date.now() }),
      get: async () => ({
        empty: true,
        docs: [],
        forEach: (callback) => {},
      }),
    }),
    batch: () => ({
      set: (ref, data) => Promise.resolve(),
      update: (ref, data) => Promise.resolve(),
      delete: (ref) => Promise.resolve(),
      commit: async () => Promise.resolve(),
    }),
  };

  db = mockFirestore;
  auth = {
    verifyIdToken: async () => ({ uid: 'mock-user' }),
    getUser: async () => ({ uid: 'mock-user', email: 'mock@example.com' }),
  };
  storage = {
    bucket: () => ({
      file: () => ({
        getSignedUrl: async () => ['https://mock-storage-url.com'],
        save: async () => Promise.resolve(),
        delete: async () => Promise.resolve(),
      }),
      upload: async () => Promise.resolve(),
    }),
  };

  firebaseApp = { name: 'mock-app' };
} else {
  // Try to load service account from file
  let serviceAccount;
  try {
    serviceAccount = require('../firebase-service-account-key.json');
  } catch (error) {
    console.warn(
      'Firebase service account key file not found. Using environment variables instead.'
    );
    // If service account file is not available, use environment variables
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\n/g, '\n')
        : '',
    };
  }

  // Initialize Firebase Admin
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  // Initialize services
  db = admin.firestore();
  auth = admin.auth();
  storage = admin.storage();
}

// Export Firebase services
module.exports = {
  admin,
  db,
  auth,
  storage,
  firebaseApp,
};
