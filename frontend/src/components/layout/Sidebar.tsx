/**
 * Dashboard sidebar navigation
 */
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { Zap, BarChart3, Settings, Key, LogOut, BookOpen, Users, Plug, X } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/src/store/auth.store'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const pathname = usePathname()
  const params = useParams()
  const { user, org, logout } = useAuthStore()

  // Use the URL param as the canonical slug — it's always correct even after refresh.
  // Fall back to the store value (only present right after login before a refresh).
  const slug = (params?.orgSlug as string) || org?.slug || ''

  const navItems = [
    { label: 'Boards',       href: `/${slug}/dashboard`,    icon: Zap },
    { label: 'Analytics',    href: `/${slug}/analytics`,    icon: BarChart3 },
    { label: 'Employees',    href: `/${slug}/employees`,    icon: Users },
    { label: 'Integrations', href: `/${slug}/integrations`, icon: Plug },
    { label: 'API Keys',     href: `/${slug}/api-keys`,     icon: Key },
    { label: 'Settings',     href: `/${slug}/settings`,     icon: Settings },
    { label: 'API Docs',     href: `/${slug}/docs`,         icon: BookOpen },
  ]

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 z-50 h-screen w-64 border-r border-gray-200 bg-white pt-8 transition-transform duration-300',
        'md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Close button — mobile only */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
        aria-label="Close menu"
      >
        <X size={20} />
      </button>

      {/* Logo */}
      <div className="mb-8 px-6">
        <Link href={`/${slug}/dashboard`} className="flex items-center gap-2" onClick={onClose}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Shoutboard</span>
        </Link>
      </div>

      {/* Org info */}
      {(org || slug) && (
        <div className="mb-8 border-b border-gray-200 px-6 pb-6">
          <p className="text-xs font-medium uppercase text-gray-500">Workspace</p>
          <p className="mt-1 font-medium text-gray-900">{org?.name || slug}</p>
          <p className="mt-0.5 text-xs text-gray-400">{slug}</p>
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
              onClick={onClose}
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
            <p className="mt-1 line-clamp-1 text-sm font-medium text-gray-900">{user.name}</p>
            <p className="line-clamp-1 text-xs text-gray-500">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
