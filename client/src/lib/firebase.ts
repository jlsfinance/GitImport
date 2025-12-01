import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDOhuszbQuXpMO0WY-FXzkyY8dABjj4MHg",
  authDomain: "sample-firebase-ai-app-1f72d.firebaseapp.com",
  projectId: "sample-firebase-ai-app-1f72d",
  storageBucket: "sample-firebase-ai-app-1f72d.firebasestorage.app",
  messagingSenderId: "231225025529",
  appId: "1:231225025529:web:e079fe0aa1be713625d328"
};

// Initialize only if not already initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);