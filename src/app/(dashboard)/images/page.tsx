'use client'
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { ImageIcon, Heart, Trash2, Download, Filter, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import ImageGenerator from '@/components/ImageGenerator'

interface GeneratedImage {
  id: string
  prompt: string
  negativePrompt?: string | null
  provider: string
  model: string
  imageUrl: string
  width: number
  height: number
  style?: string | null
  seed?: number | null
  isFavorite: boolean
  createdAt: string
}

export default function ImagesPage() {
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const limit = 12

  const fetchImages = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(favoritesOnly ? { favorites: 'true' } : {}),
      })
      const res = await fetch(`/api/image?${params}`)
      const data = await res.json()
      if (data.success) {
        setImages(data.data)
        setTotal(data.meta?.total || 0)
      }
    } catch {
      toast.error('Failed to load images')
    } finally {
      setLoading(false)
    }
  }, [page, favoritesOnly])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const handleImageGenerated = useCallback((image: GeneratedImage) => {
    setImages(prev => [image, ...prev])
    setTotal(prev => prev + 1)
  }, [])

  const handleToggleFavorite = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/image?id=${id}`, { method: 'PATCH' })
      const data = await res.json()
      if (data.success) {
        setImages(prev => prev.map(img =>
          img.id === id ? { ...img, isFavorite: !img.isFavorite } : img
        ))
        if (selectedImage?.id === id) {
          setSelectedImage(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null)
        }
      }
    } catch {
      toast.error('Failed to update')
    }
  }, [selectedImage])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this image?')) return
    try {
      const res = await fetch(`/api/image?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setImages(prev => prev.filter(img => img.id !== id))
        setTotal(prev => prev - 1)
        if (selectedImage?.id === id) setSelectedImage(null)
        toast.success('Image deleted')
      }
    } catch {
      toast.error('Failed to delete')
    }
  }, [selectedImage])

  const handleDownload = useCallback(async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ugcforge-${image.id}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    }
  }, [])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ImageIcon className="w-7 h-7 text-violet-400" />
          AI Image Generator
        </h1>
        <p className="text-gray-400 mt-1">
          Generate stunning images from text descriptions using AI
        </p>
      </div>

      {/* Generator */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
        <ImageGenerator onImageGenerated={handleImageGenerated} />
      </div>

      {/* Gallery Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Your Images {total > 0 && <span className="text-gray-500 text-sm font-normal">({total})</span>}
          </h2>
          <button
            onClick={() => { setFavoritesOnly(!favoritesOnly); setPage(1) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all border ${
              favoritesOnly
                ? 'border-rose-500 bg-rose-600/20 text-rose-300'
                : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {favoritesOnly ? 'Showing Favorites' : 'All Images'}
          </button>
        </div>

        {loading && images.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No images yet</p>
            <p className="text-sm">Generate your first image above!</p>
          </div>
        ) : (
          <>
            {/* Image Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map(image => (
                <div
                  key={image.id}
                  className="group relative border border-gray-800 rounded-xl overflow-hidden bg-gray-900/50 cursor-pointer hover:border-gray-700 transition-all"
                  onClick={() => setSelectedImage(image)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.imageUrl}
                    alt={image.prompt}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                    <div className="p-3 w-full">
                      <p className="text-white text-xs line-clamp-2">{image.prompt}</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={e => { e.stopPropagation(); handleToggleFavorite(image.id) }}
                          className={`p-1.5 rounded-full transition-colors ${
                            image.isFavorite ? 'bg-rose-600/30 text-rose-400' : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                          title="Favorite"
                        >
                          <Heart className={`w-3.5 h-3.5 ${image.isFavorite ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDownload(image) }}
                          className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(image.id) }}
                          className="p-1.5 rounded-full bg-white/10 text-red-400 hover:bg-red-600/30 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Favorite badge */}
                  {image.isFavorite && (
                    <div className="absolute top-2 right-2">
                      <Heart className="w-4 h-4 text-rose-400 fill-current" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage.imageUrl}
              alt={selectedImage.prompt}
              className="max-w-full max-h-[70vh] object-contain mx-auto"
            />
            <div className="p-4 border-t border-gray-800 space-y-3">
              <p className="text-sm text-gray-300">{selectedImage.prompt}</p>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="px-2 py-0.5 rounded bg-gray-800">{selectedImage.provider}</span>
                <span className="px-2 py-0.5 rounded bg-gray-800">{selectedImage.model}</span>
                <span className="px-2 py-0.5 rounded bg-gray-800">{selectedImage.width}×{selectedImage.height}</span>
                {selectedImage.style && <span className="px-2 py-0.5 rounded bg-gray-800">{selectedImage.style}</span>}
                {selectedImage.seed && <span className="px-2 py-0.5 rounded bg-gray-800">seed: {selectedImage.seed}</span>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(selectedImage)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-500 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button
                  onClick={() => handleToggleFavorite(selectedImage.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    selectedImage.isFavorite
                      ? 'border-rose-500 bg-rose-600/20 text-rose-300'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${selectedImage.isFavorite ? 'fill-current' : ''}`} />
                  {selectedImage.isFavorite ? 'Favorited' : 'Favorite'}
                </button>
                <button
                  onClick={() => handleDelete(selectedImage.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-700 text-red-400 hover:bg-red-600/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
            {/* Close button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
