import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

interface CompanyData {
  name: string;
  address: string;
  gst: string;
  gst_enabled: boolean;
  phone?: string;
  email?: string;
  show_hsn_summary?: boolean;
  roundUpDefault?: 0 | 10 | 100;
  upiId?: string;
}

interface CompanyContextType {
  company: CompanyData | null;
  loading: boolean;
  permissionError: boolean;
  saveCompany: (data: CompanyData) => Promise<void>;
  reloadCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  const fetchCompany = async () => {
    if (!user) {
      setCompany(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setPermissionError(false);
      const snap = await getDoc(doc(db, 'companies', user.uid));
      if (snap.exists()) {
        setCompany(snap.data() as CompanyData);
      } else {
        setCompany(null);
      }
    } catch (error: any) {
      console.error("Error fetching company:", error);
      if (error.code === 'permission-denied') {
        setPermissionError(true);
      }
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, [user]);

  const saveCompany = async (data: CompanyData) => {
    if (!user) return;

    try {
      await setDoc(doc(db, 'companies', user.uid), {
        ...data,
        owner_uid: user.uid,
        owner_email: user.email,
        updated_at: serverTimestamp()
      }, { merge: true });

      await fetchCompany();
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        setPermissionError(true);
        throw new Error("Permission denied. Please check Firestore Rules.");
      }
      throw error;
    }
  };

  return (
    <CompanyContext.Provider value={{ company, loading, permissionError, saveCompany, reloadCompany: fetchCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
