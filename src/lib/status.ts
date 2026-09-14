import type { LeadStatus } from './supabase';

export const canonicalLeadStatuses: LeadStatus[] = [
  'New Lead',
  'Contacted',
  'Application Started',
  'Documents Needed',
  'Under Review',
  'Pre-Approved',
  'Offer Sent',
  'Funded',
  'Declined',
  'Lost',
];

export const activeLeadStatuses: LeadStatus[] = canonicalLeadStatuses.filter((status) => !['Declined', 'Lost'].includes(status));

/**
 * The 7-stage pipeline board.
 *
 * Each stage maps onto the status values already stored in Supabase, so we get
 * the new board without migrating live rows. `primary` is what we write when a
 * deal is moved into that stage.
 */
export interface PipelineStage {
  label: string;
  statuses: LeadStatus[];
  primary: LeadStatus;
}

export const pipelineStages: PipelineStage[] = [
  { label: 'New lead', statuses: ['New Lead', 'Contacted'], primary: 'New Lead' },
  { label: 'Application started', statuses: ['Application Started'], primary: 'Application Started' },
  { label: 'Documents needed', statuses: ['Documents Needed'], primary: 'Documents Needed' },
  { label: 'Under review', statuses: ['Under Review'], primary: 'Under Review' },
  { label: 'Approved', statuses: ['Pre-Approved'], primary: 'Pre-Approved' },
  { label: 'In-contract', statuses: ['Offer Sent'], primary: 'Offer Sent' },
  { label: 'Funded', statuses: ['Funded'], primary: 'Funded' },
];

/** Stage label a lead currently sits in, or null for Declined/Lost (off the board). */
export function stageForStatus(status: LeadStatus): string | null {
  return pipelineStages.find((stage) => stage.statuses.includes(status))?.label ?? null;
}

/** The status to persist when a deal is moved into a stage. */
export function statusForStage(label: string): LeadStatus | null {
  return pipelineStages.find((stage) => stage.label === label)?.primary ?? null;
}

/** Approved-or-better, used for "Active approvals $" and "Recent approvals". */
export const approvedStatuses: LeadStatus[] = ['Pre-Approved', 'Offer Sent'];

export const leadStatusColors: Record<LeadStatus, string> = {
  'New Lead': 'bg-blue-50 text-blue-700 border-blue-200',
  Contacted: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Application Started': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Documents Needed': 'bg-amber-50 text-amber-700 border-amber-200',
  'Under Review': 'bg-purple-50 text-purple-700 border-purple-200',
  'Pre-Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Offer Sent': 'bg-orange-50 text-orange-700 border-orange-200',
  Funded: 'bg-green-50 text-green-700 border-green-200',
  Declined: 'bg-red-50 text-red-700 border-red-200',
  Lost: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const leadProgressMap: Record<LeadStatus, number> = {
  'New Lead': 12,
  Contacted: 22,
  'Application Started': 32,
  'Documents Needed': 44,
  'Under Review': 60,
  'Pre-Approved': 76,
  'Offer Sent': 88,
  Funded: 100,
  Declined: 100,
  Lost: 100,
};

/** Contact dispositions are independent of underwriting pipeline decisions. */
export const contactStatuses = ['New lead', 'Contacted/Qualified', 'Low rev/Not interested', 'Unresponsive', 'Missing docs', 'Submitted'] as const;
export function contactStatusForLead(lead: {lead_status?: string | null; status: LeadStatus}): string {
  if (lead.lead_status && (contactStatuses as readonly string[]).includes(lead.lead_status)) return lead.lead_status;
  if (lead.status === 'New Lead') return 'New lead';
  if (['Contacted', 'Application Started'].includes(lead.status)) return 'Contacted/Qualified';
  if (lead.status === 'Documents Needed') return 'Missing docs';
  if (['Declined', 'Lost'].includes(lead.status)) return 'Low rev/Not interested';
  return 'Submitted';
}
