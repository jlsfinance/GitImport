
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { ThemeProvider } from 'next-themes';
import ModuleSelector from './components/ModuleSelector';
import AccountingApp from './modules/accounting/AccountingApp';
import LoanApp from './modules/loan/LoanApp';

const RootApp: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<'accounting' | 'loan' | null>(() => {
    // Persist choice or detect from path
    const saved = localStorage.getItem('active_module');
    if (saved === 'accounting' || saved === 'loan') return saved;
    return null;
  });

  const location = useLocation();
  const navigate = useNavigate();

  // Handle Deep Links and Path-based module selection
  useEffect(() => {
    const path = location.pathname;

    // Logic for Accounting Deep Links (Public Invoices, Ledgers)
    if (path.startsWith('/bill') || path.startsWith('/view/') || path.startsWith('/v/') || path.startsWith('/customer/')) {
      setSelectedModule('accounting');
      return;
    }

    // Logic for Loan Deep Links (if any, e.g. /loan-details)
    // Note: The Loan app uses its own internalized router, so we should prefix it or detect it.
    if (path.startsWith('/loan')) {
      setSelectedModule('loan');
      return;
    }

    // If at root and has stored module, redirect to appropriate path
    if (path === '/') {
      const saved = localStorage.getItem('active_module');
      if (saved === 'accounting') navigate('/bill', { replace: true });
      if (saved === 'loan') navigate('/loan', { replace: true });
    }
  }, [location, navigate]);

  const handleSelectModule = (module: 'accounting' | 'loan') => {
    setSelectedModule(module);
    localStorage.setItem('active_module', module);
    if (module === 'accounting') navigate('/bill');
    if (module === 'loan') navigate('/loan');
  };

  const handleResetModule = () => {
    setSelectedModule(null);
    localStorage.removeItem('active_module');
    navigate('/');
  };

  // If a module is selected, render it
  // We wrap them in their respective providers if they need distinct settings
  if (selectedModule === 'accounting') {
    return (
      <AuthProvider>
        <CompanyProvider>
          <div className="relative h-screen w-full">
            <AccountingApp />
            {/* Simple Floating Home Button to Switch Modules */}
            <button
              onClick={handleResetModule}
              className="fixed top-4 right-4 z-[200] p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all md:hidden"
            >
              Switch
            </button>
          </div>
        </CompanyProvider>
      </AuthProvider>
    );
  }

  if (selectedModule === 'loan') {
    return (
      <div className="relative h-screen w-full">
        <LoanApp />
        {/* Simple Floating Home Button to Switch Modules */}
        <button
          onClick={handleResetModule}
          className="fixed top-4 right-4 z-[200] p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all md:hidden"
        >
          Switch
        </button>
      </div>
    );
  }

  return <ModuleSelector onSelect={handleSelectModule} />;
};

const App: React.FC = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Router>
        <RootApp />
      </Router>
    </ThemeProvider>
  );
};

export default App;
