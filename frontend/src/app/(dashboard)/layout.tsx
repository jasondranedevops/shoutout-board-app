/**
 * Dashboard layout with sidebar and top bar
 */
'use client'

import React from 'react'
import { Sidebar } from '@/src/components/layout/Sidebar'
import { TopBar } from '@/src/components/layout/TopBar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="ml-64 flex-1">
        {/* Top bar */}
        <TopBar />

        {/* Page content */}
        <main className="pt-24">
          {children}
        </main>
      </div>
    </div>
  )
}
