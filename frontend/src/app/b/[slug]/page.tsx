'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import apiClient from '@/src/lib/api'
import { useQuery } from '@tanstack/react-query'
import { Post } from '@/src/types'
import { PostCard } from '@/src/components/boards/PostCard'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { GifPicker } from '@/src/components/ui/GifPicker'
import { Send, Image, Lock, Cake, Gift, LogOut, TrendingUp, UserPlus, Heart, Mail, Star, PartyPopper, Building2, CalendarDays, Palmtree, Trophy, Handshake, Medal, ClipboardList, Flower2, ThumbsUp, Sparkles, Ship, Plus, X, type LucideIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const addMessageSchema = z.object({
  authorName: z.string().min(2, 'Name is required'),
  contentText: z.string().min(1, 'Message is required').max(500, 'Message too long'),
  isAnonymous: z.boolean().default(false),
})

type AddMessageData = z.infer<typeof addMessageSchema>

const themeGradients: Record<string, string> = {
  indigo:  'from-indigo-500 to-indigo-700',
  violet:  'from-violet-500 to-violet-700',
  rose:    'from-rose-500 to-rose-700',
  emerald: 'from-emerald-500 to-emerald-700',
  blue:    'from-blue-500 to-blue-700',
  orange:  'from-orange-500 to-orange-700',
}

const occasionIcons: Record<string, LucideIcon> = {
  thank_you:             Mail,
  team_celebration:      PartyPopper,
  company_celebration:   Building2,
  work_anniversary:      CalendarDays,
  retirement:            Palmtree,
  birthday:              Cake,
  congratulations:       Trophy,
  recruiting_onboarding: Handshake,
  office_competition:    Medal,
  department_event:      ClipboardList,
  sympathy:              Flower2,
  employee_appreciation: ThumbsUp,
  holiday_celebration:   Sparkles,
  farewell:              Ship,
  anniversary:           Gift,
  promotion:             TrendingUp,
  welcome:               UserPlus,
  custom:                Star,
}

export default function PublicBoardPage() {
  const params = useParams()
  const slug = params.slug as string
  const [localPosts, setLocalPosts] = useState<Post[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [selectedGif, setSelectedGif] = useState<string | null>(null)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const { data: boardData, isLoading, error } = useQuery({
    queryKey: ['public-board', slug],
    queryFn: async () => {
      const response = await apiClient.get<any>(`/v1/boards/${slug}/public`)
      return response.data.data ?? response.data
    },
  })

  const form = useForm<AddMessageData>({
    resolver: zodResolver(addMessageSchema),
    defaultValues: { authorName: '', contentText: '', isAnonymous: false },
  })

  const handleAddMessage = async (data: AddMessageData) => {
    try {
      const response = await apiClient.post<any>(`/v1/boards/${boardData.id}/posts`, {
        authorName: data.isAnonymous ? 'Anonymous' : data.authorName,
        contentText: data.contentText,
        isAnonymous: data.isAnonymous,
        gifUrl: selectedGif || undefined,
      })
      const newPost = response.data.data ?? response.data
      setLocalPosts([newPost, ...localPosts])
      form.reset()
      setSelectedGif(null)
      setSubmitted(true)
      setShowForm(false)
      setTimeout(() => setSubmitted(false), 4000)
    } catch (err) {
      console.error('Failed to submit message:', err)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-4 text-gray-500">Loading board…</p>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !boardData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Lock size={32} className="text-gray-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Board not found</h1>
          <p className="text-gray-500">This board may not be available yet.</p>
        </div>
      </div>
    )
  }

  const board = boardData
  const OccasionIcon = occasionIcons[board.occasionType?.toLowerCase()] || Heart
  const gradient = themeGradients[board.coverTheme] || themeGradients.indigo
  const allPosts: Post[] = [...localPosts, ...(board.posts ?? [])]
  const canAdd = board.status !== 'SENT'

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ── Hero Cover ──────────────────────────────────────────────────────── */}
      <div className={`relative bg-gradient-to-br ${gradient} px-4 pb-16 pt-14 text-center text-white`}>
        {/* Decorative dots */}
        <div className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-5">
          <OccasionIcon size={44} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl mb-3">{board.title}</h1>
        <p className="text-lg text-white/80">For <span className="font-semibold text-white">{board.recipientName}</span></p>

        {/* Add message button anchored to bottom of cover */}
        {canAdd && (
          <div className="mt-8">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold shadow-lg transition-transform hover:scale-105 active:scale-95"
              style={{ color: 'var(--color-indigo-600, #4f46e5)' }}
            >
              <Plus size={18} />
              Add Your Message
            </button>
          </div>
        )}
      </div>

      {/* ── Success banner ────────────────────────────────────────────────── */}
      {submitted && (
        <div className="sticky top-0 z-30 bg-green-500 py-3 text-center text-sm font-medium text-white shadow">
          🎉 Your message was added to the board!
        </div>
      )}

      {/* ── Masonry post grid ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-10">
        {allPosts.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-lg text-gray-500">Be the first to leave a message!</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
            {allPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 bg-white py-8 text-center">
        <p className="text-sm text-gray-500">
          Powered by <span className="font-semibold text-indigo-600">Shoutboard</span>
        </p>
      </div>

      {/* ── Add Message Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowForm(false); setShowGifPicker(false) }}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className={`flex items-center justify-between rounded-t-2xl bg-gradient-to-r ${gradient} px-6 py-4`}>
              <h2 className="text-lg font-semibold text-white">Add Your Message</h2>
              <button
                onClick={() => { setShowForm(false); setShowGifPicker(false) }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <Input
                label="Your Name"
                placeholder="Jane Smith"
                error={form.formState.errors.authorName?.message}
                {...form.register('authorName')}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-900">
                  Your Message
                </label>
                <textarea
                  placeholder="Share your message of appreciation…"
                  rows={4}
                  className="input-base"
                  {...form.register('contentText')}
                />
                {form.formState.errors.contentText && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.contentText.message}
                  </p>
                )}
              </div>

              {/* GIF preview */}
              {selectedGif && (
                <div className="relative inline-block">
                  <img src={selectedGif} alt="Selected GIF" className="max-h-40 rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => setSelectedGif(null)}
                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {showGifPicker && (
                <GifPicker
                  onSelect={(url) => { setSelectedGif(url); setShowGifPicker(false) }}
                  onClose={() => setShowGifPicker(false)}
                />
              )}

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('isAnonymous')}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Post anonymously</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowGifPicker(!showGifPicker)}
                  className={`ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    showGifPicker || selectedGif
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Image size={15} />
                  GIF
                </button>
              </div>

              <Button
                type="button"
                variant="primary"
                isLoading={form.formState.isSubmitting}
                className="w-full"
                icon={<Send size={18} />}
                onClick={form.handleSubmit(handleAddMessage)}
              >
                Send Message
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
