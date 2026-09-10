import { corsHeaders, ensureAccessToken, gmailFetch, json, requireUser } from '../_shared/gmail.ts';
import { sendLenderPackage } from './handler.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok',{ headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' },405);
  try {
    const { supabase, service, user } = await requireUser(req);
    let accessToken = '';
    let fromEmail = '';
    const result = await sendLenderPackage(await req.json(), {
      userId: user.id,
      async authorize(input) {
        const { data: lead, error: leadError } = await supabase.from('leads').select('id').eq('id',input.lead_id).maybeSingle();
        if (leadError || !lead) throw new Error('Client access denied.');
        const { data: application, error: appError } = await supabase.from('applications').select('id').eq('id',input.application_id).eq('lead_id',input.lead_id).maybeSingle();
        if (appError || !application) throw new Error('Application does not belong to this client or access is denied.');
        const { data: partner, error: partnerError } = await supabase.from('funding_partners').select('email,status').eq('id',input.funding_partner_id).maybeSingle();
        if (partnerError || partner?.status !== 'Active' || !partner.email) throw new Error('Choose an active lender with an email address.');
        const { data: connection, error } = await service.from('gmail_connections').select('*').eq('user_id',user.id).eq('status','connected').maybeSingle();
        if (error || !connection) throw new Error('Connect your Gmail account on the CRM Email page first.');
        accessToken = await ensureAccessToken(service,connection);
        fromEmail = connection.gmail_email;
        return { email: partner.email.trim(), from: fromEmail };
      },
      async documents(ids,leadId) {
        const { data,error } = await supabase.from('documents').select('id,lead_id,application_id,file_name,file_size,mime_type,storage_path,file_path,status').eq('lead_id',leadId).in('id',ids);
        if (error) throw error;
        return data ?? [];
      },
      async download(path) {
        const { data,error } = await supabase.storage.from('application-documents').download(path);
        if (error || !data) throw new Error('A selected file could not be downloaded. Check its upload and permissions.');
        return data;
      },
      async receipt(id) {
        const { data,error } = await service.from('lender_email_deliveries').select('id,state,gmail_message_id').eq('id',id).eq('user_id',user.id).maybeSingle();
        if (error) throw error;
        return data;
      },
      async reserve(input) {
        const { request_id, ...fields } = input;
        const { error } = await service.from('lender_email_deliveries').insert({ id: request_id,user_id: user.id,...fields });
        if (error) throw new Error('Unable to reserve this send. It may already be in progress; check Gmail Sent before retrying.');
      },
      async send(raw) { return await gmailFetch(accessToken,'messages/send',{ method: 'POST',body: JSON.stringify({ raw }) }); },
      async complete(input,sent) {
        const { error } = await service.rpc('complete_lender_email_delivery',{ p_delivery_id: input.request_id,p_message_id: sent.id,p_thread_id: sent.threadId ?? null,p_from_email: fromEmail });
        if (error) throw error;
      },
      async markUnknown(id) {
        const { error } = await service.from('lender_email_deliveries').update({ state: 'unknown' }).eq('id',id).eq('user_id',user.id);
        if (error) throw error;
      },
    });
    return json(result);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to email this lender.' },400);
  }
});
