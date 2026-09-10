import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { ALL_FIELDS } from '../src/lib/leadEditFields';
const db = new PGlite();
const rep = '00000000-0000-0000-0000-000000000001';
const viewer = '00000000-0000-0000-0000-000000000002';
const other = '00000000-0000-0000-0000-000000000003';
const leadId = '10000000-0000-0000-0000-000000000001';
const migration = readFileSync(new URL('../supabase/migrations/20260910201059_crm_safe_lead_conversion.sql', import.meta.url), 'utf8');
beforeAll(async () => {
  const columns = ALL_FIELDS.map((field) => `${field.col} ${field.type === 'date' ? 'date' : field.col === 'nsfs_last_90_days' ? 'integer' : field.type === 'number' ? 'numeric' : 'text'}`).join(',');
  await db.exec(`
    create role authenticated; create role anon;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    create table profiles (id uuid primary key, full_name text, role text, status text);
    insert into profiles values ('${rep}', 'Rep', 'sales_rep', 'active'), ('${viewer}', 'Viewer', 'viewer', 'active'), ('${other}', 'Other', 'sales_rep', 'active');
    create function current_profile_role() returns text language sql security definer stable as $$select role from profiles where id=auth.uid() and status='active'$$;
    create function current_profile_name() returns text language sql security definer stable as $$select full_name from profiles where id=auth.uid() and status='active'$$;
    create function is_admin_role(roles text[]) returns boolean language sql stable as $$select coalesce(current_profile_role()=any(roles),false)$$;
    create table leads (id uuid primary key, ${columns}, assigned_to uuid, assigned_rep text, notes text, legal_name text, requested_amount numeric, gross_monthly_revenue numeric, status text default 'New Lead', submitted_at timestamptz);
    create table applications (id uuid primary key default gen_random_uuid(), lead_id uuid, status text, source text, requested_amount numeric, monthly_revenue numeric, assigned_to uuid, submitted_at timestamptz, created_at timestamptz default now());
    create table documents (id uuid primary key default gen_random_uuid(), lead_id uuid, doc_type text, status text, storage_path text);
    grant usage on schema public, auth to authenticated, anon;
    grant all on all tables in schema public to authenticated;
    alter table leads enable row level security;
    create policy legacy_all on leads for all to authenticated using (true) with check (true);
  `);
  // Exercise the real ownership helpers that the production migration depends on.
  for (const [file, name] of [['20260714120000_rep_row_level_security.sql', 'can_see_lead'], ['20260714140000_scope_reps_to_own_records.sql', 'can_write_lead']]) {
    const source = readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8');
    const start = source.indexOf(`create or replace function public.${name}(`);
    await db.exec(source.slice(start, source.indexOf('$$;', start) + 3));
  }
  await db.exec(migration);
}, 20000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec(`delete from documents; delete from applications; delete from leads;
    insert into leads (id,business_name,assigned_to,assigned_rep,source) values ('${leadId}','Example','${rep}','Rep','CRM');
    insert into documents (lead_id,doc_type,status,storage_path) select '${leadId}', 'Bank Statement', 'Uploaded', 'leads/test-' || n from generate_series(1,4) n;`);
});
const run = (query: string, params: unknown[] = [], user = rep) => db.transaction(async (tx) => {
  await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [user]);
  await tx.exec('set local role authenticated');
  return tx.query(query, params);
});
const convert = (patch: object = {}, user = rep) => run('select convert_lead_to_submission($1::uuid,$2::jsonb) as id', [leadId, JSON.stringify(patch)], user);
it('converts a rep-owned lead, saves nullable dates and reuses the same application on retry', async () => {
  const result = await convert({ business_name: 'Saved business', start_date: null, owner_dob: null, monthly_revenue: 10000, funding_amount_requested: 20000 });
  const repeated = await convert();
  expect(result.rows).toEqual(repeated.rows);
  expect((await db.query('select count(*)::int as count from applications')).rows).toEqual([{ count: 1 }]);
  expect((await db.query('select business_name,status,start_date from leads')).rows).toEqual([{ business_name: 'Saved business', status: 'Under Review', start_date: null }]);
});
it('does not move the lead when application creation fails', async () => {
  await db.exec("alter table applications add constraint fail_insert check (requested_amount < 0)");
  try {
    await expect(convert({ business_name: 'Must roll back', funding_amount_requested: 5000 })).rejects.toThrow();
    expect((await db.query('select business_name,status from leads')).rows).toEqual([{ business_name: 'Example', status: 'New Lead' }]);
  } finally { await db.exec('alter table applications drop constraint fail_insert'); }
});
it('rejects missing and rejected bank statements on the server', async () => {
  await db.exec("update documents set status='Rejected' where storage_path='leads/test-4'");
  await expect(convert()).rejects.toThrow(/4.*bank statements/i);
  expect((await db.query('select count(*)::int as count from applications')).rows).toEqual([{ count: 0 }]);
});
it.each([viewer, other])('denies conversion for a viewer or another rep (%s)', async (user) => {
  await expect(convert({}, user)).rejects.toThrow();
  expect((await db.query('select count(*)::int as count from applications')).rows).toEqual([{ count: 0 }]);
});
it('restricts direct reads and writes even if a broad legacy policy remains', async () => {
  expect((await run('select id from leads', [], other)).rows).toEqual([]);
  expect((await run("update leads set business_name='Wrong' returning id", [], viewer)).rows).toEqual([]);
});
it('rejects invalid dates without partially saving the lead', async () => {
  await expect(convert({ start_date: '', business_name: 'Wrong' })).rejects.toThrow();
  expect((await db.query('select business_name from leads')).rows).toEqual([{ business_name: 'Example' }]);
});
