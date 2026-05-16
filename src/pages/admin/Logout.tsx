import { useEffect } from 'react';
import Logo from '../../components/brand/Logo';
import { ADMIN_LOGIN_ROUTE, signOutAndClearAuthState } from '../../lib/auth';

export default function Logout() {
  useEffect(() => {
    void signOutAndClearAuthState(ADMIN_LOGIN_ROUTE);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1426] flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-xl">
        <Logo size="md" className="justify-center mb-6" />
        <div className="mx-auto mb-5 h-6 w-6 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
        <h1 className="text-[20px] font-bold text-navy-900">Signing out</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
          Clearing this browser session and returning to the CRM login.
        </p>
      </div>
    </div>
  );
}
