import { type ReactNode, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowUpRight, CircleDollarSign, ClipboardCheck, KanbanSquare, Table2, TrendingUp, Users, type LucideIcon } from 'lucide-react';
import { useLeads } from '../../hooks/useLeads';
import { useCommissions } from '../../hooks/useCommissions';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';
import { approvedStatuses, leadProgressMap, pipelineStages, type PipelineStage } from '../../lib/status';
import type { Lead } from '../../lib/supabase';

type RangeMode = 'all' | 'month' | 'last' | 'custom';

function monthBounds(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59);
  return { start, end };
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const colors = ['#2f6bff', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6', '#ef4444'];

export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.035] shadow-2xl shadow-blue-950/20 backdrop-blur ${className}`}>{children}</div>;
}

function KpiCard({ label, value, trend, icon: Icon }: { label: string; value: string; trend: string; icon: LucideIcon }) {
  return <GlassCard className="p-5"><div className="flex items-start justify-between"><div><p className="text-[13px] font-medium text-blue-100/90">{label}</p><p className="mt-2 text-[30px] font-bold tracking-tight text-white">{value}</p></div><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600/20 text-blue-300 ring-1 ring-blue-400/10"><Icon size={20} /></span></div><div className="mt-3 flex items-center gap-1.5 text-[12px]"><ArrowUpRight size={14} className="text-emerald-300" /><span className="font-semibold text-emerald-300">{trend}</span><span className="text-slate-400">live</span></div></GlassCard>;
}

function PipelineCard({ lead }: { lead: Lead }) {
  return <Link to={`/admin/leads/${lead.id}`} className="block rounded-lg border border-white/10 bg-white/[0.045] p-3 transition hover:-translate-y-0.5 hover:border-blue-300/30 hover:bg-white/[0.075]"><div className="flex items-start justify-between gap-2"><div><h4 className="text-[13px] font-bold text-white">{lead.business_name}</h4><p className="mt-1 text-[11px] text-slate-400">Owner: {lead.first_name} {lead.last_name}</p></div><span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-slate-700 text-[10px] font-bold text-blue-100">{(lead.assigned_rep || '—').slice(0, 2)}</span></div><p className="mt-2 text-[13px] font-bold text-white">{currency.format(lead.funding_amount_requested)}</p><p className="text-[11px] text-slate-300">Monthly Rev: {currency.format(lead.monthly_revenue)}</p><div className="mt-3 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${leadProgressMap[lead.status] ?? 0}%` }} /></div><span className="text-[10px] text-slate-400">{new Date(lead.created_at).toLocaleDateString()}</span></div></Link>;
}

function PipelineColumn({ stage, leads }: { stage: PipelineStage; leads: Lead[] }) {
  const stageLeads = leads.filter((lead) => stage.statuses.includes(lead.status));
  return <GlassCard className="min-w-[235px] p-3"><div className="mb-3 flex items-center justify-between"><h3 className="text-[13px] font-bold text-white">{stage.label}</h3><span className="rounded-full bg-blue-950/70 px-2 py-0.5 text-[11px] font-semibold text-blue-200">{stageLeads.length}</span></div><div className="space-y-2.5">{stageLeads.slice(0, 3).map((lead) => <PipelineCard lead={lead} key={lead.id} />)}</div>{stageLeads.length > 3 && <p className="mt-3 text-[11px] text-slate-300">+ {stageLeads.length - 3} more</p>}</GlassCard>;
}

export default function Dashboard() {
  const [volumeMode, setVolumeMode] = useState<'requested' | 'funded'>('requested');
  const [pipelineView, setPipelineView] = useState<'kanban' | 'table'>('kanban');
  const [rangeMode, setRangeMode] = useState<RangeMode>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const { data: allLeads, loading, error } = useLeads();
  const { data: allCommissions } = useCommissions();

  // "Production data" range: all time, this month, last month, or a custom window.
  const inRange = useMemo(() => {
    if (rangeMode === 'all') return () => true;
    let start: Date;
    let end: Date;
    if (rangeMode === 'month') ({ start, end } = monthBounds(0));
    else if (rangeMode === 'last') ({ start, end } = monthBounds(-1));
    else {
      if (!customFrom || !customTo) return () => true;
      start = new Date(customFrom);
      end = new Date(`${customTo}T23:59:59`);
    }
    return (iso: string) => {
      const when = new Date(iso).getTime();
      return when >= start.getTime() && when <= end.getTime();
    };
  }, [rangeMode, customFrom, customTo]);

  const leads = useMemo(() => allLeads.filter((lead) => inRange(lead.created_at)), [allLeads, inRange]);
  const commissions = useMemo(
    () => allCommissions.filter((c) => inRange((c as unknown as { funded_date?: string; created_at?: string }).funded_date || (c as unknown as { created_at?: string }).created_at || '')),
    [allCommissions, inRange],
  );

  const funded = leads.filter((lead) => lead.status === 'Funded');
  const totals = useMemo(() => ({ requested: leads.reduce((sum, lead) => sum + lead.funding_amount_requested, 0), funded: funded.reduce((sum, lead) => sum + lead.funding_amount_requested, 0) }), [funded, leads]);
  const activeApprovals = useMemo(() => leads.filter((lead) => approvedStatuses.includes(lead.status)).reduce((sum, lead) => sum + lead.funding_amount_requested, 0), [leads]);
  const totalEarnings = useMemo(() => commissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0), [commissions]);
  // Funding by rep: funded volume attributed to each rep.
  const fundingByRep = useMemo(() => {
    const totalsByRep = funded.reduce<Record<string, number>>((acc, lead) => {
      const rep = lead.assigned_rep || 'Unassigned';
      acc[rep] = (acc[rep] ?? 0) + lead.funding_amount_requested;
      return acc;
    }, {});
    return Object.entries(totalsByRep).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [funded]);
  const maxRepFunding = fundingByRep.length ? fundingByRep[0][1] : 0;
  const sourceMix = useMemo(() => Object.entries(leads.reduce<Record<string, number>>((acc, lead) => ({ ...acc, [lead.source || 'Unknown']: (acc[lead.source || 'Unknown'] ?? 0) + 1 }), {})).map(([name, value], index) => ({ name, value, color: colors[index % colors.length] })), [leads]);
  const trend = useMemo(() => [...leads].reverse().slice(-7).map((lead, index) => ({ day: new Date(lead.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), requested: Number((lead.funding_amount_requested / 1_000_000).toFixed(2)), funded: Number(((lead.status === 'Funded' ? lead.funding_amount_requested : 0) / 1_000_000).toFixed(2)) || index * 0.01 })), [leads]);

  if (loading) return <div className="min-h-screen bg-[#071225] p-6 lg:p-8"><SkeletonLoader label="Loading dashboard from Supabase..." /></div>;
  if (error) return <div className="min-h-screen bg-[#071225] p-6 lg:p-8"><ErrorState message={error} /></div>;
  if (leads.length === 0) return <div className="min-h-screen bg-[#071225] p-6 lg:p-8"><EmptyState title="No applications yet" message="Supabase did not return any leads for the CRM dashboard." /></div>;

  return <div className="min-h-screen bg-[#071225] text-white"><div className="min-w-0 p-5 lg:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-[26px] font-black tracking-tight">Business Funding Command Center</h1><p className="mt-1 text-[13px] text-slate-400">Live Supabase CRM overview</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[12px] font-bold text-emerald-200">Production data</span>
        <select value={rangeMode} onChange={(e) => setRangeMode(e.target.value as RangeMode)} className="h-9 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-[12px] font-bold text-white outline-none">
          <option className="text-slate-900" value="all">All time</option>
          <option className="text-slate-900" value="month">This month</option>
          <option className="text-slate-900" value="last">Last month</option>
          <option className="text-slate-900" value="custom">Custom range</option>
        </select>
        {rangeMode === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 rounded-lg border border-white/10 bg-white/[0.06] px-2 text-[12px] text-white outline-none" />
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 rounded-lg border border-white/10 bg-white/[0.06] px-2 text-[12px] text-white outline-none" />
          </>
        )}
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Total Leads" value={String(leads.length)} trend="Supabase" icon={Users} /><KpiCard label="Active Approvals $" value={currency.format(activeApprovals)} trend="Live" icon={CircleDollarSign} /><KpiCard label="Funded Amount" value={currency.format(totals.funded)} trend="Live" icon={TrendingUp} /><KpiCard label="Total Earnings" value={currency.format(totalEarnings)} trend="Live" icon={ClipboardCheck} /></div>
    <div className="mt-5 flex items-center justify-between"><h2 className="text-[18px] font-bold text-white">Pipeline Overview</h2><div className="rounded-lg border border-white/10 bg-white/[0.05] p-1"><button onClick={() => setPipelineView('kanban')} className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-bold ${pipelineView === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}><KanbanSquare size={14} /> Kanban</button><button onClick={() => setPipelineView('table')} className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-bold ${pipelineView === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}><Table2 size={14} /> Table</button></div></div>
    {pipelineView === 'kanban' ? <div className="mt-3 overflow-x-auto pb-1"><div className="grid min-w-[1200px] grid-cols-7 gap-3">{pipelineStages.map((stage) => <PipelineColumn stage={stage} leads={leads} key={stage.label} />)}</div></div> : <GlassCard className="mt-3 overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[900px]"><thead><tr className="border-b border-white/10 bg-white/[0.04]">{['Business', 'Owner', 'Status', 'Requested', 'Revenue', 'Rep', 'Created'].map((h) => <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>)}</tr></thead><tbody>{leads.slice(0, 12).map((lead) => <tr key={lead.id} className="border-b border-white/8 last:border-none hover:bg-white/[0.04]"><td className="px-4 py-3"><Link to={`/admin/leads/${lead.id}`} className="text-[13px] font-bold text-white hover:text-blue-200">{lead.business_name}</Link></td><td className="px-4 py-3 text-[12px] text-slate-300">{lead.first_name} {lead.last_name}</td><td className="px-4 py-3 text-[12px] text-slate-300">{lead.status}</td><td className="px-4 py-3 text-[12px] font-bold text-white">{currency.format(lead.funding_amount_requested)}</td><td className="px-4 py-3 text-[12px] text-slate-300">{currency.format(lead.monthly_revenue)}</td><td className="px-4 py-3 text-[12px] text-slate-300">{lead.assigned_rep || 'Unassigned'}</td><td className="px-4 py-3 text-[12px] text-slate-400">{new Date(lead.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div></GlassCard>}
    <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.9fr_0.72fr]"><GlassCard className="p-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-[16px] font-bold text-white">Funding Volume Trend</h3><div className="rounded-lg bg-white/[0.06] p-1"><button onClick={() => setVolumeMode('requested')} className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${volumeMode === 'requested' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>Requested</button><button onClick={() => setVolumeMode('funded')} className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${volumeMode === 'funded' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>Funded</button></div></div><ResponsiveContainer width="100%" height={190}><AreaChart data={trend}><defs><linearGradient id="volume" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#2f6bff" stopOpacity={0.5}/><stop offset="95%" stopColor="#2f6bff" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip /><Area type="monotone" dataKey={volumeMode} stroke="#3b82f6" strokeWidth={3} fill="url(#volume)" /></AreaChart></ResponsiveContainer><p className="mt-1 text-[12px] text-slate-400">Live total: {currency.format(totals[volumeMode])}</p></GlassCard><GlassCard className="p-5"><h3 className="text-[16px] font-bold text-white">Source Mix</h3><div className="mt-5 flex items-center gap-5"><ResponsiveContainer width={96} height={96}><PieChart><Pie data={sourceMix} innerRadius={31} outerRadius={48} dataKey="value" stroke="none">{sourceMix.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer><div className="flex-1">{sourceMix.map((item) => <div key={item.name} className="mt-2 flex items-center justify-between gap-2 text-[12px]"><span className="flex items-center gap-2 text-slate-300"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.name}</span><span className="font-bold text-white">{item.value}</span></div>)}</div></div></GlassCard><GlassCard className="p-5"><h3 className="text-[16px] font-bold text-white">Funding by Rep</h3><div className="mt-5 space-y-3">{fundingByRep.length === 0 ? <p className="text-[12px] text-slate-400">No funded deals in this range.</p> : fundingByRep.map(([rep, amount]) => (<div key={rep}><div className="flex items-center justify-between gap-2 text-[12px]"><span className="truncate text-slate-200">{rep}</span><span className="font-bold text-white">{currency.format(amount)}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${maxRepFunding ? Math.round((amount / maxRepFunding) * 100) : 0}%` }} /></div></div>))}</div></GlassCard></div>
    <div className="mt-5"><GlassCard className="p-5"><h3 className="text-[16px] font-bold text-white">Recent Approvals</h3><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{leads.filter((lead) => approvedStatuses.includes(lead.status) || lead.status === 'Funded').slice(0, 6).map((lead) => <PipelineCard lead={lead} key={lead.id} />)}</div></GlassCard></div>
  </div></div>;
}
