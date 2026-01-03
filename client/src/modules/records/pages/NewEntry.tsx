import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { addMonths, format } from 'date-fns';
import { useCompany } from '../context/CompanyContext';
import { APP_NAME } from '../constants';
import { motion } from 'framer-motion';

interface PendingEntry {
    id: string;
    customerName: string;
    customerId: string;
    amount: number;
    acceptanceDate?: string;
    tenure: number;
    installmentAmount: number; // Formerly emi
    serviceCharge: number; // Formerly processingFee
}

const NewEntry: React.FC = () => {
    const navigate = useNavigate();
    const { currentCompany } = useCompany();
    const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const companyName = useMemo(() => currentCompany?.name || APP_NAME, [currentCompany]);

    // Modal State
    const [selectedEntry, setSelectedEntry] = useState<PendingEntry | null>(null);
    const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [installmentDueDay, setInstallmentDueDay] = useState<number>(1); // Default to 1st of month
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const fetchPendingEntries = async () => {
            if (!currentCompany) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const q = query(
                    collection(db, "records"),
                    where("status", "==", "Draft"),
                    where("companyId", "==", currentCompany.id)
                );
                const querySnapshot = await getDocs(q);
                const entries = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        serviceCharge: data.processingFee
                    };
                }) as PendingEntry[];
                setPendingEntries(entries);
            } catch (error) {
                console.error("Failed to load records:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPendingEntries();
    }, [currentCompany]);

    // WhatsApp Preview State
    const [whatsappPreview, setWhatsappPreview] = useState<{ open: boolean; phone: string; message: string; name: string }>({
        open: false, phone: '', message: '', name: ''
    });

    const handleAddEntry = async () => {
        if (!selectedEntry || !entryDate) {
            alert("Please select a valid date.");
            return;
        }
        setProcessing(true);

        try {
            const recordRef = doc(db, "records", selectedEntry.id);
            const dateObj = new Date(entryDate);

            // Generate Installment schedule with selected due day
            const repaymentSchedule = [];
            // Calculate first installment date (Next month from entry date)
            const [y, m] = entryDate.split('-').map(Number);
            // using m as month index creates date in next month (since m is 1-based from string)
            let firstInstallmentDate = new Date(y, m, installmentDueDay);

            // Handle month overflow (e.g. Feb 30 -> Mar 2) by clamping to end of target month
            if (firstInstallmentDate.getMonth() !== (m % 12)) {
                firstInstallmentDate = new Date(y, m + 1, 0);
            }

            for (let i = 0; i < selectedEntry.tenure; i++) {
                const installmentDate = addMonths(firstInstallmentDate, i);
                repaymentSchedule.push({
                    installmentNumber: i + 1,
                    dueDate: format(installmentDate, 'yyyy-MM-dd'),
                    amount: selectedEntry.installmentAmount,
                    status: 'Pending'
                });
            }

            const actualGiven = selectedEntry.amount - (selectedEntry.serviceCharge || 0);

            await updateDoc(recordRef, {
                status: 'Active', // Formerly Disbursed
                entryDate: entryDate, // Formerly disbursalDate
                repaymentSchedule: repaymentSchedule,
                actualGiven: actualGiven,
                installmentDueDay: installmentDueDay,
            });

            // Success Handling
            setPendingEntries(prev => prev.filter(app => app.id !== selectedEntry.id));

            // Notification logic - Prepare preview instead of auto-open
            try {
                const customerRef = doc(db, "customers", selectedEntry.customerId);
                const customerSnap = await getDoc(customerRef);
                if (customerSnap.exists()) {
                    const customerData = customerSnap.data();
                    if (customerData.phone) {
                        // Clean phone number
                        const cleanPhone = customerData.phone.replace(/\D/g, '').slice(-10);
                        const formattedPhone = `91${cleanPhone}`;
                        const amountFormatted = `Rs. ${selectedEntry.amount.toLocaleString('en-IN')}`;
                        const dateFormatted = format(dateObj, 'dd MMMM, yyyy');

                        const message = `Namaste ${selectedEntry.customerName},\n\nAapka ${companyName} se ${amountFormatted} ka record aaj dinank ${dateFormatted} ko shuru ho gaya hai.\n\nDhanyavaad.`;

                        // Show preview modal instead of auto-opening
                        setWhatsappPreview({
                            open: true,
                            phone: formattedPhone,
                            message: message,
                            name: selectedEntry.customerName
                        });
                    }
                }
            } catch (e) {
                console.error("WhatsApp redirect failed", e);
            }

            alert("Entry Added Successfully!");
            setSelectedEntry(null);

        } catch (error) {
            console.error(`Failed to add entry:`, error);
            alert("Action failed. Please try again.");
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirmWhatsApp = () => {
        const whatsappUrl = `https://wa.me/${whatsappPreview.phone}?text=${encodeURIComponent(whatsappPreview.message)}`;
        window.open(whatsappUrl, '_blank');
        setWhatsappPreview({ open: false, phone: '', message: '', name: '' });
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen bg-background-light dark:bg-background-dark pb-24 text-slate-900 dark:text-white"
        >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm px-4 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-2xl font-bold tracking-tight">Pending Entries</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Ready to Activate</h2>
                    <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">{pendingEntries.length} Records</span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : pendingEntries.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {pendingEntries.map((entry, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={entry.id}
                                className="bg-white dark:bg-[#1e2736] rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-4 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <span className="material-symbols-outlined text-6xl">inventory_2</span>
                                </div>

                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg">
                                            {entry.customerName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 dark:text-white text-lg">{entry.customerName}</h3>
                                            <p className="text-xs font-bold text-slate-400">ID: #{entry.id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Amount</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white">₹{entry.amount.toLocaleString('en-IN')}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-2 border-t border-slate-50 dark:border-slate-800 pt-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Installment</p>
                                        <p className="text-sm font-bold">₹{entry.installmentAmount.toLocaleString('en-IN')}/mo</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tenure</p>
                                        <p className="text-sm font-bold">{entry.tenure} Months</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelectedEntry(entry)}
                                    className="w-full py-4 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                                    Activate Record
                                </button>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                        <div className="h-20 w-20 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-4xl">folder_open</span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">No Pending Records</h3>
                        <p className="text-sm max-w-[200px]">All entries have been cleared or none have been drafted yet.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {selectedEntry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1e2736] rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <h3 className="text-lg font-bold mb-1">Confirm New Entry</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            For {selectedEntry.customerName} (ID #{selectedEntry.id})
                        </p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={entryDate}
                                    onChange={(e) => setEntryDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Installment Due Day</label>
                                <select
                                    value={installmentDueDay}
                                    onChange={(e) => setInstallmentDueDay(Number(e.target.value))}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                >
                                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                        <option key={day} value={day}>
                                            {day === 1 ? '1st' : day === 2 ? '2nd' : day === 3 ? '3rd' : `${day}th`} of every month
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-2">
                                    * First Installment: {installmentDueDay === 1 ? '1st' : installmentDueDay === 2 ? '2nd' : installmentDueDay === 3 ? '3rd' : `${installmentDueDay}th`} of next month
                                </p>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex justify-between items-center">
                                <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Net Amount</span>
                                <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                                    Rs. {(selectedEntry.amount - (selectedEntry.serviceCharge || 0)).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setSelectedEntry(null)}
                                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddEntry}
                                disabled={processing}
                                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                            >
                                {processing && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>}
                                Start Record
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WhatsApp Message Preview Modal */}
            {whatsappPreview.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1e2736] rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                <span className="material-symbols-outlined">chat</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Send Notification?</h3>
                                <p className="text-xs text-slate-500">To: {whatsappPreview.name}</p>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 mb-2">Message (You can edit)</label>
                            <textarea
                                value={whatsappPreview.message}
                                onChange={(e) => setWhatsappPreview(prev => ({ ...prev, message: e.target.value }))}
                                rows={5}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm resize-none"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mb-4">
                            ⚠️ This will open WhatsApp. Message will NOT be auto-sent - you must tap send in WhatsApp.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setWhatsappPreview({ open: false, phone: '', message: '', name: '' })}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm"
                            >
                                Skip
                            </button>
                            <button
                                onClick={handleConfirmWhatsApp}
                                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold flex items-center justify-center gap-2 text-sm"
                            >
                                <span className="material-symbols-outlined text-lg">send</span> Open WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default NewEntry;