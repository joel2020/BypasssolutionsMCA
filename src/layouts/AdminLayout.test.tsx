// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { useLeads } from '../hooks/useLeads';
import { useScope } from '../hooks/useScope';
import { useOffers } from '../hooks/useOffers';
import { useDocuments } from '../hooks/useDocuments';
import { useTasks } from '../hooks/useTasks';
import { useCommissions } from '../hooks/useCommissions';

const mocks = vi.hoisted(() => ({ role: 'admin', status: 'active', authChanged: (() => {}) as (event: string) => void, signOut: vi.fn() }));
vi.mock('../hooks/useCurrentUser', () => ({ useCurrentUser: () => ({ profile: { id: 'admin', full_name: 'Admin', role: mocks.role, status: mocks.status } }) }));
vi.mock('../hooks/useReps', () => ({ useReps: () => ({ loading: false, error: null, data: [
  { id: 'a', full_name: 'Rep A', role: 'sales_rep', status: 'active' },
  { id: 'b', full_name: 'Rep B', role: 'sales_rep', status: 'active' },
  { id: 'inactive', full_name: 'Disabled Rep', role: 'sales_rep', status: 'disabled' },
] }) }));
vi.mock('../lib/supabase', () => ({ supabase: { auth: { signOut: mocks.signOut, onAuthStateChange: (cb: typeof mocks.authChanged) => {
  mocks.authChanged = cb; return { data: { subscription: { unsubscribe: () => {} } } };
} } } }));
vi.mock('../hooks/useSupabaseQuery', () => ({ useSupabaseQuery: () => ({ loading: false, error: null, refetch: vi.fn(), data: [
  { id: 'record-a', assigned_to: 'a', assigned_rep: null, rep_name: 'Rep A', lead_id: 'record-a', leads: { assigned_to: 'a', assigned_rep: null } },
  { id: 'record-b', assigned_to: null, assigned_rep: 'Rep B', rep_name: 'Rep B', lead_id: 'record-b', leads: { assigned_to: null, assigned_rep: 'Rep B' } },
] }) }));

function Records() {
  const { profile } = useScope();
  const queries = [useLeads(), useOffers(), useDocuments(), useTasks(), useCommissions()];
  return <><p>Actor: {profile?.id}</p>{queries.map((query, i) => <p key={i}>{['Leads', 'Offers', 'Documents', 'Tasks', 'Commissions'][i]}: {query.data.map((row) => row.id).join(',')}</p>)}</>;
}
function mount() {
  return render(<MemoryRouter initialEntries={['/admin/dashboard']}><Routes><Route path="/admin" element={<AdminLayout />}>
    <Route path="dashboard" element={<Records />} /><Route path="settings" element={<p>Private account settings</p>} />
  </Route></Routes></MemoryRouter>);
}
beforeEach(() => { mocks.role = 'admin'; mocks.status = 'active'; });
afterEach(cleanup);

it('switches every record surface immediately, preserves admin identity, and restores all records on exit', () => {
  mount();
  expect(screen.getByText('Leads: record-a,record-b')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Ninja mode rep'), { target: { value: 'a' } });
  expect(screen.getByText('Ninja mode · Viewing as Rep A')).toBeTruthy();
  expect(screen.getByText('Actor: admin')).toBeTruthy();
  for (const label of ['Leads', 'Offers', 'Documents', 'Tasks', 'Commissions']) expect(screen.getByText(`${label}: record-a`)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Ninja mode rep'), { target: { value: 'b' } });
  expect(screen.getByText('Leads: record-b')).toBeTruthy();
  expect(screen.queryByText('Leads: record-a')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Exit Ninja mode' }));
  expect(screen.getByText('Leads: record-a,record-b')).toBeTruthy();
});

it('does not open the admin account settings while showing a rep view', () => {
  mount();
  fireEvent.change(screen.getByLabelText('Ninja mode rep'), { target: { value: 'a' } });
  fireEvent.click(screen.getByRole('link', { name: 'Settings' }));
  expect(screen.queryByText('Private account settings')).toBeNull();
  expect(screen.getByText('Exit Ninja mode to open your email or account settings.')).toBeTruthy();
});

it.each(['sales_rep', 'underwriter', 'viewer'])('does not offer Ninja mode to %s', (role) => {
  mocks.role = role; mount(); expect(screen.queryByLabelText('Ninja mode rep')).toBeNull();
});

it('excludes disabled reps and removes the view if admin access is revoked', () => {
  const view = mount();
  expect(screen.queryByRole('option', { name: 'Disabled Rep' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Ninja mode rep'), { target: { value: 'a' } });
  mocks.status = 'disabled';
  view.rerender(<MemoryRouter><AdminLayout /></MemoryRouter>);
  expect(screen.queryByLabelText('Ninja mode rep')).toBeNull();
  expect(screen.queryByText('Ninja mode · Viewing as Rep A')).toBeNull();
});
