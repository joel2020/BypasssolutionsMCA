import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

const faqs = [
  ['How fast can I get funded?', 'After a complete application and required documents are submitted, many businesses receive a review within 24–48 business hours. Actual funding timing depends on underwriting, partner review, contracts, and bank processing.'],
  ['What documents are required?', 'Most files include 3–6 months of business bank statements, a government-issued ID, a voided business check, and merchant or existing advance statements when applicable.'],
  ['Will applying affect my credit?', 'Initial review is generally designed around business information and bank statements. If a funding partner needs a hard credit inquiry, that should be disclosed before it occurs.'],
  ['What funding amounts are available?', 'Available working capital depends on revenue, deposits, business history, industry, current advances, and underwriting. Bypass Solution does not guarantee approval or a specific amount.'],
  ['Do I need perfect credit?', 'No. MCA and revenue-based funding reviews often consider business performance in addition to credit profile, but all applications remain subject to review and approval.'],
  ['What happens after I submit my application?', 'Your record is created in the internal CRM, documents are reviewed privately, an activity timeline is started, and a funding specialist follows up with next steps or document requests.'],
  ['Is my information secure?', 'The application masks sensitive identifiers, validates files, stores documents in a private bucket, and restricts internal CRM access to authorized roles.'],
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return <div className="border-b border-slate-200 last:border-0"><button className="w-full py-5 flex items-center justify-between gap-4 text-left" onClick={() => setOpen((value) => !value)}><span className="font-semibold text-navy-900">{q}</span><ChevronDown size={18} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open && <p className="pb-5 text-slate-600 leading-relaxed">{a}</p>}</div>;
}

export default function FAQ() {
  return (
    <main className="pt-16 lg:pt-[72px]">
      <section className="bg-gradient-to-b from-navy-50 to-white py-20"><div className="page-container max-w-3xl text-center"><p className="section-label mb-4">Funding FAQ</p><h1 className="text-[44px] lg:text-[60px] font-extrabold tracking-[-0.05em] text-navy-900 mb-5">Clear answers before you apply.</h1><p className="text-slate-600 text-[18px] leading-relaxed">Common questions about working capital, document review, credit, security, and what happens after submission.</p></div></section>
      <section className="pb-20"><div className="page-container max-w-3xl card p-6 lg:p-8">{faqs.map(([q, a]) => <Item key={q} q={q} a={a} />)}</div></section>
      <section className="pb-20"><div className="page-container max-w-3xl rounded-3xl bg-[#07152B] text-white p-8 lg:p-10 text-center"><h2 className="text-[30px] font-bold tracking-[-0.03em] mb-3">Still have questions?</h2><p className="text-slate-300 mb-6">Talk with a Bypass Solution funding specialist before submitting your application.</p><div className="flex flex-col sm:flex-row justify-center gap-3"><Link to="/contact" className="btn-secondary bg-white text-navy-900">Contact Us</Link><Link to="/apply" className="btn-primary">Start Application</Link></div></div></section>
    </main>
  );
}
