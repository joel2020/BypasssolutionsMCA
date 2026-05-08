import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Circle, LockKeyhole, Table2, KanbanSquare, ArrowUpRight } from 'lucide-react';
import {
  activities, crmApplications, documentChecklist, fundingTrend, kpis, pipelineStages, sourceMix,
  type CrmApplication, type PipelineStage,
} from '../../data/crmData';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.035] shadow-2xl shadow-blue-950/20 backdrop-blur ${className}`}>{children}</div>;
}

function KpiCard({ item, wide = false }: { item: typeof kpis[number]; wide?: boolean }) {
  const Icon = item.icon;
  return (
    <GlassCard className={`p-5 ${wide ? 'min-h-[128px]' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-blue-100/90">{item.label}</p>
          <p className="mt-2 text-[30px] font-bold tracking-tight text-white">{item.value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600/20 text-blue-300 ring-1 ring-blue-400/10"><Icon size={20} /></span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[12px]"><ArrowUpRight size={14} className="text-emerald-300" /><span className="font-semibold text-emerald-300">{item.trend}</span><span className="text-slate-400">vs last 30 days</span></div>
    </GlassCard>
  );
}

function PipelineCard({ app }: { app: CrmApplication }) {
  return (
    <Link to={`/admin/leads/${app.id}`} className="block rounded-lg border border-white/10 bg-white/[0.045] p-3 transition hover:-translate-y-0.5 hover:border-blue-300/30 hover:bg-white/[0.075]">
      <div className="flex items-start justify-between gap-2">
        <div><h4 className="text-[13px] font-bold text-white">{app.businessName}</h4><p className="mt-1 text-[11px] text-slate-400">Owner: {app.ownerName}</p></div>
        <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-slate-700 text-[10px] font-bold text-blue-100">{app.assignedRep}</span>
      </div>
      <p className="mt-2 text-[13px] font-bold text-white">{currency.format(app.requestedFunding)}</p>
      <p className="text-[11px] text-slate-300">Monthly Rev: {currency.format(app.monthlyRevenue)}</p>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${app.progress}%` }} /></div>
        <span className="text-[10px] text-slate-400">{app.lastActivity}</span>
      </div>
    </Link>
  );
}

function PipelineColumn({ stage }: { stage: PipelineStage }) {
  const apps = crmApplications.filter((app) => app.status === stage).slice(0, 3);
  const counts: Record<PipelineStage, number> = { New: 125, Submitted: 86, 'In Review': 96, Underwriting: 152, Approved: 67, 'Offer Sent': 43, Funded: 143, Declined: 18, Withdrawn: 9 };
  return (
    <GlassCard className="min-w-[235px] p-3">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-[13px] font-bold text-white">{stage}</h3><span className="rounded-full bg-blue-950/70 px-2 py-0.5 text-[11px] font-semibold text-blue-200">{counts[stage]}</span></div>
      <div className="space-y-2.5">{apps.map((app) => <PipelineCard app={app} key={app.id} />)}</div>
      <p className="mt-3 text-[11px] text-slate-300">+ {Math.max(counts[stage] - apps.length, 0)} more</p>
    </GlassCard>
  );
}

function ActivityFeed() {
  return (
    <GlassCard className="p-4 xl:sticky xl:top-6">
      <h2 className="px-1 text-[16px] font-bold text-white">Activity Feed</h2>
      <div className="mt-5 space-y-0">
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <div key={`${activity.description}-${index}`} className="relative grid grid-cols-[34px_1fr] gap-3 pb-5 last:pb-0">
              {index < activities.length - 1 && <span className="absolute left-[16px] top-9 h-[calc(100%-34px)] w-px bg-blue-400/20" />}
              <span className={`z-10 grid h-8 w-8 place-items-center rounded-full ${activity.urgent ? 'bg-rose-500/80' : 'bg-blue-600'} text-white ring-4 ring-[#07152c]`}><Icon size={15} /></span>
              <div className="border-b border-white/8 pb-4 last:border-0">
                <div className="flex items-start justify-between gap-2"><p className="text-[13px] font-bold text-white">{activity.description}</p><span className={`text-[11px] ${activity.urgent ? 'text-rose-300' : 'text-slate-400'}`}>{activity.timestamp}</span></div>
                <p className="mt-1 text-[12px] text-blue-100">{activity.business}</p><p className="text-[12px] text-slate-400">by {activity.user}</p>
              </div>
            </div>
          );
        })}
      </div>
      <button className="mt-4 h-10 w-full rounded-lg border border-white/10 bg-white/[0.06] text-[13px] font-semibold text-white hover:bg-white/10">View All Activity</button>
    </GlassCard>
  );
}

export default function Dashboard() {
  const [volumeMode, setVolumeMode] = useState<'requested' | 'funded'>('requested');
  const totals = useMemo(() => crmApplications.reduce((acc, app) => ({ requested: acc.requested + app.requestedFunding, funded: acc.funded + (app.status === 'Funded' ? app.requestedFunding : 0) }), { requested: 0, funded: 0 }), []);

  return (
    <div className="p-5 lg:p-8">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-5"><h1 className="text-[24px] font-bold text-white">Dashboard</h1><p className="mt-1 text-[14px] text-slate-300">Welcome back, Michael. Here’s what’s happening with your pipeline today.</p></div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{kpis.slice(0, 5).map((item) => <KpiCard item={item} key={item.label} />)}</div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <GlassCard className="grid gap-0 sm:grid-cols-3 p-0 overflow-hidden">
              {kpis.slice(5).map((item, index) => <div key={item.label} className={`p-5 ${index ? 'border-t sm:border-l sm:border-t-0 border-white/10' : ''}`}><KpiCard item={item} wide /></div>)}
            </GlassCard>
            <GlassCard className="p-5">
              <div className="flex items-center gap-5"><ResponsiveContainer width={96} height={96}><PieChart><Pie data={sourceMix} innerRadius={31} outerRadius={48} dataKey="value" stroke="none">{sourceMix.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer><div className="flex-1"><h3 className="text-[14px] font-bold text-white">Applications by Source</h3>{sourceMix.map((item) => <div key={item.name} className="mt-2 flex items-center justify-between gap-2 text-[12px]"><span className="flex items-center gap-2 text-slate-300"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.name}</span><span className="font-bold text-white">{item.value}%</span></div>)}</div></div>
            </GlassCard>
          </div>

          <div className="mt-5 flex items-center justify-between"><h2 className="text-[18px] font-bold text-white">Pipeline Overview</h2><div className="rounded-lg border border-white/10 bg-white/[0.05] p-1"><button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[12px] font-bold text-white"><KanbanSquare size={14} /> Kanban</button><button className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-bold text-slate-400"><Table2 size={14} /> Table</button></div></div>
          <div className="mt-3 overflow-x-auto pb-1"><div className="grid min-w-[1430px] grid-cols-6 gap-3">{pipelineStages.map((stage) => <PipelineColumn stage={stage} key={stage} />)}</div></div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.9fr_0.72fr]">
            <GlassCard className="p-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-[16px] font-bold text-white">Funding Volume Trend</h3><div className="rounded-lg bg-white/[0.06] p-1"><button onClick={() => setVolumeMode('requested')} className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${volumeMode === 'requested' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>Requested</button><button onClick={() => setVolumeMode('funded')} className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${volumeMode === 'funded' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>Funded</button></div></div><ResponsiveContainer width="100%" height={190}><AreaChart data={fundingTrend}><defs><linearGradient id="volume" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#2f6bff" stopOpacity={0.5}/><stop offset="95%" stopColor="#2f6bff" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => `$${value}M`} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#081631', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, color: 'white' }} formatter={(value) => [`$${value}M`, volumeMode]} /><Area type="monotone" dataKey={volumeMode} stroke="#3b82f6" strokeWidth={3} fill="url(#volume)" /></AreaChart></ResponsiveContainer><p className="mt-1 text-[12px] text-slate-400">Live sample total: {currency.format(totals[volumeMode])}</p></GlassCard>

            <GlassCard className="p-5"><h3 className="text-[16px] font-bold text-white">Underwriting Snapshot</h3><div className="mt-5 grid grid-cols-2 gap-4 text-sm"><Metric label="Avg. Daily Balance" value="$18,750" /><Metric label="Monthly Deposits" value="$562,300" /><Metric label="NSFs (90 Days)" value="3" /><Metric label="Current MCA Balances" value="$245,000" /><Metric label="Factor Rate (Avg.)" value="1.27" /><Metric label="Payback Amount (Avg.)" value="$155,300" /><Metric label="Funding Partner" value="OnDeck" /><Metric label="Offer Status" value="Active" green /></div></GlassCard>

            <GlassCard className="p-5"><h3 className="text-[16px] font-bold text-white">Document Uploads</h3><div className="mt-5 flex items-center gap-5"><div className="relative grid h-28 w-28 place-items-center rounded-full bg conic-gradient"><svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90"><circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="12" /><circle cx="60" cy="60" r="48" fill="none" stroke="#2f6bff" strokeLinecap="round" strokeWidth="12" strokeDasharray="277 302" /></svg><div className="text-center"><p className="text-2xl font-bold text-white">92%</p><p className="text-[11px] text-slate-300">Complete</p></div></div><div className="flex-1 space-y-2">{documentChecklist.map((doc) => <div key={doc.label} className="flex items-center justify-between gap-2 text-[12px]"><span className="flex items-center gap-2 text-slate-200">{doc.status === 'complete' ? <CheckCircle2 size={13} className="text-emerald-300" /> : <Circle size={13} className="text-slate-500" />}{doc.label}</span><span className="text-slate-300">{doc.count}</span></div>)}</div></div><p className="mt-5 flex items-center gap-2 text-[12px] text-slate-300"><LockKeyhole size={13} className="text-emerald-300" /> All documents are securely encrypted</p></GlassCard>
          </div>
        </div>
        <ActivityFeed />
      </div>
    </div>
  );
}

function Metric({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return <div className="border-l border-white/10 pl-3"><p className="text-[11px] text-slate-400">{label}</p><p className={`mt-1 text-[18px] font-bold ${green ? 'inline-flex rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-sm text-emerald-300' : 'text-white'}`}>{value}</p></div>;
}
