import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Calendar, ArrowUpRight, ArrowDownLeft, Filter, Download, Briefcase, Wallet } from 'lucide-react';
import jsPDF from 'jspdf';
import { HapticService } from '@/services/hapticService';
import { motion } from 'framer-motion';

interface DaybookProps {
    initialDate?: string | null;
}

const Daybook: React.FC<DaybookProps> = ({ initialDate }) => {
    const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [summary, setSummary] = useState({
        totalSales: 0,
        cashSales: 0,
        creditSales: 0,
        totalReceived: 0,
        totalTransactions: 0
    });

    useEffect(() => {
        const invoices = StorageService.getInvoices() || [];
        const payments = StorageService.getPayments() || [];

        const dayInvoices = invoices.filter(i => i.date === date);
        const dayPayments = payments.filter(p => p.date === date);

        const sales = dayInvoices.reduce((sum, i) => sum + i.total, 0);
        const cashSales = dayInvoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0);
        const creditSales = dayInvoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.total, 0);

        const received = dayPayments.reduce((sum, p) => sum + p.amount, 0);

        setSummary({
            totalSales: sales,
            cashSales: cashSales,
            creditSales: creditSales,
            totalReceived: received + cashSales,
            totalTransactions: dayInvoices.length + dayPayments.length
        });

        const combined = [
            ...dayInvoices.map(i => ({
                id: i.id,
                time: 'Invoice',
                type: 'SALE',
                party: i.customerName,
                amount: i.total,
                mode: i.status === 'PAID' ? 'CASH' : 'CREDIT',
                ref: i.invoiceNumber
            })),
            ...dayPayments.map(p => {
                const cust = StorageService.getCustomers().find(c => c.id === p.customerId);
                return {
                    id: p.id,
                    time: 'Payment',
                    type: 'RECEIPT',
                    party: cust?.company || cust?.name || 'Customer',
                    amount: p.amount,
                    mode: p.mode,
                    ref: p.reference || 'N/A'
                };
            })
        ];

        setTransactions(combined);
    }, [date]);

    const downloadPDF = () => {
        HapticService.medium();
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const company = StorageService.getCompanyProfile();
            const pageWidth = doc.internal.pageSize.getWidth();
            let yPos = 20;

            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59);
            doc.text(company?.name || 'Daybook', pageWidth / 2, yPos, { align: 'center' });
            yPos += 10;

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Transaction Summary for ${date}`, pageWidth / 2, yPos, { align: 'center' });
            yPos += 15;

            doc.save(`daybook-${date}.pdf`);
        } catch (e) { alert("PDF Save failed"); }
    };

    return (
        <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-full pb-24">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Accounting Ledger</p>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">Day Book</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="bg-transparent text-sm font-bold outline-none text-slate-700 dark:text-slate-200"
                            />
                        </div>
                        <button onClick={downloadPDF} className="bg-slate-900 dark:bg-blue-600 text-white p-3 rounded-2xl shadow-xl active:scale-95 transition-all">
                            <Download className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="bg-blue-50 dark:bg-blue-900/30 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                            <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Sales</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-slate-100">₹{summary.totalSales.toLocaleString()}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">Cash: ₹{summary.cashSales} | Credit: ₹{summary.creditSales}</p>
                    </motion.div>

                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-emerald-600 p-6 rounded-[32px] shadow-lg shadow-emerald-500/20 text-white">
                        <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-70">Cash In Hand</p>
                        <p className="text-3xl font-black">₹{summary.totalReceived.toLocaleString()}</p>
                        <p className="text-[10px] font-bold mt-2 opacity-70">From Sales & Payments Received</p>
                    </motion.div>

                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="bg-purple-50 dark:bg-purple-900/30 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                            <Filter className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Entries</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{summary.totalTransactions}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">Activity for {date}</p>
                    </motion.div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Transaction Register</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase">Type</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase">Party</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase">Reference</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase">Amount</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase">Mode</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {transactions.map((tx, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${tx.type === 'SALE' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {tx.type === 'SALE' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                                                {tx.type}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">{tx.party}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-400">{tx.ref}</td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-sm font-black text-slate-900 dark:text-slate-100">₹{tx.amount.toLocaleString()}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{tx.mode}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Daybook;
