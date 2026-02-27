'use client'
import RouteError from '@/components/RouteError'

export default function CalendarError({
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
      title="Calendar unavailable"
      description="We couldn't load your content calendar. Please try again."
    />
  )
}
