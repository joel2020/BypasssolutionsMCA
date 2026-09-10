-- Install only Gmail tables; do not replay historical document/storage changes.

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
  gmail_message_id text not null,
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


alter table public.communications add column if not exists created_by uuid references auth.users(id);
alter table public.gmail_messages drop constraint if exists gmail_messages_gmail_message_id_key;
create unique index if not exists gmail_messages_owner_message on public.gmail_messages(user_id,gmail_message_id);
drop index if exists public.idx_communications_gmail_message_id;
create unique index if not exists communications_owner_gmail_message on public.communications(created_by,gmail_message_id);
create table if not exists public.gmail_oauth_states (
  nonce uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
alter table public.gmail_oauth_states enable row level security;
revoke all on public.gmail_oauth_states from public,anon,authenticated;
grant all on public.gmail_oauth_states to service_role;

-- Browser clients can read mailbox metadata and messages belonging to themselves only.
-- Credential columns and all Gmail mutations are exclusive to authenticated Edge Functions.
revoke all on public.gmail_connections,public.gmail_messages,public.gmail_sync_logs from public,anon,authenticated;
grant select(id,user_id,gmail_email,status,token_expires_at,scopes,last_sync_at,created_at,updated_at) on public.gmail_connections to authenticated;
grant select on public.gmail_messages,public.gmail_sync_logs to authenticated;
grant all on public.gmail_connections,public.gmail_messages,public.gmail_sync_logs to service_role;

drop policy if exists "Gmail owner boundary" on public.gmail_connections;
create policy "Gmail owner boundary" on public.gmail_connections as restrictive for select to authenticated
using (user_id=auth.uid() and public.current_profile_role() in ('admin','underwriter','sales_rep'));
drop policy if exists "Gmail owner read" on public.gmail_connections;
create policy "Gmail owner read" on public.gmail_connections for select to authenticated using (user_id=auth.uid());

drop policy if exists "Gmail owner boundary" on public.gmail_messages;
create policy "Gmail owner boundary" on public.gmail_messages as restrictive for select to authenticated
using (user_id=auth.uid() and public.current_profile_role() in ('admin','underwriter','sales_rep'));
drop policy if exists "Gmail owner read" on public.gmail_messages;
create policy "Gmail owner read" on public.gmail_messages for select to authenticated using (user_id=auth.uid());

drop policy if exists "Gmail owner boundary" on public.gmail_sync_logs;
create policy "Gmail owner boundary" on public.gmail_sync_logs as restrictive for select to authenticated
using (user_id=auth.uid() and public.current_profile_role() in ('admin','underwriter','sales_rep'));
drop policy if exists "Gmail owner read" on public.gmail_sync_logs;
create policy "Gmail owner read" on public.gmail_sync_logs for select to authenticated using (user_id=auth.uid());
