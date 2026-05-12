import { useState } from 'react';
import { Save, Plus, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { supabase, type Profile } from '../../lib/supabase';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';

const settingsTabs = ['Organization', 'Team Members', 'Integrations', 'Automations', 'Billing'];
const roles: Profile['role'][] = ['admin', 'underwriter', 'sales_rep', 'viewer'];

const integrations = [
  { name: 'Twilio', desc: 'SMS and voice calling', category: 'Communications', connected: false },
  { name: 'JustCall', desc: 'Cloud phone system', category: 'Communications', connected: false },
  { name: 'Aircall', desc: 'Business phone platform', category: 'Communications', connected: false },
  { name: 'Google Workspace', desc: 'Email and calendar sync', category: 'Productivity', connected: true, href: '/admin/email' },
  { name: 'Stripe', desc: 'Commission payouts', category: 'Finance', connected: false },
  { name: 'DocuSign', desc: 'Electronic contract signing', category: 'Documents', connected: false },
  { name: 'Zapier', desc: 'Workflow automation', category: 'Automation', connected: false },
];

const automationRules = [
  { name: 'New Application Submitted', trigger: 'On application submit', action: 'Notify admin via email', enabled: true },
  { name: 'Application Submitted -> Confirmation', trigger: 'On application submit', action: 'Send confirmation email to applicant', enabled: true },
  { name: 'Docs Missing 24hr Reminder', trigger: 'Submitted + 24 hours', action: 'Send document reminder SMS + email', enabled: true },
  { name: 'Docs Received -> Rep Alert', trigger: 'On docs received', action: 'Notify assigned rep', enabled: true },
  { name: 'Offer Sent -> 1-Day Follow-up', trigger: 'Offer sent + 1 day', action: 'Create follow-up task for rep', enabled: false },
  { name: 'Offer Sent -> 12hr Follow-up', trigger: 'Offer sent + 12 hours', action: 'Create urgent follow-up task', enabled: true },
  { name: 'Funded Deal -> Renewal Reminder', trigger: 'Deal funded + 90 days', action: 'Create renewal outreach task', enabled: false },
  { name: 'No Contact After 3 Attempts', trigger: '3 unanswered outreach attempts', action: 'Move to nurture sequence', enabled: false },
];

function roleLabel(role: string) {
  return role.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className={`flex-shrink-0 transition-colors ${enabled ? 'text-accent-600' : 'text-slate-300'}`}>
      {enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
    </button>
  );
}

function AddTeamMemberModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ fullName: '', email: '', role: 'sales_rep' as Profile['role'] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const origin = window.location.origin;
      const { data, error: invokeError } = await supabase.functions.invoke('invite-team-member', {
        body: {
          full_name: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          redirect_to: `${origin}/admin`,
        },
      });

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add team member.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-[18px] font-bold text-navy-900">Add Team Member</h2>
            <p className="text-[13px] text-slate-500">Invite a user and create their CRM profile.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <label className="block"><span className="text-[12px] font-semibold text-slate-600">Full name</span><input required className="input-field mt-1.5" value={form.fullName} onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))} /></label>
          <label className="block"><span className="text-[12px] font-semibold text-slate-600">Email</span><input required type="email" className="input-field mt-1.5" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} /></label>
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-600">Role</span>
            <select className="select-field mt-1.5" value={form.role} onChange={(e) => setForm((current) => ({ ...current, role: e.target.value as Profile['role'] }))}>
              {roles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
            </select>
          </label>
          {error && <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button disabled={saving} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Sending invite...' : 'Send Invite'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('Organization');
  const [automations, setAutomations] = useState(automationRules);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const { profile } = useCurrentUser();
  const isAdmin = profile?.role === 'admin' && profile.status === 'active';
  const { data: profiles, loading: profilesLoading, error: profilesError, refetch: refetchProfiles } = useSupabaseQuery<Profile[]>(async () => {
    const { data, error } = await supabase.from('profiles').select('id,full_name,email,role,status').order('full_name');
    if (error) throw error;
    return (data ?? []) as Profile[];
  }, [], [isAdmin]);

  const teamMembers = profiles.length > 0 ? profiles : profile ? [profile] : [];

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

  const setMemberStatus = async (member: Profile, status: Profile['status']) => {
    if (member.id === profile?.id && status !== 'active') {
      setFeedback('You cannot disable your own profile.');
      return;
    }
    const { error } = await supabase.from('profiles').update({ status }).eq('id', member.id);
    setFeedback(error ? error.message : `Team member ${status === 'active' ? 'activated' : 'disabled'}.`);
    if (!error) await refetchProfiles();
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-navy-900">Settings</h1>
        <p className="text-[13px] text-slate-400">Manage your organization, team, and integrations</p>
      </div>
      {feedback && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{feedback}</div>}
      {profilesError && activeTab === 'Team Members' && <div className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">{profilesError}</div>}

      <div className="mb-6 flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {settingsTabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-md px-4 py-2 text-[13px] font-medium transition-colors ${activeTab === tab ? 'bg-slate-100 text-navy-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Organization' && (
        <div className="card max-w-xl p-7">
          <h2 className="mb-5 text-[16px] font-semibold text-navy-900">Organization Settings</h2>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Company Name', value: 'Bypass Solution' },
              { label: 'Website', value: 'www.bypasssolution.com' },
              { label: 'Primary Email', value: 'info@bypasssolution.com' },
              { label: 'Phone', value: '+1 (813) 324-6359' },
              { label: 'Fax', value: '+1 (813) 324-6360' },
              { label: 'Business Hours', value: 'Mon-Fri 9:00 AM - 6:00 PM EST' },
            ].map((field) => (
              <div key={field.label}>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">{field.label}</label>
                <input className="input-field" defaultValue={field.value} />
              </div>
            ))}
            <button onClick={saveOrganization} className="btn-primary mt-2 self-start"><Save size={15} /> Save Changes</button>
          </div>
        </div>
      )}

      {activeTab === 'Team Members' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[14px] text-slate-600">{profilesLoading ? 'Loading team members...' : `${teamMembers.length} team member${teamMembers.length === 1 ? '' : 's'} loaded from profiles`}</p>
            <button disabled={!isAdmin} onClick={() => setShowAddMember(true)} className="btn-primary h-9 px-4 text-[13px] disabled:cursor-not-allowed disabled:opacity-50" title={isAdmin ? 'Invite a team member.' : 'Only active admins can add team members.'}>
              <Plus size={14} /> Add Member
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Name', 'Email', 'Role', 'Status', 'Actions'].map((h) => <th key={h} className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-slate-400">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-[11px] font-bold text-white">
                          {(member.full_name || member.email).split(/[ @.]+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[13px] font-medium text-slate-800">{member.full_name || 'Unnamed user'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">{member.email}</td>
                    <td className="px-4 py-3"><span className={`badge text-[11px] ${member.role === 'admin' ? 'bg-navy-50 text-navy-700' : 'bg-slate-100 text-slate-600'}`}>{roleLabel(member.role)}</span></td>
                    <td className="px-4 py-3"><span className={`badge text-[11px] ${member.status === 'active' ? 'bg-green-50 text-green-700' : member.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{roleLabel(member.status)}</span></td>
                    <td className="px-4 py-3">
                      {member.status === 'active' ? (
                        <button disabled={!isAdmin || member.id === profile?.id} onClick={() => void setMemberStatus(member, 'disabled')} className="flex items-center gap-1 text-[12px] text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40">
                          <Trash2 size={13} /> Disable
                        </button>
                      ) : (
                        <button disabled={!isAdmin} onClick={() => void setMemberStatus(member, 'active')} className="text-[12px] font-semibold text-accent-600 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-40">Activate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showAddMember && <AddTeamMemberModal onClose={() => setShowAddMember(false)} onCreated={() => { setFeedback('Team invite sent and profile created.'); void refetchProfiles(); }} />}
        </div>
      )}

      {activeTab === 'Integrations' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integ) => (
            <div key={integ.name} className="card flex items-start justify-between gap-3 p-5">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-navy-900">{integ.name}</p>
                  {integ.connected && <span className="badge bg-green-50 text-green-700 text-[10px]">Connected</span>}
                </div>
                <p className="text-[12px] text-slate-400">{integ.desc}</p>
                <span className="badge-default mt-1.5 text-[10px]">{integ.category}</span>
              </div>
              {integ.href ? (
                <button onClick={() => window.location.assign(integ.href!)} className="h-8 flex-shrink-0 rounded-md bg-slate-100 px-3 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-200">Manage</button>
              ) : (
                <button disabled title="Integration setup is not configured yet." className="h-8 flex-shrink-0 cursor-not-allowed rounded-md bg-slate-100 px-3 text-[12px] font-medium text-slate-400">Connect</button>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Automations' && (
        <div className="flex max-w-3xl flex-col gap-3">
          {automations.map((auto, i) => (
            <div key={auto.name} className="card flex items-start justify-between gap-4 p-5">
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-navy-900">{auto.name}</p>
                <p className="mt-0.5 text-[12px] text-slate-400"><span className="font-medium text-slate-500">Trigger:</span> {auto.trigger}</p>
                <p className="text-[12px] text-slate-400"><span className="font-medium text-slate-500">Action:</span> {auto.action}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2"><span className="text-[12px] text-slate-400">{auto.enabled ? 'On' : 'Off'}</span><Toggle enabled={auto.enabled} onChange={() => toggleAutomation(i)} /></div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Billing' && (
        <div className="card max-w-xl p-7">
          <h2 className="mb-2 text-[16px] font-semibold text-navy-900">Billing</h2>
          <p className="mb-5 text-[14px] text-slate-500">Manage your subscription and payment information.</p>
          <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-[13px] font-semibold text-green-800">Enterprise Plan - Active</p>
            <p className="mt-0.5 text-[12px] text-green-600">Production billing managed outside CRM</p>
          </div>
          <button disabled title="Billing is managed outside the CRM." className="btn-secondary cursor-not-allowed opacity-60">Manage Subscription</button>
        </div>
      )}
    </div>
  );
}
