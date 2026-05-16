# Bypass Solution CRM production admin bootstrap

Joel Carias is the permanent production CRM administrator.

- **Full name:** Joel Carias
- **Email:** joelcarias23@gmail.com
- **Role:** admin
- **Status:** active

## Secure Supabase Auth process

1. In Supabase, open **Authentication > Users**.
2. Invite or create `joelcarias23@gmail.com` using Supabase Auth's invite/reset-password flow.
3. Do **not** create or share a seed password in application code, migrations, chat, or Vercel environment variables.
4. After Joel accepts the invite or completes the password-reset email, apply/rerun `20260508123000_add_joel_admin_user.sql`.
5. Confirm `public.profiles` contains one row for Joel's Auth user ID with `full_name = 'Joel Carias'`, `email = 'joelcarias23@gmail.com'`, `role = 'admin'`, and `status = 'active'`.

## First-admin repair SQL

Use this only from the Supabase SQL editor or a trusted server environment with the service role. Do not expose the service role key to Vite, the browser, or Vercel client variables.

If no active admin profile exists yet, create or invite the Supabase Auth user first, copy that user's `auth.users.id`, then run:

```sql
select private.bootstrap_first_crm_admin(
  'AUTH_USER_ID_HERE'::uuid,
  'joelcarias23@gmail.com',
  'Joel Carias'
);
```

The function refuses to run after any active `admin` profile exists, so it cannot be used as an open public admin creation path.

To repair an existing admin after the first admin exists, use an existing active admin in the CRM settings UI, or run this SQL from the Supabase SQL editor:

```sql
insert into public.profiles (id, email, full_name, role, status)
select id, email, 'Joel Carias', 'admin', 'active'
from auth.users
where lower(email) = lower('joelcarias23@gmail.com')
on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = 'admin',
      status = 'active',
      updated_at = now();
```

## Required Vercel environment variables

Only expose Supabase's public browser credentials to the Vite client:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never set `SUPABASE_SERVICE_ROLE_KEY`, service-role JWTs, database passwords, or one-time seed passwords in frontend/Vite variables.

## RLS expectations

The CRM uses `public.profiles` and `public.is_admin_role(...)` to enforce server-side RLS. `public.profiles.id` is the Supabase Auth user ID, so profile lookup must use `auth.users.id`, not email-only.

Authenticated users can read their own CRM profile. Active admins can manage team member profiles through the `Admins can manage profiles` RLS policy. Users without an active authorized profile cannot access CRM data even if they bypass frontend routes.
