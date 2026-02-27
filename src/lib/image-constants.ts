/**
 * Client-safe image generation constants and types.
 * This file has NO Node.js imports (fs, path, etc.) so it can be
 * safely imported from client components.
 */

export type ImageStyle =
  | 'photorealistic'
  | 'digital-art'
  | 'anime'
  | 'cinematic'
  | 'minimalist'
  | 'watercolor'
  | 'oil-painting'
  | '3d-render'
  | 'neon'
  | 'vintage'

export const IMAGE_STYLES: { id: ImageStyle; name: string; emoji: string }[] = [
  { id: 'photorealistic', name: 'Photorealistic', emoji: '📸' },
  { id: 'cinematic', name: 'Cinematic', emoji: '🎬' },
  { id: 'digital-art', name: 'Digital Art', emoji: '🎨' },
  { id: '3d-render', name: '3D Render', emoji: '🧊' },
  { id: 'minimalist', name: 'Minimalist', emoji: '⬜' },
  { id: 'neon', name: 'Neon / Cyberpunk', emoji: '💜' },
  { id: 'anime', name: 'Anime', emoji: '🌸' },
  { id: 'watercolor', name: 'Watercolor', emoji: '💧' },
  { id: 'oil-painting', name: 'Oil Painting', emoji: '🖼️' },
  { id: 'vintage', name: 'Vintage', emoji: '📷' },
]

export const IMAGE_ASPECT_RATIOS = [
  { id: '1:1', label: 'Square', width: 1024, height: 1024, desc: 'Feed posts' },
  { id: '9:16', label: 'Portrait', width: 768, height: 1344, desc: 'Stories / Reels' },
  { id: '16:9', label: 'Landscape', width: 1344, height: 768, desc: 'YouTube / Banner' },
  { id: '4:5', label: 'Portrait (4:5)', width: 896, height: 1120, desc: 'Instagram post' },
  { id: '3:2', label: 'Classic (3:2)', width: 1200, height: 800, desc: 'Blog / Web' },
] as const
