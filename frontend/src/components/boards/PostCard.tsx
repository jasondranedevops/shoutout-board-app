/**
 * Post card component — Kudoboard-style layout
 * Image full-bleed on top, message text below, "From [Name]" bottom-right
 */
import React from 'react'
import { Post } from '@/src/types'

interface PostCardProps {
  post: Post
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  return (
    <div className="break-inside-avoid mb-4 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5">
      {/* Media / GIF — full-bleed on top */}
      {(post.mediaUrl || post.gifUrl) && (
        <div className="w-full overflow-hidden">
          <img
            src={post.gifUrl || post.mediaUrl}
            alt="Post media"
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      {/* Text + attribution */}
      <div className="px-5 py-4">
        {post.contentText && (
          <p className="text-gray-800 text-[15px] leading-relaxed whitespace-pre-wrap mb-5">
            {post.contentText}
          </p>
        )}
        <p className="text-right text-sm text-gray-400 italic">
          From {post.isAnonymous ? 'Anonymous' : post.authorName}
        </p>
      </div>
    </div>
  )
}
