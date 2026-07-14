import { useCallback, useEffect, useState } from 'react';
import { supabase, type Lead } from '../lib/supabase';
import { normaliseLead } from '../lib/leadNormalise';

export function useLead(id: string | undefined) {
  const [data, setData] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const refetch = useCallback(async () => {
    if (!id) {
      setData(null);
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    const { data: row, error: fetchError } = await supabase.from('leads').select('*').eq('id', id).maybeSingle();
    if (fetchError) setError(fetchError.message);
    setData(row ? normaliseLead(row as Record<string, unknown>) : null);
    setNotFound(!fetchError && row === null);
    setLoading(false);
  }, [id]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { data, loading, error, notFound, refetch };
}
