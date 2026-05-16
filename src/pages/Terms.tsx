export default function Terms() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: 'By accessing or using the Elite Funding Solutions website (www.elitefundingsolution.com) and its services, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our website or services.',
    },
    {
      title: '2. Description of Services',
      content: 'Elite Funding Solutions is a business funding marketplace. We connect business owners with funding partners who may offer revenue-based funding, working capital, equipment and expansion capital, and other business financing products. Elite Funding Solutions is not a lender and does not make lending decisions.',
    },
    {
      title: '3. No Guarantee of Funding',
      content: 'Submitting an application through Elite Funding Solutions does not guarantee that you will receive funding. All funding is subject to review and approval by individual funding partners. Not all applicants will qualify. Funding amounts, terms, and rates may vary based on business performance, creditworthiness, time in business, and other factors determined by funding partners.',
    },
    {
      title: '4. Accuracy of Information',
      content: 'You agree to provide accurate, current, and complete information when submitting an application or otherwise using our services. Providing false or misleading information is a violation of these terms and may result in disqualification from funding consideration. You represent that you are authorized to submit information on behalf of the business.',
    },
    {
      title: '5. Authorization to Contact',
      content: 'By submitting an application or contact form, you authorize Elite Funding Solutions and its funding partners to contact you via phone, email, or text message regarding your application and available funding options. Standard messaging and data rates may apply. You may opt out of communications at any time.',
    },
    {
      title: '6. Credit Authorization',
      content: 'By submitting an application, you authorize Elite Funding Solutions and its funding partners to perform credit inquiries as necessary to review your application. Our initial review may involve a soft inquiry. Funding partners may perform hard credit inquiries during their underwriting process, which may affect your credit score.',
    },
    {
      title: '7. Not Financial Advice',
      content: 'Nothing on this website constitutes financial, legal, or tax advice. The information provided is for general informational purposes only. You should consult with qualified professionals before making any financial decisions. Review all funding terms carefully and independently before accepting any offer.',
    },
    {
      title: '8. Third-Party Funding Partners',
      content: 'Elite Funding Solutions works with third-party funding partners. We are not responsible for the actions, terms, practices, or conduct of funding partners. Each funding relationship is governed by the agreement between you and the individual funding partner. Review all agreements thoroughly before signing.',
    },
    {
      title: '9. Intellectual Property',
      content: 'All content on this website, including text, graphics, logos, and software, is the property of Elite Funding Solutions or its content suppliers and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without express written permission.',
    },
    {
      title: '10. Limitation of Liability',
      content: 'To the maximum extent permitted by law, Elite Funding Solutions shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services or inability to obtain funding. Our total liability shall not exceed the amount paid by you to Elite Funding Solutions, if any.',
    },
    {
      title: '11. Indemnification',
      content: 'You agree to indemnify and hold harmless Elite Funding Solutions, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of our services, violation of these terms, or infringement of any third-party rights.',
    },
    {
      title: '12. Privacy',
      content: 'Your use of our services is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy at www.www.elitefundingsolution.com/privacy.',
    },
    {
      title: '13. Governing Law',
      content: 'These Terms of Use shall be governed by and construed in accordance with the laws of the United States. Any disputes arising from these terms or your use of our services shall be resolved through binding arbitration, except where prohibited by law.',
    },
    {
      title: '14. Changes to Terms',
      content: 'We reserve the right to modify these Terms of Use at any time. Changes will be effective upon posting to our website. Your continued use of our services after changes indicates your acceptance of the updated terms.',
    },
    {
      title: '15. Contact',
      content: 'Questions about these Terms of Use should be directed to: info@elitefundingsolution.com',
    },
  ];

  return (
    <div className="pt-16 lg:pt-[72px]">
      <section className="bg-[#0B1426] py-16">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-accent-400 mb-3">Legal</p>
          <h1 className="text-[38px] font-bold text-white tracking-tight mb-2">Terms of Use</h1>
          <p className="text-slate-400 text-[15px]">Last updated: January 1, 2025</p>
        </div>
      </section>

      <section className="section-gap bg-white">
        <div className="max-w-[860px] mx-auto px-6 lg:px-8">
          <div className="bg-amber-50 border border-amber-200 rounded-md px-5 py-4 mb-10">
            <p className="text-[14px] text-amber-700">
              Please read these Terms of Use carefully before using Elite Funding Solutions's services. These terms govern your use of our website and platform.
            </p>
          </div>

          <div className="flex flex-col gap-7">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-[18px] font-bold text-navy-900 mb-2">{section.title}</h2>
                <p className="text-[15px] text-slate-600 leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
