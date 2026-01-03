import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { ThemeProvider } from 'next-themes';
import AccountingApp from './modules/accounting/AccountingApp';
import { StorageService } from './services/storageService';
import { PrivacyDisclosureModal } from './components/PrivacyDisclosureModal';

const RootApp: React.FC = () => {
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

  // Handle Deep Links & OAuth Redirects
  useEffect(() => {
    const initNativeModules = async () => {
      try {
        const { App } = await import('@capacitor/app');
        App.addListener('appUrlOpen', (data: any) => {
          console.log('App opened with URL:', data.url);
        });

        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0F172A' });
      } catch (e) {
        console.warn('Native modules not available');
      }
    };
    initNativeModules();
  }, []);

  // Redirect to /bill if at root
  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/bill', { replace: true });
    }
  }, [location, navigate]);

  return (
    <>
      <PrivacyDisclosureModal isOpen={showPrivacyModal} onAccept={() => setShowPrivacyModal(false)} />
      <AuthProvider>
        <CompanyProvider>
          <div
            className="min-h-[100dvh] bg-slate-50 dark:bg-slate-900 overflow-x-hidden selection:bg-indigo-100 dark:selection:bg-indigo-900/40"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <AccountingApp />
          </div>
        </CompanyProvider>
      </AuthProvider>
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
