export default function VideoLoading() {
  return (
    <div className="min-h-screen bg-gray-950 p-6 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="h-8 bg-gray-800 rounded w-44" />
        <div className="h-4 bg-gray-800/60 rounded w-72" />

        {/* Step indicator */}
        <div className="flex gap-4 items-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gray-800 rounded-full" />
              <div className="h-4 bg-gray-800 rounded w-20" />
            </div>
          ))}
        </div>

        {/* Main content area */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <div className="h-5 bg-gray-800 rounded w-36" />
          <div className="h-32 bg-gray-800/40 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-800/30 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
