export default function GenerateLoading() {
  return (
    <div className="min-h-screen bg-gray-950 p-6 animate-pulse">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="h-8 bg-gray-800 rounded w-56" />
        <div className="h-4 bg-gray-800/60 rounded w-80" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input panel */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <div className="h-5 bg-gray-800 rounded w-32" />
            <div className="h-10 bg-gray-800/50 rounded-lg" />
            <div className="h-5 bg-gray-800 rounded w-24" />
            <div className="h-10 bg-gray-800/50 rounded-lg" />
            <div className="h-5 bg-gray-800 rounded w-28" />
            <div className="h-24 bg-gray-800/50 rounded-lg" />
            <div className="h-11 bg-violet-900/30 rounded-lg" />
          </div>

          {/* Output panel */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="h-5 bg-gray-800 rounded w-36" />
            <div className="h-40 bg-gray-800/30 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
