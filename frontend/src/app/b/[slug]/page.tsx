/**
 * Public board view (public share page)
 */
'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import apiClient from '@/src/lib/api'
import { useQuery } from '@tanstack/react-query'
import { Board, Post } from '@/src/types'
import { PostCard } from '@/src/components/boards/PostCard'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Form schema for adding a message
const addMessageSchema = z.object({
  authorName: z.string().min(2, 'Name is required'),
  contentText: z.string().min(1, 'Message is required').max(500, 'Message too long'),
  isAnonymous: z.boolean().default(false),
})

type AddMessageData = z.infer<typeof addMessageSchema>

// Mock data for demo
const mockBoard: Board = {
  id: 'board-1',
  orgId: 'org-1',
  title: 'Happy Promotion, Sarah!',
  occasionType: 'promotion',
  status: 'active',
  recipientName: 'Sarah Chen',
  recipientEmail: 'sarah@example.com',
  coverTheme: 'violet',
  slug: 'happy-promotion-sarah',
  postCount: 8,
  contributorCount: 8,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockPosts: Post[] = [
  {
    id: '1',
    boardId: 'board-1',
    authorName: 'Alice Johnson',
    authorId: 'user-1',
    contentText: 'So thrilled for your promotion, Sarah! You\'ve earned it through your hard work and dedication. Excited to see what you\'ll accomplish in this new role!',
    isAnonymous: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    boardId: 'board-1',
    authorName: 'Bob Martinez',
    authorId: 'user-2',
    contentText: 'Congratulations! 🎉 You\'re going to do amazing things in your new position.',
    isAnonymous: false,
    createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
  },
]

const themeGradients: Record<string, string> = {
  indigo: 'from-indigo-400 to-indigo-600',
  violet: 'from-violet-400 to-violet-600',
  rose: 'from-rose-400 to-rose-600',
  emerald: 'from-emerald-400 to-emerald-600',
  blue: 'from-blue-400 to-blue-600',
  orange: 'from-orange-400 to-orange-600',
}

const occasionEmojis: Record<string, string> = {
  birthday: '🎂',
  anniversary: '🎉',
  farewell: '👋',
  promotion: '🚀',
  welcome: '👋',
  custom: '💌',
}

export default function PublicBoardPage() {
  const params = useParams()
  const slug = params.slug as string
  const [posts, setPosts] = useState<Post[]>(mockPosts)

  const form = useForm<AddMessageData>({
    resolver: zodResolver(addMessageSchema),
    defaultValues: {
      authorName: '',
      contentText: '',
      isAnonymous: false,
    },
  })

  const handleAddMessage = async (data: AddMessageData) => {
    // TODO: Call API to add message
    const newPost: Post = {
      id: `post-${Date.now()}`,
      boardId: mockBoard.id,
      authorName: data.isAnonymous ? 'Anonymous' : data.authorName,
      contentText: data.contentText,
      isAnonymous: data.isAnonymous,
      createdAt: new Date().toISOString(),
    }
    setPosts([newPost, ...posts])
    form.reset()
  }

  const board = mockBoard
  const emoji = occasionEmojis[board.occasionType] || '💌'
  const gradient = themeGradients[board.coverTheme] || themeGradients.violet

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Cover section */}
      <div
        className={`bg-gradient-to-br ${gradient} py-20 text-center text-white`}
      >
        <div className="text-7xl mb-4">{emoji}</div>
        <h1 className="text-5xl font-bold mb-4">{board.title}</h1>
        <p className="text-xl opacity-90">
          A message of appreciation for {board.recipientName}
        </p>
      </div>

      {/* Content section */}
      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Add message form */}
        <div className="card mb-12 p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Add Your Message</h2>

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

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...form.register('isAnonymous')}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Post anonymously</span>
            </label>

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

        {/* Messages section */}
        <div>
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Messages ({posts.length})
          </h2>

          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                Be the first to leave a message!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 py-8 text-center">
        <p className="text-gray-600">
          Powered by{' '}
          <span className="font-semibold text-indigo-600">Shoutboard</span>
        </p>
      </div>
    </div>
  )
}
