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
import { Send, Image, Lock, Cake, Gift, LogOut, TrendingUp, UserPlus, Heart, Mail, Star, PartyPopper, Building2, CalendarDays, Palmtree, Trophy, Handshake, HandMetal, Medal, ClipboardList, Flower2, ThumbsUp, Sparkles, Ship, type LucideIcon } from 'lucide-react'
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
  indigo: 'from-indigo-400 to-indigo-600',
  violet: 'from-violet-400 to-violet-600',
  rose: 'from-rose-400 to-rose-600',
  emerald: 'from-emerald-400 to-emerald-600',
  blue: 'from-blue-400 to-blue-600',
  orange: 'from-orange-400 to-orange-600',
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
  dei_celebration:       HandMetal,
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
      setTimeout(() => setSubmitted(false), 3000)
    } catch (err) {
      console.error('Failed to submit message:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-4 text-gray-600">Loading board...</p>
        </div>
      </div>
    )
  }

  if (error || !boardData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Lock size={32} className="text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Board not found</h1>
          <p className="text-gray-600">This board may not be available yet.</p>
        </div>
      </div>
    )
  }

  const board = boardData
  const OccasionIcon = occasionIcons[board.occasionType?.toLowerCase()] || Heart
  const gradient = themeGradients[board.coverTheme] || themeGradients.indigo
  const allPosts: Post[] = [...localPosts, ...(board.posts ?? [])]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Cover */}
      <div className={`bg-gradient-to-br ${gradient} px-4 py-12 text-center text-white md:py-20`}>
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center md:h-24 md:w-24">
          <OccasionIcon size={64} className="text-white/90" />
        </div>
        <h1 className="mb-3 text-3xl font-bold md:text-5xl">{board.title}</h1>
        <p className="text-base opacity-90 md:text-xl">A message of appreciation for {board.recipientName}</p>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Add message form */}
        {board.status !== 'SENT' && (
          <div className="card mb-12 p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Add Your Message</h2>

            {submitted && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-green-700 text-sm font-medium">
                🎉 Your message was added!
              </div>
            )}

            <form onSubmit={form.handleSubmit(handleAddMessage)} className="space-y-4">
              <Input
                label="Your Name"
                placeholder="Jane Smith"
                error={form.formState.errors.authorName?.message}
                {...form.register('authorName')}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Your Message
                </label>
                <textarea
                  placeholder="Share your message of appreciation..."
                  rows={4}
                  className="input-base"
                  {...form.register('contentText')}
                />
                {form.formState.errors.contentText && (
                  <p className="mt-2 text-sm text-red-600">
                    {form.formState.errors.contentText.message}
                  </p>
                )}
              </div>

              {/* GIF preview */}
              {selectedGif && (
                <div className="relative inline-block">
                  <img
                    src={selectedGif}
                    alt="Selected GIF"
                    className="max-h-40 rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedGif(null)}
                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}

              {/* GIF Picker */}
              {showGifPicker && (
                <GifPicker
                  onSelect={(url) => { setSelectedGif(url); setShowGifPicker(false) }}
                  onClose={() => setShowGifPicker(false)}
                />
              )}

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
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
                type="submit"
                variant="primary"
                isLoading={form.formState.isSubmitting}
                className="w-full"
                icon={<Send size={18} />}
              >
                Send Message
              </Button>
            </form>
          </div>
        )}

        {/* Messages */}
        <div>
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Messages ({allPosts.length})
          </h2>

          {allPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">Be the first to leave a message!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 py-8 text-center">
        <p className="text-gray-600">
          Powered by <span className="font-semibold text-indigo-600">Shoutboard</span>
        </p>
      </div>
    </div>
  )
}
