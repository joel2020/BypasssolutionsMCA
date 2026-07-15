import type { Lead } from './supabase';

/**
 * The full set of editable lead fields, grouped for the edit UIs. One source of
 * truth shared by the Leads "Manage" panel and the opportunity "Edit" panel, so
 * every field is editable in both places.
 */
export type FieldType = 'text' | 'number' | 'date' | 'textarea';

export interface EditField {
  key: string;
  label: string;
  col: string;
  type?: FieldType;
  wide?: boolean;
}

export interface FieldGroup {
  title: string;
  fields: EditField[];
}

// Columns the DB stores twice; editing one should write both so nothing renders $0.
const MIRRORS: Record<string, string[]> = {
  funding_amount_requested: ['requested_amount'],
  monthly_revenue: ['gross_monthly_revenue'],
  business_name: ['legal_name'],
};

export const FIELD_GROUPS: FieldGroup[] = [
  {
    title: 'Business',
    fields: [
      { key: 'business_name', label: 'Business name', col: 'business_name' },
      { key: 'dba', label: 'DBA', col: 'dba' },
      { key: 'entity_type', label: 'Entity type', col: 'entity_type' },
      { key: 'industry', label: 'Industry', col: 'industry' },
      { key: 'start_date', label: 'Business start date', col: 'start_date', type: 'date' },
      { key: 'time_in_business', label: 'Time in business', col: 'time_in_business' },
      { key: 'business_address', label: 'Business address', col: 'business_address', wide: true },
      { key: 'city', label: 'City', col: 'city' },
      { key: 'state', label: 'State', col: 'state' },
      { key: 'zip', label: 'ZIP', col: 'zip' },
      { key: 'business_phone', label: 'Business phone', col: 'business_phone' },
      { key: 'business_email', label: 'Business email', col: 'business_email' },
      { key: 'website', label: 'Website', col: 'website' },
    ],
  },
  {
    title: 'Owner',
    fields: [
      { key: 'owner_full_name', label: 'Owner full name', col: 'owner_full_name' },
      { key: 'first_name', label: 'Owner first name', col: 'first_name' },
      { key: 'last_name', label: 'Owner last name', col: 'last_name' },
      { key: 'owner_title', label: 'Title', col: 'owner_title' },
      { key: 'ownership_pct', label: 'Ownership %', col: 'ownership_pct' },
      { key: 'owner_dob', label: 'Date of birth', col: 'owner_dob', type: 'date' },
      { key: 'phone', label: 'Owner mobile', col: 'phone' },
      { key: 'email', label: 'Owner email', col: 'email' },
      { key: 'owner_home_address', label: 'Home address', col: 'owner_home_address', wide: true },
      { key: 'credit_score_range', label: 'Credit score range', col: 'credit_score_range' },
    ],
  },
  {
    title: 'Funding & underwriting',
    fields: [
      { key: 'funding_amount_requested', label: 'Requested amount ($)', col: 'funding_amount_requested', type: 'number' },
      { key: 'use_of_funds', label: 'Use of funds', col: 'use_of_funds' },
      { key: 'monthly_revenue', label: 'Monthly revenue ($)', col: 'monthly_revenue', type: 'number' },
      { key: 'annual_revenue', label: 'Annual revenue ($)', col: 'annual_revenue', type: 'number' },
      { key: 'avg_daily_balance', label: 'Avg daily balance ($)', col: 'avg_daily_balance', type: 'number' },
      { key: 'nsfs_last_90_days', label: 'NSFs (90 days)', col: 'nsfs_last_90_days', type: 'number' },
      { key: 'current_bank', label: 'Current bank', col: 'current_bank' },
      { key: 'current_advances', label: 'Current advances', col: 'current_advances' },
      { key: 'urgency', label: 'Urgency', col: 'urgency' },
      { key: 'source', label: 'Source', col: 'source' },
    ],
  },
];

const NUMERIC_COLS = new Set(
  FIELD_GROUPS.flatMap((g) => g.fields).filter((f) => f.type === 'number').map((f) => f.col),
);

export const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);

/** Seed a form (string values) from a lead row. */
export function initialForm(lead: Lead): Record<string, string> {
  const row = lead as unknown as Record<string, unknown>;
  const form: Record<string, string> = {};
  for (const f of ALL_FIELDS) {
    const v = row[f.col];
    form[f.key] = v === null || v === undefined || v === 0 ? '' : String(v);
  }
  form.assigned_rep = (row.assigned_rep as string) ?? '';
  form.notes = (row.notes as string) ?? '';
  return form;
}

/** Build the Supabase update payload from the form, keeping mirrored columns in sync. */
export function buildPayload(form: Record<string, string>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const f of ALL_FIELDS) {
    const raw = (form[f.key] ?? '').trim();
    const value: unknown = NUMERIC_COLS.has(f.col) ? Number(raw.replace(/[^\d.]/g, '')) || 0 : raw;
    patch[f.col] = value;
    for (const mirror of MIRRORS[f.col] ?? []) patch[mirror] = value;
  }
  patch.assigned_rep = (form.assigned_rep ?? '').trim() || 'Unassigned';
  patch.notes = form.notes ?? '';
  return patch;
}
