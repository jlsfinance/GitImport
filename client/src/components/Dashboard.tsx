
import React, { useState, useMemo } from 'react';
import { Invoice } from '../types';
import { StorageService } from '../services/storageService';
import { Users, Package, MessageCircle, Plus, FileText, TrendingUp, ArrowDownLeft, Calculator, CheckCircle, ChevronRight, Eye, Trash2, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HapticService } from '@/services/hapticService';
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
    onOpenAI: () => void; // New Prop
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
    onOpenSmartCalc,
    onOpenAI
}) => {
    const { company } = useCompany();
    const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'MONTH'>('ALL');
    const [selectedForAction, setSelectedForAction] = useState<Invoice | null>(null);

    // Animation Variants
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    // Derived State
    const productsCount = useMemo(() => StorageService.getProducts().length, []);
    const customersCount = useMemo(() => StorageService.getCustomers().length, []);

    const filteredInvoices = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

        return invoices.filter(inv => {
            if (timeFilter === 'TODAY') return inv.date === todayStr;
            if (timeFilter === 'MONTH') return inv.date.startsWith(monthStr);
            return true;
        });
    }, [invoices, timeFilter]);

    const totalRevenue = useMemo(() => filteredInvoices.reduce((sum, inv) => sum + inv.total, 0), [filteredInvoices]);
    const pendingInvoices = useMemo(() => filteredInvoices.filter(inv => inv.status === 'PENDING').length, [filteredInvoices]);

    return (
        <div className="pb-32 md:pb-6 bg-background min-h-screen font-sans" >
            {/* Google Static Top Bar / Header */}
            < div className="pt-14 pb-4 px-6 sticky top-0 z-30 bg-background/95 backdrop-blur-sm" >
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-google-blue uppercase tracking-widest mb-0.5">
                            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <h1 className="text-3xl md:text-4xl font-bold font-heading text-foreground tracking-tight">
                            {company?.name || 'My Business'}
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={onOpenSmartCalc}
                            className="w-12 h-12 rounded-full bg-surface-container-high border border-border flex items-center justify-center text-google-blue shadow-sm hover:shadow-google transition-all"
                        >
                            <Calculator className="w-6 h-6" />
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={onOpenAI}
                            className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white border-2 border-white/20 shadow-md hover:shadow-lg transition-all"
                        >
                            <span className="material-symbols-outlined text-[24px]">smart_toy</span>
                        </motion.button>
                    </div>
                </div>
            </div >

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="px-4 md:px-8 max-w-5xl mx-auto space-y-6"
            >
                {/* Expressive M3 Segmented Button */}
                <motion.div variants={item} className="p-1 bg-surface-container-low rounded-full border border-border flex w-fit max-w-full overflow-x-auto no-scrollbar">
                    {[
                        { id: 'ALL', label: 'Overview' },
                        { id: 'TODAY', label: 'Today' },
                        { id: 'MONTH', label: 'Month' },
                    ].map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => {
                                HapticService.light();
                                setTimeFilter(filter.id as any);
                            }}
                            className={`relative px-8 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${timeFilter === filter.id
                                ? 'text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {timeFilter === filter.id && (
                                <motion.div
                                    layoutId="filter-pill"
                                    className="absolute inset-0 bg-primary rounded-full -z-10 shadow-google"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10">{filter.label}</span>
                        </button>
                    ))}
                </motion.div>

                {/* MAIN STATS - Expressive M3 Style */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div
                        variants={item}
                        onClick={onOpenReports}
                        className="relative overflow-hidden bg-primary p-7 rounded-[32px] shadow-google-lg text-primary-foreground group cursor-pointer active:scale-[0.98] transition-all"
                    >
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-colors" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Total Outstanding</p>
                                    <h2 className="text-4xl md:text-5xl font-bold font-heading">
                                        ₹{totalRevenue.toLocaleString('en-IN')}
                                    </h2>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-md">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/5 uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                {pendingInvoices} Pending Bills
                            </div>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-2 gap-4">
                        <motion.div
                            variants={item}
                            className="bg-surface-container-high p-6 rounded-[32px] border border-border shadow-sm flex flex-col items-center text-center group active:scale-[0.98] transition-all"
                        >
                            <div className="w-14 h-14 rounded-full bg-google-yellow/10 flex items-center justify-center text-google-yellow mb-3 border border-google-yellow/10 group-hover:bg-google-yellow group-hover:text-white transition-all">
                                <Package className="w-7 h-7" />
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Inventory</p>
                            <h3 className="text-2xl font-bold text-foreground">{productsCount}</h3>
                        </motion.div>

                        <motion.div
                            variants={item}
                            className="bg-surface-container-high p-6 rounded-[32px] border border-border shadow-sm flex flex-col items-center text-center group active:scale-[0.98] transition-all"
                        >
                            <div className="w-14 h-14 rounded-full bg-google-green/10 flex items-center justify-center text-google-green mb-3 border border-google-green/10 group-hover:bg-google-green group-hover:text-white transition-all">
                                <Users className="w-7 h-7" />
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Customers</p>
                            <h3 className="text-2xl font-bold text-foreground">{customersCount}</h3>
                        </motion.div>
                    </div>
                </div>

                {/* Backup Status - Pill Style */}
                <motion.div
                    variants={item}
                    className="bg-surface-container-low border border-border p-4 rounded-[28px] flex items-center gap-4 group hover:bg-surface-container-high transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-google-green flex items-center justify-center text-white shrink-0">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">Cloud Sync Active</p>
                        <p className="text-[10px] text-muted-foreground truncate">Data is securely synchronized to cloud</p>
                    </div>
                    <span className="hidden sm:block px-3 py-1 bg-google-green/10 text-google-green text-[10px] font-bold rounded-full border border-google-green/10 uppercase tracking-widest">
                        Live
                    </span>
                </motion.div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase px-2">Quick Actions</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Create Bill', icon: Plus, color: 'bg-google-blue', action: onCreateInvoice },
                            { label: 'Daybook', icon: ArrowDownLeft, color: 'bg-google-red', action: () => onViewDaybook(new Date().toISOString().split('T')[0]) },
                            { label: 'Reports', icon: FileText, color: 'bg-google-yellow', action: onOpenReports },
                            { label: 'Add Client', icon: Users, color: 'bg-google-green', action: onAddCustomer },
                        ].map((shortcut, idx) => (
                            <motion.button
                                key={idx}
                                variants={item}
                                whileHover={{ y: -4, scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    HapticService.medium();
                                    shortcut.action();
                                }}
                                className="bg-surface-container-low hover:bg-surface-container-high p-6 rounded-[32px] border border-border shadow-sm flex flex-col items-center gap-3 transition-all group"
                            >
                                <div className={`w-16 h-16 rounded-[24px] ${shortcut.color} text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform transform-gpu`}>
                                    <shortcut.icon className="w-8 h-8" strokeWidth={2.5} />
                                </div>
                                <span className="text-sm font-bold text-foreground tracking-tight">{shortcut.label}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase px-2">Recent Activity</h3>
                        <button onClick={onOpenReports} className="text-[10px] font-bold text-google-blue uppercase tracking-widest hover:underline">View All</button>
                    </div>
                    <div className="bg-surface-container rounded-[32px] border border-border overflow-hidden divide-y divide-border/30">
                        {invoices.length === 0 ? (
                            <div className="py-12 text-center">
                                <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                                <p className="text-xs text-muted-foreground font-bold">No activity found</p>
                            </div>
                        ) : (
                            [...invoices]
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .slice(0, 8)
                                .map((inv) => (
                                    <motion.div
                                        key={inv.id}
                                        whileHover={{ backgroundColor: 'hsl(var(--surface-container-highest))' }}
                                        className="px-6 py-4 flex items-center justify-between cursor-pointer transition-colors"
                                        onClick={() => {
                                            HapticService.light();
                                            setSelectedForAction(inv);
                                        }}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-google-blue font-bold border border-border">
                                                {inv.customerName.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-foreground truncate">{inv.customerName}</p>
                                                <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5 uppercase tracking-widest">
                                                    #{inv.invoiceNumber}
                                                    <span className="w-1.5 h-1.5 rounded-full bg-border" />
                                                    {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-foreground">₹{inv.total.toLocaleString('en-IN')}</p>
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${inv.status === 'PAID' ? 'bg-google-green text-white shadow-sm' : 'bg-google-yellow/20 text-google-yellow border border-google-yellow/20'
                                                    }`}>
                                                    {inv.status}
                                                </span>
                                            </div>
                                            <MoreVertical className="w-5 h-5 text-muted-foreground/50" />
                                        </div>
                                    </motion.div>
                                ))
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Premium Action Sheet */}
            <AnimatePresence>
                {selectedForAction && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedForAction(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-surface-container-highest z-[101] rounded-t-[32px] p-6 pb-12 shadow-google-lg"
                        >
                            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6" />
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 rounded-[24px] bg-google-blue text-white flex items-center justify-center shadow-lg">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-2xl font-bold font-heading text-foreground truncate">{selectedForAction.customerName}</h2>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Bill #{selectedForAction.invoiceNumber}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {[
                                    { icon: Eye, label: 'View Details', sub: 'View or print full bill', color: 'bg-google-blue/10 text-google-blue', action: () => onViewInvoice(selectedForAction) },
                                    { icon: Users, label: 'Customer Ledger', sub: 'Statement & history', color: 'bg-google-red/10 text-google-red', action: () => onViewCustomerLedger(selectedForAction.customerId) },
                                    { icon: MessageCircle, label: 'Share Bill', sub: 'Send via WhatsApp', color: 'bg-google-green/10 text-google-green', action: () => onQuickShare(selectedForAction) },
                                ].map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            HapticService.medium();
                                            opt.action();
                                            setSelectedForAction(null);
                                        }}
                                        className="w-full p-4 rounded-[24px] flex items-center gap-4 hover:bg-surface-container-high transition-all active:scale-[0.98] group"
                                    >
                                        <div className={`w-12 h-12 rounded-full ${opt.color} flex items-center justify-center shrink-0`}>
                                            <opt.icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-bold text-foreground">{opt.label}</p>
                                            <p className="text-xs text-muted-foreground">{opt.sub}</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div >
    );
};

export default Dashboard;
