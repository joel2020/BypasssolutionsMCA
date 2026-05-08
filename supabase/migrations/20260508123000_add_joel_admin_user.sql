/*
  Temporary CRM admin bootstrap user requested for initial access.
  IMPORTANT: This creates a known temporary password and should be rotated immediately
  after first login or replaced with a Supabase invite flow before production launch.
*/

create extension if not exists pgcrypto;

do $$
declare
  joel_user_id uuid := '5feb7466-016d-57d5-aca8-4e88b49602bf';
  joel_email text := 'joelcarias23@gmail.com';
  joel_password text := 'Bypass123!';
begin
  if not exists (select 1 from auth.users where email = joel_email) then
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change_token_current,
      email_change_confirm_status,
      is_sso_user
    ) values (
      joel_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      joel_email,
      crypt(joel_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'Joel Carias'),
      now(),
      now(),
      '',
      '',
      '',
      '',
      0,
      false
    );
  else
    select id into joel_user_id from auth.users where email = joel_email limit 1;

    update auth.users
    set
      encrypted_password = crypt(joel_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', 'Joel Carias'),
      updated_at = now()
    where id = joel_user_id;
  end if;

  if not exists (
    select 1
    from auth.identities
    where provider = 'email'
      and provider_id = joel_email
  ) then
    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      joel_user_id::text,
      joel_user_id,
      jsonb_build_object('sub', joel_user_id::text, 'email', joel_email, 'email_verified', true),
      'email',
      joel_email,
      now(),
      now(),
      now()
    );
  end if;

  insert into public.profiles (id, email, full_name, role, status)
  values (joel_user_id, joel_email, 'Joel Carias', 'admin', 'active')
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = 'admin',
        status = 'active',
        updated_at = now();
end $$;
