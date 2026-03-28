/**
 * Dashboard - Board list page
 */
'use client'

import React from 'react'
import Link from 'next/link'
import { useBoards } from '@/src/hooks/useBoards'
import { BoardCard } from '@/src/components/boards/BoardCard'
import { Button } from '@/src/components/ui/Button'
import { Plus } from 'lucide-react'

export default function DashboardPage() {
  const { data: boardsData, isLoading, error } = useBoards()

  const boards = boardsData?.data || []

  return (
    <div className="section-container">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recognition Boards</h1>
          <p className="mt-2 text-gray-600">
            Create and manage group recognition cards for your team
          </p>
        </div>
        <Link href="/boards/new">
          <Button variant="primary" size="lg" icon={<Plus size={20} />}>
            Create Board
          </Button>
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-medium">Failed to load boards</p>
          <p className="text-sm">Please try refreshing the page</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="card h-64 animate-pulse bg-gray-200"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && boards.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900">No boards yet</h3>
          <p className="mt-2 text-gray-600">
            Create your first recognition board to get started
          </p>
          <Link href="/boards/new" className="mt-4 inline-block">
            <Button variant="primary" icon={<Plus size={20} />}>
              Create your first board
            </Button>
          </Link>
        </div>
      )}

      {/* Boards grid */}
      {!isLoading && boards.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}
    </div>
  )
}
