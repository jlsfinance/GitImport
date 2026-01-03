import { recordsAuth as auth, recordsDb as db } from '../../../lib/firebase';
import {
    signInWithEmailAndPassword,
    signOut,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    updatePassword,
    User
} from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

export const CustomerAuthService = {

    /**
     * Allows a customer to claim their business record using their phone number.
     * 1. Verifies phone exists in DB (Merchant must have added it).
     * 2. Updates/Sets Email and sets status to EMAIL_PENDING.
     * 3. Sends Verification Link.
     */
    claimAccount: async (name: string, email: string, phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '').slice(-10);

        // Search for existing record by Phone
        const q = query(collection(db, 'customers'), where('phone', '==', cleanPhone));
        const snap = await getDocs(q);

        if (snap.empty) {
            throw new Error("Your business account was not found. Please contact your company.");
        }

        let accountUpdated = false;

        const promises = snap.docs.map(async (docSnap) => {
            const data = docSnap.data();

            // If already active, don't overwrite blindly.
            if (data.authStatus === 'ACTIVE') {
                return;
            }

            await updateDoc(docSnap.ref, {
                email: email,
                name: name,
                authStatus: 'EMAIL_PENDING',
                emailVerified: false
            });
            accountUpdated = true;
        });

        await Promise.all(promises);

        if (!accountUpdated && !snap.empty) {
            // Means all found accounts were already ACTIVE
            throw new Error("Account already active. Please log in.");
        }

        // 3. Send Link
        await CustomerAuthService.sendActivationLink(email);
    },

    /**
     * Sends a magic link to the user's email for activation/password reset.
     */
    sendActivationLink: async (email: string) => {
        const actionCodeSettings = {
            // URL to redirect to after clicking the link.
            url: window.location.origin + '/records/customer-login?mode=activate',
            handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        // Save the email locally so we don't need to ask for it again if they open on same device
        window.localStorage.setItem('emailForSignIn', email);
    },

    /**
     * Checks if the current URL is a valid sign-in link.
     */
    isActivationLink: (url: string) => {
        return isSignInWithEmailLink(auth, url);
    },

    /**
     * Completes the sign-in process using the link.
     */
    completeActivation: async (email: string, url: string): Promise<User> => {
        const result = await signInWithEmailLink(auth, email, url);
        return result.user;
    },

    /**
     * Sets a new password for the currently logged-in user.
     */
    setPassword: async (user: User, newPass: string) => {
        await updatePassword(user, newPass);
    },

    /**
     * Standard login with Email and Password.
     */
    login: async (email: string, pass: string) => {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        return cred.user;
    },

    logout: async () => {
        await signOut(auth);
    },

    deleteSelf: async (customerId: string) => {
        const user = auth.currentUser;
        if (!user) throw new Error("No user logged in.");

        const custRef = doc(db, 'customers', customerId);
        await updateDoc(custRef, {
            name: "Deleted User",
            email: null,
            phone: null,
            uid: null,
            authStatus: 'DELETED',
            deletedAt: new Date().toISOString()
        });

        await user.delete();
    }
};
