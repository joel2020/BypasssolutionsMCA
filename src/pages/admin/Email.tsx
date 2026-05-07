import { useState } from 'react';
import { Send, Copy } from 'lucide-react';

const templates = [
  {
    id: 'T1',
    name: 'Initial Follow-Up',
    subject: 'Thanks for your interest — Bypass Solution',
    body: `Hi {{first_name}},

Thank you for submitting your inquiry to Bypass Solution. My name is [Rep Name], and I'll be your dedicated funding specialist.

I'd love to learn more about your business and the funding you're looking to explore. Would you be available for a brief 10-minute call this week?

Please reply to this email or call me directly at [Phone].

Best regards,
[Rep Name]
Bypass Solution`,
  },
  {
    id: 'T2',
    name: 'Document Request',
    subject: 'Documents Needed — {{business_name}} Application',
    body: `Hi {{first_name}},

Thank you for submitting your application with Bypass Solution. To move forward with your review, we'll need the following documents:

• 3–6 months of business bank statements (PDF preferred)
• Voided business check
• Government-issued photo ID
• Business license or incorporation documents (if available)

You can upload these securely through your application portal: [Upload Link]

If you have any questions, I'm happy to help. Please don't hesitate to reach out.

Best regards,
[Rep Name]
Bypass Solution`,
  },
  {
    id: 'T3',
    name: 'Offer Available',
    subject: 'Funding Offer Ready for Review — {{business_name}}',
    body: `Hi {{first_name}},

Great news — I've had a chance to review your application and I have funding offer options available for {{business_name}}.

I'd like to walk you through the available options and answer any questions you may have. The offers include important details about funding amounts, terms, and repayment structure that I want to make sure you fully understand before making any decisions.

Would you be available for a call this week? I can be reached at [Phone].

Please note: All funding is subject to final review and approval. Review all terms carefully before accepting any offer.

Best regards,
[Rep Name]
Bypass Solution`,
  },
  {
    id: 'T4',
    name: 'Contract Reminder',
    subject: 'Action Required — Contract Signature for {{business_name}}',
    body: `Hi {{first_name}},

I wanted to follow up on the funding contract we sent over for {{business_name}}. We're waiting on your signature to move forward and get your funds disbursed.

If you have any questions about the contract or terms, I'm happy to walk you through everything.

Please review the contract carefully and let me know if you need anything clarified.

Best regards,
[Rep Name]
Bypass Solution`,
  },
  {
    id: 'T5',
    name: 'Renewal Outreach',
    subject: 'Renewal Funding Available — {{business_name}}',
    body: `Hi {{first_name}},

Congratulations on completing your previous funding! Based on your repayment history, {{business_name}} may now be eligible for renewal funding.

I'd love to discuss what options might be available for your next round of capital. Renewal clients often qualify for improved terms.

Would you be open to a quick call to explore your options? I'm available [days/times].

Best regards,
[Rep Name]
Bypass Solution`,
  },
];

const emailHistory = [
  { to: 'marcus@johnsontruck.com', lead: 'Marcus Johnson', subject: 'Documents Needed — Johnson Trucking Application', date: '2024-01-04', status: 'Delivered', template: 'Document Request' },
  { to: 'elena@casaelena.com', lead: 'Elena Ramirez', subject: 'Funding Offer Ready for Review — Casa Elena Restaurant', date: '2024-01-05', status: 'Opened', template: 'Offer Available' },
  { to: 'priya@patelpharma.com', lead: 'Priya Patel', subject: 'Action Required — Contract Signature for Patel Family Pharmacy', date: '2024-01-05', status: 'Clicked', template: 'Contract Reminder' },
  { to: 'linda@thompsoneco.com', lead: 'Linda Thompson', subject: 'Thanks for your interest — Bypass Solution', date: '2024-01-06', status: 'Sent', template: 'Initial Follow-Up' },
];

export default function Email() {
  const [selected, setSelected] = useState(templates[0]);
  const [copied, setCopied] = useState(false);

  const copyTemplate = () => {
    navigator.clipboard.writeText(selected.body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const statusColor = (s: string) => {
    if (s === 'Clicked') return 'bg-green-50 text-green-700';
    if (s === 'Opened') return 'bg-blue-50 text-blue-700';
    if (s === 'Delivered') return 'bg-teal-50 text-teal-700';
    return 'bg-slate-100 text-slate-500';
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Email</h1>
          <p className="text-[13px] text-slate-400">Templates and activity</p>
        </div>
        <button className="btn-primary h-9 text-[13px] px-4">
          <Send size={14} /> Compose Email
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Templates */}
        <div>
          <h2 className="text-[15px] font-semibold text-navy-900 mb-3">Email Templates</h2>
          <div className="flex flex-col gap-2.5">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`text-left card p-4 transition-all ${selected.id === t.id ? 'border-accent-400 bg-accent-50' : 'hover:border-slate-300'}`}
              >
                <p className="text-[13px] font-semibold text-navy-900">{t.name}</p>
                <p className="text-[12px] text-slate-400 mt-0.5 truncate">{t.subject}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-navy-900">Preview: {selected.name}</h2>
            <button onClick={copyTemplate} className="btn-secondary h-8 text-[12px] px-3 gap-1.5">
              <Copy size={13} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="card p-5">
            <div className="mb-3 pb-3 border-b border-slate-100">
              <p className="text-[12px] text-slate-400 mb-0.5">Subject:</p>
              <p className="text-[13px] font-medium text-slate-800">{selected.subject}</p>
            </div>
            <pre className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">{selected.body}</pre>
          </div>
        </div>
      </div>

      {/* Email history */}
      <h2 className="text-[15px] font-semibold text-navy-900 mb-3">Recent Email Activity</h2>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Lead', 'To', 'Subject', 'Template', 'Date', 'Status'].map(h => (
                <th key={h} className="text-left text-[12px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {emailHistory.map((email, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="text-[13px] font-medium text-slate-800">{email.lead}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-[12px] text-slate-500">{email.to}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-[13px] text-slate-700 max-w-[200px] truncate">{email.subject}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="badge-default text-[11px]">{email.template}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[12px] text-slate-500">{email.date}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-semibold ${statusColor(email.status)}`}>
                    {email.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
