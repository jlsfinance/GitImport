import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { CompanyProvider, useCompany } from './context/CompanyContext';
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
import { SidebarProvider } from './context/SidebarContext';
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

import './loan.css';

const ProtectedRoute = ({ children, requireCompany = true }: { children?: React.ReactNode; requireCompany?: boolean }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-950">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            </div>
        );
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
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-950">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!currentCompany && companies.length === 0) {
        return <Navigate to="/loan/company-selector" replace />;
    }

    if (!currentCompany && companies.length > 0) {
        return <Navigate to="/loan/company-selector" replace />;
    }

    return <>{children}</>;
};

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
        <div className="loan-app-module flex h-screen bg-slate-50 dark:bg-slate-950">
            <PermissionRequestor />
            <NotificationListener />
            <CompanyProvider>
                <SidebarProvider>
                    <Sidebar />
                    <div className="flex-1 flex flex-col h-full overflow-y-auto relative">
                        <Routes>
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
                    </div>
                </SidebarProvider>
            </CompanyProvider>
        </div>
    );
};

export default LoanApp;
