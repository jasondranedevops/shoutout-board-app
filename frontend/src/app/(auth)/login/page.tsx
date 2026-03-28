/**
 * Login page with email/password form
 */
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import apiClient from '@/src/lib/api'
import { useAuthStore } from '@/src/store/auth.store'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { AuthResponse } from '@/src/types'

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setApiError(null)
      const response = await apiClient.post<AuthResponse>(
        '/auth/login',
        data
      )
      const { token, user, org } = response.data.data
      login(token, user, org)
      router.push('/dashboard')
    } catch (error: unknown) {
      const err = error as any
      setApiError(
        err.response?.data?.message || 'Failed to login. Please try again.'
      )
    }
  }

  return (
    <div className="card p-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Welcome back</h1>
      <p className="mb-6 text-gray-600">Sign in to your Shoutboard account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {apiError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          className="w-full"
        >
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">
          Create one
        </Link>
      </p>
    </div>
  )
}
