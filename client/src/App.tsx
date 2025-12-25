
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MobileBottomNav from './components/MobileBottomNav';
import InvoiceView from './components/InvoiceView';
import CreateInvoice from './components/CreateInvoice';
import AllInvoices from './pages/AllInvoices';
import Inventory from './components/Inventory';
import Customers from './components/Customers';
import Settings from './components/Settings';
import Daybook from './components/Daybook';
import Expenses from './components/Expenses';
import Payments from './components/Payments';
import Import from './components/Import';
import CustomerLedger from './components/CustomerLedger';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import { ViewState, Invoice } from './types';
import { StorageService } from './services/storageService';
import { FirebaseService } from './services/firebaseService';
import { WhatsAppService } from './services/whatsappService';
import { Loader2, Menu as SidebarIcon, Sun, Moon } from 'lucide-react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CompanyProvider, useCompany } from '@/contexts/CompanyContext';
import { useTheme } from 'next-themes';
import { HapticService } from '@/services/hapticService';
import { CompanyForm } from '@/components/CompanyForm';
import Auth from '@/components/Auth';
import { PermissionErrorModal } from '@/components/PermissionErrorModal';

const AppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { company, loading: companyLoading, permissionError } = useCompany();
  const { theme, setTheme } = useTheme();

  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedDaybookDate, setSelectedDaybookDate] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      await StorageService.init(user?.uid || null);
      setInvoices(StorageService.getInvoices());

      // Check cloud status
      const hasConfig = !!StorageService.getFirebaseConfig();
      const isReady = FirebaseService.isReady();
      setIsCloudConnected(hasConfig && isReady);

      setIsInitializing(false);
    };
    initApp();
  }, [user]);

  useEffect(() => {
    if (!isInitializing) {
      setInvoices(StorageService.getInvoices());
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

  const handleSaveInvoice = (invoice: Invoice) => {
    if (currentView === ViewState.EDIT_INVOICE) {
      StorageService.updateInvoice(invoice);
    } else {
      StorageService.saveInvoice(invoice);
    }
    // Redirect to View Invoice immediately after save to allow sharing
    setSelectedInvoice(invoice);
    setCurrentView(ViewState.VIEW_INVOICE);
    setInvoiceToEdit(null);
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
  if (authLoading || (user && companyLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 flex-col gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading...</p>
      </div>
    );
  }

  if (permissionError) {
    return <PermissionErrorModal />;
  }

  if (!user) {
    return <Auth />;
  }

  if (!company) {
    return <CompanyForm />;
  }

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 flex-col gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading Data...</p>
      </div>
    )
  }

  // View Handler Logic
  const handleCreateNew = () => {
    setInvoiceToEdit(null);
    setCurrentView(ViewState.CREATE_INVOICE);
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- MAIN RENDER ---
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans flex-col md:flex-row">
      {/* Sidebar - Desktop (Static) & Mobile (Drawer) */}
      <div className={`
        fixed inset-0 z-[100] md:relative md:z-auto md:block
        ${isSidebarOpen ? 'block' : 'hidden'}
      `}>
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
        <div className="relative h-full w-72 md:w-auto">
          <Sidebar
            currentView={currentView}
            onChangeView={(view) => {
              if (view === ViewState.CREATE_INVOICE) setInvoiceToEdit(null);
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-full relative w-full scroll-smooth">
        {/* Mobile Header with Hamburger (Visible only on mobile and when not in a detailed view) */}
        {!['VIEW_INVOICE', 'CREATE_INVOICE', 'EDIT_INVOICE'].includes(currentView) && (
          <div className="md:hidden sticky top-0 z-30 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md px-4 h-14 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
            >
              <SidebarIcon className="w-6 h-6" />
            </button>
            <div className="flex-1 text-center font-bold text-slate-800 dark:text-slate-100">
              {currentView.replace('_', ' ')}
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
          />
        )}
        {currentView === ViewState.INVOICES && (
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

        {currentView === ViewState.ALL_INVOICES && (
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
        {currentView === ViewState.PAYMENTS && <Payments onBack={() => setCurrentView(ViewState.DASHBOARD)} />}
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
          />
        )}

        {currentView === ViewState.CREATE_INVOICE && (
          <CreateInvoice
            onSave={handleSaveInvoice}
            onCancel={() => setCurrentView(ViewState.INVOICES)}
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
          />
        )}
      </main>

      {/* Mobile Bottom Navigation - Visible only on Mobile */}
      <div className="md:hidden">
        <MobileBottomNav
          currentView={currentView}
          onChangeView={(view) => {
            if (view === ViewState.CREATE_INVOICE) setInvoiceToEdit(null);
            if (view === ViewState.IMPORT) {
              setShowImport(true); // Or navigate to import view
            } else {
              setCurrentView(view);
            }
          }}
        />
      </div>

      {/* Import Modal */}
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

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CompanyProvider>
        <AppContent />
      </CompanyProvider>
    </AuthProvider>
  );
};

export default App;
