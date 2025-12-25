
import React from 'react';
import { Invoice } from '../types';
import { StorageService } from '../services/storageService';
import { DollarSign, Users, Package, ArrowRight, MessageCircle, Plus, FileText, TrendingUp, ArrowDownLeft, Calculator, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCompany } from '@/contexts/CompanyContext';

interface DashboardProps {
    invoices: Invoice[];
    onViewInvoice: (invoice: Invoice) => void;
    onViewCustomerLedger: (customerId: string) => void;
    onViewDaybook: (date: string) => void;
    onQuickShare: (invoice: Invoice) => void;
    onCreateInvoice: () => void;
    onOpenReports: () => void;
    onAddCustomer: () => void;
    onOpenSmartCalc: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
    invoices,
    onViewInvoice,
    onViewCustomerLedger,
    onViewDaybook,
    onQuickShare,
    onCreateInvoice,
    onOpenReports,
    onAddCustomer,
    onOpenSmartCalc
}) => {
    const { company } = useCompany();
    const [timeFilter, setTimeFilter] = React.useState<'ALL' | 'TODAY' | 'MONTH'>('ALL');

    const filteredInvoices = React.useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthYear = now.toISOString().slice(0, 7); // YYYY-MM

        return invoices.filter(inv => {
            if (timeFilter === 'TODAY') return inv.date === todayStr;
            if (timeFilter === 'MONTH') return inv.date.startsWith(monthYear);
            return true;
        });
    }, [invoices, timeFilter]);

    const totalRevenue = filteredInvoices.reduce((acc, inv) => acc + inv.total, 0);
    const pendingInvoices = filteredInvoices.filter(i => i.status === 'PENDING').length;
    const productsCount = StorageService.getProducts().length;
    const customersCount = StorageService.getCustomers().length;

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="pb-32 md:pb-6 bg-slate-50 dark:bg-slate-900/50 min-h-screen font-sans">
            {/* Top Bar with Firm Name */}
            <div className="pt-16 pb-6 px-6 bg-transparent sticky top-0 z-10 transition-all">
                <div className="max-w-5xl mx-auto flex justify-between items-end">
                    <div className="overflow-hidden flex-1">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 px-1">
                            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                        </p>
                        <h1 className="text-4xl md:text-5xl font-semibold font-heading text-slate-900 dark:text-slate-100 tracking-tight truncate leading-tight">
                            {company?.name || 'Dashboard'}
                        </h1>
                    </div>
                    <div className="flex gap-3 flex-shrink-0 ml-4">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenSmartCalc}
                            className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border-none flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm hover:shadow-md transition-all active:bg-slate-50"
                        >
                            <Calculator className="w-6 h-6 text-primary" />
                        </motion.button>
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 p-1 shadow-sm border-none overflow-hidden">
                            <img src="/logo.png" className="w-full h-full object-contain rounded-xl" alt="Firm Logo" />
                        </div>
                    </div>
                </div>
            </div>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="px-4 md:px-8 max-w-5xl mx-auto space-y-8"
            >
                {/* Time Filter Chips */}
                <motion.div variants={item} className="flex gap-2 pb-2 overflow-x-auto no-scrollbar mask-gradient-right">
                    {[
                        { id: 'ALL', label: 'Overview' },
                        { id: 'TODAY', label: 'Today' },
                        { id: 'MONTH', label: 'Monthly' },
                    ].map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => setTimeFilter(filter.id as any)}
                            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${timeFilter === filter.id
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </motion.div>

                {/* PREMIUM LARGE WORKING CARDS */}
                <div className="space-y-4">
                    {/* Main Balance Card - Full Width, High Contrast */}
                    <motion.div
                        variants={item}
                        onClick={onOpenReports}
                        className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 p-8 rounded-[40px] shadow-2xl shadow-blue-500/10 text-white group border border-white/5 cursor-pointer active:scale-[0.99] transition-all"
                    >
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors" />
                        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Total Receivables</p>
                                    <h2 className="text-4xl md:text-5xl font-semibold font-heading tracking-tight italic">
                                        ₹{totalRevenue.toLocaleString('en-IN')}
                                    </h2>
                                </div>
                                <div className="p-4 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10">
                                    <TrendingUp className="w-8 h-8 text-blue-400" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Pending Invoices</p>
                                    <p className="text-xl font-bold font-heading">{pendingInvoices} Bills</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Items In Stock</p>
                                    <p className="text-xl font-bold font-heading">{productsCount} SKU</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                </div>

                {/* NEW: AUTOMATIC BACKUP STATUS CARD */}
                <motion.div
                    variants={item}
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-6 rounded-[32px] shadow-sm overflow-hidden relative group"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Daily Automatic Backup</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">100% Free & Secure via GitHub Actions</p>
                        </div>
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full uppercase tracking-widest">Active</span>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Safe Setup</p>
                        </div>
                    </div>
                </motion.div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold font-heading text-slate-900 dark:text-slate-100 tracking-tight italic uppercase px-2">Working Shortcuts</h3>
                    <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <button
                            onClick={onCreateInvoice}
                            className="group relative bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all border border-slate-100 dark:border-slate-800 overflow-hidden active:scale-95"
                        >
                            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-primary/5 rounded-full group-hover:scale-150 transition-transform" />
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:rotate-12 transition-all">
                                <Plus className="w-6 h-6 text-primary group-hover:text-white" />
                            </div>
                            <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">New Bill</span>
                        </button>

                        <button
                            onClick={() => onViewDaybook(new Date().toISOString().split('T')[0])}
                            className="group relative bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all border border-slate-100 dark:border-slate-800 overflow-hidden active:scale-95"
                        >
                            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-transform" />
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500 group-hover:-rotate-12 transition-all">
                                <ArrowDownLeft className="w-6 h-6 text-emerald-600 group-hover:text-white" />
                            </div>
                            <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Daybook</span>
                        </button>

                        <button
                            onClick={onOpenReports}
                            className="group relative bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm hover:shadow-xl hover:shadow-orange-500/10 transition-all border border-slate-100 dark:border-slate-800 overflow-hidden active:scale-95"
                        >
                            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-orange-500/5 rounded-full group-hover:scale-150 transition-transform" />
                            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4 group-hover:bg-orange-500 group-hover:rotate-12 transition-all">
                                <FileText className="w-6 h-6 text-orange-500 group-hover:text-white" />
                            </div>
                            <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Reports</span>
                        </button>

                        <button
                            onClick={onAddCustomer}
                            className="group relative bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all border border-slate-100 dark:border-slate-800 overflow-hidden active:scale-95"
                        >
                            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-purple-500/5 rounded-full group-hover:scale-150 transition-transform" />
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500 group-hover:-rotate-12 transition-all">
                                <Users className="w-6 h-6 text-purple-500 group-hover:text-white" />
                            </div>
                            <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Clients</span>
                        </button>
                    </motion.div>
                </div>

                {/* Recent Items Surface */}
                <motion.div variants={item} className="bg-white dark:bg-slate-800/40 rounded-[48px] p-6 lg:p-10 border border-slate-100 dark:border-slate-800/50 mb-10 shadow-sm">
                    <div className="flex justify-between items-center mb-8 px-2">
                        <h3 className="text-3xl font-semibold font-heading text-slate-900 dark:text-slate-100 tracking-tighter italic uppercase">Recent Activity</h3>
                        {invoices.length > 0 && (
                            <button onClick={onOpenReports} className="text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/5 px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800">History</button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {invoices.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                    <FileText className="w-12 h-12 text-slate-300" />
                                </div>
                                <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2 mt-8">Empty Ledger</h4>
                                <p className="text-sm text-slate-500 mb-8 max-w-[280px]">Your business activities will appear here once you create an invoice.</p>
                                <button onClick={onCreateInvoice} className="bg-primary text-white px-10 py-4 rounded-3xl font-black shadow-2xl shadow-primary/40 flex items-center gap-2 active:scale-95 transition-all uppercase tracking-widest text-[10px]">
                                    <Plus className="w-5 h-5 text-white" />
                                    Generate Bill
                                </button>
                            </div>
                        ) : (
                            [...invoices]
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .slice(0, 10)
                                .map((inv) => (
                                    <div
                                        key={inv.id}
                                        className="group relative flex items-center justify-between p-4 rounded-3xl hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-800 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none active:scale-[0.98]"
                                        onClick={() => onViewInvoice(inv)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-lg font-bold text-slate-400 group-hover:bg-primary group-hover:text-white transition-all transform group-hover:rotate-6">
                                                {inv.customerName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-base font-semibold font-heading text-slate-900 dark:text-slate-100 truncate max-w-[160px] tracking-tight">{inv.customerName}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60">#{inv.invoiceNumber} • {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="hidden group-hover:flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onViewCustomerLedger(inv.customerId);
                                                    }}
                                                    className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                    title="View Ledger"
                                                >
                                                    <Users className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold font-heading text-slate-900 dark:text-slate-100">₹{inv.total.toLocaleString('en-IN')}</p>
                                                <div className={`flex items-center gap-1.5 justify-end mt-1`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${inv.status === 'PAID' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${inv.status === 'PAID' ? 'text-emerald-600' : 'text-orange-600'}`}>
                                                        {inv.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </motion.div>
            </motion.div >
        </div >
    );
};

export default Dashboard;
