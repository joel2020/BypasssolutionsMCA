/*
  # Add city / zip to leads

  The Bypass application has a "City / State / ZIP" line, but leads only stored
  `state`, so that field could never be filled properly when generating the app.
*/
alter table public.leads add column if not exists city text default '';
alter table public.leads add column if not exists zip  text default '';
