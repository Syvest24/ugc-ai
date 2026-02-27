import { createClient, type Video, type Photo } from 'pexels'

export interface StockClip {
  id: number
  url: string
  previewUrl: string
  width: number
  height: number
  duration?: number
  type: 'video' | 'image'
  photographer?: string
}

const getClient = () => {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    throw new Error('PEXELS_API_KEY is not set. Get a free key at https://www.pexels.com/api/')
  }
  return createClient(apiKey)
}

export async function searchStockVideos(
  query: string,
  options: {
    perPage?: number
    orientation?: 'landscape' | 'portrait' | 'square'
    size?: 'large' | 'medium' | 'small'
  } = {}
): Promise<StockClip[]> {
  const client = getClient()
  const { perPage = 5, orientation = 'portrait', size = 'medium' } = options

  try {
    const result = await client.videos.search({
      query,
      per_page: perPage,
      orientation,
      size,
    })

    if ('error' in result) {
      console.error('Pexels video search error:', result.error)
      return []
    }

    return result.videos.map((video: Video) => {
      // Get the best quality file for the orientation
      const videoFile = video.video_files
        .filter(f => f.quality === 'hd' || f.quality === 'sd')
        .sort((a, b) => (b.width || 0) - (a.width || 0))[0]

      const previewFile = video.video_files
        .filter(f => f.quality === 'sd')
        .sort((a, b) => (a.width || 0) - (b.width || 0))[0]

      return {
        id: video.id,
        url: videoFile?.link || video.video_files[0]?.link || '',
        previewUrl: previewFile?.link || video.image || '',
        width: videoFile?.width || video.width,
        height: videoFile?.height || video.height,
        duration: video.duration,
        type: 'video' as const,
        photographer: video.user?.name,
      }
    })
  } catch (error) {
    console.error('Pexels search error:', error)
    return []
  }
}

export async function searchStockImages(
  query: string,
  options: {
    perPage?: number
    orientation?: 'landscape' | 'portrait' | 'square'
    size?: 'large' | 'medium' | 'small'
  } = {}
): Promise<StockClip[]> {
  const client = getClient()
  const { perPage = 5, orientation = 'portrait', size = 'medium' } = options

  try {
    const result = await client.photos.search({
      query,
      per_page: perPage,
      orientation,
      size,
    })

    if ('error' in result) {
      console.error('Pexels image search error:', result.error)
      return []
    }

    return result.photos.map((photo: Photo) => ({
      id: photo.id,
      url: photo.src.original,
      previewUrl: photo.src.medium,
      width: photo.width,
      height: photo.height,
      type: 'image' as const,
      photographer: photo.photographer,
    }))
  } catch (error) {
    console.error('Pexels image search error:', error)
    return []
  }
}

// Extract search keywords from product info using the LLM
export function extractSearchKeywords(productName: string, productDescription: string, platform: string): string[] {
  // Generate relevant search terms for B-roll footage
  const words = `${productName} ${productDescription}`.toLowerCase()
  const keywords: string[] = []

  // Product-specific keywords
  keywords.push(productName.split(' ').slice(0, 2).join(' '))

  // Category detection for relevant B-roll
  const categoryMap: Record<string, string[]> = {
    'fitness|gym|workout|exercise|sport': ['fitness motivation', 'workout lifestyle', 'gym training'],
    'beauty|skin|makeup|skincare|glow': ['beauty routine', 'skincare lifestyle', 'self care'],
    'food|cook|kitchen|recipe|meal': ['cooking lifestyle', 'food preparation', 'healthy eating'],
    'tech|phone|laptop|gadget|app': ['technology lifestyle', 'using smartphone', 'modern tech'],
    'fashion|clothing|outfit|wear|style': ['fashion lifestyle', 'outfit styling', 'street style'],
    'health|supplement|vitamin|wellness': ['healthy lifestyle', 'wellness routine', 'morning routine'],
    'home|decor|furniture|interior': ['home interior', 'cozy home', 'home decoration'],
    'pet|dog|cat|animal': ['pet lifestyle', 'happy pets', 'pet care'],
    'travel|adventure|outdoor': ['travel adventure', 'outdoor lifestyle', 'wanderlust'],
    'business|entrepreneur|startup': ['business lifestyle', 'office work', 'entrepreneur'],
  }

  for (const [pattern, terms] of Object.entries(categoryMap)) {
    if (new RegExp(pattern).test(words)) {
      keywords.push(...terms.slice(0, 2))
      break
    }
  }

  // Platform-specific aesthetic
  if (platform === 'tiktok' || platform === 'instagram') {
    keywords.push('lifestyle aesthetic')
  } else if (platform === 'linkedin') {
    keywords.push('professional business')
  }

  // Fallback
  if (keywords.length < 2) {
    keywords.push('lifestyle', 'product showcase')
  }

  return [...new Set(keywords)].slice(0, 4)
}
