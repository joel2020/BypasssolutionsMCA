# Production readiness checklist

## Pre-deploy checks

- [ ] `npm install`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Confirm `.env.example` contains names only and no real secret values.
- [ ] Confirm no service-role keys are present in Vite/Vercel frontend variables.

## Supabase

- [ ] Apply all migrations in `supabase/migrations` in timestamp order.
- [ ] Create/invite the first admin in Supabase Auth.
- [ ] Run `select public.bootstrap_crm_profile('admin@example.com', 'Admin Name', 'admin');` with real admin details.
- [ ] Verify `public.profiles` contains an active admin profile.
- [ ] Verify RLS is enabled for CRM tables.
- [ ] Verify `application-documents` is private and upload policies are active.
- [ ] Configure Auth redirect URLs for `https://crm.bypasssolution.com/admin` and `/admin/dashboard`.

## Vercel

- [ ] Set build command: `npm run build`.
- [ ] Set output directory: `dist`.
- [ ] Add `crm.bypasssolution.com` to the Vercel project.
- [ ] Configure DNS for the CRM subdomain.
- [ ] Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, and `VITE_ADMIN_URL`.
- [ ] Confirm `vercel.json` SPA rewrites send React Router routes to `index.html`.

## Smoke test after deploy

- [ ] Visit `https://crm.bypasssolution.com` and confirm it routes to CRM login/dashboard.
- [ ] Sign in as an active admin profile.
- [ ] Sign out from the sidebar/profile menu.
- [ ] Sign in with a user that has no profile and confirm the unauthorized page includes a working sign-out button.
- [ ] Create a New Application and confirm it appears in Applications/Pipeline.
- [ ] Create a Funding Partner and confirm it appears in Funding Partners.
- [ ] Upload a non-sensitive sample document and confirm a signed preview opens.
- [ ] Create a funding offer for a lead.
- [ ] Move an application/lead status in Pipeline.
- [ ] Confirm browser console has no major runtime errors.
