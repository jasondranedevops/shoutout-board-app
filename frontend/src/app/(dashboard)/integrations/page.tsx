'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, ExternalLink, Trash2, Hash } from 'lucide-react'
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

export default function IntegrationsPage() {
  const { org } = useAuthStore()
  const qc = useQueryClient()
  const [channel, setChannel] = useState('')
  const [channelSaved, setChannelSaved] = useState(false)

  // Check URL params for OAuth result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const slack = params.get('slack')
    if (slack) {
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
      if (slack === 'success') qc.invalidateQueries({ queryKey: ['slack-status'] })
    }
  }, [qc])

  const { data: slackData, isLoading } = useQuery({
    queryKey: ['slack-status'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/slack/status')
      return res.data.data.installation as SlackInstallation | null
    },
  })

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

          <div className="flex-shrink-0">
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
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={<ExternalLink size={14} />}
                onClick={handleConnectSlack}
              >
                Connect Slack
              </Button>
            )}
          </div>
        </div>

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

      {/* Coming soon cards */}
      {[
        { name: 'MS Teams', color: '#464EB8', desc: 'Create boards and get notified directly in Teams channels.' },
        { name: 'Zoom', color: '#2D8CFF', desc: 'Trigger recognition boards from Zoom meeting events.' },
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
