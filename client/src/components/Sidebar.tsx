
import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, FileText, Users, Package, PlusCircle, Receipt, Settings, Cloud, CloudOff, LogOut, Upload, ArrowDownLeft, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { HapticService } from '@/services/hapticService';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isCloudConnected?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isCloudConnected = false }) => {
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Home', icon: LayoutDashboard },
    { id: ViewState.INVOICES, label: 'Invoices', icon: FileText },
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
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-slate-900 text-slate-100 min-h-screen flex-col flex-shrink-0 transition-all duration-300">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-white/10 p-1.5 rounded-xl backdrop-blur-md border border-white/20">
            <img src="/logo.png" alt="BillBook Logo" className="w-10 h-10 object-contain rounded-lg shadow-lg" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent italic">BillBook</h1>
            <p className="text-xs text-blue-300 font-semibold">by Lavneet Rathi</p>
            <div className="flex items-center gap-1 text-[10px] font-medium mt-0.5">
              {isCloudConnected ? (
                <span className="text-green-400 flex items-center gap-1"><Cloud className="w-3 h-3" /> Cloud Sync</span>
              ) : (
                <span className="text-slate-500 flex items-center gap-1"><CloudOff className="w-3 h-3" /> Local Mode</span>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onChangeView(item.id);
                HapticService.light();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === item.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label === 'Home' ? 'Dashboard' : item.label === 'People' ? 'Customers' : item.label === 'Create' ? 'New Invoice' : item.label}
            </button>
          ))}

          <button
            onClick={() => {
              setTheme(theme === 'dark' ? 'light' : 'dark');
              HapticService.medium();
            }}
            className="w-full mt-4 flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-blue-400" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
          <div className="text-xs text-slate-500 text-center">
            © 2025 BillFlow<br />by Lavneet Rathi
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navbar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-slate-100 z-50 border-t border-slate-800 pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${currentView === item.id ? 'text-blue-400' : 'text-slate-400'
                }`}
            >
              <item.icon className={`w-5 h-5 ${currentView === item.id ? 'fill-current/20' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => {
              setTheme(theme === 'dark' ? 'light' : 'dark');
              HapticService.medium();
            }}
            className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-slate-400"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-blue-400" />}
            <span className="text-[10px] font-medium">Mode</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-slate-400 hover:text-red-400 transition-colors"
            data-testid="button-logout-mobile"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;