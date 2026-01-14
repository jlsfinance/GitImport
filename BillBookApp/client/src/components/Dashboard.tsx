
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Plus, FileText, Calculator,
    ChevronRight, Building2, Check,
    BarChart3, PieChart, Menu
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Invoice } from '../types';
import { HapticService } from '../services/hapticService';
import { formatDate } from '../utils/dateUtils';
import { useCompany } from '../contexts/CompanyContext';
import { BackupSettings } from './BackupSettings';

interface DashboardProps {
    onCreateInvoice: () => void;
    onCreateCreditNote: () => void;
    onViewInvoice: (invoice: Invoice) => void;
    onOpenReports: () => void;
    onOpenSmartCalc: () => void;
    onOpenAI: () => void;
    onToggleSidebar: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
    onViewInvoice, onOpenReports, onOpenSmartCalc, onOpenAI, onToggleSidebar
}) => {
    // Get company data from CompanyContext (Firestore)
    const { company, companies: allCompanies, switchCompany } = useCompany();

    const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'MONTH'>('MONTH');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [pendingInvoices, setPendingInvoices] = useState(0);

    // Daybook Metrics
    const [todaySales, setTodaySales] = useState(0);
    const [monthlySales, setMonthlySales] = useState(0);
    const [totalSales, setTotalSales] = useState(0);
    const [todayReceived, setTodayReceived] = useState(0);

    // Sales Period Slider: 0=Today, 1=Month, 2=Total
    const [salesPeriod, setSalesPeriod] = useState(0);

    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');

    const [metricIndex, setMetricIndex] = useState(0);
    const [adminAds, setAdminAds] = useState<any[]>([]);
    const [adIndex, setAdIndex] = useState(0);
    const [showBackupSettings, setShowBackupSettings] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        loadData();
        const interval = setInterval(() => loadData(), 2000);

        // Auto slide for Card 2
        const slideInterval = setInterval(() => {
            setMetricIndex(prev => (prev + 1) % 4);
        }, 3000);

        // Auto slide for Ads
        const adTimer = setInterval(() => {
            setAdIndex(prev => prev + 1);
        }, 5000);

        const handleScroll = () => {
            const mainContent = document.querySelector('main');
            const scrollTop = mainContent ? mainContent.scrollTop : window.scrollY;
            setScrolled(scrollTop > 10);
        };

        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.addEventListener('scroll', handleScroll);
        }
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            clearInterval(interval);
            clearInterval(slideInterval);
            clearInterval(adTimer);
            if (mainContent) mainContent.removeEventListener('scroll', handleScroll);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [timeFilter]);

    const loadData = () => {
        const allInvoices = StorageService.getInvoices();
        const allPayments = StorageService.getPayments();

        // Company is now from CompanyContext, not StorageService
        setAdminAds(StorageService.getAdminAds());

        // Date Filtering Logic
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // 1. Calculate Daybook Metrics (Strictly for TODAY)
        const todaysInvoices = allInvoices.filter(i => i.date === todayStr);
        const todaysPayments = allPayments.filter(p => p.date === todayStr);

        setTodaySales(todaysInvoices.reduce((sum, inv) => sum + inv.total, 0));
        setTodayReceived(todaysPayments.reduce((sum, p) => sum + p.amount, 0));

        // Calculate Monthly Sales
        const monthsInvoices = allInvoices.filter(i => {
            const invDate = new Date(i.date);
            return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
        });
        setMonthlySales(monthsInvoices.reduce((sum, inv) => sum + inv.total, 0));

        // Calculate Total Sales (All Time)
        setTotalSales(allInvoices.reduce((sum, inv) => sum + inv.total, 0));

        // 2. Filter Main Dashboard List (Current selection)
        const filteredInvoices = allInvoices.filter(inv => {
            const invDate = new Date(inv.date);
            if (timeFilter === 'TODAY') {
                return invDate.toDateString() === now.toDateString();
            } else if (timeFilter === 'MONTH') {
                return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
            }
            return true;
        });

        // 3. Sort ALL invoices by date for Recent Transactions (Latest first)
        const sortedInvoices = [...allInvoices].sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime() ||
                (parseInt(b.invoiceNumber.replace(/\D/g, '')) - parseInt(a.invoiceNumber.replace(/\D/g, '')));
        });

        setInvoices(sortedInvoices);
        setTotalRevenue(filteredInvoices.reduce((sum, inv) => sum + inv.total, 0));
        setPendingInvoices(allInvoices.filter(i => (i.total - (i.paidAmount || 0)) > 0).length);
    };

    const createNewCompany = () => {
        if (!newCompanyName.trim()) return;
        alert("Multi-company support coming soon!");
        setShowCreateDialog(false);
        setNewCompanyName('');
    };

    return (
        <div className="pb-32 bg-surface-container-low dark:bg-slate-950 min-h-screen">
            {/* Header Area - Material 3 Adaptive Top Bar */}
            <div className="px-4 pb-2 bg-surface/80 dark:bg-slate-900/80 sticky top-0 z-30 border-b border-outline-variant/50 backdrop-blur-md">
                <div className="flex items-center justify-between h-14 max-w-5xl mx-auto">

                    {/* Left: Nav Drawer Trigger */}
                    <div className="w-20 flex items-center justify-start">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                HapticService.light();
                                onToggleSidebar();
                            }}
                            className="p-3 rounded-full hover:bg-surface-container-high transition-colors"
                        >
                            <Menu className="w-6 h-6 text-on-surface" />
                        </motion.button>
                    </div>

                    {/* Center: Brand Ident (M3 Title Large) */}
                    <div className="flex-1 flex justify-center relative">
                        <button
                            onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                            className="flex flex-col items-center justify-center active:scale-95 transition-transform"
                        >
                            <h2 className="font-black text-base text-on-surface leading-none uppercase tracking-tighter">
                                {company?.name || 'My Business'}
                            </h2>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-google-blue mt-0.5 uppercase tracking-widest bg-google-blue/5 px-2 py-0.5 rounded-full border border-google-blue/10">
                                <span>Switch</span>
                                <ChevronRight className="w-2.5 h-2.5" />
                            </div>
                        </button>

                        <AnimatePresence>
                            {showCompanyDropdown && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 10, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        className="absolute top-full mt-2 w-64 bg-surface-container-high rounded-[28px] shadow-elevation-3 border border-outline-variant p-2 z-50 origin-top text-left"
                                    >
                                        <div className="max-h-60 overflow-y-auto space-y-1">
                                            {allCompanies.map((comp, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => { switchCompany(comp.id || 'default'); setShowCompanyDropdown(false); }}
                                                    className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${comp.id === company?.id ? 'bg-google-blue text-white' : 'hover:bg-surface-container-highest text-on-surface'}`}
                                                >
                                                    <Building2 className="w-4 h-4" />
                                                    <span className="flex-1 text-left font-bold text-xs truncate">{comp.name}</span>
                                                    {comp.id === company?.id && <Check className="w-3 h-3" />}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="h-px bg-outline-variant my-2 mx-2" />
                                        <button onClick={() => { setShowCompanyDropdown(false); setShowCreateDialog(true); }} className="w-full p-4 flex items-center gap-2 text-google-blue font-black text-xs rounded-2xl hover:bg-google-blue/5 transition-colors uppercase tracking-widest">
                                            <Plus className="w-4 h-4" /> Add Business
                                        </button>
                                    </motion.div>
                                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowCompanyDropdown(false)} />
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right: Tonal Button for Filter */}
                    <div className="w-20 flex justify-end">
                        <div className="bg-surface-container-high p-1 rounded-full flex items-center border border-outline-variant">
                            {['TODAY', 'MONTH'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => {
                                        HapticService.light();
                                        setTimeFilter(t as any)
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${timeFilter === t ? 'bg-surface text-google-blue' : 'text-on-surface-variant'}`}
                                >
                                    {t === 'TODAY' ? 'T' : 'M'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Animated Search Bar on Scroll - Buttery Smooth Spring Animation */}
                <AnimatePresence>
                    {scrolled && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, y: -20, scale: 0.95 }}
                            animate={{
                                height: 'auto',
                                opacity: 1,
                                y: 0,
                                scale: 1,
                                transition: {
                                    height: { type: "spring", stiffness: 300, damping: 30 },
                                    opacity: { duration: 0.2 },
                                    y: { type: "spring", stiffness: 300, damping: 30 },
                                    scale: { type: "spring", stiffness: 300, damping: 30 }
                                }
                            }}
                            exit={{
                                opacity: 0,
                                y: -20,
                                scale: 0.98,
                                transition: { duration: 0.15 }
                            }}
                            className="max-w-5xl mx-auto pb-4 pt-1 px-1 origin-top"
                        >
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-[20px] text-google-blue">search</span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search bills, items, or customers..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border-2 border-google-blue/30 rounded-[20px] py-4 pl-12 pr-4 text-sm font-bold text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-google-blue focus:ring-4 focus:ring-google-blue/10 shadow-xl shadow-google-blue/5 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-4 flex items-center text-on-surface-variant/40 hover:text-on-surface active:scale-90 transition-transform"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* DASHBOARD GRID - Material 3 Cards */}
            <div className="grid grid-cols-2 gap-3 px-4 mt-6">
                {/* 1. SALES CARD with Period Slider */}
                <motion.div className="col-span-1 h-36 rounded-[32px] bg-tertiary-container text-on-tertiary-container shadow-sm p-4 flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-xl bg-on-tertiary-container/10 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <div className="flex bg-on-tertiary-container/10 rounded-full p-0.5">
                            {['D', 'M', 'T'].map((label, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        HapticService.light();
                                        setSalesPeriod(idx);
                                    }}
                                    className={`px-2.5 py-1 rounded-full text-[8px] font-black transition-all ${salesPeriod === idx ? 'bg-on-tertiary-container text-tertiary-container' : 'text-on-tertiary-container/60'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => onOpenReports()} className="cursor-pointer">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                            {salesPeriod === 0 ? 'Day Sale' : salesPeriod === 1 ? 'Month Sale' : 'Total Sale'}
                        </p>
                        <h3 className="text-xl font-black tracking-tighter">
                            ₹{(salesPeriod === 0 ? todaySales : salesPeriod === 1 ? monthlySales : totalSales).toLocaleString('en-IN')}
                        </h3>
                        <p className="text-[9px] font-bold text-google-blue mt-0.5 uppercase tracking-wider">Reports &rarr;</p>
                    </motion.div>
                </motion.div>

                {/* 2. METRICS SLIDER */}
                <motion.div className="col-span-1 h-36 rounded-[32px] bg-primary-container text-on-primary-container shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={metricIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute inset-0 p-4 flex flex-col justify-between"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-on-primary-container/10 flex items-center justify-center">
                                {metricIndex === 0 && <BarChart3 className="w-5 h-5" />}
                                {metricIndex === 1 && <Check className="w-5 h-5" />}
                                {metricIndex === 2 && <PieChart className="w-5 h-5" />}
                                {metricIndex === 3 && <FileText className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                                    {metricIndex === 0 && (timeFilter === 'TODAY' ? "Sales Today" : "Sales Month")}
                                    {metricIndex === 1 && "Cash Received"}
                                    {metricIndex === 2 && "Est. Margin"}
                                    {metricIndex === 3 && "Pending Bills"}
                                </p>
                                <h3 className="text-xl font-black truncate tracking-tighter">
                                    {metricIndex === 0 && `₹${invoices.filter(inv => {
                                        const d = new Date(inv.date);
                                        const now = new Date();
                                        return timeFilter === 'TODAY' ? d.toDateString() === now.toDateString() : d.getMonth() === now.getMonth();
                                    }).reduce((s, i) => s + i.total, 0).toLocaleString('en-IN')}`}
                                    {metricIndex === 1 && `₹${(timeFilter === 'TODAY' ? todayReceived : todayReceived * 30).toLocaleString('en-IN')}`}
                                    {metricIndex === 2 && `₹${(totalRevenue * 0.2).toLocaleString('en-IN')}`}
                                    {metricIndex === 3 && `${pendingInvoices.toLocaleString('en-IN')}`}
                                </h3>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                    <div className="absolute bottom-3 right-4 flex gap-1.5">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === metricIndex ? 'bg-on-primary-container w-3' : 'bg-on-primary-container/20'}`} />
                        ))}
                    </div>
                </motion.div>

                {/* 3. SMART CALC */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onOpenSmartCalc} className="col-span-1 h-36 rounded-[32px] bg-secondary-container text-on-secondary-container p-4 flex flex-col justify-between cursor-pointer">
                    <div className="w-10 h-10 rounded-2xl bg-on-secondary-container/10 flex items-center justify-center">
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="font-black text-sm block uppercase tracking-tight">Smart Calc</span>
                        <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Calculations</span>
                    </div>
                </motion.div>

                {/* 5. JLS AI */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onOpenAI} className="col-span-1 h-36 rounded-[32px] bg-surface-container-highest text-on-surface p-4 flex flex-col justify-between cursor-pointer border border-outline-variant">
                    <div className="w-10 h-10 rounded-2xl bg-google-blue/10 flex items-center justify-center text-google-blue">
                        <span className="material-symbols-outlined text-[20px] font-black">smart_toy</span>
                    </div>
                    <div>
                        <span className="font-black text-sm block uppercase tracking-tight">JLS AI</span>
                        <span className="text-[9px] font-bold text-google-blue uppercase tracking-widest">Assistant</span>
                    </div>
                </motion.div>
            </div>

            {/* AD BANNER */}
            <div className="px-4 mt-6 mb-2 relative">
                <AnimatePresence mode="wait">
                    {(() => {
                        const currentAd = adminAds.length > 0 ? adminAds[adIndex % adminAds.length] : {
                            id: 'default',
                            title: 'AI Bill Scanning Live!',
                            content: 'Super Admin says: "Use JLS AI to scan bills instantly."',
                            gradient: 'from-blue-600 to-indigo-600',
                            type: 'UPDATE'
                        };

                        return (
                            <motion.div
                                key={currentAd.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className={`w-full h-40 rounded-[36px] bg-gradient-to-br ${currentAd.gradient || 'from-google-blue to-indigo-600'} p-6 flex flex-col justify-center shadow-lg shadow-google-blue/20`}
                            >
                                <div className="text-white">
                                    <span className="px-3 py-1 rounded-full bg-white/20 text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10 mb-3 inline-block">
                                        {currentAd.type || 'Update'}
                                    </span>
                                    <h3 className="text-xl font-black leading-tight tracking-tight mb-1">{currentAd.title}</h3>
                                    <p className="text-xs text-blue-50 mt-1 font-medium line-clamp-2 opacity-90">{currentAd.content}</p>
                                </div>
                            </motion.div>
                        );
                    })()}
                </AnimatePresence>
            </div>

            {/* RECENT TRANSACTIONS */}
            <div className="px-5 mt-8">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-[11px] font-black text-on-surface-variant uppercase tracking-[0.25em]">Recent Transactions</h3>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={onOpenReports} className="text-[10px] font-black text-google-blue uppercase tracking-widest bg-google-blue/5 px-3 py-1 rounded-full">
                        View All
                    </motion.button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[36px] border border-outline-variant/30 overflow-hidden shadow-sm">
                    {(() => {
                        const filtered = invoices.filter(inv =>
                            inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            inv.items.some(item => item.description.toLowerCase().includes(searchQuery.toLowerCase()))
                        );

                        if (filtered.length === 0) {
                            return (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <FileText className="w-6 h-6 opacity-40 mb-3" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                                        {searchQuery ? "No matches found" : "No recent activity"}
                                    </p>
                                </div>
                            );
                        }

                        return (
                            <div className="divide-y divide-outline-variant/10">
                                {filtered.map(inv => (
                                    <motion.div
                                        key={inv.id}
                                        whileTap={{ scale: 0.98 }}
                                        className="p-5 flex justify-between items-center cursor-pointer hover:bg-surface-container-low transition-colors"
                                        onClick={() => onViewInvoice(inv)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-google-blue/5 flex items-center justify-center text-google-blue text-sm font-bold">
                                                {inv.customerName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-on-surface leading-tight">{inv.customerName}</p>
                                                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter opacity-60 mt-0.5">
                                                    #{inv.invoiceNumber} • {formatDate(inv.date)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-sm text-on-surface">₹{inv.total.toLocaleString('en-IN')}</p>
                                            <div className={`text-[8px] font-black px-2 py-0.5 rounded-full inline-block mt-1 uppercase tracking-tighter ${inv.status === 'PAID' ? 'bg-google-green text-white shadow-sm shadow-google-green/20' : 'bg-google-red text-white shadow-sm shadow-google-red/20'}`}>
                                                {inv.status}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                                <div className="p-8 text-center bg-surface-container-low/30">
                                    <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">End of History</span>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            <AnimatePresence>
                {showCreateDialog && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-sm p-8">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">New Business</h2>
                            <input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Company Name" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold mb-4 outline-none border focus:border-blue-500" autoFocus />
                            <div className="flex gap-3">
                                <button onClick={() => setShowCreateDialog(false)} className="flex-1 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-xs uppercase tracking-widest">Cancel</button>
                                <button onClick={createNewCompany} className="flex-1 p-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest">Create</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="mt-12 mb-8 text-center opacity-40">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface">Made with ❤️ by Lavneet</p>
            </div>

            {showBackupSettings && <BackupSettings onClose={() => setShowBackupSettings(false)} />}
        </div>
    );
};

export default Dashboard;
