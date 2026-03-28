# Shoutboard

**API-first employee recognition platform.** Shoutboard lets teams create rich, collaborative group cards for any occasion — birthdays, work anniversaries, farewells, promotions, and more — and delivers them beautifully to recipients. Unlike other recognition tools, every feature in Shoutboard is available via a full public REST API, so companies can embed recognition natively into their existing infrastructure.

---

## What makes Shoutboard different

Most recognition tools are closed platforms — you use their UI or nothing. Shoutboard is built API-first, meaning:

- Every action available in the UI is also available via the REST API
- Webhook events fire on every meaningful action (board created, post added, board sent)
- SDKs in JavaScript/TypeScript and Python (roadmap) make integration trivial
- An OpenAPI 3.1 spec is published and kept up to date at `/openapi.yaml`
- A sandbox environment is available for testing integrations before going live

This unlocks use cases no other recognition tool supports: Slack bots that auto-create boards when someone gets promoted, HRIS-triggered anniversary cards, custom dashboards pulling live recognition data, and fully white-labeled experiences embedded in your own product.

---

## Repository structure

```
shoutout-board-app/
├── frontend/               # Next.js 14 web app (App Router, TypeScript, Tailwind)
│   └── src/
│       ├── app/            # Pages: landing, auth, dashboard, board views, API docs
│       ├── components/     # UI components, layout, board/post cards
│       ├── hooks/          # React Query data hooks
│       ├── lib/            # Axios API client, auth utilities
│       ├── store/          # Zustand auth store
│       └── types/          # Shared TypeScript interfaces
├── backend/                # Fastify REST API (TypeScript, Prisma, PostgreSQL, Redis)
│   ├── prisma/             # Database schema (8 models)
│   └── src/
│       ├── routes/         # Auth, Boards, Posts, API Keys, Webhooks, Analytics
│       ├── services/       # Webhook delivery (BullMQ + HMAC), Email (Resend)
│       ├── plugins/        # JWT + API key auth plugins
│       └── utils/          # Error handling, slugs, key generation
├── openapi.yaml            # Full OpenAPI 3.1 spec (23 endpoints)
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
| Storage | S3-compatible (Cloudflare R2) |
| Email | Resend |
| Auth | JWT (user sessions) + API keys (server-to-server) + OAuth2 (roadmap) |

---

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, JWT_SECRET, RESEND_API_KEY
npm install
npm run db:migrate
npm run db:seed     # creates demo org + user
npm run dev         # starts on http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env
# Set NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev         # starts on http://localhost:3000
```

### Demo credentials (after seeding)

- **Email:** admin@demo.shoutboard.io
- **Password:** demo1234

---

## API overview

All endpoints live under `/v1/`. Authentication is via `Authorization: Bearer <jwt>` for user sessions or `X-API-Key: <key>` for server-to-server calls.

| Group | Endpoints |
|---|---|
| Auth | Register, Login, Me |
| Boards | CRUD, Send, Schedule, Public view |
| Posts | List, Create, Delete |
| API Keys | List, Create, Revoke |
| Webhooks | CRUD, Delivery history |
| Analytics | Org-level, Board-level |

Full spec: [`openapi.yaml`](./openapi.yaml) — import into Postman, Insomnia, or any OpenAPI-compatible tool.

### Webhook events

Shoutboard fires signed webhook payloads (HMAC-SHA256 via `X-Shoutboard-Signature`) for:

- `board.created`
- `board.sent`
- `post.created`
- `post.deleted`

### Rate limits

| Plan | Requests / hour |
|---|---|
| Starter | 1,000 |
| Growth | 10,000 |
| Scale | 50,000 |
| Enterprise | Unlimited |

---

## Roadmap

- [ ] Slack bot (built on the public API)
- [ ] Microsoft Teams app
- [ ] HRIS integrations (BambooHR, Rippling, Workday)
- [ ] Milestone automation (auto-create boards from HRIS events)
- [ ] SSO / SAML 2.0
- [ ] White-label mode
- [ ] JavaScript + Python SDKs
- [ ] Mobile apps (iOS / Android)
- [ ] AI-generated message suggestions
- [ ] Physical gifting integration

---

## Plans & pricing

| Plan | Price | Users | Highlights |
|---|---|---|---|
| Starter | $29/mo | 25 | Unlimited boards, REST API, webhooks |
| Growth | $79/mo | 100 | Slack + Teams, custom branding, analytics |
| Scale | $199/mo | 500 | HRIS sync, milestone automation, branded subdomain |
| Enterprise | Custom | Unlimited | SSO, white-label, SLA, dedicated support |

---

## License

MIT
