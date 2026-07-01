# Bypass Solution CRM production admin bootstrap

Joel Carias is the permanent production CRM administrator.

- **Full name:** Joel Carias
- **Email:** joelcarias23@gmail.com
- **Role:** admin
- **Status:** active

## Secure Supabase Auth process

1. In Supabase, open **Authentication → Users**.
2. Invite or create `joelcarias23@gmail.com` using Supabase Auth's invite/reset-password flow.
3. Do **not** create or share a seed password in application code, migrations, chat, or Vercel environment variables.
4. After Joel accepts the invite or completes the password-reset email, apply/rerun `20260508123000_add_joel_admin_user.sql`.
5. Confirm `public.profiles` contains one row for Joel's Auth user ID with `full_name = 'Joel Carias'`, `email = 'joelcarias23@gmail.com'`, `role = 'admin'`, and `status = 'active'`.

## Required Vercel environment variables

Only expose Supabase's public browser credentials to the Vite client:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never set `SUPABASE_SERVICE_ROLE_KEY`, service-role JWTs, database passwords, or one-time seed passwords in frontend/Vite variables.

## RLS expectations

The CRM uses `public.profiles` and `public.is_admin_role(...)` to enforce server-side RLS. Joel's active `admin` profile can read/write/manage CRM records, while users without an active authorized profile cannot access CRM data even if they bypass frontend routes.
