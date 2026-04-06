/**
 * Dashboard top bar with page title and user dropdown
 */
'use client'

import React, { useState } from 'react'
import { useAuthStore } from '@/src/store/auth.store'
import { LogOut, Menu, Settings } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface TopBarProps {
  title?: string
  onMenuClick?: () => void
}

export const TopBar: React.FC<TopBarProps> = ({ title, onMenuClick }) => {
  const { user, org, logout } = useAuthStore()
  const params = useParams()
  const slug = (params?.orgSlug as string) || org?.slug || ''
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const userInitials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-gray-200 bg-white md:left-64">
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={onMenuClick}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors md:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          {/* Title */}
          {title && <h1 className="text-xl font-semibold text-gray-900">{title}</h1>}
        </div>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
            aria-label="User menu"
          >
            <span className="text-sm font-bold text-indigo-600">
              {userInitials}
            </span>
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-30"
                onClick={() => setDropdownOpen(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 z-40 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
                {user && (
                  <>
                    <div className="border-b border-gray-200 px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </>
                )}

                <Link
                  href={`/${slug}/settings`}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings size={16} />
                  Settings
                </Link>

                <button
                  onClick={() => {
                    logout()
                    setDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-200"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
