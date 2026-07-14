/*
  # Company-wide search that respects the rep restrictions

  Chris: "In the search tab up top if possible can it show any deal that's ever
  come into our company, but just not let a rep open it if you're not the
  assigned rep or Admin."

  RLS hides other reps' leads entirely, so a plain search returns nothing for a
  rep. This exposes a deliberately minimal directory instead: company name, who
  it's assigned to, and the stage. No email, phone, SSN, EIN, or amounts — a rep
  can see a deal EXISTS and who owns it, but cannot read it. Opening is still
  blocked by RLS and by the guard on the opportunity page.
*/

create or replace function public.search_lead_directory(q text default '')
returns table (id uuid, business_name text, assigned_rep text, status text)
language sql
security definer
set search_path = public
stable
as $$
  select l.id, l.business_name, l.assigned_rep, l.status::text
  from public.leads l
  where public.current_profile_role() is not null      -- must be an active CRM user
    and (
      coalesce(q, '') = ''
      or l.business_name ilike '%' || q || '%'
    )
  order by l.business_name
  limit 25
$$;

revoke execute on function public.search_lead_directory(text) from public, anon;
grant execute on function public.search_lead_directory(text) to authenticated;
