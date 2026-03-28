/**
 * Organization settings page
 */
'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/src/store/auth.store'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { Plus, X, AlertCircle } from 'lucide-react'

// Validation schemas
const settingsSchema = z.object({
  orgName: z.string().min(2, 'Organization name is required'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
})

const webhookSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
})

type SettingsFormData = z.infer<typeof settingsSchema>
type WebhookFormData = z.infer<typeof webhookSchema>

export default function SettingsPage() {
  const { org, user } = useAuthStore()
  const [webhooks, setWebhooks] = useState<Array<{ id: string; url: string; active: boolean }>>([])
  const [showWebhookForm, setShowWebhookForm] = useState(false)

  const settingsForm = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      orgName: org?.name || '',
      slug: org?.slug || '',
    },
  })

  const webhookForm = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
  })

  const handleSaveSettings = async (data: SettingsFormData) => {
    // TODO: Call API to update settings
    console.log('Saving settings:', data)
  }

  const handleAddWebhook = async (data: WebhookFormData) => {
    // TODO: Call API to create webhook
    setWebhooks([
      ...webhooks,
      {
        id: `webhook-${Date.now()}`,
        url: data.url,
        active: true,
      },
    ])
    webhookForm.reset()
    setShowWebhookForm(false)
  }

  const handleRemoveWebhook = (id: string) => {
    // TODO: Call API to delete webhook
    setWebhooks(webhooks.filter((w) => w.id !== id))
  }

  return (
    <div className="section-container max-w-3xl">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Settings</h1>

      {/* Organization Settings */}
      <div className="mb-8 card p-6">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">Organization</h2>

        <form
          onSubmit={settingsForm.handleSubmit(handleSaveSettings)}
          className="space-y-6"
        >
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
              isLoading={settingsForm.formState.isSubmitting}
            >
              Save Settings
            </Button>
          </div>
        </form>
      </div>

      {/* Webhooks */}
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

        {/* Add webhook form */}
        {showWebhookForm && (
          <form
            onSubmit={webhookForm.handleSubmit(handleAddWebhook)}
            className="mb-6 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            <Input
              label="Webhook URL"
              placeholder="https://example.com/webhooks/shoutboard"
              error={webhookForm.formState.errors.url?.message}
              {...webhookForm.register('url')}
            />
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={webhookForm.formState.isSubmitting}
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
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Webhooks list */}
        {webhooks.length === 0 && !showWebhookForm && (
          <p className="text-gray-600">
            No webhooks configured yet. Add one to receive event notifications.
          </p>
        )}

        {webhooks.length > 0 && (
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div className="flex-1">
                  <p className="font-mono text-sm text-gray-600">{webhook.url}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        webhook.active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-xs text-gray-600">
                      {webhook.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveWebhook(webhook.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  aria-label="Remove webhook"
                >
                  <X size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      {user?.role === 'admin' && (
        <div className="card border-red-200 p-6">
          <div className="mb-6 flex items-start gap-3">
            <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
              <p className="mt-1 text-sm text-gray-600">
                Irreversible actions that affect your entire organization
              </p>
            </div>
          </div>

          <div className="space-y-3 border-t border-red-200 pt-6">
            <p className="text-sm text-gray-600">
              Delete your entire organization, all boards, and data.
            </p>
            <Button variant="danger">Delete Organization</Button>
          </div>
        </div>
      )}
    </div>
  )
}
