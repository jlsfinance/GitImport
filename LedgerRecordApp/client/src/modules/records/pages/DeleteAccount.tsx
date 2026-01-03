import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteUser } from 'firebase/auth';
import { doc, deleteDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { recordsDb as db } from '../../../lib/firebase';
import { SUPPORT_EMAIL } from '../constants';
import { useRecordAuth } from '../context/RecordAuthContext';
import { useCompany } from '../context/CompanyContext';

const DeleteAccount: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useRecordAuth();
    const { currentCompany } = useCompany();
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        if (confirmText !== 'DELETE') {
            setError('Please type DELETE to confirm');
            return;
        }

        if (!user) {
            setError('You must be logged in to delete your account');
            return;
        }

        setIsDeleting(true);
        setError('');

        try {
            // Step 1: Delete user's company data if they have one
            if (currentCompany) {
                const batch = writeBatch(db);

                // Delete records
                const recordsSnap = await getDocs(query(collection(db, 'records'), where('companyId', '==', currentCompany.id)));
                recordsSnap.docs.forEach(doc => batch.delete(doc.ref));

                // Delete customers
                const customersSnap = await getDocs(query(collection(db, 'customers'), where('companyId', '==', currentCompany.id)));
                customersSnap.docs.forEach(doc => batch.delete(doc.ref));

                // Delete receipts
                const receiptsSnap = await getDocs(query(collection(db, 'receipts'), where('companyId', '==', currentCompany.id)));
                receiptsSnap.docs.forEach(doc => batch.delete(doc.ref));

                // Commit batch delete
                await batch.commit();

                // Delete company
                await deleteDoc(doc(db, 'companies', currentCompany.id));
            }

            // Step 2: Delete Firebase Auth user
            await deleteUser(user);

            // Step 3: Redirect to login
            navigate('/records/login');

        } catch (err: any) {
            console.error('Delete account error:', err);
            if (err.code === 'auth/requires-recent-login') {
                setError('For security, please log out and log back in, then try again.');
            } else {
                setError(err.message || 'Failed to delete account. Please contact support.');
            }
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-24 overflow-y-auto font-sans">

            {/* HEADER */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-4 py-4 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-black uppercase tracking-widest">
                    Delete Account
                </h1>
            </div>

            <div className="p-6 max-w-xl mx-auto w-full space-y-8">

                {/* INTRO */}
                <div className="text-center">
                    <span className="material-symbols-outlined text-red-500 text-5xl mb-4">delete_forever</span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Delete Your Account</h2>
                    <p className="text-sm text-gray-500 font-bold">
                        Learn how to permanently delete your account and associated data. Available for all platforms.
                    </p>
                </div>

                {/* WARNING */}
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-3xl p-6">
                    <h3 className="font-black text-red-700 dark:text-red-300 text-sm uppercase tracking-widest mb-3">⚠️ Warning: This action is permanent</h3>
                    <ul className="text-red-700 dark:text-red-300 font-bold text-xs space-y-2">
                        <li>• All your records will be permanently deleted</li>
                        <li>• All customer data will be removed</li>
                        <li>• All receipts and payment history will be erased</li>
                        <li>• Your company profile will be deleted</li>
                        <li>• This action CANNOT be undone</li>
                    </ul>
                </div>

                {/* STEPS */}
                <div className="space-y-4">
                    <h3 className="font-black text-lg">How to Delete Your Account</h3>

                    <div className="space-y-3">
                        <div className="flex gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-sm">1</div>
                            <div>
                                <p className="font-black text-sm">In-App Deletion</p>
                                <p className="text-xs text-gray-500">Go to Settings → Account → Delete Account</p>
                            </div>
                        </div>
                        <div className="flex gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-sm">2</div>
                            <div>
                                <p className="font-black text-sm">Email Request</p>
                                <p className="text-xs text-gray-500">Email {SUPPORT_EMAIL} with subject "Delete My Account"</p>
                            </div>
                        </div>
                        <div className="flex gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-sm">3</div>
                            <div>
                                <p className="font-black text-sm">Verification</p>
                                <p className="text-xs text-gray-500">We'll verify your identity and process within 48 hours</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DATA RETENTION */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
                    <h3 className="font-black text-amber-800 dark:text-amber-300 text-sm mb-2">📋 Data Retention After Deletion</h3>
                    <ul className="text-amber-800 dark:text-amber-300 text-xs font-bold space-y-1">
                        <li>• Personal profile data: Deleted immediately</li>
                        <li>• Financial records: Anonymized after 7 days (legal compliance)</li>
                        <li>• Backup data: Purged within 30 days</li>
                    </ul>
                </div>

                {/* DELETE FORM - Only show if logged in */}
                {user && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-red-200 dark:border-red-800 p-6 space-y-4">
                        <h3 className="font-black text-lg text-red-600">Delete Account Now</h3>
                        <p className="text-xs text-gray-500 font-bold">
                            Type <span className="text-red-600 font-black">DELETE</span> to confirm permanent account deletion.
                        </p>

                        <input
                            type="text"
                            placeholder="Type DELETE to confirm"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                            className="w-full p-3 rounded-xl border-2 border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 text-center font-black uppercase tracking-widest"
                        />

                        {error && (
                            <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3 text-red-700 dark:text-red-300 text-xs font-bold text-center">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleDelete}
                            disabled={isDeleting || confirmText !== 'DELETE'}
                            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {isDeleting ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">delete_forever</span>
                                    Permanently Delete My Account
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* NOT LOGGED IN */}
                {!user && (
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 text-center">
                        <p className="text-sm text-gray-500 font-bold">
                            Please log in to delete your account from within the app.
                        </p>
                    </div>
                )}

                {/* CONTACT */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-2 text-center">
                    <p className="text-xs text-gray-500 font-bold">Need help? Contact us at</p>
                    <p className="font-black text-indigo-600">{SUPPORT_EMAIL}</p>
                </div>

            </div>
        </div>
    );
};

export default DeleteAccount;
