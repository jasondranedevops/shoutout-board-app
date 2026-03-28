# Shoutboard

**API-first employee recognition platform.** Shoutboard lets teams create rich, collaborative group cards for any occasion — birthdays, work anniversaries, farewells, promotions, and more — and delivers them beautifully to recipients. Unlike other recognition tools, every feature in Shoutboard is available via a full public REST API, so companies can embed recognition natively into their existing infrastructure.

---

## What makes Shoutboard different

Most recognition tools are closed platforms — you use their UI or nothing. Shoutboard is built API-first, meaning:

- Every action available in the UI is also available via the REST API
- Webhook events fire on every meaningful action (board created, post added, board sent)
- Official SDKs in JavaScript/TypeScript and Python ship zero dependencies
- An OpenAPI 3.1 spec is published and kept up to date at `/openapi.yaml`
- A developer docs page lives at `/docs` with full reference and code examples

This unlocks use cases no other recognition tool supports: Slack bots that auto-create boards when someone gets promoted, HRIS-triggered anniversary cards, custom dashboards pulling live recognition data, and fully white-labeled experiences embedded in your own product.

---

## Repository structure

```
shoutout-board-app/
├── frontend/                         # Next.js 14 web app (App Router, TypeScript, Tailwind)
│   └── src/
│       ├── app/
│       │   ├── (auth)/               # Login + signup pages
│       │   ├── (dashboard)/
│       │   │   ├── dashboard/        # Boards overview
│       │   │   ├── boards/
│       │   │   │   ├── new/          # 3-step board creation wizard
│       │   │   │   └── [id]/         # Board detail + drag-and-drop post editor
│       │   │   ├── employees/        # Employee roster + milestone automation settings
│       │   │   ├── integrations/     # Slack connect + channel config
│       │   │   ├── analytics/        # Org-level recognition metrics
│       │   │   ├── api-keys/         # API key management
│       │   │   └── settings/         # Org settings + webhooks
│       │   ├── b/[slug]/             # Public board view (contributor form + GIF picker)
│       │   └── docs/                 # Full API reference docs page
│       ├── components/
│       │   ├── boards/               # BoardCard, PostCard
│       │   ├── layout/               # Sidebar, TopBar
│       │   └── ui/                   # Button, Input, Badge, GifPicker
│       ├── hooks/                    # React Query data hooks (boards, posts, API keys)
│       ├── lib/                      # Axios API client
│       ├── store/                    # Zustand auth store
│       └── types/                    # Shared TypeScript interfaces
├── backend/                          # Fastify REST API (TypeScript, Prisma, PostgreSQL)
│   ├── prisma/
│   │   ├── schema.prisma             # 10 models (see Data Model section)
│   │   └── migrations/               # SQL migration files
│   └── src/
│       ├── routes/
│       │   ├── auth.routes.ts        # Register, Login, Me, Refresh
│       │   ├── boards.routes.ts      # Board CRUD, activate, send, schedule, public view
│       │   ├── posts.routes.ts       # Post list, create, reorder, delete
│       │   ├── api-keys.routes.ts    # API key management
│       │   ├── webhooks.routes.ts    # Webhook CRUD + delivery history
│       │   ├── analytics.routes.ts   # Org + board-level metrics
│       │   ├── employees.routes.ts   # Employee CRUD + milestone config
│       │   └── slack.routes.ts       # Slack OAuth, slash commands, settings
│       ├── services/
│       │   ├── scheduler.service.ts  # Auto-sends scheduled boards (60s polling)
│       │   ├── milestone.service.ts  # Auto-creates birthday/anniversary boards (hourly)
│       │   ├── slack.service.ts      # Slack OAuth, Block Kit messages, signature verify
│       │   ├── webhook.service.ts    # BullMQ webhook delivery + HMAC signing
│       │   └── email.service.ts      # Resend transactional email
│       ├── plugins/                  # JWT + API key auth plugins
│       └── utils/                    # Error handling, slugs, key generation
├── sdk/
│   ├── js/                           # Zero-dependency JavaScript/TypeScript SDK
│   └── python/                       # Zero-dependency Python SDK
├── openapi.yaml                      # Full OpenAPI 3.1 spec
├── docker-compose.yml                # PostgreSQL + Redis for local dev
├── setup.sh                          # One-command dev environment setup
├── Shoutboard_Product_Tech_Blueprint.docx
└── Shoutboard_Business_GTM_Plan.docx
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, TailwindCSS, React Query, Zustand |
| Backend | Fastify, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| Cache / Queue | Redis + BullMQ |
| Email | Resend |
| GIF search | Giphy API |
| Auth | JWT (user sessions) + API keys (server-to-server) + Slack OAuth |

---

## Data model

| Model | Description |
|---|---|
| `Organization` | Tenant root — all data scoped to an org |
| `User` | Org member with ADMIN or MEMBER role |
| `Board` | Group recognition card (DRAFT → ACTIVE → SENT) |
| `Post` | Message on a board (supports GIF, anonymous, drag-to-reorder) |
| `Employee` | Team member record with birthday + hire date for milestone automation |
| `MilestoneConfig` | Per-org settings for auto-board creation (days ahead, toggles) |
| `SlackInstallation` | OAuth token + notification channel for Slack integration |
| `ApiKey` | Scoped server-to-server credentials |
| `WebhookSubscription` | Registered webhook URL + event filter |
| `WebhookDelivery` | Delivery log with status, retries, response body |

---

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (or use Docker Compose)

### Quick start (Docker)

```bash
git clone https://github.com/jasondranedevops/shoutout-board-app
cd shoutout-board-app
docker-compose up -d        # starts PostgreSQL + Redis
bash setup.sh               # installs deps, runs migrations, seeds DB
```

### Manual setup

**Backend:**
```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, JWT_SECRET, RESEND_API_KEY
# Optional: SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET, APP_URL
npm install
npx prisma db push          # sync schema to DB
npx tsx src/db/seed.ts      # seed demo org + user
npm run dev                 # starts on http://localhost:4000
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
# Set NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                 # starts on http://localhost:3000
```

### Demo credentials (after seeding)

| Field | Value |
|---|---|
| Email | admin@demo.shoutboard.io |
| Password | demo1234 |

---

## API overview

All endpoints live under `/v1/`. Authentication via `Authorization: Bearer <jwt>` for user sessions or `Authorization: Bearer sk_live_<key>` for API keys.

| Group | Endpoints |
|---|---|
| Auth | Register, Login, Me, Refresh |
| Boards | CRUD, Activate, Send, Schedule, Public view |
| Posts | List, Create, **Reorder**, Delete |
| Employees | CRUD |
| Milestones | Get config, Update config |
| Slack | OAuth install/callback, Status, Channel config, Disconnect |
| API Keys | List, Create, Revoke |
| Webhooks | CRUD, Delivery history |
| Analytics | Org-level overview, Board-level metrics |

Full spec: [`openapi.yaml`](./openapi.yaml) · Interactive docs: `http://localhost:3000/docs`

### Webhook events

Shoutboard fires signed webhook payloads (HMAC-SHA256 via `X-Shoutboard-Signature`) for:

| Event | When |
|---|---|
| `board.created` | A new board is created (including auto-created milestone boards) |
| `board.activated` | A board's share link goes live |
| `board.sent` | A board is delivered to the recipient |
| `post.created` | A message is added to a board |
| `post.deleted` | A message is removed from a board |

---

## Features

### Board editor
- 3-step creation wizard: occasion type → title/theme → send options (now / scheduled / link)
- Board detail page with **drag-and-drop post reordering** and per-post delete
- Status-aware UI: DRAFT shows share-link warning, SENT hides the contribution form

### GIF picker
- Powered by Giphy — trending GIFs on open, debounced search
- Available on the public contributor page (`/b/[slug]`)
- GIF URLs stored on posts and rendered on the public board view

### Scheduled delivery
- Set a future `scheduledAt` date/time during board creation
- Backend scheduler polls every 60 seconds and auto-sends due boards
- `scheduledAt` gate prevents public access before the scheduled time

### Milestone automation
- Add employees with birthdays and hire dates via the **Employees** page (`/employees`)
- Hourly scheduler detects upcoming milestones within the configured window (1–30 days)
- Auto-creates Birthday and Work Anniversary boards — deduplicated per year
- Configurable: toggle birthday/anniversary boards, set days-ahead window, auto-activate

### Slack integration
- One-click OAuth install from the **Integrations** page (`/integrations`)
- `/shoutboard list` — shows recent boards from Slack
- `/shoutboard create "Title" for Name` — creates and activates a board, posts share link to channel
- `/shoutboard help` — shows all commands
- Notification channel: choose a channel to receive board-created and board-sent messages
- HMAC-SHA256 signature verification on all incoming Slack requests

### SDKs

**JavaScript / TypeScript** (zero dependencies):
```bash
npm install shoutboard
```
```ts
import { ShoutboardClient } from 'shoutboard'
const client = new ShoutboardClient({ apiKey: 'sk_live_...' })
const board = await client.boards.create({ title: 'Happy Birthday!', occasionType: 'BIRTHDAY', recipientName: 'Sarah' })
await client.boards.send(board.id)
```

**Python** (zero dependencies):
```bash
pip install shoutboard
```
```python
from shoutboard import ShoutboardClient
client = ShoutboardClient(api_key='sk_live_...')
board = client.boards.create(title='Happy Birthday!', occasion_type='BIRTHDAY', recipient_name='Sarah')
client.boards.send(board['id'])
```

---

## Slack app setup

To connect Slack to your local dev environment, you need a Slack app with a public URL (use [ngrok](https://ngrok.com) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)):

1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Under **OAuth & Permissions**, add scopes: `chat:write`, `commands`, `channels:read`, `groups:read`
3. Set redirect URL to `https://your-tunnel.ngrok.io/api/slack/oauth/callback`
4. Under **Slash Commands**, create `/shoutboard` pointing to `https://your-tunnel.ngrok.io/api/slack/commands`
5. Under **Interactivity**, set the URL to `https://your-tunnel.ngrok.io/api/slack/interactions`
6. Copy **Client ID**, **Client Secret**, and **Signing Secret** into `backend/.env`:
   ```
   SLACK_CLIENT_ID=your_client_id
   SLACK_CLIENT_SECRET=your_client_secret
   SLACK_SIGNING_SECRET=your_signing_secret
   APP_URL=https://your-tunnel.ngrok.io
   ```
7. Restart the backend and click **Connect Slack** in the Integrations page

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWTs |
| `RESEND_API_KEY` | ✅ | Resend API key for transactional email |
| `APP_URL` | ✅ | Public URL of the app (e.g. `http://localhost:3000`) |
| `SLACK_CLIENT_ID` | Optional | Slack app client ID |
| `SLACK_CLIENT_SECRET` | Optional | Slack app client secret |
| `SLACK_SIGNING_SECRET` | Optional | Slack request signing secret |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API base URL |

---

## Roadmap

- [x] Board creation, activation, send, and scheduled delivery
- [x] Public board view with contributor form
- [x] GIF picker (Giphy)
- [x] Drag-and-drop post reordering
- [x] Error handling + UI feedback throughout
- [x] Background scheduler (auto-send boards)
- [x] Milestone automation (birthday + work anniversary boards)
- [x] Slack bot (`/shoutboard create`, `list`, `help` + notifications)
- [x] JavaScript SDK (zero deps)
- [x] Python SDK (zero deps)
- [x] API reference docs page (`/docs`)
- [ ] Microsoft Teams app
- [ ] Zoom integration
- [ ] HRIS integrations (BambooHR, Rippling, Workday, ADP Workforce)
- [ ] SSO / SAML 2.0
- [ ] White-label mode
- [ ] Mobile apps (iOS / Android)
- [ ] AI-generated message suggestions

---

## Plans & pricing

| Plan | Price | Users | Highlights |
|---|---|---|---|
| Starter | $29/mo | 25 | Unlimited boards, REST API, webhooks, SDKs |
| Growth | $79/mo | 100 | Slack + Teams, custom branding, analytics, milestone automation |
| Scale | $199/mo | 500 | HRIS sync, branded subdomain, priority support |
| Enterprise | Custom | Unlimited | SSO/SAML, white-label, SLA, dedicated CSM |

---

## License

MIT
