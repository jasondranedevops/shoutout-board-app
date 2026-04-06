/**
 * Organization settings page
 */
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/store/auth.store'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { AlertCircle, Check, Plus, X } from 'lucide-react'
import apiClient from '@/src/lib/api'

// ── Schemas ─────────────────────────────────────────────────────────────────

const settingsSchema = z.object({
  orgName: z.string().min(2, 'Organization name is required'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
})

const webhookSchema = z.object({
  url: z.string().url('Must be a valid URL (https://…)'),
})

type SettingsFormData = z.infer<typeof settingsSchema>
type WebhookFormData = z.infer<typeof webhookSchema>

const WEBHOOK_EVENTS = [
  { value: 'board.created',   label: 'Board Created' },
  { value: 'board.published', label: 'Board Published' },
  { value: 'post.created',    label: 'Post Created' },
]

// ── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { org, user, setOrg } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [showWebhookForm, setShowWebhookForm] = useState(false)
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['board.created', 'board.published', 'post.created'])
  const [webhookError, setWebhookError] = useState<string | null>(null)

  // ── Settings form ──────────────────────────────────────────────────────────
  const settingsForm = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { orgName: org?.name ?? '', slug: org?.slug ?? '' },
  })

  // Re-populate when org data arrives (e.g. after page refresh)
  useEffect(() => {
    if (org) {
      settingsForm.reset({ orgName: org.name, slug: org.slug })
    }
  }, [org?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const response = await apiClient.patch<any>('/v1/org', {
        name: data.orgName,
        slug: data.slug,
      })
      return response.data.data?.org ?? response.data.data ?? response.data
    },
    onSuccess: (updatedOrg) => {
      setOrg({ ...org!, name: updatedOrg.name, slug: updatedOrg.slug })
      settingsForm.reset({ orgName: updatedOrg.name, slug: updatedOrg.slug })
      setSettingsSaved(true)
      setSettingsError(null)
      setTimeout(() => setSettingsSaved(false), 3000)
      // If slug changed, navigate to the new URL
      if (updatedOrg.slug !== org?.slug) {
        router.replace(`/${updatedOrg.slug}/settings`)
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to save settings'
      setSettingsError(msg)
    },
  })

  const handleSaveSettings = (data: SettingsFormData) => {
    setSettingsError(null)
    saveSettingsMutation.mutate(data)
  }

  // ── Webhooks ───────────────────────────────────────────────────────────────
  const { data: webhooksData, isLoading: webhooksLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/v1/webhooks')
      return response.data.data?.webhooks ?? []
    },
  })
  const webhooks: any[] = webhooksData ?? []

  const webhookForm = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
  })

  const createWebhookMutation = useMutation({
    mutationFn: async (data: WebhookFormData) => {
      const response = await apiClient.post<any>('/v1/webhooks', {
        url: data.url,
        events: webhookEvents,
      })
      return response.data.data ?? response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      webhookForm.reset()
      setShowWebhookForm(false)
      setWebhookError(null)
      setWebhookEvents(['board.created', 'board.published', 'post.created'])
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to add webhook'
      setWebhookError(msg)
    },
  })

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/v1/webhooks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })

  const toggleEvent = (event: string) => {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  return (
    <div className="section-container max-w-3xl">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Settings</h1>

      {/* ── Organization ──────────────────────────────────────────────────── */}
      <div className="mb-8 card p-6">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">Organization</h2>

        {settingsError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <X size={16} className="flex-shrink-0" />
            {settingsError}
            <button onClick={() => setSettingsError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
        )}

        {settingsSaved && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <Check size={16} className="flex-shrink-0" />
            Settings saved successfully
          </div>
        )}

        <form onSubmit={settingsForm.handleSubmit(handleSaveSettings)} className="space-y-6">
          <Input
            label="Organization Name"
            error={settingsForm.formState.errors.orgName?.message}
            {...settingsForm.register('orgName')}
          />

          <Input
            label="Workspace Slug"
            placeholder="your-org"
            helperText="Used for workspace URLs (your-org.shoutboard.io)"
            error={settingsForm.formState.errors.slug?.message}
            {...settingsForm.register('slug')}
          />

          <div className="border-t border-gray-200 pt-6">
            <Button
              type="submit"
              variant="primary"
              isLoading={saveSettingsMutation.isPending}
            >
              Save Settings
            </Button>
          </div>
        </form>
      </div>

      {/* ── Webhooks ──────────────────────────────────────────────────────── */}
      <div className="mb-8 card p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Webhooks</h2>
          {!showWebhookForm && (
            <Button
              variant="outline"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setShowWebhookForm(true)}
            >
              Add Webhook
            </Button>
          )}
        </div>

        {webhookError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <X size={16} className="flex-shrink-0" />
            {webhookError}
            <button onClick={() => setWebhookError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Add webhook form */}
        {showWebhookForm && (
          <form
            onSubmit={webhookForm.handleSubmit((data) => createWebhookMutation.mutate(data))}
            className="mb-6 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            <Input
              label="Webhook URL"
              placeholder="https://example.com/webhooks/shoutboard"
              error={webhookForm.formState.errors.url?.message}
              {...webhookForm.register('url')}
            />

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Events</p>
              <div className="flex flex-wrap gap-3">
                {WEBHOOK_EVENTS.map((ev) => (
                  <label key={ev.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookEvents.includes(ev.value)}
                      onChange={() => toggleEvent(ev.value)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{ev.label}</span>
                  </label>
                ))}
              </div>
              {webhookEvents.length === 0 && (
                <p className="mt-1 text-xs text-red-500">Select at least one event</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={createWebhookMutation.isPending}
                disabled={webhookEvents.length === 0}
              >
                Add
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowWebhookForm(false)
                  webhookForm.reset()
                  setWebhookError(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Loading */}
        {webhooksLoading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!webhooksLoading && webhooks.length === 0 && !showWebhookForm && (
          <p className="text-gray-600">No webhooks configured yet. Add one to receive event notifications.</p>
        )}

        {/* Webhooks list */}
        {!webhooksLoading && webhooks.length > 0 && (
          <div className="space-y-3">
            {webhooks.map((webhook: any) => (
              <div
                key={webhook.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-gray-700 truncate">{webhook.url}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${webhook.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-xs text-gray-500">{webhook.active ? 'Active' : 'Inactive'}</span>
                    {(webhook.events ?? []).map((ev: string) => (
                      <span key={ev} className="badge bg-indigo-50 text-indigo-700 text-xs">{ev}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                  disabled={deleteWebhookMutation.isPending}
                  className="ml-4 flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                  aria-label="Remove webhook"
                >
                  <X size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Danger Zone ───────────────────────────────────────────────────── */}
      {user?.role === 'ADMIN' && (
        <div className="card border-red-200 p-6">
          <div className="mb-6 flex items-start gap-3">
            <AlertCircle size={24} className="mt-0.5 flex-shrink-0 text-red-600" />
            <div>
              <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
              <p className="mt-1 text-sm text-gray-600">
                Irreversible actions that affect your entire organization
              </p>
            </div>
          </div>
          <div className="space-y-3 border-t border-red-200 pt-6">
            <p className="text-sm text-gray-600">Delete your entire organization, all boards, and data.</p>
            <Button variant="danger">Delete Organization</Button>
          </div>
        </div>
      )}
    </div>
  )
}
