import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';

const migration = (name) => readFileSync(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8');
const core = migration('20260507183928_create_core_schema');
const expansion = migration('20260508090000_mca_application_crm_expansion');
const security = migration('20260507203000_production_admin_roles_and_secure_crm');
const repScope = migration('20260714120000_rep_row_level_security');
const childScope = migration('20260714140000_scope_reps_to_own_records');
const table = (source, name) => source.match(new RegExp(`create table if not exists (?:public\\.)?${name} \\([\\s\\S]*?\\n\\);`, 'i'))[0];
const helper = (source, name) => source.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`, 'i'))[0];
const rep = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
let db;

beforeAll(async () => {
  db = new PGlite();
  // Use actual table definitions and authorization helpers/policies. Only auth
  // session plumbing and unrelated parent tables are fixtures.
  await db.exec(`
    create role authenticated; create role anon;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    create table public.profiles (id uuid primary key, full_name text, email text, role text, status text);
    create table public.companies (id uuid primary key);
    ${table(core, 'leads')}
    alter table leads add column assigned_to uuid references auth.users(id);
    alter table leads add column submitted_at timestamptz;
    alter table leads add column requested_amount numeric default 0;
    ${table(expansion, 'applications')}
    ${table(core, 'documents')}
    alter table documents add column application_id uuid references applications(id);
    ${helper(security, 'is_admin_role')}
    ${helper(security, 'current_profile_role')}
    ${helper(repScope, 'current_profile_name')}
    ${helper(repScope, 'can_see_lead')}
    ${helper(childScope, 'can_write_lead')}
    alter table leads enable row level security;
    ${repScope.slice(repScope.indexOf('create policy "Scoped read leads"'), repScope.indexOf('-- 3. Child tables'))}
    ${childScope.slice(childScope.indexOf('do $$'), childScope.indexOf('end $$;') + 'end $$;'.length)}
    grant select, insert, update, delete on all tables in schema public to authenticated;
  `);
  await db.exec(migration('20260923120000_direct_crm_submissions'));
}, 30000);

afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec(`reset role; truncate auth.users, profiles, leads, applications, documents cascade;
    insert into auth.users values ('${rep}'), ('${other}');
    insert into profiles values ('${rep}', 'Rep One', 'one@example.test', 'sales_rep', 'active'), ('${other}', 'Rep Two', 'two@example.test', 'sales_rep', 'active');
    select set_config('request.jwt.claim.sub', '${rep}', false); set role authenticated;`);
});
const create = (id = randomUUID(), name = 'Business', amount = 0) => db.query('select create_crm_submission($1::uuid, $2::text, $3::numeric) as result', [id, name, amount]);
const convert = (id) => db.query('select convert_lead_to_submission($1::uuid) as id', [id]);
const seedLead = async () => {
  const id = randomUUID();
  await db.exec(`reset role; insert into leads (id, business_name, assigned_to, assigned_rep, created_by, source) values ('${id}', 'Existing', '${rep}', 'Rep One', '${rep}', 'CRM'); set role authenticated;`);
  return id;
};

describe('direct submission migration', () => {
  it('creates a minimal linked draft with no consent or lender submission timestamp', async () => {
    const id = randomUUID();
    await create(id);
    const { rows: [row] } = await db.query('select l.status, l.email, l.assigned_to, l.assigned_rep, l.consent, l.submitted_at, a.status as application_status from leads l join applications a on a.lead_id = l.id');
    expect(row).toEqual({ status: 'Documents Needed', email: '', assigned_to: rep, assigned_rep: 'Rep One', consent: false, submitted_at: null, application_status: 'New' });
  });

  it('uses the rep email when their display name is missing, matching CRM visibility filters', async () => {
    await db.exec(`reset role; update profiles set full_name = '' where id = '${rep}'; set role authenticated;`);
    await create();
    expect((await db.query('select assigned_rep from leads')).rows[0].assigned_rep).toBe('one@example.test');
  });

  it('retries without duplicating records or reverting an advanced stage', async () => {
    const id = randomUUID();
    await create(id);
    await db.query("update leads set status = 'Under Review' where id = $1", [id]);
    await create(id);
    expect((await db.query('select count(*)::int as count from applications')).rows[0].count).toBe(1);
    expect((await db.query('select status from leads')).rows[0].status).toBe('Under Review');
  });

  it('rolls back the lead if application creation fails', async () => {
    await db.exec("reset role; alter table applications add constraint simulated_failure check (status <> 'New'); set role authenticated;");
    try {
      await expect(create()).rejects.toThrow('simulated_failure');
      expect((await db.query('select count(*)::int as count from leads')).rows[0].count).toBe(0);
    } finally { await db.exec('reset role; alter table applications drop constraint simulated_failure; set role authenticated;'); }
  });

  it('rejects missing business names and negative amounts', async () => {
    await expect(create(randomUUID(), ' ')).rejects.toThrow('Business name');
    await expect(create(randomUUID(), 'Business', -1)).rejects.toThrow('Requested amount');
  });

  it.each(['viewer', 'disabled'])('denies %s users', async (kind) => {
    await db.exec(`reset role; update profiles set ${kind === 'viewer' ? "role = 'viewer'" : "status = 'disabled'"} where id = '${rep}'; set role authenticated;`);
    await expect(create()).rejects.toThrow('permission');
  });

  it('denies anonymous execution', async () => {
    await db.exec('reset role; set role anon;');
    await expect(create()).rejects.toThrow('permission denied');
  });

  it('prevents another rep from reusing a request ID or converting the lead', async () => {
    const id = randomUUID();
    await create(id);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [other]);
    await expect(create(id)).rejects.toThrow();
    await expect(convert(id)).rejects.toThrow('Unable to access');
  });

  it('allows conversion with no bank statements and reuses the existing application', async () => {
    const id = await seedLead();
    const first = await convert(id);
    expect((await convert(id)).rows).toEqual(first.rows);
    expect((await db.query('select count(*)::int as count from applications')).rows[0].count).toBe(1);
    expect((await db.query('select status, submitted_at from leads')).rows[0]).toEqual({ status: 'Documents Needed', submitted_at: null });
  });

  it('links an existing combined statement PDF during conversion', async () => {
    const id = await seedLead();
    await db.query("insert into documents (lead_id, file_name, doc_type) values ($1, 'four-months.pdf', 'Bank Statement')", [id]);
    const { rows: [result] } = await convert(id);
    expect((await db.query('select application_id from documents')).rows[0].application_id).toBe(result.id);
  });

  it('keeps the lead stage unchanged when conversion fails', async () => {
    const id = await seedLead();
    await db.exec("reset role; alter table applications add constraint simulated_failure check (status <> 'New'); set role authenticated;");
    try {
      await expect(convert(id)).rejects.toThrow('simulated_failure');
      expect((await db.query('select status from leads')).rows[0].status).toBe('New Lead');
    } finally { await db.exec('reset role; alter table applications drop constraint simulated_failure; set role authenticated;'); }
  });
  it('rolls back application creation when the lead stage update fails', async () => {
    const id = await seedLead();
    await db.exec("reset role; alter table leads add constraint simulated_stage_failure check (status <> 'Documents Needed'); set role authenticated;");
    try {
      await expect(convert(id)).rejects.toThrow('simulated_stage_failure');
      expect((await db.query('select count(*)::int as count from applications')).rows[0].count).toBe(0);
      expect((await db.query('select status from leads')).rows[0].status).toBe('New Lead');
    } finally { await db.exec('reset role; alter table leads drop constraint simulated_stage_failure; set role authenticated;'); }
  });

  it.each(['admin', 'underwriter'])('allows an active %s to create a draft', async (role) => {
    await db.exec(`reset role; update profiles set role = '${role}' where id = '${rep}'; set role authenticated;`);
    await expect(create()).resolves.toBeDefined();
  });

  it('rejects draft inserts assigned to another rep', async () => {
    await expect(db.query("insert into leads (business_name, status, source, assigned_to, created_by, consent) values ('Business', 'Documents Needed', 'CRM', $1, $2, false)", [other, rep])).rejects.toThrow('row-level security');
  });

});
