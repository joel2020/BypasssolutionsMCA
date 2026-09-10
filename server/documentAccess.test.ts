import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
const db = new PGlite();
const mine = '10000000-0000-0000-0000-000000000001';
const theirs = '10000000-0000-0000-0000-000000000002';
beforeAll(async () => {
  await db.exec(`create role authenticated; create role anon; create schema storage;
    create table leads (id uuid primary key, assigned_to uuid, assigned_rep text);
    create table applications (id uuid primary key, lead_id uuid);
    create table documents (lead_id uuid, application_id uuid, storage_path text, file_path text);
    create table storage.objects (id int generated always as identity, bucket_id text, name text);
    create function current_profile_role() returns text language sql stable as $$select current_setting('test.role', true)$$;
    create function is_admin_role(roles text[]) returns boolean language sql stable as $$select current_profile_role()=any(roles)$$;
    create function can_see_lead(uid uuid, rep text) returns boolean language sql stable as $$select current_profile_role() in ('admin','underwriter','viewer') or (current_profile_role()='sales_rep' and rep='Me')$$;
    create function can_write_lead(uid uuid, rep text) returns boolean language sql stable as $$select current_profile_role() in ('admin','underwriter') or (current_profile_role()='sales_rep' and rep='Me')$$;
    insert into leads values ('${mine}',null,'Me'), ('${theirs}',null,'Other');
    insert into applications values ('20000000-0000-0000-0000-000000000001','${mine}');
    insert into documents values ('${mine}',null,'legacy/mine.pdf','legacy/mine.pdf');
    insert into storage.objects (bucket_id,name) values ('application-documents','leads/${mine}/mine.pdf'), ('application-documents','leads/${theirs}/other.pdf');
    grant usage on schema public,storage to authenticated;
    grant all on all tables in schema public,storage to authenticated;
    grant usage on all sequences in schema storage to authenticated;
    alter table storage.objects enable row level security;
    create policy broad_read on storage.objects for select to authenticated using (true);
    create policy broad_insert on storage.objects for insert to authenticated with check (true);
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/20260910201604_crm_document_access_boundary.sql', import.meta.url), 'utf8'));
}, 20000);
afterAll(async () => { await db.close(); });
const run = (query: string, role = 'sales_rep') => db.transaction(async (tx) => {
  await tx.query("select set_config('test.role',$1,true)", [role]);
  await tx.exec('set local role authenticated');
  return tx.query(query);
});
it('scopes storage reads to the rep-owned lead', async () => {
  expect((await run('select name from storage.objects')).rows).toEqual([{ name: `leads/${mine}/mine.pdf` }]);
});
it('denies uploads to another rep folder', async () => {
  await expect(run(`insert into storage.objects (bucket_id,name) values ('application-documents','leads/${theirs}/attack.pdf')`)).rejects.toThrow(/row.level security/i);
});
it('supports uploads before a document metadata row exists', async () => {
  await expect(run(`insert into storage.objects (bucket_id,name) values ('application-documents','leads/${mine}/new.pdf')`)).resolves.toBeDefined();
});
it('supports application folders and existing metadata paths', async () => {
  expect((await run("select can_access_crm_file('applications/20000000-0000-0000-0000-000000000001/file.pdf', false) as application, can_access_crm_file('legacy/mine.pdf',false) as legacy")).rows).toEqual([{ application: true, legacy: true }]);
});
it('allows owned document removal but denies viewer writes', async () => {
  expect((await run(`delete from storage.objects where name='leads/${theirs}/other.pdf' returning name`)).rows).toEqual([]);
  expect((await run(`delete from storage.objects where name='leads/${mine}/mine.pdf' returning name`, 'viewer')).rows).toEqual([]);
  expect((await run(`delete from storage.objects where name='leads/${mine}/mine.pdf' returning name`)).rows).toHaveLength(1);
});
it('rejects unlinked or malformed rep paths', async () => {
  expect((await run("select can_access_crm_file('leads/not-a-uuid/file.pdf',false) as allowed")).rows).toEqual([{ allowed: false }]);
});
