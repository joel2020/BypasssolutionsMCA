/*
  # Let reps delete documents on their own deals

  Chris: "the option to delete documents in the opportunities".

  Document delete was admin-only. A rep working their own submission needs to
  remove a wrong/duplicate upload. Scope it the same way as every other write:
  admins + underwriters anywhere, sales_rep only on leads assigned to them.
*/

drop policy if exists "Scoped delete documents" on public.documents;

create policy "Scoped delete documents" on public.documents
  for delete to authenticated
  using (
    lead_id is null
    or exists (
      select 1 from public.leads l
      where l.id = documents.lead_id
        and public.can_write_lead(l.assigned_to, l.assigned_rep)
    )
  );
