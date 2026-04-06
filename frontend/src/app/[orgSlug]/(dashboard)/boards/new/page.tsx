/**
 * Multi-step board creation wizard
 */
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { useCreateBoard } from '@/src/hooks/useBoards'
import { OccasionType } from '@/src/types'
import { useAuthStore } from '@/src/store/auth.store'
import apiClient from '@/src/lib/api'

// Step 1 schema
const step1Schema = z.object({
  occasionType: z.enum([
    'birthday',
    'anniversary',
    'farewell',
    'promotion',
    'welcome',
    'custom',
  ] as const),
  recipientName: z.string().min(2, 'Recipient name is required'),
  recipientEmail: z.string().email('Valid email required').optional().or(z.literal('')),
})

// Step 2 schema
const step2Schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  coverTheme: z.enum([
    'indigo',
    'violet',
    'rose',
    'emerald',
    'blue',
    'orange',
  ] as const),
})

// Step 3 schema
const step3Schema = z.object({
  sendOption: z.enum(['now', 'schedule', 'link'] as const),
  scheduledAt: z.string().optional(),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>

const occasions = [
  { value: 'birthday', label: 'Birthday', emoji: '🎂' },
  { value: 'anniversary', label: 'Anniversary', emoji: '🎉' },
  { value: 'farewell', label: 'Farewell', emoji: '👋' },
  { value: 'promotion', label: 'Promotion', emoji: '🚀' },
  { value: 'welcome', label: 'Welcome', emoji: '👋' },
  { value: 'custom', label: 'Custom', emoji: '💌' },
]

const themes = [
  { value: 'indigo', label: 'Indigo', gradient: 'from-indigo-400 to-indigo-600' },
  { value: 'violet', label: 'Violet', gradient: 'from-violet-400 to-violet-600' },
  { value: 'rose', label: 'Rose', gradient: 'from-rose-400 to-rose-600' },
  { value: 'emerald', label: 'Emerald', gradient: 'from-emerald-400 to-emerald-600' },
  { value: 'blue', label: 'Blue', gradient: 'from-blue-400 to-blue-600' },
  { value: 'orange', label: 'Orange', gradient: 'from-orange-400 to-orange-600' },
]

export default function NewBoardPage() {
  const router = useRouter()
  const { org } = useAuthStore()
  const slug = org?.slug ?? ''
  const [step, setStep] = useState(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null)
  const createBoardMutation = useCreateBoard()
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Step 1 form
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      occasionType: 'birthday',
      recipientName: '',
      recipientEmail: '',
    },
  })

  // Step 2 form
  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      title: '',
      coverTheme: 'indigo',
    },
  })

  // Step 3 form
  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      sendOption: 'now',
    },
  })

  const handleStep1Submit = async (data: Step1Data) => {
    setStep1Data(data)
    setStep(2)
  }

  const handleStep2Submit = async (data: Step2Data) => {
    setStep2Data(data)
    setStep(3)
  }

  const handleStep3Submit = async (data: Step3Data) => {
    if (!step1Data || !step2Data) return

    setSubmitError(null)
    try {
      const boardData = {
        occasionType: step1Data.occasionType.toUpperCase() as any,
        recipientName: step1Data.recipientName,
        recipientEmail: step1Data.recipientEmail || undefined,
        title: step2Data.title,
        coverTheme: step2Data.coverTheme,
      }

      const result = await createBoardMutation.mutateAsync(boardData)

      if (data.sendOption === 'now') {
        // Send immediately — marks SENT and makes link live
        await apiClient.post(`/v1/boards/${result.id}/send`)
      } else if (data.sendOption === 'schedule' && data.scheduledAt) {
        // Schedule for a future date — link goes live at that time
        await apiClient.post(`/v1/boards/${result.id}/schedule`, {
          scheduledAt: new Date(data.scheduledAt).toISOString(),
        })
      } else if (data.sendOption === 'link') {
        // Activate immediately for contribution gathering
        await apiClient.post(`/v1/boards/${result.id}/activate`)
      }

      router.push(`/${slug}/boards/${result.id}`)
    } catch (error: any) {
      setSubmitError(error?.response?.data?.error?.message || 'Failed to create board. Please try again.')
    }
  }

  return (
    <div className="section-container max-w-2xl">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Create Recognition Board</h1>

      {/* Progress indicator */}
      <div className="mb-8 flex gap-4">
        {[1, 2, 3].map((num) => (
          <div
            key={num}
            className={`h-2 flex-1 rounded-full transition-colors ${
              num <= step ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Occasion and Recipient */}
      {step === 1 && (
        <div className="card p-6">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Step 1: Occasion & Recipient</h2>

          <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
            {/* Occasion type */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-900">
                What's the occasion?
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {occasions.map((occ) => (
                  <button
                    key={occ.value}
                    type="button"
                    onClick={() =>
                      step1Form.setValue(
                        'occasionType',
                        occ.value as typeof step1Data.occasionType
                      )
                    }
                    className={`rounded-lg border-2 p-4 text-center transition-all ${
                      step1Form.watch('occasionType') === occ.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl">{occ.emoji}</div>
                    <div className="mt-2 text-sm font-medium text-gray-900">
                      {occ.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient name */}
            <Input
              label="Recipient Name"
              placeholder="Jane Smith"
              error={step1Form.formState.errors.recipientName?.message}
              {...step1Form.register('recipientName')}
            />

            {/* Recipient email (optional) */}
            <Input
              label="Recipient Email (optional)"
              type="email"
              placeholder="jane@example.com"
              error={step1Form.formState.errors.recipientEmail?.message}
              {...step1Form.register('recipientEmail')}
            />

            <div className="flex gap-3 pt-6">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Board Details */}
      {step === 2 && (
        <div className="card p-6">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Step 2: Board Details</h2>

          <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6">
            {/* Title */}
            <Input
              label="Board Title"
              placeholder="Happy Birthday, Jane!"
              error={step2Form.formState.errors.title?.message}
              {...step2Form.register('title')}
            />

            {/* Cover theme */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-900">
                Cover Theme
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {themes.map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() =>
                      step2Form.setValue(
                        'coverTheme',
                        theme.value as typeof step2Data.coverTheme
                      )
                    }
                    className={`rounded-lg border-2 p-4 transition-all ${
                      step2Form.watch('coverTheme') === theme.value
                        ? 'border-indigo-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`mb-2 h-12 rounded-lg bg-gradient-to-br ${theme.gradient}`}
                    />
                    <div className="text-sm font-medium text-gray-900">
                      {theme.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Review & Send */}
      {step === 3 && (
        <div className="card p-6">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Step 3: Review & Send</h2>

          {/* Summary */}
          <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4">
            <div>
              <p className="text-sm text-gray-600">Board Title</p>
              <p className="font-medium text-gray-900">{step2Data?.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">For</p>
              <p className="font-medium text-gray-900">{step1Data?.recipientName}</p>
            </div>
          </div>

          {submitError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <p className="font-medium">Something went wrong</p>
              <p className="text-sm">{submitError}</p>
            </div>
          )}

          <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-6">
            {/* Send option */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-900">
                How would you like to send this?
              </label>
              <div className="space-y-3">
                {[
                  {
                    value: 'now',
                    label: 'Send Now',
                    description: 'Board is finalized immediately',
                  },
                  {
                    value: 'schedule',
                    label: 'Schedule',
                    description: 'Choose a date and time to send',
                  },
                  {
                    value: 'link',
                    label: 'Get Shareable Link',
                    description: 'Share the board link to gather contributions first',
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer gap-3 rounded-lg border-2 p-3 transition-all ${
                      step3Form.watch('sendOption') === option.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={option.value}
                      {...step3Form.register('sendOption')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{option.label}</p>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Schedule date if selected */}
            {step3Form.watch('sendOption') === 'schedule' && (
              <Input
                label="Send Date & Time"
                type="datetime-local"
                error={step3Form.formState.errors.scheduledAt?.message}
                {...step3Form.register('scheduledAt')}
              />
            )}

            <div className="flex gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={createBoardMutation.isPending}
                className="flex-1"
              >
                Create Board
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
