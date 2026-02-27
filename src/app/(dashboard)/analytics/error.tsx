'use client'
import RouteError from '@/components/RouteError'

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Analytics unavailable"
      description="We couldn't load your analytics data. Please try again."
    />
  )
}
