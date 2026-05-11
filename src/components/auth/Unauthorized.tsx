import { Link, useNavigate } from 'react-router-dom';
import { Home, LogOut, ShieldAlert } from 'lucide-react';
import Logo from '../brand/Logo';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

interface UnauthorizedProps {
  message?: string;
  detail?: string;
}

export default function Unauthorized({ message = 'Unauthorized access', detail }: UnauthorizedProps) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut({ scope: 'local' });
      }
    } finally {
      navigate('/admin', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1426] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.24),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_28%)]" />
      <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-white p-8 text-center shadow-2xl shadow-black/30">
        <Logo size="md" className="justify-center mb-6" />
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <ShieldAlert size={26} className="text-red-600" />
        </div>
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-accent-600">CRM access check</p>
        <h1 className="mt-2 text-[24px] font-bold text-navy-900">{message}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          {detail || 'Your Supabase account is signed in, but it does not have an active authorized CRM profile yet.'}
        </p>
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left text-[13px] leading-6 text-blue-900">
          <strong>What to do next:</strong> sign out and use another CRM account, or ask an administrator to create/activate your profile in <code className="rounded bg-white/70 px-1">public.profiles</code>.
        </div>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={handleSignOut} className="btn-primary justify-center">
            <LogOut size={16} /> Sign out and return to login
          </button>
          <Link to="/" className="btn-secondary justify-center">
            <Home size={16} /> Return to Website
          </Link>
        </div>
      </div>
    </div>
  );
}
