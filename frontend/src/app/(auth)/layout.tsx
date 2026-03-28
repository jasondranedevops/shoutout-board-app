/**
 * Auth layout - centered, minimal design
 */
import React from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50 px-4 py-12">
      {/* Logo */}
      <Link
        href="/"
        className="mb-8 flex items-center gap-2"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
          <Zap size={24} className="text-white" />
        </div>
        <span className="text-2xl font-bold text-gray-900">Shoutboard</span>
      </Link>

      {/* Content */}
      <div className="w-full max-w-md animate-fade-in">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-12 text-center text-sm text-gray-500">
        Recognition that lives where your team works
      </p>
    </div>
  )
}
