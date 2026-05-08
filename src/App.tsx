import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { getCurrentUserRole, type RoleCheckResult } from './lib/auth';
import type { Session } from '@supabase/supabase-js';

// Layouts
import PublicLayout from './layouts/PublicLayout';


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
import Unauthorized from './components/auth/Unauthorized';

// Admin pages are lazy-loaded so public landing pages do not ship CRM/reporting code.
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Leads = lazy(() => import('./pages/admin/Leads'));
const LeadDetail = lazy(() => import('./pages/admin/LeadDetail'));
const Applications = lazy(() => import('./pages/admin/Applications'));
const Pipeline = lazy(() => import('./pages/admin/Pipeline'));
const Documents = lazy(() => import('./pages/admin/Documents'));
const Offers = lazy(() => import('./pages/admin/Offers'));
const Funders = lazy(() => import('./pages/admin/Funders'));
const Tasks = lazy(() => import('./pages/admin/Tasks'));
const Calls = lazy(() => import('./pages/admin/Calls'));
const SMS = lazy(() => import('./pages/admin/SMS'));
const Email = lazy(() => import('./pages/admin/Email'));
const Commissions = lazy(() => import('./pages/admin/Commissions'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const Settings = lazy(() => import('./pages/admin/Settings'));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0B1426] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );
}

function AdminGuard({ session, children }: { session: Session | null | undefined; children: React.ReactNode }) {
  const [roleCheck, setRoleCheck] = useState<RoleCheckResult | null>(null);
  const [checkingRole, setCheckingRole] = useState(false);

  useEffect(() => {
    let active = true;

    if (!session) {
      setRoleCheck(null);
      setCheckingRole(false);
      return;
    }

    setCheckingRole(true);
    getCurrentUserRole()
      .then((result) => {
        if (active) setRoleCheck(result);
      })
      .catch((error: unknown) => {
        if (active) {
          setRoleCheck({
            profile: null,
            role: null,
            allowed: false,
            reason: error instanceof Error ? error.message : 'Unable to verify CRM permissions.',
          });
        }
      })
      .finally(() => {
        if (active) setCheckingRole(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

  if (session === undefined || checkingRole) return <LoadingScreen />;
  if (!session) return <Navigate to="/admin" replace />;

  if (!roleCheck?.allowed) {
    return (
      <Unauthorized
        message={roleCheck?.setupMissing && import.meta.env.DEV ? 'CRM setup required' : 'Unauthorized access'}
        detail={roleCheck?.reason}
      />
    );
  }

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
      <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* SEO aliases */}
        <Route path="/funding-solutions" element={<Navigate to="/solutions" replace />} />
        <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
        <Route path="/terms-of-use" element={<Navigate to="/terms" replace />} />
        <Route path="/funding-disclosure" element={<Navigate to="/disclosure" replace />} />
        <Route path="/business-funding" element={<Navigate to="/solutions" replace />} />
        <Route path="/merchant-cash-advance" element={<Navigate to="/solutions" replace />} />
        <Route path="/working-capital" element={<Navigate to="/solutions" replace />} />
        <Route path="/revenue-based-financing" element={<Navigate to="/solutions" replace />} />

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
      </Suspense>
    </BrowserRouter>
  );
}
