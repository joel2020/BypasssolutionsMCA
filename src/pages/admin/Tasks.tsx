import { useState } from 'react';
import { Plus, CheckCircle2, Circle } from 'lucide-react';
import { supabase, type Task } from '../../lib/supabase';
import { useTasks } from '../../hooks/useTasks';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';

function AddTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    taskType: 'Follow-up',
    assignedRep: 'Unassigned',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'Medium' as Task['priority'],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!form.title.trim()) throw new Error('Task title is required.');

      const { error: insertError } = await supabase.from('tasks').insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        task_type: form.taskType,
        assigned_rep: form.assignedRep.trim() || 'Unassigned',
        due_date: form.dueDate || null,
        priority: form.priority,
        status: 'Open',
      });

      if (insertError) throw insertError;
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-[18px] font-bold text-navy-900">Add Task</h2>
          <p className="text-[13px] text-slate-500">Create an internal CRM task.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block"><span className="text-[12px] font-semibold text-slate-600">Title</span><input required className="input-field mt-1.5" value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} /></label>
          <label className="block"><span className="text-[12px] font-semibold text-slate-600">Description</span><textarea className="input-field mt-1.5 min-h-20" value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} /></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Type</span><input className="input-field mt-1.5" value={form.taskType} onChange={(e) => setForm((current) => ({ ...current, taskType: e.target.value }))} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Assigned rep</span><input className="input-field mt-1.5" value={form.assignedRep} onChange={(e) => setForm((current) => ({ ...current, assignedRep: e.target.value }))} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Due date</span><input type="date" className="input-field mt-1.5" value={form.dueDate} onChange={(e) => setForm((current) => ({ ...current, dueDate: e.target.value }))} /></label>
            <label className="block">
              <span className="text-[12px] font-semibold text-slate-600">Priority</span>
              <select className="select-field mt-1.5" value={form.priority} onChange={(e) => setForm((current) => ({ ...current, priority: e.target.value as Task['priority'] }))}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
          </div>
          {error && <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button disabled={saving} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving...' : 'Add Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Tasks() {
  const [filterStatus, setFilterStatus] = useState('All');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const { data: tasks, loading, error, refetch } = useTasks();

  const toggle = async (task: Task) => {
    const newStatus = task.status === 'Completed' ? 'Open' : 'Completed';
    const { error: updateError } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    setFeedback(updateError ? updateError.message : 'Task saved successfully.');
    if (!updateError) await refetch();
  };

  const filtered = tasks.filter(t => filterStatus === 'All' || t.status === filterStatus);

  const priorityColor = (p: string) => {
    if (p === 'High') return 'bg-red-50 text-red-600';
    if (p === 'Medium') return 'bg-amber-50 text-amber-700';
    return 'bg-slate-100 text-slate-500';
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Tasks</h1>
          <p className="text-[13px] text-slate-400">
            {loading ? 'Loading...' : `${filtered.filter(t => t.status !== 'Completed').length} open tasks`}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary h-9 px-4 text-[13px]">
          <Plus size={14} /> Add Task
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        {['All', 'Open', 'In Progress', 'Completed'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors ${
              filterStatus === s ? 'bg-navy-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {feedback && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{feedback}</div>}

      {loading ? (
        <SkeletonLoader label="Loading tasks from Supabase..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No tasks found" message="Supabase returned no tasks matching the selected filter." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['', 'Task', 'Type', 'Rep', 'Due Date', 'Priority', 'Status'].map((h) => (
                  <th key={h} className="text-left text-[12px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr key={task.id} className={`border-b border-slate-100 last:border-none hover:bg-slate-50 ${task.status === 'Completed' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 w-10">
                    <button onClick={() => toggle(task)}>
                      {task.status === 'Completed'
                        ? <CheckCircle2 size={18} className="text-green-500" />
                        : <Circle size={18} className="text-slate-300 hover:text-slate-500" />
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className={`text-[13px] font-medium ${task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {task.title}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-default text-[11px]">{task.task_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-slate-600">{task.assigned_rep}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[13px] ${task.due_date && task.due_date < new Date().toISOString().split('T')[0] && task.status !== 'Completed' ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                      {task.due_date || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-semibold ${priorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-semibold ${
                      task.status === 'Completed' ? 'bg-green-50 text-green-700' :
                      task.status === 'In Progress' ? 'bg-blue-50 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onCreated={() => { setFeedback('Task created successfully.'); void refetch(); }} />}
    </div>
  );
}
