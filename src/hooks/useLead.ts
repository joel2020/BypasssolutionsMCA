import { useCallback, useEffect, useState } from 'react';
import { supabase, type Lead } from '../lib/supabase';

// Mirrors the normalisation in useLeads: the table has redundant amount columns
// and some rows only populate one of each, which rendered deals as "$0".
function normaliseLead(row: Record<string, unknown>): Lead {
  const num = (key: string) => Number(row[key] ?? 0) || 0;
  const requested = num('funding_amount_requested') || num('requested_amount');
  const monthly =
    num('monthly_revenue') ||
    num('gross_monthly_revenue') ||
    (num('annual_revenue') ? Math.round(num('annual_revenue') / 12) : 0);
  return { ...(row as unknown as Lead), funding_amount_requested: requested, monthly_revenue: monthly };
}

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
