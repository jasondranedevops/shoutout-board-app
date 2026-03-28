/**
 * Board card component for grid display
 */
import React from 'react'
import Link from 'next/link'
import { Board } from '@/src/types'
import { Badge } from '@/src/components/ui/Badge'
import { Users, FileText, Clock } from 'lucide-react'

interface BoardCardProps {
  board: Board
}

// Map occasion types to emojis
const occasionEmojis: Record<string, string> = {
  birthday: '🎂',
  anniversary: '🎉',
  farewell: '👋',
  promotion: '🚀',
  welcome: '👋',
  custom: '💌',
}

// Map cover theme to gradient CSS
const themeGradients: Record<string, string> = {
  indigo: 'from-indigo-400 to-indigo-600',
  violet: 'from-violet-400 to-violet-600',
  rose: 'from-rose-400 to-rose-600',
  emerald: 'from-emerald-400 to-emerald-600',
  blue: 'from-blue-400 to-blue-600',
  orange: 'from-orange-400 to-orange-600',
}

export const BoardCard: React.FC<BoardCardProps> = ({ board }) => {
  const emoji = occasionEmojis[board.occasionType?.toLowerCase()] || '💌'
  const gradient = themeGradients[board.coverTheme] || themeGradients.indigo

  // Calculate time since creation
  const createdDate = new Date(board.createdAt)
  const now = new Date()
  const diffMs = now.getTime() - createdDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  let timeText = ''
  if (diffDays === 0) {
    timeText = 'Today'
  } else if (diffDays === 1) {
    timeText = 'Yesterday'
  } else if (diffDays < 7) {
    timeText = `${diffDays}d ago`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    timeText = `${weeks}w ago`
  } else {
    const months = Math.floor(diffDays / 30)
    timeText = `${months}mo ago`
  }

  return (
    <Link href={`/boards/${board.id}`}>
      <div className="card-hover group cursor-pointer overflow-hidden">
        {/* Cover gradient */}
        <div
          className={`bg-gradient-to-br ${gradient} h-32 flex items-center justify-center text-5xl`}
        >
          {emoji}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-3 flex items-start justify-between">
            <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
              {board.title}
            </h3>
            <Badge status={board.status} className="ml-2 flex-shrink-0" />
          </div>

          <p className="mb-3 text-sm text-gray-600">
            For <span className="font-medium">{board.recipientName}</span>
          </p>

          {/* Stats */}
          <div className="space-y-2 border-t border-gray-200 pt-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users size={16} />
              <span>
                {(board as any).viewCount ?? 0} view{((board as any).viewCount ?? 0) !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FileText size={16} />
              <span>
                {board.postCount} post{board.postCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock size={16} />
              <span>{timeText}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
