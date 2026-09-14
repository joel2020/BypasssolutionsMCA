import { createContext, useContext } from 'react';
import type { Profile } from '../lib/supabase';

export interface RepViewState {
  target: Profile | null;
  selectRep: (id: string) => void;
  reps: Profile[];
  loading: boolean;
  error: string | null;
  available: boolean;
}

export const RepViewContext = createContext<RepViewState>({
  target: null, selectRep: () => {}, reps: [], loading: false, error: null, available: false,
});

export function useRepView() {
  return useContext(RepViewContext);
}
