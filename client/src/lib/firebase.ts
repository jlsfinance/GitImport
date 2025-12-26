import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBDto4M27_AmBJ-eGNZyQI-Jtmhfnv1X5g",
  authDomain: "studio-5843390050-90c53.firebaseapp.com",
  projectId: "studio-5843390050-90c53",
  storageBucket: "studio-5843390050-90c53.firebasestorage.app",
  messagingSenderId: "796126072517",
  appId: "1:796126072517:web:be2ff390a075fad7bcaaac"
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