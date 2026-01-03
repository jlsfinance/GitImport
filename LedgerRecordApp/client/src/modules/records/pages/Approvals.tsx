import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useCompany } from '../context/CompanyContext';
import { motion } from 'framer-motion';

interface RecordEntry {
    id: string;
    customerName: string;
    amount: number;
    date: string;
    status: string;
    type: 'record';
}

interface CustomerEntry {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    createdAt?: string;
    type: 'customer';
}

type ApprovalItem = RecordEntry | CustomerEntry;

const Approvals: React.FC = () => {
    const navigate = useNavigate();
    const { currentCompany } = useCompany();

    // TAB STATE
    const [activeTab, setActiveTab] = useState<'entries' | 'accounts'>('entries');

    // DATA STATE
    const [entries, setEntries] = useState<RecordEntry[]>([]);
    const [accounts, setAccounts] = useState<CustomerEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalType, setModalType] = useState<'accept' | 'reject' | null>(null);
    const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
    const [comment, setComment] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchData();
    }, [currentCompany, activeTab]);

    const fetchData = async () => {
        if (!currentCompany) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            if (activeTab === 'entries') {
                // Fetch Draft/Pending Records
                const q = query(
                    collection(db, "records"),
                    where("status", "in", ["Draft", "Pending"]),
                    where("companyId", "==", currentCompany.id)
                );
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    type: 'record',
                    ...doc.data()
                })) as RecordEntry[];
                setEntries(data);
            } else {
                // Fetch Pending Customers
                const q = query(
                    collection(db, "customers"),
                    where("authStatus", "==", "PENDING_APPROVAL"),
                    where("companyId", "==", currentCompany.id)
                );
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    type: 'customer',
                    name: doc.data().name || 'Unknown',
                    email: doc.data().email || 'No Email',
                    phone: doc.data().phone || 'No Phone',
                    status: doc.data().authStatus,
                    createdAt: doc.data().createdAt
                })) as CustomerEntry[];
                setAccounts(data);
            }
        } catch (error) {
            console.error("Failed to load approvals:", error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (type: 'accept' | 'reject', item: ApprovalItem) => {
        setModalType(type);
        setSelectedItem(item);
        setComment('');
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedItem(null);
        setComment('');
    };

    const handleConfirm = async () => {
        if (!selectedItem || !modalType) return;
        setProcessing(true);

        try {
            if (selectedItem.type === 'record') {
                // Handle Record Approval
                const newStatus = modalType === 'accept' ? 'Active' : 'Voided';
                const recordRef = doc(db, "records", selectedItem.id);
                const updateData: any = {
                    status: newStatus,
                    verificationNote: comment,
                };
                if (newStatus === 'Active') {
                    updateData.activationDate = new Date().toISOString();
                }
                await updateDoc(recordRef, updateData);
                setEntries(prev => prev.filter(i => i.id !== selectedItem.id));
            } else {
                // Handle Customer Account Approval
                const newStatus = modalType === 'accept' ? 'ACTIVE' : 'REJECTED';
                const custRef = doc(db, "customers", selectedItem.id);
                await updateDoc(custRef, {
                    authStatus: newStatus,
                    // If rejected, we might want to store reason?
                });
                setAccounts(prev => prev.filter(i => i.id !== selectedItem.id));
            }

            alert(`${selectedItem.type === 'record' ? 'Entry' : 'Account'} ${modalType === 'accept' ? 'Approved' : 'Rejected'} Successfully`);
            closeModal();

        } catch (error) {
            console.error(`Failed to update:`, error);
            alert("An error occurred. Please try again.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="pb-20"
        >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm px-4 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
                </div>

                {/* TABS */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
                    <button
                        onClick={() => setActiveTab('entries')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'entries' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Entries <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${entries.length > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-200 text-slate-500'}`}>{entries.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('accounts')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'accounts' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Accounts <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${accounts.length > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-500'}`}>{accounts.length}</span>
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-6">

                {/* ENTRIES TABLE */}
                {activeTab === 'entries' && (
                    <div className="bg-white dark:bg-[#1e2736] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 whitespace-nowrap">Applicant</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Amount</th>
                                        <th className="px-4 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {loading ? (
                                        <tr><td colSpan={3} className="p-8 text-center"><div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></td></tr>
                                    ) : entries.length > 0 ? (
                                        entries.map((app) => (
                                            <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-4 py-3">
                                                    <p className="font-bold">{app.customerName}</p>
                                                    <p className="text-xs text-slate-400">{new Date(app.date).toLocaleDateString()}</p>
                                                </td>
                                                <td className="px-4 py-3 font-medium">Rs. {app.amount.toLocaleString('en-IN')}</td>
                                                <td className="px-4 py-3 flex justify-center gap-2">
                                                    <button onClick={() => openModal('accept', app)} className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"><span className="material-symbols-outlined text-lg">check</span></button>
                                                    <button onClick={() => openModal('reject', app)} className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"><span className="material-symbols-outlined text-lg">close</span></button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={3} className="p-8 text-center text-slate-400">No pending entries.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ACCOUNTS TABLE */}
                {activeTab === 'accounts' && (
                    <div className="bg-white dark:bg-[#1e2736] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10">
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                Users listed here have verified their email and are waiting for your approval to access the portal.
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 whitespace-nowrap">User Details</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Contact</th>
                                        <th className="px-4 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {loading ? (
                                        <tr><td colSpan={3} className="p-8 text-center"><div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></td></tr>
                                    ) : accounts.length > 0 ? (
                                        accounts.map((acc) => (
                                            <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-4 py-3">
                                                    <p className="font-bold">{acc.name}</p>
                                                    <p className="text-xs text-slate-400">Created: {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString() : 'N/A'}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-xs font-medium">{acc.email}</p>
                                                    <p className="text-xs text-slate-400">{acc.phone}</p>
                                                </td>
                                                <td className="px-4 py-3 flex justify-center gap-2">
                                                    <button onClick={() => openModal('accept', acc)} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold shadow-md shadow-blue-200">Approve</button>
                                                    <button onClick={() => openModal('reject', acc)} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-bold">Reject</button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={3} className="p-8 text-center text-slate-400">No pending account requests.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalType && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1e2736] rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <h3 className="text-lg font-bold mb-1">
                            {modalType === 'accept' ? 'Approve Request?' : 'Reject Request?'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            {selectedItem.type === 'record'
                                ? `Record for Rs. ${(selectedItem as RecordEntry).amount}`
                                : `Account request for ${(selectedItem as CustomerEntry).name}`
                            }
                        </p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">
                                    {modalType === 'accept' ? 'Comments (Optional)' : 'Reason for Rejection'}
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none h-24"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button onClick={closeModal} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800">Cancel</button>
                            <button onClick={handleConfirm} disabled={processing} className={`px-4 py-2 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2 ${modalType === 'accept' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                {processing && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default Approvals;