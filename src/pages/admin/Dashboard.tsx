import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, FileText, DollarSign, CheckSquare, AlertCircle, ArrowUpRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase, type Lead, type Task } from '../../lib/supabase';
import { statusColors } from '../../data/mockData';

const monthlyData = [
  { month: 'Aug', leads: 18, funded: 4, volume: 142000 },
  { month: 'Sep', leads: 24, funded: 6, volume: 215000 },
  { month: 'Oct', leads: 31, funded: 8, volume: 289000 },
  { month: 'Nov', leads: 27, funded: 7, volume: 263000 },
  { month: 'Dec', leads: 35, funded: 10, volume: 395000 },
  { month: 'Jan', leads: 0, funded: 0, volume: 0 },
];

const sourceData = [
  { name: 'Website', value: 0 },
  { name: 'Google Ads', value: 0 },
  { name: 'Referral', value: 0 },
  { name: 'Facebook', value: 0 },
  { name: 'Instagram', value: 0 },
];

function StatCard({ label, value, sub, icon: Icon, trend, color }: {
  label: string; value: string; sub: string; icon: React.ElementType; trend?: string; color: string;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-[12px] font-semibold text-green-600">
            <ArrowUpRight size={13} />
            {trend}
          </span>
        )}
      </div>
      <p className="text-[26px] font-bold text-navy-900 leading-none mb-1">{value}</p>
      <p className="text-[13px] font-medium text-slate-700">{label}</p>
      <p className="text-[12px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: leadsData }, { data: tasksData }] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('tasks').select('*').order('due_date', { ascending: true }).limit(20),
      ]);
      if (leadsData) setLeads(leadsData as Lead[]);
      if (tasksData) setTasks(tasksData as Task[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const newToday = leads.filter(l => l.created_at?.startsWith(today)).length;
  const inProgress = leads.filter(l => ['Application Started', 'Docs Requested', 'Docs Received'].includes(l.status)).length;
  const docsReceived = leads.filter(l => l.status === 'Docs Received').length;
  const funded = leads.filter(l => l.status === 'Funded').length;
  const offersAvailable = leads.filter(l => l.status === 'Offers Available').length;
  const openTasks = tasks.filter(t => t.status !== 'Completed').length;
  const overdueTasks = tasks.filter(t => t.status !== 'Completed' && t.due_date && t.due_date < today).length;

  // Live source counts
  const liveSourceData = sourceData.map(s => ({
    ...s,
    value: leads.filter(l => l.source === s.name).length,
  }));
  const totalLeadsForSource = liveSourceData.reduce((sum, s) => sum + s.value, 0) || 1;

  // Update Jan with live count
  const chartData = [...monthlyData];
  chartData[chartData.length - 1] = {
    ...chartData[chartData.length - 1],
    leads: leads.length,
    funded,
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Welcome back</p>
          <h1 className="text-[22px] font-bold text-navy-900">Dashboard</h1>
        </div>
        <div className="text-[13px] text-slate-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-slate-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
            <StatCard label="Total Leads" value={String(leads.length)} sub="All time" icon={Users} color="bg-accent-600" />
            <StatCard label="New Today" value={String(newToday)} sub="Last 24 hours" icon={ArrowUpRight} color="bg-blue-500" />
            <StatCard label="In Progress" value={String(inProgress)} sub="Active applications" icon={FileText} color="bg-amber-500" />
            <StatCard label="Deals Funded" value={String(funded)} sub="Total funded" icon={DollarSign} color="bg-green-600" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Docs Received" value={String(docsReceived)} sub="Ready for review" icon={CheckSquare} color="bg-teal-500" />
            <StatCard label="Offers Available" value={String(offersAvailable)} sub="Awaiting response" icon={FileText} color="bg-slate-600" />
            <StatCard label="Open Tasks" value={String(openTasks)} sub="Across all leads" icon={CheckSquare} color="bg-emerald-600" />
            <StatCard label="Overdue Tasks" value={String(overdueTasks)} sub="Needs attention" icon={AlertCircle} color="bg-red-500" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-7">
            <div className="card p-6 lg:col-span-2">
              <h3 className="text-[15px] font-semibold text-navy-900 mb-1">Lead Volume & Funded Deals</h3>
              <p className="text-[12px] text-slate-400 mb-5">Aug – present</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="leads" name="Leads" fill="#0891b2" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="funded" name="Funded" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-6">
              <h3 className="text-[15px] font-semibold text-navy-900 mb-4">Lead Sources</h3>
              <div className="flex flex-col gap-3">
                {liveSourceData.map((s) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] text-slate-600">{s.name}</span>
                      <span className="text-[13px] font-semibold text-slate-700">
                        {Math.round((s.value / totalLeadsForSource) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-500 rounded-full transition-all"
                        style={{ width: `${Math.round((s.value / totalLeadsForSource) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent leads & tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-navy-900">Recent Leads</h3>
                <Link to="/admin/leads" className="text-[13px] text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1">
                  View all <ArrowRight size={13} />
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {leads.slice(0, 6).map((lead) => (
                  <div key={lead.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-none">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[12px] font-bold text-slate-600 flex-shrink-0">
                      {lead.first_name?.[0]}{lead.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-800 truncate">{lead.first_name} {lead.last_name}</p>
                      <p className="text-[12px] text-slate-400 truncate">{lead.business_name}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-semibold flex-shrink-0 ${statusColors[lead.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {lead.status}
                    </span>
                  </div>
                ))}
                {leads.length === 0 && (
                  <p className="text-[13px] text-slate-400 text-center py-4">No leads yet. Submit an application from the public site.</p>
                )}
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-navy-900">Open Tasks</h3>
                <Link to="/admin/tasks" className="text-[13px] text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1">
                  View all <ArrowRight size={13} />
                </Link>
              </div>
              {overdueTasks > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-md px-3 py-2 mb-3">
                  <AlertCircle size={14} className="text-red-500" />
                  <p className="text-[13px] text-red-600">{overdueTasks} overdue task{overdueTasks !== 1 ? 's' : ''}</p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {tasks.filter(t => t.status !== 'Completed').slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-none">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-800 truncate">{task.title}</p>
                      <p className="text-[12px] text-slate-400">Due {task.due_date || 'No date'} — {task.assigned_rep}</p>
                    </div>
                    <span className={`badge text-[11px] flex-shrink-0 ${task.priority === 'High' ? 'bg-red-50 text-red-600' : task.priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
                {tasks.filter(t => t.status !== 'Completed').length === 0 && (
                  <p className="text-[13px] text-slate-400 text-center py-4">No open tasks.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
