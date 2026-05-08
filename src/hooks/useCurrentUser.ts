import { useCallback, useEffect, useState } from 'react';
import { supabase, type Profile } from '../lib/supabase';

export function useCurrentUser() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setError(authError.message);
      setProfile(null);
      setLoading(false);
      return;
    }
    const user = authData.user;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (profileError) setError(profileError.message);
    setProfile((data ?? null) as Profile | null);
    setLoading(false);
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  return { profile, data: profile, loading, error, refetch };
}
