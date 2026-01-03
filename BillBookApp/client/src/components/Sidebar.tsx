
import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, FileText, Users, Package, PlusCircle, Receipt, Settings, LogOut, Upload, ArrowDownLeft, Sun, Moon, X, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { HapticService } from '@/services/hapticService';
import { motion } from 'framer-motion';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isCloudConnected?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isCloudConnected = false, onClose }) => {
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Home', icon: LayoutDashboard },
    { id: ViewState.INVOICES, label: 'Invoices', icon: FileText },
    { id: ViewState.PURCHASES, label: 'Purchases', icon: ShoppingBag }, // Added
    { id: ViewState.INVENTORY, label: 'Inventory', icon: Package },
    { id: ViewState.CREATE_INVOICE, label: 'Create', icon: PlusCircle },
    { id: ViewState.EXPENSES, label: 'Expenses', icon: Receipt },
    { id: ViewState.PAYMENTS, label: 'Receipts', icon: ArrowDownLeft },
    { id: ViewState.CUSTOMERS, label: 'People', icon: Users },
    { id: ViewState.IMPORT, label: 'Import', icon: Upload },
    { id: ViewState.SETTINGS, label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <>
      {/* Material 3 Expressive Navigation Drawer */}
      <div className="flex w-72 md:w-80 bg-surface-container-low border-r border-border h-full flex-col flex-shrink-0 transition-all duration-300">
        {/* Drawer Header */}
        <div className="p-8 pb-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-[20px] bg-white dark:bg-slate-800 p-2 shadow-google border border-border">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-black font-heading tracking-tight text-foreground leading-none">JLS Suite</h1>
                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-1.5 transition-colors ${isCloudConnected ? 'text-google-green' : 'text-google-blue'}`}>
                  Business Suite
                  {isCloudConnected && (
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-google-green opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-google-green"></span>
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 md:hidden text-muted-foreground hover:bg-surface-container-high rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onChangeView(item.id);
                  HapticService.light();
                }}
                className={`w-full group relative flex items-center gap-4 px-6 py-4 rounded-full text-sm font-bold transition-all ${isActive
                  ? 'bg-google-blue text-white shadow-google scale-[1.02]'
                  : 'text-muted-foreground hover:bg-surface-container-high hover:text-foreground'
                  }`}
              >
                <item.icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-google-blue'}`} />
                <span className="flex-1 text-left tracking-tight">
                  {item.label === 'Home' ? 'Dashboard' : item.label === 'People' ? 'Customers' : item.label === 'Create' ? 'New Invoice' : item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-pill-active"
                    className="absolute inset-0 bg-google-blue rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            );
          })}

          <div className="h-4" />

          {/* Theme Toggle Button */}
          <button
            onClick={() => {
              setTheme(theme === 'dark' ? 'light' : 'dark');
              HapticService.medium();
            }}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-full text-sm font-bold text-muted-foreground hover:bg-surface-container-high hover:text-foreground transition-all group"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${theme === 'dark' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'
              }`}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>
            <span className="flex-1 text-left tracking-tight">Appearance</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>

          {/* Sign Out Item */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-full text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/20 group-hover:bg-red-200 transition-colors">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="flex-1 text-left tracking-tight font-black uppercase">Sign Out</span>
          </button>
        </nav>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border">
          <div className="text-center space-y-1">
            <p className="text-xs font-black text-slate-700 dark:text-slate-300 tracking-tighter uppercase italic">JLS Suite</p>
            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Business Intelligence</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;