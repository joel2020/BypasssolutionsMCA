import { corsHeaders, json, requireUser } from '../_shared/gmail.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { supabase, user } = await requireUser(req);
    const { data: connection } = await supabase.from('gmail_connections').select('*').eq('user_id', user.id).maybeSingle();
    if (!connection) return json({ disconnected: true });
    if (connection.access_token_encrypted) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(connection.access_token_encrypted)}`, { method: 'POST' }).catch(() => null);
    }
    await supabase.from('gmail_connections').update({ status: 'disconnected', access_token_encrypted: null }).eq('id', connection.id);
    return json({ disconnected: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to disconnect Gmail.' }, 400);
  }
});
