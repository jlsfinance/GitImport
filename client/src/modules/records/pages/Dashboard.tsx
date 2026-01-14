import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { recordsDb as db } from '../../../lib/firebase';
import { useCompany } from '../context/CompanyContext';
import { NotificationService } from '../services/NotificationService';
import { motion, AnimatePresence } from 'framer-motion';
import LazyImage from '../components/LazyImage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { FESTIVALS, Festival } from '../data/festivals';
import { generateHindiGreeting, getWhatsAppLink } from '../utils/greetingGenerator';
import { APP_NAME } from '../constants';
import { showErrorAlert } from '../../../utils/errorCodes';

const formatCurrency = (amount: number) => {
    return `Rs. ${new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0
    }).format(amount)}`;
};

const Dashboard: React.FC = () => {
    const { currentCompany } = useCompany();
    const [activeCard, setActiveCard] = useState<string | null>(null);

    const [records, setRecords] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [partnerTransactions, setPartnerTransactions] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('all');
    const [sending, setSending] = useState(false);
    const [todaysFestival, setTodaysFestival] = useState<Festival | null>(null);


    const handleSendNotification = async () => {
        if (!notifTitle || !notifBody) return alert("Please enter title and message");
        if (!currentCompany?.id) return alert("Company not loaded");

        setSending(true);
        try {
            const { addDoc, serverTimestamp, collection } = await import('firebase/firestore');
            const targetCustomer = customers.find(c => c.id === selectedCustomerId);

            await addDoc(collection(db, 'notifications'), {
                title: notifTitle,
                message: notifBody,
                recipientId: selectedCustomerId,
                createdAt: serverTimestamp(),
                companyId: currentCompany?.id,
                status: 'unread',
                type: 'admin_push',
                recipientName: selectedCustomerId === 'all' ? 'All Customers' : (targetCustomer?.name || 'User')
            });

            try {
                const apiUrl = selectedCustomerId === 'all'
                    ? '/api/push/broadcast'
                    : '/api/push/send';

                const payload = selectedCustomerId === 'all'
                    ? { companyId: currentCompany.id, title: notifTitle, message: notifBody }
                    : { customerId: selectedCustomerId, title: notifTitle, message: notifBody };

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                if (result.success) {
                    console.log('Push notification sent successfully:', result);
                }
            } catch (pushError) {
                console.warn('Push notification API error:', pushError);
            }

            alert("Notification Sent Successfully! 🚀");
            setShowReminderModal(false);
            setNotifTitle('');
            setNotifBody('');
        } catch (e: any) {
            showErrorAlert('NOTIFICATION_FAILED', e);
        } finally {
            setSending(false);
        }
    };


    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!currentCompany) return;

            try {
                const companyId = currentCompany.id;

                console.log(`Fetching data for Company: ${companyId}`);

                /**
                 * LEGACY DATA MIGRATION NOTE:
                 * The 'loans' collection is queried ONLY for backward compatibility.
                 * All NEW records go to 'records' collection only.
                 * The 'loans' collection will be deprecated once all users migrate.
                 * This does NOT indicate lending functionality - it's just legacy naming.
                 */
                const [recordsSnap, legacyRecordsSnap, customersSnap, partnerTxSnap, expensesSnap, ledgerSnap] = await Promise.all([
                    getDocs(query(collection(db, 'records'), where('companyId', '==', companyId))),
                    // LEGACY: Query old 'loans' collection for migration (read-only)
                    getDocs(query(collection(db, 'loans'), where('companyId', '==', companyId))),
                    getDocs(query(collection(db, 'customers'), where('companyId', '==', companyId))),
                    getDocs(query(collection(db, "partner_transactions"), where("companyId", "==", companyId))),
                    getDocs(query(collection(db, "expenses"), where("companyId", "==", companyId))),
                    getDocs(query(collection(db, "ledger"), where("companyId", "==", companyId)))
                ]);

                const combinedRecords = [
                    ...recordsSnap.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            paymentSchedule: data.paymentSchedule || data.repaymentSchedule || data.amortizationSchedule || [],
                            repaymentSchedule: data.paymentSchedule || data.repaymentSchedule || data.amortizationSchedule || [],
                            installmentAmount: data.installmentAmount || data.installment || data.emi || 0
                        };
                    }),
                    ...legacyRecordsSnap.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            paymentSchedule: data.paymentSchedule || data.repaymentSchedule || data.amortizationSchedule || [],
                            repaymentSchedule: data.paymentSchedule || data.repaymentSchedule || data.amortizationSchedule || [],
                            installmentAmount: data.installmentAmount || data.installment || data.emi || 0
                        };
                    })
                ];

                // De-duplicate records
                const uniqueRecordsMap = new Map();
                combinedRecords.forEach((r: any) => uniqueRecordsMap.set(r.id, r));
                const recordsData = Array.from(uniqueRecordsMap.values());

                const customersData = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), avatar: doc.data().photo_url || doc.data().avatar }));
                const partnerData = partnerTxSnap.docs.map(doc => doc.data());
                const expensesData = expensesSnap.docs.map(doc => doc.data());
                const ledgerData = ledgerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                setRecords(recordsData as any[]);
                setPartnerTransactions(partnerData as any[]);
                setExpenses(expensesData as any[]);
                setLedgerEntries(ledgerData);
                setCustomers(customersData as any[]);

                // NotificationService.scheduleRecordNotifications(recordsData as any);
            } catch (error) {
                showErrorAlert('DATA_LOAD_FAILED', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();

        const checkNotifs = async () => {
            try {
                await NotificationService.registerNotifications();
            } catch (e) {
                console.error("Notif check failed", e);
            }
        };
        checkNotifs();

    }, [currentCompany]);

    const [openingBalance, setOpeningBalance] = useState(0);

    useEffect(() => {
        if (currentCompany) {
            const saved = localStorage.getItem(`openingBalance_${currentCompany.id}`);
            if (saved) setOpeningBalance(Number(saved));
        }
    }, [currentCompany]);

    const handleEditBalance = () => {
        const newBal = prompt("Set Opening Balance (Cash in Hand):", openingBalance.toString());
        if (newBal !== null) {
            const val = Number(newBal);
            if (!isNaN(val)) {
                setOpeningBalance(val);
                localStorage.setItem(`openingBalance_${currentCompany!.id}`, val.toString());
                window.location.reload(); // Simple reload to ensure calc updates fresh
            }
        }
    };

    useEffect(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const festival = FESTIVALS.find(f => f.date === todayStr);
        setTodaysFestival(festival || null);
    }, []);

    const metrics = useMemo(() => {
        let totalGivenCount = 0;
        let totalGivenPrincipal = 0;
        let activeRecordsCount = 0;
        let activeRecordsPrincipal = 0;
        let activeRecordsOutstandingPI = 0;

        // --- CASH BALANCE CALCULATION (Adapted from FinanceOverview) ---
        let runningBalance = openingBalance;

        // 1. Partner Transactions
        const partnerImpact = partnerTransactions.reduce((acc, tx) => {
            return acc + (tx.type === 'investment' ? Number(tx.amount || 0) : -Number(tx.amount || 0));
        }, 0);
        runningBalance += partnerImpact;

        // 2. Expenses
        const expenseImpact = expenses.reduce((acc, exp) => acc - Number(exp.amount || 0), 0);
        runningBalance += expenseImpact;

        // 3. Manual Ledger (System Adjustments)
        let manualLedgerImpact = 0;
        ledgerEntries.forEach(entry => {
            if (entry.entries && Array.isArray(entry.entries)) {
                entry.entries.forEach((sub: any) => {
                    if (sub.account === 'Cash / Bank') {
                        // In FinanceOverview: Credit = Debit in Ledger (Minus), Debit = Credit (Plus)?
                        // Wait, FinanceOverview: sub.type === 'Credit' ? 'debit' type (which subtracts)
                        // So Credit = Subtract, Debit = Add.
                        if (sub.type === 'Credit') manualLedgerImpact -= Number(sub.amount || 0);
                        else manualLedgerImpact += Number(sub.amount || 0);
                    }
                });
            }
        });
        runningBalance += manualLedgerImpact;

        // 4. Records Impact Logic
        let recordsImpact = 0;
        let totalCollections = 0;
        let totalServiceCharges = 0;

        // LEGACY SUPPORT: 'disbursed' kept for backward compat with old records, displays as 'Active'
        const validStatus = ['approved', 'active', 'settled', 'overdue', 'disbursed', 'given', 'pending', 'completed'];

        records.forEach(record => {
            const rawStatus = (record.status || '').toLowerCase();
            const amount = Number(record.amount || 0);
            const installmentAmount = Number(record.installmentAmount || record.emi || 0);
            const tenure = Number(record.tenure || 0);

            // Metrics Counts (Stateless)
            if (validStatus.includes(rawStatus)) {
                totalGivenCount++;
                totalGivenPrincipal += amount;
            }

            if (['active', 'approved', 'overdue', 'disbursed', 'given', 'pending'].includes(rawStatus)) {
                activeRecordsCount++;
                activeRecordsPrincipal += amount;

                // Outstanding Calc
                let paidAmount = 0;
                if (record.repaymentSchedule && Array.isArray(record.repaymentSchedule)) {
                    record.repaymentSchedule.forEach((e: any) => {
                        if (e.status === 'Paid') paidAmount += Number(e.amount || 0);
                    });
                }
                const totalPayablePI = installmentAmount * tenure;
                activeRecordsOutstandingPI += Math.max(0, totalPayablePI - paidAmount);
            }

            // CASH FLOW CALCULATION
            if (validStatus.includes(rawStatus)) {
                // A. Disbursal Outflow
                let amountToShowAtCommencement = amount;
                const addOns = (record as any).addOnHistory || (record as any).topUpHistory || [];
                let totalAddOnAmount = 0;
                addOns.forEach((t: any) => totalAddOnAmount += Number(t.amount || t.topUpAmount || 0));

                amountToShowAtCommencement = Math.max(0, amountToShowAtCommencement - totalAddOnAmount);

                // Deduct Base Amount
                recordsImpact -= amountToShowAtCommencement;

                // Deduct TopUps (if not in manual ledger)
                addOns.forEach((t: any) => {
                    const tDate = t.date?.toDate?.() || (t.date ? new Date(t.date) : new Date(0));
                    const tDateParts = !isNaN(tDate.getTime()) ? tDate.toISOString().split("T")[0] : "";
                    const hasLedgerEntry = ledgerEntries.some(le =>
                        le.recordId === record.id &&
                        le.date && (() => {
                            const ld = le.date?.toDate?.() || (le.date ? new Date(le.date) : new Date(0));
                            return !isNaN(ld.getTime()) ? ld.toISOString().split("T")[0] === tDateParts : false;
                        })()
                    );
                    if (!hasLedgerEntry) {
                        recordsImpact -= Number(t.amount || t.topUpAmount || 0);

                        // Add Service Fee for TopUp
                        if (t.serviceFee || t.processingFee) {
                            const fee = Number(t.serviceFee || t.processingFee || 0);
                            recordsImpact += fee;
                            totalServiceCharges += fee;
                        }
                    }
                });

                // B. Service Fee Inflow (Base)
                const feePercentage = (record as any).serviceFeePercentage || (record as any).processingFeePercentage || 0;
                // FinanceOverview uses logic: fee = (BaseAmount * %) / 100 approx if not stored?
                // Or use stored serviceCharge? Dashboard used stored serviceCharge. FinanceOverview calculates it.
                // Let's use stored if available for accuracy, else calc.
                let serviceFee = Number(record.serviceCharge || record.processingFee || 0);
                if (serviceFee === 0 && feePercentage > 0) {
                    serviceFee = (amountToShowAtCommencement * feePercentage) / 100;
                }
                recordsImpact += serviceFee;
                totalServiceCharges += serviceFee;

                // C. Installments Received
                if (record.repaymentSchedule && Array.isArray(record.repaymentSchedule)) {
                    record.repaymentSchedule.forEach((inst: any) => {
                        if (inst.status === 'Paid' && inst.paymentDate) {
                            const collected = Number(inst.amount || 0);
                            recordsImpact += collected;
                            totalCollections += collected;
                        }
                    });
                }

                // D. Settlements
                const settlementDetails = (record as any).settlementDetails || (record as any).foreclosureDetails;
                if (settlementDetails && settlementDetails.amountReceived) {
                    const settled = Number(settlementDetails.totalPaid || 0);
                    recordsImpact += settled;
                    totalCollections += settled;
                }
            }
        });

        runningBalance += recordsImpact;
        const netGiven = totalGivenPrincipal - totalServiceCharges;

        return {
            totalGivenCount,
            totalGivenPrincipal,
            activeRecordsCount,
            activeRecordsPrincipal,
            activeRecordsOutstandingPI,
            customerCount: customers.length,
            cashBalance: runningBalance,
            calculatedBalance: runningBalance,
            netGiven,
            totalCollections,
            totalServiceCharges
        };
    }, [records, partnerTransactions, expenses, ledgerEntries, openingBalance, customers]);

    const getModalContent = () => {
        let modalData: any[] = [];
        let columns: string[] = [];
        let renderRow: (row: any, index: number) => React.ReactNode = () => null;

        // Legacy Support - Case Insensitive
        // LEGACY SUPPORT: 'disbursed' kept for backward compat with old records
        const validActive = ['approved', 'active', 'overdue', 'disbursed', 'given', 'pending'];
        const validAll = ['approved', 'active', 'settled', 'overdue', 'disbursed', 'given', 'pending'];

        const normalize = (s: string) => (s || '').toLowerCase();

        switch (activeCard) {
            case 'Total Records':
                modalData = records.filter(l => validAll.includes(normalize(l.status)));
                columns = ['Customer', 'Record ID', 'Amount', 'Date', 'Installment', 'Status'];
                renderRow = (row, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-4 font-medium">{row.customerName}</td>
                        <td className="px-4 py-4 text-slate-500">{row.id}</td>
                        <td className="px-4 py-4 font-bold">{formatCurrency(row.amount)}</td>
                        <td className="px-4 py-4">
                            {(() => {
                                const d = row.date || row.activationDate;
                                const dateObj = d?.toDate?.() || (d ? new Date(d) : null);
                                return dateObj && !isNaN(dateObj.getTime()) ? format(dateObj, 'dd-MMM-yy') : '-';
                            })()}
                        </td>
                        <td className="px-4 py-4">{formatCurrency(row.installmentAmount || row.emi)}</td>
                        <td className="px-4 py-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">{row.status}</span>
                        </td>
                    </tr>
                );
                break;
            case 'Active Records':
                modalData = records.filter(l => validActive.includes(normalize(l.status))).map(l => {
                    const instAmount = Number(l.installmentAmount || l.emi) || 0;
                    const totalPI = instAmount * (Number(l.tenure) || 0);
                    const paidInsts = (l.repaymentSchedule || []).filter((e: any) => e.status === 'Paid');
                    const paidAmount = paidInsts.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
                    const pendingPI = Math.max(0, totalPI - paidAmount);
                    return { ...l, recordAmountPI: totalPI, instAmount, instPaidCount: `${paidInsts.length} / ${l.tenure}`, amountPendingPI: pendingPI };
                });
                columns = ['Customer', 'Total (Rec+Fee)', 'Installment', 'Paid', 'Pending'];
                renderRow = (row, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-4 font-medium">{row.customerName}</td>
                        <td className="px-4 py-4">{formatCurrency(row.recordAmountPI)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.instAmount)}</td>
                        <td className="px-4 py-4">{row.instPaidCount}</td>
                        <td className="px-4 py-4 font-bold text-red-500">{formatCurrency(row.amountPendingPI)}</td>
                    </tr>
                );
                break;
            case 'Portfolio Value':
                modalData = records.filter(l => validActive.includes(normalize(l.status))).map(l => {
                    const baseAmount = Number(l.amount) || 0;
                    const instAmt = Number(l.installmentAmount || l.emi) || 0;
                    const tenure = Number(l.tenure) || 0;
                    const totalPI = instAmt * tenure;
                    const totalFee = totalPI - baseAmount;
                    const instBase = tenure > 0 ? baseAmount / tenure : 0;
                    const instFee = instAmt - instBase;
                    const paidInsts = (l.repaymentSchedule || []).filter((e: any) => e.status === 'Paid');
                    const paidAmount = paidInsts.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
                    const pendingPI = Math.max(0, totalPI - paidAmount);
                    return { ...l, baseAmount, totalFee, totalRecordPI: totalPI, instBase, instFee, instAmt, totalReceivedPI: paidAmount, balancePI: pendingPI };
                });
                columns = ['Customer', 'Base Amount', 'Markup Fee', 'Total', 'Inst (Base)', 'Inst (Fee)', 'Installment', 'Received', 'Balance'];
                renderRow = (row, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-4 font-medium">{row.customerName}</td>
                        <td className="px-4 py-4">{formatCurrency(row.baseAmount)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.totalFee)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.totalRecordPI)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.instBase)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.instFee)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.instAmt)}</td>
                        <td className="px-4 py-4 text-emerald-600">{formatCurrency(row.totalReceivedPI)}</td>
                        <td className="px-4 py-4 font-bold text-orange-500">{formatCurrency(row.balancePI)}</td>
                    </tr>
                );
                break;
            case 'Net Given':
                modalData = records.filter(l => validAll.includes(normalize(l.status))).map(l => ({
                    ...l,
                    serviceCharge: Number(l.serviceCharge || l.processingFee) || 0,
                    netAmount: (Number(l.amount) || 0) - (Number(l.serviceCharge || l.processingFee) || 0)
                }));
                columns = ['Customer', 'Record Amount', 'Service Fee', 'Net Given', 'Status'];
                renderRow = (row, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-4 font-medium">{row.customerName}</td>
                        <td className="px-4 py-4">{formatCurrency(row.amount)}</td>
                        <td className="px-4 py-4 text-red-500">{formatCurrency(row.serviceCharge)}</td>
                        <td className="px-4 py-4 font-bold text-emerald-600">{formatCurrency(row.netAmount)}</td>
                        <td className="px-4 py-4"><span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">{row.status}</span></td>
                    </tr>
                );
                break;
            case 'Pending Collections':
                modalData = records.filter(l => validActive.includes(normalize(l.status))).map(l => {
                    const principal = Number(l.amount) || 0;
                    const instAmt = Number(l.installmentAmount || l.emi) || 0;
                    const tenure = Number(l.tenure) || 0;
                    const totalPI = instAmt * tenure;
                    const paidInsts = (l.repaymentSchedule || []).filter((e: any) => e.status === 'Paid');
                    const paidAmount = paidInsts.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
                    const outstanding = Math.max(0, totalPI - paidAmount);
                    return { ...l, principal, totalPI, paidAmount, outstanding };
                });
                columns = ['Customer', 'Base Amount', 'Total (Rec+Fee)', 'Collected', 'Outstanding'];
                renderRow = (row, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-4 font-medium">{row.customerName}</td>
                        <td className="px-4 py-4">{formatCurrency(row.principal)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.totalPI)}</td>
                        <td className="px-4 py-4 text-emerald-600">{formatCurrency(row.paidAmount)}</td>
                        <td className="px-4 py-4 font-bold text-red-500">{formatCurrency(row.outstanding)}</td>
                    </tr>
                );
                break;
            case 'Total Collected':
                modalData = records.filter(l => validAll.includes(normalize(l.status))).map(l => {
                    const paidInsts = (l.repaymentSchedule || []).filter((e: any) => e.status === 'Paid');
                    const instCollected = paidInsts.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
                    const settlementDetails = (l as any).settlementDetails || (l as any).foreclosureDetails;
                    const settlementAmount = (settlementDetails && settlementDetails.amountReceived) ? (Number(settlementDetails.totalPaid) || 0) : 0;
                    const totalCollected = instCollected + settlementAmount;
                    return { ...l, instsPaid: paidInsts.length, instCollected, settlementAmount, totalCollected };
                }).filter(l => l.totalCollected > 0);
                columns = ['Customer', 'Inst. Paid', 'Inst. Collected', 'Settlement', 'Total Collected'];
                renderRow = (row, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-4 font-medium">{row.customerName}</td>
                        <td className="px-4 py-4">{row.instsPaid}</td>
                        <td className="px-4 py-4">{formatCurrency(row.instCollected)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.settlementAmount)}</td>
                        <td className="px-4 py-4 font-bold text-emerald-600">{formatCurrency(row.totalCollected)}</td>
                    </tr>
                );
                break;
            default:
                modalData = [];
                break;
        }

        const renderCard = (row: any, index: number) => {
            if (activeCard === 'Total Records') {
                return (
                    <div key={index} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-tight">{row.customerName}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-50 text-indigo-700">{row.status}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(row.amount)}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {(() => {
                                    const d = row.date || row.activationDate;
                                    const dateObj = d?.toDate?.() || (d ? new Date(d) : null);
                                    return dateObj && !isNaN(dateObj.getTime()) ? format(dateObj, 'dd MMM yy') : '-';
                                })()}
                            </span>
                        </div>
                        <div className="pt-2 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <span>Installment: {formatCurrency(row.installmentAmount || row.emi)}</span>
                            <span>ID: {row.id}</span>
                        </div>
                    </div>
                );
            }
            return (
                <div key={index} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between mb-2">
                        <span className="font-bold text-slate-900 dark:text-white">{row.customerName}</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded uppercase font-bold">{row.status || 'Active'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                        {columns.slice(1).map((col, i) => {
                            const val = col.toLowerCase().includes('amount') || col.toLowerCase().includes('principal') || col.toLowerCase().includes('total') || col.toLowerCase().includes('net') || col.toLowerCase().includes('collected') || col.toLowerCase().includes('balance') || col.toLowerCase().includes('outstanding') || col.toLowerCase().includes('installment') || col.toLowerCase().includes('fee')
                                ? formatCurrency(row[Object.keys(row).find(k => k.toLowerCase().includes(col.toLowerCase().split(' ')[0])) || 'amount'] || 0)
                                : (row[Object.keys(row).find(k => k.toLowerCase().includes(col.toLowerCase().split(' ')[0])) || 'id'] || '-');
                            return (
                                <div key={i} className="flex flex-col">
                                    <span className="text-slate-400 uppercase font-bold tracking-tighter text-[9px]">{col}</span>
                                    <span className="text-slate-900 dark:text-white font-black">{val}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )
        };

        return { data: modalData, columns, renderRow, renderCard };
    };

    const handleExportPDF = async () => {
        if (!activeCard) return;
        const { data, columns } = getModalContent();
        if (!data || data.length === 0) { alert("No data available."); return; }
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.text((currentCompany?.name || APP_NAME) + " Report - " + activeCard, 14, 15);

        let tableRows: any[] = [];

        if (activeCard === 'Total Records') {
            tableRows = data.map((row: any) => [
                row.customerName || '-',
                row.id || '-',
                formatCurrency(row.amount),
                row.activationDate ? format(parseISO(row.activationDate), 'dd-MMM-yy') : (row.date ? format(parseISO(row.date), 'dd-MMM-yy') : '-'),
                formatCurrency(row.installmentAmount || row.emi || 0),
                row.status || '-'
            ]);
        } else if (activeCard === 'Active Records') {
            tableRows = data.map((row: any) => [
                row.customerName || '-',
                formatCurrency(row.recordAmountPI),
                formatCurrency(row.instAmount),
                row.instPaidCount || '-',
                formatCurrency(row.amountPendingPI)
            ]);
        } else if (activeCard === 'Portfolio Value') {
            tableRows = data.map((row: any) => [
                row.customerName || '-',
                formatCurrency(row.baseAmount),
                formatCurrency(row.totalFee),
                formatCurrency(row.totalRecordPI),
                formatCurrency(row.instBase),
                formatCurrency(row.instFee),
                formatCurrency(row.instAmt),
                formatCurrency(row.totalReceivedPI),
                formatCurrency(row.balancePI)
            ]);
        } else if (activeCard === 'Net Given') {
            tableRows = data.map((row: any) => [
                row.customerName || '-',
                formatCurrency(row.amount),
                formatCurrency(row.serviceCharge),
                formatCurrency(row.netAmount),
                row.status || '-'
            ]);
        } else if (activeCard === 'Pending Collections') {
            tableRows = data.map((row: any) => [
                row.customerName || '-',
                formatCurrency(row.principal),
                formatCurrency(row.totalPI),
                formatCurrency(row.paidAmount),
                formatCurrency(row.outstanding)
            ]);
        } else if (activeCard === 'Total Collected') {
            tableRows = data.map((row: any) => [
                row.customerName || '-',
                row.instsPaid?.toString() || '0',
                formatCurrency(row.instCollected),
                formatCurrency(row.settlementAmount),
                formatCurrency(row.totalCollected)
            ]);
        }

        autoTable(doc, { head: [columns], body: tableRows, startY: 25 });
        const today = format(new Date(), 'dd-MMM-yyyy');
        const filename = `report_${today}.pdf`;
        const pdfData = doc.output('dataurlstring').split(',')[1];

        try {
            const { DownloadService } = await import('../services/DownloadService');
            await DownloadService.downloadPDF(filename, pdfData);
        } catch (error) {
            doc.save(filename);
        }
    };

    const { data, columns, renderRow, renderCard } = getModalContent();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full flex-col font-sans"
        >
            <div className="relative px-4 sm:px-6 space-y-6 sm:space-y-8 mt-4 sm:mt-6 max-w-7xl mx-auto w-full pb-32">

                {/* Festival Greeting Card */}
                {todaysFestival && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative overflow-hidden rounded-[2rem] p-6 shadow-xl shadow-orange-500/20 bg-gradient-to-r from-orange-500 to-red-600 text-white"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                                    <span className="material-symbols-outlined text-4xl">festival</span>
                                </div>
                                <div className="text-center sm:text-left">
                                    <h2 className="text-2xl font-black mb-1 leading-tight">Happy {todaysFestival.name}!</h2>
                                    <p className="text-orange-100 font-bold text-xs uppercase tracking-widest opacity-90">Special Occasion</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (currentCompany) {
                                        const confirmShare = window.confirm('Open WhatsApp to share festival greeting?');
                                        if (!confirmShare) return;
                                        const msg = todaysFestival.greeting || generateHindiGreeting(todaysFestival.name, currentCompany.name, todaysFestival.date);
                                        const url = getWhatsAppLink(null, msg);
                                        window.open(url, '_system');
                                    }
                                }}
                                className="w-full sm:w-auto py-3 px-6 bg-white text-orange-600 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-xl">share</span>
                                <span>Greetings</span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Hero Balance Card */}
                <div className="group relative overflow-hidden rounded-[2rem] bg-slate-900 text-white shadow-2xl shadow-indigo-500/25 transition-all hover:scale-[1.01]">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-800"></div>
                    <div className="relative z-10 p-8">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-2 mb-2 opacity-80 cursor-pointer hover:opacity-100" onClick={handleEditBalance}>
                                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                                <span className="text-xs font-bold tracking-widest uppercase">Available Balance (Tap to Set)</span>
                            </div>
                            <Link to="/records/finance" className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all active:scale-90 ring-1 ring-white/20">
                                <span className="material-symbols-outlined">arrow_outward</span>
                            </Link>
                        </div>
                        <div className="text-center sm:text-left">
                            <span className="text-5xl font-black tracking-tight block mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-indigo-200">
                                {loading ? '...' : formatCurrency(metrics.cashBalance)}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-6 w-1 rounded-full bg-indigo-600"></div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Quick Actions</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { link: "/records/new", icon: "add", color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30", label: "New Entry" },
                            { link: "/records/customers/new", icon: "person_add", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", label: "Add Buddy" },
                            { link: "/records/due-list", icon: "payments", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", label: "Collect" },
                            //{ onClick: () => setShowFestivalListModal(true), icon: "festival", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", label: "Greetings" }
                            { link: "/records/tools", icon: "dashboard_customize", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/30", label: "More Tools" }
                        ].map((action: any, i) => (
                            action.link ? (
                                <Link key={i} to={action.link} className="group flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${action.bg} ${action.color}`}>
                                        <span className="material-symbols-outlined text-[26px] font-variation-FILL">{action.icon}</span>
                                    </div>
                                    <span className="font-black uppercase tracking-tight text-xs text-slate-700 dark:text-slate-300 mt-2">{action.label}</span>
                                </Link>
                            ) : (
                                <div key={i} onClick={action.onClick} className="group flex flex-col items-center justify-center p-5 cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${action.bg} ${action.color}`}>
                                        <span className="material-symbols-outlined text-[26px] font-variation-FILL">{action.icon}</span>
                                    </div>
                                    <span className="font-black uppercase tracking-tight text-xs text-slate-700 dark:text-slate-300 mt-2">{action.label}</span>
                                </div>
                            )
                        ))}
                    </div>
                </div>

                <div onClick={() => setShowReminderModal(true)} className="relative overflow-hidden rounded-2xl p-6 shadow-lg shadow-purple-500/30 cursor-pointer active:scale-[0.98] transition-all flex items-center justify-between group" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner border border-white/10">
                            <span className="material-symbols-outlined text-white text-2xl">bolt</span>
                        </div>
                        <div>
                            <h3 className="text-white font-black text-lg leading-none mb-1">Automated Reminders</h3>
                            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest opacity-90">Push Alerts</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                        Overview
                    </h3>
                    <div className="flex flex-col gap-4">
                        <div onClick={() => setActiveCard('Total Records')} className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-slate-800 cursor-pointer">
                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 tracking-wider font-bold uppercase text-[10px]">Total Records</div>
                                    </div>
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{loading ? '...' : formatCurrency(metrics.totalGivenPrincipal)}</h2>
                                    <p className="text-sm text-slate-500 mt-1">{metrics.totalGivenCount} entries found</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div onClick={() => setActiveCard('Active Records')} className="group p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? '...' : metrics.activeRecordsCount}</h2>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Records</p>
                            </div>
                            <div onClick={() => setActiveCard('Portfolio Value')} className="group p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{loading ? '...' : formatCurrency(metrics.activeRecordsOutstandingPI)}</h2>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Portfolio Value</p>
                            </div>
                        </div>

                        <div onClick={() => setActiveCard('Net Given')} className="group p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? '...' : formatCurrency(metrics.netGiven)}</h2>
                            <p className="text-xs text-slate-500 font-medium">Net Given (excl. Fees)</p>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                            Recent Activity
                        </h3>
                        <Link to="/records/all" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined text-slate-400">arrow_forward</span>
                        </Link>
                    </div>

                    <div className="flex flex-col gap-3">
                        {records.slice(0, 5).map((record: any) => {
                            const customer = customers.find(c => c.id === record.customerId);
                            const recordDate = record.date?.toDate?.() || (record.date ? new Date(record.date) : new Date());
                            return (
                                <Link key={record.id} to={`/records/view/${record.id}`} className="group p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-50 overflow-hidden">
                                            <LazyImage
                                                src={customer?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(record.customerName)}&background=random`}
                                                alt={record.customerName}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <h4 className="text-[15px] font-black text-slate-900 dark:text-white">{record.customerName}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{record.status}</span>
                                                <span className="text-[10px] text-slate-400">{format(recordDate, 'dd MMM')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(record.amount)}</p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* End Main Container */}
            </div>

            {/* Analytics Modal */}
            <AnimatePresence>
                {activeCard && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm overflow-hidden">
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-slate-50 dark:bg-slate-900 w-full md:max-w-4xl h-full md:h-auto md:max-h-[90vh] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col pt-[env(safe-area-inset-top)] md:pt-0"
                        >
                            <div className="p-6 bg-white dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1">{activeCard}</h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Record Insights</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleExportPDF} className="h-10 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 active:scale-95 transition-all">Export PDF</button>
                                    <button onClick={() => setActiveCard(null)} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 active:scale-90 transition-all">
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-auto flex-1 p-6 no-scrollbar">
                                <div className="hidden md:block">
                                    <table className="w-full text-sm text-left border-separate border-spacing-0">
                                        <thead className="text-[10px] text-slate-400 uppercase font-black bg-white dark:bg-slate-950/20 sticky top-0 z-10">
                                            <tr>
                                                {columns.map((col, i) => (
                                                    <th key={i} className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                                        <span className="tracking-widest">{col}</span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-transparent">
                                            {data.map((row, i) => renderRow(row, i))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="md:hidden flex flex-col gap-4 pb-20">
                                    {data.length > 0 ? (
                                        data.map((row, i) => renderCard(row, i))
                                    ) : (
                                        <div className="p-12 text-center">
                                            <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">inventory_2</span>
                                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No Records Found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {showReminderModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
                        <h2 className="text-2xl font-black mb-6">Send Alert</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase mb-2">Recipient</label>
                                <select
                                    value={selectedCustomerId}
                                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none"
                                >
                                    <option value="all">All Clients</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase mb-2">Title</label>
                                <input
                                    type="text"
                                    value={notifTitle}
                                    onChange={(e) => setNotifTitle(e.target.value)}
                                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none"
                                    placeholder="e.g. Important Update"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase mb-2">Message</label>
                                <textarea
                                    value={notifBody}
                                    onChange={(e) => setNotifBody(e.target.value)}
                                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none resize-none h-32"
                                    placeholder="Message details here..."
                                />
                            </div>
                            <button
                                onClick={handleSendNotification}
                                disabled={sending}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest"
                            >
                                {sending ? 'Sending...' : 'Send Notification'}
                            </button>
                            <button onClick={() => setShowReminderModal(false)} className="w-full py-2 text-slate-400 font-bold uppercase text-[10px]">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default Dashboard;