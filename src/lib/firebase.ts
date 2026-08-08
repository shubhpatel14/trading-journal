import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously, 
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  writeBatch,
  onSnapshot
} from "firebase/firestore";

const getEnvValue = (val: any, fallback: string): string => {
  if (!val || val === "undefined" || val === "null" || val === "" || val === "AIzaSyAq7fZqbo_PaQ0MfsWWjTMAXkPJ86sP_0") {
    return fallback;
  }
  return val;
};

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC5EpZZdyGJQoYy914hlHVJvQyXz3guTuM",
  authDomain: "tradingjournalapp-4ed16.firebaseapp.com",
  projectId: "tradingjournalapp-4ed16",
  storageBucket: "tradingjournalapp-4ed16.firebasestorage.app",
  messagingSenderId: "648615464927",
  appId: "1:648615464927:web:0a99480ccb4fd7eafafe6a",
  measurementId: "G-30E3F0M2SE"
};

// Check if we have required parameters to initialize Firebase
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "undefined" &&
  firebaseConfig.apiKey !== "null" &&
  firebaseConfig.apiKey !== "" &&
  firebaseConfig.apiKey.startsWith("AIzaSy") &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "undefined" &&
  firebaseConfig.projectId !== "null" &&
  firebaseConfig.projectId !== ""
);

let app;
let auth: any = null;
let db: any = null;
let googleProvider: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    // Prompt user select account on login
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  } catch (error) {
    console.error("Error initializing real Firebase:", error);
  }
}

export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export { 
  auth, 
  db, 
  googleProvider,
  isFirebaseConfigured,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
  onSnapshot
};
export type { User };

