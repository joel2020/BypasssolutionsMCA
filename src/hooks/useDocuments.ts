import { useState } from 'react';
import { supabase, type Document } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export const DOCUMENT_BUCKET = 'application-documents';
export const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024;

export const REQUIRED_DOCUMENT_TYPES = [
  'Bank Statement',
  'Driver License',
  'Voided Check',
  'Tax Returns',
  'MCA Position Sheet',
  'Processing Statements',
  'Business Docs',
  'Contract',
] as const;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

export interface DocumentFilters {
  leadId?: string;
  applicationId?: string;
}

export interface UploadDocumentInput {
  leadId: string;
  applicationId?: string | null;
  documentType: string;
  file: File;
  notes?: string;
}

function safeFileName(name: string) {
  const parts = name.split('.');
  const extension = parts.length > 1 ? `.${parts.pop()}` : '';
  const base = parts.join('.') || name;
  const safeBase = base.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'document';
  return `${safeBase}${extension.toLowerCase()}`;
}

export function validateDocumentFile(file: File) {
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error('File is too large. Maximum upload size is 50MB.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  const allowedExtension = extension && ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'].includes(extension);
  const allowedMime = file.type ? ALLOWED_MIME_TYPES.has(file.type) : false;

  if (!allowedExtension && !allowedMime) {
    throw new Error('Unsupported file type. Upload PDF, DOC, DOCX, PNG, JPG, or JPEG files only.');
  }
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
      if (!input.leadId) throw new Error('Select a lead before uploading a document.');
      validateDocumentFile(input.file);

      const { data: userData } = await supabase.auth.getUser();
      const timestamp = Date.now();
      const sanitized = safeFileName(input.file.name);
      const ownerId = input.applicationId ?? input.leadId;
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
        lead_id: input.leadId,
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

      await supabase.from('audit_logs').insert({
        actor_id: userData.user?.id ?? null,
        lead_id: input.leadId,
        action: 'document_uploaded',
        metadata: {
          application_id: input.applicationId ?? null,
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

/**
 * Removes a document: the storage object first, then the row.
 * Storage failures are non-fatal (an orphaned file is better than a phantom row
 * the user can't get rid of), but a row-delete failure is surfaced.
 */
export async function deleteDocument(doc: { id: string; storage_path?: string | null; file_path?: string | null }) {
  const path = doc.storage_path || doc.file_path || '';
  if (path) {
    const { error: storageError } = await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
    if (storageError) console.error('Could not remove the stored file.', storageError);
  }
  const { error } = await supabase.from('documents').delete().eq('id', doc.id);
  if (error) throw error;
}

export async function createDocumentSignedUrl(storagePath: string, expiresInSeconds = 300) {
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw error;
  return data.signedUrl;
}
