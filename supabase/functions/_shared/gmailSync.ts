type MessageLink = { gmail_message_id: string | null; lead_id: string | null };

export function preservedGmailLeadLinks(messages: MessageLink[], deliveries: MessageLink[], accessibleLeadIds: string[]) {
  const accessible = new Set(accessibleLeadIds);
  const links = new Map<string, string>();
  // Confirmed delivery records are authoritative and can repair earlier syncs.
  for (const row of [...messages, ...deliveries]) {
    if (row.gmail_message_id && row.lead_id && accessible.has(row.lead_id)) {
      links.set(row.gmail_message_id, row.lead_id);
    }
  }
  return links;
}
