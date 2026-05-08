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
