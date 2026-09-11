import { useState } from 'react';
import { supabase, type FundingPartner, type PartnerSubmission } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import type { FundingPartnerCriteria } from '../lib/fundingPartnerFields';

export function useFundingPartners() {
  return useSupabaseQuery<FundingPartner[]>(async () => {
    const { data, error } = await supabase
      .from('funding_partners')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data ?? []) as FundingPartner[];
  }, [], []);
}

export function usePartnerSubmissions(leadId?: string) {
  return useSupabaseQuery<PartnerSubmission[]>(async () => {
    if (!leadId) return [];
    const {data: applications,error: appError}=await supabase.from('applications').select('id').eq('lead_id',leadId);
    if(appError)throw appError;
    if(!applications?.length)return [];
    const {data,error}=await supabase.from('partner_submissions')
      .select('*, funding_partners(name, email, contact_name)')
      .in('application_id',applications.map(application=>application.id))
      .order('created_at',{ascending:false});
    if(error)throw error;
    return (data ?? []) as PartnerSubmission[];
  }, [], [leadId]);
}

export function useCreateFundingPartner() {
  const [loading, setLoading] = useState(false);

  async function createFundingPartner(payload: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    minRevenue?: number;
    maxFunding?: number;
    industriesAccepted?: string[];
    notes?: string;
    status?: 'Active' | 'Inactive';
    criteria?: FundingPartnerCriteria;
  }) {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('funding_partners')
        .insert({
          name: payload.name.trim(),
          contact_name: payload.contactName?.trim() || null,
          email: payload.email?.trim() || null,
          phone: payload.phone?.trim() || null,
          min_revenue: payload.minRevenue ?? 0,
          max_funding: payload.maxFunding ?? 0,
          industries_accepted: payload.industriesAccepted ?? [],
          status: payload.status ?? 'Active',
          notes: payload.notes?.trim() || null,
          ...payload.criteria,
        })
        .select()
        .single();

      if (error) throw error;
      if (!data?.id) throw new Error('Funding partner was not created. Refresh and try again.');
      return data as FundingPartner;
    } finally {
      setLoading(false);
    }
  }

  return { createFundingPartner, loading };
}

export function useCreatePartnerSubmission() {
  const [loading, setLoading] = useState(false);

  async function createSubmission(payload: {
    applicationId: string;
    leadId?: string | null;
    fundingPartnerId: string;
    notes?: string;
    includedDocumentIds?: string[];
  }) {
    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('partner_submissions')
        .insert({
          application_id: payload.applicationId,
          funding_partner_id: payload.fundingPartnerId,
          submitted_by: auth.user?.id ?? null,
          status: 'Submitted',
          notes: payload.notes ?? null,
          included_document_ids: payload.includedDocumentIds ?? [],
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        application_id: payload.applicationId,
        lead_id: payload.leadId ?? null,
        user_id: auth.user?.id ?? null,
        action: 'partner_submission_created',
        metadata: {
          funding_partner_id: payload.fundingPartnerId,
          included_document_ids: payload.includedDocumentIds ?? [],
        },
      });

      return data as PartnerSubmission;
    } finally {
      setLoading(false);
    }
  }

  async function markDeclined(payload: {
    submissionId: string;
    applicationId?: string | null;
    leadId?: string | null;
    denialReason: string;
    denialNotes?: string;
  }) {
    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('partner_submissions')
        .update({
          status: 'Declined',
          response_status: 'Declined',
          denial_reason: payload.denialReason,
          denial_notes: payload.denialNotes ?? null,
          denied_by: auth.user?.id ?? null,
          denied_at: now,
          response_at: now,
        })
        .eq('id', payload.submissionId);

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        application_id: payload.applicationId ?? null,
        lead_id: payload.leadId ?? null,
        user_id: auth.user?.id ?? null,
        action: 'partner_submission_declined',
        metadata: {
          partner_submission_id: payload.submissionId,
          denial_reason: payload.denialReason,
        },
      });
    } finally {
      setLoading(false);
    }
  }

  return {
    createSubmission,
    markDeclined,
    loading,
  };
}
