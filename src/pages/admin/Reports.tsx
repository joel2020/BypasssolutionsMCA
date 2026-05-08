import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useLeads } from '../../hooks/useLeads';
import { useCommissions } from '../../hooks/useCommissions';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';
import { canonicalLeadStatuses } from '../../lib/status';

const sourceColors: Record<string, string> = {
  Website: '#0891b2',
  'Google Ads': '#0f172a',
  Referral: '#22c55e',
  Facebook: '#3b82f6',
  Instagram: '#f59e0b',
  Other: '#94a3b8',
};

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[24px] font-bold text-navy-900 mb-0.5">{value}</p>
      <p className="text-[13px] font-medium text-slate-700">{label}</p>
      {sub && <p className="text-[12px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Reports() {
  const { data: leads, loading: leadsLoading, error: leadsError } = useLeads();
  const { data: commissions, loading: commissionsLoading, error: commissionsError } = useCommissions();
  const loading = leadsLoading || commissionsLoading;
  const error = leadsError || commissionsError;

  const funded = leads.filter(l => l.status === 'Funded').length;
  const convRate = leads.length > 0 ? ((funded / leads.length) * 100).toFixed(1) : '0';
  const totalVolume = commissions.reduce((sum, c) => sum + c.funded_amount, 0);
  const totalComm = commissions.reduce((sum, c) => sum + c.commission_amount, 0);

  // Funnel data
  const funnelData = canonicalLeadStatuses
    .filter(s => !['Declined', 'Lost'].includes(s))
    .map(stage => ({
      stage: stage.replace(' ', '\n'),
      count: leads.filter(l => l.status === stage).length,
    }));

  // Source data
  const sourceCounts: Record<string, number> = {};
  leads.forEach(l => {
    const src = l.source || 'Other';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({
    name, value, color: sourceColors[name] || '#94a3b8',
  }));

  // Rep performance
  const repMap: Record<string, { leads: number; funded: number; volume: number; commission: number }> = {};
  leads.forEach(l => {
    const rep = l.assigned_rep || 'Unassigned';
    if (!repMap[rep]) repMap[rep] = { leads: 0, funded: 0, volume: 0, commission: 0 };
    repMap[rep].leads++;
    if (l.status === 'Funded') repMap[rep].funded++;
  });
  commissions.forEach(c => {
    const rep = c.rep_name;
    if (repMap[rep]) {
      repMap[rep].volume += c.funded_amount;
      repMap[rep].commission += c.commission_amount;
    }
  });
  const repPerformance = Object.entries(repMap)
    .filter(([rep]) => rep !== 'Unassigned')
    .map(([rep, data]) => ({ rep, ...data }));

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-navy-900">Reports</h1>
        <p className="text-[13px] text-slate-400">Live data from your Supabase database</p>
      </div>

      {loading ? (
        <SkeletonLoader label="Loading reports from Supabase..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : leads.length === 0 ? (
        <EmptyState title="No report data" message="Supabase returned no leads to report on." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
            <StatBox label="Total Leads" value={String(leads.length)} sub="All time" />
            <StatBox label="Funded Deals" value={String(funded)} sub={`${convRate}% conversion`} />
            <StatBox label="Funded Volume" value={totalVolume > 0 ? `$${(totalVolume / 1000).toFixed(0)}K` : '$0'} sub="Total disbursed" />
            <StatBox label="Total Commission" value={`$${totalComm.toLocaleString()}`} sub="All reps" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Funnel */}
            <div className="card p-6">
              <h3 className="text-[15px] font-semibold text-navy-900 mb-4">Pipeline Distribution</h3>
              {funnelData.every(d => d.count === 0) ? (
                <div className="flex items-center justify-center h-[220px]">
                  <p className="text-[14px] text-slate-400">No lead data yet.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={funnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="stage" tick={{ fontSize: 10, fill: '#94a3b8' }} width={100} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" name="Leads" fill="#0891b2" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Sources */}
            <div className="card p-6">
              <h3 className="text-[15px] font-semibold text-navy-900 mb-4">Lead Sources</h3>
              {sourceData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-[14px] text-slate-400">No leads yet.</p>
                </div>
              ) : (
                <div className="flex items-center">
                  <ResponsiveContainer width="55%" height={200}>
                    <PieChart>
                      <Pie data={sourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                        {sourceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2 pl-2 flex-1">
                    {sourceData.map((s) => (
                      <div key={s.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-[12px] text-slate-600 flex-1 truncate">{s.name}</span>
                        <span className="text-[12px] font-semibold text-slate-800">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rep Performance */}
          <div className="card p-6">
            <h3 className="text-[15px] font-semibold text-navy-900 mb-4">Rep Performance</h3>
            {repPerformance.length === 0 ? (
              <p className="text-[14px] text-slate-400 py-4">No rep data yet. Assign leads to reps to track performance.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {['Rep', 'Total Leads', 'Funded', 'Conv. Rate', 'Funded Volume', 'Est. Commission'].map(h => (
                        <th key={h} className="text-left text-[12px] font-semibold uppercase tracking-wider text-slate-400 pb-3 pr-6">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {repPerformance.map((rep) => (
                      <tr key={rep.rep} className="border-b border-slate-100 last:border-none">
                        <td className="py-3 pr-6">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-navy-900 flex items-center justify-center text-white text-[11px] font-bold">
                              {rep.rep.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-[14px] font-medium text-slate-800">{rep.rep}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-6 text-[14px] text-slate-700">{rep.leads}</td>
                        <td className="py-3 pr-6 text-[14px] text-slate-700">{rep.funded}</td>
                        <td className="py-3 pr-6">
                          <span className="text-[14px] font-semibold text-green-600">
                            {rep.leads > 0 ? ((rep.funded / rep.leads) * 100).toFixed(1) : '0'}%
                          </span>
                        </td>
                        <td className="py-3 pr-6 text-[14px] font-semibold text-slate-800">
                          {rep.volume > 0 ? `$${rep.volume.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 text-[14px] font-bold text-accent-600">
                          {rep.commission > 0 ? `$${rep.commission.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
