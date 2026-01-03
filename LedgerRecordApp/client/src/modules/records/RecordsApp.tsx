import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useTheme } from 'next-themes';
import { Menu as SidebarIcon, Sun, Moon } from 'lucide-react';


import { CompanyProvider, useCompany } from './context/CompanyContext';
import { RecordAuthProvider, useRecordAuth } from './context/RecordAuthContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import { APP_NAME } from './constants';
import { HapticService } from '@/services/hapticService';

// Components
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import IntroNotice from './components/IntroNotice';
import PermissionRequestor from './components/PermissionRequestor';
import NotificationListener from './components/NotificationListener';
import LoadingSplash from './components/LoadingSplash';

// Pages
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerProfile from './pages/CustomerProfile';
import NewCustomer from './pages/NewCustomer';
import EditCustomer from './pages/EditCustomer';
import AllRecords from './pages/AllRecords'; // Neutralized
import RecordDetails from './pages/RecordDetails'; // Neutralized
import AddRecord from './pages/AddRecord'; // Neutralized
import EditRecord from './pages/EditRecord'; // Neutralized
import Tools from './pages/Tools';
import InstallmentCalculator from './pages/InstallmentCalculator';
import Settings from './pages/Settings';
import FinanceOverview from './pages/FinanceOverview';
import Receipts from './pages/Receipts';
import Approvals from './pages/Approvals';
import NewEntry from './pages/NewEntry'; // Activation Entry
import DueList from './pages/DueList';
import Partners from './pages/Partners';
import UserManagement from './pages/UserManagement';
import PaymentReminder from './pages/PaymentReminder';
import Reports from './pages/Reports';
import NotificationCenter from './pages/NotificationCenter';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import CompanySelector from './pages/CompanySelector';
// TEMPORARILY DISABLED: Customer portal will be re-enabled after compliance review
// import CustomerLogin from './pages/CustomerLogin';
// import CustomerPortal from './pages/CustomerPortal';
import Downloads from './pages/Downloads';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import CookiePolicy from './pages/CookiePolicy';
import RefundPolicy from './pages/RefundPolicy';
import SecurityPolicy from './pages/SecurityPolicy';
import ComplianceStatement from './pages/ComplianceStatement';
import LegalDocuments from './pages/LegalDocuments';
import DeleteAccount from './pages/DeleteAccount';
import GreetingSettingsPage from './pages/GreetingSettingsPage';

import './records.css'; // Ledger module styles

const LoadingScreen = LoadingSplash;

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
    const { user, loading } = useRecordAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        // TEMPORARILY DISABLED: Customer portal redirects
        // const customerId = localStorage.getItem('customerPortalId');
        // if (customerId) {
        //     return <Navigate to="/records/customer-portal" replace />;
        // }
        return <Navigate to="/records/login" replace />;
    }

    // TEMPORARILY DISABLED: Customer portal check
    // if (localStorage.getItem('customerPortalId')) {
    //     return <Navigate to="/records/customer-portal" replace />;
    // }

    return <>{children}</>;
};

const CompanyRequiredRoute = ({ children }: { children?: React.ReactNode }) => {
    const { currentCompany, loading, companies } = useCompany();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!currentCompany && companies.length === 0) {
        return <Navigate to="/records/company-selector" replace />;
    }

    if (!currentCompany && companies.length > 0) {
        return <Navigate to="/records/company-selector" replace />;
    }

    return <>{children}</>;
};

const RecordsAppContent = () => {
    const { openSidebar } = useSidebar();
    const { currentCompany } = useCompany();
    const { theme, setTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate(); // Added navigation hook

    // Route Prefixes updated to /records (Customer portal temporarily disabled)
    const isAuthRoute = ['/records/login', '/records/register', '/records/forgot-password'].includes(location.pathname);
    const isCompanySelector = location.pathname === '/records/company-selector';

    // Hide sidebar on Auth routes or CompanySelector
    const showSidebar = !isAuthRoute && !isCompanySelector;

    // Mobile Header Title Logic
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/records') return 'Dashboard';
        if (path.includes('/customers')) return 'Customers';
        if (path.includes('/all')) return 'Ledger Management';
        if (path.includes('/finance')) return 'Accounts';
        if (path.includes('/tools')) return 'Tools';
        if (path.includes('/settings')) return 'Settings';
        if (path.includes('/approvals')) return 'Approvals';
        if (path.includes('/new-entry')) return 'New Entry';
        if (path.includes('/due-list')) return 'Collected';
        return 'Overview';
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans flex-col md:flex-row">
            {showSidebar && <Sidebar />}

            <div className="flex-1 flex flex-col h-full overflow-y-auto relative w-full scroll-smooth bg-slate-50 dark:bg-slate-900 pb-32">

                {showSidebar && (
                    <div className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm pt-[env(safe-area-inset-top)] transition-all">
                        <div className="h-16 px-4 flex items-center justify-between">
                            <button
                                onClick={openSidebar}
                                className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
                            >
                                <SidebarIcon className="w-6 h-6" />
                            </button>
                            <div className="flex-1 text-center px-4 overflow-hidden">
                                <h2
                                    onClick={() => navigate('/records/company-selector')}
                                    className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter truncate leading-tight cursor-pointer active:opacity-70"
                                >
                                    {currentCompany?.name || APP_NAME} <span className="text-[10px] opacity-50">▾</span>
                                </h2>
                                <p className="text-[9px] text-violet-600 dark:text-violet-400 font-black uppercase tracking-widest leading-tight">
                                    {getPageTitle()}
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

                <Routes location={location} key={location.pathname}>
                    <Route path="/records/login" element={<Login />} />
                    <Route path="/records/register" element={<Register />} />
                    <Route path="/records/forgot-password" element={<ForgotPassword />} />
                    {/* TEMPORARILY DISABLED: Customer portal routes will be re-enabled after compliance review
                    <Route path="/records/customer-login" element={<CustomerLogin />} />
                    <Route path="/records/customer-portal" element={<CustomerPortal />} />
                    */}

                    <Route path="/records/company-selector" element={
                        <ProtectedRoute>
                            <CompanySelector />
                        </ProtectedRoute>
                    } />

                    {/* Main Dashboard */}
                    <Route path="/records" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <Dashboard />
                                <BottomNav />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />

                    {/* Customers */}
                    <Route path="/records/customers" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <Customers />
                                <BottomNav />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/customers/new" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <NewCustomer />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/customers/edit/:id" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <EditCustomer />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/customers/:id" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <CustomerProfile />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />

                    {/* Ledger Records */}
                    <Route path="/records/all" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <AllRecords />
                                <BottomNav />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/new" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <AddRecord />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/view/:id" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <RecordDetails />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/edit/:id" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <EditRecord />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />

                    {/* Other Actions */}
                    <Route path="/records/finance" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <FinanceOverview />
                                <BottomNav />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/partners" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <Partners />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/tools" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <Tools />
                                <BottomNav />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/tools/payment-reminder" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <PaymentReminder />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/tools/calculator" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <InstallmentCalculator />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />

                    <Route path="/records/notifications" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <NotificationCenter />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/reports" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <Reports />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/receipts" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <Receipts />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/approvals" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <Approvals />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/new-entry" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <NewEntry />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/due-list" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <DueList />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />

                    <Route path="/records/settings" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <Settings />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/settings/greetings" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <GreetingSettingsPage />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/user-management" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <UserManagement />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />
                    <Route path="/records/downloads" element={
                        <ProtectedRoute>
                            <CompanyRequiredRoute>
                                <Downloads />
                            </CompanyRequiredRoute>
                        </ProtectedRoute>
                    } />

                    {/* Legal Pages - Public Access */}
                    <Route path="/records/legal" element={<LegalDocuments />} />
                    <Route path="/records/terms" element={<Terms />} />
                    <Route path="/records/privacy" element={<Privacy />} />
                    <Route path="/records/cookie-policy" element={<CookiePolicy />} />
                    <Route path="/records/refund-policy" element={<RefundPolicy />} />
                    <Route path="/records/security-policy" element={<SecurityPolicy />} />
                    <Route path="/records/compliance" element={<ComplianceStatement />} />
                    <Route path="/records/delete-account" element={<DeleteAccount />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/records" replace />} />
                </Routes>
            </div>
        </div>
    );
}

const RecordsApp: React.FC = () => {
    const [showNotice, setShowNotice] = useState(false);

    useEffect(() => {
        const hasSeenNotice = localStorage.getItem('hasSeenIntroNotice');
        if (!hasSeenNotice && Capacitor.getPlatform() !== 'web') {
            setShowNotice(true);
        }
    }, []);

    const handleAcceptNotice = () => {
        localStorage.setItem('hasSeenIntroNotice', 'true');
        setShowNotice(false);
    };

    if (showNotice) {
        return <IntroNotice onAccept={handleAcceptNotice} />;
    }

    return (
        <div className="records-app-module h-screen font-sans">
            <PermissionRequestor />
            <NotificationListener />
            <CompanyProvider>
                <RecordAuthProvider>
                    <SidebarProvider>
                        <RecordsAppContent />
                    </SidebarProvider>
                </RecordAuthProvider>
            </CompanyProvider>
        </div>
    );
};

export default RecordsApp;
