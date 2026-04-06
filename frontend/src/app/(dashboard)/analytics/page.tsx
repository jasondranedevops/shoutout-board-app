/**
 * Analytics dashboard — org-level metrics wired to real API data
 */
'use client'

import React from 'react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useOrgAnalytics, useAnalyticsTrends } from '@/src/hooks/useAnalytics'
import { useBoards } from '@/src/hooks/useBoards'
import { ArrowRight, TrendingUp } from 'lucide-react'

// ── Skeleton ──────────────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-4 w-24 rounded bg-gray-200" />
      <div className="mt-3 h-10 w-16 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-32 rounded bg-gray-200" />
    </div>
  )
}

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="card p-6 animate-pulse">
      <div className="mb-2 h-5 w-40 rounded bg-gray-200" />
      <div className="mb-6 h-3 w-64 rounded bg-gray-200" />
      <div className={`rounded bg-gray-100`} style={{ height }} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data: orgData, isLoading: orgLoading } = useOrgAnalytics()
  const { data: trends, isLoading: trendsLoading } = useAnalyticsTrends()
  const { data: boardsData, isLoading: boardsLoading } = useBoards(1, 20)

  const boards = Array.isArray(boardsData) ? boardsData : boardsData?.data ?? []

  const stats = orgData
    ? [
        {
          label: 'Total Boards',
          value: orgData.totalBoards,
          sub: `${orgData.boardsSentThisMonth} sent this month`,
        },
        {
          label: 'Contributors',
          value: orgData.totalContributors,
          sub: `${orgData.totalAnonymousContributions} anonymous`,
        },
        {
          label: 'Total Messages',
          value: orgData.totalPosts,
          sub: `avg ${orgData.avgPostsPerBoard} per board`,
        },
      ]
    : []

  return (
    <div className="section-container">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Analytics</h1>
      <p className="mb-8 text-gray-600">Track recognition trends and engagement metrics</p>

      {/* Stat cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {orgLoading
          ? Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
          : stats.map((stat, i) => (
              <div key={i} className="card p-6">
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="mt-2 text-4xl font-bold text-gray-900 tabular-nums">{stat.value}</p>
                <p className="mt-2 text-sm text-gray-500">{stat.sub}</p>
              </div>
            ))}
      </div>

      {/* Monthly activity line chart */}
      <div className="mt-8">
        {trendsLoading ? (
          <ChartSkeleton height={280} />
        ) : (
          <div className="card p-6">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Activity Trends</h2>
            <p className="mb-6 text-sm text-gray-500">Boards, messages, and contributors over the last 6 months</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trends} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                  cursor={{ stroke: '#e5e7eb' }}
                />
                <Legend wrapperStyle={{ fontSize: 13, paddingTop: 16 }} />
                <Line type="monotone" dataKey="posts" name="Messages" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="contributors" name="Contributors" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="boards" name="Boards" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Occasion breakdown bar chart */}
      <div className="mt-6">
        {orgLoading ? (
          <ChartSkeleton height={240} />
        ) : (
          <div className="card p-6">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Boards by Occasion</h2>
            <p className="mb-6 text-sm text-gray-500">What your team is celebrating most</p>
            {orgData?.occasionBreakdown?.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={orgData.occasionBreakdown} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="occasion" tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="count" name="Boards" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-40 items-center justify-center text-gray-400 text-sm">
                No boards yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Boards table */}
      <div className="mt-6 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Board Breakdown</h2>
            <p className="text-sm text-gray-500">Click any board to view detailed analytics</p>
          </div>
          <TrendingUp size={20} className="text-gray-400" />
        </div>

        {boardsLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-48 rounded bg-gray-200" />
                  <div className="h-3 w-32 rounded bg-gray-200" />
                </div>
                <div className="h-3 w-16 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 text-sm">No boards yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {boards.map((board: any) => (
              <Link
                key={board.id}
                href={`/analytics/boards/${board.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900 group-hover:text-indigo-600">
                    {board.title}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    For {board.recipientName} &middot; {board.postCount} message{board.postCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    board.status === 'sent'
                      ? 'bg-green-100 text-green-700'
                      : board.status === 'active'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {board.status}
                  </span>
                  <ArrowRight size={16} className="text-gray-400 group-hover:text-indigo-500" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
