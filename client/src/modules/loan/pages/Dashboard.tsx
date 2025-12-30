import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useCompany } from '../context/CompanyContext';
import { NotificationService } from '../services/NotificationService';
import LazyImage from '../components/LazyImage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { Loan } from '../types';
import { motion } from 'framer-motion';
import { FESTIVALS, Festival } from '../data/festivals';
import { generateHindiGreeting, getWhatsAppLink } from '../utils/greetingGenerator';
import { APP_NAME } from '../constants';

const formatCurrency = (amount: number) => {
    return `Rs. ${new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0
    }).format(amount)}`;
};

const Dashboard: React.FC = () => {
    const { currentCompany } = useCompany();
    const [activeCard, setActiveCard] = useState<string | null>(null);

    const [loans, setLoans] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [partnerTransactions, setPartnerTransactions] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('all');
    const [sending, setSending] = useState(false);
    const [todaysFestival, setTodaysFestival] = useState<Festival | null>(null);
    const [showFestivalListModal, setShowFestivalListModal] = useState(false);

    const handleSendNotification = async () => {
        if (!notifTitle || !notifBody) return alert("Please enter title and message");
        if (!currentCompany?.id) return alert("Company not loaded");

        setSending(true);
        try {
            const { addDoc, serverTimestamp, collection } = await import('firebase/firestore');
            const targetCustomer = customers.find(c => c.id === selectedCustomerId);

            // Save to Firestore for in-app notifications
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

            // Send real push notification via Vercel API
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
                } else {
                    console.warn('Push API responded with:', result);
                }
            } catch (pushError) {
                console.warn('Push notification API error (notifications still saved):', pushError);
            }

            alert("Notification Sent Successfully! 🚀");
            setShowReminderModal(false);
            setNotifTitle('');
            setNotifBody('');
        } catch (e: any) {
            alert("Error sending: " + e.message);
        } finally {
            setSending(false);
        }
    };


    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!currentCompany) return;

            try {
                const companyId = currentCompany.id;

                const [loansSnap, customersSnap, partnerTxSnap, expensesSnap] = await Promise.all([
                    getDocs(query(collection(db, "loans"), where("companyId", "==", companyId))),
                    getDocs(query(collection(db, "customers"), where("companyId", "==", companyId))),
                    getDocs(query(collection(db, "partner_transactions"), where("companyId", "==", companyId))),
                    getDocs(query(collection(db, "expenses"), where("companyId", "==", companyId)))
                ]);

                const loansData = loansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const customersData = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const partnerData = partnerTxSnap.docs.map(doc => doc.data());
                const expensesData = expensesSnap.docs.map(doc => doc.data());

                loansData.sort((a: any, b: any) => {
                    const dateA = a.date?.toDate?.() || new Date(a.date) || new Date(0);
                    const dateB = b.date?.toDate?.() || new Date(b.date) || new Date(0);
                    return dateB.getTime() - dateA.getTime();
                });

                setLoans(loansData);
                setCustomers(customersData);
                setPartnerTransactions(partnerData);
                setExpenses(expensesData);

                // Schedule notifications
                NotificationService.scheduleLoanNotifications(loansData as unknown as Loan[]);
            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();

        // Check Notification Status (Permission + Token)
        const checkNotifs = async () => {
            try {
                await NotificationService.registerNotifications();
            } catch (e) {
                console.error("Notif check failed", e);
            }
        };
        checkNotifs();

    }, [currentCompany]);

    useEffect(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const festival = FESTIVALS.find(f => f.date === todayStr);
        setTodaysFestival(festival || null);
    }, []);

    const metrics = useMemo(() => {
        let totalGivenCount = 0;
        let totalGivenPrincipal = 0;
        let activeLoansCount = 0;
        let activeLoansPrincipal = 0;
        let activeLoansOutstandingPI = 0;
        let calculatedBalance = 0;

        partnerTransactions.forEach(tx => {
            if (tx.type === 'investment') calculatedBalance += Number(tx.amount || 0);
            else if (tx.type === 'withdrawal') calculatedBalance -= Number(tx.amount || 0);
        });

        expenses.forEach(exp => {
            calculatedBalance -= Number(exp.amount || 0);
        });

        loans.forEach(loan => {
            const amount = Number(loan.amount) || 0;
            const emi = Number(loan.emi) || 0;
            const tenure = Number(loan.tenure) || 0;
            const processingFee = Number(loan.processingFee) || 0;
            const status = loan.status;

            if (['Given', 'Disbursed', 'Active', 'Completed', 'Overdue'].includes(status)) {
                totalGivenCount++;
                totalGivenPrincipal += amount;
                calculatedBalance -= amount;
                calculatedBalance += processingFee;
            }

            let paidAmount = 0;
            if (loan.repaymentSchedule && Array.isArray(loan.repaymentSchedule)) {
                loan.repaymentSchedule.forEach((e: any) => {
                    if (e.status === 'Paid') {
                        const collected = Number(e.amount) || 0;
                        paidAmount += collected;
                        calculatedBalance += collected;
                    }
                });
            }

            // Add foreclosure payment if amountReceived is true
            const foreclosureDetails = (loan as any).foreclosureDetails;
            if (foreclosureDetails && foreclosureDetails.amountReceived) {
                calculatedBalance += Number(foreclosureDetails.totalPaid) || 0;
            }

            if (['Given', 'Disbursed', 'Active', 'Overdue'].includes(status)) {
                activeLoansCount++;
                activeLoansPrincipal += amount;
                const totalPayablePI = emi * tenure;
                const outstanding = Math.max(0, totalPayablePI - paidAmount);
                activeLoansOutstandingPI += outstanding;
            }
        });

        let totalCollections = 0;
        let totalProcessingFees = 0;
        loans.forEach(loan => {
            const processingFee = Number(loan.processingFee) || 0;
            const status = loan.status;
            if (['Given', 'Disbursed', 'Active', 'Completed', 'Overdue'].includes(status)) {
                totalProcessingFees += processingFee;
            }
            if (loan.repaymentSchedule && Array.isArray(loan.repaymentSchedule)) {
                loan.repaymentSchedule.forEach((e: any) => {
                    if (e.status === 'Paid') {
                        totalCollections += Number(e.amount) || 0;
                    }
                });
            }
            const foreclosureDetails = (loan as any).foreclosureDetails;
            if (foreclosureDetails && foreclosureDetails.amountReceived) {
                totalCollections += Number(foreclosureDetails.totalPaid) || 0;
            }
        });

        const netGiven = totalGivenPrincipal - totalProcessingFees;

        return {
            totalGivenCount,
            totalGivenPrincipal,
            activeLoansCount,
            activeLoansPrincipal,
            activeLoansOutstandingPI,
            customerCount: customers.length,
            cashBalance: calculatedBalance,
            netGiven,
            totalCollections,
            totalProcessingFees
        };
    }, [loans, customers, partnerTransactions, expenses]);

    const getModalContent = () => {
        let modalData: any[] = [];
        let columns: string[] = [];
        let renderRow: (row: any, index: number) => React.ReactNode = () => null;

        switch (activeCard) {
            case 'Total Given':
                modalData = loans.filter(l => ['Given', 'Disbursed', 'Active', 'Completed', 'Overdue'].includes(l.status));
                columns = ['Customer', 'Record ID', 'Amount', 'Date', 'Installment', 'Status'];
                renderRow = (row, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-4 font-medium">{row.customerName}</td>
                        <td className="px-4 py-4 text-slate-500">{row.id}</td>
                        <td className="px-4 py-4 font-bold">{formatCurrency(row.amount)}</td>
                        <td className="px-4 py-4">{row.givenDate ? format(parseISO(row.givenDate), 'dd-MMM-yy') : (row.disbursalDate ? format(parseISO(row.disbursalDate), 'dd-MMM-yy') : '-')}</td>
                        <td className="px-4 py-4">{formatCurrency(row.emi)}</td>
                        <td className="px-4 py-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">{row.status}</span>
                        </td>
                    </tr>
                );
                break;
            case 'Active Records':
                modalData = loans.filter(l => ['Given', 'Disbursed', 'Active', 'Overdue'].includes(l.status)).map(l => {
                    const totalPI = (Number(l.emi) || 0) * (Number(l.tenure) || 0);
                    const paidEmis = (l.repaymentSchedule || []).filter((e: any) => e.status === 'Paid');
                    const paidAmount = paidEmis.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
                    const pendingPI = Math.max(0, totalPI - paidAmount);
                    return { ...l, loanAmountPI: totalPI, emiPI: l.emi, emisPaidCount: `${paidEmis.length} / ${l.tenure}`, amountPendingPI: pendingPI };
                });
                columns = ['Customer', 'Total (P+I)', 'Installment', 'Paid', 'Pending'];
                renderRow = (row, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-4 font-medium">{row.customerName}</td>
                        <td className="px-4 py-4">{formatCurrency(row.loanAmountPI)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.emiPI)}</td>
                        <td className="px-4 py-4">{row.emisPaidCount}</td>
                        <td className="px-4 py-4 font-bold text-red-500">{formatCurrency(row.amountPendingPI)}</td>
                    </tr>
                );
                break;
            case 'Active Record Value':
                modalData = loans.filter(l => ['Given', 'Disbursed', 'Active', 'Overdue'].includes(l.status)).map(l => {
                    const principal = Number(l.amount) || 0;
                    const emi = Number(l.emi) || 0;
                    const tenure = Number(l.tenure) || 0;
                    const totalPI = emi * tenure;
                    const totalInterest = totalPI - principal;
                    const emiPrincipal = tenure > 0 ? principal / tenure : 0;
                    const emiInterest = emi - emiPrincipal;
                    const paidEmis = (l.repaymentSchedule || []).filter((e: any) => e.status === 'Paid');
                    const paidAmount = paidEmis.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
                    const pendingPI = Math.max(0, totalPI - paidAmount);
                    return { ...l, principal, totalInterest, totalLoanPI: totalPI, emiPrincipal, emiInterest, emi, totalReceivedPI: paidAmount, balancePI: pendingPI };
                });
                columns = ['Customer', 'Principal', 'Interest', 'Total', 'Inst (P)', 'Inst (I)', 'Installment', 'Received', 'Balance'];
                renderRow = (row, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-4 font-medium">{row.customerName}</td>
                        <td className="px-4 py-4">{formatCurrency(row.principal)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.totalInterest)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.totalLoanPI)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.emiPrincipal)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.emiInterest)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.emi)}</td>
                        <td className="px-4 py-4 text-emerald-600">{formatCurrency(row.totalReceivedPI)}</td>
                        <td className="px-4 py-4 font-bold text-orange-500">{formatCurrency(row.balancePI)}</td>
                    </tr>
                );
                break;
            case 'Net Given':
                modalData = loans.filter(l => ['Given', 'Disbursed', 'Active', 'Completed', 'Overdue'].includes(l.status)).map(l => ({
                    ...l,
                    processingFee: Number(l.processingFee) || 0,
                    netAmount: (Number(l.amount) || 0) - (Number(l.processingFee) || 0)
                }));
                columns = ['Customer', 'Record Amount', 'Processing Fee', 'Net Given', 'Status'];
                renderRow = (row, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-4 font-medium">{row.customerName}</td>
                        <td className="px-4 py-4">{formatCurrency(row.amount)}</td>
                        <td className="px-4 py-4 text-red-500">{formatCurrency(row.processingFee)}</td>
                        <td className="px-4 py-4 font-bold text-emerald-600">{formatCurrency(row.netAmount)}</td>
                        <td className="px-4 py-4"><span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">{row.status}</span></td>
                    </tr>
                );
                break;
            case 'Portfolio Outstanding':
                modalData = loans.filter(l => ['Given', 'Disbursed', 'Active', 'Overdue'].includes(l.status)).map(l => {
                    const principal = Number(l.amount) || 0;
                    const emi = Number(l.emi) || 0;
                    const tenure = Number(l.tenure) || 0;
                    const totalPI = emi * tenure;
                    const paidEmis = (l.repaymentSchedule || []).filter((e: any) => e.status === 'Paid');
                    const paidAmount = paidEmis.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
                    const outstanding = Math.max(0, totalPI - paidAmount);
                    return { ...l, principal, totalPI, paidAmount, outstanding };
                });
                columns = ['Customer', 'Principal', 'Total (P+I)', 'Collected', 'Outstanding'];
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
            case 'Total Collections':
                modalData = loans.filter(l => ['Given', 'Disbursed', 'Active', 'Completed', 'Overdue'].includes(l.status)).map(l => {
                    const paidEmis = (l.repaymentSchedule || []).filter((e: any) => e.status === 'Paid');
                    const emiCollected = paidEmis.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
                    const foreclosureDetails = (l as any).foreclosureDetails;
                    const foreclosureAmount = (foreclosureDetails && foreclosureDetails.amountReceived) ? (Number(foreclosureDetails.totalPaid) || 0) : 0;
                    const totalCollected = emiCollected + foreclosureAmount;
                    return { ...l, emisPaid: paidEmis.length, emiCollected, foreclosureAmount, totalCollected };
                }).filter(l => l.totalCollected > 0);
                columns = ['Customer', 'EMIs Paid', 'EMI Collected', 'Foreclosure', 'Total Collected'];
                renderRow = (row, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-4 font-medium">{row.customerName}</td>
                        <td className="px-4 py-4">{row.emisPaid}</td>
                        <td className="px-4 py-4">{formatCurrency(row.emiCollected)}</td>
                        <td className="px-4 py-4">{formatCurrency(row.foreclosureAmount)}</td>
                        <td className="px-4 py-4 font-bold text-emerald-600">{formatCurrency(row.totalCollected)}</td>
                    </tr>
                );
                break;
            default:
                modalData = [];
                break;
        }
        return { data: modalData, columns, renderRow };
    };

    const handleExportPDF = async () => {
        if (!activeCard) return;
        const { data, columns } = getModalContent();
        if (!data || data.length === 0) { alert("No data available."); return; }
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.text((currentCompany?.name || APP_NAME) + " Report - " + activeCard, 14, 15);

        let tableRows: any[] = [];

        if (activeCard === 'Total Given') {
            tableRows = data.map((row: any) => [
                row.customerName || '-',
                row.id || '-',
                formatCurrency(row.amount),
                row.givenDate ? format(parseISO(row.givenDate), 'dd-MMM-yy') : (row.disbursalDate ? format(parseISO(row.disbursalDate), 'dd-MMM-yy') : '-'),
                formatCurrency(row.emi),
                row.status || '-'
            ]);
        } else if (activeCard === 'Active Records') {
            tableRows = data.map((row: any) => [
                row.customerName || '-',
                formatCurrency(row.loanAmountPI),
                formatCurrency(row.emiPI),
                row.emisPaidCount || '-',
                formatCurrency(row.amountPendingPI)
            ]);
        } else if (activeCard === 'Active Loan Value') {
            tableRows = data.map((row: any) => [
                row.customerName || '-',
                formatCurrency(row.principal),
                formatCurrency(row.totalInterest),
                formatCurrency(row.totalLoanPI),
                formatCurrency(row.emiPrincipal),
                formatCurrency(row.emiInterest),
                formatCurrency(row.emi),
                formatCurrency(row.totalReceivedPI),
                formatCurrency(row.balancePI)
            ]);
        } else if (activeCard === 'Net Given') {
            tableRows = data.map((row: any) => [
                row.customerName || '-',
                formatCurrency(row.amount),
                formatCurrency(row.processingFee),
                formatCurrency(row.netAmount),
                row.status || '-'
            ]);
        } else if (activeCard === 'Portfolio Outstanding') {
            tableRows = data.map((row: any) => [
                row.customerName || '-',
                formatCurrency(row.principal),
                formatCurrency(row.totalPI),
                formatCurrency(row.paidAmount),
                formatCurrency(row.outstanding)
            ]);
        } else if (activeCard === 'Total Collections') {
            tableRows = data.map((row: any) => [
                row.customerName || '-',
                row.emisPaid?.toString() || '0',
                formatCurrency(row.emiCollected),
                formatCurrency(row.foreclosureAmount),
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

    const { data, columns, renderRow } = getModalContent();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full flex-col font-sans"
        >
            <div className="relative px-4 sm:px-6 space-y-6 sm:space-y-8 mt-4 sm:mt-6 max-w-7xl mx-auto w-full pb-32">

                {/* Festival Greeting Card (Conditional) */}
                {todaysFestival && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative overflow-hidden rounded-[2rem] p-6 shadow-xl shadow-orange-500/20 bg-gradient-to-r from-orange-500 to-red-600 text-white"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-800/20 rounded-full blur-2xl -ml-10 -mb-10"></div>

                        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                                    <span className="material-symbols-outlined text-4xl">festival</span>
                                </div>
                                <div className="text-center sm:text-left">
                                    <h2 className="text-2xl font-black mb-1 leading-tight">Happy {todaysFestival.name}!</h2>
                                    <p className="text-orange-100 font-bold text-xs uppercase tracking-widest opacity-90">Today's Special Occasion</p>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full sm:w-auto">
                                <button
                                    onClick={() => {
                                        if (currentCompany) {
                                            const msg = todaysFestival.greeting || generateHindiGreeting(todaysFestival.name, currentCompany.name, todaysFestival.date);
                                            const url = getWhatsAppLink(null, msg);
                                            window.open(url, '_system');
                                        }
                                    }}
                                    className="flex-1 sm:flex-none py-3 px-6 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-xl">share</span>
                                    <span>Send Greetings</span>
                                </button>
                            </div>
                        </div>

                        {/* Preview (Collapsible or Small) */}
                        <div className="mt-6 p-4 bg-black/10 rounded-xl backdrop-blur-sm border border-white/10">
                            <p className="text-sm font-medium whitespace-pre-line opacity-90 leading-relaxed">
                                {currentCompany ? (todaysFestival.greeting || generateHindiGreeting(todaysFestival.name, currentCompany.name, todaysFestival.date)) : 'Loading...'}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Hero Balance Card */}
                <div className="group relative overflow-hidden rounded-[2rem] bg-slate-900 text-white shadow-2xl shadow-indigo-500/25 transition-all hover:scale-[1.01]">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-800"></div>
                    {/* Animated Glows */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl group-hover:bg-purple-500/40 transition-colors duration-500"></div>
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/30 rounded-full blur-3xl group-hover:bg-indigo-500/40 transition-colors duration-500"></div>

                    <div className="relative z-10 p-8">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                                <span className="material-symbols-outlined text-indigo-200 text-sm">account_balance_wallet</span>
                                <span className="text-xs font-semibold text-indigo-100 tracking-wide uppercase">Available Balance</span>
                            </div>
                            <Link to="/loan/finance" className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all active:scale-90 ring-1 ring-white/20">
                                <span className="material-symbols-outlined">arrow_outward</span>
                            </Link>
                        </div>

                        <div className="text-center sm:text-left">
                            <span className="text-5xl font-black tracking-tight block mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-indigo-200">
                                {loading ? '...' : formatCurrency(metrics.cashBalance)}
                            </span>
                            <div className="flex items-center gap-2 mt-4 text-indigo-200 text-sm font-medium">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300">
                                    <span className="material-symbols-outlined text-sm">trending_up</span>
                                </span>
                                <span>Total Liquid Assets</span>
                            </div>
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
                            { link: "/loan/records/new", icon: "add", color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30", label: "New Entry" },
                            { link: "/loan/customers/new", icon: "person_add", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", label: "Add Client" },
                            { link: "/loan/due-list", icon: "payments", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", label: "Collect" },
                            { onClick: () => setShowFestivalListModal(true), icon: "festival", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", label: "Greetings" }
                        ].map((action: any, i) => (
                            action.link ? (
                                <Link key={i} to={action.link}
                                    className="group flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                                >
                                    <div className={`flex items-center justify-center transition-transform duration-300 group-hover:scale-110 w-12 h-12 rounded-xl ${action.bg} ${action.color}`}>
                                        <span className="material-symbols-outlined text-[26px] font-variation-FILL">{action.icon}</span>
                                    </div>
                                    <span className="font-black uppercase tracking-tight text-xs text-slate-700 dark:text-slate-300 mt-2">{action.label}</span>
                                </Link>
                            ) : (
                                <div key={i} onClick={action.onClick}
                                    className="group flex flex-col items-center justify-center p-5 cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                                >
                                    <div className={`flex items-center justify-center transition-transform duration-300 group-hover:scale-110 w-12 h-12 rounded-xl ${action.bg} ${action.color}`}>
                                        <span className="material-symbols-outlined text-[26px] font-variation-FILL">{action.icon}</span>
                                    </div>
                                    <span className="font-black uppercase tracking-tight text-xs text-slate-700 dark:text-slate-300 mt-2">{action.label}</span>
                                </div>
                            )
                        ))}
                    </div>
                </div>

                {/* Automated Reminders Banner */}
                <div
                    onClick={() => setShowReminderModal(true)}
                    className="relative overflow-hidden rounded-2xl p-6 shadow-lg shadow-purple-500/30 cursor-pointer active:scale-[0.98] transition-all flex items-center justify-between group"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}
                >
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner border border-white/10">
                            <span className="material-symbols-outlined text-white text-2xl">bolt</span>
                        </div>
                        <div>
                            <h3 className="text-white font-black text-lg leading-none mb-1">Automated Reminders</h3>
                            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest opacity-90">Sync All Due Dates & Push Alerts</p>
                        </div>
                    </div>
                    <div className="relative z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors border border-white/10">
                        <span className="material-symbols-outlined text-white">rocket_launch</span>
                    </div>
                </div>

                {/* Modern Analytics Cards */}
                <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                        Overview
                    </h3>
                    <div className="flex flex-col gap-4">
                        {/* Feature Card */}
                        <div
                            onClick={() => setActiveCard('Total Given')}
                            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-slate-100 dark:border-slate-800"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                                            <span className="material-symbols-outlined text-xl">account_balance</span>
                                        </div>
                                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Records</h3>
                                    </div>
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{loading ? '...' : formatCurrency(metrics.totalGivenPrincipal)}</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{metrics.totalGivenCount} Entries in total</p>
                                </div>
                                <div className="p-2 rounded-full border border-slate-100 dark:border-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                                    <span className="material-symbols-outlined text-slate-400">arrow_forward</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div
                                onClick={() => setActiveCard('Active Records')}
                                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-lg transition-all border border-slate-100 dark:border-slate-800 cursor-pointer"
                            >
                                <div className="p-2.5 w-fit rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-lg">trending_up</span>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? '...' : metrics.activeLoansCount}</h2>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Active Records</p>
                            </div>

                            <div
                                onClick={() => setActiveCard('Active Record Value')}
                                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-lg transition-all border border-slate-100 dark:border-slate-800 cursor-pointer"
                            >
                                <div className="p-2.5 w-fit rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 mb-3 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-lg">analytics</span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{loading ? '...' : formatCurrency(metrics.activeLoansOutstandingPI)}</h2>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Portfolio Value</p>
                            </div>
                        </div>

                        <div
                            onClick={() => setActiveCard('Net Given')}
                            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-lg transition-all border border-slate-100 dark:border-slate-800 cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/20 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                        <span className="material-symbols-outlined text-lg">payments</span>
                                    </span>
                                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Net Given</h3>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? '...' : formatCurrency(metrics.netGiven)}</h2>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Earnings: {formatCurrency(metrics.totalProcessingFees)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div
                                onClick={() => setActiveCard('Portfolio Outstanding')}
                                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-lg transition-all border border-slate-100 dark:border-slate-800 cursor-pointer"
                            >
                                <div className="p-2.5 w-fit rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-lg">pending_actions</span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{loading ? '...' : formatCurrency(metrics.activeLoansOutstandingPI)}</h2>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">To Collect</p>
                            </div>
                            <div
                                onClick={() => setActiveCard('Total Collections')}
                                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-lg transition-all border border-slate-100 dark:border-slate-800 cursor-pointer"
                            >
                                <div className="p-2.5 w-fit rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 mb-3 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-lg">savings</span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{loading ? '...' : formatCurrency(metrics.totalCollections)}</h2>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Collected</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Recent Activity */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                            Recent Activity
                        </h3>
                        <Link to="/loan/records" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined text-slate-400">arrow_forward</span>
                        </Link>
                    </div>

                    <div className="flex flex-col gap-3">
                        {loans.length === 0 && !loading && (
                            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 border-dashed">
                                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-2">receipt_long</span>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-500">No activity yet</p>
                            </div>
                        )}
                        {loans.slice(0, 5).map((loan: any, i) => {
                            const customer = customers.find(c => c.id === loan.customerId);
                            const loanDate = loan.date?.toDate?.() || (loan.date ? new Date(loan.date) : new Date());
                            return (
                                <Link key={loan.id} to={`/loan/records/${loan.id}`} className="group relative flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all hover:-translate-y-0.5">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-50 dark:bg-slate-800 p-0.5 overflow-hidden ring-1 ring-slate-100 dark:ring-slate-700">
                                            <LazyImage
                                                src={customer?.photo_url || customer?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(loan.customerName)}&background=random`}
                                                alt={loan.customerName}
                                                className="h-full w-full object-cover rounded-[14px]"
                                            />
                                        </div>
                                        <div>
                                            <h4 className="text-[15px] font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors capitalize">{loan.customerName.toLowerCase()}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${loan.status === 'Active' || loan.status === 'Given' || loan.status === 'Disbursed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
                                                    : loan.status === 'Completed' ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/30'
                                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                                                    }`}>
                                                    {loan.status}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">{format(loanDate, 'dd MMM')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(loan.amount)}</p>
                                        <p className="text-[10px] font-semibold text-slate-400">Record #{loan.id.slice(0, 5)}</p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* Expanded Analytics Modal */}
            {activeCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600">
                                    <span className="material-symbols-outlined">analytics</span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{activeCard}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExportPDF}
                                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">download</span>
                                    Export PDF
                                </button>
                                <button
                                    onClick={() => setActiveCard(null)}
                                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="overflow-auto flex-1 p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        {columns.map((col, i) => (
                                            <th key={i} className="px-4 py-3 font-bold tracking-wider">{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {data.length > 0 ? (
                                        data.map((row: any, i: number) => renderRow(row, i))
                                    ) : (
                                        <tr>
                                            <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                                                No data found for this category
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-center text-xs text-slate-500">
                            Showing {data.length} records • Generated on {new Date().toLocaleDateString()}
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Modal */}
            {showReminderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 relative">
                        <button
                            onClick={() => setShowReminderModal(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-3xl">notifications_active</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Send Push Notification</h3>
                            <p className="text-sm text-slate-500 mt-1">Send a custom message to your customers</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="e.g. Payment Reminder"
                                    value={notifTitle}
                                    onChange={e => setNotifTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none"
                                    placeholder="e.g. Your EMI for this month is due tomorrow."
                                    value={notifBody}
                                    onChange={e => setNotifBody(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Recipient</label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={selectedCustomerId}
                                    onChange={e => setSelectedCustomerId(e.target.value)}
                                >
                                    <option value="all">All Customers</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleSendNotification}
                                disabled={sending}
                                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                            >
                                {sending ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">send</span>
                                        Send Notification
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Manual Festival Greeting Modal */}
            {showFestivalListModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-orange-50/50 dark:bg-orange-500/5">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Festival Greetings</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Select a festival to send wishes</p>
                            </div>
                            <button
                                onClick={() => setShowFestivalListModal(false)}
                                className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {FESTIVALS.map((fest, idx) => (
                                <div key={idx} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-orange-200 dark:hover:border-orange-900/50 transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center">
                                            <span className="material-symbols-outlined">festival</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white">{fest.name}</h4>
                                            <p className="text-xs text-slate-500 font-medium">Coming on {format(parseISO(fest.date), 'dd MMM yyyy')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (currentCompany) {
                                                const msg = fest.greeting || generateHindiGreeting(fest.name, currentCompany.name, fest.date);
                                                const url = getWhatsAppLink(null, msg);
                                                window.open(url, '_system');
                                            }
                                        }}
                                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-orange-600 font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all shadow-sm active:scale-95"
                                    >
                                        Send Now
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">Wishes are sent via WhatsApp</p>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default Dashboard;