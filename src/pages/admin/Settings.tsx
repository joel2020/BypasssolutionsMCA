import { useState } from 'react';
import { Save, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const settingsTabs = ['Organization', 'Team Members', 'Integrations', 'Automations', 'Billing'];

const integrations = [
  { name: 'Twilio', desc: 'SMS and voice calling', category: 'Communications', connected: false },
  { name: 'JustCall', desc: 'Cloud phone system', category: 'Communications', connected: false },
  { name: 'Aircall', desc: 'Business phone platform', category: 'Communications', connected: false },
  { name: 'Google Workspace', desc: 'Email and calendar sync', category: 'Productivity', connected: true },
  { name: 'Stripe', desc: 'Commission payouts', category: 'Finance', connected: false },
  { name: 'DocuSign', desc: 'Electronic contract signing', category: 'Documents', connected: false },
  { name: 'Zapier', desc: 'Workflow automation', category: 'Automation', connected: false },
];

const automationRules = [
  { name: 'New Application Submitted', trigger: 'On application submit', action: 'Notify admin via email', enabled: true },
  { name: 'Application Submitted → Confirmation', trigger: 'On application submit', action: 'Send confirmation email to applicant', enabled: true },
  { name: 'Docs Missing 24hr Reminder', trigger: 'Submitted + 24 hours', action: 'Send document reminder SMS + email', enabled: true },
  { name: 'Docs Received → Rep Alert', trigger: 'On docs received', action: 'Notify assigned rep', enabled: true },
  { name: 'Offer Sent → 1-Day Follow-up', trigger: 'Offer sent + 1 day', action: 'Create follow-up task for rep', enabled: false },
  { name: 'Offer Sent → 12hr Follow-up', trigger: 'Offer sent + 12 hours', action: 'Create urgent follow-up task', enabled: true },
  { name: 'Funded Deal → Renewal Reminder', trigger: 'Deal funded + 90 days', action: 'Create renewal outreach task', enabled: false },
  { name: 'No Contact After 3 Attempts', trigger: '3 unanswered outreach attempts', action: 'Move to nurture sequence', enabled: false },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={`flex-shrink-0 transition-colors ${enabled ? 'text-accent-600' : 'text-slate-300'}`}>
      {enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
    </button>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('Organization');
  const [automations, setAutomations] = useState(automationRules);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { profile } = useCurrentUser();
  const teamMembers = profile ? [{ name: profile.full_name, email: profile.email, role: profile.role === 'admin' ? 'Admin' : 'Rep', status: profile.status === 'active' ? 'Active' : 'Inactive' }] : [];

  const toggleAutomation = async (i: number) => {
    const next = automations.map((a, idx) => idx === i ? { ...a, enabled: !a.enabled } : a);
    setAutomations(next);
    const { error } = await supabase.from('settings').upsert({ key: 'automation_rules', value: next });
    setFeedback(error ? error.message : 'Settings saved successfully.');
  };

  const saveOrganization = async () => {
    const { error } = await supabase.from('settings').upsert({ key: 'organization_profile', value: { updated_at: new Date().toISOString() } });
    setFeedback(error ? error.message : 'Settings saved successfully.');
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-navy-900">Settings</h1>
        <p className="text-[13px] text-slate-400">Manage your organization, team, and integrations</p>
      </div>
      {feedback && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{feedback}</div>}

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-lg p-1 w-fit">
        {settingsTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${
              activeTab === tab ? 'bg-slate-100 text-navy-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Organization' && (
        <div className="card p-7 max-w-xl">
          <h2 className="text-[16px] font-semibold text-navy-900 mb-5">Organization Settings</h2>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Company Name', value: 'Bypass Solution' },
              { label: 'Website', value: 'www.bypasssolution.com' },
              { label: 'Primary Email', value: 'info@bypasssolution.com' },
              { label: 'Phone', value: '+1 (813) 648-4272' },
              { label: 'Business Hours', value: 'Mon–Fri 9:00 AM – 6:00 PM EST' },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">{field.label}</label>
                <input className="input-field" defaultValue={field.value} />
              </div>
            ))}
            <button onClick={saveOrganization} className="btn-primary self-start mt-2">
              <Save size={15} /> Save Changes
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Team Members' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[14px] text-slate-600">{teamMembers.length} team member{teamMembers.length === 1 ? '' : 's'} • {profile?.full_name || 'Current user'} is loaded from profiles</p>
            <button className="btn-primary h-9 text-[13px] px-4">
              <Plus size={14} /> Add Member
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[12px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.email} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-navy-900 flex items-center justify-center text-white text-[11px] font-bold">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-[13px] font-medium text-slate-800">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">{member.email}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[11px] ${member.role === 'Admin' ? 'bg-navy-50 text-navy-700' : 'bg-slate-100 text-slate-600'}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-green-50 text-green-700 text-[11px]">{member.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-[12px] text-red-500 hover:text-red-700 flex items-center gap-1">
                        <Trash2 size={13} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integ) => (
            <div key={integ.name} className="card p-5 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[14px] font-semibold text-navy-900">{integ.name}</p>
                  {integ.connected && <span className="badge bg-green-50 text-green-700 text-[10px]">Connected</span>}
                </div>
                <p className="text-[12px] text-slate-400">{integ.desc}</p>
                <span className="badge-default text-[10px] mt-1.5">{integ.category}</span>
              </div>
              <button className={`flex-shrink-0 h-8 px-3 text-[12px] font-medium rounded-md transition-colors ${
                integ.connected
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-accent-600 text-white hover:bg-accent-700'
              }`}>
                {integ.connected ? 'Manage' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Automations' && (
        <div className="flex flex-col gap-3 max-w-3xl">
          {automations.map((auto, i) => (
            <div key={auto.name} className="card p-5 flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-navy-900">{auto.name}</p>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  <span className="font-medium text-slate-500">Trigger:</span> {auto.trigger}
                </p>
                <p className="text-[12px] text-slate-400">
                  <span className="font-medium text-slate-500">Action:</span> {auto.action}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[12px] text-slate-400">{auto.enabled ? 'On' : 'Off'}</span>
                <Toggle enabled={auto.enabled} onChange={() => toggleAutomation(i)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Billing' && (
        <div className="card p-7 max-w-xl">
          <h2 className="text-[16px] font-semibold text-navy-900 mb-2">Billing</h2>
          <p className="text-[14px] text-slate-500 mb-5">Manage your subscription and payment information.</p>
          <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 mb-5">
            <p className="text-[13px] font-semibold text-green-800">Enterprise Plan — Active</p>
            <p className="text-[12px] text-green-600 mt-0.5">Production billing managed outside CRM</p>
          </div>
          <button className="btn-secondary">Manage Subscription</button>
        </div>
      )}
    </div>
  );
}
