import { corsHeaders, encodeRfc822, ensureAccessToken, findLeadId, gmailFetch, json, parseEmails, requireUser, upsertCommunication } from '../_shared/gmail.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { supabase, user } = await requireUser(req);
    const input = await req.json();
    const to = Array.isArray(input.to) ? input.to : String(input.to ?? '').split(',').map((v) => v.trim()).filter(Boolean);
    const cc = Array.isArray(input.cc) ? input.cc : String(input.cc ?? '').split(',').map((v) => v.trim()).filter(Boolean);
    if (to.length === 0 || !input.subject || !input.body) throw new Error('To, subject, and body are required.');
    const { data: connection, error } = await supabase.from('gmail_connections').select('*').eq('user_id', user.id).eq('status', 'connected').single();
    if (error || !connection) throw new Error('Gmail is not connected. Connect Gmail before sending email.');
    const accessToken = await ensureAccessToken(supabase, connection);
    const sent = await gmailFetch(accessToken, 'messages/send', { method: 'POST', body: JSON.stringify({ raw: encodeRfc822({ to, cc, subject: input.subject, body: input.body }) }) });
    const leadId = input.lead_id ?? await findLeadId(supabase, [...to.flatMap(parseEmails), ...cc.flatMap(parseEmails)]);
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
    const { data, error: insertError } = await supabase.from('gmail_messages').upsert(row, { onConflict: 'gmail_message_id' }).select().single();
    if (insertError) throw insertError;
    await upsertCommunication(supabase, data ?? row);
    if (leadId) await supabase.from('leads').update({ last_contact_at: new Date().toISOString() }).eq('id', leadId);
    return json({ message: data ?? row });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to send Gmail email.' }, 400);
  }
});
