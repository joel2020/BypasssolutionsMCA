import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { badRequest, corsHeaders, getSupabaseAdmin, isEmail, jsonResponse, text } from '../_shared/public-intake.ts';

type ContactPayload = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  inquiry_type?: string;
  message?: string;
  bot_field?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse(req, { ok: false, errors: ['Method not allowed.'] }, 405);

  try {
    const payload = await req.json() as ContactPayload;

    if (payload.bot_field) {
      return jsonResponse(req, { ok: true });
    }

    const errors: string[] = [];
    if (!text(payload.name)) errors.push('Name is required.');
    if (!text(payload.email)) errors.push('Email is required.');
    if (payload.email && !isEmail(payload.email)) errors.push('Enter a valid email address.');
    if (!text(payload.message, 4000)) errors.push('Message is required.');
    if (errors.length) return badRequest(req, errors);

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('contact_submissions').insert({
      name: text(payload.name, 120),
      email: text(payload.email, 180).toLowerCase(),
      phone: text(payload.phone, 40),
      company: text(payload.company, 180),
      inquiry_type: text(payload.inquiry_type, 120),
      message: text(payload.message, 4000),
    });

    if (error) throw error;

    return jsonResponse(req, { ok: true });
  } catch (error) {
    console.error('submit-contact failed', error instanceof Error ? error.message : error);
    return jsonResponse(req, { ok: false, errors: ['Submission is temporarily unavailable.'] }, 500);
  }
});
