import { createClient } from '@supabase/supabase-js';

export const missingSupabaseMessage = 'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function isValidSupabaseUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey && supabaseAnonKey.length > 20);


export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(missingSupabaseMessage);
  }
}

// Capture invitation/recovery intent before the SDK consumes and clears the URL fragment.
const authLinkType = typeof window === 'undefined' ? null : new URLSearchParams(window.location.hash.slice(1)).get('type');
export const isPasswordSetupLink = authLinkType === 'invite' || authLinkType === 'recovery';

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl! : 'https://missing-config.invalid',
  isSupabaseConfigured ? supabaseAnonKey! : 'missing-supabase-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// ── Database types ────────────────────────────────────────────────────────────

export type LeadStatus =
  | 'New Lead' | 'Contacted' | 'Application Started' | 'Documents Needed'
  | 'Under Review' | 'Pre-Approved' | 'Offer Sent' | 'Funded'
  | 'Declined' | 'Lost';

export type ApplicationStatus = 'New' | 'Submitted' | 'In Review' | 'Underwriting' | 'Approved' | 'Offer Sent' | 'Funded' | 'Declined' | 'Withdrawn';
export type PartnerSubmissionStatus = 'Prepared' | 'Submitted' | 'In Review' | 'Approved' | 'Offer Sent' | 'Declined' | 'Withdrawn' | 'No Response';
export type DocumentStatus = 'Missing' | 'Pending' | 'Uploaded' | 'Under Review' | 'Reviewed' | 'Approved' | 'Rejected';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'underwriter' | 'sales_rep' | 'viewer';
  status: 'active' | 'pending' | 'disabled';
}

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  business_name: string;
  dba: string;
  industry: string;
  website: string;
  state: string;
  time_in_business: string;
  monthly_revenue: number;
  funding_amount_requested: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  credit_score_range: string;
  ownership_pct: string;
  use_of_funds: string;
  existing_advances: boolean;
  monthly_deposits: number;
  avg_daily_balance: number;
  urgency: string;
  status: LeadStatus;
  assigned_rep: string;
  assigned_to?: string | null;
  lead_score: number;
  source: string;
  last_contact_at: string | null;
  notes: string;
  consent: boolean;
}

export interface Note {
  id: string;
  created_at: string;
  lead_id: string;
  text: string;
  created_by_name: string;
}

export interface Task {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string | null;
  application_id?: string | null;
  title: string;
  description?: string | null;
  task_type: string;
  assigned_rep: string;
  assigned_to?: string | null;
  due_date: string | null;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Completed';
}

export interface Document {
  id: string;
  created_at: string;
  lead_id: string | null;
  application_id?: string | null;
  file_name: string;
  doc_type: string;
  document_type?: string | null;
  storage_path: string;
  file_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  status: DocumentStatus;
  review_notes: string | null;
  uploaded_at?: string | null;
  uploaded_by?: string | null;
}

export interface Offer {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string;
  application_id?: string | null;
  funding_partner_id?: string | null;
  funder_name: string;
  funding_amount: number;
  payback_amount: number;
  factor_rate: number;
  estimated_payment: number;
  term: string;
  frequency: string;
  commission_pct: number;
  commission_amount: number;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Rejected' | 'Expired' | 'Contract Sent';
  created_by_name: string;
}

export interface Funder {
  id: string;
  created_at: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  min_revenue: number;
  min_time_in_business: string;
  industries_accepted: string[];
  states: string;
  max_funding: number;
  notes: string;
  status: 'Active' | 'Inactive';
}

export interface FundingPartner {
  id: string;
  created_at: string;
  updated_at?: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  min_revenue: number | null;
  max_funding: number | null;
  industries_accepted: string[] | null;
  status: 'Active' | 'Inactive' | string;
  notes: string | null;
}

export interface PartnerSubmission {
  id: string;
  created_at: string;
  updated_at: string;
  application_id: string | null;
  funding_partner_id: string | null;
  submitted_by: string | null;
  status: PartnerSubmissionStatus;
  submitted_at: string | null;
  response_at: string | null;
  response_status?: string | null;
  notes: string | null;
  denial_reason?: string | null;
  denial_notes?: string | null;
  denied_at?: string | null;
  denied_by?: string | null;
  included_document_ids?: string[] | null;
  funding_partners?: Pick<FundingPartner, 'name' | 'email' | 'contact_name'> | null;
}

export interface ApplicationRecord {
  id: string;
  lead_id: string | null;
  status: ApplicationStatus;
  requested_amount: number | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
}

export interface ActivityLog {
  id: string;
  application_id: string | null;
  lead_id: string | null;
  user_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Commission {
  id: string;
  created_at: string;
  lead_id: string | null;
  application_id?: string | null;
  lead_name: string;
  business_name: string;
  funder_name: string;
  rep_name: string;
  funded_amount: number;
  commission_pct: number;
  commission_amount: number;
  status: 'Paid' | 'Unpaid' | 'Pending';
  funded_date: string;
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
}

export interface ContactSubmission {
  id?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  inquiry_type: string;
  message: string;
}
