import { EmptyState } from '../../components/admin/States';

export default function SMS() {
  return (
    <div className="p-6 lg:p-8">
      <h1 className="mb-6 text-xl font-bold text-navy-900">SMS</h1>
      <EmptyState title="SMS is not connected" message="Text messaging is unavailable until your administrator connects a messaging provider and sending number. No messages can be sent from this page yet." />
    </div>
  );
}
