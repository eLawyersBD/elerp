import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase configuration for ERP for EL
const firebaseConfig = {
  apiKey: "AIzaSyDCWmUs32WaWNEc10fCFZ1PZpKT-wJNBf4",
  authDomain: "erpforel.firebaseapp.com",
  projectId: "erpforel",
  storageBucket: "erpforel.firebasestorage.app",
  messagingSenderId: "667505699437",
  appId: "1:667505699437:web:50ef6e8b1312e205de6d64",
  measurementId: "G-GC7608PF4T"
};

// Set to true to enable Firebase, or false to force direct local MySQL usage.
const ENABLE_FIREBASE = false;

// Check if credentials are valid (not default placeholders)
export const isFirebaseConfigured = () => {
  if (!ENABLE_FIREBASE) return false;
  return firebaseConfig.apiKey && 
         firebaseConfig.apiKey !== "placeholder-api-key" &&
         firebaseConfig.projectId &&
         firebaseConfig.projectId !== "placeholder-project-id";
};

let app;
let auth;
let db;
let analytics;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    
    // Safely initialize analytics in environments where it is supported
    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log("📈 Firebase Analytics initialized successfully.");
      }
    }).catch((err) => {
      console.warn("⚠️ Firebase Analytics could not be initialized:", err);
    });

    console.log("🔥 Firebase initialized successfully with configuration credentials.");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase app: ", error);
  }
} else {
  console.warn("⚠️ Firebase credentials not configured. System is running in Local Storage offline mode.");
}

export { app, auth, db, analytics };

// Pre-configured Google provider (scopes for profile + email)
export const googleProvider = (() => {
  const p = new GoogleAuthProvider();
  p.addScope('profile');
  p.addScope('email');
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
})();
