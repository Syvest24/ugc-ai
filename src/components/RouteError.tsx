'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface RouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  description?: string
}

export default function RouteError({
  error,
  reset,
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
}: RouteErrorProps) {
  useEffect(() => {
    console.error('[RouteError]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="text-sm text-gray-400">{description}</p>
        </div>

        {process.env.NODE_ENV === 'development' && error.message && (
          <pre className="text-xs text-red-300 bg-red-950/30 border border-red-900/50 rounded-lg p-3 text-left overflow-auto max-h-32">
            {error.message}
          </pre>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="text-xs text-gray-600">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
