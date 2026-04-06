/**
 * Board-level analytics drill-down
 */
'use client'

import React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useBoardAnalytics } from '@/src/hooks/useAnalytics'
import { useBoard } from '@/src/hooks/useBoards'
import { useAuthStore } from '@/src/store/auth.store'
import { ArrowLeft, Eye, MessageSquare, Users, UserX } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function buildTimelineData(postsPerDay: Record<string, number>) {
  if (!postsPerDay || Object.keys(postsPerDay).length === 0) return []

  const dates = Object.keys(postsPerDay).sort()
  const start = new Date(dates[0])
  const end = new Date(dates[dates.length - 1])
  const result: { date: string; posts: number }[] = []

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0]
    result.push({
      date: new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      posts: postsPerDay[key] ?? 0,
    })
  }
  return result
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color = 'indigo',
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color?: 'indigo' | 'violet' | 'emerald' | 'gray'
}) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    gray: 'bg-gray-100 text-gray-500',
  }
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BoardAnalyticsPage() {
  const params = useParams<{ id: string; orgSlug: string }>()
  const id = params.id
  const { data: analytics, isLoading: analyticsLoading } = useBoardAnalytics(id)
  const { data: board, isLoading: boardLoading } = useBoard(id)
  const { org } = useAuthStore()
  const slug = params.orgSlug || org?.slug || ''

  const isLoading = analyticsLoading || boardLoading
  const timelineData = analytics ? buildTimelineData(analytics.postsPerDay) : []

  return (
    <div className="section-container">
      {/* Back nav */}
      <Link
        href={`/${slug}/analytics`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Analytics
      </Link>

      {/* Header */}
      {isLoading ? (
        <div className="mb-8 animate-pulse space-y-2">
          <div className="h-8 w-72 rounded bg-gray-200" />
          <div className="h-4 w-48 rounded bg-gray-200" />
        </div>
      ) : (
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{board?.title ?? 'Board Analytics'}</h1>
            {analytics?.boardStatus && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                analytics.boardStatus === 'SENT'
                  ? 'bg-green-100 text-green-700'
                  : analytics.boardStatus === 'ACTIVE'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {analytics.boardStatus.toLowerCase()}
              </span>
            )}
          </div>
          <p className="mt-1 text-gray-500">
            For <span className="font-medium text-gray-700">{board?.recipientName}</span>
            {analytics?.createdAt && (
              <span> &middot; Created {formatDate(analytics.createdAt)}</span>
            )}
            {analytics?.sentAt && (
              <span> &middot; Sent {formatDate(analytics.sentAt)}</span>
            )}
          </p>
        </div>
      )}

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 flex items-center gap-4 animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-gray-200" />
              <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-gray-200" />
                <div className="h-7 w-12 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : analytics ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Eye} label="Total Views" value={analytics.viewCount} color="indigo" />
          <StatCard icon={MessageSquare} label="Messages" value={analytics.postCount} color="violet" />
          <StatCard icon={Users} label="Named Contributors" value={analytics.uniqueContributors} color="emerald" />
          <StatCard icon={UserX} label="Anonymous" value={analytics.anonymousContributions} color="gray" />
        </div>
      ) : null}

      {/* Posts timeline */}
      <div className="mt-6 card p-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Message Activity</h2>
        <p className="mb-6 text-sm text-gray-500">Messages added over time</p>

        {isLoading ? (
          <div className="h-64 animate-pulse rounded bg-gray-100" />
        ) : timelineData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-gray-400 text-sm">
            No messages yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timelineData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="postsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                cursor={{ stroke: '#e5e7eb' }}
              />
              <Area
                type="monotone"
                dataKey="posts"
                name="Messages"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#postsGradient)"
                dot={{ r: 4, fill: '#6366f1' }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Contributor breakdown */}
      {!isLoading && analytics && (analytics.uniqueContributors + analytics.anonymousContributions > 0) && (
        <div className="mt-6 card p-6">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">Contributor Breakdown</h2>
          <p className="mb-4 text-sm text-gray-500">Named vs anonymous contributions</p>
          <div className="space-y-3">
            {[
              { label: 'Named contributors', value: analytics.uniqueContributors, color: 'bg-indigo-500' },
              { label: 'Anonymous', value: analytics.anonymousContributions, color: 'bg-violet-400' },
            ].map(({ label, value, color }) => {
              const total = analytics.uniqueContributors + analytics.anonymousContributions
              const pct = total > 0 ? Math.round((value / total) * 100) : 0
              return (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-gray-700">{label}</span>
                    <span className="tabular-nums font-medium text-gray-900">{value} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick link to the board */}
      {!isLoading && board && (
        <div className="mt-6 flex justify-end">
          <Link
            href={`/${slug}/boards/${board.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            View board
            <ArrowLeft size={14} className="rotate-180" />
          </Link>
        </div>
      )}
    </div>
  )
}
