
import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, FileText, Users, Package, PlusCircle, Receipt, Settings, Cloud, CloudOff } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isCloudConnected?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isCloudConnected = false }) => {
  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Home', icon: LayoutDashboard },
    { id: ViewState.INVOICES, label: 'Invoices', icon: FileText },
    { id: ViewState.CREATE_INVOICE, label: 'Create', icon: PlusCircle },
    { id: ViewState.INVENTORY, label: 'Stock', icon: Package },
    { id: ViewState.CUSTOMERS, label: 'People', icon: Users },
    { id: ViewState.SETTINGS, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-slate-900 text-slate-100 min-h-screen flex-col flex-shrink-0 transition-all duration-300">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">BillFlow</h1>
            <div className="flex items-center gap-1 text-[10px] font-medium mt-0.5">
              {isCloudConnected ? (
                 <span className="text-green-400 flex items-center gap-1"><Cloud className="w-3 h-3"/> Cloud Sync</span>
              ) : (
                 <span className="text-slate-500 flex items-center gap-1"><CloudOff className="w-3 h-3"/> Local Mode</span>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                currentView === item.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label === 'Home' ? 'Dashboard' : item.label === 'Stock' ? 'Inventory' : item.label === 'People' ? 'Customers' : item.label === 'Create' ? 'New Invoice' : item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          © 2025 BillFlow Sys
        </div>
      </div>

      {/* Mobile Bottom Navbar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-slate-100 z-50 border-t border-slate-800 pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                currentView === item.id ? 'text-blue-400' : 'text-slate-400'
              }`}
            >
              <item.icon className={`w-5 h-5 ${currentView === item.id ? 'fill-current/20' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
