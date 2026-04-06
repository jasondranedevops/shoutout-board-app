/**
 * Signup page with form validation
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
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
})

type SignupFormData = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    try {
      setApiError(null)
      const response = await apiClient.post<AuthResponse>(
        '/auth/register',
        data
      )
      const { token, user, org } = response.data.data
      login(token, user, org)
      window.location.href = `/${org.slug}/dashboard`
    } catch (error: unknown) {
      const err = error as any
      setApiError(
        err.response?.data?.message || 'Failed to create account. Please try again.'
      )
    }
  }

  return (
    <div className="card p-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Get started</h1>
      <p className="mb-6 text-gray-600">Create your Shoutboard account in minutes</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {apiError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        <Input
          label="Full Name"
          type="text"
          placeholder="Jane Doe"
          error={errors.name?.message}
          {...register('name')}
        />

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
          helperText="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Organization Name"
          type="text"
          placeholder="Acme Inc."
          error={errors.orgName?.message}
          {...register('orgName')}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          className="w-full"
        >
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          Sign in
        </Link>
      </p>
    </div>
  )
}
