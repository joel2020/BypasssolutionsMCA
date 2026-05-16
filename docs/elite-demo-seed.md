# Elite Funding Solutions Demo Seed

`supabase/seed.sql` resets the CRM operating tables and loads a full Elite Funding Solutions MCA demo dataset. Use it only for local, staging, or demo databases.

It creates 150 leads, 100 application deals, 40 approved deals, 25 approved but not accepted deals, 35 funded deals, 20 renewal opportunities, 50 earnings records, 15 funding partners, and 10 demo users. Each deal has linked company, owner, underwriting, current position, offer, lender submission, document, note, task, communication, status history, and activity records.

The 20 renewal opportunities are represented by `Renewal Review` tasks plus `renewal_opportunity_created` activity records with payoff balance, renewal gross amount, net new money, current daily payment, and projected daily payment in JSON metadata.

To load from a local Supabase stack:

```bash
npm run seed:demo:load
```

Supabase applies `supabase/migrations` first and then runs `supabase/seed.sql`.

To load into a staging database from SQL editor, apply every migration in `supabase/migrations` first, then run `supabase/seed.sql` as one script. Do not run this against production because it truncates CRM operating tables.

Demo CRM users are created with emails ending in `@elitefundingsolutions.example`. The SQL seeds `auth.users` and `public.profiles` with active roles: admin, underwriter, sales_rep, and viewer. The demo password in local/staging is `EliteDemo2026!`.

To verify the seed file structure without a database:

```bash
npm run seed:demo:check
```

The SQL also performs database-level count checks after loading and raises an exception if the expected demo counts or required deal relationships are missing.
