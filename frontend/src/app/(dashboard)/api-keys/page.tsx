/**
 * API Keys management page
 */
'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useApiKeys, useCreateApiKey } from '@/src/hooks/useApiKeys'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { Modal } from '@/src/components/ui/Modal'
import { Copy, Plus, Trash2 } from 'lucide-react'

// Validation schema for creating API key
const createApiKeySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  scopes: z.array(z.string()).min(1, 'Select at least one scope'),
})

type CreateApiKeyData = z.infer<typeof createApiKeySchema>

const scopeOptions = [
  { value: 'boards:read', label: 'Read Boards', description: 'View boards and their details' },
  { value: 'boards:write', label: 'Create/Update Boards', description: 'Create and modify boards' },
  { value: 'posts:write', label: 'Write Posts', description: 'Add messages to boards' },
  { value: 'webhooks:manage', label: 'Manage Webhooks', description: 'Configure webhooks' },
]

export default function ApiKeysPage() {
  const { data: apiKeys = [], isLoading } = useApiKeys()
  const createApiKeyMutation = useCreateApiKey()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  const form = useForm<CreateApiKeyData>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: {
      name: '',
      scopes: [],
    },
  })

  const handleCreateApiKey = async (data: CreateApiKeyData) => {
    try {
      await createApiKeyMutation.mutateAsync(data)
      form.reset()
      setIsModalOpen(false)
    } catch (error) {
      console.error('Failed to create API key:', error)
    }
  }

  const handleCopyKey = (keyId: string) => {
    navigator.clipboard.writeText(keyId)
    setCopiedKeyId(keyId)
    setTimeout(() => setCopiedKeyId(null), 2000)
  }

  const toggleScope = (scope: string) => {
    const currentScopes = form.getValues('scopes')
    if (currentScopes.includes(scope)) {
      form.setValue(
        'scopes',
        currentScopes.filter((s) => s !== scope)
      )
    } else {
      form.setValue('scopes', [...currentScopes, scope])
    }
  }

  return (
    <div className="section-container">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="mt-2 text-gray-600">
            Manage API keys for programmatic access to Shoutboard
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          icon={<Plus size={20} />}
          onClick={() => setIsModalOpen(true)}
        >
          Create API Key
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-20 animate-pulse bg-gray-200" />
          ))}
        </div>
      )}

      {/* API Keys table */}
      {!isLoading && apiKeys.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900">No API keys yet</h3>
          <p className="mt-2 text-gray-600">Create your first API key to get started</p>
          <Button
            variant="primary"
            className="mt-4"
            icon={<Plus size={20} />}
            onClick={() => setIsModalOpen(true)}
          >
            Create API Key
          </Button>
        </div>
      )}

      {!isLoading && apiKeys.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Scopes
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Last Used
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {apiKeys.map((key) => (
                <tr key={key.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {key.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {key.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="badge bg-blue-100 text-blue-800"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleCopyKey(key.id)}
                      className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <Copy size={16} />
                      {copiedKeyId === key.id ? 'Copied' : 'Copy'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create API Key Modal */}
      <Modal
        isOpen={isModalOpen}
        title="Create API Key"
        onClose={() => {
          setIsModalOpen(false)
          form.reset()
        }}
      >
        <form
          onSubmit={form.handleSubmit(handleCreateApiKey)}
          className="space-y-6"
        >
          <Input
            label="Key Name"
            placeholder="My Integration Key"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />

          <div>
            <label className="mb-3 block text-sm font-medium text-gray-900">
              Scopes
            </label>
            <div className="space-y-3">
              {scopeOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3"
                >
                  <input
                    type="checkbox"
                    checked={form.watch('scopes').includes(option.value)}
                    onChange={() => toggleScope(option.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {form.formState.errors.scopes && (
              <p className="mt-2 text-sm text-red-600">
                {form.formState.errors.scopes.message}
              </p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <Button
              type="submit"
              variant="primary"
              isLoading={createApiKeyMutation.isPending}
              className="w-full"
            >
              Create API Key
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
