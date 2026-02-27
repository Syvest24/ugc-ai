'use client'
import RouteError from '@/components/RouteError'

export default function SettingsError({
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
      title="Settings unavailable"
      description="We couldn't load your settings. Please try again."
    />
  )
}
