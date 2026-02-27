export type LLMProvider = 'openrouter' | 'huggingface' | 'together' | 'groq' | 'mistral'

interface GenerateContentOptions {
  prompt: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

export async function generateContent(options: GenerateContentOptions): Promise<string> {
  const provider = (process.env.LLM_PROVIDER || 'openrouter') as LLMProvider
  const model = process.env.LLM_MODEL || getDefaultModel(provider)
  const apiKey = process.env.LLM_API_KEY || ''

  switch (provider) {
    case 'openrouter':
      return callOpenRouter(options, model, apiKey)
    case 'huggingface':
      return callHuggingFace(options, model, apiKey)
    case 'together':
      return callTogether(options, model, apiKey)
    case 'groq':
      return callGroq(options, model, apiKey)
    case 'mistral':
      return callMistral(options, model, apiKey)
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`)
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
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
  })
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
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { temperature: options.temperature ?? 0.8, max_new_tokens: options.maxTokens ?? 2000 },
    }),
  })
  if (!response.ok) throw new Error(`HuggingFace error: ${await response.text()}`)
  const data = await response.json()
  return Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || ''
}

async function callTogether(options: GenerateContentOptions, model: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
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
  })
  if (!response.ok) throw new Error(`Together.ai error: ${await response.text()}`)
  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function callGroq(options: GenerateContentOptions, model: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
  })
  if (!response.ok) throw new Error(`Groq error: ${await response.text()}`)
  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function callMistral(options: GenerateContentOptions, model: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
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
  })
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
  const provider = (process.env.LLM_PROVIDER || 'openrouter') as LLMProvider
  const model = process.env.LLM_MODEL || getDefaultModel(provider)
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

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: buildMessages(options),
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 2000,
      stream: true,
    }),
  })

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
