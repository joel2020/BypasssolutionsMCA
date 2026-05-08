import { useMemo, useState, type ChangeEvent, type DragEvent } from 'react';
import { CheckCircle2, Clock, Eye, FileText, Search, UploadCloud, X, XCircle } from 'lucide-react';
import { type Document, type Lead } from '../../lib/supabase';
import { createDocumentSignedUrl, REQUIRED_DOCUMENT_TYPES, useDocuments, useUploadDocument } from '../../hooks/useDocuments';
import { useLeads } from '../../hooks/useLeads';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';

const docTypes = ['All', ...REQUIRED_DOCUMENT_TYPES];

type DocWithLead = Document & {
  leads?: { first_name: string; last_name: string; business_name: string };
};

const statusIcon = (s: string) => {
  if (s === 'Approved') return <CheckCircle2 size={14} className="text-green-500" />;
  if (s === 'Rejected') return <XCircle size={14} className="text-red-500" />;
  return <Clock size={14} className="text-amber-500" />;
};

const statusBadge = (s: string) => {
  if (s === 'Approved') return 'bg-green-50 text-green-700';
  if (s === 'Rejected') return 'bg-red-50 text-red-700';
  if (s === 'Reviewed') return 'bg-blue-50 text-blue-700';
  if (s === 'Uploaded') return 'bg-teal-50 text-teal-700';
  return 'bg-amber-50 text-amber-700';
};

function formatFileSize(size?: number | null) {
  if (!size) return '—';
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function UploadPanel({ leads, onUploaded }: { leads: Lead[]; onUploaded: () => Promise<void> }) {
  const [leadId, setLeadId] = useState('');
  const [documentType, setDocumentType] = useState<string>(REQUIRED_DOCUMENT_TYPES[0]);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const { uploadDocument, uploading, error } = useUploadDocument();

  function pickFile(nextFile?: File) {
    if (!nextFile) return;
    setSuccess(null);
    setFile(nextFile);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    pickFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    pickFile(event.dataTransfer.files?.[0]);
  }

  async function submitUpload() {
    if (!file || !leadId) return;
    const uploaded = await uploadDocument({ leadId, documentType, file, notes });
    setSuccess(`${uploaded.file_name} uploaded securely.`);
    setFile(null);
    setNotes('');
    await onUploaded();
  }

  return (
    <div className="card p-5 mb-5 border-accent-100 bg-gradient-to-br from-white to-accent-50/30">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-[15px] font-semibold text-navy-900">Secure Document Upload</h2>
          <p className="text-[12px] text-slate-500 mt-1">Upload bank statements, IDs, voided checks, tax docs, MCA positions, contracts, and processing statements.</p>
        </div>
        <span className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-semibold text-green-700">Private Supabase Storage</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
        <select
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-accent-500"
        >
          <option value="">Select lead / business</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.business_name || `${lead.first_name} ${lead.last_name}`} — {lead.email}
            </option>
          ))}
        </select>

        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-accent-500"
        >
          {REQUIRED_DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>

        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional review note"
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-accent-500 lg:col-span-2"
        />
      </div>

      <label
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`block cursor-pointer rounded-xl border border-dashed p-6 text-center transition-all ${isDragging ? 'border-accent-500 bg-accent-50' : 'border-slate-300 bg-white hover:border-accent-400 hover:bg-slate-50'}`}
      >
        <UploadCloud size={26} className="mx-auto text-accent-600" />
        <p className="mt-2 text-[13px] font-semibold text-slate-800">{file ? file.name : 'Drag and drop a document, or click to browse'}</p>
        <p className="mt-1 text-[12px] text-slate-400">PDF, DOC, DOCX, PNG, JPG up to 50MB</p>
        <input type="file" className="hidden" onChange={onInputChange} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] text-slate-500">
          {file ? `${formatFileSize(file.size)} selected` : 'No file selected'}
          {error && <span className="ml-3 font-medium text-red-600">{error}</span>}
          {success && <span className="ml-3 font-medium text-green-700">{success}</span>}
        </div>
        <div className="flex items-center gap-2">
          {file && (
            <button onClick={() => setFile(null)} className="btn-secondary h-9 px-3 text-[12px]">
              <X size={13} /> Clear
            </button>
          )}
          <button disabled={!file || !leadId || uploading} onClick={submitUpload} className="btn-primary h-9 px-4 text-[13px] disabled:cursor-not-allowed disabled:opacity-50">
            <UploadCloud size={14} /> {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Documents() {
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch] = useState('');
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const { data, loading, error, refetch } = useDocuments();
  const { data: leads } = useLeads();
  const docs = data as DocWithLead[];

  const filtered = docs.filter(d => {
    const leadName = d.leads ? `${d.leads.first_name} ${d.leads.last_name}` : '';
    const business = d.leads?.business_name || '';
    const q = search.toLowerCase();
    const matchSearch = !q || leadName.toLowerCase().includes(q) || business.toLowerCase().includes(q) || d.file_name.toLowerCase().includes(q);
    const matchType = filterType === 'All' || d.doc_type === filterType || d.document_type === filterType;
    return matchSearch && matchType;
  });

  const missingByLead = useMemo(() => {
    const selectedLead = leads[0];
    if (!selectedLead) return [];
    const existing = new Set(docs.filter((doc) => doc.lead_id === selectedLead.id).map((doc) => doc.doc_type || doc.document_type));
    return REQUIRED_DOCUMENT_TYPES.filter((type) => !existing.has(type));
  }, [docs, leads]);

  async function viewDocument(doc: Document) {
    setViewError(null);
    setViewingId(doc.id);
    try {
      const url = await createDocumentSignedUrl(doc.storage_path || doc.file_path || '');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setViewError(err instanceof Error ? err.message : 'Unable to create secure document link.');
    } finally {
      setViewingId(null);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Documents</h1>
          <p className="text-[13px] text-slate-400">{loading ? 'Loading...' : `${filtered.length} documents`}</p>
        </div>
      </div>

      <UploadPanel leads={leads} onUploaded={refetch} />

      {missingByLead.length > 0 && (
        <div className="card p-4 mb-5 border-amber-100 bg-amber-50/50">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-amber-700">Required document checklist</p>
          <p className="mt-1 text-[13px] text-slate-600">For the newest lead, still missing: {missingByLead.join(', ')}</p>
        </div>
      )}

      {viewError && <div className="mb-4"><ErrorState message={viewError} /></div>}

      <div className="card p-4 mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by lead, business, or filename..."
            className="h-9 w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-4 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {docTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                filterType === t ? 'bg-accent-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonLoader label="Loading documents from Supabase..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No documents found" message="Upload documents from this page or from the lead detail page." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['File', 'Lead / Business', 'Type', 'Size', 'Date Uploaded', 'Status', 'Notes', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-[12px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <FileText size={16} className="text-slate-400 flex-shrink-0" />
                        <span className="text-[13px] font-medium text-slate-800 whitespace-nowrap">{doc.file_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-medium text-slate-800">
                        {doc.leads ? `${doc.leads.first_name} ${doc.leads.last_name}` : '—'}
                      </p>
                      <p className="text-[11px] text-slate-400">{doc.leads?.business_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge-default text-[11px]">{doc.doc_type || doc.document_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-slate-600">{formatFileSize(doc.file_size)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-slate-600">{new Date(doc.uploaded_at || doc.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-[11px] font-semibold ${statusBadge(doc.status)}`}>
                        {statusIcon(doc.status)}
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-slate-500">{doc.review_notes || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => viewDocument(doc)} className="flex items-center gap-1 text-[12px] text-accent-600 hover:text-accent-700 font-medium" disabled={viewingId === doc.id}>
                        <Eye size={13} /> {viewingId === doc.id ? 'Opening...' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
