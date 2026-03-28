/**
 * Board detail/edit view
 */
'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useBoard } from '@/src/hooks/useBoards'
import { PostCard } from '@/src/components/boards/PostCard'
import { Button } from '@/src/components/ui/Button'
import { Badge } from '@/src/components/ui/Badge'
import { Copy, Share2, Send } from 'lucide-react'

export default function BoardDetailPage() {
  const params = useParams()
  const boardId = params.id as string
  const { data: board, isLoading } = useBoard(boardId)
  const [copiedLink, setCopiedLink] = useState(false)

  if (isLoading) {
    return (
      <div className="section-container">
        <div className="space-y-6">
          <div className="h-32 animate-pulse rounded-lg bg-gray-200" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="section-container">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Board not found</h2>
          <Link href="/dashboard">
            <Button variant="primary" className="mt-6">
              Back to boards
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/b/${board.slug}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Mock posts for demo
  const mockPosts = [
    {
      id: '1',
      boardId: boardId,
      authorName: 'Alice Johnson',
      authorId: 'user-1',
      contentText: 'Congratulations on the promotion! You deserve it! 🎉',
      isAnonymous: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      boardId: boardId,
      authorName: 'Bob Smith',
      authorId: 'user-2',
      contentText: 'What an amazing journey! Wishing you all the best in your new role.',
      isAnonymous: false,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ]

  return (
    <div className="section-container">
      {/* Header */}
      <div className="mb-8">
        <div className="card p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{board.title}</h1>
                <Badge status={board.status} />
              </div>
              <p className="mt-2 text-gray-600">
                For <span className="font-medium">{board.recipientName}</span>
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {board.contributorCount} contributors • {board.postCount} messages
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 gap-3">
              <Button
                variant="outline"
                onClick={handleCopyLink}
                icon={<Copy size={18} />}
              >
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button
                variant="primary"
                icon={<Send size={18} />}
              >
                Send Board
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Share info */}
      <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-2">
          <Share2 size={18} className="text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Share this board</p>
            <p className="text-xs text-blue-700">{publicUrl}</p>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Messages</h2>

        {mockPosts.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-600">
              No messages yet. Share the link to start gathering contributions!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {mockPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
