/*
  Secure permanent CRM admin bootstrap for Joel Carias.

  This migration intentionally does NOT create an auth.users row, set a password,
  or store a temporary credential. Create/invite Joel in Supabase Auth first, then
  run this migration (or rerun it) to bind that Auth user to the permanent active
  admin profile used by RLS policies.

  Required admin profile:
  - full_name: Joel Carias
  - email: joelcarias23@gmail.com
  - role: admin
  - status: active
*/

do $$
declare
  joel_user_id uuid;
  joel_email constant text := 'joelcarias23@gmail.com';
begin
  select id
  into joel_user_id
  from auth.users
  where lower(email) = lower(joel_email)
  order by created_at asc
  limit 1;

  if joel_user_id is null then
    raise notice 'Joel Carias auth user (%) was not found. Invite/create the user in Supabase Auth, then rerun this migration to create the admin profile.', joel_email;
    return;
  end if;

  update auth.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', 'Joel Carias'),
    updated_at = now()
  where id = joel_user_id;

  insert into public.profiles (id, email, full_name, role, status)
  values (joel_user_id, joel_email, 'Joel Carias', 'admin', 'active')
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = 'admin',
        status = 'active',
        updated_at = now();
end $$;
