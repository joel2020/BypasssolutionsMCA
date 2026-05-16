import { ShieldAlert } from 'lucide-react';
import Logo from '../brand/Logo';
import { signOutAndClearAuthState, ADMIN_LOGIN_ROUTE } from '../../lib/auth';

interface UnauthorizedProps {
  message?: string;
  detail?: string;
}

function getWebsiteHref() {
  if (typeof window === 'undefined') return '/';
  return window.location.hostname.toLowerCase() === 'crm.bypasssolution.com'
    ? 'https://bypasssolution.com'
    : '/';
}

export default function Unauthorized({ message = 'Access not configured', detail }: UnauthorizedProps) {
  const body = detail || 'You are signed in, but this account has not been added to the Bypass Solution CRM yet. Please contact an administrator or sign out and use a different account.';

  return (
    <div className="min-h-screen bg-[#0B1426] flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl">
        <Logo size="md" className="justify-center mb-6" />
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <ShieldAlert size={26} className="text-red-600" />
        </div>
        <h1 className="text-[24px] font-bold text-navy-900">{message}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          {body}
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => void signOutAndClearAuthState(ADMIN_LOGIN_ROUTE)}
            className="btn-primary justify-center"
          >
            Sign out
          </button>
          <a href={getWebsiteHref()} className="btn-secondary justify-center">Return to website</a>
        </div>
        <a className="mt-5 inline-block text-[13px] font-semibold text-slate-500 hover:text-blue-700" href="mailto:support@bypasssolution.com">
          Contact admin
        </a>
      </div>
    </div>
  );
}
