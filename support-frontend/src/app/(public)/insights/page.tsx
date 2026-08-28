export default function PublicInsightsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Support System Insights</h1>
        <p className="text-gray-600">Public dashboard with KPIs coming in Step 15.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {["Total", "Pending", "In Progress", "Completed"].map((label) => (
            <div key={label} className="bg-white rounded-lg border p-6 shadow-sm">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
