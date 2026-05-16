type LegalSimpleProps = {
  title: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
};

export default function LegalSimple({ title, intro, sections }: LegalSimpleProps) {
  return (
    <div className="pt-16 lg:pt-[72px] overflow-x-hidden">
      <section className="bg-[#0B1426] py-16">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-accent-400 mb-3">Legal</p>
          <h1 className="text-[38px] font-bold text-white tracking-tight mb-2">{title}</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-slate-400">{intro}</p>
        </div>
      </section>
      <section className="section-gap bg-white">
        <div className="max-w-[860px] mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-7">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-[18px] font-bold text-navy-900 mb-2">{section.title}</h2>
                <p className="text-[15px] leading-relaxed text-slate-600">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
