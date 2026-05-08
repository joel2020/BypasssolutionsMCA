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

if (!isSupabaseConfigured) {
  console.error(missingSupabaseMessage);
}

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(missingSupabaseMessage);
  }
}

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
  | 'New' | 'Submitted' | 'In Review' | 'Underwriting' | 'Approved'
  | 'Offer Sent' | 'Funded' | 'Declined' | 'Withdrawn'
  | 'New Lead' | 'Contacted' | 'Application Started' | 'Documents Needed'
  | 'Docs Requested' | 'Docs Received' | 'Under Review' | 'Pre-Approved'
  | 'Offers Available' | 'Contract Sent' | 'Renewal Eligible'
  | 'Lost / No Response' | 'Lost';

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
  title: string;
  task_type: string;
  assigned_rep: string;
  due_date: string | null;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Completed';
}

export interface Document {
  id: string;
  created_at: string;
  lead_id: string;
  file_name: string;
  doc_type: string;
  storage_path: string;
  status: 'Pending' | 'Reviewed' | 'Approved' | 'Rejected';
  review_notes: string;
}

export interface Offer {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string;
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

export interface Commission {
  id: string;
  created_at: string;
  lead_id: string | null;
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

export interface ContactSubmission {
  id?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  inquiry_type: string;
  message: string;
}
