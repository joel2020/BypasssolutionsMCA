import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { initialAuthError, isSupabaseConfigured, missingSupabaseMessage, supabase } from '../../lib/supabase';
import Logo from '../../components/brand/Logo';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(initialAuthError);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [message, setMessage] = useState('');

  const signInWithGoogle = async () => {
    setError('');
    setMessage('');
    if (!isSupabaseConfigured) { setError(missingSupabaseMessage); return; }
    setGoogleLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/admin`, queryParams: { prompt: 'select_account' } },
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in with Google. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isSupabaseConfigured) {
      setError(missingSupabaseMessage);
      setLoading(false);
      return;
    }

    setMessage('');
    try {
      if (recovering) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/admin/set-password`,
        });
        if (resetError) throw resetError;
        setMessage('Check your email for a password reset link. If an account exists, you will receive instructions.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1426] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" inverse />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Shield size={22} className="text-slate-600" />
            </div>
            <h1 className="text-[20px] font-bold text-navy-900">CRM Portal</h1>
            <p className="text-[14px] text-slate-500 mt-1">Sign in to the CRM dashboard</p>
          </div>

          {!recovering && <>
            <button type="button" onClick={signInWithGoogle} disabled={loading || googleLoading} className="flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.04 46.98 31.88 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 019.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.87 23.87 0 000 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              {googleLoading ? 'Connecting to Google…' : 'Sign in with Google'}
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-200" />or use your email<span className="h-px flex-1 bg-slate-200" /></div>
          </>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[14px] font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {!recovering && <div>
              <label className="block text-[14px] font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>}

            {message && <p role="status" className="text-sm text-green-700">{message}</p>}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2.5">
                <p role="alert" className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            <button type="submit" className="btn-primary w-full justify-center mt-1" disabled={loading || googleLoading}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                recovering ? 'Send reset link' : 'Sign In'
              )}
            </button>
            <button type="button" disabled={loading || googleLoading} onClick={() => { setRecovering(!recovering); setError(''); setMessage(''); }} className="text-sm text-blue-700 hover:underline">
              {recovering ? 'Back to sign in' : 'Forgot password?'}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-slate-600 mt-6">
          <a href="/" className="hover:text-slate-400 transition-colors">← Back to website</a>
        </p>
      </div>
    </div>
  );
}
