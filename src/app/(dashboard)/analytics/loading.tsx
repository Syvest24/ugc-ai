export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-gray-950 p-6 animate-pulse">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="h-8 bg-gray-800 rounded w-40" />
        <div className="h-4 bg-gray-800/60 rounded w-64" />

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <div className="h-4 bg-gray-800 rounded w-28" />
              <div className="h-8 bg-gray-800 rounded w-14" />
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="h-5 bg-gray-800 rounded w-44" />
            <div className="h-48 bg-gray-800/30 rounded-lg" />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="h-5 bg-gray-800 rounded w-36" />
            <div className="h-48 bg-gray-800/30 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
