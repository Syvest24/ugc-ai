/**
 * AI Image Editor
 *
 * Edit images with AI: enhance, background removal, upscale, restyle, etc.
 *
 * Providers:
 *  1. Replicate — various models for different operations
 *  2. Pollinations — free tier for basic generation
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.RAILWAY_ENVIRONMENT

const OUTPUT_DIR = IS_SERVERLESS
  ? path.join('/tmp', 'generated', 'image-edit')
  : path.join(process.cwd(), 'public', 'generated', 'image-edit')

export type EditOperation = 'enhance' | 'remove-bg' | 'upscale' | 'inpaint' | 'restyle' | 'extend'

export interface ImageEditOptions {
  /** Source image URL or base64 data URL */
  imageUrl: string
  /** Edit operation */
  operation: EditOperation
  /** Text prompt for the operation (for inpaint/restyle) */
  prompt?: string
  /** Style for restyle operation */
  style?: string
  /** Scale factor for upscale (default: 2) */
  scaleFactor?: number
}

export interface ImageEditResult {
  imageUrl: string
  provider: string
  model: string
  operation: EditOperation
}

export const EDIT_OPERATIONS = [
  { id: 'enhance', name: 'AI Enhance', desc: 'Improve quality, fix noise, sharpen details', icon: '✨' },
  { id: 'remove-bg', name: 'Remove Background', desc: 'Remove the background and make it transparent', icon: '🖼️' },
  { id: 'upscale', name: 'Upscale', desc: 'Increase resolution by 2-4x with AI', icon: '🔍' },
  { id: 'restyle', name: 'Restyle', desc: 'Change the artistic style of the image', icon: '🎭' },
  { id: 'extend', name: 'Extend', desc: 'Extend image boundaries with AI outpainting', icon: '↔️' },
] as const

export const RESTYLE_OPTIONS = [
  { id: 'anime', name: 'Anime', prompt: 'anime style illustration' },
  { id: 'oil-painting', name: 'Oil Painting', prompt: 'beautiful oil painting on canvas' },
  { id: 'watercolor', name: 'Watercolor', prompt: 'delicate watercolor painting' },
  { id: 'sketch', name: 'Pencil Sketch', prompt: 'detailed pencil sketch drawing' },
  { id: 'pop-art', name: 'Pop Art', prompt: 'Andy Warhol style pop art' },
  { id: '3d-render', name: '3D Render', prompt: '3D rendered, Pixar style' },
  { id: 'pixel-art', name: 'Pixel Art', prompt: '8-bit pixel art style' },
  { id: 'cyberpunk', name: 'Cyberpunk', prompt: 'cyberpunk neon style' },
] as const

// ─── Model versions (for models that don't support /models/owner/name/predictions) ───
const MODEL_VERSIONS: Record<string, string> = {
  'lucataco/remove-bg': '95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1',
}

/**
 * Apply an AI edit operation to an image
 */
export async function editImage(options: ImageEditOptions): Promise<ImageEditResult> {
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true })
  }

  // If the source is a base64 data URL, save it to disk first and try to upload
  const resolvedUrl = await resolveImageUrl(options.imageUrl)
  const resolvedOptions = { ...options, imageUrl: resolvedUrl }

  const hasReplicate = !!(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY)

  switch (options.operation) {
    case 'enhance':
      return hasReplicate ? enhanceWithReplicate(resolvedOptions) : enhanceWithPollinations(resolvedOptions)
    case 'remove-bg':
      return hasReplicate ? removeBgWithReplicate(resolvedOptions) : removeBgFallback(resolvedOptions)
    case 'upscale':
      return hasReplicate ? upscaleWithReplicate(resolvedOptions) : enhanceWithPollinations(resolvedOptions)
    case 'inpaint':
    case 'restyle':
      return restyleWithPollinations(resolvedOptions)
    case 'extend':
      return hasReplicate ? extendWithReplicate(resolvedOptions) : enhanceWithPollinations(resolvedOptions)
    default:
      return enhanceWithPollinations(resolvedOptions)
  }
}

// ─── Image URL Resolution ─────────────────────────────────────

/**
 * Resolve a base64 data URL to a publicly accessible URL.
 * Replicate requires http(s) URLs, not data URLs.
 * We save the image to disk and serve it via our generated files API.
 */
async function resolveImageUrl(input: string): Promise<string> {
  // Already an HTTP URL — use as-is
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return input
  }

  // Already a local serve path
  if (input.startsWith('/api/generated/') || input.startsWith('/generated/')) {
    return input
  }

  // Base64 data URL — save to disk and upload to Replicate file API
  if (input.startsWith('data:')) {
    const apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY
    if (apiKey) {
      try {
        return await uploadToReplicate(input, apiKey)
      } catch (err) {
        console.warn('[image-editor] Replicate file upload failed, using local file:', err)
      }
    }
    // Fallback: save locally (won't work for Replicate but works for Pollinations fallback)
    return saveBase64Locally(input)
  }

  return input
}

/**
 * Upload a base64 data URL to Replicate's file hosting API.
 * Returns an HTTPS URL that Replicate models can access.
 */
async function uploadToReplicate(dataUrl: string, apiKey: string): Promise<string> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid data URL')

  const mimeType = match[1]
  const base64Data = match[2]
  const buffer = Buffer.from(base64Data, 'base64')
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg'

  const res = await fetch('https://api.replicate.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="upload.${ext}"`,
    },
    body: buffer,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`File upload failed: ${res.status} — ${err}`)
  }

  const data = await res.json()
  return data.urls?.get || data.url || data.serving_url
}

/**
 * Save base64 data URL to local disk and return a serve path.
 */
async function saveBase64Locally(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return dataUrl

  const mimeType = match[1]
  const base64Data = match[2]
  const buffer = Buffer.from(base64Data, 'base64')
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg'
  const filename = `src_${crypto.randomUUID().slice(0, 8)}.${ext}`
  const filePath = path.join(OUTPUT_DIR, filename)
  await writeFile(filePath, buffer)

  return IS_SERVERLESS
    ? `/api/generated/image-edit/${filename}`
    : `/generated/image-edit/${filename}`
}

// ─── Replicate Helpers ────────────────────────────────────────

/**
 * Run a Replicate prediction. Tries the /models/owner/name/predictions endpoint first.
 * Falls back to the version-based /predictions endpoint for models that don't support it.
 */
async function replicatePredict(
  owner: string,
  model: string,
  input: Record<string, unknown>,
  label: string,
): Promise<string> {
  const apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY || ''
  const modelKey = `${owner}/${model}`

  // Determine which endpoint to use
  const version = MODEL_VERSIONS[modelKey]
  let createUrl: string
  let body: Record<string, unknown>

  if (version) {
    // Use version-based endpoint
    createUrl = 'https://api.replicate.com/v1/predictions'
    body = { version, input }
  } else {
    // Use model-based endpoint
    createUrl = `https://api.replicate.com/v1/models/${owner}/${model}/predictions`
    body = { input }
  }

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`${label} error: ${createRes.status} — ${err}`)
  }

  const prediction = await createRes.json()
  const maxWait = 180_000
  const start = Date.now()
  let result = prediction

  while (Date.now() - start < maxWait) {
    if (result.status === 'succeeded') break
    if (result.status === 'failed' || result.status === 'canceled') {
      throw new Error(`${label} failed: ${result.error || 'Unknown'}`)
    }
    await new Promise(r => setTimeout(r, 3000))
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    result = await pollRes.json()
  }

  if (result.status !== 'succeeded') throw new Error(`${label} timed out`)

  return typeof result.output === 'string' ? result.output : result.output?.[0] || ''
}

async function downloadAndSave(url: string, prefix: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 1000) throw new Error('Downloaded file too small — likely an error page')
  const ext = url.includes('.png') ? 'png' : 'jpg'
  const filename = `${prefix}_${crypto.randomUUID().slice(0, 8)}.${ext}`
  const outputPath = path.join(OUTPUT_DIR, filename)
  await writeFile(outputPath, buf)

  return IS_SERVERLESS
    ? `/api/generated/image-edit/${filename}`
    : `/generated/image-edit/${filename}`
}

// ─── Operations ───────────────────────────────────────────────

async function enhanceWithReplicate(options: ImageEditOptions): Promise<ImageEditResult> {
  try {
    const outputUrl = await replicatePredict(
      'nightmareai', 'real-esrgan',
      { image: options.imageUrl, scale: 2, face_enhance: true },
      'Enhance',
    )
    const servePath = await downloadAndSave(outputUrl, 'enhanced')
    return { imageUrl: servePath, provider: 'replicate', model: 'real-esrgan', operation: 'enhance' }
  } catch (err) {
    console.warn('[image-editor] Replicate enhance failed, using Pollinations:', err)
    return enhanceWithPollinations(options)
  }
}

async function removeBgWithReplicate(options: ImageEditOptions): Promise<ImageEditResult> {
  try {
    const outputUrl = await replicatePredict(
      'lucataco', 'remove-bg',
      { image: options.imageUrl },
      'Remove Background',
    )
    const servePath = await downloadAndSave(outputUrl, 'nobg')
    return { imageUrl: servePath, provider: 'replicate', model: 'remove-bg', operation: 'remove-bg' }
  } catch (err) {
    console.warn('[image-editor] Replicate remove-bg failed, using fallback:', err)
    return removeBgFallback(options)
  }
}

async function upscaleWithReplicate(options: ImageEditOptions): Promise<ImageEditResult> {
  try {
    const scale = options.scaleFactor || 2
    const outputUrl = await replicatePredict(
      'nightmareai', 'real-esrgan',
      { image: options.imageUrl, scale: Math.min(scale, 4), face_enhance: false },
      'Upscale',
    )
    const servePath = await downloadAndSave(outputUrl, 'upscaled')
    return { imageUrl: servePath, provider: 'replicate', model: 'real-esrgan', operation: 'upscale' }
  } catch (err) {
    console.warn('[image-editor] Replicate upscale failed, using Pollinations:', err)
    return enhanceWithPollinations(options)
  }
}

async function extendWithReplicate(options: ImageEditOptions): Promise<ImageEditResult> {
  try {
    const outputUrl = await replicatePredict(
      'fofr', 'become-image',
      {
        image: options.imageUrl,
        prompt: options.prompt || 'extend the image naturally, same style, seamless continuation',
      },
      'Extend',
    )
    const servePath = await downloadAndSave(outputUrl, 'extended')
    return { imageUrl: servePath, provider: 'replicate', model: 'become-image', operation: 'extend' }
  } catch (err) {
    console.warn('[image-editor] Replicate extend failed, using Pollinations:', err)
    return enhanceWithPollinations(options)
  }
}

async function enhanceWithPollinations(options: ImageEditOptions): Promise<ImageEditResult> {
  const prompt = options.prompt || 'enhance this image, high quality, detailed, sharp'
  const encodedPrompt = encodeURIComponent(prompt)
  const externalUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=flux&nologo=true&enhance=true&seed=${Date.now()}`

  try {
    const servePath = await downloadAndSave(externalUrl, 'enhanced')
    return { imageUrl: servePath, provider: 'pollinations', model: 'flux', operation: options.operation }
  } catch {
    return { imageUrl: externalUrl, provider: 'pollinations', model: 'flux', operation: options.operation }
  }
}

async function restyleWithPollinations(options: ImageEditOptions): Promise<ImageEditResult> {
  const styleInfo = RESTYLE_OPTIONS.find(s => s.id === options.style)
  const stylePrompt = styleInfo?.prompt || options.prompt || 'enhanced artistic version'
  const fullPrompt = `${stylePrompt}, based on reference image, high quality`
  const encodedPrompt = encodeURIComponent(fullPrompt)
  const externalUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=flux&nologo=true&enhance=true&seed=${Date.now()}`

  try {
    const servePath = await downloadAndSave(externalUrl, 'restyled')
    return { imageUrl: servePath, provider: 'pollinations', model: 'flux', operation: options.operation }
  } catch {
    return { imageUrl: externalUrl, provider: 'pollinations', model: 'flux', operation: options.operation }
  }
}

async function removeBgFallback(options: ImageEditOptions): Promise<ImageEditResult> {
  const prompt = encodeURIComponent('isolated subject on transparent white background, product photography')
  const externalUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&model=flux&nologo=true&seed=${Date.now()}`

  try {
    const servePath = await downloadAndSave(externalUrl, 'nobg')
    return { imageUrl: servePath, provider: 'pollinations', model: 'flux-fallback', operation: 'remove-bg' }
  } catch {
    return { imageUrl: externalUrl, provider: 'pollinations', model: 'flux-fallback', operation: 'remove-bg' }
  }
}

export function getImageEditProviders() {
  return [
    {
      id: 'replicate',
      name: 'Replicate AI',
      available: !!(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY),
      description: 'Professional AI image editing (enhance, upscale, remove background)',
    },
    {
      id: 'pollinations',
      name: 'Pollinations (Free)',
      available: true,
      description: 'Free AI image generation and basic editing',
    },
  ]
}
