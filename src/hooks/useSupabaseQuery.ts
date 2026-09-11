import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

export interface QueryState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSupabaseQuery<T>(fetcher: () => Promise<T>, initialData: T, deps: DependencyList): QueryState<T> {
  const generation = useRef(0);
  const initial = useRef(initialData);
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (request === generation.current) setData(result);
    } catch (err) {
      if (request === generation.current) setError(err instanceof Error ? err.message : 'Unable to load CRM data.');
    } finally {
      if (request === generation.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- callers provide a focused dependency list for each Supabase query.
  }, deps);

  useEffect(() => {
    setData(initial.current);
    void refetch();
    // This is a request counter, not a DOM ref; invalidate the latest request on cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { generation.current++; };
  }, [refetch]);

  return { data, loading, error, refetch };
}
