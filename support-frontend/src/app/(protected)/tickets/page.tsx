export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">All Tickets</h1>
        <a
          href="/tickets/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700"
        >
          New Ticket
        </a>
      </div>
      <p className="text-gray-600">Ticket list with filters coming in Step 8.</p>
      <div className="bg-white rounded-lg border shadow-sm p-8 text-center text-gray-500">
        No tickets yet. Create your first ticket to get started.
      </div>
    </div>
  );
}
