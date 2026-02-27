'use client'
import RouteError from '@/components/RouteError'

export default function SavedError({
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
      title="Couldn't load saved content"
      description="There was a problem loading your saved content. Your data is safe — please try again."
    />
  )
}
