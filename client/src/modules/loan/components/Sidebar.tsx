import React, { useState } from 'react';
import { APP_NAME } from '../constants';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import { useCompany } from '../context/CompanyContext';
import { useLoanAuth } from '../context/LoanAuthContext';
import AboutModal from './AboutModal';
import { useTheme } from 'next-themes';

interface MenuItem {
    title: string;
    icon: string;
    path?: string;
    submenu?: { title: string; path: string; icon?: string }[];
    action?: () => void;
}

const Sidebar: React.FC = () => {
    const { isOpen, closeSidebar } = useSidebar();
    const { currentCompany } = useCompany();
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const { signOut } = useLoanAuth();

    // We keep 'Loans' and 'Accounts' expanded by default or based on path? 
    // Let's keep specific logic if needed, but for now simple state.
    const [expandedMenus, setExpandedMenus] = useState<string[]>(['Credit Ledger', 'Accounts']);
    const [showAbout, setShowAbout] = useState(false);

    const handleLogout = async () => {
        if (window.confirm("Are you sure you want to logout?")) {
            try {
                await signOut();
                localStorage.removeItem('customerPortalId');
                localStorage.removeItem('customerPortalCompanyId');
                closeSidebar();
                navigate('/loan/login');
            } catch (error) {
                console.error("Logout error", error);
            }
        }
    };

    const toggleSubmenu = (title: string) => {
        setExpandedMenus(prev =>
            prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
        );
    };

    const handleLinkClick = () => {
        if (window.innerWidth < 1024) {
            // Defer closing sidebar to allow navigation to start smoothly and prevent potential render conflicts/blank screen
            setTimeout(() => {
                closeSidebar();
            }, 100);
        }
    };

    const menuItems: MenuItem[] = [
        { title: 'Dashboard', path: '/loan', icon: 'dashboard' },
        {
            title: 'Credit Ledger',
            icon: 'account_balance',
            submenu: [
                { title: 'All Records', path: '/loan/records', icon: 'list_alt' },
                { title: 'New Record', path: '/loan/records/new', icon: 'add_circle' },
                { title: 'Installment Calc', path: '/loan/tools/emi', icon: 'calculate' },
            ]
        },
        {
            title: 'Accounts',
            icon: 'payments',
            submenu: [
                { title: 'Overview', path: '/loan/finance', icon: 'finance' },
                { title: 'Receipts', path: '/loan/receipts', icon: 'receipt_long' },
                { title: 'Approvals', path: '/loan/approvals', icon: 'verified' },
                { title: 'Payment Out', path: '/loan/disbursal', icon: 'monetization_on' },
                { title: 'Collection List', path: '/loan/due-list', icon: 'pending_actions' },
            ]
        },
        { title: 'Customers', path: '/loan/customers', icon: 'group' },
        { title: 'Partners', path: '/loan/partners', icon: 'handshake' },
        { title: 'Tools', path: '/loan/tools', icon: 'construction' },
        { title: 'Downloads', path: '/loan/downloads', icon: 'folder_open' },
        { title: 'Settings', path: '/loan/settings', icon: 'settings' },
    ];

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar Container - Matched to AccountingApp Sidebar style */}
            <aside
                className={`fixed inset-y-0 left-0 z-[55] w-72 md:w-80 h-full 
                    bg-surface-container-low border-r border-border 
                    flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static 
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                {/* Header */}
                <div className="p-8 pb-6 flex-shrink-0">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[20px] bg-white dark:bg-slate-800 p-2 shadow-google border border-border flex items-center justify-center">
                                {/* App Logo Icon */}
                                <div className="text-2xl font-black text-google-blue">J</div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black font-heading tracking-tight text-foreground leading-none">{APP_NAME}</h1>
                                {currentCompany && (
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.05em] mt-1 max-w-[150px] truncate">
                                        {currentCompany.name}
                                    </p>
                                )}
                            </div>
                        </div>

                        <button onClick={closeSidebar} className="lg:hidden p-2 text-muted-foreground hover:bg-surface-container-high rounded-full transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto min-h-0" role="navigation">
                    {menuItems.map((item) => {
                        // Check if any submenu is active
                        const isSubActive = item.submenu?.some(sub => location.pathname === sub.path);
                        const isMainActive = item.path && location.pathname === item.path;
                        const isActive = isMainActive || (item.submenu && expandedMenus.includes(item.title) && isSubActive);

                        return (
                            <div key={item.title}>
                                {item.submenu ? (
                                    <div className="mb-1">
                                        <button
                                            onClick={() => toggleSubmenu(item.title)}
                                            className={`w-full group flex items-center justify-between px-6 py-4 rounded-full text-sm font-bold transition-all cursor-pointer ${expandedMenus.includes(item.title)
                                                ? 'text-foreground bg-surface-container-high'
                                                : 'text-muted-foreground hover:bg-surface-container-high hover:text-foreground'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className={`material-symbols-outlined text-[24px] ${expandedMenus.includes(item.title) ? 'text-google-blue' : ''}`}>{item.icon}</span>
                                                <span className="flex-1 text-left tracking-tight">{item.title}</span>
                                            </div>
                                            <span className={`material-symbols-outlined text-lg transition-transform duration-300 ${expandedMenus.includes(item.title) ? 'rotate-180' : 'text-slate-400'}`}>expand_more</span>
                                        </button>

                                        {/* Submenu */}
                                        <div className={`overflow-hidden transition-all duration-300 ${expandedMenus.includes(item.title) ? 'max-h-[600px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                            <div className="ml-6 pl-4 border-l-2 border-border space-y-1 my-2">
                                                {item.submenu.map((sub) => (
                                                    <NavLink
                                                        key={sub.path}
                                                        to={sub.path}
                                                        onClick={handleLinkClick}
                                                        className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-full text-sm transition-all duration-200 group cursor-pointer ${isActive
                                                            ? 'bg-google-blue text-white shadow-google font-bold'
                                                            : 'text-muted-foreground hover:text-foreground hover:bg-surface-container-high'
                                                            }`}
                                                    >
                                                        {sub.icon && <span className="material-symbols-outlined text-[18px] opacity-70">{sub.icon}</span>}
                                                        <span>{sub.title}</span>
                                                    </NavLink>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <NavLink
                                        to={item.path!}
                                        end={item.path === '/loan'}
                                        onClick={handleLinkClick}
                                        className={({ isActive }) => `w-full flex items-center gap-4 px-6 py-4 rounded-full text-sm font-bold transition-all mb-1 cursor-pointer ${isActive
                                            ? 'bg-google-blue text-white shadow-google scale-[1.02]'
                                            : 'text-muted-foreground hover:bg-surface-container-high hover:text-foreground'
                                            }`}
                                    >
                                        <span className={`material-symbols-outlined text-[24px] ${!isActive && 'group-hover:text-google-blue'}`}>{item.icon}</span>
                                        <span className="flex-1 text-left tracking-tight">{item.title}</span>
                                    </NavLink>
                                )}
                            </div>
                        )
                    })}

                    {/* Notification Link */}
                    <div className="mb-1">
                        <NavLink
                            to="/loan/notifications"
                            onClick={handleLinkClick}
                            className={({ isActive }) => `w-full flex items-center gap-4 px-6 py-4 rounded-full text-sm font-bold transition-all cursor-pointer ${isActive
                                ? 'bg-google-blue text-white shadow-google scale-[1.02]'
                                : 'text-muted-foreground hover:bg-surface-container-high hover:text-foreground'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[24px]">campaign</span>
                            <span className="flex-1 text-left tracking-tight">Notifications</span>
                        </NavLink>
                    </div>

                    <div className="h-4" />

                    {/* Theme Toggle Button */}
                    <button
                        onClick={() => {
                            setTheme(theme === 'dark' ? 'light' : 'dark');
                        }}
                        className="w-full flex items-center gap-4 px-6 py-4 rounded-full text-sm font-bold text-muted-foreground hover:bg-surface-container-high hover:text-foreground transition-all group cursor-pointer"
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${theme === 'dark' ? 'bg-google-yellow/10 text-google-yellow' : 'bg-google-blue/10 text-google-blue'
                            }`}>
                            <span className="material-symbols-outlined text-[20px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                        </div>
                        <span className="flex-1 text-left tracking-tight">Appearance</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                    </button>

                    {/* Add extra padding at bottom of scrollable area ensures last items aren't cut off */}
                    <div className="h-24 lg:hidden"></div>

                </nav>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-surface-container-low flex-shrink-0">
                    <button
                        onClick={() => {
                            localStorage.removeItem('active_module');
                            window.location.href = '/';
                        }}
                        className="w-full mb-2 flex items-center gap-4 px-6 py-4 rounded-[24px] bg-surface-container text-muted-foreground hover:bg-surface-container-high hover:text-foreground transition-all font-bold text-sm group cursor-pointer"
                    >
                        <span className="material-symbols-outlined">apps</span>
                        <span>Switch App</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-6 py-4 rounded-[24px] bg-google-red/5 text-google-red hover:bg-google-red hover:text-white transition-all font-bold text-sm group cursor-pointer"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        <span>Sign Out</span>
                    </button>

                    <button
                        onClick={() => { setShowAbout(true); closeSidebar(); }}
                        className="w-full mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-google-blue transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[16px]">info</span>
                        <span>About {APP_NAME}</span>
                    </button>
                </div>
            </aside>

            <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
        </>
    );
};

export default Sidebar;

