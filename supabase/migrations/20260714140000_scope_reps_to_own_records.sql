/*
  # Actually scope sales reps to their own records

  The previous migration added "Scoped ..." policies, but Postgres OR's
  PERMISSIVE policies together — and the live database already had role-based
  policies (e.g. `crm_write_funding_partners`, `CRM read documents`) that grant
  sales_rep access to EVERY row. So the scoped policies added access instead of
  restricting it.

  This migration removes those over-permissive policies and replaces them with
  row-scoped ones.

  Result:
    admin        : everything (unchanged)
    underwriter  : read/write all deals (unchanged)
    viewer       : read-only across the book
    sales_rep    : only rows belonging to leads assigned to them; may NOT touch
                   funders, lender submissions, or commissions.

  service_role (the Vercel /api functions) bypasses RLS and is unaffected.
*/

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Write access to a lead (same as can_see_lead but viewers cannot write).
create or replace function public.can_write_lead(p_assigned_to uuid, p_assigned_rep text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case public.current_profile_role()
    when 'admin' then true
    when 'underwriter' then true
    when 'sales_rep' then
      coalesce(p_assigned_to = auth.uid(), false)
      or (
        p_assigned_rep is not null
        and p_assigned_rep <> ''
        and p_assigned_rep = public.current_profile_name()
      )
    else false
  end
$$;

-- Visibility of a row that hangs off an application instead of a lead.
create or replace function public.can_see_application(p_application_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.applications a
    join public.leads l on l.id = a.lead_id
    where a.id = p_application_id
      and public.can_see_lead(l.assigned_to, l.assigned_rep)
  )
$$;

grant execute on function public.can_write_lead(uuid, text) to authenticated;
grant execute on function public.can_see_application(uuid) to authenticated;
revoke execute on function public.can_write_lead(uuid, text) from anon;
revoke execute on function public.can_see_application(uuid) from anon;

-- ---------------------------------------------------------------------------
-- 1. Lead-linked tables: reps only touch rows for their own leads.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  lead_tables text[] := array[
    'applications','documents','notes','tasks','offers','call_logs',
    'communications','consent_records','credit_pull_requests',
    'credit_reports','datamerch_checks'
  ];
begin
  foreach t in array lead_tables loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name=t and column_name='lead_id'
    ) then continue; end if;

    execute format('alter table public.%I enable row level security', t);

    -- remove the over-permissive legacy policies (both naming conventions)
    execute format('drop policy if exists "CRM read %1$s" on public.%1$I', t);
    execute format('drop policy if exists "CRM write %1$s" on public.%1$I', t);
    execute format('drop policy if exists "crm_read_%1$s" on public.%1$I', t);
    execute format('drop policy if exists "crm_write_%1$s" on public.%1$I', t);
    execute format('drop policy if exists "Scoped read %1$s" on public.%1$I', t);
    execute format('drop policy if exists "Scoped update %1$s" on public.%1$I', t);
    execute format('drop policy if exists "Scoped insert %1$s" on public.%1$I', t);
    execute format('drop policy if exists "Scoped delete %1$s" on public.%1$I', t);

    execute format($f$
      create policy "Scoped read %1$s" on public.%1$I for select to authenticated
      using (
        lead_id is null
        or exists (select 1 from public.leads l
                   where l.id = %1$I.lead_id
                     and public.can_see_lead(l.assigned_to, l.assigned_rep))
      )
    $f$, t);

    execute format($f$
      create policy "Scoped insert %1$s" on public.%1$I for insert to authenticated
      with check (
        lead_id is null
        or exists (select 1 from public.leads l
                   where l.id = %1$I.lead_id
                     and public.can_write_lead(l.assigned_to, l.assigned_rep))
      )
    $f$, t);

    execute format($f$
      create policy "Scoped update %1$s" on public.%1$I for update to authenticated
      using (
        lead_id is null
        or exists (select 1 from public.leads l
                   where l.id = %1$I.lead_id
                     and public.can_write_lead(l.assigned_to, l.assigned_rep))
      )
    $f$, t);

    execute format($f$
      create policy "Scoped delete %1$s" on public.%1$I for delete to authenticated
      using (public.is_admin_role(array['admin']))
    $f$, t);
  end loop;
end $$;

-- audit_logs: any CRM user may append; reads scoped to their leads.
do $$
begin
  execute 'alter table public.audit_logs enable row level security';
  execute 'drop policy if exists "CRM read audit_logs" on public.audit_logs';
  execute 'drop policy if exists "CRM write audit_logs" on public.audit_logs';
  execute 'drop policy if exists "Scoped read audit_logs" on public.audit_logs';
  execute 'drop policy if exists "Append audit_logs" on public.audit_logs';

  execute $f$
    create policy "Scoped read audit_logs" on public.audit_logs for select to authenticated
    using (
      lead_id is null
      or exists (select 1 from public.leads l
                 where l.id = audit_logs.lead_id
                   and public.can_see_lead(l.assigned_to, l.assigned_rep))
    )
  $f$;
  execute $f$
    create policy "Append audit_logs" on public.audit_logs for insert to authenticated
    with check (public.current_profile_role() is not null)
  $f$;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Application-linked tables (owners, partner_submissions).
-- ---------------------------------------------------------------------------

do $$
begin
  -- owners carries SSN/DOB: reps only see owners on their own deals
  execute 'alter table public.owners enable row level security';
  execute 'drop policy if exists "crm_read_owners" on public.owners';
  execute 'drop policy if exists "crm_write_owners" on public.owners';
  execute 'drop policy if exists "Scoped read owners" on public.owners';
  execute 'drop policy if exists "Scoped write owners" on public.owners';

  execute $f$
    create policy "Scoped read owners" on public.owners for select to authenticated
    using (application_id is null or public.can_see_application(application_id))
  $f$;
  execute $f$
    create policy "Scoped write owners" on public.owners for all to authenticated
    using (application_id is null or public.can_see_application(application_id))
    with check (application_id is null or public.can_see_application(application_id))
  $f$;
end $$;

-- partner_submissions = "send deal to funder": ADMIN ONLY to create/change.
do $$
begin
  execute 'alter table public.partner_submissions enable row level security';
  execute 'drop policy if exists "crm_read_partner_submissions" on public.partner_submissions';
  execute 'drop policy if exists "crm_write_partner_submissions" on public.partner_submissions';
  execute 'drop policy if exists "Admins insert partner_submissions" on public.partner_submissions';
  execute 'drop policy if exists "Admins update partner_submissions" on public.partner_submissions';
  execute 'drop policy if exists "Scoped read partner_submissions" on public.partner_submissions';

  execute $f$
    create policy "Scoped read partner_submissions" on public.partner_submissions
      for select to authenticated
      using (application_id is null or public.can_see_application(application_id))
  $f$;
  execute $f$
    create policy "Admins insert partner_submissions" on public.partner_submissions
      for insert to authenticated
      with check (public.is_admin_role(array['admin']))
  $f$;
  execute $f$
    create policy "Admins update partner_submissions" on public.partner_submissions
      for update to authenticated
      using (public.is_admin_role(array['admin']))
      with check (public.is_admin_role(array['admin']))
  $f$;
  execute $f$
    create policy "Admins delete partner_submissions" on public.partner_submissions
      for delete to authenticated
      using (public.is_admin_role(array['admin']))
  $f$;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Funders: everyone reads, ADMIN ONLY writes.
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['funding_partners','funders'] loop
    if not exists (select 1 from information_schema.tables
                   where table_schema='public' and table_name=t) then continue; end if;

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "CRM read %1$s" on public.%1$I', t);
    execute format('drop policy if exists "CRM write %1$s" on public.%1$I', t);
    execute format('drop policy if exists "crm_read_%1$s" on public.%1$I', t);
    execute format('drop policy if exists "crm_write_%1$s" on public.%1$I', t);
    execute format('drop policy if exists "Read %1$s" on public.%1$I', t);
    execute format('drop policy if exists "Admins insert %1$s" on public.%1$I', t);
    execute format('drop policy if exists "Admins update %1$s" on public.%1$I', t);
    execute format('drop policy if exists "Admins delete %1$s" on public.%1$I', t);

    execute format($f$
      create policy "Read %1$s" on public.%1$I for select to authenticated using (true)
    $f$, t);
    execute format($f$
      create policy "Admins insert %1$s" on public.%1$I for insert to authenticated
      with check (public.is_admin_role(array['admin']))
    $f$, t);
    execute format($f$
      create policy "Admins update %1$s" on public.%1$I for update to authenticated
      using (public.is_admin_role(array['admin']))
      with check (public.is_admin_role(array['admin']))
    $f$, t);
    execute format($f$
      create policy "Admins delete %1$s" on public.%1$I for delete to authenticated
      using (public.is_admin_role(array['admin']))
    $f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Commissions: a rep sees only their own earnings; admins manage them.
-- ---------------------------------------------------------------------------

do $$
begin
  execute 'alter table public.commissions enable row level security';
  execute 'drop policy if exists "CRM read commissions" on public.commissions';
  execute 'drop policy if exists "CRM write commissions" on public.commissions';
  execute 'drop policy if exists "Scoped read commissions" on public.commissions';
  execute 'drop policy if exists "Scoped update commissions" on public.commissions';
  execute 'drop policy if exists "Admins write commissions" on public.commissions';

  execute $f$
    create policy "Scoped read commissions" on public.commissions for select to authenticated
    using (
      public.is_admin_role(array['admin','underwriter','viewer'])
      or (public.current_profile_role() = 'sales_rep'
          and rep_name = public.current_profile_name())
    )
  $f$;
  execute $f$
    create policy "Admins write commissions" on public.commissions for all to authenticated
    using (public.is_admin_role(array['admin']))
    with check (public.is_admin_role(array['admin']))
  $f$;
end $$;
