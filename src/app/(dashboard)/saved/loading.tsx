export default function SavedLoading() {
  return (
    <div className="min-h-screen bg-gray-950 p-6 animate-pulse">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="h-8 bg-gray-800 rounded w-48" />
        <div className="h-4 bg-gray-800/60 rounded w-64" />

        {/* Filters row */}
        <div className="flex gap-3">
          <div className="h-10 bg-gray-800/50 rounded-lg w-40" />
          <div className="h-10 bg-gray-800/50 rounded-lg w-40" />
          <div className="h-10 bg-gray-800/50 rounded-lg w-48" />
        </div>

        {/* Content cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <div className="flex justify-between">
                <div className="h-5 bg-gray-800 rounded w-20" />
                <div className="h-5 bg-gray-800 rounded w-16" />
              </div>
              <div className="h-24 bg-gray-800/40 rounded-lg" />
              <div className="h-4 bg-gray-800/30 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
