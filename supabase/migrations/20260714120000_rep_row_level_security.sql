/*
  # Restrict sales reps to their own leads/deals

  Before this migration every authenticated CRM user could read every row
  ("Authenticated users can read leads" USING (true)) — including SSN/EIN
  columns on deals belonging to other reps. The UI hid them; the database did not.

  After this migration:
    - admin / underwriter : full access (unchanged)
    - viewer              : read-only across the book (unchanged)
    - sales_rep           : only rows for leads assigned to them
                            (assigned_to = auth.uid() OR assigned_rep = their name)

  Child tables (applications, documents, notes, tasks, offers, call_logs,
  communications, partner_submissions) inherit the lead's visibility.
  Commissions are additionally matched on rep_name.

  Safe to re-run. To roll back, see the block at the bottom of this file.
*/

-- ---------------------------------------------------------------------------
-- 1. Who am I, and which leads may I see?
-- ---------------------------------------------------------------------------

create or replace function public.current_profile_name()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select full_name from public.profiles where id = auth.uid() and status = 'active'
$$;

create or replace function public.can_see_lead(p_assigned_to uuid, p_assigned_rep text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case public.current_profile_role()
    when 'admin' then true
    when 'underwriter' then true
    when 'viewer' then true
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

revoke execute on function public.current_profile_name() from anon;
revoke execute on function public.can_see_lead(uuid, text) from anon;
grant execute on function public.current_profile_name() to authenticated;
grant execute on function public.can_see_lead(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. leads
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read leads" on public.leads;
drop policy if exists "Authenticated users can update leads" on public.leads;
drop policy if exists "Authenticated users can delete leads" on public.leads;
drop policy if exists "Scoped read leads" on public.leads;
drop policy if exists "Scoped update leads" on public.leads;
drop policy if exists "Scoped delete leads" on public.leads;

create policy "Scoped read leads"
  on public.leads for select to authenticated
  using (public.can_see_lead(assigned_to, assigned_rep));

create policy "Scoped update leads"
  on public.leads for update to authenticated
  using (public.can_see_lead(assigned_to, assigned_rep))
  with check (public.can_see_lead(assigned_to, assigned_rep));

-- Only admins may delete leads.
create policy "Scoped delete leads"
  on public.leads for delete to authenticated
  using (public.is_admin_role(array['admin']));

-- ---------------------------------------------------------------------------
-- 3. Child tables inherit the lead's visibility (only those that exist).
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  child_tables text[] := array[
    'applications','documents','notes','tasks','offers',
    'call_logs','communications','partner_submissions','audit_logs'
  ];
begin
  foreach t in array child_tables loop
    -- skip tables that don't exist or have no lead_id column
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'lead_id'
    ) then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "Authenticated users can read %s" on public.%I', t, t);
    execute format('drop policy if exists "Authenticated users can update %s" on public.%I', t, t);
    execute format('drop policy if exists "Scoped read %s" on public.%I', t, t);
    execute format('drop policy if exists "Scoped update %s" on public.%I', t, t);

    execute format($f$
      create policy "Scoped read %s" on public.%I for select to authenticated
      using (
        lead_id is null
        or exists (
          select 1 from public.leads l
          where l.id = %I.lead_id
            and public.can_see_lead(l.assigned_to, l.assigned_rep)
        )
      )
    $f$, t, t, t);

    execute format($f$
      create policy "Scoped update %s" on public.%I for update to authenticated
      using (
        lead_id is null
        or exists (
          select 1 from public.leads l
          where l.id = %I.lead_id
            and public.can_see_lead(l.assigned_to, l.assigned_rep)
        )
      )
    $f$, t, t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. commissions: a rep only sees their own earnings.
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read commissions" on public.commissions;
drop policy if exists "Authenticated users can update commissions" on public.commissions;
drop policy if exists "Scoped read commissions" on public.commissions;
drop policy if exists "Scoped update commissions" on public.commissions;

create policy "Scoped read commissions"
  on public.commissions for select to authenticated
  using (
    public.is_admin_role(array['admin','underwriter','viewer'])
    or (
      public.current_profile_role() = 'sales_rep'
      and rep_name = public.current_profile_name()
    )
  );

-- Only admins may change commission records.
create policy "Scoped update commissions"
  on public.commissions for update to authenticated
  using (public.is_admin_role(array['admin']))
  with check (public.is_admin_role(array['admin']));

/*
  ROLLBACK (paste this if anything misbehaves):

    drop policy if exists "Scoped read leads" on public.leads;
    drop policy if exists "Scoped update leads" on public.leads;
    drop policy if exists "Scoped delete leads" on public.leads;
    create policy "Authenticated users can read leads" on public.leads
      for select to authenticated using (true);
    create policy "Authenticated users can update leads" on public.leads
      for update to authenticated using (true);
*/
