import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
const db = new PGlite();
const mine = '10000000-0000-0000-0000-000000000001';
const other = '10000000-0000-0000-0000-000000000002';
beforeAll(async () => {
  await db.exec(`create role authenticated; create role anon; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select current_setting('test.user',true)::uuid$$;
    create function public.current_profile_role() returns text language sql stable as $$select current_setting('test.role',true)$$;
    create function public.update_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now(); return new; end$$;
    create table leads(id uuid primary key); create table communications(id uuid primary key default gen_random_uuid());
    insert into auth.users values ('${mine}'),('${other}');
    grant usage on schema public,auth to authenticated;
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/20260910203331_gmail_production_setup.sql', import.meta.url),'utf8'));
  await db.exec(`insert into gmail_connections(user_id,gmail_email,access_token_encrypted,refresh_token_encrypted) values ('${mine}','mine@example.com','ciphertext','ciphertext'),('${other}','other@example.com','ciphertext','ciphertext');
    insert into gmail_messages(user_id,gmail_message_id,direction) values ('${mine}','shared-id','inbound'),('${other}','shared-id','inbound');`);
},20000);
afterAll(async()=>{await db.close();});
const run = (sql: string, role = 'sales_rep') => db.transaction(async tx => {
  await tx.query("select set_config('test.user',$1,true), set_config('test.role',$2,true)",[mine,role]);
  await tx.exec('set local role authenticated'); return tx.query(sql);
});
it('shows only my mailbox, including for admins',async()=>{
  expect((await run('select gmail_email from gmail_connections','admin')).rows).toEqual([{gmail_email:'mine@example.com'}]);
  expect((await run('select gmail_message_id from gmail_messages')).rows).toHaveLength(1);
});
it('never exposes access/refresh tokens to browser clients',async()=>{
  await expect(run('select access_token_encrypted from gmail_connections')).rejects.toThrow(/permission denied/);
  await expect(run('select refresh_token_encrypted from gmail_connections')).rejects.toThrow(/permission denied/);
});
it('denies browser token mutation and OAuth state reads',async()=>{
  await expect(run("update gmail_connections set access_token_encrypted='replacement'")).rejects.toThrow(/permission denied/);
  await expect(run('select * from gmail_oauth_states')).rejects.toThrow(/permission denied/);
});
it('denies disabled/viewer mailbox access',async()=>{
  expect((await run('select gmail_email from gmail_connections','viewer')).rows).toHaveLength(0);
});
it('claims OAuth state only once',async()=>{
  await db.exec(`insert into gmail_oauth_states values ('20000000-0000-0000-0000-000000000001','${mine}',now()+interval '10 minutes')`);
  const sql="delete from gmail_oauth_states where nonce='20000000-0000-0000-0000-000000000001' and expires_at>now() returning user_id";
  expect((await db.query(sql)).rows).toHaveLength(1);
  expect((await db.query(sql)).rows).toHaveLength(0);
});
