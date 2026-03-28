'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface GifResult {
  id: string
  url: string
  previewUrl: string
  title: string
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void
  onClose: () => void
}

// Giphy public beta key — replace with a real key in production
const GIPHY_API_KEY = 'SHn4IonLRh2jnz2ejPHioE8pqr3crQDt'
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs'

export const GifPicker: React.FC<GifPickerProps> = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GifResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(true)
    setApiError(null)

    try {
      const endpoint = q.trim()
        ? `${GIPHY_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=g`
        : `${GIPHY_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=12&rating=g`

      const res = await fetch(endpoint)
      const json = await res.json()

      if (!res.ok || json.meta?.status >= 400) {
        setApiError(`Giphy error ${json.meta?.status ?? res.status}: ${json.meta?.msg ?? 'Unknown error'}`)
        setResults([])
        return
      }

      const gifs: GifResult[] = (json.data ?? []).map((g: any) => ({
        id: g.id,
        url: g.images.original.url,
        previewUrl: g.images.fixed_height_small.url,
        title: g.title,
      }))

      setResults(gifs)
    } catch (e: any) {
      setApiError(e?.message ?? 'Network error')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  // Load trending on mount
  React.useEffect(() => {
    setLoading(true)
    fetch(`${GIPHY_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=12&rating=g`)
      .then((r) => r.json())
      .then((json) => {
        if (json.meta?.status >= 400) {
          setApiError(`Giphy error ${json.meta.status}: ${json.meta.msg}`)
          return
        }
        setResults(
          (json.data ?? []).map((g: any) => ({
            id: g.id,
            url: g.images.original.url,
            previewUrl: g.images.fixed_height_small.url,
            title: g.title,
          }))
        )
      })
      .catch((e) => setApiError(e?.message ?? 'Network error'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-lg w-full">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 p-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search GIFs..."
            value={query}
            onChange={handleQueryChange}
            className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder-gray-400"
          />
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      </div>

      {/* Results */}
      <div className="p-3">
        {loading && (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        )}

        {!loading && apiError && (
          <div className="flex h-40 flex-col items-center justify-center gap-1 px-4 text-center">
            <p className="text-sm font-medium text-red-600">GIF Error</p>
            <p className="text-xs text-red-500">{apiError}</p>
          </div>
        )}

        {!loading && !apiError && results.length === 0 && searched && (
          <div className="flex h-40 items-center justify-center text-sm text-gray-500">
            No GIFs found for "{query}"
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="mb-2 text-xs text-gray-400">
              {query ? `Results for "${query}"` : 'Trending'}
            </p>
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {results.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => onSelect(gif.url)}
                  className="group relative overflow-hidden rounded-lg bg-gray-100 aspect-video hover:ring-2 hover:ring-indigo-500 transition-all"
                  title={gif.title}
                >
                  <img
                    src={gif.previewUrl}
                    alt={gif.title}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-gray-400">Powered by GIPHY</p>
          </>
        )}
      </div>
    </div>
  )
}
