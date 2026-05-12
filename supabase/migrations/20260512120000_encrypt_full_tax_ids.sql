/*
  Store encrypted full tax identifiers submitted by the secure website intake.
  Full values are encrypted in the serverless API before persistence; the existing
  last-four columns remain available for masked CRM display and matching.
*/

alter table public.leads add column if not exists bti_enc text;
alter table public.leads add column if not exists oti_enc text;
