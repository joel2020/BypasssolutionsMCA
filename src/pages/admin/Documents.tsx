import { useState, useEffect } from 'react';
import { FileText, Eye, CheckCircle2, Clock, XCircle, Search } from 'lucide-react';
import { supabase, type Document } from '../../lib/supabase';

const docTypes = ['All', 'Bank Statement', 'Voided Check', 'ID', 'Business Docs', 'Tax Docs', 'Contract'];

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
  return 'bg-amber-50 text-amber-700';
};

export default function Documents() {
  const [docs, setDocs] = useState<DocWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('documents')
      .select('*, leads(first_name, last_name, business_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setDocs(data as DocWithLead[]);
        setLoading(false);
      });
  }, []);

  const filtered = docs.filter(d => {
    const leadName = d.leads ? `${d.leads.first_name} ${d.leads.last_name}` : '';
    const business = d.leads?.business_name || '';
    const q = search.toLowerCase();
    const matchSearch = !q || leadName.toLowerCase().includes(q) || business.toLowerCase().includes(q) || d.file_name.toLowerCase().includes(q);
    const matchType = filterType === 'All' || d.doc_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Documents</h1>
          <p className="text-[13px] text-slate-400">{loading ? 'Loading...' : `${filtered.length} documents`}</p>
        </div>
      </div>

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
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['File', 'Lead / Business', 'Type', 'Date Uploaded', 'Status', 'Notes', 'Actions'].map((h) => (
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
                    <span className="badge-default text-[11px]">{doc.doc_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-slate-600">{new Date(doc.created_at).toLocaleDateString()}</span>
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
                    <button className="flex items-center gap-1 text-[12px] text-accent-600 hover:text-accent-700 font-medium">
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-[14px] text-slate-400">No documents found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
