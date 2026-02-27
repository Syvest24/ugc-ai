export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-gray-950 p-6 animate-pulse">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="h-8 bg-gray-800 rounded w-36" />
        <div className="h-4 bg-gray-800/60 rounded w-56" />

        {/* Settings sections */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="h-5 bg-gray-800 rounded w-40" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-800/60 rounded w-24" />
              <div className="h-10 bg-gray-800/40 rounded-lg" />
              <div className="h-4 bg-gray-800/60 rounded w-28" />
              <div className="h-10 bg-gray-800/40 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
