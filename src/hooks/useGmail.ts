import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export interface GmailConnection {
  id: string;
  user_id: string;
  gmail_email: string;
  status: 'connected' | 'disconnected' | 'error';
  token_expires_at: string | null;
  scopes: string[];
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GmailMessage {
  id: string;
  user_id: string;
  lead_id: string | null;
  gmail_message_id: string;
  gmail_thread_id: string | null;
  direction: 'inbound' | 'outbound';
  from_email: string | null;
  to_emails: string[];
  cc_emails: string[];
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  sent_at: string | null;
  labels: string[];
  has_attachments: boolean;
  raw_payload: Record<string, unknown>;
  created_at: string;
  leads?: { first_name: string; last_name: string; business_name: string; email: string } | null;
}

export interface SendGmailEmailInput {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  body: string;
  lead_id?: string | null;
}

function functionsUrl(name: string) {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!base) throw new Error('Missing VITE_SUPABASE_URL.');
  return `${base.replace(/\/$/, '')}/functions/v1/${name}`;
}

async function invoke<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    const payload = context ? await context.clone().json().catch(() => null) : null;
    throw new Error(payload?.error || error.message);
  }
  return data as T;
}

export async function getGmailConnection() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;
  const { data, error } = await supabase
    .from('gmail_connections')
    .select('id,user_id,gmail_email,status,token_expires_at,scopes,last_sync_at,created_at,updated_at')
    .eq('user_id', sessionData.session.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as GmailConnection | null;
}

export async function startGmailConnection() {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sign in before connecting Gmail.');
  const response = await fetch(`${functionsUrl('gmail-oauth-start')}?json=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Unable to start Gmail OAuth.');
  window.location.assign(payload.url);
}

export async function syncGmail() {
  return invoke<{ synced: number }>('gmail-sync', {});
}

export async function sendGmailEmail(input: SendGmailEmailInput) {
  return invoke<{ message: GmailMessage; warning?: string }>('gmail-send', input as unknown as Record<string, unknown>);
}

export async function disconnectGmail() {
  return invoke<{ disconnected: boolean }>('gmail-disconnect', {});
}

export function useGmailMessages(filters?: { leadId?: string | null }) {
  return useSupabaseQuery<GmailMessage[]>(async () => {
    let query = supabase
      .from('gmail_messages')
      .select('*, leads(first_name,last_name,business_name,email)')
      .order('sent_at', { ascending: false })
      .limit(100);
    if (filters?.leadId) query = query.eq('lead_id', filters.leadId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as GmailMessage[];
  }, [], [filters?.leadId]);
}

export interface LenderEmailInput {
  request_id: string;
  lead_id: string;
  application_id: string;
  funding_partner_id: string;
  recipient: string;
  document_ids: string[];
  subject: string;
  body: string;
}
export function sendLenderEmail(input: LenderEmailInput) {
  return invoke<{ sent: boolean; message_id: string; already_sent?: boolean; warning?: string }>('gmail-send-lender', input as unknown as Record<string, unknown>);
}
