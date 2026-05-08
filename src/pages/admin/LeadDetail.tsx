import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarClock, CircleDollarSign, FileText, Mail, Phone, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassCard } from './Dashboard';
import { useLead } from '../../hooks/useLead';
import { useOffers } from '../../hooks/useOffers';
import { useTasks } from '../../hooks/useTasks';
import { useDocuments } from '../../hooks/useDocuments';
import { useNotes } from '../../hooks/useNotes';
import { ErrorState, NotFoundState, SkeletonLoader } from '../../components/admin/States';
import { leadStatusColors } from '../../lib/status';
import { maskAccount, maskEIN, maskSSN } from '../../utils/mask';

const tabs = ['Overview', 'Business Info', 'Owner Info', 'Underwriting', 'Documents', 'Offers', 'Communications', 'Tasks', 'Notes', 'Activity Timeline'];
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

type ExtendedLead = Record<string, unknown>;

function text(lead: ExtendedLead, key: string, fallback = '—') {
  const value = lead[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function numberValue(lead: ExtendedLead, key: string) {
  const value = lead[key];
  return typeof value === 'number' ? value : 0;
}

export default function LeadDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Overview');
  const { data: lead, loading, error, notFound } = useLead(id);
  const { data: offers } = useOffers(id);
  const { data: tasks } = useTasks({ leadId: id });
  const { data: documents } = useDocuments(id);
  const { data: notes } = useNotes(id);

  if (loading) return <div className="min-h-screen bg-[#071225] p-6 lg:p-8"><SkeletonLoader label="Loading application..." /></div>;
  if (error) return <div className="min-h-screen bg-[#071225] p-6 lg:p-8"><ErrorState message={error} /></div>;
  if (notFound || !lead) return <NotFoundState />;

  const extended = lead as unknown as ExtendedLead;
  const ownerName = `${lead.first_name} ${lead.last_name}`.trim() || text(extended, 'owner_full_name');
  const statusClass = leadStatusColors[lead.status] ?? 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="min-h-screen bg-[#071225] text-white">
      <div className="border-b border-white/10 bg-[#071225]/80 px-6 py-4 backdrop-blur lg:px-8">
        <Link to="/admin/applications" className="mb-4 inline-flex items-center gap-2 text-[13px] font-semibold text-slate-400 hover:text-white"><ArrowLeft size={15} /> Applications</Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3"><h1 className="text-[28px] font-black tracking-tight">{lead.business_name}</h1><span className={`rounded-full border px-3 py-1 text-[12px] font-bold ${statusClass}`}>{lead.status}</span></div>
            <div className="mt-2 flex flex-wrap gap-4 text-[13px] text-slate-400"><span className="inline-flex items-center gap-1.5"><UserRound size={14} />{ownerName}</span><span className="inline-flex items-center gap-1.5"><Mail size={14} />{lead.email}</span><span className="inline-flex items-center gap-1.5"><Phone size={14} />{lead.phone}</span></div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-right"><p className="text-[12px] text-slate-400">Requested</p><p className="text-[22px] font-black text-white">{currency.format(lead.funding_amount_requested)}</p></div>
        </div>
      </div>

      <div className="p-6 lg:p-8">
        <div className="mb-5 overflow-x-auto"><div className="flex min-w-max gap-1">{tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`h-10 rounded-lg px-4 text-[13px] font-bold transition ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/8 hover:text-white'}`}>{tab}</button>)}</div></div>
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <GlassCard className="p-6">
            {activeTab === 'Overview' && <div className="grid gap-5 md:grid-cols-3"><Field icon={<Building2 size={16} />} label="Business" value={lead.business_name} /><Field icon={<CircleDollarSign size={16} />} label="Requested funding" value={currency.format(lead.funding_amount_requested)} /><Field icon={<CalendarClock size={16} />} label="Submitted" value={new Date(lead.created_at).toLocaleDateString()} /><Field label="Industry" value={lead.industry} /><Field label="Monthly revenue" value={currency.format(lead.monthly_revenue)} /><Field label="Assigned rep" value={lead.assigned_rep || 'Unassigned'} /></div>}
            {activeTab === 'Business Info' && <div className="grid gap-5 md:grid-cols-3"><Field label="Legal name" value={lead.business_name} /><Field label="DBA" value={lead.dba} /><Field label="Industry" value={lead.industry} /><Field label="Entity type" value={text(extended, 'entity_type')} /><Field label="Business start date" value={text(extended, 'start_date')} /><Field label="Masked EIN" value={maskEIN(text(extended, 'ein_last_four', ''))} /></div>}
            {activeTab === 'Owner Info' && <div className="grid gap-5 md:grid-cols-3"><Field label="Owner name" value={ownerName} /><Field label="Title" value={text(extended, 'owner_title')} /><Field label="Ownership" value={lead.ownership_pct} /><Field label="Email" value={lead.email} /><Field label="Phone" value={lead.phone} /><Field label="Masked SSN" value={maskSSN(text(extended, 'ssn_last_four', ''))} /></div>}
            {activeTab === 'Underwriting' && <div className="grid gap-5 md:grid-cols-4"><Field label="Average daily balance" value={currency.format(lead.avg_daily_balance)} /><Field label="Monthly deposits" value={currency.format(lead.monthly_deposits)} /><Field label="NSFs last 90 days" value={String(numberValue(extended, 'nsfs_last_90_days'))} /><Field label="Current MCA balances" value={currency.format(numberValue(extended, 'current_mca_balances'))} /><Field label="Account" value={maskAccount(text(extended, 'account_last_four', ''))} /></div>}
            {activeTab === 'Documents' && <List items={documents.map((doc) => `${doc.doc_type}: ${doc.file_name} (${doc.status})`)} empty="No documents uploaded." />}
            {activeTab === 'Offers' && <List items={offers.map((offer) => `${offer.funder_name}: ${currency.format(offer.funding_amount)} • ${offer.status}`)} empty="No offers created." />}
            {activeTab === 'Communications' && <p className="text-[14px] text-slate-400">Communications are loaded from Supabase communication tables in the dedicated Email, SMS, and Calls pages.</p>}
            {activeTab === 'Tasks' && <List items={tasks.map((task) => `${task.title} • ${task.status}`)} empty="No tasks assigned." />}
            {activeTab === 'Notes' && <List items={notes.map((note) => `${note.created_by_name}: ${note.text}`)} empty="No notes added." />}
            {activeTab === 'Activity Timeline' && <List items={[`Created ${new Date(lead.created_at).toLocaleString()}`, `Last updated ${new Date(lead.updated_at).toLocaleString()}`]} empty="No activity logged." />}
          </GlassCard>
          <GlassCard className="p-5"><h3 className="text-[16px] font-bold text-white">Quick Facts</h3><div className="mt-4 space-y-4"><Field label="Requested" value={currency.format(lead.funding_amount_requested)} /><Field label="Monthly revenue" value={currency.format(lead.monthly_revenue)} /><Field label="Current MCA balances" value={currency.format(numberValue(extended, 'current_mca_balances'))} /><Field label="Submitted" value={new Date(lead.created_at).toLocaleDateString()} /></div></GlassCard>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value: string | number; icon?: ReactNode }) {
  return <div><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{icon}{label}</p><p className="mt-1 text-[15px] font-semibold text-white">{value || '—'}</p></div>;
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-[14px] text-slate-400">{empty}</p>;
  return <div className="space-y-3">{items.map((item) => <div key={item} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-[14px] text-slate-200"><FileText size={14} className="mr-2 inline text-blue-300" />{item}</div>)}</div>;
}
