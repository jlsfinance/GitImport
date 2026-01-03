import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  deleteUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FirebaseService } from '@/services/firebaseService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Setting up auth state listener...");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed. User:", user ? `${user.email}` : "null");
      setUser(user);
      setLoading(false);
    });

    // Initialize Native Google Auth
    const initNativeGoogle = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
          await GoogleAuth.initialize();
          console.log("Native Google Auth Initialized");
        }
      } catch (e) {
        console.warn("Failed to initialize Native Google Auth:", e);
      }
    };
    initNativeGoogle();

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      const isNative = Capacitor.isNativePlatform();
      console.log("Platform:", isNative ? "Native" : "Web");

      if (isNative) {
        try {
          const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');

          // Always try to initialize first
          console.log("Initializing GoogleAuth...");
          try {
            await GoogleAuth.initialize({
              clientId: '231225025529-9njphhsjd5s5ib5vgmdmrvquvafpje9u.apps.googleusercontent.com',
              scopes: ['profile', 'email'],
              grantOfflineAccess: true,
            });
            console.log("GoogleAuth initialized successfully");
          } catch (initError: any) {
            console.log("GoogleAuth init status:", initError?.message || "Already initialized");
          }

          console.log("Calling GoogleAuth.signIn()...");
          const googleUser = await GoogleAuth.signIn();
          console.log("Google User Response:", JSON.stringify(googleUser, null, 2));

          // Try multiple ways to get the token
          const idToken =
            googleUser?.authentication?.idToken ||
            (googleUser as any)?.idToken ||
            googleUser?.authentication?.accessToken;

          if (!idToken) {
            console.error("No token found in response:", googleUser);
            throw new Error("Google Sign-In failed: No ID Token. Please check Firebase configuration.");
          }

          console.log("Got ID Token, signing into Firebase...");
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
          console.log("Firebase sign-in successful!");

        } catch (nativeError: any) {
          console.error("Native Google Sign-In failed:", nativeError);
          // If native fails, show a clear error
          throw new Error(nativeError?.message || "Google Sign-In failed on this device. Please try again or use email login.");
        }
      } else {
        // Web platform - use popup
        console.log("Using web popup for Google Sign-In...");
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        console.log("Web Google Sign-In successful!");
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const deleteAccount = async () => {
    if (auth.currentUser) {
      await FirebaseService.purgeUserPath(auth.currentUser.uid);
      await deleteUser(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInWithGoogle, signUp, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
