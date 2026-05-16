/*
  Public intake Edge Function enforcement
  - Public browser clients may upload private draft files only.
  - CRM leads, document metadata, contact submissions, consent records, communications, and activity logs are created by Edge Functions with service-role validation.
  - This closes direct table insert bypasses for incomplete public submissions.
*/

drop policy if exists "Anyone can submit a lead" on public.leads;
drop policy if exists "Anyone can submit complete website leads" on public.leads;
drop policy if exists "Public can submit safe website leads" on public.leads;
drop policy if exists "Public can submit complete website applications" on public.leads;

drop policy if exists "Anon can insert document records" on public.documents;
drop policy if exists "Public can create pending document metadata" on public.documents;

drop policy if exists "Anyone can submit contact form" on public.contact_submissions;

drop policy if exists "Public can create website consent records" on public.consent_records;
drop policy if exists "Public can queue intake communications" on public.communications;
drop policy if exists "Public can log website intake activity" on public.activity_logs;

drop policy if exists "Public can upload private application documents" on storage.objects;
create policy "Public can upload private draft application documents"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'application-documents'
    and name like 'drafts/%'
    and array_length(string_to_array(name, '/'), 1) >= 4
    and lower((storage.extension(name))) in ('pdf','jpg','jpeg','png')
  );
