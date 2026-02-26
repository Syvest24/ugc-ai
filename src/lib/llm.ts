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
    case 'openrouter': return 'mistralai/mistral-7b-instruct:free'
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
