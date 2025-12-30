import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    onAuthStateChanged,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

interface RecordAuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const RecordAuthContext = createContext<RecordAuthContextType | undefined>(undefined);

export function RecordAuthProvider({ children }: { children: React.ReactNode }) {
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
        <RecordAuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </RecordAuthContext.Provider>
    );
}

export function useRecordAuth() {
    const context = useContext(RecordAuthContext);
    if (context === undefined) {
        throw new Error('useRecordAuth must be used within a RecordAuthProvider');
    }
    return context;
}
