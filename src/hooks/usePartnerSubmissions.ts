import { useState } from 'react';
import { supabase, type FundingPartner, type PartnerSubmission } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

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

export function usePartnerSubmissions(applicationId?: string) {
  return useSupabaseQuery<PartnerSubmission[]>(async () => {
    if (!applicationId) return [];

    const { data, error } = await supabase
      .from('partner_submissions')
      .select('*, funding_partners(name, email, contact_name)')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as PartnerSubmission[];
  }, [], [applicationId]);
}

export function useCreatePartnerSubmission() {
  const [loading, setLoading] = useState(false);

  async function createSubmission(payload: {
    applicationId: string;
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
        user_id: auth.user?.id ?? null,
        action: 'partner_submission_created',
        metadata: {
          funding_partner_id: payload.fundingPartnerId,
          included_document_ids: payload.includedDocumentIds ?? [],
        },
      });

      return data;
    } finally {
      setLoading(false);
    }
  }

  async function markDeclined(submissionId: string, denialReason: string, denialNotes?: string) {
    const { data: auth } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('partner_submissions')
      .update({
        status: 'Declined',
        denial_reason: denialReason,
        denial_notes: denialNotes ?? null,
        denied_by: auth.user?.id ?? null,
        denied_at: new Date().toISOString(),
        response_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (error) throw error;
  }

  return {
    createSubmission,
    markDeclined,
    loading,
  };
}
