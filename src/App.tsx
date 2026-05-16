import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isSupabaseConfigured, missingSupabaseMessage, supabase } from './lib/supabase';
import { getCurrentUserRole, type RoleCheckResult } from './lib/auth';
import type { Session } from '@supabase/supabase-js';

// Layouts
import PublicLayout from './layouts/PublicLayout';


// Public pages
import Home from './pages/Home';
import Solutions from './pages/Solutions';
import Industries from './pages/Industries';
import HowItWorks from './pages/HowItWorks';
import About from './pages/About';
import FAQ from './pages/FAQ';
import Apply from './pages/Apply';
import FundingFitCheck from './pages/FundingFitCheck';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Disclosure from './pages/Disclosure';
import LegalSimple from './pages/LegalSimple';
import Unauthorized from './components/auth/Unauthorized';
import NotFound from './pages/NotFound';

// Admin pages are lazy-loaded so public landing pages do not ship CRM/reporting code.
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const Logout = lazy(() => import('./pages/admin/Logout'));
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

const legalPages = {
  applicationConsent: {
    title: 'Application Consent',
    intro: 'This consent explains the authorization used when a business owner submits a secure commercial funding application.',
    sections: [
      { title: 'Application Review', body: 'By submitting an application, you authorize review of business, owner, revenue, document, and funding request information for commercial funding options.' },
      { title: 'Partner Sharing', body: 'You authorize Elite Funding Solutions and Elite Funding Solutions advisors to share application information with funding partners only for commercial funding review and follow-up.' },
      { title: 'No Funding Guarantee', body: 'Submitting an application does not guarantee approval, funding amount, pricing, or timing. All offers are subject to underwriting and final agreements.' },
    ],
  },
  esignConsent: {
    title: 'E-Sign Consent',
    intro: 'This consent explains electronic delivery and electronic signature use for commercial funding records.',
    sections: [
      { title: 'Electronic Records', body: 'You consent to receive application records, disclosures, notices, and funding communications electronically where permitted by law.' },
      { title: 'Electronic Signature', body: 'Typing or submitting your legal name as a signature may be treated as an electronic signature for application authorization purposes.' },
      { title: 'Withdrawal', body: 'You may request paper records or withdraw e-sign consent by contacting the company, but doing so may slow or prevent electronic processing.' },
    ],
  },
  smsTerms: {
    title: 'SMS Terms',
    intro: 'SMS updates are optional and are not required to apply for or receive funding.',
    sections: [
      { title: 'Optional Consent', body: 'SMS consent is not a condition of funding. You may apply or check funding fit without agreeing to text messages.' },
      { title: 'Message Terms', body: 'Message frequency varies. Message and data rates may apply. Reply STOP to opt out and HELP for help where supported.' },
      { title: 'Use of SMS', body: 'SMS may be used for application follow-up, document reminders, status updates, and advisor coordination.' },
    ],
  },
  cookiePolicy: {
    title: 'Cookie Policy',
    intro: 'This policy explains how cookies and similar technologies support website functionality and funding inquiry follow-up.',
    sections: [
      { title: 'Functional Cookies', body: 'Cookies may help remember basic preferences, improve website behavior, and support form attribution.' },
      { title: 'Analytics and Attribution', body: 'We may use analytics and attribution data to understand which pages and campaigns lead to funding inquiries.' },
      { title: 'Browser Controls', body: 'You can control cookies through your browser settings. Blocking cookies may affect some site functionality.' },
    ],
  },
};

const crmHosts = new Set(['crm.bypasssolution.com', 'crm.bypasssolution.test']);

function isCrmHost() {
  if (typeof window === 'undefined') return false;
  return crmHosts.has(window.location.hostname.toLowerCase());
}

function CrmHostRedirect({ session }: { session: Session | null | undefined }) {
  if (session === undefined) return <LoadingScreen />;
  return <Navigate to={session ? '/admin/dashboard' : '/admin'} replace />;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0B1426] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );
}

function ConfigurationErrorScreen() {
  return (
    <div className="min-h-screen bg-[#0B1426] px-6 py-12 text-white flex items-center justify-center">
      <div className="max-w-lg rounded-2xl border border-red-300/20 bg-white/[0.06] p-8 shadow-2xl shadow-black/30">
        <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-red-200">Configuration required</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Supabase is not configured</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">{missingSupabaseMessage}</p>
        <p className="mt-4 text-xs leading-5 text-slate-400">Only the public anon key belongs in Vite/Vercel client environment variables. Never add a service-role key to frontend configuration.</p>
      </div>
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
        message={roleCheck?.setupMissing && import.meta.env.DEV ? 'CRM setup required' : 'Access not configured'}
        detail={roleCheck?.reason}
      />
    );
  }

  return <>{children}</>;
}

export default function App() {
  const onCrmHost = isCrmHost();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      return;
    }

    let active = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch(() => {
        if (active) setSession(null);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!isSupabaseConfigured && onCrmHost) {
    return <ConfigurationErrorScreen />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* CRM subdomain entrypoint */}
        {onCrmHost && (
          <>
            <Route path="/" element={<CrmHostRedirect session={session} />} />
            <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/applications" element={<Navigate to="/admin/applications" replace />} />
            <Route path="/pipeline" element={<Navigate to="/admin/pipeline" replace />} />
            <Route path="/underwriting" element={<Navigate to="/admin/leads" replace />} />
            <Route path="/offers" element={<Navigate to="/admin/offers" replace />} />
            <Route path="/documents" element={<Navigate to="/admin/documents" replace />} />
            <Route path="/funding-partners" element={<Navigate to="/admin/funders" replace />} />
            <Route path="/communications" element={<Navigate to="/admin/email" replace />} />
            <Route path="/tasks" element={<Navigate to="/admin/tasks" replace />} />
            <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
            <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
          </>
        )}

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
          {!onCrmHost && <Route path="/" element={<Home />} />}
          <Route path="/solutions" element={<Solutions />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/industries" element={<Industries />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/funding-fit-check" element={<FundingFitCheck />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/disclosure" element={<Disclosure />} />
          <Route path="/application-consent" element={<LegalSimple {...legalPages.applicationConsent} />} />
          <Route path="/esign-consent" element={<LegalSimple {...legalPages.esignConsent} />} />
          <Route path="/sms-terms" element={<LegalSimple {...legalPages.smsTerms} />} />
          <Route path="/cookie-policy" element={<LegalSimple {...legalPages.cookiePolicy} />} />
        </Route>

        {/* Admin login */}
        <Route path="/login" element={<Navigate to="/admin" replace />} />
        <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
        <Route path="/logout" element={<Logout />} />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
