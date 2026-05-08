import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SkeletonLoader({ label = 'Loading CRM data...' }: { label?: string }) {
  return (
    <div className="card p-8 text-center">
      <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-accent-500" />
      <p className="text-[13px] text-slate-400">{label}</p>
    </div>
  );
}

export function EmptyState({ title = 'No records found', message = 'Supabase returned no matching CRM records.' }: { title?: string; message?: string }) {
  return (
    <div className="card p-10 text-center">
      <ShieldCheck size={28} className="mx-auto mb-3 text-slate-300" />
      <p className="text-[14px] font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-[13px] text-slate-400">{message}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="card border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{message}</div>;
}

export function NotFoundState() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#071225] p-6 lg:p-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl">
        <ShieldCheck size={34} className="mx-auto mb-4 text-slate-400" />
        <h1 className="text-[22px] font-bold text-white">Application not found</h1>
        <p className="mt-2 text-[13px] text-slate-400">The requested application does not exist or you do not have access to it.</p>
        <button onClick={() => navigate('/admin/applications')} className="btn-primary mt-6">
          <ArrowLeft size={15} /> Back to applications
        </button>
      </div>
    </div>
  );
}
