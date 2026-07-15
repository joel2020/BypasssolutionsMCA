import { FIELD_GROUPS } from '../../lib/leadEditFields';
import type { Profile } from '../../lib/supabase';

/**
 * Renders every editable lead field (grouped) plus the Assigned Rep dropdown.
 * Shared by the Leads "Manage" panel and the opportunity "Edit" panel so the
 * whole record is editable in both places.
 */
export default function LeadFieldsGrid({
  form,
  set,
  reps,
}: {
  form: Record<string, string>;
  set: (key: string, value: string) => void;
  reps: Profile[];
}) {
  return (
    <div className="space-y-5">
      {FIELD_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-500">{group.title}</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {group.fields.map((f) => (
              <label key={f.key} className={`block ${f.wide ? 'md:col-span-3' : ''}`}>
                <span className="text-[12px] font-semibold text-slate-600">{f.label}</span>
                {f.type === 'textarea' ? (
                  <textarea className="input-field mt-1.5 min-h-20 resize-y" value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <input
                    type={f.type === 'date' ? 'date' : 'text'}
                    inputMode={f.type === 'number' ? 'numeric' : undefined}
                    className="input-field mt-1.5"
                    value={form[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div>
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-500">Assignment</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-600">Assigned rep</span>
            <select className="select-field mt-1.5" value={form.assigned_rep ?? ''} onChange={(e) => set('assigned_rep', e.target.value)}>
              <option value="">Unassigned</option>
              {reps.map((rep) => {
                const name = rep.full_name || rep.email;
                return <option key={rep.id} value={name}>{name}</option>;
              })}
            </select>
          </label>
        </div>
      </div>

      <label className="block">
        <span className="text-[12px] font-semibold text-slate-600">Notes</span>
        <textarea className="input-field mt-1.5 min-h-20 resize-y" value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
      </label>
    </div>
  );
}
