/**
 * Analytics dashboard
 */
'use client'

import React from 'react'
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

const monthlyData = [
  { month: 'Nov', boards: 3, messages: 41, contributors: 18 },
  { month: 'Dec', boards: 5, messages: 78, contributors: 31 },
  { month: 'Jan', boards: 4, messages: 62, contributors: 24 },
  { month: 'Feb', boards: 7, messages: 110, contributors: 45 },
  { month: 'Mar', boards: 9, messages: 156, contributors: 62 },
  { month: 'Apr', boards: 6, messages: 92, contributors: 38 },
]

const occasionData = [
  { occasion: 'Birthday', count: 8 },
  { occasion: 'Farewell', count: 6 },
  { occasion: 'Anniversary', count: 4 },
  { occasion: 'Welcome', count: 3 },
  { occasion: 'Promotion', count: 2 },
  { occasion: 'Custom', count: 1 },
]

const stats = [
  { label: 'Total Boards', value: '24', change: '+12% this month' },
  { label: 'Contributors', value: '156', change: '+8% this month' },
  { label: 'Messages Sent', value: '847', change: '+24% this month' },
]

export default function AnalyticsPage() {
  return (
    <div className="section-container">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Analytics</h1>
      <p className="mb-8 text-gray-600">
        Track recognition trends and engagement metrics
      </p>

      {/* Stat cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => (
          <div key={i} className="card p-6">
            <p className="text-sm text-gray-600">{stat.label}</p>
            <p className="mt-2 text-4xl font-bold text-gray-900">{stat.value}</p>
            <p className="mt-2 text-sm text-green-600">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Board activity line chart */}
      <div className="mt-8 card p-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Board Activity</h2>
        <p className="mb-6 text-sm text-gray-500">Boards created, messages, and contributors per month</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
              cursor={{ stroke: '#e5e7eb' }}
            />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 16 }} />
            <Line
              type="monotone"
              dataKey="messages"
              name="Messages"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 4, fill: '#6366f1' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="contributors"
              name="Contributors"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#8b5cf6' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="boards"
              name="Boards"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4, fill: '#10b981' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Occasion type bar chart */}
      <div className="mt-6 card p-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Boards by Occasion</h2>
        <p className="mb-6 text-sm text-gray-500">What your team is celebrating most</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={occasionData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="occasion" tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
              cursor={{ fill: '#f8fafc' }}
            />
            <Bar dataKey="count" name="Boards" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
