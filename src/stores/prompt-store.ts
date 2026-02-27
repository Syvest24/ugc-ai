'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PromptTemplate {
  id: string
  name: string
  prompt: string
  style?: string
  category: 'product' | 'social' | 'background' | 'artistic' | 'portrait' | 'custom'
}

export interface PromptHistoryEntry {
  id: string
  prompt: string
  style?: string
  aspectRatio?: string
  timestamp: number
}

interface PromptStore {
  history: PromptHistoryEntry[]
  favorites: PromptHistoryEntry[]
  customTemplates: PromptTemplate[]
  addToHistory: (entry: Omit<PromptHistoryEntry, 'id' | 'timestamp'>) => void
  toggleFavorite: (id: string) => void
  clearHistory: () => void
  addCustomTemplate: (template: Omit<PromptTemplate, 'id'>) => void
  removeCustomTemplate: (id: string) => void
}

// Built-in prompt templates for common UGC scenarios
export const PRESET_TEMPLATES: PromptTemplate[] = [
  // Product Photography
  {
    id: 'pt-1',
    name: 'Product Hero Shot',
    prompt: 'Professional product photography, centered on white background, soft studio lighting, high-end commercial look, 8k quality',
    style: 'photorealistic',
    category: 'product',
  },
  {
    id: 'pt-2',
    name: 'Lifestyle Product',
    prompt: 'Product in a modern lifestyle setting, warm natural lighting, cozy atmosphere, bokeh background, aspirational mood',
    style: 'photorealistic',
    category: 'product',
  },
  {
    id: 'pt-3',
    name: 'Flat Lay',
    prompt: 'Top-down flat lay photography, neatly arranged items, minimalist styling, clean aesthetic, trendy composition',
    style: 'photorealistic',
    category: 'product',
  },
  // Social Media
  {
    id: 'pt-4',
    name: 'Instagram Story BG',
    prompt: 'Trendy gradient background with abstract shapes, vibrant colors, modern social media aesthetic, perfect for text overlay',
    style: 'digital-art',
    category: 'social',
  },
  {
    id: 'pt-5',
    name: 'Motivational Quote BG',
    prompt: 'Beautiful dramatic sunset landscape, inspiring atmosphere, golden hour lighting, space for text overlay',
    style: 'cinematic',
    category: 'social',
  },
  {
    id: 'pt-6',
    name: 'Neon Appeal',
    prompt: 'Dark background with vibrant neon lights and glow effects, cyberpunk aesthetic, eye-catching social media visual',
    style: 'neon',
    category: 'social',
  },
  // Backgrounds
  {
    id: 'pt-7',
    name: 'Abstract Gradient',
    prompt: 'Smooth flowing abstract gradient, liquid colors blending together, dreamy and modern, high resolution background',
    style: 'digital-art',
    category: 'background',
  },
  {
    id: 'pt-8',
    name: 'Urban Texture',
    prompt: 'Textured concrete wall with subtle patterns, urban industrial aesthetic, clean and modern, neutral tones',
    style: 'photorealistic',
    category: 'background',
  },
  // Artistic
  {
    id: 'pt-9',
    name: 'Digital Illustration',
    prompt: 'Beautiful digital illustration, detailed character art, vibrant colors, professional concept art quality',
    style: 'digital-art',
    category: 'artistic',
  },
  {
    id: 'pt-10',
    name: 'Watercolor Scene',
    prompt: 'Delicate watercolor painting, soft brush strokes, beautiful color blending, artistic and dreamy atmosphere',
    style: 'watercolor',
    category: 'artistic',
  },
  // Portrait
  {
    id: 'pt-11',
    name: 'Professional Headshot',
    prompt: 'Professional headshot photography, clean background, studio lighting, business portrait style, confident pose',
    style: 'photorealistic',
    category: 'portrait',
  },
  {
    id: 'pt-12',
    name: 'Anime Character',
    prompt: 'Detailed anime character portrait, expressive eyes, dynamic hair, beautiful illustration quality, vibrant colors',
    style: 'anime',
    category: 'portrait',
  },
]

export const TEMPLATE_CATEGORIES = [
  { id: 'product', name: 'Product', emoji: '📦' },
  { id: 'social', name: 'Social Media', emoji: '📱' },
  { id: 'background', name: 'Backgrounds', emoji: '🎨' },
  { id: 'artistic', name: 'Artistic', emoji: '🖼️' },
  { id: 'portrait', name: 'Portrait', emoji: '🧑' },
  { id: 'custom', name: 'My Templates', emoji: '⭐' },
] as const

export const usePromptStore = create<PromptStore>()(
  persist(
    (set, get) => ({
      history: [],
      favorites: [],
      customTemplates: [],

      addToHistory: (entry) => {
        const id = crypto.randomUUID()
        const newEntry: PromptHistoryEntry = {
          ...entry,
          id,
          timestamp: Date.now(),
        }
        set(state => ({
          history: [newEntry, ...state.history].slice(0, 50), // Keep last 50
        }))
      },

      toggleFavorite: (id) => {
        const { history, favorites } = get()
        const existing = favorites.find(f => f.id === id)
        if (existing) {
          set({ favorites: favorites.filter(f => f.id !== id) })
        } else {
          const entry = history.find(h => h.id === id)
          if (entry) {
            set({ favorites: [entry, ...favorites] })
          }
        }
      },

      clearHistory: () => set({ history: [] }),

      addCustomTemplate: (template) => {
        const id = `custom-${crypto.randomUUID().slice(0, 8)}`
        set(state => ({
          customTemplates: [...state.customTemplates, { ...template, id }],
        }))
      },

      removeCustomTemplate: (id) => {
        set(state => ({
          customTemplates: state.customTemplates.filter(t => t.id !== id),
        }))
      },
    }),
    {
      name: 'ugcforge-prompts',
      partialize: (state) => ({
        history: state.history,
        favorites: state.favorites,
        customTemplates: state.customTemplates,
      }),
    }
  )
)
