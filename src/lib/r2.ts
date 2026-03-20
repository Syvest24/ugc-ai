/**
 * Cloudflare R2 Storage Abstraction
 *
 * Provides upload/delete/URL generation for all generated assets
 * (audio, video, images, thumbnails).
 *
 * R2 is S3-compatible, so we use the AWS SDK.
 *
 * When R2 is configured (R2_ACCESS_KEY_ID set), all files go to R2.
 * When R2 is NOT configured, falls back to local filesystem (dev mode).
 *
 * Environment variables:
 *   R2_ACCESS_KEY_ID     — Cloudflare R2 access key
 *   R2_SECRET_ACCESS_KEY — Cloudflare R2 secret key
 *   R2_BUCKET            — Bucket name (e.g. ugc-ai09)
 *   R2_ACCOUNT_ID        — Cloudflare account ID
 *   R2_PUBLIC_URL        — (Optional) Custom domain or r2.dev public URL
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { logger } from './logger'

// ─── Configuration ───────────────────────────────────────────────────

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET || 'ugc-ai09'
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL // e.g. https://pub-xxx.r2.dev or https://assets.yourdomain.com

/** Whether R2 is properly configured */
export const isR2Configured = !!(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ACCOUNT_ID)

// ─── S3 Client (lazy singleton) ─────────────────────────────────────

let _client: S3Client | null = null

function getClient(): S3Client {
  if (_client) return _client
  if (!isR2Configured) {
    throw new Error('R2 is not configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ACCOUNT_ID')
  }
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  })
  return _client
}

// ─── MIME type mapping ───────────────────────────────────────────────

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webm': 'video/webm',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
}

function getMimeType(key: string): string {
  const ext = key.slice(key.lastIndexOf('.')).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

// ─── Upload ──────────────────────────────────────────────────────────

/**
 * Upload a file buffer to R2.
 *
 * @param key   — Object key (path within bucket), e.g. "audio/tts-xxx.mp3"
 * @param body  — File contents as Buffer
 * @returns     — Public URL to the uploaded file
 */
export async function uploadToR2(key: string, body: Buffer): Promise<string> {
  const client = getClient()
  const contentType = getMimeType(key)

  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))

  logger.info('Uploaded to R2', { key, size: body.length, contentType })

  return getR2PublicUrl(key)
}

// ─── Download (for server-side use, e.g., Remotion needing local file) ──

/**
 * Download a file from R2 into a Buffer.
 * Used when server-side processing needs the file (e.g., Remotion audio, ffmpeg).
 */
export async function downloadFromR2(key: string): Promise<Buffer> {
  const client = getClient()
  const result = await client.send(new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  }))
  const stream = result.Body
  if (!stream) throw new Error(`R2 object not found: ${key}`)
  // Convert readable stream to buffer
  const chunks: Uint8Array[] = []
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

// ─── Delete ──────────────────────────────────────────────────────────

/**
 * Delete a file from R2.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getClient()
  await client.send(new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  }))
  logger.info('Deleted from R2', { key })
}

// ─── URL helpers ─────────────────────────────────────────────────────

/**
 * Get the public URL for an R2 object.
 * Uses custom domain / r2.dev URL if configured, otherwise falls back to
 * the proxy route /api/generated/{key}.
 */
export function getR2PublicUrl(key: string): string {
  if (R2_PUBLIC_URL) {
    const base = R2_PUBLIC_URL.replace(/\/$/, '')
    return `${base}/${key}`
  }
  // Fallback: serve via our API proxy route
  return `/api/r2/${key}`
}

/**
 * Extract the R2 key from a URL (reverse of getR2PublicUrl).
 * Handles both public URLs and /api/r2/ proxy paths.
 */
export function getR2KeyFromUrl(url: string): string | null {
  if (!url) return null

  // Handle /api/r2/... proxy paths
  if (url.startsWith('/api/r2/')) {
    return url.replace('/api/r2/', '')
  }

  // Handle public URL paths
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
    return url.replace(R2_PUBLIC_URL.replace(/\/$/, '') + '/', '')
  }

  // Handle legacy /api/generated/ paths
  if (url.startsWith('/api/generated/')) {
    return url.replace('/api/generated/', '')
  }

  // Handle legacy /generated/ paths
  if (url.startsWith('/generated/')) {
    return url.replace('/generated/', '')
  }

  // Handle legacy /generated-images/ paths
  if (url.startsWith('/generated-images/')) {
    return url.replace('/', '')
  }

  return null
}
