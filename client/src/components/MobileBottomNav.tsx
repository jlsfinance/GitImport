
import React, { useState } from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, FileText, Package, Menu, Plus, Users, Settings, LogOut, Upload, X, Receipt, ArrowDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface MobileBottomNavProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentView, onChangeView }) => {
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

                <div className="grid grid-cols-4 gap-4 mb-6">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-100 transition-colors border border-slate-100 dark:border-slate-700">
                        <item.icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 text-center leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center justify-center gap-2 p-4 text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-500/10 rounded-[24px] hover:bg-red-100 dark:hover:bg-red-500/20 transition-all border border-red-100/50 dark:border-red-500/20"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Action Button (M3 Style) */}
      <div className="fixed bottom-28 right-6 z-40">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => handleNavClick(ViewState.CREATE_INVOICE)}
          className="w-16 h-16 rounded-[24px] bg-primary text-white shadow-xl flex items-center justify-center hover:shadow-2xl transition-all border-none"
        >
          <Plus className="w-8 h-8" strokeWidth={3} />
        </motion.button>
      </div>

      {/* Material 3 Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 pb-safe z-30 h-[88px]">
        <div className="flex justify-around items-center h-full px-2 max-w-lg mx-auto">
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
            label="More"
          />
        </div>
      </div>
    </>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: any; label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center w-full h-full group"
  >
    <div className={`
        flex items-center justify-center w-16 h-8 rounded-full mb-1.5 transition-all duration-300
        ${active ? 'bg-primary/10 dark:bg-primary/20' : 'bg-transparent'}
    `}>
      <Icon className={`w-6 h-6 ${active ? 'text-primary' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600'}`} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${active ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
      {label}
    </span>
  </button>
);

export default MobileBottomNav;
