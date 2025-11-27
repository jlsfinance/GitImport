
import React, { useState, useEffect } from 'react';
import { Switch, Route, Link, useLocation } from "wouter";
import Sidebar from './components/Sidebar';
import InvoiceView from './components/InvoiceView';
import CreateInvoice from './components/CreateInvoice';
import Inventory from './components/Inventory';
import Customers from './components/Customers';
import Settings from './components/Settings';
import Daybook from './components/Daybook';
import Import from './components/Import';
import CustomerLedger from './components/CustomerLedger';
import { ViewState, Invoice } from './types';
import { StorageService } from './services/storageService';
import { FirebaseService } from './services/firebaseService';
import { WhatsAppService } from './services/whatsappService';
import { ArrowRight, DollarSign, Package, Users, Edit, Loader2, MessageCircle } from 'lucide-react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CompanyProvider, useCompany } from '@/contexts/CompanyContext';
import { CompanyForm } from '@/components/CompanyForm';
import Auth from '@/components/Auth';
import ForgotPassword from '@/components/ForgotPassword';
import { PermissionErrorModal } from '@/components/PermissionErrorModal';

const AppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { company, loading: companyLoading, permissionError } = useCompany();
  const [location, setLocation] = useLocation();
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const initApp = async () => {
        await StorageService.init(user?.uid || null);
        setInvoices(StorageService.getInvoices());
        
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
  }, [isInitializing, location]);

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setLocation(`/invoices/${invoice.id}`);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setInvoiceToEdit(invoice);
    setLocation(`/invoices/${invoice.id}/edit`);
  };
  
  const handleViewCustomer = (customerId: string) => {
    setLocation(`/customers/${customerId}/ledger`);
  };

  const handleSaveInvoice = (invoice: Invoice) => {
    if (invoiceToEdit) {
      StorageService.updateInvoice(invoice);
    } else {
      StorageService.saveInvoice(invoice);
    }
    setSelectedInvoice(invoice);
    setLocation(`/invoices/${invoice.id}`);
    setInvoiceToEdit(null);
  };

  const handleQuickShare = (invoice: Invoice) => {
      const customer = StorageService.getCustomers().find(c => c.id === invoice.customerId);
      const company = StorageService.getCompanyProfile();
      WhatsAppService.shareInvoice(invoice, customer, company);
  };

  const Dashboard = () => {
    const totalRevenue = invoices.reduce((acc, inv) => acc + inv.total, 0);
    const pendingInvoices = invoices.filter(i => i.status === 'PENDING').length;
    
    return (
        <div className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-slate-800">Business Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500">Total Revenue</p>
                            <p className="text-2xl font-bold text-slate-800">₹{totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-full"><DollarSign className="w-6 h-6 text-blue-500"/></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500">Pending Invoices</p>
                            <p className="text-2xl font-bold text-slate-800">{pendingInvoices}</p>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-full"><Users className="w-6 h-6 text-orange-500"/></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500">Products Active</p>
                            <p className="text-2xl font-bold text-slate-800">{StorageService.getProducts().length}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-full"><Package className="w-6 h-6 text-green-500"/></div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <h3 className="font-bold text-lg mb-4 text-slate-800">Recent Invoices</h3>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                        <thead>
                            <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                                <th className="pb-3">Invoice #</th>
                                <th className="pb-3">Customer</th>
                                <th className="pb-3">Date</th>
                                <th className="pb-3 text-right">Amount</th>
                                <th className="pb-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {invoices.slice(0, 5).map(inv => (
                                <tr key={inv.id} className="text-sm hover:bg-gray-50">
                                    <td className="py-3 font-medium text-blue-600 cursor-pointer hover:underline" onClick={() => handleViewInvoice(inv)}>{inv.invoiceNumber}</td>
                                    <td className="py-3 cursor-pointer hover:underline" onClick={() => handleViewCustomer(inv.customerId)}>{inv.customerName}</td>
                                    <td className="py-3 text-gray-500 cursor-pointer hover:underline" onClick={() => setLocation('/daybook')}>{inv.date}</td>
                                    <td className="py-3 text-right font-medium">₹{inv.total.toFixed(2)}</td>
                                    <td className="py-3 text-center flex justify-center gap-3">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleQuickShare(inv); }} 
                                            className="text-green-500 hover:text-green-700"
                                            title="Share on WhatsApp"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleViewInvoice(inv)} className="text-gray-400 hover:text-blue-600">
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  };

  const InvoiceList = () => (
    <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">All Invoices</h2>
            <button onClick={() => setLocation('/invoices/new')} className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700">Create New</button>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                    <thead className="bg-slate-50 border-b">
                        <tr className="text-left text-xs font-medium text-slate-500 uppercase">
                            <th className="px-6 py-4">Invoice #</th>
                            <th className="px-6 py-4">Customer</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Due Date</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                            <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {invoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-blue-600 cursor-pointer" onClick={() => handleViewInvoice(inv)}>{inv.invoiceNumber}</td>
                                <td className="px-6 py-4 cursor-pointer hover:underline" onClick={() => handleViewCustomer(inv.customerId)}>{inv.customerName}</td>
                                <td className="px-6 py-4 text-slate-500 cursor-pointer" onClick={() => handleViewInvoice(inv)}>{inv.date}</td>
                                <td className="px-6 py-4 text-slate-500 cursor-pointer" onClick={() => handleViewInvoice(inv)}>{inv.dueDate}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800 cursor-pointer" onClick={() => handleViewInvoice(inv)}>₹{inv.total.toFixed(2)}</td>
                                <td className="px-6 py-4 text-center flex justify-center gap-3">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleQuickShare(inv); }} 
                                      className="text-green-500 hover:text-green-700 text-sm font-medium flex items-center gap-1"
                                      title="Share"
                                    >
                                      <MessageCircle className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleViewInvoice(inv)} 
                                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                      View
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleEditInvoice(inv); }} 
                                      className="text-orange-500 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                                    >
                                      <Edit className="w-3 h-3" /> Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {invoices.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No invoices found. Create one to get started.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );

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
    return (
      <Switch>
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route><Auth /></Route>
      </Switch>
    );
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

  const viewStateMap: { [key: string]: ViewState } = {
    '/': ViewState.DASHBOARD,
    '/invoices': ViewState.INVOICES,
    '/daybook': ViewState.DAYBOOK,
    '/inventory': ViewState.INVENTORY,
    '/customers': ViewState.CUSTOMERS,
    '/settings': ViewState.SETTINGS,
  };
  const currentView = viewStateMap[location] || ViewState.DASHBOARD;


  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans flex-col md:flex-row">
      <Sidebar 
        currentView={currentView}
        onChangeView={(view) => {
          const path = Object.keys(viewStateMap).find(key => viewStateMap[key] === view);
          if (path) setLocation(path);
          if (view === ViewState.IMPORT) {
            setShowImport(true);
          }
        }}
        isCloudConnected={isCloudConnected || !!user}
      />
      
      <main className="flex-1 overflow-y-auto h-full relative pb-20 md:pb-0 w-full">
        <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/invoices" component={InvoiceList} />
            <Route path="/daybook" component={Daybook} />
            <Route path="/inventory" component={Inventory} />
            <Route path="/customers" component={Customers} />
            <Route path="/customers/:id" component={Customers} />
            <Route path="/customers/:id/ledger" component={CustomerLedger} />
            <Route path="/settings" component={Settings} />
            <Route path="/invoices/new">
                <CreateInvoice 
                    onSave={handleSaveInvoice} 
                    onCancel={() => setLocation('/invoices')} 
                />
            </Route>
            <Route path="/invoices/:id/edit">
                {({ id }) => {
                    const invoice = invoices.find(inv => inv.id === id) || null;
                    return <CreateInvoice
                            onSave={handleSaveInvoice}
                            onCancel={() => setLocation('/invoices')}
                            initialInvoice={invoice}
                        />
                }}
            </Route>
            <Route path="/invoices/:id">
                {({ id }) => {
                    const invoice = invoices.find(inv => inv.id === id) || null;
                    if (!invoice) return <div className="p-4">Invoice not found</div>;
                    return <InvoiceView 
                                invoice={invoice} 
                                onBack={() => setLocation('/invoices')}
                                onEdit={handleEditInvoice}
                            />
                }}
            </Route>
        </Switch>
      </main>

      {showImport && (
        <Import 
          onClose={() => setShowImport(false)}
          onImportComplete={() => {
            setInvoices(StorageService.getInvoices());
            setLocation('/inventory');
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
