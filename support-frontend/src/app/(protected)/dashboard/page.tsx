export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-600">Project insights and analytics. Coming in Step 16.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {["Total Tickets", "Pending", "In Progress", "Completed"].map((label) => (
          <div key={label} className="bg-white rounded-lg border p-6 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
          </div>
        ))}
      </div>
    </div>
  );
}
