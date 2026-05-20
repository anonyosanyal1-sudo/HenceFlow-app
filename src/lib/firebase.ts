import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
};

// Ensure Firebase config is valid before initializing
const isConfigValid = !!(config.apiKey && config.projectId && config.apiKey !== "");

if (!isConfigValid && typeof window !== 'undefined') {
  console.warn("Firebase configuration is missing or incomplete. Check your environment variables.");
}

const app = initializeApp(isConfigValid ? config : { apiKey: "dummy-key", projectId: "dummy-project" });
export const db = getFirestore(app, (isConfigValid && config.firestoreDatabaseId) ? config.firestoreDatabaseId : undefined);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  if (!isConfigValid) {
    throw new Error("Firebase is not configured. Please add VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID to your environment variables.");
  }
  return signInWithPopup(auth, googleProvider);
};
export const logout = () => signOut(auth);

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Silent fail for dev environment
    console.debug("Firebase initial check completed.");
  }
}
// testConnection();
