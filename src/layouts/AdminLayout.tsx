import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard, Users, FileText, Kanban, FolderOpen, Tag,
  Building2, CheckSquare, Phone, MessageSquare, Mail, DollarSign,
  BarChart3, Settings, LogOut, Bell, Search, Menu, X, ChevronDown,
} from 'lucide-react';

const navSections = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
    ],
  },
  {
    label: 'Pipeline',
    items: [
      { icon: Users, label: 'Leads', href: '/admin/leads' },
      { icon: FileText, label: 'Applications', href: '/admin/applications' },
      { icon: Kanban, label: 'Pipeline', href: '/admin/pipeline' },
    ],
  },
  {
    label: 'Documents & Offers',
    items: [
      { icon: FolderOpen, label: 'Documents', href: '/admin/documents' },
      { icon: Tag, label: 'Offers', href: '/admin/offers' },
      { icon: Building2, label: 'Funders', href: '/admin/funders' },
    ],
  },
  {
    label: 'Activity',
    items: [
      { icon: CheckSquare, label: 'Tasks', href: '/admin/tasks' },
      { icon: Phone, label: 'Calls', href: '/admin/calls' },
      { icon: MessageSquare, label: 'SMS', href: '/admin/sms' },
      { icon: Mail, label: 'Email', href: '/admin/email' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { icon: DollarSign, label: 'Commissions', href: '/admin/commissions' },
      { icon: BarChart3, label: 'Reports', href: '/admin/reports' },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: Settings, label: 'Settings', href: '/admin/settings' },
    ],
  },
];

function NavItem({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) {
  const location = useLocation();
  const active = location.pathname === href || (href !== '/admin/dashboard' && location.pathname.startsWith(href));

  return (
    <Link
      to={href}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[14px] font-medium transition-colors ${
        active
          ? 'bg-slate-100 text-slate-900 font-semibold'
          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
      }`}
    >
      <Icon size={16} className={active ? 'text-accent-600' : 'text-slate-400'} />
      {label}
    </Link>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const pageTitle = navSections
    .flatMap((s) => s.items)
    .find((item) => location.pathname === item.href || (item.href !== '/admin/dashboard' && location.pathname.startsWith(item.href)))?.label || 'Admin';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const Sidebar = () => (
    <aside className="w-[260px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-200">
        <div className="w-8 h-8 bg-accent-600 rounded-md flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 9L7.5 4.5L12 9L7.5 13.5L3 9Z" fill="white" fillOpacity="0.7"/>
            <path d="M7.5 9L12 4.5L16.5 9L12 13.5L7.5 9Z" fill="white"/>
          </svg>
        </div>
        <div>
          <p className="text-[15px] font-bold text-navy-900 leading-none">
            Bypass <span className="text-accent-600">Solution</span>
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">CRM Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 px-3 mb-1.5">
              {section.label}
            </p>
            {section.items.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom user area */}
      <div className="border-t border-slate-200 p-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-[14px] text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 flex">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0">
          <button
            className="lg:hidden text-slate-500 hover:text-slate-700 mr-1"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <h1 className="text-[17px] font-semibold text-slate-900">{pageTitle}</h1>

          <div className="flex-1 max-w-xs hidden sm:block">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads, applications..."
                className="h-9 w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-4 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button className="relative w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-accent-600 flex items-center justify-center text-white text-[12px] font-bold">
                  A
                </div>
                <span className="text-[14px] font-medium text-slate-700 hidden sm:block">Admin</span>
                <ChevronDown size={13} className="text-slate-400" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-[13px] font-medium text-slate-800">Admin User</p>
                    <p className="text-[12px] text-slate-400">admin@bypasssolution.com</p>
                  </div>
                  <Link to="/admin/settings" className="block px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-50">
                    Settings
                  </Link>
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
