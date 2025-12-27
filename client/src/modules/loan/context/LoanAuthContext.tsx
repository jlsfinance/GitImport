import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    onAuthStateChanged,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

interface LoanAuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const LoanAuthContext = createContext<LoanAuthContextType | undefined>(undefined);

export function LoanAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    return (
        <LoanAuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </LoanAuthContext.Provider>
    );
}

export function useLoanAuth() {
    const context = useContext(LoanAuthContext);
    if (context === undefined) {
        throw new Error('useLoanAuth must be used within a LoanAuthProvider');
    }
    return context;
}
