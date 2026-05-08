import { corsHeaders, ensureAccessToken, extractBodyText, findLeadId, gmailFetch, headerValue, json, parseEmails, requireUser, upsertCommunication } from '../_shared/gmail.ts';

async function syncLabel(supabase: any, userId: string, accessToken: string, gmailEmail: string, label: 'INBOX' | 'SENT') {
  const list = await gmailFetch(accessToken, `messages?maxResults=50&labelIds=${label}`);
  const rows = [];
  for (const item of list.messages ?? []) {
    const full = await gmailFetch(accessToken, `messages/${item.id}?format=full`);
    const headers = full.payload?.headers ?? [];
    const from = headerValue(headers, 'From');
    const to = headerValue(headers, 'To');
    const cc = headerValue(headers, 'Cc');
    const subject = headerValue(headers, 'Subject');
    const fromEmails = parseEmails(from);
    const toEmails = parseEmails(to);
    const ccEmails = parseEmails(cc);
    const direction = full.labelIds?.includes('SENT') || fromEmails.includes(gmailEmail.toLowerCase()) ? 'outbound' : 'inbound';
    const leadId = await findLeadId(supabase, [...fromEmails, ...toEmails, ...ccEmails].filter((email) => email !== gmailEmail.toLowerCase()));
    const row = {
      user_id: userId,
      lead_id: leadId,
      gmail_message_id: full.id,
      gmail_thread_id: full.threadId,
      direction,
      from_email: fromEmails[0] ?? from,
      to_emails: toEmails,
      cc_emails: ccEmails,
      subject,
      snippet: full.snippet ?? '',
      body_text: extractBodyText(full.payload),
      sent_at: full.internalDate ? new Date(Number(full.internalDate)).toISOString() : new Date().toISOString(),
      labels: full.labelIds ?? [],
      has_attachments: JSON.stringify(full.payload ?? {}).includes('attachmentId'),
      raw_payload: full,
    };
    const { data, error } = await supabase.from('gmail_messages').upsert(row, { onConflict: 'gmail_message_id' }).select().single();
    if (error) throw error;
    await upsertCommunication(supabase, data ?? row);
    rows.push(row);
  }
  return rows.length;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  let userId: string | undefined;
  try {
    const { supabase, user } = await requireUser(req);
    userId = user.id;
    const { data: connection, error } = await supabase.from('gmail_connections').select('*').eq('user_id', user.id).eq('status', 'connected').single();
    if (error || !connection) throw new Error('Gmail is not connected. Connect Gmail before syncing.');
    const accessToken = await ensureAccessToken(supabase, connection);
    const count = (await syncLabel(supabase, user.id, accessToken, connection.gmail_email, 'INBOX')) + (await syncLabel(supabase, user.id, accessToken, connection.gmail_email, 'SENT'));
    await supabase.from('gmail_connections').update({ last_sync_at: new Date().toISOString(), status: 'connected' }).eq('id', connection.id);
    await supabase.from('gmail_sync_logs').insert({ user_id: user.id, status: 'success', message_count: count });
    return json({ synced: count });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sync Gmail.';
    try {
      if (userId) {
        const { supabase } = await requireUser(req);
        await supabase.from('gmail_sync_logs').insert({ user_id: userId, status: 'error', message_count: 0, error_message: message });
      }
    } catch { /* ignore log failures */ }
    return json({ error: message }, 400);
  }
});
