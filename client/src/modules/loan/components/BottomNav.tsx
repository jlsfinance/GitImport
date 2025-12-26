import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const BottomNav: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({ path, icon, label, isFab = false }: { path: string, icon: string, label?: string, isFab?: boolean }) => {
    const active = isActive(path);

    if (isFab) {
      return (
        <div className="w-full flex justify-center -mt-6">
          <Link to={path} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity"></div>
            <div className="relative btn-kadak flex items-center justify-center w-14 h-14 rounded-2xl shadow-2xl active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-[28px] text-white font-variation-FILL-1">credit_score</span>
            </div>
          </Link>
        </div>
      );
    }

    return (
      <Link to={path} className="flex flex-col items-center gap-1 w-full group relative">
        <div className={`relative flex items-center justify-center w-16 h-9 rounded-full transition-all duration-300 ${active
          ? 'bg-indigo-100 dark:bg-indigo-900/40'
          : 'group-hover:bg-slate-100 dark:group-hover:bg-slate-800/50'
          }`}>
          <span className={`material-symbols-outlined text-[24px] transition-all duration-300 ${active
            ? 'text-indigo-600 dark:text-indigo-400 font-variation-FILL-1'
            : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
            }`}>
            {icon}
          </span>
          {active && (
            <div className="absolute -bottom-1 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
          )}
        </div>
        <span className={`text-[11px] font-semibold tracking-tight transition-all duration-300 ${active
          ? 'text-slate-900 dark:text-white'
          : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
          }`}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.4)] pb-safe lg:hidden">
      <div className="flex justify-around items-end h-20 max-w-md mx-auto px-4 pt-2 pb-3">
        <NavItem path="/loan" icon="dashboard" label="Home" />
        <NavItem path="/loan/customers" icon="group" label="Clients" />
        <NavItem path="/loan/loans" icon="credit_score" isFab />
        <NavItem path="/loan/finance" icon="account_balance_wallet" label="Finance" />
        <NavItem path="/loan/tools" icon="grid_view" label="Tools" />
      </div>
    </nav>
  );
};

export default BottomNav;