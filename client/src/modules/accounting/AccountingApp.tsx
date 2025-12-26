import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import MobileBottomNav from '../../components/MobileBottomNav';
import InvoiceView from '../../components/InvoiceView';
import CreateInvoice from '../../components/CreateInvoice';
import CreatePurchase from '../../components/CreatePurchase'; // Added
import AllInvoices from '../../pages/AllInvoices';
import Inventory from '../../components/Inventory';
import Customers from '../../components/Customers';
import Settings from '../../components/Settings';
import Daybook from '../../components/Daybook';
import Expenses from '../../components/Expenses';
import Payments from '../../components/Payments';
import Import from '../../components/Import';
import CustomerLedger from '../../components/CustomerLedger';
import Dashboard from '../../components/Dashboard';
import Reports from '../../components/Reports';
import { PublicBillView } from '../../components/PublicBillView';
import { ViewState, Invoice } from '@/types';
import { StorageService } from '../../services/storageService';
import { FirebaseService } from '../../services/firebaseService';
import { Contacts } from '@capacitor-community/contacts';
import { WhatsAppService } from '../../services/whatsappService';
import { Loader2, Menu as SidebarIcon, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useTheme } from 'next-themes';
import { HapticService } from '@/services/hapticService';
import { CompanyForm } from '@/components/CompanyForm';
import Auth from '@/components/Auth';
import { PermissionErrorModal } from '@/components/PermissionErrorModal';

const AccountingApp: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const { company, loading: companyLoading, permissionError } = useCompany();
    const { theme, setTheme } = useTheme();

    const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [purchases, setPurchases] = useState<Invoice[]>([]); // Added
    const [publicBillId, setPublicBillId] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [isCloudConnected, setIsCloudConnected] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [selectedDaybookDate, setSelectedDaybookDate] = useState<string | null>(null);
    const [selectedPaymentToEdit, setSelectedPaymentToEdit] = useState<any | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [startSmartCalc, setStartSmartCalc] = useState(false);
    const [showPostSaveActions, setShowPostSaveActions] = useState(false);

    useEffect(() => {
        const initApp = async () => {
            await StorageService.init(user?.uid || null);
            setInvoices(StorageService.getInvoices());
            setPurchases(StorageService.getPurchases()); // Added

            // Check cloud status
            const hasConfig = !!StorageService.getFirebaseConfig();
            const isReady = FirebaseService.isReady();
            setIsCloudConnected(hasConfig && isReady);

            // Handle Deep Links
            const path = window.location.pathname;
            if (path.startsWith('/view/')) {
                const invoiceId = path.split('/')[2];
                if (invoiceId) {
                    setPublicBillId(invoiceId);
                    setCurrentView(ViewState.PUBLIC_VIEW_INVOICE);
                }
            } else if (path.startsWith('/customer/')) {
                const parts = path.split('/');
                const custId = parts[2];
                if (custId && parts[3] === 'ledger') {
                    setSelectedCustomerId(custId);
                    setCurrentView(ViewState.CUSTOMER_LEDGER);
                }
            }

            setIsInitializing(false);
        };
        initApp();
    }, [user]);

    // Request Permissions on Startup
    useEffect(() => {
        const requestInitialPermissions = async () => {
            try {
                const perm = await Contacts.checkPermissions();
                if (perm.contacts !== 'granted') {
                    await Contacts.requestPermissions();
                }
            } catch (err) {
                console.warn("Permission request error on startup:", err);
            }
        };
        if (!isInitializing) {
            requestInitialPermissions();
        }
    }, [isInitializing]);

    useEffect(() => {
        if (!isInitializing) {
            setInvoices(StorageService.getInvoices());
            setPurchases(StorageService.getPurchases()); // Added
        }
    }, [currentView, isInitializing]);

    const handleViewInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setCurrentView(ViewState.VIEW_INVOICE);
    };

    const handleViewCustomerLedger = (customerId: string) => {
        setSelectedCustomerId(customerId);
        setCurrentView(ViewState.CUSTOMER_LEDGER);
    };

    const handleEditInvoice = (invoice: Invoice) => {
        setInvoiceToEdit(invoice);
        setCurrentView(ViewState.EDIT_INVOICE);
    };

    const handleSaveInvoice = (invoice: Invoice, showActions = false) => {
        if (currentView === ViewState.EDIT_INVOICE) {
            StorageService.updateInvoice(invoice);
        } else {
            StorageService.saveInvoice(invoice);
        }
        setInvoices(StorageService.getInvoices()); // Refresh state
        // Redirect to View Invoice immediately after save to allow sharing
        setSelectedInvoice(invoice);
        setShowPostSaveActions(showActions);
        setCurrentView(ViewState.VIEW_INVOICE);
        setInvoiceToEdit(null);
    };

    // Purchase Handlers
    const handleSavePurchase = (purchase: Invoice) => {
        if (currentView === ViewState.EDIT_PURCHASE) {
            StorageService.updatePurchase(purchase);
        } else {
            StorageService.savePurchase(purchase);
        }
        setPurchases(StorageService.getPurchases());
        setCurrentView(ViewState.PURCHASES);
        setInvoiceToEdit(null); // Reuse this state or create new one? reuse is risky if typing mismatch
        // Actually CreateInvoice uses `invoiceToEdit` state. CreatePurchase uses `initialPurchase`.
        // I should stick to `invoiceToEdit` but cast it, or create `purchaseToEdit`.
        // Let's use `invoiceToEdit` since Invoice type is same.
    };

    const handleEditPurchase = (purchase: Invoice) => {
        setInvoiceToEdit(purchase);
        setCurrentView(ViewState.EDIT_PURCHASE);
    };

    const handleQuickShare = (invoice: Invoice) => {
        const customer = StorageService.getCustomers().find(c => c.id === invoice.customerId);
        const company = StorageService.getCompanyProfile();
        WhatsAppService.shareInvoice(invoice, customer, company);
    };

    const handleViewDaybook = (date: string) => {
        setSelectedDaybookDate(date);
        setCurrentView(ViewState.DAYBOOK);
    };

    // Auth & Loading States
    if (authLoading || (user && companyLoading) || isInitializing) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-950 flex-col gap-6 animate-pulse">
                <div className="relative">
                    <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-12">
                        <SidebarIcon className="w-10 h-10 text-white -rotate-12" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-950 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                    </div>
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">BillBook</h1>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Initializing Secure Session</p>
                </div>
            </div>
        );
    }

    if (permissionError) {
        return <PermissionErrorModal />;
    }

    if (!user && currentView !== ViewState.PUBLIC_VIEW_INVOICE) {
        return <Auth />;
    }

    if (!company && currentView !== ViewState.PUBLIC_VIEW_INVOICE) {
        return <CompanyForm />;
    }

    const handleCreateNew = () => {
        setInvoiceToEdit(null);
        setStartSmartCalc(false);
        setCurrentView(ViewState.CREATE_INVOICE);
    };

    const handleOpenSmartCalc = () => {
        setInvoiceToEdit(null);
        setStartSmartCalc(true);
        setCurrentView(ViewState.CREATE_INVOICE);
    }

    // --- MAIN RENDER ---
    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans flex-col md:flex-row">
            {/* Sidebar - Desktop (Static) & Mobile (Drawer) */}
            <div
                className={`
          fixed inset-0 z-[100] md:relative md:z-auto
          ${isSidebarOpen ? 'flex' : (['VIEW_INVOICE', 'CREATE_INVOICE', 'EDIT_INVOICE', 'PUBLIC_VIEW_INVOICE', 'CREATE_PURCHASE', 'EDIT_PURCHASE'].includes(currentView) ? 'hidden' : 'hidden md:flex')}
        `}
            >
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-md md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
                <div className="relative h-full animate-in slide-in-from-left duration-300">
                    <Sidebar
                        currentView={currentView}
                        onClose={() => setIsSidebarOpen(false)}
                        onChangeView={(view) => {
                            if (view === ViewState.CREATE_INVOICE) {
                                setInvoiceToEdit(null);
                                setStartSmartCalc(false);
                            }
                            if (view === ViewState.IMPORT) {
                                setShowImport(true);
                            } else {
                                setCurrentView(view);
                            }
                            setIsSidebarOpen(false);
                        }}
                        isCloudConnected={isCloudConnected || !!user}
                    />
                </div>
            </div>

            <main className="flex-1 overflow-y-auto h-full relative w-full scroll-smooth bg-slate-50 dark:bg-slate-900">
                {!['VIEW_INVOICE', 'CREATE_INVOICE', 'EDIT_INVOICE', 'PUBLIC_VIEW_INVOICE', 'CREATE_PURCHASE', 'EDIT_PURCHASE'].includes(currentView) && (
                    <div className="md:hidden sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 h-16 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
                        >
                            <SidebarIcon className="w-6 h-6" />
                        </button>
                        <div className="flex-1 text-center px-4 overflow-hidden">
                            <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter truncate leading-tight">
                                {company?.name || 'BillBook'}
                            </h2>
                            <p className="text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest leading-tight">
                                {currentView.replace('_', ' ')}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setTheme(theme === 'dark' ? 'light' : 'dark');
                                HapticService.medium();
                            }}
                            className="p-2 -mr-2 rounded-xl text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
                        >
                            {theme === 'dark' ? <Sun className="w-6 h-6 text-yellow-500" /> : <Moon className="w-6 h-6 text-blue-600" />}
                        </button>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentView}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full h-full"
                    >
                        {currentView === ViewState.DASHBOARD && (
                            <Dashboard
                                invoices={invoices}
                                onViewInvoice={handleViewInvoice}
                                onViewCustomerLedger={handleViewCustomerLedger}
                                onViewDaybook={handleViewDaybook}
                                onQuickShare={handleQuickShare}
                                onCreateInvoice={handleCreateNew}
                                onOpenReports={() => setCurrentView(ViewState.REPORTS)}
                                onAddCustomer={() => setCurrentView(ViewState.CUSTOMERS)}
                                onOpenSmartCalc={handleOpenSmartCalc}
                            />
                        )}
                        {(currentView === ViewState.INVOICES || currentView === ViewState.ALL_INVOICES) && (
                            <AllInvoices
                                invoices={invoices}
                                onView={handleViewInvoice}
                                onEdit={handleEditInvoice}
                                onViewLedger={handleViewCustomerLedger}
                                onDelete={(inv) => {
                                    StorageService.deleteInvoice(inv.id);
                                    setInvoices(StorageService.getInvoices());
                                }}
                            />
                        )}
                        {currentView === ViewState.DAYBOOK && <Daybook initialDate={selectedDaybookDate} />}
                        {currentView === ViewState.INVENTORY && <Inventory />}
                        {currentView === ViewState.EXPENSES && <Expenses onBack={() => setCurrentView(ViewState.DASHBOARD)} />}
                        {currentView === ViewState.PAYMENTS && (
                            <Payments
                                onBack={() => {
                                    setCurrentView(ViewState.DASHBOARD);
                                    setSelectedPaymentToEdit(null);
                                }}
                                initialPayment={selectedPaymentToEdit}
                            />
                        )}

                        {/* PURCHASES LIST */}
                        {currentView === ViewState.PURCHASES && (
                            <AllInvoices
                                invoices={purchases}
                                onView={(inv) => {
                                    // For now, no separate view for purchase, maybe just Edit?
                                    // Or generic InvoiceView.
                                    handleEditPurchase(inv);
                                }}
                                onEdit={handleEditPurchase}
                                onViewLedger={handleViewCustomerLedger} // Works for Vendor if ID matches
                                onDelete={(inv) => {
                                    StorageService.deletePurchase(inv.id);
                                    setPurchases(StorageService.getPurchases());
                                }}
                            />
                        )}

                        {/* CREATE PURCHASE */}
                        {currentView === ViewState.CREATE_PURCHASE && (
                            <CreatePurchase
                                onSave={handleSavePurchase}
                                onCancel={() => setCurrentView(ViewState.DASHBOARD)} // Or Inventory?
                            />
                        )}

                        {/* EDIT PURCHASE */}
                        {currentView === ViewState.EDIT_PURCHASE && invoiceToEdit && (
                            <CreatePurchase
                                onSave={handleSavePurchase}
                                onCancel={() => setCurrentView(ViewState.PURCHASES)}
                                initialPurchase={invoiceToEdit}
                            />
                        )}

                        {currentView === ViewState.REPORTS && (
                            <Reports
                                onBack={() => setCurrentView(ViewState.DASHBOARD)}
                                onViewLedger={handleViewCustomerLedger}
                            />
                        )}
                        {currentView === ViewState.CUSTOMERS && <Customers onEditInvoice={handleEditInvoice} onBack={() => setCurrentView(ViewState.DASHBOARD)} />}
                        {currentView === ViewState.SETTINGS && <Settings />}
                        {currentView === ViewState.IMPORT && <Import onClose={() => setCurrentView(ViewState.DASHBOARD)} onImportComplete={() => { }} />}

                        {currentView === ViewState.CUSTOMER_LEDGER && selectedCustomerId && (
                            <CustomerLedger
                                customerId={selectedCustomerId}
                                onBack={() => setCurrentView(ViewState.DASHBOARD)}
                                onViewInvoice={handleViewInvoice}
                                onEditPayment={(payment) => {
                                    setSelectedPaymentToEdit(payment);
                                    setCurrentView(ViewState.PAYMENTS);
                                }}
                            />
                        )}

                        {currentView === ViewState.CREATE_INVOICE && (
                            <CreateInvoice
                                onSave={handleSaveInvoice}
                                onCancel={() => setCurrentView(ViewState.INVOICES)}
                                startSmartCalc={startSmartCalc}
                            />
                        )}

                        {currentView === ViewState.EDIT_INVOICE && invoiceToEdit && (
                            <CreateInvoice
                                onSave={handleSaveInvoice}
                                onCancel={() => setCurrentView(ViewState.INVOICES)}
                                initialInvoice={invoiceToEdit}
                            />
                        )}

                        {currentView === ViewState.VIEW_INVOICE && selectedInvoice && (
                            <InvoiceView
                                invoice={selectedInvoice}
                                onBack={() => setCurrentView(ViewState.INVOICES)}
                                onEdit={handleEditInvoice}
                                onViewLedger={handleViewCustomerLedger}
                                showPostSaveActions={showPostSaveActions}
                                onClosePostSaveActions={() => setShowPostSaveActions(false)}
                            />
                        )}

                        {currentView === ViewState.PUBLIC_VIEW_INVOICE && publicBillId && (
                            <PublicBillView billId={publicBillId} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            {!['VIEW_INVOICE', 'CREATE_INVOICE', 'EDIT_INVOICE', 'PUBLIC_VIEW_INVOICE', 'CREATE_PURCHASE', 'EDIT_PURCHASE'].includes(currentView) && (
                <div className="md:hidden">
                    <MobileBottomNav currentView={currentView} onChangeView={(view) => {
                        if (view === ViewState.CREATE_INVOICE) {
                            handleCreateNew();
                        } else if (view === ViewState.IMPORT) {
                            setShowImport(true);
                        } else {
                            setCurrentView(view);
                        }
                    }} />
                </div>
            )}

            {showImport && currentView !== ViewState.IMPORT && (
                <Import
                    onClose={() => setShowImport(false)}
                    onImportComplete={() => {
                        setInvoices(StorageService.getInvoices());
                        setCurrentView(ViewState.INVENTORY);
                    }}
                />
            )}
        </div>
    );
};

export default AccountingApp;
