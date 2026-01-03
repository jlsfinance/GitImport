import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { recordsDb as db } from '../../../lib/firebase';
import { useCompany } from '../context/CompanyContext';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PartnerTransaction, Expense, MonthlyLedger, LedgerEntry } from '../types';

// Interfaces (These are now imported from '../types', so they are removed from here)

const formatCurrency = (value: number | null) => {
    if (value === null || isNaN(value)) return '---';
    return `Rs. ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)}`;
}

const FinanceOverview: React.FC = () => {
    const { currentCompany } = useCompany();
    const [monthlyLedgers, setMonthlyLedgers] = useState<MonthlyLedger[]>([]);
    const [allEntries, setAllEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [showDownloadModal, setShowDownloadModal] = useState(false);

    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        narration: ''
    });
    const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

    const generateLedger = useCallback(async () => {
        if (!currentCompany) return;

        setLoading(true);
        try {
            const companyId = currentCompany.id;

            // Fetch all required collections
            /**
             * LEGACY DATA MIGRATION:
             * Query both 'records' (current) and legacy collection for backward compatibility.
             * All new data goes to 'records' collection only.
             */
            const [partnerTxSnap, recordsSnap, legacyRecordsSnap, expensesSnap, ledgerSnap, partnersSnap] = await Promise.all([
                getDocs(query(collection(db, "partner_transactions"), where("companyId", "==", companyId))),
                getDocs(query(collection(db, "records"), where("companyId", "==", companyId))),
                // LEGACY: Old collection for migration (read-only)
                getDocs(query(collection(db, "loans"), where("companyId", "==", companyId))),
                getDocs(query(collection(db, "expenses"), where("companyId", "==", companyId))),
                getDocs(query(collection(db, "ledger"), where("companyId", "==", companyId))),
                getDocs(query(collection(db, "partners")))
            ]);

            // Resolve Partners Map
            const partnersMap: { [key: string]: string } = {};
            partnersSnap.docs.forEach(doc => { partnersMap[doc.id] = doc.data().name; });

            // Process Transactions with Names
            const partnerTxs = partnerTxSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    partnerName: partnersMap[data.partnerId] || data.partnerName || 'Unknown Partner'
                } as PartnerTransaction;
            });

            // Merge All Records
            const rawRecords = [
                ...recordsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                ...legacyRecordsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            ];

            const uniqueRecordsMap = new Map();
            rawRecords.forEach((r: any) => uniqueRecordsMap.set(r.id, r));
            const recordsData = Array.from(uniqueRecordsMap.values()) as any[];

            // Filter valid statuses for ledger impact - MATCH DASHBOARD LOGIC STRICTLY
            // Dashboard Statuses: ['approved', 'active', 'settled', 'overdue', 'disbursed', 'given', 'pending', 'completed']
            const validStatus = ['approved', 'active', 'settled', 'overdue', 'disbursed', 'given', 'pending', 'completed'];

            const validRecords = recordsData.filter(r => {
                const s = (r.status || '').toLowerCase();
                return validStatus.includes(s);
            });

            const expensesData = expensesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
            const manualLedger = ledgerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

            let flatLedgerEntries: LedgerEntry[] = [];

            // 1. Partner Transactions
            partnerTxs.forEach(tx => {
                flatLedgerEntries.push({
                    date: parseISO(tx.date),
                    particulars: `${tx.partnerName} (${tx.type})`,
                    type: tx.type === 'investment' ? 'credit' : 'debit',
                    category: 'partner',
                    amount: Number(tx.amount),
                });
            });

            // 2. Expenses
            expensesData.forEach(ex => {
                flatLedgerEntries.push({
                    date: parseISO(ex.date),
                    particulars: ex.narration,
                    type: 'debit',
                    category: 'expense',
                    amount: Number(ex.amount),
                });
            });

            // 3. Manual Ledger (System Adjustments)
            manualLedger.forEach(entry => {
                if (entry.entries && Array.isArray(entry.entries)) {
                    entry.entries.forEach((sub: any) => {
                        if (sub.account === 'Cash / Bank') {
                            flatLedgerEntries.push({
                                date: parseISO(entry.date),
                                particulars: entry.narration || sub.account,
                                type: sub.type === 'Credit' ? 'debit' : 'credit', // Credit in CashBook = Outflow (Debit in our logic)
                                category: 'record',
                                amount: Number(sub.amount),
                                customerId: entry.customerId
                            });
                        }
                    });
                }
            });

            // 4. Records (Disbursals, Fees, Repayments)
            validRecords.forEach(record => {
                let amountToShowAtCommencement = Number(record.amount);
                // LEGACY FIELD SUPPORT: Support both field names for backward compatibility
                const addOns = record.adjustmentHistory || record.addOnHistory || record.topUpHistory || [];
                let totalAddOnAmount = 0;

                addOns.forEach((t: any) => {
                    totalAddOnAmount += Number(t.amount || t.topUpAmount);
                });

                amountToShowAtCommencement = Math.max(0, amountToShowAtCommencement - totalAddOnAmount);

                // A. Initial Disbursal (Outflow)
                // Dashboard counts this regardless of date, so we must find a valid date to place it in the ledger.
                const rawDate = record.date || record.activationDate || record.createdAt || record.created;

                if (rawDate && amountToShowAtCommencement > 0) {
                    // Handle Firestore Timestamp or String
                    const dateStr = rawDate.toDate ? rawDate.toDate().toISOString() : rawDate;
                    const commencementDate = parseISO(dateStr);
                    flatLedgerEntries.push({
                        date: commencementDate,
                        particulars: `Record Given: ${record.customerName}`, // Neutral term
                        type: 'debit', // Outflow
                        category: 'record',
                        amount: amountToShowAtCommencement,
                        customerId: record.customerId
                    });
                }

                // B. Top-Ups / Adjustments
                addOns.forEach((t: any) => {
                    const tDateParts = (t.date.split ? t.date.split("T")[0] : new Date(t.date).toISOString().split("T")[0]);

                    // Check if this TopUp is already accounting for in Manual Ledger (to avoid double count)
                    const hasLedgerEntry = manualLedger.some(le =>
                        le.recordId === record.id &&
                        (le.date.startsWith ? le.date.startsWith(tDateParts) : new Date(le.date).toISOString().startsWith(tDateParts))
                    );

                    if (!hasLedgerEntry) {
                        flatLedgerEntries.push({
                            date: parseISO(t.date),
                            particulars: `Adjustment: ${record.customerName}`, // Neutral term
                            type: 'debit', // Outflow
                            category: 'record',
                            amount: Number(t.amount || t.topUpAmount || t.adjustmentAmount),
                            customerId: record.customerId
                        });

                        // Top-Up Fees
                        if (t.serviceFee || t.processingFee) {
                            flatLedgerEntries.push({
                                date: parseISO(t.date),
                                particulars: `Service Fee (${record.customerName})`,
                                type: 'credit', // Inflow
                                category: 'fee',
                                amount: Number(t.serviceFee || t.processingFee),
                                customerId: record.customerId
                            });
                        }
                    }
                });

                // C. Initial Service Fee (Inflow)
                // Use stored serviceCharge if available (preferred), else calc
                const feePercentage = record.serviceFeePercentage || record.processingFeePercentage || 0;
                let serviceFee = Number(record.serviceCharge || record.processingFee || 0);

                // If stored fee is 0 but percentage exists, calculate it (Legacy support)
                if (serviceFee === 0 && feePercentage > 0) {
                    serviceFee = (Number(amountToShowAtCommencement) * feePercentage) / 100;
                }

                if (serviceFee > 0 && rawDate) {
                    const dateStr = rawDate.toDate ? rawDate.toDate().toISOString() : rawDate;
                    flatLedgerEntries.push({
                        date: parseISO(dateStr),
                        particulars: `Service Fee (${record.customerName})`,
                        type: 'credit', // Inflow
                        category: 'fee',
                        amount: serviceFee,
                        customerId: record.customerId
                    });
                }

                // D. Repayments (Inflow)
                if (record.repaymentSchedule) {
                    record.repaymentSchedule.forEach((inst: any) => {
                        if (inst.status === 'Paid' && inst.paymentDate) {
                            flatLedgerEntries.push({
                                date: parseISO(inst.paymentDate),
                                particulars: `Inst Received: ${record.customerName}`,
                                type: 'credit', // Inflow
                                category: 'installment',
                                amount: Number(inst.amount),
                                customerId: record.customerId
                            });
                        }
                    });
                }

                // E. Settlements (Inflow) - Support both field names for backward compat
                const settlementDetails = record.settlementDetails || record.foreclosureDetails;
                if (settlementDetails && settlementDetails.amountReceived && settlementDetails.date) {
                    flatLedgerEntries.push({
                        date: parseISO(settlementDetails.date),
                        particulars: `Settlement Received: ${record.customerName}`,
                        type: 'credit', // Inflow
                        category: 'settlement',
                        amount: Number(settlementDetails.totalPaid),
                        customerId: record.customerId
                    });
                }
            });

            flatLedgerEntries.sort((a, b) => a.date.getTime() - b.date.getTime());
            setAllEntries(flatLedgerEntries);

            // Group by Month
            if (flatLedgerEntries.length === 0) {
                // If no entries, still show opening balance if exists?
                setLoading(false);
                return;
            }

            const firstDate = flatLedgerEntries[0].date;
            const lastDate = flatLedgerEntries[flatLedgerEntries.length - 1].date;
            const monthsInterval = eachMonthOfInterval({ start: startOfMonth(firstDate), end: endOfMonth(lastDate) });

            let ledgers: MonthlyLedger[] = [];

            // Retrieve Opening Balance (Manually Set in Dashboard)
            const savedOpening = localStorage.getItem(`openingBalance_${companyId}`);
            let runningBalance = savedOpening ? Number(savedOpening) : 0;

            for (const monthDate of monthsInterval) {
                const monthStart = startOfMonth(monthDate);
                const monthEnd = endOfMonth(monthDate);
                const openingBalanceForMonth = runningBalance;

                const entriesInMonth = flatLedgerEntries.filter(entry =>
                    isWithinInterval(entry.date, { start: monthStart, end: monthEnd })
                );

                let monthEndBalance = openingBalanceForMonth;
                entriesInMonth.forEach(entry => {
                    monthEndBalance += (entry.type === 'credit' ? entry.amount : -entry.amount);
                });

                if (entriesInMonth.length > 0 || openingBalanceForMonth !== 0) {
                    ledgers.push({
                        month: monthDate,
                        openingBalance: openingBalanceForMonth,
                        entries: entriesInMonth.reverse(),
                        closingBalance: monthEndBalance
                    });
                }
                runningBalance = monthEndBalance;
            }

            setMonthlyLedgers(ledgers.reverse());

        } catch (error) {
            console.error("Error generating ledger:", error);
        } finally {
            setLoading(false);
        }
    }, [currentCompany]);

    useEffect(() => {
        generateLedger();
    }, [generateLedger]);

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseForm.amount || !expenseForm.narration) return alert("Please fill all fields");
        if (!currentCompany) return alert("No company selected");

        setIsSubmittingExpense(true);
        try {
            await addDoc(collection(db, "expenses"), {
                date: expenseForm.date,
                amount: Number(expenseForm.amount),
                narration: expenseForm.narration,
                companyId: currentCompany.id,
                createdAt: new Date().toISOString()
            });
            alert("Expense recorded successfully.");
            setShowExpenseModal(false);
            setExpenseForm({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', narration: '' });
            generateLedger();
        } catch (err) {
            console.error(err);
            alert("Failed to save expense.");
        } finally {
            setIsSubmittingExpense(false);
        }
    };

    const openDownloadModal = () => {
        const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
        setStartDate(start);
        setEndDate(end);
        setShowDownloadModal(true);
    };

    const handleDownloadPdf = () => {
        if (!startDate || !endDate) {
            alert("Please select both From and To dates for the report.");
            return;
        }

        const start = parseISO(startDate);
        const end = parseISO(endDate);

        const reportEntries = allEntries.filter(e => e.date >= start && e.date <= end);
        const openingBalEntry = allEntries.filter(e => e.date < start).reduce((acc, curr) => acc + (curr.type === 'credit' ? curr.amount : -curr.amount), 0);

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(currentCompany?.name || "Company Ledger", doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        doc.setFontSize(14);
        doc.text("Cash Account Ledger", doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Period: ${format(start, 'dd-MMM-yyyy')} to ${format(end, 'dd-MMM-yyyy')}`, 14, 35);

        const tableData: any[] = [];
        let runningBal = openingBalEntry;

        tableData.push(['', 'Opening Balance b/f', '', '', formatCurrency(openingBalEntry)]);

        reportEntries.forEach(entry => {
            runningBal += (entry.type === 'credit' ? entry.amount : -entry.amount);
            tableData.push([
                format(entry.date, 'dd-MMM-yyyy'),
                entry.particulars,
                entry.type === 'debit' ? formatCurrency(entry.amount) : '',
                entry.type === 'credit' ? formatCurrency(entry.amount) : '',
                formatCurrency(runningBal)
            ]);
        });

        tableData.push(['', 'Closing Balance c/f', '', '', formatCurrency(runningBal)]);

        autoTable(doc, {
            startY: 40,
            head: [['Date', 'Particulars', 'Debit', 'Credit', 'Balance']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 8 },
            columnStyles: {
                2: { halign: 'right', textColor: [200, 0, 0] },
                3: { halign: 'right', textColor: [0, 150, 0] },
                4: { halign: 'right', fontStyle: 'bold' }
            },
        });

        doc.save(`Ledger_${startDate}_to_${endDate}.pdf`);
        setShowDownloadModal(false);
    };

    const getIconForCategory = (category: string, type: 'credit' | 'debit') => {
        if (category === 'record') return 'payments';
        if (category === 'installment') return 'account_balance_wallet';
        if (category === 'fee') return 'percent';
        if (category === 'partner') return 'handshake';
        if (category === 'expense') return 'receipt_long';
        return type === 'credit' ? 'arrow_downward' : 'arrow_upward';
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-24 max-w-md mx-auto bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-sans"
        >
            {/* Header */}
            <div className="sticky top-0 z-20 flex items-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-4 pb-3 justify-between border-b border-gray-200 dark:border-gray-700" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
                <div className="flex items-center gap-3">
                    <Link to="/records" className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h2 className="text-xl font-bold">Cash Account</h2>
                </div>
                <div className="flex gap-2">
                    <Link to="/records/partners" className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                        <span className="material-symbols-outlined">group</span>
                    </Link>
                    <button onClick={() => setShowExpenseModal(true)} className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white">
                        <span className="material-symbols-outlined">add</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            {monthlyLedgers.length > 0 && (
                <div className="px-4 py-4 grid grid-cols-2 gap-3">
                    <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg text-white">
                        <span className="text-xs font-bold opacity-80 uppercase tracking-widest">Balance</span>
                        <div className="text-2xl font-black mt-1">{formatCurrency(monthlyLedgers[0].closingBalance)}</div>
                    </div>
                    <div onClick={openDownloadModal} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer">
                        <span className="material-symbols-outlined text-indigo-600 mb-1">download</span>
                        <span className="text-xs font-bold text-indigo-600 uppercase">Report</span>
                    </div>
                </div>
            )}

            {/* Ledger List */}
            <div className="px-4 pb-4 space-y-6">
                {loading ? (
                    <div className="flex justify-center py-12"><div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div></div>
                ) : monthlyLedgers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <span className="material-symbols-outlined text-6xl mb-4">account_balance_wallet</span>
                        <p>No transactions found.</p>
                    </div>
                ) : (
                    monthlyLedgers.map((ledger, idx) => (
                        <div key={idx} className="space-y-2">
                            <div className="flex items-center justify-between px-2 py-1 sticky top-16 z-10 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm">
                                <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest">{format(ledger.month, 'MMMM yyyy')}</h3>
                                <span className="text-[10px] font-black text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
                                    OPENING: {formatCurrency(ledger.openingBalance)}
                                </span>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                {ledger.entries.map((entry: LedgerEntry, eIdx: number) => {
                                    const isCredit = entry.type === 'credit';
                                    return (
                                        <div key={eIdx} className={`flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${eIdx !== ledger.entries.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
                                            <div className="flex items-center gap-4 overflow-hidden">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                    <span className="material-symbols-outlined text-xl">{getIconForCategory(entry.category, entry.type)}</span>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold truncate">{entry.particulars}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">{format(entry.date, 'dd MMM, hh:mm a')}</span>
                                                </div>
                                            </div>
                                            <div className={`text-right font-black text-sm whitespace-nowrap ml-2 ${isCredit ? 'text-emerald-600' : 'text-gray-900 dark:text-white'}`}>
                                                {isCredit ? '+' : '-'} {entry.amount.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Expense Modal */}
            {showExpenseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-xl font-black mb-6">Record Expense</h3>
                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <input type="date" required value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} className="w-full p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl outline-none" />
                            <input type="number" required placeholder="Amount" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl outline-none" />
                            <textarea required placeholder="Narration" value={expenseForm.narration} onChange={e => setExpenseForm({ ...expenseForm, narration: e.target.value })} className="w-full p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl outline-none h-24" />
                            <div className="flex gap-2 justify-end pt-2">
                                <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 font-bold text-gray-400">Cancel</button>
                                <button type="submit" disabled={isSubmittingExpense} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Download Modal */}
            {showDownloadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-gray-900">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-xl font-black mb-6">Download Report</h3>
                        <div className="space-y-4">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-4 bg-gray-100 rounded-2xl outline-none" />
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-4 bg-gray-100 rounded-2xl outline-none" />
                            <div className="flex gap-2 justify-end pt-2">
                                <button onClick={() => setShowDownloadModal(false)} className="px-4 py-2 font-bold text-gray-400">Cancel</button>
                                <button onClick={handleDownloadPdf} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg">Download</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </motion.div>
    );
};

export default FinanceOverview;