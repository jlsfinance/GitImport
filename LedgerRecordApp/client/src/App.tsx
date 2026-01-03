import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { ThemeProvider } from 'next-themes';
import ModuleSelector from './components/ModuleSelector';
import AccountingApp from './modules/accounting/AccountingApp';
import RecordsApp from './modules/records/RecordsApp'; // Neutralized Import
import { StorageService } from './services/storageService';
import { PrivacyDisclosureModal } from './components/PrivacyDisclosureModal';
import TermsPolicy from './modules/records/pages/TermsPolicy';

const RootApp: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<'accounting' | 'records' | null>('records');

  // STANDALONE MODE: Start directly in Records (Ledger)
  // const [selectedModule, setSelectedModule] = useState<'accounting' | 'records' | null>(() => {
  //   // Persist choice or detect from path
  //   const saved = localStorage.getItem('active_module');
  //   if (saved === 'accounting') return 'accounting';
  //   if (saved === 'loan' || saved === 'records') return 'records'; // Backward compatible with legacy storage key
  //   return 'records';
  // });

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

    // Logic for Record Deep Links
    // Backward compatibility for legacy /loan paths -> redirects to /records
    // RecordsApp handles internal routing.
    if (path.startsWith('/records') || path.startsWith('/loan')) {
      setSelectedModule('records');
      return;
    }

    // If at root and has stored module, redirect to appropriate path
    if (path === '/') {
      navigate('/records/customer-login', { replace: true });
      // const saved = localStorage.getItem('active_module');
      // if (saved === 'accounting') navigate('/bill', { replace: true });
      // if (saved === 'records' || saved === 'loan') navigate('/records', { replace: true }); // Ledger module
    }
  }, [location, navigate]);

  const handleSelectModule = (module: 'accounting' | 'records') => {
    setSelectedModule(module);
    localStorage.setItem('active_module', module);
    if (module === 'accounting') navigate('/bill');
    if (module === 'records') navigate('/records/customer-login'); // Go to customer login first
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

  if (selectedModule === 'records') {
    return (
      <div className="relative h-screen w-full">
        <RecordsApp />
      </div>
    );
  }

  // Global Pages (Terms / Privacy)
  if (location.pathname === '/terms' || location.pathname === '/privacy-policy') {
    return <TermsPolicy />;
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
