import { useEffect, useState, type ReactNode } from 'react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useReps } from '../../hooks/useReps';
import { RepViewContext } from '../../hooks/useRepView';
import { validRepView } from '../../lib/repView';
import { supabase } from '../../lib/supabase';

export default function RepViewProvider({ children }: { children: ReactNode }) {
  const { profile } = useCurrentUser();
  const { data: profiles, loading, error } = useReps();
  const [selection, setSelection] = useState<{ actorId: string; repId: string } | null>(null);
  const available = profile?.status === 'active' && profile.role === 'admin';
  const reps = profiles.filter((rep) => rep.role === 'sales_rep' && rep.status === 'active');
  const target = !error && selection?.actorId === profile?.id
    ? validRepView(profile, reps.find((rep) => rep.id === selection?.repId) ?? null) : null;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') setSelection(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return <RepViewContext.Provider value={{
    target, reps, loading, error, available,
    selectRep: (id) => setSelection(available && profile && reps.some((rep) => rep.id === id)
      ? { actorId: profile.id, repId: id } : null),
  }}>{children}</RepViewContext.Provider>;
}
