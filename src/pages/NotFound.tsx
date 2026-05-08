import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#020a18] text-white grid place-items-center px-6">
      <div className="max-w-lg text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-blue-300/20 bg-blue-600/15 text-blue-200">
          <ShieldAlert size={30} />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-blue-300">404</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-4 text-slate-300">The requested Bypass Solution page does not exist or you may not have access to it.</p>
        <Link to="/" className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-500">
          <ArrowLeft size={16} /> Back to home
        </Link>
      </div>
    </main>
  );
}
