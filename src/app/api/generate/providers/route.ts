import { auth } from '@/lib/auth'
import { getAvailableProviders } from '@/lib/llm'
import { apiSuccess, unauthorized } from '@/lib/api-response'

/**
 * GET /api/generate/providers — Returns available LLM providers
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return unauthorized()

  return apiSuccess({ data: getAvailableProviders() })
}
