import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import Logo from '../components/brand/Logo';
import {
  LayoutDashboard, FileText, Kanban, FolderOpen, Tag, Building2, CheckSquare,
  MessageSquare, BarChart3, Settings, LogOut, Bell, Search, Menu, ChevronDown,
  Filter, Plus, ShieldCheck, ClipboardCheck, Moon, Sun,
} from 'lucide-react';

const CRM_THEME_STORAGE_KEY = 'bypass-crm-theme';
type CrmTheme = 'light' | 'dark';

const getPreferredCrmTheme = (): CrmTheme => {
  if (typeof window === 'undefined') return 'light';

  const savedTheme = window.localStorage.getItem(CRM_THEME_STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: FileText, label: 'Applications', href: '/admin/applications' },
  { icon: Kanban, label: 'Pipeline', href: '/admin/pipeline' },
  { icon: ClipboardCheck, label: 'Underwriting', href: '/admin/leads' },
  { icon: Tag, label: 'Offers', href: '/admin/offers' },
  { icon: FolderOpen, label: 'Documents', href: '/admin/documents' },
  { icon: Building2, label: 'Funding Partners', href: '/admin/funders' },
  { icon: MessageSquare, label: 'Communications', href: '/admin/email' },
  { icon: CheckSquare, label: 'Tasks', href: '/admin/tasks' },
  { icon: BarChart3, label: 'Reports', href: '/admin/reports' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

function NavItem({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) {
  const location = useLocation();
  const active = location.pathname === href || (href !== '/admin/dashboard' && location.pathname.startsWith(href));

  return (
    <Link
      to={href}
      className={`crm-nav-item group flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-semibold transition-all ${active ? 'is-active' : ''}`}
    >
      <Icon size={18} className="crm-nav-icon transition-colors" />
      {label}
    </Link>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const { profile } = useCurrentUser();
  const displayName = profile?.full_name || profile?.email || 'Current User';
  const displayEmail = profile?.email || '';
  const initials = (profile?.full_name || profile?.email || 'CU').split(/[ @.]+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState<CrmTheme>(getPreferredCrmTheme);

  useEffect(() => {
    window.localStorage.setItem(CRM_THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const Sidebar = () => (
    <aside className="crm-sidebar flex h-full w-[292px] flex-shrink-0 flex-col border-r backdrop-blur-xl">
      <div className="crm-sidebar-brand border-b px-8 py-7">
        <Logo size="lg" inverse={theme === 'dark'} />
        <p className="mt-3 text-[13px] font-medium">Working Capital. Smarter. Faster.</p>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      <div className="crm-sidebar-footer border-t p-5">
        <button onClick={handleLogout} className="crm-sidebar-logout flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-colors">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className={`crm-shell crm-theme-${theme} flex h-screen overflow-hidden`}>
      <div className="crm-ambient pointer-events-none fixed inset-0" />
      <div className="relative z-10 hidden lg:flex"><Sidebar /></div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <div className="absolute bottom-0 left-0 top-0 flex"><Sidebar /></div>
        </div>
      )}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="crm-topbar flex h-[86px] flex-shrink-0 items-center gap-5 border-b px-5 backdrop-blur-xl lg:px-9">
          <button className="crm-icon-button lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={22} /></button>

          <div className="min-w-[180px] flex-1 max-w-2xl">
            <div className="relative">
              <Search size={18} className="crm-search-icon absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search applications, businesses, contacts..."
                className="crm-topbar-search h-12 w-full rounded-xl border pl-12 pr-4 text-[14px] outline-none transition focus:ring-2"
              />
            </div>
          </div>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <button className="crm-secondary-action inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-[14px] font-semibold transition-colors">
              <Filter size={16} /> Filter
            </button>
            <Link to="/admin/applications" className="crm-primary-action inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-semibold text-white shadow-lg transition-colors">
              <Plus size={17} /> New Application
            </Link>
          </div>

          <button
            className="crm-theme-toggle inline-flex h-10 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition-all"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          <button className="crm-icon-button relative" aria-label="Notifications">
            <Bell size={19} />
            <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-[11px] font-bold text-white">3</span>
          </button>

          <div className="relative">
            <button onClick={() => setUserMenuOpen((v) => !v)} onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)} className="crm-user-button flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors">
              <div className="crm-avatar-ring h-10 w-10 rounded-full p-[2px]"><div className="crm-avatar grid h-full w-full place-items-center rounded-full text-[13px] font-bold">{initials}</div></div>
              <div className="hidden text-left xl:block"><p className="crm-user-name text-[14px] font-semibold">{displayName}</p><p className="crm-user-meta text-[12px]">{profile?.role === 'admin' ? 'Admin' : 'Rep'} • Production</p></div>
              <ChevronDown size={15} className="crm-muted-icon" />
            </button>
            {userMenuOpen && (
              <div className="crm-user-menu absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border py-2 shadow-2xl">
                <div className="border-b px-4 py-3"><p className="text-[13px] font-semibold">{displayName}</p><p className="text-[12px]">{displayEmail}</p></div>
                <Link to="/admin/settings" className="flex items-center gap-2 px-4 py-2 text-[13px]"><ShieldCheck size={14} /> Security settings</Link>
                <button onClick={handleLogout} className="block w-full px-4 py-2 text-left text-[13px] text-red-400">Sign Out</button>
              </div>
            )}
          </div>
        </header>

        <main className="crm-main flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}
