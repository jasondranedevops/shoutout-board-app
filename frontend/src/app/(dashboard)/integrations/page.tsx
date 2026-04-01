'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, ExternalLink, Trash2, Hash, Settings, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import apiClient from '@/src/lib/api'
import { useAuthStore } from '@/src/store/auth.store'

interface SlackInstallation {
  id: string
  teamName: string
  incomingChannel: string | null
  createdAt: string
}

interface ZoomInstallation {
  id: string
  accountId: string
  accountName: string | null
  createdAt: string
}

interface SlackAppConfig {
  clientId: string
  hasClientSecret: boolean
  hasSigningSecret: boolean
  createdAt: string
}

interface ZoomAppConfig {
  clientId: string
  botJid: string | null
  hasClientSecret: boolean
  hasVerificationToken: boolean
  createdAt: string
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  id?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 pr-10 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

export default function IntegrationsPage() {
  const { org, user } = useAuthStore()
  const orgId = org?.id || user?.orgId || ''
  const qc = useQueryClient()
  const [channel, setChannel] = useState('')
  const [channelSaved, setChannelSaved] = useState(false)

  // Slack config form state
  const [showSlackConfigForm, setShowSlackConfigForm] = useState(false)
  const [slackConfigForm, setSlackConfigForm] = useState({
    clientId: '',
    clientSecret: '',
    signingSecret: '',
  })
  const [slackConfigSaved, setSlackConfigSaved] = useState(false)

  // Zoom config form state
  const [showZoomConfigForm, setShowZoomConfigForm] = useState(false)
  const [zoomConfigForm, setZoomConfigForm] = useState({
    clientId: '',
    clientSecret: '',
    botJid: '',
    verificationToken: '',
  })
  const [zoomConfigSaved, setZoomConfigSaved] = useState(false)

  // Check URL params for OAuth result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const slack = params.get('slack')
    const zoom = params.get('zoom')
    if (slack || zoom) {
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
      if (slack === 'success') qc.invalidateQueries({ queryKey: ['slack-status'] })
      if (zoom === 'success') qc.invalidateQueries({ queryKey: ['zoom-status'] })
    }
  }, [qc])

  // ── Zoom queries & mutations ───────────────────────────────────────────────

  const { data: zoomData } = useQuery({
    queryKey: ['zoom-status'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/zoom/status')
      return res.data.data as { installation: ZoomInstallation | null; webhookUrl: string }
    },
  })

  const { data: zoomConfigData } = useQuery({
    queryKey: ['zoom-app-config'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/zoom/app-config')
      return res.data.data.config as ZoomAppConfig | null
    },
  })

  const zoomInstallation = zoomData?.installation ?? null
  const zoomWebhookUrl = zoomData?.webhookUrl ?? ''
  const zoomAppConfig = zoomConfigData ?? null

  const handleConnectZoom = async () => {
    const res = await apiClient.get('/v1/zoom/oauth/install-url')
    window.location.href = res.data.data.url
  }

  const disconnectZoomMutation = useMutation({
    mutationFn: () => apiClient.delete('/v1/zoom'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zoom-status'] }),
  })

  const saveZoomConfigMutation = useMutation({
    mutationFn: (data: typeof zoomConfigForm) =>
      apiClient.put('/v1/zoom/app-config', {
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        botJid: data.botJid || undefined,
        verificationToken: data.verificationToken || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zoom-app-config'] })
      setShowZoomConfigForm(false)
      setZoomConfigSaved(true)
      setZoomConfigForm({ clientId: '', clientSecret: '', botJid: '', verificationToken: '' })
      setTimeout(() => setZoomConfigSaved(false), 3000)
    },
  })

  const deleteZoomConfigMutation = useMutation({
    mutationFn: () => apiClient.delete('/v1/zoom/app-config'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zoom-app-config'] }),
  })

  // ── Slack queries & mutations ──────────────────────────────────────────────

  const { data: slackData, isLoading } = useQuery({
    queryKey: ['slack-status'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/slack/status')
      return res.data.data.installation as SlackInstallation | null
    },
  })

  const { data: slackConfigData } = useQuery({
    queryKey: ['slack-app-config'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/slack/app-config')
      return res.data.data.config as SlackAppConfig | null
    },
  })

  const slackAppConfig = slackConfigData ?? null

  const channelMutation = useMutation({
    mutationFn: (incomingChannel: string) =>
      apiClient.patch('/v1/slack/channel', { incomingChannel }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slack-status'] })
      setChannelSaved(true)
      setTimeout(() => setChannelSaved(false), 2000)
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: () => apiClient.delete('/v1/slack'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slack-status'] }),
  })

  const saveSlackConfigMutation = useMutation({
    mutationFn: (data: typeof slackConfigForm) =>
      apiClient.put('/v1/slack/app-config', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slack-app-config'] })
      setShowSlackConfigForm(false)
      setSlackConfigSaved(true)
      setSlackConfigForm({ clientId: '', clientSecret: '', signingSecret: '' })
      setTimeout(() => setSlackConfigSaved(false), 3000)
    },
  })

  const deleteSlackConfigMutation = useMutation({
    mutationFn: () => apiClient.delete('/v1/slack/app-config'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slack-app-config'] }),
  })

  const installation = slackData ?? null

  // Pre-fill channel from existing config
  useEffect(() => {
    if (installation?.incomingChannel) {
      setChannel(installation.incomingChannel)
    }
  }, [installation])

  const handleConnectSlack = async () => {
    const res = await apiClient.get('/v1/slack/oauth/install-url')
    window.location.href = res.data.data.url
  }

  const handleSaveChannel = () => {
    if (channel.trim()) {
      channelMutation.mutate(channel.trim())
    }
  }

  const handleSaveSlackConfig = () => {
    if (!slackConfigForm.clientId || !slackConfigForm.clientSecret || !slackConfigForm.signingSecret) return
    saveSlackConfigMutation.mutate(slackConfigForm)
  }

  const handleSaveZoomConfig = () => {
    if (!zoomConfigForm.clientId || !zoomConfigForm.clientSecret) return
    saveZoomConfigMutation.mutate(zoomConfigForm)
  }

  return (
    <div className="section-container max-w-3xl">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Integrations</h1>
      <p className="mb-10 text-gray-500">
        Connect Shoutboard to your team's tools for seamless recognition workflows.
      </p>

      {/* Slack */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Slack logo */}
            <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-[#4A154B] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Slack</h2>
                {installation ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle size={12} /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                    <XCircle size={12} /> Not connected
                  </span>
                )}
                {slackConfigSaved && (
                  <span className="text-xs text-green-600 font-medium">Credentials saved</span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Create boards with <code className="rounded bg-gray-100 px-1 text-xs">/shoutboard</code>, get notified when boards are ready and sent.
              </p>

              {installation && (
                <p className="mt-1 text-sm text-gray-600">
                  Connected to <strong>{installation.teamName}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2">
            {installation ? (
              <Button
                variant="outline"
                size="sm"
                icon={<Trash2 size={14} />}
                isLoading={disconnectMutation.isPending}
                onClick={() => {
                  if (confirm('Disconnect Slack from Shoutboard?')) {
                    disconnectMutation.mutate()
                  }
                }}
              >
                Disconnect
              </Button>
            ) : slackAppConfig ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ExternalLink size={14} />}
                  onClick={handleConnectSlack}
                >
                  Connect Slack
                </Button>
                <button
                  onClick={() => {
                    setSlackConfigForm((f) => ({
                      ...f,
                      clientId: slackAppConfig?.clientId ?? '',
                    }))
                    setShowSlackConfigForm((v) => !v)
                  }}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
                >
                  <Settings size={12} /> Edit credentials
                </button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                icon={<Settings size={14} />}
                onClick={() => {
                  setSlackConfigForm((f) => ({
                    ...f,
                    clientId: slackAppConfig?.clientId ?? '',
                  }))
                  setShowSlackConfigForm((v) => !v)
                }}
              >
                Configure
              </Button>
            )}
          </div>
        </div>

        {/* Slack app config form */}
        {showSlackConfigForm && !installation && (
          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="mb-1 text-sm font-semibold text-gray-800">Slack app credentials</h3>
            <p className="mb-4 text-sm text-gray-500">
              Create a Slack app at{' '}
              <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                api.slack.com/apps
              </a>
              , then enter your credentials below.
            </p>
            {slackAppConfig && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Credentials already saved (Client ID: <strong>{slackAppConfig.clientId}</strong>). Enter new values to update.
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="slack-client-id">
                  Client ID
                </label>
                <input
                  id="slack-client-id"
                  type="text"
                  value={slackConfigForm.clientId}
                  onChange={(e) => setSlackConfigForm((f) => ({ ...f, clientId: e.target.value }))}
                  placeholder="1234567890.1234567890"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="slack-client-secret">
                  Client Secret
                </label>
                <PasswordInput
                  id="slack-client-secret"
                  value={slackConfigForm.clientSecret}
                  onChange={(v) => setSlackConfigForm((f) => ({ ...f, clientSecret: v }))}
                  placeholder="abcdef1234567890abcdef1234567890"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="slack-signing-secret">
                  Signing Secret
                </label>
                <PasswordInput
                  id="slack-signing-secret"
                  value={slackConfigForm.signingSecret}
                  onChange={(v) => setSlackConfigForm((f) => ({ ...f, signingSecret: v }))}
                  placeholder="abcdef1234567890abcdef1234567890"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                isLoading={saveSlackConfigMutation.isPending}
                onClick={handleSaveSlackConfig}
                disabled={!slackConfigForm.clientId || !slackConfigForm.clientSecret || !slackConfigForm.signingSecret}
              >
                Save credentials
              </Button>
              <button
                onClick={() => {
                  setShowSlackConfigForm(false)
                  setSlackConfigForm({ clientId: '', clientSecret: '', signingSecret: '' })
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              {slackAppConfig && (
                <button
                  onClick={() => {
                    if (confirm('Remove saved Slack credentials?')) {
                      deleteSlackConfigMutation.mutate()
                      setShowSlackConfigForm(false)
                    }
                  }}
                  className="ml-auto text-xs text-red-500 hover:text-red-700"
                >
                  Remove credentials
                </button>
              )}
            </div>
          </div>
        )}

        {/* Channel config — only show when connected */}
        {installation && (
          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="mb-1 text-sm font-semibold text-gray-800">Notification channel</h3>
            <p className="mb-3 text-sm text-gray-500">
              Shoutboard will post to this channel when boards are created and sent.
            </p>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="general"
                  className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                isLoading={channelMutation.isPending}
                onClick={handleSaveChannel}
              >
                {channelSaved ? '✓ Saved' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {/* Slash command reference */}
        {installation && (
          <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Slash commands
            </p>
            <div className="space-y-1.5 text-sm">
              {[
                { cmd: '/shoutboard list', desc: 'Show recent boards' },
                { cmd: '/shoutboard create "Title" for Name', desc: 'Create a board (open immediately)' },
                { cmd: '/shoutboard create "Title" for Name on Dec 25', desc: 'Create & schedule send date' },
                { cmd: '/shoutboard create "Title" for Name on Dec 25 at 9am', desc: 'Create with date & time' },
                { cmd: '/shoutboard schedule "Title" on Dec 25 at 9am', desc: 'Set/update send date on existing board' },
                { cmd: '/shoutboard help', desc: 'Show all commands' },
              ].map(({ cmd, desc }) => (
                <div key={cmd} className="flex items-baseline gap-2">
                  <code className="rounded bg-white border border-gray-200 px-1.5 py-0.5 text-xs font-mono text-gray-800 whitespace-nowrap">
                    {cmd}
                  </code>
                  <span className="text-gray-500">{desc}</span>
                </div>
              ))}
            <p className="mt-3 text-xs text-gray-400">
              Date formats: <code className="rounded bg-white border border-gray-200 px-1 text-xs font-mono text-gray-600">Dec 25</code>{' '}
              <code className="rounded bg-white border border-gray-200 px-1 text-xs font-mono text-gray-600">12/25</code>{' '}
              <code className="rounded bg-white border border-gray-200 px-1 text-xs font-mono text-gray-600">2026-12-25</code>{' '}
              · Time: <code className="rounded bg-white border border-gray-200 px-1 text-xs font-mono text-gray-600">at 9am</code>{' '}
              <code className="rounded bg-white border border-gray-200 px-1 text-xs font-mono text-gray-600">at 2:30pm</code>
            </p>
            </div>
          </div>
        )}
      </div>

      {/* Zoom */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Zoom logo */}
            <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-[#2D8CFF] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.5 8.25A3.75 3.75 0 0 1 8.25 4.5h7.5A3.75 3.75 0 0 1 19.5 8.25v7.5a3.75 3.75 0 0 1-3.75 3.75h-7.5A3.75 3.75 0 0 1 4.5 15.75v-7.5zm13.875 1.688-3.375 2.25v3.124l3.375 2.25a.375.375 0 0 0 .375 0 .375.375 0 0 0 .188-.329V10.266a.375.375 0 0 0-.188-.328.375.375 0 0 0-.375 0z"/>
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Zoom Team Chat</h2>
                {zoomInstallation ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle size={12} /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                    <XCircle size={12} /> Not connected
                  </span>
                )}
                {zoomConfigSaved && (
                  <span className="text-xs text-green-600 font-medium">Credentials saved</span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Create boards with <code className="rounded bg-gray-100 px-1 text-xs">/shoutboard</code> directly in Zoom Team Chat.
              </p>

              {zoomInstallation && (
                <p className="mt-1 text-sm text-gray-600">
                  Connected to <strong>{zoomInstallation.accountName || zoomInstallation.accountId}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2">
            {zoomInstallation ? (
              <Button
                variant="outline"
                size="sm"
                icon={<Trash2 size={14} />}
                isLoading={disconnectZoomMutation.isPending}
                onClick={() => {
                  if (confirm('Disconnect Zoom from Shoutboard?')) {
                    disconnectZoomMutation.mutate()
                  }
                }}
              >
                Disconnect
              </Button>
            ) : zoomAppConfig ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ExternalLink size={14} />}
                  onClick={handleConnectZoom}
                >
                  Connect Zoom
                </Button>
                <button
                  onClick={() => {
                    setZoomConfigForm((f) => ({
                      ...f,
                      clientId: zoomAppConfig?.clientId ?? '',
                      botJid: zoomAppConfig?.botJid ?? '',
                    }))
                    setShowZoomConfigForm((v) => !v)
                  }}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
                >
                  <Settings size={12} /> Edit credentials
                </button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                icon={<Settings size={14} />}
                onClick={() => {
                  setZoomConfigForm((f) => ({
                    ...f,
                    clientId: zoomAppConfig?.clientId ?? '',
                    botJid: zoomAppConfig?.botJid ?? '',
                  }))
                  setShowZoomConfigForm((v) => !v)
                }}
              >
                Configure
              </Button>
            )}
          </div>
        </div>

        {/* Zoom app config form */}
        {showZoomConfigForm && !zoomInstallation && (
          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="mb-1 text-sm font-semibold text-gray-800">Zoom app credentials</h3>
            <p className="mb-3 text-sm text-gray-500">
              Create a General App at{' '}
              <a href="https://marketplace.zoom.us" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                marketplace.zoom.us
              </a>
              {' '}then enter your credentials below.
            </p>
            {/* Webhook URL callout */}
            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
              <p className="mb-1 font-semibold">Webhook endpoint URL (enter this in your Zoom app → Access → Event Subscription)</p>
              <code className="break-all font-mono">
                {zoomWebhookUrl || 'Loading...'}
              </code>
              <p className="mt-1 text-blue-600">Subscribe to the <strong>Team Chat DM Message Posted</strong> event.</p>
            </div>
            {zoomAppConfig && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Credentials already saved (Client ID: <strong>{zoomAppConfig.clientId}</strong>). Enter new values to update.
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="zoom-client-id">
                  Client ID
                </label>
                <input
                  id="zoom-client-id"
                  type="text"
                  value={zoomConfigForm.clientId}
                  onChange={(e) => setZoomConfigForm((f) => ({ ...f, clientId: e.target.value }))}
                  placeholder="abcDEF123456"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="zoom-client-secret">
                  Client Secret
                </label>
                <PasswordInput
                  id="zoom-client-secret"
                  value={zoomConfigForm.clientSecret}
                  onChange={(v) => setZoomConfigForm((f) => ({ ...f, clientSecret: v }))}
                  placeholder="abcdef1234567890abcdef1234567890"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="zoom-bot-jid">
                  Bot JID <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  id="zoom-bot-jid"
                  type="text"
                  value={zoomConfigForm.botJid}
                  onChange={(e) => setZoomConfigForm((f) => ({ ...f, botJid: e.target.value }))}
                  placeholder="v1botjid@xmpp.zoom.us"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="zoom-verification-token">
                  Secret Token <span className="font-normal text-gray-400">(from Zoom app → Access page)</span>
                </label>
                <PasswordInput
                  id="zoom-verification-token"
                  value={zoomConfigForm.verificationToken}
                  onChange={(v) => setZoomConfigForm((f) => ({ ...f, verificationToken: v }))}
                  placeholder="GicD_h99T2WiseEhj3VzXw"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                isLoading={saveZoomConfigMutation.isPending}
                onClick={handleSaveZoomConfig}
                disabled={!zoomConfigForm.clientId || !zoomConfigForm.clientSecret}
              >
                Save credentials
              </Button>
              {zoomAppConfig && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ExternalLink size={14} />}
                  onClick={handleConnectZoom}
                >
                  Connect Zoom
                </Button>
              )}
              <button
                onClick={() => {
                  setShowZoomConfigForm(false)
                  setZoomConfigForm({ clientId: '', clientSecret: '', botJid: '', verificationToken: '' })
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              {zoomAppConfig && (
                <button
                  onClick={() => {
                    if (confirm('Remove saved Zoom credentials?')) {
                      deleteZoomConfigMutation.mutate()
                      setShowZoomConfigForm(false)
                    }
                  }}
                  className="ml-auto text-xs text-red-500 hover:text-red-700"
                >
                  Remove credentials
                </button>
              )}
            </div>
          </div>
        )}

        {/* DM command reference — only show when connected */}
        {zoomInstallation && (
          <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Bot commands
            </p>
            <p className="mb-3 text-xs text-gray-400">DM the Shoutboard bot in Zoom Team Chat with any of these commands:</p>
            <div className="space-y-1.5 text-sm">
              {[
                { cmd: '/shoutboard list', desc: 'Show recent boards' },
                { cmd: '/shoutboard create "Title" for Name', desc: 'Create a board (open immediately)' },
                { cmd: '/shoutboard create "Title" for Name on Dec 25', desc: 'Create & schedule send date' },
                { cmd: '/shoutboard create "Title" for Name on Dec 25 at 9am', desc: 'Create with date & time' },
                { cmd: '/shoutboard schedule "Title" on Dec 25 at 9am', desc: 'Set/update send date on existing board' },
                { cmd: '/shoutboard help', desc: 'Show all commands' },
              ].map(({ cmd, desc }) => (
                <div key={cmd} className="flex items-baseline gap-2">
                  <code className="rounded bg-white border border-gray-200 px-1.5 py-0.5 text-xs font-mono text-gray-800 whitespace-nowrap">
                    {cmd}
                  </code>
                  <span className="text-gray-500">{desc}</span>
                </div>
              ))}
              <p className="mt-3 text-xs text-gray-400">
                Date formats: <code className="rounded bg-white border border-gray-200 px-1 text-xs font-mono text-gray-600">Dec 25</code>{' '}
                <code className="rounded bg-white border border-gray-200 px-1 text-xs font-mono text-gray-600">12/25</code>{' '}
                <code className="rounded bg-white border border-gray-200 px-1 text-xs font-mono text-gray-600">2026-12-25</code>{' '}
                · Time: <code className="rounded bg-white border border-gray-200 px-1 text-xs font-mono text-gray-600">at 9am</code>{' '}
                <code className="rounded bg-white border border-gray-200 px-1 text-xs font-mono text-gray-600">at 2:30pm</code>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Coming soon cards */}
      {[
        { name: 'MS Teams', color: '#464EB8', desc: 'Create boards and get notified directly in Teams channels.' },
      ].map((integration) => (
        <div key={integration.name} className="card p-6 mb-6 opacity-60">
          <div className="flex items-center gap-4">
            <div
              className="flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: integration.color }}
            >
              {integration.name.slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{integration.name}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  Coming soon
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{integration.desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
