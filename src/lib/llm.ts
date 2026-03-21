export type LLMProvider = 'openrouter' | 'huggingface' | 'together' | 'groq' | 'mistral'

const LLM_FETCH_TIMEOUT = 30_000 // 30 seconds
const LLM_MAX_RETRIES = 3
const LLM_INITIAL_BACKOFF = 1000 // 1 second

interface GenerateContentOptions {
  prompt: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  /** Optional per-request provider override */
  providerOverride?: LLMProvider
  /** Optional per-request model override */
  modelOverride?: string
}

/**
 * Fetch with timeout using AbortController.
 */
function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

/**
 * Call a single LLM provider with retry + exponential backoff.
 */
async function callWithRetry(
  fn: () => Promise<string>,
  providerName: string,
  retries = LLM_MAX_RETRIES,
): Promise<string> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = LLM_INITIAL_BACKOFF * Math.pow(2, attempt - 1)
        console.log(`[LLM] ${providerName} retry ${attempt + 1}/${retries} after ${delay}ms`)
        await new Promise(r => setTimeout(r, delay))
      }
      const result = await fn()
      if (!result || result.trim().length === 0) {
        throw new Error(`${providerName} returned empty response`)
      }
      return result
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`[LLM] ${providerName} attempt ${attempt + 1} failed: ${lastError.message}`)
    }
  }
  throw lastError || new Error(`${providerName} failed after ${retries} attempts`)
}

/**
 * Build an ordered fallback chain of available providers.
 * Primary provider first, then others that have API keys configured.
 */
function getFallbackChain(primary: LLMProvider): LLMProvider[] {
  const keyMap: Record<LLMProvider, string | undefined> = {
    openrouter: process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY,
    groq: process.env.GROQ_API_KEY,
    together: process.env.TOGETHER_API_KEY || process.env.LLM_API_KEY,
    huggingface: process.env.HUGGINGFACE_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
  }
  const order: LLMProvider[] = ['openrouter', 'groq', 'together', 'huggingface', 'mistral']
  const available = order.filter(p => p !== primary && !!keyMap[p])
  return [primary, ...available]
}

export async function generateContent(options: GenerateContentOptions): Promise<string> {
  const primary = (options.providerOverride || process.env.LLM_PROVIDER || 'openrouter') as LLMProvider
  const chain = getFallbackChain(primary)

  for (const provider of chain) {
    const model = provider === primary
      ? (options.modelOverride || process.env.LLM_MODEL || getDefaultModel(provider))
      : getDefaultModel(provider)
    const apiKey = getApiKey(provider)
    if (!apiKey) continue

    try {
      return await callWithRetry(
        () => callProvider(provider, options, model, apiKey),
        provider,
      )
    } catch (err) {
      console.warn(`[LLM] Provider ${provider} exhausted, trying next...`, (err as Error).message)
    }
  }

  throw new Error('All LLM providers failed. Check your API keys and network connectivity.')
}

function getApiKey(provider: LLMProvider): string {
  switch (provider) {
    case 'openrouter': return process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY || ''
    case 'groq': return process.env.GROQ_API_KEY || ''
    case 'together': return process.env.TOGETHER_API_KEY || process.env.LLM_API_KEY || ''
    case 'huggingface': return process.env.HUGGINGFACE_API_KEY || ''
    case 'mistral': return process.env.MISTRAL_API_KEY || ''
    default: return ''
  }
}

function callProvider(provider: LLMProvider, options: GenerateContentOptions, model: string, apiKey: string): Promise<string> {
  switch (provider) {
    case 'openrouter': return callOpenRouter(options, model, apiKey)
    case 'huggingface': return callHuggingFace(options, model, apiKey)
    case 'together': return callTogether(options, model, apiKey)
    case 'groq': return callGroq(options, model, apiKey)
    case 'mistral': return callMistral(options, model, apiKey)
    default: throw new Error(`Unsupported LLM provider: ${provider}`)
  }
}

function getDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case 'openrouter': return 'nvidia/nemotron-nano-9b-v2:free'
    case 'huggingface': return 'mistralai/Mistral-7B-Instruct-v0.2'
    case 'together': return 'mistralai/Mistral-7B-Instruct-v0.2'
    case 'groq': return 'llama3-8b-8192'
    case 'mistral': return 'mistral-small-latest'
    default: return 'mistralai/mistral-7b-instruct:free'
  }
}

async function callOpenRouter(options: GenerateContentOptions, model: string, apiKey: string): Promise<string> {
  const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        { role: 'user', content: options.prompt }
      ],
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 2000,
    }),
  }, LLM_FETCH_TIMEOUT)
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter error: ${err}`)
  }
  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function callHuggingFace(options: GenerateContentOptions, model: string, apiKey: string): Promise<string> {
  const prompt = options.systemPrompt
    ? `${options.systemPrompt}\n\n${options.prompt}`
    : options.prompt
  const response = await fetchWithTimeout(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { temperature: options.temperature ?? 0.8, max_new_tokens: options.maxTokens ?? 2000 },
    }),
  }, LLM_FETCH_TIMEOUT)
  if (!response.ok) throw new Error(`HuggingFace error: ${await response.text()}`)
  const data = await response.json()
  return Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || ''
}

async function callTogether(options: GenerateContentOptions, model: string, apiKey: string): Promise<string> {
  const response = await fetchWithTimeout('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        { role: 'user', content: options.prompt }
      ],
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 2000,
    }),
  }, LLM_FETCH_TIMEOUT)
  if (!response.ok) throw new Error(`Together.ai error: ${await response.text()}`)
  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function callGroq(options: GenerateContentOptions, model: string, apiKey: string): Promise<string> {
  const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        { role: 'user', content: options.prompt }
      ],
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 2000,
    }),
  }, LLM_FETCH_TIMEOUT)
  if (!response.ok) throw new Error(`Groq error: ${await response.text()}`)
  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function callMistral(options: GenerateContentOptions, model: string, apiKey: string): Promise<string> {
  const response = await fetchWithTimeout('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        { role: 'user', content: options.prompt }
      ],
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 2000,
    }),
  }, LLM_FETCH_TIMEOUT)
  if (!response.ok) throw new Error(`Mistral error: ${await response.text()}`)
  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

// ---------------------------------------------------------------------------
// Streaming variant — returns an async generator yielding text chunks
// ---------------------------------------------------------------------------

function buildMessages(options: GenerateContentOptions) {
  return [
    ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
    { role: 'user' as const, content: options.prompt },
  ]
}

function getProviderStreamUrl(provider: LLMProvider): string {
  switch (provider) {
    case 'openrouter': return 'https://openrouter.ai/api/v1/chat/completions'
    case 'together': return 'https://api.together.xyz/v1/chat/completions'
    case 'groq': return 'https://api.groq.com/openai/v1/chat/completions'
    case 'mistral': return 'https://api.mistral.ai/v1/chat/completions'
    default: return ''
  }
}

/**
 * Stream content from an OpenAI-compatible LLM provider.
 * Yields text delta strings as they arrive.
 * HuggingFace doesn't support streaming, so it falls back to a single yield.
 */
export async function* generateContentStream(
  options: GenerateContentOptions
): AsyncGenerator<string, void, undefined> {
  const provider = (options.providerOverride || process.env.LLM_PROVIDER || 'openrouter') as LLMProvider
  const model = options.modelOverride || process.env.LLM_MODEL || getDefaultModel(provider)
  const apiKey = process.env.LLM_API_KEY || ''

  // HuggingFace doesn't support SSE-style streaming — fall back
  if (provider === 'huggingface') {
    const result = await callHuggingFace(options, model, apiKey)
    yield result
    return
  }

  const url = getProviderStreamUrl(provider)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  }

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: buildMessages(options),
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 2000,
      stream: true,
    }),
  }, LLM_FETCH_TIMEOUT * 3) // Stream timeout is 3x normal (90s) since we need to read the full response

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`${provider} stream error: ${err}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const payload = trimmed.slice(6)
      if (payload === '[DONE]') return

      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // skip malformed JSON lines
      }
    }
  }
}

/**
 * Returns a list of LLM providers with their availability status.
 * A provider is "available" if its API key is configured in the environment.
 */
export function getAvailableProviders(): Array<{
  id: LLMProvider
  name: string
  available: boolean
  defaultModel: string
  description: string
}> {
  return [
    {
      id: 'openrouter',
      name: 'OpenRouter',
      available: !!process.env.LLM_API_KEY || !!process.env.OPENROUTER_API_KEY,
      defaultModel: 'nvidia/nemotron-nano-9b-v2:free',
      description: 'Access 100+ models including free tiers',
    },
    {
      id: 'groq',
      name: 'Groq',
      available: !!process.env.GROQ_API_KEY,
      defaultModel: 'llama3-8b-8192',
      description: 'Ultra-fast inference with Llama 3',
    },
    {
      id: 'together',
      name: 'Together.ai',
      available: !!process.env.TOGETHER_API_KEY,
      defaultModel: 'mistralai/Mistral-7B-Instruct-v0.2',
      description: 'Open-source models, free tier available',
    },
    {
      id: 'huggingface',
      name: 'HuggingFace',
      available: !!process.env.HUGGINGFACE_API_KEY,
      defaultModel: 'mistralai/Mistral-7B-Instruct-v0.2',
      description: 'Free inference API for open-source models',
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      available: !!process.env.MISTRAL_API_KEY,
      defaultModel: 'mistral-small-latest',
      description: 'Mistral\'s native models',
    },
  ]
}
