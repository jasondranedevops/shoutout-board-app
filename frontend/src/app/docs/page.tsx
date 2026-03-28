/**
 * API Documentation landing page
 */
'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/src/components/ui/Button'
import { Badge } from '@/src/components/ui/Badge'
import {
  Lock,
  Grid3x3,
  MessageSquare,
  Webhook,
  BarChart3,
  ArrowRight,
} from 'lucide-react'
import { API_URL } from '@/src/lib/api'

const endpoints = [
  {
    icon: <Lock size={24} className="text-indigo-600" />,
    title: 'Authentication',
    description: 'Secure your API requests with JWT tokens and API keys',
    methods: ['POST /auth/login', 'POST /auth/signup', 'POST /auth/logout'],
  },
  {
    icon: <Grid3x3 size={24} className="text-violet-600" />,
    title: 'Boards',
    description: 'Create, manage, and send recognition boards',
    methods: [
      'GET /boards',
      'POST /boards',
      'GET /boards/:id',
      'PATCH /boards/:id',
      'POST /boards/:id/send',
    ],
  },
  {
    icon: <MessageSquare size={24} className="text-indigo-600" />,
    title: 'Posts',
    description: 'Add messages and contributions to boards',
    methods: [
      'GET /boards/:id/posts',
      'POST /boards/:id/posts',
      'DELETE /posts/:id',
    ],
  },
  {
    icon: <Webhook size={24} className="text-violet-600" />,
    title: 'Webhooks',
    description: 'Subscribe to events and automate workflows',
    methods: [
      'GET /webhooks',
      'POST /webhooks',
      'DELETE /webhooks/:id',
      'POST /webhooks/:id/test',
    ],
  },
  {
    icon: <BarChart3 size={24} className="text-indigo-600" />,
    title: 'Analytics',
    description: 'Track engagement and recognition metrics',
    methods: [
      'GET /analytics/summary',
      'GET /analytics/boards',
      'GET /analytics/contributors',
    ],
  },
  {
    icon: <Lock size={24} className="text-violet-600" />,
    title: 'API Keys',
    description: 'Manage programmatic access tokens',
    methods: [
      'GET /api-keys',
      'POST /api-keys',
      'DELETE /api-keys/:id',
    ],
  },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white py-12">
        <div className="section-container">
          <div className="flex items-start justify-between">
            <div>
              <Badge className="mb-4">API Reference</Badge>
              <h1 className="text-4xl font-bold text-gray-900">
                Shoutboard API
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-gray-600">
                Build recognition experiences into your application with our
                comprehensive REST API
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <section className="section-container">
        <h2 className="mb-8 text-2xl font-bold text-gray-900">Quick Start</h2>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              step: '1',
              title: 'Get an API Key',
              description:
                'Sign up and create an API key in your dashboard settings',
            },
            {
              step: '2',
              title: 'Choose an Endpoint',
              description:
                'Pick the endpoint that matches your use case from our API reference',
            },
            {
              step: '3',
              title: 'Make a Request',
              description:
                'Include your API key in the Authorization header and make your first request',
            },
          ].map((item) => (
            <div key={item.step} className="card p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                <span className="font-bold text-indigo-600">{item.step}</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {item.title}
              </h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* API Base URL */}
      <section className="section-container bg-gray-50">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-900">
            API Base URL
          </h3>
          <code className="block rounded-lg bg-gray-100 p-4 font-mono text-gray-900">
            {API_URL}
          </code>
          <p className="mt-4 text-sm text-gray-600">
            All API endpoints are relative to this base URL
          </p>
        </div>
      </section>

      {/* Endpoints */}
      <section className="section-container">
        <h2 className="mb-8 text-2xl font-bold text-gray-900">API Endpoints</h2>

        <div className="grid gap-6">
          {endpoints.map((endpoint, i) => (
            <div key={i} className="card p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="mt-1">{endpoint.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {endpoint.title}
                    </h3>
                    <p className="mt-1 text-gray-600">
                      {endpoint.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2 border-t border-gray-200 pt-6">
                {endpoint.methods.map((method, j) => (
                  <code
                    key={j}
                    className="block font-mono text-sm text-gray-600"
                  >
                    {method}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Download Spec */}
      <section className="section-container bg-gray-50">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            Full API Specification
          </h2>
          <p className="mb-8 text-gray-600">
            Get the complete OpenAPI specification for integration with API clients
          </p>
          <a href="/openapi.yaml" download>
            <Button variant="primary" size="lg" icon={<ArrowRight size={20} />}>
              Download OpenAPI Spec
            </Button>
          </a>
        </div>
      </section>

      {/* Authentication */}
      <section className="section-container">
        <h2 className="mb-8 text-2xl font-bold text-gray-900">Authentication</h2>

        <div className="grid gap-8 sm:grid-cols-2">
          {[
            {
              title: 'API Keys',
              description:
                'Create API keys in your dashboard for server-to-server communication',
              example: 'Authorization: Bearer sk_live_abc123...',
            },
            {
              title: 'JWT Tokens',
              description:
                'Use JWT tokens obtained via login for user-authenticated requests',
              example: 'Authorization: Bearer eyJhbGciOiJIUzI1NiI...',
            },
          ].map((auth, i) => (
            <div key={i} className="card p-6">
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {auth.title}
              </h3>
              <p className="mb-4 text-gray-600">{auth.description}</p>
              <code className="block rounded-lg bg-gray-100 p-3 font-mono text-sm text-gray-700">
                {auth.example}
              </code>
            </div>
          ))}
        </div>
      </section>

      {/* Response Format */}
      <section className="section-container bg-gray-50">
        <h2 className="mb-8 text-2xl font-bold text-gray-900">Response Format</h2>

        <div className="card p-6">
          <p className="mb-4 text-gray-600">
            All responses are JSON. Successful requests return 2xx status codes
            with data. Errors return 4xx or 5xx with error details.
          </p>

          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-semibold text-gray-900">
                Success Response
              </h4>
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
                {`{
  "status": "success",
  "data": {
    "id": "board-123",
    "title": "Happy Birthday!",
    ...
  }
}`}
              </pre>
            </div>

            <div>
              <h4 className="mb-2 font-semibold text-gray-900">
                Error Response
              </h4>
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
                {`{
  "status": "error",
  "message": "Unauthorized",
  "statusCode": 401
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="section-container">
        <div className="gradient-primary rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold">Need Help?</h2>
          <p className="mt-4 text-lg opacity-90">
            Check our documentation or reach out to our support team
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="https://docs.shoutboard.io" target="_blank">
              <Button variant="secondary" size="lg">
                Full Documentation
              </Button>
            </Link>
            <Link href="mailto:support@shoutboard.io">
              <Button variant="secondary" size="lg">
                Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
