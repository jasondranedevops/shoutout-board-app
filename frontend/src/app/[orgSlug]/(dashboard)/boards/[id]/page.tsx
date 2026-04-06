/**
 * Board detail/edit view — with drag-and-drop post reordering
 */
'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useBoard, useSendBoard } from '@/src/hooks/useBoards'
import { useAuthStore } from '@/src/store/auth.store'
import { PostCard } from '@/src/components/boards/PostCard'
import { Button } from '@/src/components/ui/Button'
import { Badge } from '@/src/components/ui/Badge'
import { Copy, Share2, Send, GripVertical, Trash2 } from 'lucide-react'
import apiClient from '@/src/lib/api'
import { Post } from '@/src/types'

export default function BoardDetailPage() {
  const params = useParams()
  const boardId = params.id as string
  const { data: board, isLoading, refetch } = useBoard(boardId)
  const sendBoardMutation = useSendBoard(boardId)
  const { org } = useAuthStore()
  const slug = org?.slug ?? ''

  const [copiedLink, setCopiedLink] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Drag-and-drop state
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const dragItem = useRef<string | null>(null)

  // Sync posts from board data when it loads (and when not mid-drag)
  const boardPosts: Post[] = (board as any)?.posts ?? []
  const activePosts = posts ?? boardPosts

  // Initialise local posts once board loads
  React.useEffect(() => {
    if (board && posts === null) {
      setPosts((board as any).posts ?? [])
    }
  }, [board])

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
          <Link href={`/${slug}/dashboard`}>
            <Button variant="primary" className="mt-6">
              Back to boards
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const publicUrl = `${appUrl}/b/${(board as any).slug}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleSend = async () => {
    setError(null)
    try {
      await sendBoardMutation.mutateAsync()
      await refetch()
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to send board. Please try again.')
    }
  }

  const handleDeletePost = async (postId: string) => {
    setError(null)
    try {
      await apiClient.delete(`/v1/boards/${boardId}/posts/${postId}`)
      setPosts((prev) => (prev ?? boardPosts).filter((p) => p.id !== postId))
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to delete post.')
    }
  }

  // ── Drag-and-drop handlers ──────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragItem.current = id
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== dragItem.current) {
      setDragOverId(id)
    }
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!dragItem.current || dragItem.current === targetId) return

    setPosts((prev) => {
      const list = [...(prev ?? boardPosts)]
      const fromIdx = list.findIndex((p) => p.id === dragItem.current)
      const toIdx = list.findIndex((p) => p.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return list
      const [moved] = list.splice(fromIdx, 1)
      list.splice(toIdx, 0, moved)
      return list
    })

    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDragEnd = async () => {
    setDraggingId(null)
    setDragOverId(null)

    if (!posts) return
    setIsSavingOrder(true)
    try {
      await apiClient.post(`/v1/boards/${boardId}/posts/reorder`, {
        orderedIds: posts.map((p) => p.id),
      })
    } catch (err: any) {
      setError('Failed to save post order. Please try again.')
    } finally {
      setIsSavingOrder(false)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────

  const boardStatus = (board as any).status

  return (
    <div className="section-container">
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-medium">Something went wrong</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

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
                {activePosts.length} message{activePosts.length !== 1 ? 's' : ''} •{' '}
                {(board as any).viewCount ?? 0} views
              </p>
            </div>

            <div className="flex flex-shrink-0 gap-3">
              <Button
                variant="outline"
                onClick={handleCopyLink}
                icon={<Copy size={18} />}
              >
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </Button>
              {boardStatus !== 'SENT' && (
                <Button
                  variant="primary"
                  onClick={handleSend}
                  isLoading={sendBoardMutation.isPending}
                  icon={<Send size={18} />}
                >
                  Send Board
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share info */}
      {boardStatus !== 'DRAFT' && (
        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                {boardStatus === 'SENT'
                  ? 'Board has been sent'
                  : 'Share this link to collect messages'}
              </p>
              <p className="text-xs text-blue-700 break-all">{publicUrl}</p>
            </div>
          </div>
        </div>
      )}

      {boardStatus === 'DRAFT' && (
        <div className="mb-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-medium text-yellow-900">
            This board is a draft. Click <strong>Send Board</strong> to deliver it to the
            recipient and make the share link live.
          </p>
        </div>
      )}

      {/* Posts */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
          {isSavingOrder && (
            <span className="text-sm text-gray-500 animate-pulse">Saving order…</span>
          )}
          {activePosts.length > 1 && !isSavingOrder && (
            <span className="text-sm text-gray-400">Drag to reorder</span>
          )}
        </div>

        {activePosts.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-600">
              No messages yet. Share the link to start gathering contributions!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activePosts.map((post) => (
              <div
                key={post.id}
                draggable
                onDragStart={(e) => handleDragStart(e, post.id)}
                onDragOver={(e) => handleDragOver(e, post.id)}
                onDrop={(e) => handleDrop(e, post.id)}
                onDragEnd={handleDragEnd}
                className={`group relative flex items-start gap-3 rounded-xl transition-all duration-150 ${
                  draggingId === post.id
                    ? 'opacity-40 scale-[0.98]'
                    : dragOverId === post.id
                    ? 'ring-2 ring-indigo-400 ring-offset-2'
                    : ''
                }`}
              >
                {/* Drag handle */}
                <div className="mt-5 flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity active:cursor-grabbing">
                  <GripVertical size={20} className="text-gray-400" />
                </div>

                {/* Post card */}
                <div className="min-w-0 flex-1">
                  <PostCard post={post} />
                </div>

                {/* Delete button */}
                {boardStatus !== 'SENT' && (
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="mt-5 flex-shrink-0 rounded-lg p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    title="Remove message"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
