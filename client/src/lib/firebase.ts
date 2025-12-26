import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Assuming FirebaseConfig type is defined elsewhere or needs to be added.
// For the purpose of this edit, we'll assume it's available or will be handled.
// If not, you might need to define it, e.g.:
// type FirebaseConfig = {
//   apiKey: string;
//   authDomain: string;
//   projectId: string;
//   storageBucket: string;
//   messagingSenderId: string;
//   appId: string;
// };

const firebaseConfig = {
  apiKey: "AIzaSyDOhuszbQuXpMO0WY-FXzkyY8dABjj4MHg",
  authDomain: "sample-firebase-ai-app-1f72d.firebaseapp.com",
  projectId: "sample-firebase-ai-app-1f72d",
  storageBucket: "sample-firebase-ai-app-1f72d.firebasestorage.app",
  messagingSenderId: "231225025529",
  appId: "1:231225025529:web:e079fe0aa1be713625d328"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
    } else if (err.code === 'unimplemented') {
      console.warn("The current browser does not support persistence.");
    }
  });
}