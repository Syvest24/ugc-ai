export default function CalendarLoading() {
  return (
    <div className="min-h-screen bg-gray-950 p-6 animate-pulse">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="h-8 bg-gray-800 rounded w-52" />
        <div className="h-4 bg-gray-800/60 rounded w-68" />

        {/* Month nav */}
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-800 rounded w-40" />
          <div className="flex gap-2">
            <div className="h-9 w-9 bg-gray-800 rounded-lg" />
            <div className="h-9 w-9 bg-gray-800 rounded-lg" />
          </div>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`h-${i}`} className="h-8 bg-gray-800/40 rounded" />
          ))}
          {/* Day cells */}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-900 border border-gray-800 rounded-lg p-2">
              <div className="h-4 bg-gray-800/50 rounded w-6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
