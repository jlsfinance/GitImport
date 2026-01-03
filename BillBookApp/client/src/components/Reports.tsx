import React, { useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { ArrowLeft, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReportsProps {
    onBack: () => void;
    onViewLedger: (customerId: string) => void;
}

const Reports: React.FC<ReportsProps> = ({ onBack, onViewLedger }) => {
    const invoices = StorageService.getInvoices();
    const expenses = StorageService.getExpenses();

    const metrics = useMemo(() => {
        const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netProfit = totalSales - totalExpenses;

        // Monthly breakdown (simple last 6 months)
        const monthlyData: Record<string, { sales: number, expenses: number }> = {};

        [...invoices, ...expenses].forEach(item => {
            const d = new Date('status' in item ? (item as any).date : (item as any).date);
            const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });

            if (!monthlyData[key]) monthlyData[key] = { sales: 0, expenses: 0 };

            if ('total' in item) { // Invoice
                monthlyData[key].sales += item.total;
            } else { // Expense
                monthlyData[key].expenses += item.amount;
            }
        });

        return { totalSales, totalExpenses, netProfit, monthlyData };
    }, [invoices, expenses]);

    return (
        <div className="bg-slate-50 dark:bg-slate-900 min-h-full pb-20">
            {/* Top App Bar */}
            <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 px-4 pt-safe pb-4 flex items-center gap-4">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                    <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-200" />
                </button>
                <h1 className="text-2xl font-normal text-slate-800 dark:text-slate-100">Reports</h1>
            </div>

            <div className="px-4 max-w-4xl mx-auto space-y-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-blue-100 dark:bg-blue-900/30 p-6 rounded-[24px] text-blue-900 dark:text-blue-100"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-white/50 dark:bg-white/10 rounded-2xl">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Revenue</span>
                        </div>
                        <h3 className="text-3xl font-normal">₹{metrics.totalSales.toLocaleString('en-IN')}</h3>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-red-100 dark:bg-red-900/30 p-6 rounded-[24px] text-red-900 dark:text-red-100"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-white/50 dark:bg-white/10 rounded-2xl">
                                <TrendingDown className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Expenses</span>
                        </div>
                        <h3 className="text-3xl font-normal">₹{metrics.totalExpenses.toLocaleString('en-IN')}</h3>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-emerald-100 dark:bg-emerald-900/30 p-6 rounded-[24px] text-emerald-900 dark:text-emerald-100"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-white/50 dark:bg-white/10 rounded-2xl">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Net Profit</span>
                        </div>
                        <h3 className="text-3xl font-normal">₹{metrics.netProfit.toLocaleString('en-IN')}</h3>
                    </motion.div>
                </div>

                {/* Collection Performance */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 }}
                    className="bg-blue-600 text-white rounded-[32px] p-8 shadow-xl shadow-blue-500/20"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-bold">Collection Performance</h3>
                            <p className="text-blue-100 text-sm opacity-80">How effectively are you collecting payments?</p>
                        </div>
                        <div className="bg-white/20 p-2 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Total Receivables</p>
                            <p className="text-3xl font-black">₹{StorageService.getCustomers().reduce((sum, c) => sum + c.balance, 0).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Recovery Rate</p>
                            <p className="text-3xl font-black">
                                {Math.round((metrics.totalSales / (metrics.totalSales + StorageService.getCustomers().reduce((sum, c) => sum + c.balance, 0))) * 100)}%
                            </p>
                        </div>
                    </div>

                    <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round((metrics.totalSales / (metrics.totalSales + StorageService.getCustomers().reduce((sum, c) => sum + c.balance, 0))) * 100)}%` }}
                            className="h-full bg-white rounded-full shadow-lg"
                        />
                    </div>
                    <p className="text-[10px] mt-2 font-bold opacity-60">Calculated based on lifetime sales vs current outstanding balance.</p>
                </motion.div>

                {/* Monthly Breakdown */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-slate-800 rounded-[24px] p-6 shadow-sm border border-slate-100 dark:border-slate-700"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Monthly Performance</h3>
                        <button className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-full transition-colors">
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                    </div>

                    <div className="space-y-4">
                        {Object.keys(metrics.monthlyData).map((month) => (
                            <div key={month} className="flex items-center gap-4">
                                <div className="w-16 text-sm font-bold text-slate-500 dark:text-slate-400">{month}</div>
                                <div className="flex-1 space-y-1">
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(metrics.monthlyData[month].sales / metrics.totalSales) * 100}%` }}
                                            className="h-full bg-blue-500 rounded-full"
                                        />
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden opacity-70">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${((metrics.monthlyData[month].sales - metrics.monthlyData[month].expenses) / metrics.totalSales) * 100}%` }}
                                            className="h-full bg-emerald-500 rounded-full"
                                        />
                                    </div>
                                </div>
                                <div className="text-right min-w-[80px]">
                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">₹{metrics.monthlyData[month].sales.toLocaleString('en-IN', { notation: 'compact' })}</div>
                                    <div className="text-xs text-emerald-600 font-medium">₹{(metrics.monthlyData[month].sales - metrics.monthlyData[month].expenses).toLocaleString('en-IN', { notation: 'compact' })}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Ledger Quick Access */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white dark:bg-slate-800 rounded-[24px] p-6 shadow-sm border border-slate-100 dark:border-slate-700"
                >
                    <h3 className="text-lg font-bold mb-4">Customer Ledger Reports</h3>
                    <p className="text-sm text-slate-500 mb-6">Select a customer to view their detailed transaction history with custom date filters.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {StorageService.getCustomers().slice(0, 6).map(customer => (
                            <button
                                key={customer.id}
                                onClick={() => onViewLedger(customer.id)}
                                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 transition-colors"
                            >
                                <div className="text-left">
                                    <p className="font-bold text-slate-800 dark:text-slate-100">{customer.company || customer.name}</p>
                                    <p className="text-xs text-slate-500">Balance: ₹{customer.balance.toLocaleString()}</p>
                                </div>
                                <ArrowLeft className="w-5 h-5 text-slate-300 rotate-180" />
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Reports;
