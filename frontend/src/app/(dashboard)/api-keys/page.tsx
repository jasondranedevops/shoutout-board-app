/**
 * API Keys management page
 */
'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '@/src/hooks/useApiKeys'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { Modal } from '@/src/components/ui/Modal'
import { AlertTriangle, Check, Copy, Eye, EyeOff, Plus, Trash2, XCircle } from 'lucide-react'

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

type ModalState = 'closed' | 'create' | 'reveal'

interface NewKeyData {
  name: string
  key: string
  prefix: string
}

export default function ApiKeysPage() {
  const { data: apiKeys = [], isLoading, isFetching } = useApiKeys()
  const createMutation = useCreateApiKey()
  const revokeMutation = useRevokeApiKey()

  const [modalState, setModalState] = useState<ModalState>('closed')
  const [newKeyData, setNewKeyData] = useState<NewKeyData | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [keyVisible, setKeyVisible] = useState(false)
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)

  const form = useForm<CreateApiKeyData>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { name: '', scopes: [] },
  })

  const handleCreate = async (data: CreateApiKeyData) => {
    setCreateError(null)
    try {
      const result = await createMutation.mutateAsync(data)
      setNewKeyData({ name: result.name, key: result.key, prefix: result.prefix })
      setKeyVisible(false)
      setCopiedKey(false)
      form.reset()
      setModalState('reveal')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to create API key'
      setCreateError(msg)
    }
  }

  const handleCopyKey = (value: string, setFlag: (v: boolean) => void) => {
    navigator.clipboard.writeText(value)
    setFlag(true)
    setTimeout(() => setFlag(false), 2000)
  }

  const handleRevoke = async (keyId: string) => {
    setRevokeError(null)
    try {
      await revokeMutation.mutateAsync(keyId)
      setConfirmRevokeId(null)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to revoke API key'
      setRevokeError(msg)
      setConfirmRevokeId(null)
    }
  }

  const closeModal = () => {
    setModalState('closed')
    setNewKeyData(null)
    setCreateError(null)
    form.reset()
  }

  const toggleScope = (scope: string) => {
    const current = form.getValues('scopes')
    form.setValue(
      'scopes',
      current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope]
    )
  }

  return (
    <div className="section-container">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="mt-2 text-gray-600">Manage API keys for programmatic access to Shoutboard</p>
        </div>

        <Button variant="primary" size="lg" icon={<Plus size={20} />} onClick={() => setModalState('create')}>
          Create API Key
        </Button>
      </div>

      {/* Revoke error banner */}
      {revokeError && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <XCircle size={18} className="flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{revokeError}</p>
          <button onClick={() => setRevokeError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Loading / refetch skeleton */}
      {(isLoading || (isFetching && apiKeys.length === 0)) && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-20 animate-pulse bg-gray-100" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && apiKeys.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900">No API keys yet</h3>
          <p className="mt-2 text-gray-600">Create your first API key to get started</p>
          <Button variant="primary" className="mt-4" icon={<Plus size={20} />} onClick={() => setModalState('create')}>
            Create API Key
          </Button>
        </div>
      )}

      {/* Keys table */}
      {!isLoading && apiKeys.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Key</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Scopes</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Last Used</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Created</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(apiKeys as any[]).map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{key.name}</td>
                  <td className="px-6 py-4 font-mono text-sm text-gray-500">
                    {key.keyPrefix ?? key.lastFourChars ?? '••••'}…
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {(key.scopes ?? []).map((scope: string) => (
                        <span key={scope} className="badge bg-indigo-50 text-indigo-700">{scope}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {confirmRevokeId === key.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-gray-500">Revoke this key?</span>
                        <button
                          onClick={() => handleRevoke(key.id)}
                          disabled={revokeMutation.isPending}
                          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmRevokeId(null)}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRevokeId(key.id)}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-600 transition-colors"
                        aria-label="Revoke key"
                      >
                        <Trash2 size={16} />
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create modal ──────────────────────────────────────────────── */}
      <Modal isOpen={modalState === 'create'} title="Create API Key" onClose={closeModal}>
        <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-6">
          {createError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <XCircle size={16} className="flex-shrink-0" />
              {createError}
            </div>
          )}
          <Input
            label="Key Name"
            placeholder="My Integration"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />

          <div>
            <label className="mb-3 block text-sm font-medium text-gray-900">Scopes</label>
            <div className="space-y-3">
              {scopeOptions.map((option) => (
                <label key={option.value} className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.watch('scopes').includes(option.value)}
                    onChange={() => toggleScope(option.value)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {form.formState.errors.scopes && (
              <p className="mt-2 text-sm text-red-600">{form.formState.errors.scopes.message}</p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <Button type="submit" variant="primary" isLoading={createMutation.isPending} className="w-full">
              Create API Key
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Key reveal modal ──────────────────────────────────────────── */}
      <Modal isOpen={modalState === 'reveal'} title="API Key Created" onClose={closeModal} size="md">
        {newKeyData && (
          <div className="space-y-4">
            {/* Warning */}
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-amber-500" />
              <div>
                <p className="font-medium text-amber-800">Save this key now</p>
                <p className="mt-0.5 text-sm text-amber-700">
                  This is the only time your full API key will be shown. Copy it somewhere safe — it cannot be recovered.
                </p>
              </div>
            </div>

            {/* Key name */}
            <div>
              <p className="mb-1 text-sm font-medium text-gray-700">Key name</p>
              <p className="text-gray-900">{newKeyData.name}</p>
            </div>

            {/* Key value */}
            <div>
              <p className="mb-1 text-sm font-medium text-gray-700">Your API key</p>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                <code className="flex-1 overflow-x-auto text-sm text-gray-800 select-all">
                  {keyVisible ? newKeyData.key : '•'.repeat(Math.min(newKeyData.key.length, 40))}
                </code>
                <button
                  onClick={() => setKeyVisible(!keyVisible)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                  aria-label={keyVisible ? 'Hide key' : 'Show key'}
                >
                  {keyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => handleCopyKey(newKeyData.key, setCopiedKey)}
                  className="flex-shrink-0 flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {copiedKey ? <Check size={16} /> : <Copy size={16} />}
                  {copiedKey ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <Button variant="primary" className="w-full" onClick={closeModal}>
                Done — I've saved my key
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
