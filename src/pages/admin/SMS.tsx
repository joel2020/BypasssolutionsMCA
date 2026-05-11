import { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';

const threads = [
  {
    id: 'T1', name: 'Marcus Johnson', business: 'Johnson Trucking', phone: '(555) 234-5678',
    lastMessage: 'I\'ll upload the remaining statements tonight', time: '2:14 PM', unread: 1,
    messages: [
      { from: 'rep', text: 'Hi Marcus, this is Sarah from Bypass Solution. We need your Oct–Dec bank statements to proceed with your application. Can you upload those when you get a chance?', time: '10:30 AM' },
      { from: 'client', text: 'Hi Sarah, sure thing. I\'ll get those over today.', time: '11:45 AM' },
      { from: 'rep', text: 'Perfect, thank you! You can upload them directly to your application portal. Let me know if you need the link.', time: '12:00 PM' },
      { from: 'client', text: 'I\'ll upload the remaining statements tonight', time: '2:14 PM' },
    ],
  },
  {
    id: 'T2', name: 'Elena Ramirez', business: 'Casa Elena Restaurant', phone: '(555) 345-6789',
    lastMessage: 'Can we review the offer tomorrow?', time: 'Yesterday', unread: 0,
    messages: [
      { from: 'rep', text: 'Hi Elena! Mike from Bypass Solution. Great news — we have 2 funding offer options ready for your review. I\'d love to walk you through them.', time: 'Yesterday 9:00 AM' },
      { from: 'client', text: 'That\'s exciting! Can we review the offer tomorrow?', time: 'Yesterday 3:30 PM' },
      { from: 'rep', text: 'Absolutely! I\'ll call you tomorrow morning at 10 AM. Does that work?', time: 'Yesterday 3:45 PM' },
    ],
  },
  {
    id: 'T3', name: 'Linda Thompson', business: 'Thompson E-Commerce', phone: '(555) 901-2345',
    lastMessage: 'Thanks for reaching out!', time: 'Jan 6', unread: 1,
    messages: [
      { from: 'rep', text: 'Hi Linda, this is the team at Bypass Solution. We received your funding inquiry. Would love to connect — are you available for a quick call today?', time: 'Jan 6 10:00 AM' },
      { from: 'client', text: 'Thanks for reaching out! I\'m available after 3 PM today.', time: 'Jan 6 12:30 PM' },
    ],
  },
];

export default function SMS() {
  const [threadList, setThreadList] = useState(threads);
  const [activeThreadId, setActiveThreadId] = useState(threads[0].id);
  const [message, setMessage] = useState('');
  const activeThread = threadList.find((thread) => thread.id === activeThreadId) ?? threadList[0];

  const send = () => {
    if (!message.trim()) return;
    const nextMessage = { from: 'rep', text: message.trim(), time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) };
    setThreadList((current) => current.map((thread) => thread.id === activeThread.id ? {
      ...thread,
      messages: [...thread.messages, nextMessage],
      lastMessage: nextMessage.text,
      time: nextMessage.time,
    } : thread));
    setMessage('');
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">SMS</h1>
          <p className="text-[13px] text-slate-400">Twilio integration ready</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 mb-5 flex items-center gap-3">
        <MessageSquare size={15} className="text-blue-500" />
        <p className="text-[13px] text-blue-700">SMS functionality ready for Twilio integration. Connect your Twilio account in Settings to enable sending.</p>
      </div>

      <div className="card overflow-hidden flex h-[600px]">
        {/* Thread list */}
        <div className="w-[280px] flex-shrink-0 border-r border-slate-200 overflow-y-auto">
          {threadList.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setActiveThreadId(thread.id)}
              className={`w-full text-left p-4 border-b border-slate-100 last:border-none transition-colors ${
                activeThreadId === thread.id ? 'bg-accent-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[13px] font-semibold text-slate-800">{thread.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">{thread.time}</span>
                  {thread.unread > 0 && (
                    <span className="w-4 h-4 bg-accent-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {thread.unread}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{thread.lastMessage}</p>
            </button>
          ))}
        </div>

        {/* Message view */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
            <p className="text-[14px] font-semibold text-navy-900">{activeThread.name}</p>
            <p className="text-[12px] text-slate-400">{activeThread.business} · {activeThread.phone}</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
            {activeThread.messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'rep' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                  msg.from === 'rep'
                    ? 'bg-accent-600 text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  <p className="text-[14px] leading-relaxed">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.from === 'rep' ? 'text-accent-200' : 'text-slate-400'}`}>{msg.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-md px-4 text-[14px] focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <button onClick={send} disabled={!message.trim()} className="btn-primary h-10 px-4 text-[13px] disabled:cursor-not-allowed disabled:opacity-50">
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
