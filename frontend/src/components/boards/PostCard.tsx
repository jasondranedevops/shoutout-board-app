/**
 * Post card component for displaying individual contributions on a board
 */
import React from 'react'
import { Post } from '@/src/types'

interface PostCardProps {
  post: Post
}

/**
 * Generate a consistent color based on name hash
 */
function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const colors = [
    'bg-indigo-500',
    'bg-violet-500',
    'bg-blue-500',
    'bg-rose-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-cyan-500',
    'bg-pink-500',
  ]

  return colors[Math.abs(hash) % colors.length]
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const avatarColor = getAvatarColor(post.authorName)
  const initials = getInitials(post.authorName)

  // Format timestamp
  const createdDate = new Date(post.createdAt)
  const now = new Date()
  const diffMs = now.getTime() - createdDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  let timeText = ''
  if (diffMinutes < 1) {
    timeText = 'Just now'
  } else if (diffMinutes < 60) {
    timeText = `${diffMinutes}m ago`
  } else if (diffHours < 24) {
    timeText = `${diffHours}h ago`
  } else {
    timeText = `${diffDays}d ago`
  }

  return (
    <div className="card p-4">
      {/* Header with avatar and author info */}
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor}`}
        >
          {initials}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            {post.isAnonymous ? 'Anonymous' : post.authorName}
          </p>
          <p className="text-xs text-gray-500">{timeText}</p>
        </div>
      </div>

      {/* Message text */}
      <p className="mb-3 text-gray-700 whitespace-pre-wrap">{post.contentText}</p>

      {/* Media/GIF if present */}
      {(post.mediaUrl || post.gifUrl) && (
        <div className="mb-2 overflow-hidden rounded-lg bg-gray-100">
          <img
            src={post.gifUrl || post.mediaUrl}
            alt="Post media"
            className="h-auto w-full object-cover"
          />
        </div>
      )}
    </div>
  )
}
