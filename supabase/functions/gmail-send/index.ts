import { validateRecipients } from '../_shared/gmailSecurity.ts';
import { corsHeaders, encodeRfc822, ensureAccessToken, findLeadId, gmailFetch, json, parseEmails, requireUser, upsertCommunication } from '../_shared/gmail.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const { supabase, user, service } = await requireUser(req);
    const input = await req.json();
    const to = validateRecipients(input.to);
    const cc = validateRecipients(input.cc);
    if (to.length === 0 || typeof input.subject !== 'string' || !input.subject || typeof input.body !== 'string' || !input.body) throw new Error('To, subject, and body are required.');
    const { data: connection, error } = await service.from('gmail_connections').select('*').eq('user_id', user.id).eq('status', 'connected').single();
    if (error || !connection) throw new Error('Gmail is not connected. Connect Gmail before sending email.');
    const leadId = input.lead_id ?? await findLeadId(supabase, [...to.flatMap(parseEmails), ...cc.flatMap(parseEmails)]);
    if (leadId) {
      const { data: lead, error: leadError } = await supabase.from('leads').select('id').eq('id', leadId).maybeSingle();
      if (leadError || !lead) throw new Error('Lead access denied.');
    }
    const raw = encodeRfc822({ to, cc, subject: input.subject, body: input.body, from: connection.gmail_email });
    const accessToken = await ensureAccessToken(service, connection);
    const sent = await gmailFetch(accessToken, 'messages/send', { method: 'POST', body: JSON.stringify({ raw }) });
    const row = {
      user_id: user.id,
      lead_id: leadId,
      gmail_message_id: sent.id,
      gmail_thread_id: sent.threadId,
      direction: 'outbound',
      from_email: connection.gmail_email,
      to_emails: to,
      cc_emails: cc,
      subject: input.subject,
      snippet: String(input.body).slice(0, 180),
      body_text: input.body,
      sent_at: new Date().toISOString(),
      labels: ['SENT'],
      has_attachments: false,
      raw_payload: sent,
    };
    const { data, error: insertError } = await service.from('gmail_messages').upsert(row, { onConflict: 'user_id,gmail_message_id' }).select().single();
    if (insertError) return json({ message: row, warning: 'Email was sent, but CRM logging failed. Sync Gmail to recover it; do not resend.' });
    try { await upsertCommunication(service, data ?? row); } catch { return json({ message: data ?? row, warning: 'Email was sent, but lead activity logging failed. Sync Gmail to retry logging.' }); }
    if (leadId) await supabase.from('leads').update({ last_contact_at: new Date().toISOString() }).eq('id', leadId);
    return json({ message: data ?? row });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to send Gmail email.' }, 400);
  }
});
