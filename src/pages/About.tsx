import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, LockKeyhole, ShieldCheck, Users } from 'lucide-react';

const principles = [
  'Transparent review process with no guarantee language or pressure tactics',
  'Business-first underwriting that looks at revenue momentum and operating context',
  'Secure document intake with private applicant file access for authorized CRM users',
  'Human support for business owners navigating working capital options',
];

export default function About() {
  return (
    <main className="pt-16 lg:pt-[72px]">
      <section className="relative overflow-hidden bg-[#07152B] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(47,140,255,0.32),transparent_35%)]" />
        <div className="relative max-w-[1200px] mx-auto px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-[1.1fr_.9fr] gap-12 items-center">
          <div>
            <p className="text-accent-300 text-[12px] font-bold uppercase tracking-[0.18em] mb-5">About Elite Funding Solutions</p>
            <h1 className="text-[44px] lg:text-[68px] leading-[1.02] font-extrabold tracking-[-0.05em] mb-6">Working capital built around business momentum.</h1>
            <p className="text-slate-300 text-[18px] leading-relaxed max-w-2xl">Elite Funding Solutions helps established business owners prepare, submit, and review working capital options through a process designed to feel secure, responsive, and professional from first application to final funding decision.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3"><Link to="/funding-fit-check" className="btn-primary">Check Funding Fit <ArrowRight size={16} /></Link><Link to="/apply" className="btn-secondary bg-white/10 border-white/15 text-white hover:bg-white/15">Apply Securely</Link></div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="grid grid-cols-2 gap-4">
              {[['Fast review', 'After documents are submitted'], ['Private files', 'No public document exposure'], ['Human support', 'Specialist-led process'], ['Flexible options', 'Multiple funding paths']].map(([title, text]) => (
                <div key={title} className="rounded-2xl bg-white/[0.07] border border-white/10 p-5"><p className="text-white font-semibold">{title}</p><p className="mt-2 text-[13px] text-slate-300 leading-relaxed">{text}</p></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-gap bg-white">
        <div className="page-container grid lg:grid-cols-3 gap-6">
          {[{ icon: Building2, title: 'Fintech-grade intake', text: 'A premium funding application that collects the operational details underwriters need without storing full SSNs or full bank account numbers in the browser flow.' }, { icon: Users, title: 'Operator-minded support', text: 'Business owners get a clear review process, realistic next steps, and a specialist who can explain available funding options without aggressive sales language.' }, { icon: LockKeyhole, title: 'Private CRM workflow', text: 'Internal teams use role-based access, document checklists, communications, tasks, offers, partner submissions, and activity timelines.' }].map((item) => (
            <article key={item.title} className="card-hover p-7"><div className="w-11 h-11 rounded-xl bg-navy-900 flex items-center justify-center mb-5"><item.icon size={19} className="text-accent-300" /></div><h2 className="text-[20px] font-bold text-navy-900 mb-3">{item.title}</h2><p className="text-slate-600 leading-relaxed">{item.text}</p></article>
          ))}
        </div>
      </section>

      <section className="section-gap bg-slate-50">
        <div className="page-container grid lg:grid-cols-[.8fr_1.2fr] gap-12 items-start">
          <div><p className="section-label mb-3">Operating principles</p><h2 className="text-[36px] font-bold tracking-[-0.035em] text-navy-900">Serious funding support without payday-loan aesthetics.</h2><p className="mt-5 text-slate-600 leading-relaxed">The brand is intentionally modern, measured, and compliance-aware: deep navy, royal blue, graphite, strong spacing, polished cards, and clear disclosures.</p></div>
          <div className="card p-7 space-y-4">{principles.map((principle) => <div key={principle} className="flex gap-3"><CheckCircle2 size={18} className="text-accent-600 mt-0.5 flex-shrink-0" /><p className="text-slate-700">{principle}</p></div>)}</div>
        </div>
      </section>

      <section className="py-16 bg-[#07152B] text-white">
        <div className="page-container flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"><div><p className="text-accent-300 text-[12px] uppercase tracking-[0.16em] font-bold mb-3">Ready when you are</p><h2 className="text-[34px] font-bold tracking-[-0.03em]">Move your business forward with smarter working capital.</h2></div><Link to="/funding-fit-check" className="btn-primary">Check Funding Fit <ShieldCheck size={16} /></Link></div>
      </section>
    </main>
  );
}
