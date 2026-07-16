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
  writeBatch 
} from "firebase/firestore";

const getEnvValue = (val: any, fallback: string): string => {
  if (!val || val === "undefined" || val === "null" || val === "" || val === "AIzaSyAq7fZqbo_PaQ0MfsWWjTMAXkPJ86sP_0") {
    return fallback;
  }
  return val;
};

const firebaseConfig = {
  apiKey: getEnvValue(import.meta.env.VITE_FIREBASE_API_KEY, "AIzaSyAq7fZqQbo_PaQOMfsWWjTMAxkPJ86sP_0"),
  authDomain: getEnvValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, "inner-dominion-3t3g1.firebaseapp.com"),
  projectId: getEnvValue(import.meta.env.VITE_FIREBASE_PROJECT_ID, "inner-dominion-3t3g1"),
  storageBucket: getEnvValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, "inner-dominion-3t3g1.firebasestorage.app"),
  messagingSenderId: getEnvValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, "247612076242"),
  appId: getEnvValue(import.meta.env.VITE_FIREBASE_APP_ID, "1:247612076242:web:9ddf65b9da51ee8a9c3d0b"),
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
  writeBatch
};
export type { User };
