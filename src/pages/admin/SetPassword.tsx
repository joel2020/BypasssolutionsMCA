import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

export default function SetPassword({ session, onComplete }: { session: Session | null | undefined; onComplete: () => void }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!session) return;
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirmation) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword('');
      setConfirmation('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your password. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1426] flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-xl font-bold text-navy-900">Set your CRM password</h1>
        {session === undefined ? <p role="status" className="mt-4 text-sm">Checking your invitation...</p> : !session ? (
          <div className="mt-4 space-y-4 text-sm">
            <p role="alert">This link is invalid or expired. Request a new password reset link to continue.</p>
            <Link to="/admin" onClick={onComplete} className="text-blue-700 hover:underline">Return to sign in</Link>
          </div>
        ) : saved ? (
          <div className="mt-4 space-y-4">
            <p role="status" className="text-sm text-green-700">Password saved. You can now sign in with your email and password.</p>
            <button className="btn-primary" onClick={() => { onComplete(); navigate('/admin/dashboard', { replace: true }); }}>Continue to CRM</button>
          </div>
        ) : (
          <form onSubmit={save} className="mt-5 space-y-4">
            <p className="text-sm text-slate-600">Choose a password for your invited account or reset your existing password.</p>
            <div><label htmlFor="new-password" className="text-sm font-medium">New password</label><input id="new-password" className="input-field mt-1" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
            <div><label htmlFor="confirm-password" className="text-sm font-medium">Confirm password</label><input id="confirm-password" className="input-field mt-1" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={saving} className="btn-primary w-full justify-center disabled:opacity-60">{saving ? 'Saving...' : 'Save password'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
