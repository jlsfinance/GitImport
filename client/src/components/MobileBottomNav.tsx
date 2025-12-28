
import React, { useState } from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, FileText, Menu, Plus, Users, Settings, LogOut, Upload, X, Receipt, ArrowDownLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { HapticService } from '@/services/hapticService';

interface MobileBottomNavProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onFabClick?: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentView, onChangeView, onFabClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { signOut } = useAuth();

  const handleNavClick = (view: ViewState) => {
    onChangeView(view);
    setIsMenuOpen(false);
  };

  const menuItems = [
    { id: ViewState.CUSTOMERS, label: 'Customers', icon: Users, color: 'text-orange-500', bgColor: 'bg-orange-50' },
    { id: ViewState.EXPENSES, label: 'Expenses', icon: Receipt, color: 'text-red-500', bgColor: 'bg-red-50' },
    { id: ViewState.PAYMENTS, label: 'Receipts', icon: ArrowDownLeft, color: 'text-green-500', bgColor: 'bg-green-50' },
    { id: ViewState.IMPORT, label: 'Import Data', icon: Upload, color: 'text-purple-500', bgColor: 'bg-purple-50' },
    { id: ViewState.SETTINGS, label: 'Settings', icon: Settings, color: 'text-gray-500', bgColor: 'bg-gray-50' },
  ];

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
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl shadow-xl z-50 overflow-hidden pb-safe"
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              <div className="p-6 pt-2">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">More</h3>
                  <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-gray-100 rounded-full dark:bg-slate-800">
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                <div className="space-y-2 mb-6">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-[24px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group active:scale-[0.98]"
                    >
                      <div className={`w-12 h-12 rounded-full ${item.bgColor} dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0`}>
                        <item.icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-base">{item.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.id === ViewState.CUSTOMERS ? 'Manage your client base' :
                            item.id === ViewState.EXPENSES ? 'Track business spending' :
                              item.id === ViewState.PAYMENTS ? 'View payment history' :
                                item.id === ViewState.IMPORT ? 'Backup and restore data' :
                                  'App configuration'}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <button
                    onClick={() => {
                      HapticService.medium();
                      signOut();
                    }}
                    className="w-full flex items-center gap-4 p-4 text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-500/10 rounded-[24px] hover:bg-red-100 dark:hover:bg-red-500/20 transition-all group active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                      <LogOut className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold">Sign Out</p>
                      <p className="text-xs text-red-400 opacity-60">Exit your account safely</p>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-40" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Action Button (M3 Extended FAB) - Context Aware */}
      {!['CREATE_INVOICE', 'EDIT_INVOICE', 'CREATE_PURCHASE', 'EDIT_PURCHASE'].includes(currentView) && (
        <div className="fixed bottom-28 right-6 z-40">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              HapticService.medium();
              if (onFabClick) {
                onFabClick();
              } else {
                handleNavClick(ViewState.CREATE_INVOICE);
              }
            }}
            className="h-14 px-5 rounded-[28px] bg-google-blue text-white shadow-google-lg flex items-center gap-3 hover:shadow-google transition-all border-none"
          >
            <Plus className="w-6 h-6" strokeWidth={3} />
            <span className="font-bold text-sm tracking-tight">
              {currentView === ViewState.PURCHASES ? 'Add Purchase' :
                currentView === ViewState.PAYMENTS ? 'Add Receipt' :
                  'Add Sale'}
            </span>
          </motion.button>
        </div>
      )}

      {/* Material 3 Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-container/95 dark:bg-surface-container-low/95 backdrop-blur-2xl border-t border-border/50 pb-safe z-30 h-[88px]">
        <div className="flex justify-around items-center h-full px-4 max-w-lg mx-auto">
          <NavButton
            active={currentView === ViewState.DASHBOARD}
            onClick={() => handleNavClick(ViewState.DASHBOARD)}
            icon={LayoutDashboard}
            label="Home"
          />
          <NavButton
            active={currentView === ViewState.INVOICES}
            onClick={() => handleNavClick(ViewState.INVOICES)}
            icon={FileText}
            label="Invoices"
          />
          <NavButton
            active={currentView === ViewState.PAYMENTS}
            onClick={() => handleNavClick(ViewState.PAYMENTS)}
            icon={ArrowDownLeft}
            label="Receipts"
          />
          <NavButton
            active={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            icon={Menu}
            label="Menu"
          />
        </div>
      </div>
    </>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: any; label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={() => {
      HapticService.light();
      onClick();
    }}
    className="flex flex-col items-center justify-center flex-1 h-full group"
  >
    <div className="relative flex items-center justify-center w-16 h-8 rounded-full mb-1 transition-all duration-300">
      {active && (
        <motion.div
          layoutId="nav-pill"
          className="absolute inset-0 bg-primary/20 dark:bg-primary/30 rounded-full"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <Icon className={`w-6 h-6 relative z-10 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className={`text-[11px] font-bold tracking-tight transition-colors ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
      {label}
    </span>
  </button>
);

export default MobileBottomNav;
