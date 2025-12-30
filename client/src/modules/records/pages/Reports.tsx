import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCompany } from '../context/CompanyContext';
import { motion } from 'framer-motion';

// --- Types ---
interface FinancialRecord { id: string; customerId: string; customerName: string; amount: number; date: string; status: string; repaymentSchedule: any[]; serviceFee: number; }
interface Receipt { id: string; amount: number; paymentDate: string; customerName: string; recordId: string; installmentNumber: number; }
interface Customer { id: string; name: string; phone?: string; }

// --- Helpers ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const Reports: React.FC = () => {
    const navigate = useNavigate();
    const { currentCompany } = useCompany();
    const [activeTab, setActiveTab] = useState('summary');
    const [loading, setLoading] = useState(true);

    const [records, setRecords] = useState<FinancialRecord[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);

    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            if (!currentCompany) {
                setLoading(false);
                return;
            }

            try {
                const [recordsSnap, receiptsSnap, customersSnap] = await Promise.all([
                    getDocs(query(collection(db, "records"), where("companyId", "==", currentCompany.id))),
                    getDocs(query(collection(db, "receipts"), where("companyId", "==", currentCompany.id))),
                    getDocs(query(collection(db, "customers"), where("companyId", "==", currentCompany.id)))
                ]);

                setRecords(recordsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialRecord)));
                setReceipts(receiptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
                setCustomers(customersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
            } catch (e) {
                console.error("Error fetching report data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentCompany]);

    const summaryData = useMemo(() => {
        const totalGiven = records.reduce((sum, l) => sum + (l.status !== 'Rejected' && l.status !== 'Pending' ? Number(l.amount) : 0), 0);
        const totalCollected = receipts.reduce((sum, r) => sum + Number(r.amount), 0);

        let totalOutstanding = 0;
        let activeRecordsCount = 0;
        records.forEach(l => {
            if (['Approved', 'Active', 'Overdue'].includes(l.status)) {
                activeRecordsCount++;
                const paidInsts = l.repaymentSchedule?.filter((e: any) => e.status === 'Paid').length || 0;
                const totalInsts = l.repaymentSchedule?.length || 0;
                if (totalInsts > 0) {
                    totalOutstanding += (Number(l.amount) * (1 - (paidInsts / totalInsts)));
                } else {
                    totalOutstanding += Number(l.amount);
                }
            }
        });

        return { totalGiven, totalCollected, totalOutstanding, activeRecordsCount };
    }, [records, receipts]);

    const arrearsData = useMemo(() => {
        const overdueItems: any[] = [];
        records.forEach(record => {
            if (['Active', 'Approved', 'Overdue'].includes(record.status) && record.repaymentSchedule) {
                record.repaymentSchedule.forEach((inst: any) => {
                    const dueDate = inst.dueDate || inst.date;
                    if (inst.status === 'Pending' && new Date(dueDate) < new Date()) {
                        overdueItems.push({
                            customerName: record.customerName,
                            recordId: record.id,
                            dueDate: dueDate,
                            amount: inst.amount,
                            instNumber: inst.installmentNumber || inst.emiNumber
                        });
                    }
                });
            }
        });
        return overdueItems.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [records]);

    const monthlyCollectionData = useMemo(() => {
        const start = startOfMonth(parseISO(`${selectedMonth}-01`));
        const end = endOfMonth(parseISO(`${selectedMonth}-01`));
        return receipts.filter(r => isWithinInterval(parseISO(r.paymentDate), { start, end }));
    }, [receipts, selectedMonth]);

    const entriesData = useMemo(() => {
        const start = startOfMonth(parseISO(`${selectedMonth}-01`));
        const end = endOfMonth(parseISO(`${selectedMonth}-01`));
        return records.filter(l =>
            l.date && isWithinInterval(parseISO(l.date), { start, end }) &&
            ['Approved', 'Active', 'Settled', 'Overdue'].includes(l.status)
        );
    }, [records, selectedMonth]);

    const ledgerData = useMemo(() => {
        if (!selectedCustomer) return [];
        const customerRecords = records.filter(l => l.customerId === selectedCustomer);
        const customerReceipts = receipts.filter(r => customerRecords.some(l => l.id === (r.recordId || (r as any).loanId)));

        const entries: any[] = [];
        customerRecords.forEach(l => {
            if (l.date) {
                entries.push({ date: l.date, type: 'Out', desc: `Record Created (ID: ${l.id})`, amount: l.amount });
            }
        });
        customerReceipts.forEach(r => {
            entries.push({ date: r.paymentDate, type: 'In', desc: `Payment Received (Record: ${r.recordId})`, amount: r.amount });
        });
        return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [records, receipts, selectedCustomer]);

    const downloadPDF = (title: string, columns: string[], data: any[]) => {
        const doc = new jsPDF();
        doc.text(title, 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);

        autoTable(doc, {
            head: [columns],
            body: data,
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }
        });
        doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'summary':
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-indigo-600 p-5 rounded-3xl shadow-lg text-white">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Total Records Value</p>
                                <p className="text-2xl font-black">{formatCurrency(summaryData.totalGiven)}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-md border border-gray-100 dark:border-gray-700">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Total Collected</p>
                                <p className="text-2xl font-black text-emerald-600">{formatCurrency(summaryData.totalCollected)}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-md border border-gray-100 dark:border-gray-700">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Outstanding Balance</p>
                                <p className="text-2xl font-black text-indigo-900 dark:text-white">{formatCurrency(summaryData.totalOutstanding)}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-md border border-gray-100 dark:border-gray-700">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Active Records</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{summaryData.activeRecordsCount}</p>
                            </div>
                        </div>
                    </div>
                );

            case 'arrears':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="font-black text-lg">Overdue Report</h3>
                            <button
                                onClick={() => downloadPDF('Arrears Report', ['Customer', 'Record ID', 'Due Date', 'Amount'], arrearsData.map(a => [a.customerName, a.recordId, a.dueDate, formatCurrency(a.amount)]))}
                                className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1 shadow-md"
                            >
                                <span className="material-symbols-outlined text-sm">download</span> PDF
                            </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 font-black uppercase text-[10px] tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3">Due Date</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {arrearsData.length > 0 ? arrearsData.map((item, i) => (
                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-bold">{item.customerName}</div>
                                                <div className="text-[10px] text-gray-400">ID: {item.recordId}</div>
                                            </td>
                                            <td className="px-4 py-3 text-rose-600 font-bold">{item.dueDate}</td>
                                            <td className="px-4 py-3 text-right font-black">{formatCurrency(item.amount)}</td>
                                        </tr>
                                    )) : <tr><td colSpan={3} className="p-8 text-center text-gray-400">No overdue payments found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case 'monthly':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex justify-between items-center">
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                            />
                            <button
                                onClick={() => downloadPDF(`Collections_${selectedMonth}`, ['Date', 'Customer', 'Record ID', 'Amount'], monthlyCollectionData.map(r => [r.paymentDate, r.customerName, r.recordId, formatCurrency(r.amount)]))}
                                className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1 shadow-md"
                            >
                                <span className="material-symbols-outlined text-sm">download</span> PDF
                            </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 font-black uppercase text-[10px] tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {monthlyCollectionData.length > 0 ? monthlyCollectionData.map((item, i) => (
                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <td className="px-4 py-3 text-gray-400">{item.paymentDate}</td>
                                            <td className="px-4 py-3 font-bold">{item.customerName}</td>
                                            <td className="px-4 py-3 text-right font-black text-emerald-600">{formatCurrency(item.amount)}</td>
                                        </tr>
                                    )) : <tr><td colSpan={3} className="p-8 text-center text-gray-400">No collections this month.</td></tr>}
                                </tbody>
                                <tfoot className="bg-gray-50 dark:bg-gray-800 font-black">
                                    <tr>
                                        <td colSpan={2} className="px-4 py-3 text-right text-gray-400">TOTAL</td>
                                        <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(monthlyCollectionData.reduce((s, x) => s + Number(x.amount), 0))}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                );

            case 'recent':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex justify-between items-center">
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                            />
                            <button
                                onClick={() => downloadPDF(`Record_Created_${selectedMonth}`, ['Date', 'Customer', 'Record ID', 'Amount'], entriesData.map(l => [l.date, l.customerName, l.id, formatCurrency(l.amount)]))}
                                className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1 shadow-md"
                            >
                                <span className="material-symbols-outlined text-sm">download</span> PDF
                            </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 font-black uppercase text-[10px] tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {entriesData.length > 0 ? entriesData.map((item, i) => (
                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <td className="px-4 py-3 text-gray-400">{item.date}</td>
                                            <td className="px-4 py-3 font-bold">{item.customerName}</td>
                                            <td className="px-4 py-3 text-right font-black">{formatCurrency(item.amount)}</td>
                                        </tr>
                                    )) : <tr><td colSpan={3} className="p-8 text-center text-gray-400">No records found for this month.</td></tr>}
                                </tbody>
                                <tfoot className="bg-gray-50 dark:bg-gray-800 font-black">
                                    <tr>
                                        <td colSpan={2} className="px-4 py-3 text-right text-gray-400">TOTAL</td>
                                        <td className="px-4 py-3 text-right text-indigo-600">{formatCurrency(entriesData.reduce((s, x) => s + Number(x.amount), 0))}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                );

            case 'ledger':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Select Customer</label>
                            <select
                                value={selectedCustomer}
                                onChange={(e) => setSelectedCustomer(e.target.value)}
                                className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold outline-none"
                            >
                                <option value="">-- Choose Customer --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        {selectedCustomer && (
                            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-lg">
                                <div className="p-4 border-b border-gray-50 dark:border-gray-700 flex justify-end">
                                    <button
                                        onClick={() => downloadPDF(`Ledger_${customers.find(c => c.id === selectedCustomer)?.name}`, ['Date', 'Particulars', 'Out', 'In', 'Balance'], ledgerData.map((e, i, arr) => {
                                            const bal = arr.slice(0, i + 1).reduce((sum, x) => sum + (x.type === 'Out' ? x.amount : -x.amount), 0);
                                            return [e.date, e.desc, e.type === 'Out' ? formatCurrency(e.amount) : '', e.type === 'In' ? formatCurrency(e.amount) : '', formatCurrency(bal)];
                                        }))}
                                        className="text-xs font-black text-indigo-600 flex items-center gap-1 uppercase tracking-widest"
                                    >
                                        <span className="material-symbols-outlined text-sm">download</span> PDF report
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-400 font-black uppercase text-[9px] tracking-widest">
                                            <tr>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Particulars</th>
                                                <th className="px-4 py-3 text-right">Out</th>
                                                <th className="px-4 py-3 text-right">In</th>
                                                <th className="px-4 py-3 text-right">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                            {ledgerData.length > 0 ? (
                                                (() => {
                                                    let balance = 0;
                                                    return ledgerData.map((item, i) => {
                                                        balance += (item.type === 'Out' ? item.amount : -item.amount);
                                                        return (
                                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                                <td className="px-4 py-3 whitespace-nowrap text-gray-400">{item.date}</td>
                                                                <td className="px-4 py-3 font-medium">{item.desc}</td>
                                                                <td className="px-4 py-3 text-right text-rose-600 font-bold">{item.type === 'Out' ? formatCurrency(item.amount) : '-'}</td>
                                                                <td className="px-4 py-3 text-right text-emerald-600 font-bold">{item.type === 'In' ? formatCurrency(item.amount) : '-'}</td>
                                                                <td className="px-4 py-3 text-right font-black">{formatCurrency(balance)}</td>
                                                            </tr>
                                                        );
                                                    });
                                                })()
                                            ) : (
                                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No transactions found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                );

            default: return null;
        }
    };

    if (loading) return <div className="flex h-screen w-full items-center justify-center p-10"><div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div></div>;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 text-gray-900 dark:text-white font-sans"
        >
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/records/tools')} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 hover:scale-95 transition-all">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight">Financial Reports</h1>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mt-1">Analytics & History</p>
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto p-4 space-y-6">
                <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar">
                    {[
                        { id: 'summary', label: 'Summary', icon: 'analytics' },
                        { id: 'arrears', label: 'Overdue', icon: 'error' },
                        { id: 'monthly', label: 'Collections', icon: 'payments' },
                        { id: 'recent', label: 'Recent Records', icon: 'history' },
                        { id: 'ledger', label: 'Ledger', icon: 'book' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 -translate-y-1'
                                : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-100 dark:border-gray-700 shadow-sm'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="pt-2">
                    {renderTabContent()}
                </div>
            </div>
        </motion.div>
    );
};

export default Reports;