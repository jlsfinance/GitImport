
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { ThemeProvider } from 'next-themes';
import ModuleSelector from './components/ModuleSelector';
import AccountingApp from './modules/accounting/AccountingApp';
import LoanApp from './modules/loan/LoanApp';
import { StorageService } from './services/storageService';
import { PrivacyDisclosureModal } from './components/PrivacyDisclosureModal';

const RootApp: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<'accounting' | 'loan' | null>(() => {
    // Persist choice or detect from path
    const saved = localStorage.getItem('active_module');
    if (saved === 'accounting' || saved === 'loan') return saved;
    return null;
  });

  const location = useLocation();
  const navigate = useNavigate();

  // Privacy Disclosure
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    // Check Privacy Acceptance
    const accepted = StorageService.getPrivacyAccepted();
    if (!accepted) {
      setShowPrivacyModal(true);
    }
  }, []);

  // Configure StatusBar
  useEffect(() => {
    const configureStatusBar = async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');

        // 1. Use overlay mode - safe area handled by CSS
        await StatusBar.setOverlaysWebView({ overlay: true });

        // 2. Set color to match app theme (Dark/Light) or white/black
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0F172A' }); // Dark blue like dashboard

        console.log('StatusBar configured: Overlay=false');
      } catch (e) {
        console.warn('StatusBar plugin not available (web mode?)', e);
      }
    };

    configureStatusBar();
  }, []);

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
          </div>
        </CompanyProvider>
      </AuthProvider>
    );
  }

  if (selectedModule === 'loan') {
    return (
      <div className="relative h-screen w-full">
        <LoanApp />
      </div>
    );
  }

  return (
    <>
      <PrivacyDisclosureModal isOpen={showPrivacyModal} onAccept={() => setShowPrivacyModal(false)} />
      <ModuleSelector onSelect={handleSelectModule} />
    </>
  );
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
