import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';

const db = new PGlite();
const id = '10000000-0000-0000-0000-000000000001';
beforeAll(async () => {
  await db.exec(`create role authenticated; create role anon; create role supabase_auth_admin; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, is_anonymous boolean default false, banned_until timestamptz, raw_user_meta_data jsonb);
    create table auth.identities(user_id uuid references auth.users(id),provider text,identity_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user',true),'')::uuid$$;
    create table public.profiles(id uuid primary key references auth.users(id),email text,full_name text,role text,status text);
    alter table public.profiles enable row level security;
    grant usage on schema public,auth to authenticated,anon;
    insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values ('${id}','new@bypasssolution.com',now(),'{"role":"admin","full_name":"Another Rep"}');
    insert into auth.identities values ('${id}','google','{"email":"new@bypasssolution.com","email_verified":true}');`);
  await db.exec(readFileSync(new URL('../supabase/migrations/20260914194556_company_crm_self_enrollment.sql', import.meta.url), 'utf8'));
}, 20000);
afterAll(async () => { await db.close(); });

async function enroll(email = 'new@bypasssolution.com', confirmed = true, existingStatus?: string, verifiedGoogle = true) {
  return db.transaction(async (tx) => {
    await tx.exec('delete from public.profiles');
    await tx.query('update auth.users set email=$1,email_confirmed_at=$2 where id=$3', [email, confirmed ? new Date() : null, id]);
    await tx.query('update auth.identities set identity_data=$1::jsonb', [JSON.stringify({ email, email_verified: verifiedGoogle })]);
    if (existingStatus) await tx.query('insert into public.profiles values ($1,$2,$3,$4,$5)', [id, email, 'Existing Name', 'viewer', existingStatus]);
    await tx.query("select set_config('test.user',$1,true)", [id]);
    await tx.exec('set local role authenticated');
    const result = await tx.query('select public.enroll_company_crm_user() as enrolled');
    await tx.exec('reset role');
    const profiles = await tx.query('select email,full_name,role,status from public.profiles');
    return { result: result.rows, profiles: profiles.rows };
  });
}

it('enrolls a verified company user as a rep, ignoring editable name and role claims', async () => {
  expect((await enroll()).profiles).toEqual([{ email: 'new@bypasssolution.com', full_name: 'new@bypasssolution.com', role: 'sales_rep', status: 'active' }]);
});
it.each(['new@example.com', 'new@evilbypasssolution.com', 'new@bypasssolution.com.evil.test', 'new@sub.bypasssolution.com', 'new@bypassolutions.com'])('rejects non-company domain %s', async (email) => {
  expect((await enroll(email)).profiles).toEqual([]);
});
it('rejects an unverified company email', async () => { expect((await enroll(undefined, false)).profiles).toEqual([]); });
it('rejects signup without a verified Google identity, even if Auth auto-confirms email', async () => {
  expect((await enroll(undefined, true, undefined, false)).profiles).toEqual([]);
});
it('normalizes the verified address', async () => { expect((await enroll('NEW@BYPASSSOLUTION.COM')).profiles).toHaveLength(1); });
it.each(['active', 'pending', 'disabled'])('preserves an existing %s profile and its role', async (status) => {
  expect((await enroll(undefined, true, status)).profiles).toEqual([{ email: 'new@bypasssolution.com', full_name: 'Existing Name', role: 'viewer', status }]);
});
it('denies anonymous callers and authenticated calls without a user ID', async () => {
  await expect(db.transaction(async (tx) => { await tx.exec('set local role anon'); await tx.query('select public.enroll_company_crm_user()'); })).rejects.toThrow(/permission denied/);
  const result = await db.transaction(async (tx) => { await tx.exec('set local role authenticated'); return tx.query('select public.enroll_company_crm_user() as enrolled'); });
  expect(result.rows).toEqual([{ enrolled: false }]);
});

it('blocks outside-domain signup before an Auth user can be created', async () => {
  for (const email of ['new@example.com', 'new@bypasssolution.com.evil.test', '', null]) {
    const result = await db.transaction(async (tx) => {
      await tx.exec('set local role supabase_auth_admin');
      return tx.query<{ result: { error: { http_code: number } } }>('select public.before_company_user_created($1::jsonb) as result', [JSON.stringify({ user: { email } })]);
    });
    expect(result.rows[0].result.error.http_code).toBe(403);
  }
  const result = await db.transaction(async (tx) => {
    await tx.exec('set local role supabase_auth_admin');
    return tx.query('select public.before_company_user_created($1::jsonb) as result', [JSON.stringify({ user: { email: 'NEW@BYPASSSOLUTION.COM' } })]);
  });
  expect(result.rows).toEqual([{ result: {} }]);
});
