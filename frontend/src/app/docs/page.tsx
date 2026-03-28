'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Copy, Check, ChevronRight, Menu, X } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), timeout)
  }
  return { copied, copy }
}

function CodeBlock({
  code,
  language = 'bash',
  id,
}: {
  code: string
  language?: string
  id: string
}) {
  const { copied, copy } = useClipboard()
  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between rounded-t-lg bg-gray-800 px-4 py-2">
        <span className="text-xs font-mono text-gray-400">{language}</span>
        <button
          onClick={() => copy(code, id)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied === id ? <Check size={13} /> : <Copy size={13} />}
          {copied === id ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-b-lg bg-gray-900 p-4 text-sm text-gray-100 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Method({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PUT: 'bg-yellow-100 text-yellow-700',
    PATCH: 'bg-orange-100 text-orange-700',
    DELETE: 'bg-red-100 text-red-700',
  }
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-bold font-mono ${
        colors[method] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {method}
    </span>
  )
}

function Endpoint({
  method,
  path,
  desc,
  auth = true,
}: {
  method: string
  path: string
  desc: string
  auth?: boolean
}) {
  return (
    <div className="my-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Method method={method} />
        <code className="flex-1 text-sm font-mono text-gray-800">{path}</code>
        {!auth && (
          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
            public
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-600">{desc}</p>
    </div>
  )
}

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mb-16 scroll-mt-20">
      <h2 className="mb-6 text-2xl font-bold text-gray-900 border-b border-gray-200 pb-3">
        {title}
      </h2>
      {children}
    </section>
  )
}

function SubSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div id={id} className="mb-10 scroll-mt-20">
      <h3 className="mb-4 text-lg font-semibold text-gray-800">{title}</h3>
      {children}
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const nav = [
  { label: 'Getting Started', id: 'getting-started' },
  { label: 'Authentication', id: 'authentication' },
  { label: 'Boards', id: 'boards' },
  { label: 'Posts', id: 'posts' },
  { label: 'API Keys', id: 'api-keys' },
  { label: 'Webhooks', id: 'webhooks' },
  { label: 'Analytics', id: 'analytics' },
  { label: 'SDKs', id: 'sdks' },
  { label: 'Rate Limits', id: 'rate-limits' },
  { label: 'Errors', id: 'errors' },
]

// ── Code snippets ─────────────────────────────────────────────────────────────

const snippets = {
  curl_auth: `curl -X POST https://api.shoutboard.io/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@company.com", "password": "your_password"}'`,

  curl_apikey: `curl https://api.shoutboard.io/v1/boards \\
  -H "Authorization: Bearer sk_live_abc123..."`,

  create_board: `curl -X POST https://api.shoutboard.io/v1/boards \\
  -H "Authorization: Bearer sk_live_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Happy Birthday Sarah!",
    "occasionType": "BIRTHDAY",
    "recipientName": "Sarah Chen",
    "recipientEmail": "sarah@company.com",
    "coverTheme": "rose"
  }'`,

  board_response: `{
  "success": true,
  "data": {
    "id": "clx4ab...",
    "slug": "happy-birthday-sarah-xK2j",
    "title": "Happy Birthday Sarah!",
    "occasionType": "BIRTHDAY",
    "status": "DRAFT",
    "recipientName": "Sarah Chen",
    "recipientEmail": "sarah@company.com",
    "coverTheme": "rose",
    "createdAt": "2026-03-28T10:00:00.000Z"
  }
}`,

  add_post: `curl -X POST https://api.shoutboard.io/v1/boards/clx4ab.../posts \\
  -H "Content-Type: application/json" \\
  -d '{
    "authorName": "James Liu",
    "contentText": "Working with you has been an absolute joy. Happy birthday!",
    "isAnonymous": false
  }'`,

  send_board: `curl -X POST https://api.shoutboard.io/v1/boards/clx4ab.../send \\
  -H "Authorization: Bearer sk_live_abc123..."`,

  schedule_board: `curl -X POST https://api.shoutboard.io/v1/boards/clx4ab.../schedule \\
  -H "Authorization: Bearer sk_live_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"scheduledAt": "2026-04-01T09:00:00.000Z"}'`,

  js_sdk: `import { ShoutboardClient } from 'shoutboard'

const client = new ShoutboardClient({ apiKey: 'sk_live_abc123...' })

// Create a board
const board = await client.boards.create({
  title: 'Congrats on the promotion, Maya!',
  occasionType: 'PROMOTION',
  recipientName: 'Maya Patel',
  recipientEmail: 'maya@company.com',
})

// Add a message
await client.posts.create(board.id, {
  authorName: 'The Team',
  contentText: 'You absolutely deserve this. Onward and upward!',
})

// Send it
await client.boards.send(board.id)`,

  python_sdk: `from shoutboard import ShoutboardClient

client = ShoutboardClient(api_key="sk_live_abc123...")

# Create a board
board = client.boards.create(
    title="Farewell and good luck, Tom!",
    occasion_type="FAREWELL",
    recipient_name="Tom Rivera",
    recipient_email="tom@company.com",
)

# Add a message
client.posts.create(
    board_id=board["id"],
    author_name="Whole Team",
    content_text="You've made this place better every day. We'll miss you!",
)

# Send it
client.boards.send(board["id"])`,

  webhook_payload: `{
  "event": "board.sent",
  "timestamp": "2026-03-28T14:00:00.000Z",
  "data": {
    "boardId": "clx4ab...",
    "recipientName": "Sarah Chen",
    "recipientEmail": "sarah@company.com",
    "postCount": 12,
    "sentAt": "2026-03-28T14:00:00.000Z"
  }
}`,

  webhook_verify: `import crypto from 'crypto'

function verifyWebhook(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  )
}

// In your Express/Fastify handler:
app.post('/webhooks/shoutboard', (req, res) => {
  const sig = req.headers['x-shoutboard-signature'] as string
  const isValid = verifyWebhook(req.rawBody, sig, process.env.WEBHOOK_SECRET!)
  if (!isValid) return res.status(401).send('Unauthorized')
  // Process req.body.event ...
  res.sendStatus(200)
})`,

  error_response: `{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "occasionType must be one of: BIRTHDAY, ANNIVERSARY, FAREWELL, PROMOTION, WELCOME, CUSTOM"
  }
}`,
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    nav.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileNavOpen(false)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold text-indigo-600">
              Shoutboard
            </Link>
            <ChevronRight size={16} className="text-gray-400" />
            <span className="text-gray-700 font-medium">API Docs</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <a
              href="https://github.com/jasondranedevops/shoutout-board-app"
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>

          <button
            className="md:hidden rounded-lg p-2 hover:bg-gray-100"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileNavOpen && (
          <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
            {nav.map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`block w-full py-2 text-left text-sm font-medium ${
                  activeSection === id ? 'text-indigo-600' : 'text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex gap-10">
          {/* Sidebar */}
          <aside className="hidden md:block w-52 flex-shrink-0">
            <div className="sticky top-24">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Contents
              </p>
              <nav className="space-y-1">
                {nav.map(({ label, id }) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      activeSection === id
                        ? 'bg-indigo-50 font-medium text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-xs font-semibold text-indigo-900">Base URL</p>
                <code className="mt-1 block text-xs font-mono text-indigo-700 break-all">
                  https://api.shoutboard.io
                </code>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0 flex-1">
            {/* Hero */}
            <div className="mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 mb-4">
                REST API · v1
              </div>
              <h1 className="text-4xl font-bold text-gray-900">
                Shoutboard API Reference
              </h1>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl">
                The Shoutboard API lets you create and manage group recognition cards
                programmatically — perfect for Slack bots, HRIS integrations, and
                milestone automation.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {['23 endpoints', 'Webhook events', 'JS & Python SDKs', 'OpenAPI 3.1 spec'].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700"
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Getting Started */}
            <Section id="getting-started" title="Getting Started">
              <p className="text-gray-700 mb-4">
                Every API request must be made over HTTPS to{' '}
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono">
                  https://api.shoutboard.io
                </code>
                . The API returns JSON for all responses.
              </p>
              <p className="text-gray-700 mb-4">
                The quickest way to get started is to create a board, add posts, and send it:
              </p>
              <CodeBlock id="qs-create" language="bash — create a board" code={snippets.create_board} />
              <CodeBlock id="qs-post" language="bash — add a message" code={snippets.add_post} />
              <CodeBlock id="qs-send" language="bash — send the board" code={snippets.send_board} />
            </Section>

            {/* Authentication */}
            <Section id="authentication" title="Authentication">
              <SubSection id="auth-jwt" title="Session Tokens (Dashboard users)">
                <p className="text-gray-700 mb-2">
                  Log in with your email and password to receive a JWT bearer token. Pass it in
                  the{' '}
                  <code className="rounded bg-gray-100 px-1 text-sm font-mono">Authorization</code>{' '}
                  header.
                </p>
                <CodeBlock id="auth-login" language="bash" code={snippets.curl_auth} />
                <p className="text-gray-700 mt-2 text-sm">
                  The token expires after 7 days. Refresh it via{' '}
                  <code className="rounded bg-gray-100 px-1 text-sm font-mono">
                    POST /v1/auth/refresh
                  </code>
                  .
                </p>
              </SubSection>

              <SubSection id="auth-apikey" title="API Keys (Integrations)">
                <p className="text-gray-700 mb-2">
                  For server-to-server integrations, create an API key in the dashboard under{' '}
                  <strong>API Keys</strong>. Keys begin with{' '}
                  <code className="rounded bg-gray-100 px-1 text-sm font-mono">sk_live_</code>.
                </p>
                <CodeBlock id="auth-key" language="bash" code={snippets.curl_apikey} />
                <p className="text-gray-700 text-sm mt-2">
                  API keys can be scoped to specific resources:{' '}
                  {['boards:read', 'boards:write', 'posts:write', 'analytics:read'].map((s) => (
                    <code
                      key={s}
                      className="mx-0.5 rounded bg-gray-100 px-1 text-sm font-mono"
                    >
                      {s}
                    </code>
                  ))}
                  .
                </p>
              </SubSection>
            </Section>

            {/* Boards */}
            <Section id="boards" title="Boards">
              <p className="text-gray-700 mb-6">
                Boards are the core resource — a digital group card that a team collaborates on
                before being delivered to a recipient.
              </p>

              <SubSection id="boards-endpoints" title="Endpoints">
                <Endpoint method="GET" path="/v1/boards" desc="List all boards for your organization (paginated)" />
                <Endpoint method="POST" path="/v1/boards" desc="Create a new board" />
                <Endpoint method="GET" path="/v1/boards/:id" desc="Get a board by ID" />
                <Endpoint method="PATCH" path="/v1/boards/:id" desc="Update board details (title, theme, recipient, etc.)" />
                <Endpoint method="DELETE" path="/v1/boards/:id" desc="Delete a board (admin only)" />
                <Endpoint method="POST" path="/v1/boards/:id/activate" desc="Activate a draft board (makes the share link live)" />
                <Endpoint method="POST" path="/v1/boards/:id/send" desc="Send the board to the recipient immediately" />
                <Endpoint method="POST" path="/v1/boards/:id/schedule" desc="Schedule board delivery for a future datetime" />
                <Endpoint
                  method="GET"
                  path="/v1/boards/:slug/public"
                  desc="Get a board's public view (active/sent only)"
                  auth={false}
                />
              </SubSection>

              <SubSection id="boards-occasion-types" title="Occasion Types">
                <p className="text-gray-700 mb-3">
                  The{' '}
                  <code className="rounded bg-gray-100 px-1 text-sm font-mono">occasionType</code>{' '}
                  field must be one of the following uppercase values:
                </p>
                <div className="flex flex-wrap gap-2">
                  {['BIRTHDAY', 'ANNIVERSARY', 'FAREWELL', 'PROMOTION', 'WELCOME', 'CUSTOM'].map(
                    (type) => (
                      <code
                        key={type}
                        className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-sm font-mono text-gray-700"
                      >
                        {type}
                      </code>
                    )
                  )}
                </div>
              </SubSection>

              <SubSection id="boards-status" title="Board Status">
                <p className="text-gray-700 mb-3">Boards move through the following states:</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {['DRAFT', '→', 'ACTIVE', '→', 'SENT'].map((s, i) =>
                    s === '→' ? (
                      <span key={i} className="text-gray-400 font-mono">
                        {s}
                      </span>
                    ) : (
                      <span
                        key={i}
                        className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700"
                      >
                        {s}
                      </span>
                    )
                  )}
                </div>
                <ul className="mt-4 space-y-1 text-sm text-gray-700">
                  <li>
                    <strong>DRAFT</strong> — visible only to org members; share link is inactive.
                  </li>
                  <li>
                    <strong>ACTIVE</strong> — share link is live; contributors can add messages.
                  </li>
                  <li>
                    <strong>SENT</strong> — board delivered to recipient; contribution form is
                    closed.
                  </li>
                </ul>
              </SubSection>

              <SubSection id="boards-example" title="Example Response">
                <CodeBlock id="board-resp" language="json" code={snippets.board_response} />
              </SubSection>
            </Section>

            {/* Posts */}
            <Section id="posts" title="Posts">
              <p className="text-gray-700 mb-6">
                Posts are messages on a board. Contributors can post with or without
                authentication. Posts can include an optional GIF URL (e.g. from Giphy).
              </p>

              <SubSection id="posts-endpoints" title="Endpoints">
                <Endpoint
                  method="GET"
                  path="/v1/boards/:boardId/posts"
                  desc="List all posts on a board (paginated, ordered by position)"
                />
                <Endpoint
                  method="POST"
                  path="/v1/boards/:boardId/posts"
                  desc="Add a post — no auth required for active boards"
                  auth={false}
                />
                <Endpoint
                  method="POST"
                  path="/v1/boards/:boardId/posts/reorder"
                  desc="Reorder posts by providing an ordered array of post IDs"
                />
                <Endpoint
                  method="DELETE"
                  path="/v1/boards/:boardId/posts/:postId"
                  desc="Delete a post (board creator or admin only)"
                />
              </SubSection>

              <SubSection id="posts-create" title="Create a Post">
                <CodeBlock id="create-post" language="bash" code={snippets.add_post} />
                <p className="text-sm text-gray-600 mt-2">
                  The{' '}
                  <code className="rounded bg-gray-100 px-1 font-mono">gifUrl</code> and{' '}
                  <code className="rounded bg-gray-100 px-1 font-mono">mediaUrl</code> fields are
                  optional. Set{' '}
                  <code className="rounded bg-gray-100 px-1 font-mono">isAnonymous: true</code> to
                  hide the author name from the recipient.
                </p>
              </SubSection>
            </Section>

            {/* API Keys */}
            <Section id="api-keys" title="API Keys">
              <p className="text-gray-700 mb-6">
                API keys are scoped credentials for server-to-server integrations. Manage them
                from the{' '}
                <Link href="/api-keys" className="text-indigo-600 hover:underline">
                  API Keys
                </Link>{' '}
                page in your dashboard.
              </p>

              <SubSection id="apikeys-endpoints" title="Endpoints">
                <Endpoint method="GET" path="/v1/api-keys" desc="List all API keys for your organization" />
                <Endpoint method="POST" path="/v1/api-keys" desc="Create a new API key" />
                <Endpoint method="DELETE" path="/v1/api-keys/:id" desc="Revoke an API key" />
              </SubSection>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>Security note:</strong> API key values are only shown once at creation
                time. Store them securely (e.g. in a secrets manager or environment variable).
                Never commit them to source control.
              </div>
            </Section>

            {/* Webhooks */}
            <Section id="webhooks" title="Webhooks">
              <p className="text-gray-700 mb-6">
                Webhooks let you receive real-time notifications when events happen in Shoutboard.
                Each delivery is signed with HMAC-SHA256 so you can verify authenticity.
              </p>

              <SubSection id="webhooks-endpoints" title="Endpoints">
                <Endpoint method="GET" path="/v1/webhooks" desc="List webhook subscriptions" />
                <Endpoint method="POST" path="/v1/webhooks" desc="Register a new webhook URL" />
                <Endpoint method="DELETE" path="/v1/webhooks/:id" desc="Delete a webhook subscription" />
                <Endpoint
                  method="GET"
                  path="/v1/webhooks/:id/deliveries"
                  desc="View delivery history and response status"
                />
              </SubSection>

              <SubSection id="webhooks-events" title="Events">
                {[
                  { event: 'board.created', desc: 'A new board has been created' },
                  { event: 'board.activated', desc: 'A board has been activated (share link is live)' },
                  { event: 'board.sent', desc: 'A board has been delivered to the recipient' },
                  { event: 'post.created', desc: 'A new message was added to a board' },
                  { event: 'post.deleted', desc: 'A message was removed from a board' },
                ].map(({ event, desc }) => (
                  <div key={event} className="my-2 flex items-start gap-3">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-sm font-mono text-gray-800 whitespace-nowrap">
                      {event}
                    </code>
                    <span className="text-sm text-gray-600">{desc}</span>
                  </div>
                ))}
              </SubSection>

              <SubSection id="webhooks-payload" title="Payload">
                <CodeBlock id="wh-payload" language="json" code={snippets.webhook_payload} />
              </SubSection>

              <SubSection id="webhooks-verify" title="Verifying Signatures">
                <p className="text-gray-700 mb-2">
                  Each request includes an{' '}
                  <code className="rounded bg-gray-100 px-1 text-sm font-mono">
                    X-Shoutboard-Signature
                  </code>{' '}
                  header — an HMAC-SHA256 hex digest of the raw request body signed with your
                  webhook secret.
                </p>
                <CodeBlock id="wh-verify" language="typescript" code={snippets.webhook_verify} />
              </SubSection>
            </Section>

            {/* Analytics */}
            <Section id="analytics" title="Analytics">
              <p className="text-gray-700 mb-6">
                The analytics endpoints give you an overview of your organization's recognition
                activity.
              </p>

              <SubSection id="analytics-endpoints" title="Endpoints">
                <Endpoint
                  method="GET"
                  path="/v1/analytics/overview"
                  desc="Org-level stats: total boards, posts, views, top contributors"
                />
                <Endpoint
                  method="GET"
                  path="/v1/analytics/boards"
                  desc="Per-board metrics with pagination"
                />
              </SubSection>
            </Section>

            {/* SDKs */}
            <Section id="sdks" title="SDKs">
              <p className="text-gray-700 mb-6">
                Official SDKs are available for JavaScript/TypeScript and Python. Both are
                zero-dependency and fully typed.
              </p>

              <SubSection id="sdks-js" title="JavaScript / TypeScript">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 mb-3">
                  <code className="text-sm font-mono text-gray-700">npm install shoutboard</code>
                </div>
                <CodeBlock id="sdk-js" language="typescript" code={snippets.js_sdk} />
              </SubSection>

              <SubSection id="sdks-python" title="Python">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 mb-3">
                  <code className="text-sm font-mono text-gray-700">pip install shoutboard</code>
                </div>
                <CodeBlock id="sdk-py" language="python" code={snippets.python_sdk} />
              </SubSection>
            </Section>

            {/* Rate Limits */}
            <Section id="rate-limits" title="Rate Limits">
              <p className="text-gray-700 mb-4">
                All API requests are rate-limited per API key or IP address. Limits vary by plan:
              </p>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Plan</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Rate limit
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Burst</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[
                      { plan: 'Starter', limit: '100 req/min', burst: '200' },
                      { plan: 'Growth', limit: '500 req/min', burst: '1 000' },
                      { plan: 'Scale', limit: '2 000 req/min', burst: '5 000' },
                      { plan: 'Enterprise', limit: 'Custom', burst: 'Custom' },
                    ].map(({ plan, limit, burst }) => (
                      <tr key={plan} className="bg-white">
                        <td className="px-4 py-3 font-medium text-gray-900">{plan}</td>
                        <td className="px-4 py-3 text-gray-600">{limit}</td>
                        <td className="px-4 py-3 text-gray-600">{burst}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-sm text-gray-600">
                When you hit the limit, the API responds with{' '}
                <code className="rounded bg-gray-100 px-1 font-mono">429 Too Many Requests</code>{' '}
                and a{' '}
                <code className="rounded bg-gray-100 px-1 font-mono">Retry-After</code> header
                indicating when to retry.
              </p>
            </Section>

            {/* Errors */}
            <Section id="errors" title="Errors">
              <p className="text-gray-700 mb-4">
                All errors follow a consistent JSON shape:
              </p>
              <CodeBlock id="err-resp" language="json" code={snippets.error_response} />

              <div className="overflow-hidden rounded-xl border border-gray-200 mt-6">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">HTTP</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Code</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[
                      { status: '400', code: 'VALIDATION_ERROR', desc: 'Request body failed validation' },
                      {
                        status: '401',
                        code: 'UNAUTHORIZED',
                        desc: 'Missing or invalid auth token / API key',
                      },
                      {
                        status: '403',
                        code: 'FORBIDDEN',
                        desc: "You don't have permission to access this resource",
                      },
                      { status: '404', code: 'NOT_FOUND', desc: 'Resource not found' },
                      {
                        status: '409',
                        code: 'CONFLICT',
                        desc: 'State transition not allowed (e.g. re-sending an already-sent board)',
                      },
                      {
                        status: '429',
                        code: 'RATE_LIMITED',
                        desc: 'Too many requests — back off and retry',
                      },
                      {
                        status: '500',
                        code: 'INTERNAL_ERROR',
                        desc: 'Unexpected server error',
                      },
                    ].map(({ status, code, desc }) => (
                      <tr key={code} className="bg-white">
                        <td className="px-4 py-3 font-mono text-gray-700">{status}</td>
                        <td className="px-4 py-3 font-mono text-gray-700">{code}</td>
                        <td className="px-4 py-3 text-gray-600">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Footer */}
            <div className="border-t border-gray-200 pt-10 pb-16 text-center">
              <p className="text-gray-500 text-sm">
                Need help?{' '}
                <a
                  href="mailto:support@shoutboard.io"
                  className="text-indigo-600 hover:underline"
                >
                  support@shoutboard.io
                </a>
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
