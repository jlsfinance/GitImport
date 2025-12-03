import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { StorageService } from '@/services/storageService';
import { CompanyMembership, CompanyProfile, UserRole } from '@/types';

interface CompanyData {
  id?: string;
  name: string;
  address: string;
  gst: string;
  gst_enabled: boolean;
  phone?: string;
  email?: string;
  state?: string;
  gstin?: string;
  show_hsn_summary?: boolean;
  roundUpDefault?: 0 | 10 | 100;
}

interface CompanyContextType {
  company: CompanyData | null;
  loading: boolean;
  permissionError: boolean;
  memberships: CompanyMembership[];
  currentCompanyId: string | null;
  currentRole: UserRole | null;
  hasMultipleCompanies: boolean;
  pendingInvites: CompanyMembership[];
  saveCompany: (data: CompanyData) => Promise<void>;
  reloadCompany: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<boolean>;
  createNewCompany: (profile: CompanyProfile) => Promise<string | null>;
  inviteUser: (email: string, role: UserRole) => Promise<boolean>;
  acceptInvite: (inviteId: string) => Promise<boolean>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [memberships, setMemberships] = useState<CompanyMembership[]>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [pendingInvites, setPendingInvites] = useState<CompanyMembership[]>([]);

  const fetchCompany = useCallback(async () => {
    if (!user) {
      setCompany(null);
      setMemberships([]);
      setCurrentCompanyId(null);
      setCurrentRole(null);
      setPendingInvites([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setPermissionError(false);
      
      // Initialize storage service which loads memberships and company data
      await StorageService.init(user.uid);
      
      // Get memberships and current company from storage
      const userMemberships = StorageService.getMemberships();
      const activeCompanyId = StorageService.getCurrentCompanyId();
      const role = StorageService.getCurrentRole();
      
      setMemberships(userMemberships);
      setCurrentCompanyId(activeCompanyId);
      setCurrentRole(role);
      
      // Check for pending invites for this user
      if (user.email) {
        const invites = await StorageService.getPendingInvites(user.email);
        setPendingInvites(invites);
      }
      
      // Get company profile from storage
      const companyProfile = StorageService.getCompanyProfile();
      if (companyProfile && activeCompanyId) {
        setCompany({
          id: activeCompanyId,
          name: companyProfile.name,
          address: companyProfile.address,
          gst: companyProfile.gst || companyProfile.gstin || '',
          gst_enabled: companyProfile.gst_enabled ?? true,
          phone: companyProfile.phone,
          email: companyProfile.email,
          state: companyProfile.state,
          gstin: companyProfile.gstin,
          show_hsn_summary: companyProfile.show_hsn_summary,
          roundUpDefault: companyProfile.roundUpDefault
        });
      } else if (userMemberships.length === 0) {
        // No memberships - user needs to create a company
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
  }, [user]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const saveCompany = async (data: CompanyData) => {
    if (!user || !currentCompanyId) return;
    
    try {
      const companyPath = `companies/${currentCompanyId}/profile`;
      await setDoc(doc(db, companyPath, 'main'), {
        ...data,
        id: currentCompanyId,
        updated_at: serverTimestamp()
      }, { merge: true });
      
      // Also update via StorageService
      StorageService.saveCompanyProfile({
        ...data,
        id: currentCompanyId
      } as CompanyProfile);
      
      await fetchCompany();
    } catch (error: any) {
       if (error.code === 'permission-denied') {
        setPermissionError(true);
        throw new Error("Permission denied. Please check Firestore Rules.");
      }
      throw error;
    }
  };

  const switchCompany = async (companyId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      setLoading(true);
      const success = await StorageService.switchCompany(companyId);
      if (success) {
        await fetchCompany();
      }
      return success;
    } catch (error) {
      console.error("Error switching company:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createNewCompany = async (profile: CompanyProfile): Promise<string | null> => {
    if (!user) return null;
    
    try {
      setLoading(true);
      const companyId = await StorageService.createCompany(
        profile, 
        user.uid, 
        user.email || '',
        user.displayName || undefined
      );
      if (companyId) {
        // Switch to the new company
        await StorageService.switchCompany(companyId);
        await fetchCompany();
      }
      return companyId;
    } catch (error) {
      console.error("Error creating company:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async (email: string, role: UserRole): Promise<boolean> => {
    if (!user) return false;
    
    try {
      return await StorageService.inviteUserToCompany(email, role, user.email || '');
    } catch (error) {
      console.error("Error inviting user:", error);
      return false;
    }
  };

  const acceptInvite = async (inviteId: string): Promise<boolean> => {
    if (!user || !user.email) return false;
    
    try {
      setLoading(true);
      const success = await StorageService.acceptInvite(inviteId, user.uid, user.email);
      if (success) {
        await fetchCompany();
      }
      return success;
    } catch (error) {
      console.error("Error accepting invite:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const hasMultipleCompanies = memberships.length > 1;

  return (
    <CompanyContext.Provider value={{ 
      company, 
      loading, 
      permissionError, 
      memberships,
      currentCompanyId,
      currentRole,
      hasMultipleCompanies,
      pendingInvites,
      saveCompany, 
      reloadCompany: fetchCompany,
      switchCompany,
      createNewCompany,
      inviteUser,
      acceptInvite
    }}>
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
