export default function Privacy() {
  const sections = [
    {
      title: '1. Information We Collect',
      content: `We collect information you provide directly to us when you submit a funding application, contact us, or otherwise interact with our platform. This includes:

Business information: business name, DBA, industry, state, time in business, and monthly revenue.

Personal information: name, email address, phone number, and ownership percentage.

Financial information: monthly bank deposits, average daily balance, and uploaded bank statements.

Documents: bank statements, voided checks, government-issued identification, and business documents.

We may also collect information automatically when you use our website, including IP address, browser type, device information, and pages visited.`,
    },
    {
      title: '2. How We Use Your Information',
      content: `We use the information we collect to:

Process and review your funding application.

Connect you with funding partners in our network who may offer business financing options.

Communicate with you about your application, available offers, and related matters.

Respond to your inquiries and provide customer support.

Improve our services and website.

Comply with applicable laws and regulations.

We do not use your information for purposes unrelated to business funding services without your consent.`,
    },
    {
      title: '3. Information Sharing',
      content: `Elite Funding Solutions shares your information with funding partners and lenders in our network for the purpose of reviewing your funding application. We do not sell your personal information to third-party marketers.

We may share information with:

Funding partners and lenders: to process your application and present funding options.

Service providers: third parties who assist us in operating our platform, including data hosting, document management, and communication services.

Legal authorities: when required by law, regulation, or legal process.

Business transfers: in connection with a merger, acquisition, or sale of assets.

Any third parties we share information with are required to maintain appropriate security measures and may not use your information for purposes beyond the services they provide to us.`,
    },
    {
      title: '4. Data Security',
      content: `We implement industry-standard security measures to protect your information, including:

256-bit SSL encryption for data transmission.

Secure document storage with access controls.

Regular security assessments and monitoring.

However, no method of transmission over the internet or electronic storage is completely secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.`,
    },
    {
      title: '5. Credit Inquiries',
      content: `As part of the application review process, Elite Funding Solutions or its funding partners may perform credit inquiries. Our initial review process typically involves a soft credit inquiry, which does not affect your credit score. Some funding partners may perform hard credit inquiries as part of their underwriting process, which may affect your credit score. You will be notified before any hard credit inquiry is performed.`,
    },
    {
      title: '6. Data Retention',
      content: `We retain your information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. If you would like to request deletion of your information, please contact us at info@elitefundingsolution.com. Note that some information may need to be retained for compliance or legal purposes.`,
    },
    {
      title: '7. Your Rights',
      content: `Depending on your location, you may have rights regarding your personal information, including:

The right to access information we hold about you.

The right to correct inaccurate information.

The right to request deletion of your information.

The right to opt out of certain communications.

To exercise any of these rights, please contact us at info@elitefundingsolution.com.`,
    },
    {
      title: '8. Cookies and Tracking',
      content: `We use cookies and similar tracking technologies to improve your experience on our website. Cookies help us remember your preferences, analyze usage patterns, and improve our services. You can control cookie settings through your browser settings. Disabling cookies may affect certain functionality of our website.`,
    },
    {
      title: '9. Third-Party Links',
      content: `Our website may contain links to third-party websites. We are not responsible for the privacy practices of those websites. We encourage you to review the privacy policies of any third-party sites you visit.`,
    },
    {
      title: '10. Changes to This Policy',
      content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the date at the top of this page or through other appropriate means. Your continued use of our services after any changes indicates your acceptance of the updated policy.`,
    },
    {
      title: '11. Contact Us',
      content: `If you have questions or concerns about this Privacy Policy or our data practices, please contact us:

Email: info@elitefundingsolution.com
Website: www.elitefundingsolution.com

We will respond to your inquiry within a reasonable timeframe.`,
    },
  ];

  return (
    <div className="pt-16 lg:pt-[72px]">
      <section className="bg-[#0B1426] py-16">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-accent-400 mb-3">Legal</p>
          <h1 className="text-[38px] font-bold text-white tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-slate-400 text-[15px]">Last updated: January 1, 2025</p>
        </div>
      </section>

      <section className="section-gap bg-white">
        <div className="max-w-[860px] mx-auto px-6 lg:px-8">
          <div className="bg-blue-50 border border-blue-200 rounded-md px-5 py-4 mb-10">
            <p className="text-[14px] text-blue-700">
              Elite Funding Solutions is committed to protecting your privacy. This policy explains how we collect, use, and protect information submitted through our platform.
            </p>
          </div>

          <div className="flex flex-col gap-8">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-[18px] font-bold text-navy-900 mb-3">{section.title}</h2>
                <div className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
