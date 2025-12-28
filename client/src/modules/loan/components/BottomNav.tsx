import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '../context/SidebarContext';
import { HapticService } from '@/services/hapticService';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { closeSidebar } = useSidebar();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const activePath = location.pathname;

  const handleNavClick = (path: string) => {
    HapticService.light();
    navigate(path);
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await signOut(auth);
        localStorage.removeItem('customerPortalId');
        localStorage.removeItem('customerPortalCompanyId');
        closeSidebar();
        navigate('/loan/login');
      } catch (error) {
        console.error("Logout error", error);
      }
    }
  };

  const menuItems = [
    { path: '/loan/tools', label: 'Tools', icon: 'construction', color: 'text-orange-500', bgColor: 'bg-orange-50' },
    { path: '/loan/reports', label: 'Reports', icon: 'bar_chart', color: 'text-purple-500', bgColor: 'bg-purple-50' },
    { path: '/loan/notifications', label: 'Notifications', icon: 'notifications', color: 'text-blue-500', bgColor: 'bg-blue-50' },
    { path: '/loan/settings', label: 'Settings', icon: 'settings', color: 'text-gray-500', bgColor: 'bg-gray-50' },
  ];

  const NavButton = ({ isActive, onClick, icon, label }: { isActive: boolean, onClick: () => void, icon: string, label: string }) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center flex-1 h-full group"
    >
      <div className="relative flex items-center justify-center w-16 h-8 rounded-full mb-1 transition-all duration-300">
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            className="absolute inset-0 bg-primary/20 dark:bg-primary/30 rounded-full"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className={`material-symbols-outlined text-[24px] relative z-10 ${isActive ? 'text-primary font-variation-FILL-1' : 'text-muted-foreground group-hover:text-foreground'}`}>
          {icon}
        </span>
      </div>
      <span className={`text-[11px] font-bold tracking-tight transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </button>
  );

  return (
    <>
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl shadow-xl z-50 overflow-hidden pb-safe lg:hidden"
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              <div className="p-6 pt-2">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">More</h3>
                  <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-gray-100 rounded-full dark:bg-slate-800">
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">close</span>
                  </button>
                </div>

                <div className="space-y-2 mb-6">
                  {menuItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavClick(item.path)}
                      className="w-full flex items-center gap-4 p-4 rounded-[24px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group active:scale-[0.98]"
                    >
                      <div className={`w-12 h-12 rounded-full ${item.bgColor} dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0`}>
                        <span className={`material-symbols-outlined ${item.color} text-[24px]`}>{item.icon}</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-base">{item.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.label === 'Tools' ? 'Calculators & Docs' :
                            item.label === 'Reports' ? 'Analytics & Exports' :
                              item.label === 'Notifications' ? 'Alerts & Messages' :
                                'App configuration'}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-500 transition-colors">chevron_right</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <button
                    onClick={() => {
                      HapticService.medium();
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-4 p-4 text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-500/10 rounded-[24px] hover:bg-red-100 dark:hover:bg-red-500/20 transition-all group active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px]">logout</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold">Sign Out</p>
                      <p className="text-xs text-red-400 opacity-60">Exit your account safely</p>
                    </div>
                    <span className="material-symbols-outlined opacity-40">chevron_right</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Action Button (M3 Large FAB) - Official Google Style */}
      <div className="fixed bottom-28 right-6 z-40 lg:hidden">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            HapticService.medium();
            handleNavClick('/loan/loans/new');
          }}
          className="w-16 h-16 rounded-[24px] bg-google-blue text-white shadow-google-lg flex items-center justify-center hover:shadow-google transition-all border-none"
          title="New Loan"
        >
          <span className="material-symbols-outlined text-[32px]">add</span>
        </motion.button>
      </div>

      {/* Material 3 Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-container/95 dark:bg-surface-container-low/95 backdrop-blur-md border-t border-border/50 pb-safe z-30 min-h-[80px] lg:hidden">
        <div className="flex justify-around items-center h-full px-4 max-w-lg mx-auto py-2">
          <NavButton
            isActive={activePath === '/loan'}
            onClick={() => handleNavClick('/loan')}
            icon="dashboard"
            label="Home"
          />
          <NavButton
            isActive={activePath.includes('/loan/customers')}
            onClick={() => handleNavClick('/loan/customers')}
            icon="group"
            label="Clients"
          />
          <NavButton
            isActive={activePath.includes('/loan/loans') && !activePath.includes('new')}
            onClick={() => handleNavClick('/loan/loans')}
            icon="account_balance"
            label="Loans"
          />
          <NavButton
            isActive={activePath.includes('/loan/finance')}
            onClick={() => handleNavClick('/loan/finance')}
            icon="account_balance_wallet"
            label="Accounts"
          />
          <NavButton
            isActive={isMenuOpen}
            onClick={() => {
              HapticService.light();
              setIsMenuOpen(!isMenuOpen)
            }}
            icon="menu"
            label="Menu"
          />
        </div>
      </div>
    </>
  );
};

export default BottomNav;