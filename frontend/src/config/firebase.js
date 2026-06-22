// Import Firebase SDK
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFirestore, writeBatch } from 'firebase/firestore';

// Firebase configuration for frontend
const firebaseConfig = {
  apiKey: 'REMOVED__USE_ENV_VAR',
  authDomain: 'mwanaai-2ad50.firebaseapp.com',
  projectId: 'mwanaai-2ad50',
  storageBucket: 'mwanaai-2ad50.firebasestorage.app',
  messagingSenderId: '728213377347',
  appId: '1:728213377347:web:a7f61d56f990d980849ff6',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export the Firebase services
export { auth, db, storage, writeBatch };
export default firebaseConfig;
