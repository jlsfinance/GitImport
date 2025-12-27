import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { CompanyProvider, useCompany } from './context/CompanyContext';
import { LoanAuthProvider, useLoanAuth } from './context/LoanAuthContext';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerProfile from './pages/CustomerProfile';
import NewCustomer from './pages/NewCustomer';
import EditCustomer from './pages/EditCustomer';
import Loans from './pages/Loans';
import LoanDetails from './pages/LoanDetails';
import NewLoan from './pages/NewLoan';
import EditLoan from './pages/EditLoan';
import Tools from './pages/Tools';
import EMICalculator from './pages/EMICalculator';
import Settings from './pages/Settings';
import FinanceOverview from './pages/FinanceOverview';
import Receipts from './pages/Receipts';
import Approvals from './pages/Approvals';
import Disbursal from './pages/Disbursal';
import DueList from './pages/DueList';
import Partners from './pages/Partners';
import UserManagement from './pages/UserManagement';
import LegalNotice from './pages/LegalNotice';
import NotificationCenter from './pages/NotificationCenter';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import CompanySelector from './pages/CompanySelector';
import CustomerLogin from './pages/CustomerLogin';
import CustomerPortal from './pages/CustomerPortal';
import BottomNav from './components/BottomNav';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import Sidebar from './components/Sidebar';
import Downloads from './pages/Downloads';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { Capacitor } from '@capacitor/core';
import AnimatedSplash from './components/AnimatedSplash';
import IntroNotice from './components/IntroNotice';
import BackButtonHandler from './components/BackButtonHandler';
import PermissionRequestor from './components/PermissionRequestor';
import NotificationListener from './components/NotificationListener';
import { useTheme } from 'next-themes';
import { Menu as SidebarIcon, Sun, Moon } from 'lucide-react';
import { HapticService } from '@/services/hapticService';
import { APP_NAME } from './constants';
import { AnimatePresence, motion } from 'framer-motion';

import './loan.css';

const LoadingScreen = () => (
    <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-950 flex-col gap-6 animate-pulse">
        <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-violet-600 flex items-center justify-center shadow-2xl shadow-violet-500/20 rotate-12">
                <SidebarIcon className="w-10 h-10 text-white -rotate-12" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-950 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            </div>
        </div>
        <div className="text-center">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">{APP_NAME}</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Initializing Secure Session</p>
        </div>
    </div>
);

const ProtectedRoute = ({ children, requireCompany = true }: { children?: React.ReactNode; requireCompany?: boolean }) => {
    const { user, loading } = useLoanAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        const customerId = localStorage.getItem('customerPortalId');
        if (customerId) {
            return <Navigate to="/loan/customer-portal" replace />;
        }
        return <Navigate to="/loan/customer-login" replace />;
    }

    if (localStorage.getItem('customerPortalId')) {
        return <Navigate to="/loan/customer-portal" replace />;
    }

    return <>{children}</>;
};

const CompanyRequiredRoute = ({ children }: { children?: React.ReactNode }) => {
    const { currentCompany, loading, companies } = useCompany();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!currentCompany && companies.length === 0) {
        return <Navigate to="/loan/company-selector" replace />;
    }

    if (!currentCompany && companies.length > 0) {
        return <Navigate to="/loan/company-selector" replace />;
    }

    return <>{children}</>;
};

const LoanAppContent = () => {
    const { openSidebar } = useSidebar();
    const { currentCompany } = useCompany();
    const { theme, setTheme } = useTheme();
    const location = useLocation();

    // Check if current route is a "FullScreen" route (Auth, Splash, etc - though Auth is handled by routing logic outside main layout usually)
    // Actually, Login/Register are routed children.
    const isAuthRoute = ['/loan/login', '/loan/register', '/loan/forgot-password', '/loan/customer-login', '/loan/customer-portal'].includes(location.pathname);
    const isCompanySelector = location.pathname === '/loan/company-selector';

    // Hide sidebar on Auth routes or CompanySelector
    const showSidebar = !isAuthRoute && !isCompanySelector;

    // Mobile Header Title Logic
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/loan') return 'Dashboard';
        if (path.includes('/customers')) return 'Customers';
        if (path.includes('/loans')) return 'Loan Management';
        if (path.includes('/finance')) return 'Finance';
        if (path.includes('/tools')) return 'Tools';
        if (path.includes('/settings')) return 'Settings';
        return 'Overview';
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans flex-col md:flex-row">
            {showSidebar && <Sidebar />}

            <div className="flex-1 flex flex-col h-full overflow-y-auto relative w-full scroll-smooth bg-slate-50 dark:bg-slate-900">

                {/* Mobile Header - Visible only on mobile and when sidebar is shown (authenticated routes) */}
                {showSidebar && (
                    <div className="md:hidden sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 h-16 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                        <button
                            onClick={openSidebar}
                            className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
                        >
                            <SidebarIcon className="w-6 h-6" />
                        </button>
                        <div className="flex-1 text-center px-4 overflow-hidden">
                            <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter truncate leading-tight">
                                {currentCompany?.name || APP_NAME}
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
                )}

                <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                        <Route path="/loan/login" element={<Login />} />
                        <Route path="/loan/register" element={<Register />} />
                        <Route path="/loan/forgot-password" element={<ForgotPassword />} />
                        <Route path="/loan/customer-login" element={<CustomerLogin />} />
                        <Route path="/loan/customer-portal" element={<CustomerPortal />} />

                        <Route path="/loan/company-selector" element={
                            <ProtectedRoute>
                                <CompanySelector />
                            </ProtectedRoute>
                        } />

                        <Route path="/loan" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <Dashboard />
                                    <BottomNav />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/customers" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <Customers />
                                    <BottomNav />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/customers/new" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <NewCustomer />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/customers/edit/:id" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <EditCustomer />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/customers/:id" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <CustomerProfile />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/loans" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <Loans />
                                    <BottomNav />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/loans/new" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <NewLoan />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/loans/:id" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <LoanDetails />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/loans/edit/:id" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <EditLoan />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/finance" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <FinanceOverview />
                                    <BottomNav />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/partners" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <Partners />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/tools" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <Tools />
                                    <BottomNav />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/tools/legal-notice" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <LegalNotice />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/notifications" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <NotificationCenter />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/reports" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <Reports />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/receipts" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <Receipts />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/approvals" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <Approvals />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/disbursal" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <Disbursal />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/due-list" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <DueList />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/tools/emi" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <EMICalculator />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/settings" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <Settings />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/user-management" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <UserManagement />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/downloads" element={
                            <ProtectedRoute>
                                <CompanyRequiredRoute>
                                    <Downloads />
                                </CompanyRequiredRoute>
                            </ProtectedRoute>
                        } />

                        <Route path="/loan/terms" element={<Terms />} />
                        <Route path="/loan/privacy" element={<Privacy />} />
                        <Route path="*" element={<Navigate to="/loan" replace />} />
                    </Routes>
                </AnimatePresence>
            </div>
        </div>
    );
}

const LoanApp: React.FC = () => {
    const [showSplash, setShowSplash] = useState(Capacitor.getPlatform() !== 'web');
    const [showNotice, setShowNotice] = useState(false);

    // Handle Splash Finish
    const handleSplashFinish = () => {
        setShowSplash(false);
        const hasSeenNotice = localStorage.getItem('hasSeenIntroNotice');
        if (!hasSeenNotice && Capacitor.getPlatform() !== 'web') {
            setShowNotice(true);
        }
    };

    const handleAcceptNotice = () => {
        localStorage.setItem('hasSeenIntroNotice', 'true');
        setShowNotice(false);
    };

    if (showSplash && Capacitor.getPlatform() !== 'web') {
        return <AnimatedSplash onFinish={handleSplashFinish} />;
    }

    if (showNotice) {
        return <IntroNotice onAccept={handleAcceptNotice} />;
    }

    return (
        <div className="loan-app-module h-screen font-sans">
            <PermissionRequestor />
            <NotificationListener />
            <CompanyProvider>
                <LoanAuthProvider>
                    <SidebarProvider>
                        <LoanAppContent />
                    </SidebarProvider>
                </LoanAuthProvider>
            </CompanyProvider>
        </div>
    );
};

export default LoanApp;
