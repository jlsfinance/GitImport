import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

export interface CompanyData {
  id: string;
  name: string;
  address: string;
  gst: string;
  gst_enabled: boolean;
  phone?: string;
  email?: string;
  state?: string;
  show_hsn_summary?: boolean;
  roundUpDefault?: 0 | 10 | 100;
  createdAt?: any;
}

interface UserPreferences {
  selectedCompanyId: string | null;
}

interface CompanyContextType {
  companies: CompanyData[];
  selectedCompany: CompanyData | null;
  loading: boolean;
  permissionError: boolean;
  selectCompany: (companyId: string) => Promise<void>;
  saveCompany: (data: Omit<CompanyData, 'id'>, companyId?: string) => Promise<string>;
  deleteCompany: (companyId: string) => Promise<void>;
  reloadCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  const fetchCompanies = async () => {
    if (!user) {
      setCompanies([]);
      setSelectedCompany(null);
      setLoading(false);
      return;
    }

    try {
      setPermissionError(false);
      
      // Fetch all companies for this user
      const companiesRef = collection(db, 'users', user.uid, 'companies');
      const companiesQuery = query(companiesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(companiesQuery);
      
      const companiesList: CompanyData[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CompanyData));
      
      setCompanies(companiesList);
      
      // Get user preferences for selected company
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const prefs = userDoc.data() as UserPreferences | undefined;
      
      if (prefs?.selectedCompanyId && companiesList.length > 0) {
        const selected = companiesList.find(c => c.id === prefs.selectedCompanyId);
        setSelectedCompany(selected || companiesList[0] || null);
      } else if (companiesList.length > 0) {
        setSelectedCompany(companiesList[0]);
        // Save selection
        await setDoc(userDocRef, { selectedCompanyId: companiesList[0].id }, { merge: true });
      } else {
        setSelectedCompany(null);
      }
      
      // Migration: Check if old company data exists and migrate it
      const oldCompanyRef = doc(db, 'companies', user.uid);
      const oldCompanySnap = await getDoc(oldCompanyRef);
      if (oldCompanySnap.exists() && companiesList.length === 0) {
        const oldData = oldCompanySnap.data();
        // Migrate old company to new structure
        const newCompanyRef = doc(collection(db, 'users', user.uid, 'companies'));
        await setDoc(newCompanyRef, {
          ...oldData,
          createdAt: serverTimestamp()
        });
        // Refresh companies
        await fetchCompanies();
        return;
      }
      
    } catch (error: any) {
      console.error("Error fetching companies:", error);
      if (error.code === 'permission-denied') {
        setPermissionError(true);
      }
      setCompanies([]);
      setSelectedCompany(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [user]);

  const selectCompany = async (companyId: string) => {
    if (!user) return;
    
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setSelectedCompany(company);
      // Save preference
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { selectedCompanyId: companyId }, { merge: true });
    }
  };

  const saveCompany = async (data: Omit<CompanyData, 'id'>, companyId?: string): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    
    try {
      let docRef;
      if (companyId) {
        // Update existing company
        docRef = doc(db, 'users', user.uid, 'companies', companyId);
        await setDoc(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        // Create new company
        docRef = doc(collection(db, 'users', user.uid, 'companies'));
        await setDoc(docRef, {
          ...data,
          owner_uid: user.uid,
          owner_email: user.email,
          createdAt: serverTimestamp()
        });
      }
      
      await fetchCompanies();
      
      // If no company is selected, select this one
      if (!selectedCompany) {
        await selectCompany(docRef.id);
      }
      
      return docRef.id;
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        setPermissionError(true);
        throw new Error("Permission denied. Please check Firestore Rules.");
      }
      throw error;
    }
  };

  const deleteCompany = async (companyId: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'companies', companyId));
      
      // If deleted company was selected, select another one
      if (selectedCompany?.id === companyId) {
        const remaining = companies.filter(c => c.id !== companyId);
        if (remaining.length > 0) {
          await selectCompany(remaining[0].id);
        } else {
          setSelectedCompany(null);
        }
      }
      
      await fetchCompanies();
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        setPermissionError(true);
        throw new Error("Permission denied. Please check Firestore Rules.");
      }
      throw error;
    }
  };

  // For backward compatibility - expose selectedCompany as 'company'
  const contextValue: CompanyContextType = {
    companies,
    selectedCompany,
    loading,
    permissionError,
    selectCompany,
    saveCompany,
    deleteCompany,
    reloadCompanies: fetchCompanies
  };

  return (
    <CompanyContext.Provider value={contextValue}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  // Return with backward compatible 'company' alias
  return {
    ...context,
    company: context.selectedCompany
  };
}
