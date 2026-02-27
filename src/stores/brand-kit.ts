'use client'

import { create } from 'zustand'

interface BrandKit {
  brandName: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logoUrl: string | null
  defaultVoice: string
  defaultTone: string
  defaultPlatform: string
  tagline: string
}

interface BrandKitStore {
  brandKit: BrandKit | null
  loading: boolean
  fetched: boolean
  fetchBrandKit: () => Promise<void>
  updateBrandKit: (kit: Partial<BrandKit>) => void
  setBrandKit: (kit: BrandKit) => void
}

const DEFAULT_BRAND_KIT: BrandKit = {
  brandName: '',
  primaryColor: '#A855F7',
  secondaryColor: '#EC4899',
  accentColor: '#3B82F6',
  logoUrl: null,
  defaultVoice: 'jenny',
  defaultTone: 'casual',
  defaultPlatform: 'tiktok',
  tagline: '',
}

export const useBrandKitStore = create<BrandKitStore>((set, get) => ({
  brandKit: null,
  loading: false,
  fetched: false,

  fetchBrandKit: async () => {
    // Skip if already fetched or currently loading
    if (get().fetched || get().loading) return

    set({ loading: true })
    try {
      const res = await fetch('/api/brand-kit')
      const data = await res.json()
      if (data.data?.exists && data.data?.brandKit) {
        set({ brandKit: data.data.brandKit, fetched: true })
      } else {
        set({ brandKit: DEFAULT_BRAND_KIT, fetched: true })
      }
    } catch {
      set({ brandKit: DEFAULT_BRAND_KIT, fetched: true })
    } finally {
      set({ loading: false })
    }
  },

  updateBrandKit: (partial) => {
    const current = get().brandKit || DEFAULT_BRAND_KIT
    set({ brandKit: { ...current, ...partial } })
  },

  setBrandKit: (kit) => {
    set({ brandKit: kit, fetched: true })
  },
}))
