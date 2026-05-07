import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Logo from '../brand/Logo';

interface UnauthorizedProps {
  message?: string;
  detail?: string;
}

export default function Unauthorized({ message = 'Unauthorized access', detail }: UnauthorizedProps) {
  return (
    <div className="min-h-screen bg-[#0B1426] flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl">
        <Logo size="md" className="justify-center mb-6" />
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <ShieldAlert size={26} className="text-red-600" />
        </div>
        <h1 className="text-[24px] font-bold text-navy-900">{message}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          {detail || 'Your account is signed in, but it is not configured with an active authorized CRM role. Contact an administrator to activate your profile.'}
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/admin" className="btn-primary justify-center">Back to Admin Login</Link>
          <Link to="/" className="btn-secondary justify-center">Return to Website</Link>
        </div>
      </div>
    </div>
  );
}
