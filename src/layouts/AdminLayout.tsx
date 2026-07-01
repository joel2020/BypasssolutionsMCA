import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import Logo from '../components/brand/Logo';
import {
  LayoutDashboard, FileText, Kanban, FolderOpen, Tag, Building2, CheckSquare,
  MessageSquare, BarChart3, Settings, LogOut, Bell, Search, Menu, ChevronDown,
  Filter, Plus, ShieldCheck, ClipboardCheck,
} from 'lucide-react';

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
      className={`group flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-semibold transition-all ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-950/30'
          : 'text-slate-300 hover:text-white hover:bg-white/8'
      }`}
    >
      <Icon size={18} className={active ? 'text-white' : 'text-slate-400 group-hover:text-blue-300'} />
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const Sidebar = () => (
    <aside className="w-[292px] flex-shrink-0 border-r border-white/10 bg-[#07152c]/95 backdrop-blur-xl flex flex-col h-full">
      <div className="px-8 py-7 border-b border-white/10">
        <Logo size="lg" inverse />
        <p className="text-[13px] text-blue-100/90 font-medium mt-3">Working Capital. Smarter. Faster.</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      <div className="border-t border-white/10 p-5">
        <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-[13px] text-slate-400 hover:text-red-200 hover:bg-red-500/10 transition-colors">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#020a18] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.25),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.15),transparent_30%)]" />
      <div className="hidden lg:flex relative z-10"><Sidebar /></div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 flex"><Sidebar /></div>
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-[86px] border-b border-white/8 bg-[#061127]/85 backdrop-blur-xl flex items-center px-5 lg:px-9 gap-5 flex-shrink-0">
          <button className="lg:hidden text-slate-300 hover:text-white" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>

          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search applications, businesses, contacts..."
                className="h-12 w-full rounded-lg border border-white/12 bg-white/[0.055] pl-12 pr-4 text-[14px] text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 ml-auto">
            <button onClick={() => navigate('/admin/applications')} className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-[14px] font-semibold text-slate-100 hover:bg-white/10">
              <Filter size={16} /> Filter
            </button>
            <Link to="/admin/applications?new=1" className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-[14px] font-semibold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500">
              <Plus size={17} /> New Application
            </Link>
          </div>

          <div className="relative">
            <button onClick={() => setNotificationsOpen((v) => !v)} className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
              <Bell size={19} />
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-[11px] font-bold text-white">3</span>
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-white/10 bg-[#0b1730] p-2 shadow-2xl">
                {[
                  ['New leads', 'Review today\'s new CRM leads.', '/admin/leads'],
                  ['Open tasks', 'See pending follow-ups.', '/admin/tasks'],
                  ['Documents', 'Review uploaded files.', '/admin/documents'],
                ].map(([title, body, href]) => (
                  <button key={title} onClick={() => { setNotificationsOpen(false); navigate(href); }} className="block w-full rounded-lg px-3 py-3 text-left hover:bg-white/10">
                    <p className="text-[13px] font-semibold text-white">{title}</p>
                    <p className="mt-0.5 text-[12px] text-slate-400">{body}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={() => setUserMenuOpen((v) => !v)} onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/10 transition-colors">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-200 to-blue-200 p-[2px]"><div className="grid h-full w-full place-items-center rounded-full bg-[#132442] text-[13px] font-bold text-white">{initials}</div></div>
              <div className="hidden xl:block text-left"><p className="text-[14px] font-semibold text-white">{displayName}</p><p className="text-[12px] text-slate-400">{profile?.role === 'admin' ? 'Admin' : 'Rep'} • Production</p></div>
              <ChevronDown size={15} className="text-slate-400" />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-[#0b1730] shadow-2xl py-2 z-20">
                <div className="px-4 py-3 border-b border-white/10"><p className="text-[13px] font-semibold text-white">{displayName}</p><p className="text-[12px] text-slate-400">{displayEmail}</p></div>
                <Link to="/admin/settings" className="flex items-center gap-2 px-4 py-2 text-[13px] text-slate-300 hover:bg-white/10"><ShieldCheck size={14} /> Security settings</Link>
                <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-[13px] text-red-300 hover:bg-red-500/10">Sign Out</button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-transparent"><Outlet /></main>
      </div>
    </div>
  );
}
