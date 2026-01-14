import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import MobileBottomNav from '../../components/MobileBottomNav';
import InvoiceView from '../../components/InvoiceView';
import CreateInvoice from '../../components/CreateInvoice';
import CreatePurchase from '../../components/CreatePurchase';
import SmartCalculator from './pages/SmartCalculator';
import CreditNote from './pages/CreditNote'; // Added
import AllInvoices from '../../pages/AllInvoices';
import Inventory from '../../components/Inventory';
import Customers from '../../components/Customers';
import Settings from '../../components/Settings';
import Daybook from '../../components/Daybook';
import Expenses from '../../components/Expenses';
import Payments from '../../components/Payments';
import Import from '../../components/Import';

import Dashboard from '../../components/Dashboard';
import Reports from '../../components/Reports';
import { PublicBillView } from '../../components/PublicBillView';
import { BackupSettings } from '../../components/BackupSettings';
import { ViewState, Invoice } from '@/types';
import { StorageService } from '../../services/storageService';
import { FirebaseService } from '../../services/firebaseService';
import { WhatsAppService } from '../../services/whatsappService';
import { Menu as SidebarIcon, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useTheme } from 'next-themes';
import { HapticService } from '@/services/hapticService';
import { CompanyForm } from '@/components/CompanyForm';
import Auth from '@/components/Auth';
import { PermissionErrorModal } from '@/components/PermissionErrorModal';
import { showErrorAlert } from '@/utils/errorCodes';
import { WhatsAppNumberModal } from '@/components/WhatsAppNumberModal';
import { SearchProvider } from '@/contexts/SearchContext';
import GlobalSearch from '@/components/GlobalSearch';

const AccountingApp: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const { company, loading: companyLoading, permissionError } = useCompany();
    const { theme, setTheme } = useTheme();

    const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    // const [invoices, setInvoices] = useState<Invoice[]>([]); // Removed unused
    const [purchases, setPurchases] = useState<Invoice[]>([]); // Added
    const [publicBillId, setPublicBillId] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [isCloudConnected, setIsCloudConnected] = useState(false);
    const [showImport, setShowImport] = useState(false);
    // const [selectedDaybookDate, setSelectedDaybookDate] = useState<string | null>(null); // Removed unused
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [startSmartCalc, setStartSmartCalc] = useState(false);
    const [startAI, setStartAI] = useState(false);
    const [triggerPaymentCreate, setTriggerPaymentCreate] = useState(0);
    const [showPostSaveActions, setShowPostSaveActions] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [pendingShareInvoice, setPendingShareInvoice] = useState<Invoice | null>(null);
    const [showBackupSettings, setShowBackupSettings] = useState(false);

    useEffect(() => {
        const initApp = async () => {
            try {
                await StorageService.init(user?.uid || null);
                // setInvoices(StorageService.getInvoices());
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
            } catch (error) {
                showErrorAlert('DATA_LOAD_FAILED', error);
            } finally {
                setIsInitializing(false);
            }
        };
        initApp();
    }, [user]);


    useEffect(() => {
        if (!isInitializing) {
            // setInvoices(StorageService.getInvoices());
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
            // Check if it's a Credit Note
            if (invoice.type === 'CREDIT_NOTE') {
                StorageService.saveCreditNote(invoice);
            } else {
                StorageService.saveInvoice(invoice);
            }
        }

        // Refresh Data
        // setInvoices(StorageService.getInvoices());
        // setCustomers(StorageService.getCustomers()); // Balance updates - This state is not defined in the current scope.
        // ... (rest depends on context, usually re-fetching is good)

        // Show Actions if requested (Print/Share)
        if (showActions) {
            // setLastSavedInvoice(invoice); // This state is not defined in the current scope.
            // setShowInvoiceActions(true); // This state is not defined in the current scope.
            setSelectedInvoice(invoice); // Use existing state for selected invoice
            setShowPostSaveActions(true); // Use existing state for post save actions
            setCurrentView(ViewState.VIEW_INVOICE); // Stay on view invoice to show actions
        } else {
            setCurrentView(ViewState.DASHBOARD);
        }

        // Reset Edit State
        setInvoiceToEdit(null);
        setStartSmartCalc(false);
        setSelectedCustomerId(null);
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



    const handleDeleteInvoice = (invoice: Invoice) => {
        StorageService.deleteInvoice(invoice.id);
        // setInvoices(StorageService.getInvoices());
        if (selectedInvoice?.id === invoice.id) setSelectedInvoice(null);
    };

    const handleDeletePurchase = (purchase: Invoice) => {
        StorageService.deletePurchase(purchase.id);
        setPurchases(StorageService.getPurchases());
        if (selectedInvoice?.id === purchase.id) setSelectedInvoice(null);
    };

    const handleOpenAI = () => {
        setStartAI(true);
        setShowImport(true);
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
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">JLS Suite</h1>
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
        setSelectedCustomerId(null); // Ensure no customer is pre-selected for generic create
        setCurrentView(ViewState.CREATE_INVOICE);
    };

    const handleGlobalFabClick = () => {
        HapticService.medium();
        if (currentView === ViewState.PURCHASES) {
            setCurrentView(ViewState.CREATE_PURCHASE);
        } else if (currentView === ViewState.PAYMENTS) {
            setTriggerPaymentCreate(prev => prev + 1);
        } else {
            // Default Action: Create Sale (Invoice)
            // We can also check if we are in dashboard, invoices, etc.
            handleCreateNew();
        }
    };

    const handleOpenSmartCalc = () => {
        setInvoiceToEdit(null);
        setStartSmartCalc(false); // Reset this flag as we are using dedicated view now
        setSelectedCustomerId(null);
        setCurrentView(ViewState.SMART_CALCULATOR);
    }

    // Handler for search result selection
    const handleSearchSelectInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setCurrentView(ViewState.VIEW_INVOICE);
    };

    const handleSearchSelectCustomer = (customer: any) => {
        setSelectedCustomerId(customer.id);
        setCurrentView(ViewState.CUSTOMER_LEDGER);
    };

    return (
        <SearchProvider>
            <div
                className="flex h-screen h-[100dvh] w-full bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans flex-col md:flex-row"
            >
                {/* Global Search - Scroll Direction Based */}
                <GlobalSearch
                    onSelectInvoice={handleSearchSelectInvoice}
                    onSelectCustomer={handleSearchSelectCustomer}
                />
                {/* Sidebar - Desktop (Static) & Mobile (Drawer) */}
                <div
                    className={`
          fixed inset-0 z-[100] md:relative md:z-auto
          ${isSidebarOpen ? 'flex' : (['VIEW_INVOICE', 'CREATE_INVOICE', 'EDIT_INVOICE', 'PUBLIC_VIEW_INVOICE', 'CREATE_PURCHASE', 'EDIT_PURCHASE', 'SMART_CALCULATOR', 'CREDIT_NOTE', 'CREATE_CREDIT_NOTE', 'CUSTOMER_LEDGER', 'REPORTS'].includes(currentView) ? 'hidden' : 'hidden md:flex')}
        `}
                >
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                    <div className="relative h-full animate-in slide-in-from-left duration-300">
                        <Sidebar
                            currentView={currentView}
                            isOpen={isSidebarOpen}
                            onClose={() => setIsSidebarOpen(false)}
                            isCloudConnected={isCloudConnected}
                            onNavigate={(view) => {
                                if (view === ViewState.CREATE_INVOICE) {
                                    setInvoiceToEdit(null);
                                    setStartSmartCalc(false);
                                    setSelectedCustomerId(null);
                                }
                                if (view === ViewState.IMPORT) {
                                    setShowImport(true);
                                } else {
                                    setCurrentView(view);
                                }
                                setIsSidebarOpen(false);
                            }}
                            onOpenBackup={() => setShowBackupSettings(true)}
                        />
                    </div>
                </div>

                <main className="flex-1 overflow-y-auto h-full relative w-full scroll-smooth bg-slate-50 dark:bg-slate-900 pb-20 md:pb-0">
                    {!['DASHBOARD', 'VIEW_INVOICE', 'CREATE_INVOICE', 'EDIT_INVOICE', 'PUBLIC_VIEW_INVOICE', 'CREATE_PURCHASE', 'EDIT_PURCHASE', 'SMART_CALCULATOR', 'CREDIT_NOTE', 'CREATE_CREDIT_NOTE', 'CUSTOMER_LEDGER', 'REPORTS'].includes(currentView) && (
                        <div className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                            <div className="h-16 px-4 flex items-center justify-between">
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
                                >
                                    <SidebarIcon className="w-6 h-6" />
                                </button>
                                <div className="flex-1 text-center px-4 overflow-hidden">
                                    <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter truncate leading-tight">
                                        {company?.name || 'JLS Suite'}
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
                                    onCreateInvoice={handleCreateNew}
                                    onCreateCreditNote={() => setCurrentView(ViewState.CREATE_CREDIT_NOTE)}
                                    onViewInvoice={handleViewInvoice}
                                    onOpenReports={() => setCurrentView(ViewState.REPORTS)}
                                    onOpenSmartCalc={handleOpenSmartCalc}
                                    onOpenAI={handleOpenAI}
                                    onToggleSidebar={() => setIsSidebarOpen(true)}
                                />
                            )}

                            {currentView === ViewState.INVENTORY && <Inventory />}
                            {(currentView === ViewState.CUSTOMERS || currentView === ViewState.CUSTOMER_LEDGER) && (
                                <Customers
                                    onEditInvoice={handleEditInvoice}
                                    initialCustomerId={currentView === ViewState.CUSTOMER_LEDGER ? selectedCustomerId || undefined : undefined}
                                    onBack={() => {
                                        setCurrentView(ViewState.DASHBOARD);
                                        setSelectedCustomerId(null);
                                    }}
                                />
                            )}
                            {currentView === ViewState.DAYBOOK && <Daybook onViewCustomerLedger={handleViewCustomerLedger} />}
                            {currentView === ViewState.EXPENSES && <Expenses />}
                            {currentView === ViewState.PAYMENTS && <Payments onBack={() => setCurrentView(ViewState.DASHBOARD)} createTrigger={triggerPaymentCreate} />}
                            {currentView === ViewState.REPORTS && <Reports onBack={() => setCurrentView(ViewState.DASHBOARD)} />}
                            {(currentView === ViewState.ALL_INVOICES || currentView === ViewState.INVOICES) && <AllInvoices title="Sales" createLabel="Add Sale" onView={handleViewInvoice} onEdit={handleEditInvoice} onDelete={handleDeleteInvoice} onViewLedger={handleViewCustomerLedger} />}
                            {currentView === ViewState.PURCHASES && <AllInvoices title="Purchases" createLabel="Add Purchase" invoices={purchases} onView={handleViewInvoice} onEdit={handleEditPurchase} onDelete={handleDeletePurchase} onViewLedger={handleViewCustomerLedger} />}
                            {currentView === ViewState.SETTINGS && <Settings />}

                            {currentView === ViewState.VIEW_INVOICE && selectedInvoice && (
                                <InvoiceView
                                    invoice={selectedInvoice}
                                    onBack={() => { setSelectedInvoice(null); setCurrentView(ViewState.DASHBOARD); }}
                                    onEdit={() => handleEditInvoice(selectedInvoice)}
                                    onDelete={(inv) => {
                                        if (inv.type === 'PURCHASE') handleDeletePurchase(inv);
                                        else handleDeleteInvoice(inv);
                                        setSelectedInvoice(null);
                                        setCurrentView(ViewState.DASHBOARD);
                                    }}
                                    showPostSaveActions={showPostSaveActions}
                                    onClosePostSaveActions={() => setShowPostSaveActions(false)}
                                />
                            )}




                            {(currentView === ViewState.CREATE_INVOICE || currentView === ViewState.EDIT_INVOICE || currentView === ViewState.CREATE_CREDIT_NOTE) && (
                                <CreateInvoice
                                    initialInvoice={invoiceToEdit}
                                    initialCustomerId={selectedCustomerId || undefined}
                                    startSmartCalc={startSmartCalc}
                                    onSave={handleSaveInvoice}
                                    onCancel={() => { setCurrentView(ViewState.DASHBOARD); setInvoiceToEdit(null); setStartSmartCalc(false); setSelectedCustomerId(null); }}
                                    isCreditNote={currentView === ViewState.CREATE_CREDIT_NOTE}
                                />
                            )}

                            {currentView === ViewState.CREATE_PURCHASE && (
                                <CreatePurchase
                                    initialPurchase={invoiceToEdit}
                                    onSave={handleSavePurchase}
                                    onCancel={() => { setCurrentView(ViewState.PURCHASES); setInvoiceToEdit(null); }}
                                />
                            )}

                            {currentView === ViewState.SMART_CALCULATOR && (
                                <SmartCalculator
                                    onBack={() => setCurrentView(ViewState.DASHBOARD)}
                                    onSaveSuccess={() => {
                                        // Refresh invoice list and maybe go to view it?
                                        // For now just refresh global state if needed
                                        // setInvoices(StorageService.getInvoices());
                                    }}
                                />
                            )}

                            {currentView === ViewState.CREDIT_NOTE && (
                                <CreditNote
                                    onBack={() => setCurrentView(ViewState.DASHBOARD)}
                                    onSaveSuccess={() => {
                                        // setInvoices(StorageService.getInvoices());
                                    }}
                                />
                            )}

                            {currentView === ViewState.PUBLIC_VIEW_INVOICE && publicBillId && (
                                <PublicBillView billId={publicBillId} />
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {showImport && (
                        <Import
                            onClose={() => {
                                setShowImport(false);
                                setStartAI(false);
                                if (currentView === ViewState.IMPORT) setCurrentView(ViewState.DASHBOARD);
                            }}
                            onImportComplete={() => {
                                // setInvoices(StorageService.getInvoices());
                                if (currentView === ViewState.IMPORT) setCurrentView(ViewState.INVENTORY);
                            }}
                            startWithAI={startAI}
                        />
                    )}
                </main>

                {!['VIEW_INVOICE', 'CREATE_INVOICE', 'EDIT_INVOICE', 'PUBLIC_VIEW_INVOICE', 'CREATE_PURCHASE', 'EDIT_PURCHASE', 'SMART_CALCULATOR', 'CREDIT_NOTE', 'CREATE_CREDIT_NOTE', 'CUSTOMER_LEDGER', 'REPORTS'].includes(currentView) && (
                    <MobileBottomNav
                        currentView={currentView}
                        onChangeView={(view) => {
                            if (view === ViewState.IMPORT) {
                                setShowImport(true);
                            } else {
                                setCurrentView(view);
                            }
                        }}
                        onFabClick={handleGlobalFabClick}
                    />
                )}

                <WhatsAppNumberModal
                    isOpen={showWhatsAppModal}
                    onClose={() => setShowWhatsAppModal(false)}
                    onSubmit={(phone) => {
                        if (pendingShareInvoice) {
                            const customer = StorageService.getCustomers().find(c => c.id === pendingShareInvoice.customerId);
                            const company = StorageService.getCompanyProfile();
                            WhatsAppService.shareInvoice(pendingShareInvoice, customer, company, phone);
                            setPendingShareInvoice(null);
                        }
                    }}
                />

                {/* Backup Settings Modal */}
                {showBackupSettings && (
                    <BackupSettings onClose={() => setShowBackupSettings(false)} />
                )}
            </div>
        </SearchProvider>
    );
};

export default AccountingApp;

