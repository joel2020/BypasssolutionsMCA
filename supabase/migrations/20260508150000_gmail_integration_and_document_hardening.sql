/*
  Gmail API integration and document hardening.
  - Adds per-user Gmail connection/message/sync tables with RLS.
  - Extends communications for Gmail-originated records.
  - Ensures application-documents remains private and accepts CRM document file types.
*/

create extension if not exists pgcrypto;

create table if not exists public.gmail_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gmail_email text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected','disconnected','error')),
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.gmail_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  gmail_message_id text not null unique,
  gmail_thread_id text,
  direction text not null check (direction in ('inbound','outbound')),
  from_email text,
  to_emails text[] not null default '{}',
  cc_emails text[] not null default '{}',
  subject text,
  snippet text,
  body_text text,
  sent_at timestamptz,
  labels text[] not null default '{}',
  has_attachments boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.gmail_sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  message_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.communications add column if not exists gmail_message_id text;
alter table public.communications add column if not exists gmail_thread_id text;
alter table public.communications add column if not exists provider text not null default 'manual';
alter table public.communications add column if not exists provider_payload jsonb not null default '{}'::jsonb;

create unique index if not exists idx_communications_gmail_message_id
  on public.communications (gmail_message_id)
  where gmail_message_id is not null;
create index if not exists idx_gmail_connections_user_status on public.gmail_connections (user_id, status);
create index if not exists idx_gmail_messages_user_sent_at on public.gmail_messages (user_id, sent_at desc);
create index if not exists idx_gmail_messages_lead_sent_at on public.gmail_messages (lead_id, sent_at desc);
create index if not exists idx_gmail_messages_thread on public.gmail_messages (gmail_thread_id);
create index if not exists idx_gmail_sync_logs_user_created_at on public.gmail_sync_logs (user_id, created_at desc);

alter table public.gmail_connections enable row level security;
alter table public.gmail_messages enable row level security;
alter table public.gmail_sync_logs enable row level security;

drop trigger if exists gmail_connections_updated_at on public.gmail_connections;
create trigger gmail_connections_updated_at
  before update on public.gmail_connections
  for each row execute function public.update_updated_at();

-- No anon policies are created. Authenticated users can access only their own Gmail data;
-- active admins can view CRM-wide messages/logs when operationally required.
drop policy if exists "Users can read own gmail connections" on public.gmail_connections;
create policy "Users can read own gmail connections"
  on public.gmail_connections for select to authenticated
  using (user_id = auth.uid() or public.is_admin_role(array['admin']));

drop policy if exists "Users can insert own gmail connections" on public.gmail_connections;
create policy "Users can insert own gmail connections"
  on public.gmail_connections for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own gmail connections" on public.gmail_connections;
create policy "Users can update own gmail connections"
  on public.gmail_connections for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can read own gmail messages" on public.gmail_messages;
create policy "Users can read own gmail messages"
  on public.gmail_messages for select to authenticated
  using (user_id = auth.uid() or public.is_admin_role(array['admin']));

drop policy if exists "Users can insert own gmail messages" on public.gmail_messages;
create policy "Users can insert own gmail messages"
  on public.gmail_messages for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own gmail messages" on public.gmail_messages;
create policy "Users can update own gmail messages"
  on public.gmail_messages for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can read own gmail sync logs" on public.gmail_sync_logs;
create policy "Users can read own gmail sync logs"
  on public.gmail_sync_logs for select to authenticated
  using (user_id = auth.uid() or public.is_admin_role(array['admin']));

drop policy if exists "Users can insert own gmail sync logs" on public.gmail_sync_logs;
create policy "Users can insert own gmail sync logs"
  on public.gmail_sync_logs for insert to authenticated
  with check (user_id = auth.uid());

-- Keep sensitive documents in a private bucket and allow all requested document extensions.
insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "Public can upload private application documents" on storage.objects;
create policy "Public can upload private application documents"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'application-documents'
    and array_length(string_to_array(name, '/'), 1) >= 3
    and lower((storage.extension(name))) in ('pdf','doc','docx','jpg','jpeg','png')
  );
