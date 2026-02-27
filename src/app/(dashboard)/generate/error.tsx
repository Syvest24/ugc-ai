'use client'
import RouteError from '@/components/RouteError'

export default function GenerateError({
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
      title="Generation failed"
      description="The content generator encountered an error. Check your API key in settings and try again."
    />
  )
}
