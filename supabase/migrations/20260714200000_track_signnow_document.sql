/*
  # Track the signNow application on the lead

  When we send the Bypass application for signature we need to know which signNow
  document it is, so the executed copy can be pulled back onto the deal once the
  merchant signs.
*/
alter table public.leads add column if not exists signnow_document_id text default '';
alter table public.leads add column if not exists signnow_sent_at timestamptz;
alter table public.leads add column if not exists signnow_signed_at timestamptz;
