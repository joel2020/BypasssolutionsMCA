import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const allowedRoles = ['admin', 'underwriter', 'sales_rep', 'viewer'] as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: 'Authentication required.' }, 401);

    const { data: callerProfile, error: profileError } = await userClient
      .from('profiles')
      .select('role,status')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (callerProfile?.role !== 'admin' || callerProfile.status !== 'active') {
      return json({ error: 'Only active CRM admins can invite team members.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();
    const fullName = String(body.full_name ?? '').trim();
    const role = String(body.role ?? 'viewer').trim().toLowerCase();
    const redirectTo = String(body.redirect_to ?? '').trim() || undefined;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'A valid email is required.' }, 400);
    if (!fullName) return json({ error: 'Full name is required.' }, 400);
    if (!allowedRoles.includes(role as typeof allowedRoles[number])) {
      return json({ error: 'Role must be admin, underwriter, sales_rep, or viewer.' }, 400);
    }

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, crm_role: role },
      redirectTo,
    });

    if (inviteError || !inviteData.user) {
      const message = inviteError?.message || 'Unable to invite team member.';
      if (/already|registered|exists/i.test(message)) {
        return json({ error: 'This email already exists in Supabase Auth. Use the SQL bootstrap helper to bind the existing Auth user to a CRM profile.' }, 409);
      }
      throw new Error(message);
    }

    const { error: upsertError } = await adminClient.from('profiles').upsert({
      id: inviteData.user.id,
      email,
      full_name: fullName,
      role,
      status: 'active',
      updated_at: new Date().toISOString(),
    });
    if (upsertError) throw upsertError;

    return json({ user_id: inviteData.user.id, email, full_name: fullName, role, status: 'active' });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to invite team member.' }, 400);
  }
});
