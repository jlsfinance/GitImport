import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDT1yArqU-1NTudFisp1KN8HFLBaBAM0ns",
  authDomain: "studio-1865737492-158b7.firebaseapp.com",
  databaseURL: "https://studio-1865737492-158b7-default-rtdb.firebaseio.com",
  projectId: "studio-1865737492-158b7",
  storageBucket: "studio-1865737492-158b7.firebasestorage.app",
  messagingSenderId: "718784992577",
  appId: "1:718784992577:web:4ef4f575314d4b74d07dc0"
};

// Initialize only if not already initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
