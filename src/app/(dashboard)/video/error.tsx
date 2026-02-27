'use client'
import RouteError from '@/components/RouteError'

export default function VideoError({
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
      title="Video creator error"
      description="The video creator ran into a problem. Try refreshing or start a new video project."
    />
  )
}
