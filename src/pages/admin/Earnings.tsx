import { useMemo } from 'react';
import { useCommissions } from '../../hooks/useCommissions';
import { useScope } from '../../hooks/useScope';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function Earnings() {
  const { data: commissions, loading, error } = useCommissions();
  const { restricted, repName } = useScope();

  // Reps only ever see their own earnings; admins/underwriters see the whole book.
  const rows = useMemo(
    () => (restricted ? commissions.filter((c) => (c.rep_name || '') === repName) : commissions),
    [commissions, restricted, repName],
  );

  const total = rows.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
  const paid = rows.filter((c) => c.status === 'Paid').reduce((sum, c) => sum + (c.commission_amount || 0), 0);
  const unpaid = total - paid;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-navy-900">Earnings</h1>
        <p className="text-[13px] text-slate-400">
          {restricted ? `Your earnings from funded deals` : 'Team earnings from funded deals'}
        </p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Earnings', value: currency.format(total) },
          { label: 'Paid', value: currency.format(paid) },
          { label: 'Unpaid', value: currency.format(unpaid) },
        ].map((item) => (
          <div key={item.label} className="card p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
            <p className="mt-2 text-[26px] font-bold text-navy-900">{item.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <SkeletonLoader label="Loading earnings from Supabase..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState title="No earnings yet" message="Earnings appear here once deals are funded and commissions are recorded." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Business', 'Funder', ...(restricted ? [] : ['Rep']), 'Funded Amount', 'Rate', 'Earnings', 'Date', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-[13px] font-semibold text-navy-900">{c.business_name || '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">{c.funder_name || '—'}</td>
                    {!restricted && <td className="px-4 py-3 text-[13px] text-slate-600">{c.rep_name || 'Unassigned'}</td>}
                    <td className="px-4 py-3 text-[13px] text-slate-700">{currency.format(c.funded_amount || 0)}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">{c.commission_pct ? `${c.commission_pct}%` : '—'}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-navy-900">{currency.format(c.commission_amount || 0)}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">{c.funded_date ? new Date(c.funded_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[11px] ${c.status === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{c.status}</span>
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
