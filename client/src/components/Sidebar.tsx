
import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, FileText, Users, Package, PlusCircle, Receipt, Settings, Cloud, CloudOff, LogOut, Upload, ArrowDownLeft, Sun, Moon, X, ArrowLeftRight } from 'lucide-react';
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
                <h1 className="text-2xl font-black font-heading tracking-tight text-foreground leading-none">BillBook</h1>
                <p className="text-[10px] font-bold text-google-blue uppercase tracking-[0.2em] mt-1">Premium Edition</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 md:hidden text-muted-foreground hover:bg-surface-container-high rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Cloud Status Card - Expressive */}
          <div className={`p-4 rounded-[24px] border flex items-center gap-3 transition-all ${isCloudConnected
            ? 'bg-google-green/5 border-google-green/10 text-google-green'
            : 'bg-surface-container-high border-border text-muted-foreground'
            }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCloudConnected ? 'bg-google-green/10' : 'bg-surface-container'
              }`}>
              {isCloudConnected ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest leading-none mb-1">Status</p>
              <p className="text-xs font-bold truncate">{isCloudConnected ? 'Cloud Synchronized' : 'Offline Mode'}</p>
            </div>
            {isCloudConnected && <span className="w-2 h-2 rounded-full bg-google-green animate-pulse" />}
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
        </nav>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border">
          <button
            onClick={() => {
              localStorage.removeItem('active_module');
              window.location.href = '/';
            }}
            className="w-full mb-2 flex items-center gap-4 px-6 py-4 rounded-[24px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold text-sm group"
          >
            <ArrowLeftRight className="w-5 h-5 group-hover:rotate-180 transition-transform" />
            <span>Switch App</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-[24px] bg-google-red/5 text-google-red hover:bg-google-red hover:text-white transition-all font-bold text-sm group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Sign Out</span>
          </button>

          <div className="mt-6 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">© 2025 JLS SUITE</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;