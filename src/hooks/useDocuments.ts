import { useState } from 'react';
import { supabase, type Document } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

const DOCUMENT_BUCKET = 'application-documents';

export interface DocumentFilters {
  leadId?: string;
  applicationId?: string;
}

export interface UploadDocumentInput {
  leadId?: string | null;
  applicationId?: string | null;
  documentType: string;
  file: File;
  notes?: string;
}

function safeFileName(name: string) {
  const parts = name.split('.');
  const extension = parts.length > 1 ? `.${parts.pop()}` : '';
  const base = parts.join('.') || name;
  return `${base.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '')}${extension.toLowerCase()}`;
}

export function useDocuments(filters?: string | DocumentFilters) {
  const normalizedFilters: DocumentFilters = typeof filters === 'string' ? { leadId: filters } : filters ?? {};

  return useSupabaseQuery<Document[]>(async () => {
    let query = supabase
      .from('documents')
      .select('*, leads(first_name, last_name, business_name)')
      .order('created_at', { ascending: false });

    if (normalizedFilters.leadId) query = query.eq('lead_id', normalizedFilters.leadId);
    if (normalizedFilters.applicationId) query = query.eq('application_id', normalizedFilters.applicationId);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Document[];
  }, [], [normalizedFilters.leadId, normalizedFilters.applicationId]);
}

export function useUploadDocument() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadDocument(input: UploadDocumentInput) {
    setUploading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const timestamp = Date.now();
      const sanitized = safeFileName(input.file.name);
      const ownerId = input.applicationId ?? input.leadId ?? 'unassigned';
      const folder = input.applicationId ? `applications/${ownerId}` : `leads/${ownerId}`;
      const storagePath = `${folder}/${timestamp}-${sanitized}`;

      const { error: storageError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(storagePath, input.file, {
          cacheControl: '3600',
          contentType: input.file.type || 'application/octet-stream',
          upsert: false,
        });

      if (storageError) throw storageError;

      const payload = {
        lead_id: input.leadId ?? null,
        application_id: input.applicationId ?? null,
        doc_type: input.documentType,
        document_type: input.documentType,
        file_name: input.file.name,
        storage_path: storagePath,
        file_path: storagePath,
        file_size: input.file.size,
        mime_type: input.file.type || 'application/octet-stream',
        status: 'Uploaded',
        review_notes: input.notes || null,
        uploaded_by: userData.user?.id ?? null,
        uploaded_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from('documents')
        .insert(payload)
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase.from('activity_logs').insert({
        application_id: input.applicationId ?? null,
        lead_id: input.leadId ?? null,
        user_id: userData.user?.id ?? null,
        action: 'document_uploaded',
        metadata: {
          document_type: input.documentType,
          file_name: input.file.name,
          storage_path: storagePath,
          file_size: input.file.size,
        },
      });

      return data as Document;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to upload document.';
      setError(message);
      throw new Error(message);
    } finally {
      setUploading(false);
    }
  }

  return { uploadDocument, uploading, error };
}

export async function createDocumentSignedUrl(storagePath: string, expiresInSeconds = 300) {
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw error;
  return data.signedUrl;
}
