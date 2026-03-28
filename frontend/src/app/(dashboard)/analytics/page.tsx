/**
 * Analytics dashboard (placeholder)
 */
'use client'

import React from 'react'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="section-container">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Analytics</h1>
      <p className="mb-8 text-gray-600">
        Track recognition trends and engagement metrics
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Total Boards', value: '24', change: '+12% this month' },
          { label: 'Contributors', value: '156', change: '+8% this month' },
          { label: 'Messages Sent', value: '847', change: '+24% this month' },
        ].map((stat, i) => (
          <div key={i} className="card p-6">
            <p className="text-sm text-gray-600">{stat.label}</p>
            <p className="mt-2 text-4xl font-bold text-gray-900">
              {stat.value}
            </p>
            <p className="mt-2 text-sm text-green-600">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 card p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <BarChart3 size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Charts coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}
