import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, ClipboardCheck, DollarSign, FileText,
  LockKeyhole, Mail, MessageSquareText, Phone, Plus, ShieldCheck, UserRound,
} from 'lucide-react';
import { activities, crmApplications, detailTabs, documentChecklist } from '../../data/crmData';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.035] shadow-2xl shadow-blue-950/20 backdrop-blur ${className}`}>{children}</section>;
}

function Field({ label, value }: { label: string; value: string | number }) {
  return <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-[14px] font-semibold text-slate-100">{value}</p></div>;
}

function ActionButton({ children }: { children: React.ReactNode }) {
  return <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-[13px] font-semibold text-slate-100 hover:bg-white/10">{children}</button>;
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const application = useMemo(() => crmApplications.find((app) => app.id === id) ?? crmApplications[0], [id]);
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="p-5 lg:p-8 text-slate-100">
      <div className="mb-5 flex items-center gap-2 text-[13px]">
        <Link to="/admin/dashboard" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white"><ArrowLeft size={14} /> Pipeline</Link>
        <span className="text-slate-600">/</span>
        <span className="font-semibold text-white">{application.businessName}</span>
      </div>

      <GlassCard className="mb-5 p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-800 text-[20px] font-bold text-white shadow-lg shadow-blue-950/30">{application.businessName.split(' ').slice(0, 2).map((word) => word[0]).join('')}</div>
            <div>
              <div className="flex flex-wrap items-center gap-3"><h1 className="text-[26px] font-bold text-white">{application.businessName}</h1><span className="rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-[12px] font-bold text-blue-200">{application.status}</span></div>
              <p className="mt-1 text-[14px] text-slate-300">{application.dba} • {application.industry} • {application.entityType}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-[13px] text-slate-300"><span className="inline-flex items-center gap-1.5"><UserRound size={14} /> {application.ownerName}</span><span className="inline-flex items-center gap-1.5"><Mail size={14} /> {application.email}</span><span className="inline-flex items-center gap-1.5"><Phone size={14} /> {application.phone}</span></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton><Plus size={15} /> Add Note</ActionButton>
            <ActionButton><ClipboardCheck size={15} /> Add Task</ActionButton>
            <ActionButton><FileText size={15} /> Upload Document</ActionButton>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-[13px] font-bold text-white hover:bg-blue-500"><DollarSign size={15} /> Add Offer</button>
          </div>
        </div>
      </GlassCard>

      <div className="mb-5 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.04] p-1">
        <div className="flex min-w-max gap-1">{detailTabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`h-10 rounded-lg px-4 text-[13px] font-bold transition ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/8 hover:text-white'}`}>{tab}</button>)}</div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <GlassCard className="p-6">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-[18px] font-bold text-white">{activeTab}</h2><span className="text-[12px] text-slate-400">Assigned rep: {application.assignedRep}</span></div>
            {activeTab === 'Overview' && (
              <div className="grid gap-5 md:grid-cols-4">
                <Field label="Requested funding" value={currency.format(application.requestedFunding)} />
                <Field label="Monthly revenue" value={currency.format(application.monthlyRevenue)} />
                <Field label="Annual revenue" value={currency.format(application.annualRevenue)} />
                <Field label="Source" value={application.source} />
                <Field label="Date submitted" value={application.dateSubmitted} />
                <Field label="Last activity" value={application.lastActivity} />
                <Field label="Offer status" value={application.offerStatus} />
                <Field label="Funding partner" value={application.fundingPartner} />
              </div>
            )}
            {activeTab === 'Business Info' && <div className="grid gap-5 md:grid-cols-3"><Field label="Legal name" value={application.businessName} /><Field label="DBA" value={application.dba} /><Field label="Industry" value={application.industry} /><Field label="Entity type" value={application.entityType} /><Field label="Business start date" value={application.businessStartDate} /><Field label="Masked EIN" value="••-••••1234" /></div>}
            {activeTab === 'Owner Info' && <div className="grid gap-5 md:grid-cols-3"><Field label="Owner name" value={application.ownerName} /><Field label="Title" value={application.ownerTitle} /><Field label="Ownership" value="100%" /><Field label="Email" value={application.email} /><Field label="Phone" value={application.phone} /><Field label="Masked SSN" value="•••-••-4321" /></div>}
            {activeTab === 'Underwriting' && <div className="grid gap-5 md:grid-cols-4"><Field label="Average daily balance" value={currency.format(application.averageDailyBalance)} /><Field label="Monthly deposits" value={currency.format(application.monthlyDeposits)} /><Field label="NSFs last 90 days" value={application.nsfs} /><Field label="Current MCA balances" value={currency.format(application.currentMcaBalances)} /><Field label="Factor rate" value={application.factorRate} /><Field label="Payback amount" value={currency.format(application.paybackAmount)} /><Field label="Funding partner" value={application.fundingPartner} /><Field label="Offer status" value={application.offerStatus} /></div>}
            {activeTab === 'Documents' && <div className="grid gap-3">{documentChecklist.map((doc) => <div key={doc.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3"><span className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className={doc.status === 'complete' ? 'text-emerald-300' : 'text-slate-500'} />{doc.label}</span><span className="text-[12px] text-slate-400">{doc.count}</span></div>)}<p className="mt-2 flex items-center gap-2 text-[12px] text-slate-400"><LockKeyhole size={14} className="text-emerald-300" /> Secure private storage with encrypted uploads.</p></div>}
            {activeTab === 'Offers' && <div className="rounded-lg border border-blue-300/20 bg-blue-500/10 p-4"><p className="font-bold text-white">{application.fundingPartner} offer</p><p className="mt-2 text-sm text-slate-300">{currency.format(application.requestedFunding)} advance • {application.factorRate} factor rate • {currency.format(application.paybackAmount)} payback • {application.offerStatus}</p></div>}
            {activeTab === 'Communications' && <div className="space-y-3"><Comm icon={<Mail size={15} />} title="Offer package sent" meta="Email to applicant • 6h ago" /><Comm icon={<Phone size={15} />} title="Discovery call completed" meta="Outbound call • 1d ago" /><Comm icon={<MessageSquareText size={15} />} title="SMS reminder queued" meta="Document request • 1d ago" /></div>}
            {activeTab === 'Tasks' && <div className="space-y-3"><Task title="Follow up on missing MCA statements" due="Due in 2h" urgent /><Task title="Submit file to funding partner" due="Tomorrow" /></div>}
            {activeTab === 'Notes' && <div className="space-y-3">{application.notes.map((note) => <div key={note} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-200">{note}</div>)}</div>}
            {activeTab === 'Activity Timeline' && <ActivityList />}
          </GlassCard>

          <GlassCard className="p-6"><h2 className="text-[18px] font-bold text-white">Security & Audit Trail</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><Audit label="Access" value="Admin-only CRM route verified" /><Audit label="Documents" value="Private bucket, no public reads" /><Audit label="Sensitive data" value="SSN, EIN, routing and account values masked" /><Audit label="Activity logs" value="Status changes, uploads, notes and communications logged" /></div></GlassCard>
        </div>

        <aside className="space-y-5">
          <GlassCard className="p-5"><h3 className="text-[16px] font-bold text-white">Application Progress</h3><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-blue-600" style={{ width: `${application.progress}%` }} /></div><p className="mt-3 text-[13px] text-slate-300">{application.progress}% complete through the MCA funding workflow.</p></GlassCard>
          <GlassCard className="p-5"><h3 className="text-[16px] font-bold text-white">Quick Facts</h3><div className="mt-4 space-y-4"><Field label="Requested" value={currency.format(application.requestedFunding)} /><Field label="Monthly revenue" value={currency.format(application.monthlyRevenue)} /><Field label="Current MCA balances" value={currency.format(application.currentMcaBalances)} /><Field label="Submitted" value={application.dateSubmitted} /></div></GlassCard>
          <GlassCard className="p-5"><h3 className="text-[16px] font-bold text-white">Recent Activity</h3><ActivityList compact /></GlassCard>
        </aside>
      </div>
    </div>
  );
}

function Comm({ icon, title, meta }: { icon: React.ReactNode; title: string; meta: string }) {
  return <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600/20 text-blue-200">{icon}</span><div><p className="text-sm font-bold text-white">{title}</p><p className="text-xs text-slate-400">{meta}</p></div></div>;
}
function Task({ title, due, urgent = false }: { title: string; due: string; urgent?: boolean }) { return <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3"><span className="text-sm font-semibold text-white">{title}</span><span className={`text-xs ${urgent ? 'text-rose-300' : 'text-slate-400'}`}>{due}</span></div>; }
function Audit({ label, value }: { label: string; value: string }) { return <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3"><ShieldCheck className="mt-0.5 text-emerald-300" size={17} /><div><p className="text-sm font-bold text-white">{label}</p><p className="text-xs text-slate-400">{value}</p></div></div>; }
function ActivityList({ compact = false }: { compact?: boolean }) { return <div className={`mt-4 space-y-3 ${compact ? '' : 'max-w-3xl'}`}>{activities.slice(0, compact ? 4 : activities.length).map((activity) => { const Icon = activity.icon; return <div key={`${activity.description}-${activity.timestamp}`} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3"><Icon className="mt-0.5 text-blue-300" size={16} /><div className="flex-1"><p className="text-sm font-bold text-white">{activity.description}</p><p className="text-xs text-slate-400">{activity.business} • {activity.user}</p></div><span className="text-xs text-slate-500">{activity.timestamp}</span></div>; })}</div>; }
