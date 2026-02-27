'use client'
import RouteError from '@/components/RouteError'

export default function DashboardError({
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
      title="Dashboard unavailable"
      description="We couldn't load your dashboard. Your data is safe — please try again."
    />
  )
}
