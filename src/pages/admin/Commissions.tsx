import { DollarSign } from 'lucide-react';
import { useCommissions } from '../../hooks/useCommissions';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';

const statusColor = (s: string) => {
  if (s === 'Paid') return 'bg-green-50 text-green-700';
  if (s === 'Unpaid') return 'bg-red-50 text-red-700';
  return 'bg-amber-50 text-amber-700';
};

export default function Commissions() {
  const { data: commissions, loading, error } = useCommissions();

  const total = commissions.reduce((sum, c) => sum + c.commission_amount, 0);
  const paid = commissions.filter(c => c.status === 'Paid').reduce((sum, c) => sum + c.commission_amount, 0);
  const unpaid = commissions.filter(c => c.status !== 'Paid').reduce((sum, c) => sum + c.commission_amount, 0);

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Commissions</h1>
          <p className="text-[13px] text-slate-400">Track rep earnings and funded deals</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Commissions', value: `$${total.toLocaleString()}`, color: 'bg-navy-900' },
          { label: 'Paid', value: `$${paid.toLocaleString()}`, color: 'bg-green-600' },
          { label: 'Unpaid / Pending', value: `$${unpaid.toLocaleString()}`, color: 'bg-amber-500' },
        ].map((card) => (
          <div key={card.label} className="card p-5">
            <div className={`w-9 h-9 rounded-md ${card.color} flex items-center justify-center mb-3`}>
              <DollarSign size={16} className="text-white" />
            </div>
            <p className="text-[22px] font-bold text-navy-900">{card.value}</p>
            <p className="text-[13px] text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <SkeletonLoader label="Loading commissions from Supabase..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : commissions.length === 0 ? (
        <EmptyState title="No commissions recorded" message="Supabase returned no commission records." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Lead', 'Business', 'Funder', 'Rep', 'Funded Amount', 'Commission %', 'Commission $', 'Date', 'Status'].map(h => (
                  <th key={h} className="text-left text-[12px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                  <td className="px-4 py-3 text-[13px] font-medium text-slate-800">{c.lead_name}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-600">{c.business_name}</td>
                  <td className="px-4 py-3 text-[12px] text-slate-500">{c.funder_name}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{c.rep_name}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-800">${c.funded_amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-600">{c.commission_pct}%</td>
                  <td className="px-4 py-3 text-[13px] font-bold text-accent-600">${c.commission_amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[12px] text-slate-500">{c.funded_date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-semibold ${statusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
