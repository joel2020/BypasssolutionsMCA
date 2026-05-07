import { Phone, PhoneMissed, PhoneCall, Plus } from 'lucide-react';

const callQueue = [
  { id: 'Q1', name: 'Linda Thompson', business: 'Thompson E-Commerce', phone: '(555) 901-2345', priority: 'High', reason: 'Initial outreach — new lead' },
  { id: 'Q2', name: 'Anthony Brown', business: "Brown's Wholesale", phone: '(555) 890-1234', priority: 'Medium', reason: 'Follow up on doc request' },
  { id: 'Q3', name: 'Robert Davis', business: 'Davis Concrete', phone: '(555) 012-3456', priority: 'Low', reason: 'Client requested call back Fri' },
];

const callHistory = [
  { id: 'C1', name: 'Marcus Johnson', business: 'Johnson Trucking', phone: '(555) 234-5678', rep: 'Sarah K.', date: '2024-01-05 2:14 PM', duration: '4:32', disposition: 'Connected', notes: 'Discussed bank statement upload. Client will submit by EOD.' },
  { id: 'C2', name: 'Elena Ramirez', business: 'Casa Elena Restaurant', phone: '(555) 345-6789', rep: 'Mike T.', date: '2024-01-05 11:30 AM', duration: '7:15', disposition: 'Connected', notes: 'Walked through offer options. Client is reviewing. Follow up tomorrow.' },
  { id: 'C3', name: 'Marcus Johnson', business: 'Johnson Trucking', phone: '(555) 234-5678', rep: 'Sarah K.', date: '2024-01-04 10:00 AM', duration: '0:00', disposition: 'No Answer', notes: 'Left voicemail. Will try again tomorrow.' },
  { id: 'C4', name: 'Robert Davis', business: 'Davis Concrete', phone: '(555) 012-3456', rep: 'Mike T.', date: '2024-01-04 3:00 PM', duration: '2:10', disposition: 'Voicemail', notes: 'Left detailed voicemail about funding options.' },
  { id: 'C5', name: 'Sophia Martinez', business: 'Bloom Wellness Studio', phone: '(555) 789-0123', rep: 'Tom R.', date: '2024-01-03 1:00 PM', duration: '5:45', disposition: 'Connected', notes: 'Client needs renovation funding. Sent application link.' },
];

const dispositionIcon = (d: string) => {
  if (d === 'Connected') return <PhoneCall size={14} className="text-green-500" />;
  if (d === 'No Answer') return <PhoneMissed size={14} className="text-slate-400" />;
  return <Phone size={14} className="text-amber-500" />;
};

const dispositionBadge = (d: string) => {
  if (d === 'Connected') return 'bg-green-50 text-green-700';
  if (d === 'No Answer') return 'bg-slate-100 text-slate-500';
  if (d === 'Voicemail') return 'bg-amber-50 text-amber-700';
  return 'bg-blue-50 text-blue-700';
};

export default function Calls() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Calls</h1>
          <p className="text-[13px] text-slate-400">Dialer-ready interface — Twilio/JustCall integration pending</p>
        </div>
        <button className="btn-primary h-9 text-[13px] px-4">
          <Plus size={14} /> Log Call
        </button>
      </div>

      {/* Integration notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-4 mb-6 flex items-start gap-3">
        <Phone size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[14px] font-semibold text-blue-800">Dialer Integration Ready</p>
          <p className="text-[13px] text-blue-700">This interface is pre-wired for Twilio, Aircall, or JustCall. Connect your dialer account in Settings to enable click-to-call functionality.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call queue */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-navy-900">Call Queue</h2>
            <span className="badge-default text-[11px]">{callQueue.length} pending</span>
          </div>
          <div className="flex flex-col gap-3">
            {callQueue.map((call) => (
              <div key={call.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800">{call.name}</p>
                    <p className="text-[11px] text-slate-400">{call.business}</p>
                  </div>
                  <span className={`badge text-[10px] ${call.priority === 'High' ? 'bg-red-50 text-red-600' : call.priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {call.priority}
                  </span>
                </div>
                <p className="text-[12px] text-slate-500 mb-3">{call.reason}</p>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-md text-[12px] font-medium hover:bg-green-600 transition-colors">
                    <Phone size={12} /> Call Now
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md text-[12px] font-medium hover:bg-slate-200 transition-colors">
                    Reschedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call history */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-navy-900">Call History</h2>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Lead', 'Phone', 'Disposition', 'Duration', 'Rep', 'Date', 'Notes'].map(h => (
                    <th key={h} className="text-left text-[12px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {callHistory.map((call) => (
                  <tr key={call.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-medium text-slate-800">{call.name}</p>
                      <p className="text-[11px] text-slate-400">{call.business}</p>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`tel:${call.phone}`} className="text-[13px] text-accent-600 hover:underline whitespace-nowrap">{call.phone}</a>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-semibold ${dispositionBadge(call.disposition)}`}>
                        {dispositionIcon(call.disposition)}
                        {call.disposition}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-slate-600">{call.duration}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-slate-600">{call.rep}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-slate-400 whitespace-nowrap">{call.date.split(' ')[0]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] text-slate-500 max-w-[180px] truncate">{call.notes}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
