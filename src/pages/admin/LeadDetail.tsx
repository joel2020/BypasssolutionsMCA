import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, MapPin, Building2, DollarSign, User,
  FileText, CheckCircle2, Circle, Clock, Tag, MessageSquare, Plus,
} from 'lucide-react';
import { supabase, type Lead, type LeadStatus, type Note, type Task } from '../../lib/supabase';
import { statusColors, pipelineStatuses } from '../../data/mockData';

const tabs = ['Overview', 'Application', 'Underwriting', 'Risk Checks', 'DataMerch', 'Credit Reports', 'Compliance Log', 'Documents', 'Notes', 'Tasks', 'Calls'];

const docChecklist = [
  '3-Month Bank Statement', '4-Month Bank Statement', '5-Month Bank Statement',
  '6-Month Bank Statement', 'Voided Check', "Driver's License", 'Business License / Docs',
];

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const [{ data: leadData }, { data: notesData }, { data: tasksData }] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id).maybeSingle(),
      supabase.from('notes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    ]);

    if (leadData) setLead(leadData as Lead);
    if (notesData) setNotes(notesData as Note[]);
    if (tasksData) setTasks(tasksData as Task[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateStatus = async (status: LeadStatus) => {
    if (!lead) return;
    setStatusUpdating(true);
    await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', lead.id);
    setLead((prev) => prev ? { ...prev, status } : prev);
    setStatusUpdating(false);
  };

  const saveNote = async () => {
    if (!newNote.trim() || !lead) return;
    setSavingNote(true);
    const { data, error } = await supabase.from('notes').insert({
      lead_id: lead.id,
      text: newNote.trim(),
      created_by_name: 'Admin',
    }).select().single();
    if (!error && data) {
      setNotes((prev) => [data as Note, ...prev]);
      setNewNote('');
    }
    setSavingNote(false);
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'Completed' ? 'Open' : 'Completed';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus as Task['status'] } : t));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-accent-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Lead not found.</p>
        <Link to="/admin/leads" className="btn-primary mt-4 inline-flex">Back to Leads</Link>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <Link to="/admin/leads" className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft size={14} />
          Leads
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-[13px] text-slate-700 font-medium">{lead.first_name} {lead.last_name}</span>
      </div>

      {/* Header */}
      <div className="card p-6 mb-5 flex flex-col lg:flex-row items-start gap-5 justify-between">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-navy-900 flex items-center justify-center text-white text-[17px] font-bold flex-shrink-0">
            {lead.first_name?.[0]}{lead.last_name?.[0]}
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-navy-900">{lead.first_name} {lead.last_name}</h1>
            <p className="text-[15px] text-slate-600 mt-0.5">{lead.business_name}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-[12px] font-semibold ${statusColors[lead.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {lead.status}
              </span>
              <span className="text-[13px] text-slate-400">{lead.industry}</span>
              {lead.lead_score > 0 && (
                <span className="text-[13px] text-slate-400">Score: <strong className="text-slate-700">{lead.lead_score}</strong></span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="btn-secondary h-9 text-[13px] px-4">
              <Phone size={14} /> Call
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="btn-secondary h-9 text-[13px] px-4">
              <Mail size={14} /> Email
            </a>
          )}
          <div className="relative">
            <select
              value={lead.status}
              onChange={(e) => updateStatus(e.target.value as LeadStatus)}
              disabled={statusUpdating}
              className="h-9 pl-3 pr-8 bg-accent-600 text-white border border-accent-600 rounded-md text-[13px] font-medium focus:outline-none appearance-none cursor-pointer disabled:opacity-60"
            >
              {pipelineStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4L6 8L10 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 mb-5 bg-white border border-slate-200 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${
              activeTab === tab ? 'bg-slate-100 text-navy-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="card p-6">
              <h3 className="text-[15px] font-semibold text-navy-900 mb-4">Business Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Building2, label: 'Business', value: lead.business_name || '—' },
                  { icon: MapPin, label: 'State', value: lead.state || '—' },
                  { icon: Tag, label: 'Industry', value: lead.industry || '—' },
                  { icon: Clock, label: 'Time in Business', value: lead.time_in_business || '—' },
                  { icon: DollarSign, label: 'Monthly Revenue', value: lead.monthly_revenue ? `$${lead.monthly_revenue.toLocaleString()}` : '—' },
                  { icon: DollarSign, label: 'Requested', value: lead.funding_amount_requested ? `$${lead.funding_amount_requested.toLocaleString()}` : '—' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <item.icon size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">{item.label}</p>
                      <p className="text-[14px] font-medium text-slate-800">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-[15px] font-semibold text-navy-900 mb-4">Contact Information</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <User size={15} className="text-slate-400" />
                  <span className="text-[14px] text-slate-700">{lead.first_name} {lead.last_name}</span>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={15} className="text-slate-400" />
                    <a href={`tel:${lead.phone}`} className="text-[14px] text-accent-600 hover:underline">{lead.phone}</a>
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-3">
                    <Mail size={15} className="text-slate-400" />
                    <a href={`mailto:${lead.email}`} className="text-[14px] text-accent-600 hover:underline">{lead.email}</a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="card p-6">
              <h3 className="text-[14px] font-semibold text-navy-900 mb-4">Quick Info</h3>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Assigned Rep', value: lead.assigned_rep || 'Unassigned' },
                  { label: 'Source', value: lead.source || '—' },
                  { label: 'Created', value: new Date(lead.created_at).toLocaleDateString() },
                  { label: 'Urgency', value: lead.urgency || '—' },
                  { label: 'Existing Advances', value: lead.existing_advances ? 'Yes' : 'No' },
                  { label: 'Use of Funds', value: lead.use_of_funds || '—' },
                  { label: 'Consent', value: lead.consent ? 'Yes' : 'No' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-400">{item.label}</span>
                    <span className="text-[13px] font-medium text-slate-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-[14px] font-semibold text-navy-900 mb-4">Document Checklist</h3>
              <div className="flex flex-col gap-2.5">
                {docChecklist.map((doc) => (
                  <div key={doc} className="flex items-center gap-2.5">
                    <Circle size={15} className="text-slate-300 flex-shrink-0" />
                    <span className="text-[13px] text-slate-400">{doc}</span>
                    <span className="ml-auto text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm">Missing</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPLICATION */}
      {activeTab === 'Application' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[
            {
              title: 'Business Information',
              fields: [
                { label: 'Business Legal Name', value: lead.business_name },
                { label: 'DBA', value: lead.dba },
                { label: 'Industry', value: lead.industry },
                { label: 'Website', value: lead.website },
                { label: 'State', value: lead.state },
                { label: 'Time in Business', value: lead.time_in_business },
                { label: 'Monthly Revenue', value: lead.monthly_revenue ? `$${lead.monthly_revenue.toLocaleString()}` : '—' },
                { label: 'Funding Requested', value: lead.funding_amount_requested ? `$${lead.funding_amount_requested.toLocaleString()}` : '—' },
              ],
            },
            {
              title: 'Owner & Funding Details',
              fields: [
                { label: 'Owner Name', value: `${lead.first_name} ${lead.last_name}` },
                { label: 'Email', value: lead.email },
                { label: 'Phone', value: lead.phone },
                { label: 'Credit Score Range', value: lead.credit_score_range },
                { label: 'Ownership %', value: lead.ownership_pct ? `${lead.ownership_pct}%` : '—' },
                { label: 'Use of Funds', value: lead.use_of_funds },
                { label: 'Existing Advances', value: lead.existing_advances ? 'Yes' : 'No' },
                { label: 'Urgency', value: lead.urgency },
              ],
            },
          ].map((section) => (
            <div key={section.title} className="card p-6">
              <h3 className="text-[15px] font-semibold text-navy-900 mb-4">{section.title}</h3>
              <div className="flex flex-col gap-3">
                {section.fields.map((f) => (
                  <div key={f.label} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-none last:pb-0">
                    <span className="text-[13px] text-slate-500">{f.label}</span>
                    <span className="text-[13px] font-medium text-slate-800">{f.value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {['Underwriting', 'Risk Checks', 'DataMerch', 'Credit Reports', 'Compliance Log'].includes(activeTab) && (
        <div className="card p-6">
          <h3 className="text-[16px] font-semibold text-navy-900 mb-2">{activeTab}</h3>
          <p className="text-[14px] text-slate-500 leading-relaxed">
            {activeTab === 'DataMerch' && 'DataMerch checks are planned for a server-side Supabase Edge Function and will require recorded applicant consent before any real request is run.'}
            {activeTab === 'Credit Reports' && 'Credit report requests are planned for a server-side workflow only. API credentials and reports must never be exposed in the browser.'}
            {activeTab === 'Compliance Log' && 'Consent records, audit events, document access, and funding disclosures will be tracked here after the production schema is applied.'}
            {activeTab === 'Underwriting' && 'Underwriting worksheets, bank-statement analysis, stipulations, and approval notes will be managed here.'}
            {activeTab === 'Risk Checks' && 'Risk flags, duplicate application checks, fraud review notes, and restricted-industry reviews will be managed here.'}
          </p>
        </div>
      )}

      {/* DOCUMENTS */}
      {activeTab === 'Documents' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-semibold text-navy-900">Uploaded Documents</h3>
            <button className="btn-primary h-8 text-[12px] px-3">
              <Plus size={13} /> Request Document
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {docChecklist.map((doc) => (
              <div key={doc} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg">
                <FileText size={18} className="text-slate-300" />
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-slate-800">{doc}</p>
                  <p className="text-[12px] text-slate-400">Not yet uploaded</p>
                </div>
                <span className="badge bg-amber-50 text-amber-700 text-[11px]">Missing</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOTES */}
      {activeTab === 'Notes' && (
        <div className="card p-6">
          <h3 className="text-[15px] font-semibold text-navy-900 mb-5">Internal Notes</h3>
          <div className="mb-5">
            <textarea
              className="input-field h-24 py-3 resize-none"
              placeholder="Add an internal note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <button
              onClick={saveNote}
              disabled={!newNote.trim() || savingNote}
              className="btn-primary h-8 text-[12px] px-3 mt-2 disabled:opacity-50"
            >
              {savingNote ? 'Saving...' : 'Save Note'}
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {notes.length === 0 && (
              <p className="text-[14px] text-slate-400 text-center py-6">No notes yet.</p>
            )}
            {notes.map((note) => (
              <div key={note.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold text-slate-700">{note.created_by_name}</span>
                  <span className="text-[11px] text-slate-400">{new Date(note.created_at).toLocaleString()}</span>
                </div>
                <p className="text-[14px] text-slate-600 leading-relaxed">{note.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TASKS */}
      {activeTab === 'Tasks' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-semibold text-navy-900">Tasks</h3>
            <button className="btn-primary h-8 text-[12px] px-3">
              <Plus size={13} /> Add Task
            </button>
          </div>
          {tasks.length === 0 && (
            <p className="text-[14px] text-slate-400 text-center py-6">No tasks yet.</p>
          )}
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <div key={task.id} className="border border-slate-200 rounded-lg p-4 flex items-center gap-4">
                <button onClick={() => toggleTask(task)}>
                  {task.status === 'Completed'
                    ? <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                    : <Circle size={18} className="text-slate-300 hover:text-slate-500 flex-shrink-0" />
                  }
                </button>
                <div className={`flex-1 ${task.status === 'Completed' ? 'opacity-50' : ''}`}>
                  <p className={`text-[14px] font-medium ${task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {task.title}
                  </p>
                  <p className="text-[12px] text-slate-400">
                    Due {task.due_date || 'No date'} — {task.assigned_rep}
                  </p>
                </div>
                <span className={`badge text-[11px] ${task.priority === 'High' ? 'bg-red-50 text-red-600' : task.priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CALLS placeholder */}
      {activeTab === 'Calls' && (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <MessageSquare size={20} className="text-slate-400" />
          </div>
          <p className="text-[15px] font-medium text-slate-600 mb-1">Call History</p>
          <p className="text-[13px] text-slate-400">No calls logged yet for this lead.</p>
        </div>
      )}
    </div>
  );
}
