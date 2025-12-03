
import React, { useState } from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, FileText, Users, Package, PlusCircle, Receipt, Settings, Cloud, CloudOff, LogOut, Upload, Building2, ChevronDown, Check, UserPlus, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isCloudConnected?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isCloudConnected = false }) => {
  const { signOut } = useAuth();
  const { company, memberships, currentCompanyId, currentRole, switchCompany, hasMultipleCompanies } = useCompany();
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Home', icon: LayoutDashboard },
    { id: ViewState.INVOICES, label: 'Invoices', icon: FileText },
    { id: ViewState.CREATE_INVOICE, label: 'Create', icon: PlusCircle },
    { id: ViewState.INVENTORY, label: 'Stock', icon: Package },
    { id: ViewState.CUSTOMERS, label: 'People', icon: Users },
    { id: ViewState.IMPORT, label: 'Import', icon: Upload },
    { id: ViewState.SETTINGS, label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
  };

  const handleSwitchCompany = async (companyId: string) => {
    if (companyId !== currentCompanyId) {
      await switchCompany(companyId);
    }
    setShowCompanyDropdown(false);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'bg-yellow-500/20 text-yellow-300';
      case 'ADMIN': return 'bg-blue-500/20 text-blue-300';
      default: return 'bg-slate-500/20 text-slate-300';
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-slate-900 text-slate-100 min-h-screen flex-col flex-shrink-0 transition-all duration-300">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">BillFlow</h1>
            <p className="text-xs text-blue-300 font-semibold">by Lavneet Rathi</p>
            <div className="flex items-center gap-1 text-[10px] font-medium mt-0.5">
              {isCloudConnected ? (
                 <span className="text-green-400 flex items-center gap-1"><Cloud className="w-3 h-3"/> Cloud Sync</span>
              ) : (
                 <span className="text-slate-500 flex items-center gap-1"><CloudOff className="w-3 h-3"/> Local Mode</span>
              )}
            </div>
          </div>
        </div>

        {/* Company Switcher */}
        {memberships.length > 0 && (
          <div className="px-3 py-3 border-b border-slate-800">
            <div className="relative">
              <button
                onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                data-testid="button-company-switcher"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{company?.name || 'Select Company'}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {currentRole && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRoleBadgeColor(currentRole)}`}>
                      {currentRole}
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} />
                </div>
              </button>
              
              {showCompanyDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    {memberships.map((membership) => (
                      <button
                        key={membership.companyId}
                        onClick={() => handleSwitchCompany(membership.companyId)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-700 transition-colors ${
                          membership.companyId === currentCompanyId ? 'bg-blue-600/20' : ''
                        }`}
                        data-testid={`button-switch-company-${membership.companyId}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm truncate">{membership.companyName}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRoleBadgeColor(membership.role)}`}>
                            {membership.role}
                          </span>
                          {membership.companyId === currentCompanyId && (
                            <Check className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Add New Company Button - Only for users who can create */}
                  <div className="border-t border-slate-700 p-2">
                    <button
                      onClick={() => {
                        setShowCompanyDropdown(false);
                        onChangeView(ViewState.SETTINGS);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                      data-testid="button-add-company"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Add New Company
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
            © 2025 BillFlow<br/>by Lavneet Rathi
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
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${
                currentView === item.id ? 'text-blue-400' : 'text-slate-400'
              }`}
            >
              <item.icon className={`w-5 h-5 ${currentView === item.id ? 'fill-current/20' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
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