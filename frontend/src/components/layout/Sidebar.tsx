/**
 * Dashboard sidebar navigation
 */
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, BarChart3, Settings, Key, LogOut } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/src/store/auth.store'

export const Sidebar: React.FC = () => {
  const pathname = usePathname()
  const { user, org, logout } = useAuthStore()

  const navItems = [
    {
      label: 'Boards',
      href: '/dashboard',
      icon: Zap,
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
    },
    {
      label: 'API Keys',
      href: '/api-keys',
      icon: Key,
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-gray-200 bg-white pt-8">
      {/* Logo */}
      <div className="mb-8 px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Shoutboard</span>
        </Link>
      </div>

      {/* Org info */}
      {org && (
        <div className="mb-8 border-b border-gray-200 px-6 pb-6">
          <p className="text-xs font-medium uppercase text-gray-500">Workspace</p>
          <p className="mt-1 font-medium text-gray-900">{org.name}</p>
        </div>
      )}

      {/* Nav items */}
      <nav className="space-y-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User section at bottom */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4">
        {user && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500">Logged in as</p>
            <p className="mt-1 line-clamp-1 text-sm font-medium text-gray-900">
              {user.name}
            </p>
            <p className="line-clamp-1 text-xs text-gray-500">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
