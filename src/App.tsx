import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Public pages
import Home from './pages/Home';
import Solutions from './pages/Solutions';
import Industries from './pages/Industries';
import HowItWorks from './pages/HowItWorks';
import Apply from './pages/Apply';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Disclosure from './pages/Disclosure';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import Leads from './pages/admin/Leads';
import LeadDetail from './pages/admin/LeadDetail';
import Applications from './pages/admin/Applications';
import Pipeline from './pages/admin/Pipeline';
import Documents from './pages/admin/Documents';
import Offers from './pages/admin/Offers';
import Funders from './pages/admin/Funders';
import Tasks from './pages/admin/Tasks';
import Calls from './pages/admin/Calls';
import SMS from './pages/admin/SMS';
import Email from './pages/admin/Email';
import Commissions from './pages/admin/Commissions';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';

function AdminGuard({ session, children }: { session: Session | null; children: React.ReactNode }) {
  if (session === undefined) {
    // Still loading — show nothing to avoid flash
    return (
      <div className="min-h-screen bg-[#0B1426] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public site */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/solutions" element={<Solutions />} />
          <Route path="/industries" element={<Industries />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/disclosure" element={<Disclosure />} />
        </Route>

        {/* Admin login */}
        <Route
          path="/admin"
          element={
            session ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin />
          }
        />

        {/* Admin CRM — protected */}
        <Route
          path="/admin"
          element={
            <AdminGuard session={session}>
              <AdminLayout />
            </AdminGuard>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="leads/:id" element={<LeadDetail />} />
          <Route path="applications" element={<Applications />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="documents" element={<Documents />} />
          <Route path="offers" element={<Offers />} />
          <Route path="funders" element={<Funders />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calls" element={<Calls />} />
          <Route path="sms" element={<SMS />} />
          <Route path="email" element={<Email />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
