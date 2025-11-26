import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, collection, getDocs, setDoc, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { FirebaseConfig } from '../types';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export const FirebaseService = {
  init: (config: FirebaseConfig): boolean => {
    try {
      if (!config.apiKey || !config.projectId) return false;
      
      app = initializeApp(config);
      db = getFirestore(app);
      console.log("Firebase Initialized Successfully");
      return true;
    } catch (error) {
      console.error("Firebase Initialization Error:", error);
      return false;
    }
  },

  isReady: () => !!db,

  testConnection: async (): Promise<{ success: boolean; message: string }> => {
    if (!db) return { success: false, message: "Firebase not initialized" };
    try {
        // Try to write a test document
        const testRef = doc(db, 'system', 'connection_test');
        await setDoc(testRef, { 
            status: 'connected', 
            timestamp: new Date().toISOString() 
        });
        return { success: true, message: "Connection Successful! Read/Write access confirmed." };
    } catch (error: any) {
        console.error("Test Connection Failed:", error);
        if (error.code === 'permission-denied') {
            return { success: false, message: "Permission Denied. Please set Firestore Rules to 'allow read, write: if true;' in Firebase Console." };
        }
        return { success: false, message: error.message || "Unknown error during connection test." };
    }
  },

  // Generic Fetch
  fetchCollection: async <T>(collectionName: string): Promise<T[]> => {
    if (!db) return [];
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      return querySnapshot.docs.map(doc => doc.data() as T);
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      return [];
    }
  },

  // Generic Save (Set/Overwrite)
  saveDocument: async (collectionName: string, id: string, data: any) => {
    if (!db) return;
    try {
      await setDoc(doc(db, collectionName, id), data);
    } catch (error) {
      console.error(`Error saving to ${collectionName}:`, error);
    }
  },

  // Generic Delete
  deleteDocument: async (collectionName: string, id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      console.error(`Error deleting from ${collectionName}:`, error);
    }
  },

  // Batch Save (for initial sync)
  batchSave: async (collectionName: string, items: any[]) => {
    if (!db) return;
    try {
        // Firestore batch limit is 500. For simplicity in this demo, assuming < 500 items.
        // In production, chunk array.
        const batch = writeBatch(db);
        items.forEach(item => {
            const ref = doc(db, collectionName, item.id);
            batch.set(ref, item);
        });
        await batch.commit();
        console.log(`Batch saved ${items.length} items to ${collectionName}`);
    } catch (error) {
        console.error("Batch save error", error);
    }
  }
};