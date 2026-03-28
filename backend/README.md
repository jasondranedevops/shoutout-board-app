# Shoutboard API

API-first employee recognition group card platform built with Fastify, TypeScript, Prisma, and PostgreSQL.

## Architecture Overview

### Tech Stack
- **Runtime**: Node.js (18+)
- **Framework**: Fastify 4.26
- **Language**: TypeScript 5.4
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis with BullMQ for webhooks
- **Auth**: JWT + API Keys
- **Email**: Resend
- **Validation**: Zod

### Directory Structure

```
backend/
├── src/
│   ├── server.ts              # Main Fastify app initialization
│   ├── db/
│   │   ├── client.ts          # Prisma client singleton
│   │   └── seed.ts            # Database seeding script
│   ├── plugins/
│   │   └── auth.plugin.ts     # JWT and API key authentication
│   ├── routes/
│   │   ├── auth.routes.ts     # /auth/* endpoints
│   │   ├── boards.routes.ts   # /v1/boards endpoints
│   │   ├── posts.routes.ts    # /v1/boards/:id/posts endpoints
│   │   ├── api-keys.routes.ts # /v1/api-keys endpoints
│   │   ├── webhooks.routes.ts # /v1/webhooks endpoints
│   │   └── analytics.routes.ts # /v1/analytics endpoints
│   ├── services/
│   │   ├── webhook.service.ts # Webhook dispatching + BullMQ worker
│   │   └── email.service.ts   # Email sending via Resend
│   ├── types/
│   │   └── fastify.d.ts       # TypeScript declarations for Fastify
│   └── utils/
│       ├── errors.ts          # Custom error classes
│       ├── api-key.ts         # API key generation and hashing
│       └── slugify.ts         # URL slug generation
├── prisma/
│   └── schema.prisma          # Prisma schema definition
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new organization and admin user
- `POST /auth/login` - Login with email/password
- `GET /auth/me` - Get current authenticated user

### Boards
- `GET /v1/boards` - List organization boards
- `POST /v1/boards` - Create new board
- `GET /v1/boards/{id}` - Get board with posts
- `PATCH /v1/boards/{id}` - Update board
- `DELETE /v1/boards/{id}` - Delete board
- `POST /v1/boards/{id}/send` - Send board to recipient
- `POST /v1/boards/{id}/schedule` - Schedule board delivery
- `GET /v1/boards/{slug}/public` - Public board view (no auth)

### Posts
- `GET /v1/boards/{boardId}/posts` - List board posts
- `POST /v1/boards/{boardId}/posts` - Add post (public or authenticated)
- `DELETE /v1/boards/{boardId}/posts/{postId}` - Delete post

### API Keys
- `GET /v1/api-keys` - List organization API keys (admin only)
- `POST /v1/api-keys` - Create new API key (admin only)
- `DELETE /v1/api-keys/{id}` - Revoke API key (admin only)

### Webhooks
- `GET /v1/webhooks` - List webhook subscriptions (admin only)
- `POST /v1/webhooks` - Create webhook subscription (admin only)
- `PATCH /v1/webhooks/{id}` - Update webhook (admin only)
- `DELETE /v1/webhooks/{id}` - Delete webhook (admin only)
- `GET /v1/webhooks/{id}/deliveries` - View delivery attempts (admin only)

### Analytics
- `GET /v1/analytics` - Organization-level metrics
- `GET /v1/analytics/boards/{id}` - Board-level metrics

## Authentication

### JWT Authentication
1. Register or login to receive a JWT token
2. Token is valid for 7 days
3. Include in requests: `Authorization: Bearer <token>`

### API Key Authentication
1. Create API key via dashboard (admin only)
2. Key returned once (store securely)
3. Include in requests: `X-API-Key: <key>`
4. API keys can be scoped and revoked anytime

## Webhook Events

The platform supports the following webhook events:

### board.created
Triggered when a new board is created.
```json
{
  "boardId": "cuidxxxxx",
  "title": "Happy Birthday Sarah!",
  "recipientName": "Sarah Johnson",
  "createdAt": "2024-03-28T10:00:00Z"
}
```

### board.sent
Triggered when a board is sent to recipient.
```json
{
  "boardId": "cuidxxxxx",
  "title": "Happy Birthday Sarah!",
  "recipientName": "Sarah Johnson",
  "recipientEmail": "sarah@example.com",
  "sentAt": "2024-03-28T10:00:00Z"
}
```

### post.created
Triggered when a new post is added to a board.
```json
{
  "boardId": "cuidxxxxx",
  "postId": "cuidyyyyy",
  "authorName": "John Smith",
  "isAnonymous": false,
  "createdAt": "2024-03-28T10:05:00Z"
}
```

### post.deleted
Triggered when a post is removed from a board.
```json
{
  "boardId": "cuidxxxxx",
  "postId": "cuidyyyyy"
}
```

## Database Schema

The Prisma schema defines:
- **Organization**: Company/team account
- **User**: Team members with ADMIN/MEMBER roles
- **Board**: Recognition card (BIRTHDAY, ANNIVERSARY, etc.)
- **Post**: Individual message on a board
- **BoardView**: Anonymous view tracking
- **ApiKey**: Service-to-service authentication
- **WebhookSubscription**: Event subscriptions
- **WebhookDelivery**: Delivery attempt records

## Setup & Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+ (for webhooks)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Set up environment
cp .env.example .env
# Edit .env with your database and service credentials

# Run migrations
npm run db:migrate

# Seed demo data
npm run db:seed
```

### Running Locally

```bash
# Development with hot reload
npm run dev

# Build
npm run build

# Production
npm start
```

Server starts on `http://localhost:4000`
Swagger docs available at `http://localhost:4000/docs`

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/shoutboard

# Cache/Queue
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
API_KEY_SALT=your-salt-min-32-chars

# Email
RESEND_API_KEY=re_your_key
FROM_EMAIL=noreply@shoutboard.io

# Application
APP_URL=http://localhost:3000
PORT=4000
NODE_ENV=development
```

## Error Handling

All errors return consistent JSON format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

Common error codes:
- `NOT_FOUND` (404) - Resource doesn't exist
- `UNAUTHORIZED` (401) - Invalid or missing credentials
- `FORBIDDEN` (403) - Insufficient permissions
- `VALIDATION_ERROR` (422) - Invalid request data
- `CONFLICT` (409) - Resource already exists

## Rate Limiting

API is rate-limited to 100 requests per 15-minute window.
Rate limit status in response headers:
- `X-RateLimit-Limit`: 100
- `X-RateLimit-Remaining`: requests left
- `X-RateLimit-Reset`: Unix timestamp

## Security Considerations

1. **API Keys**: Store securely, never commit to version control
2. **JWT Secret**: Minimum 32 characters, rotate regularly
3. **Database**: Use encrypted connections, restrict network access
4. **HTTPS**: Always use in production
5. **CORS**: Configured to allow specified origins
6. **Webhook Secrets**: Verify HMAC-SHA256 signatures on received webhooks

## Testing

```bash
# Run with sample organization
npm run db:seed

# Login credentials:
# Email: admin@demo.shoutboard.io
# Password: demo1234
```

## Deployment

1. Set up PostgreSQL and Redis on production environment
2. Configure environment variables
3. Run migrations: `npm run db:migrate`
4. Build: `npm run build`
5. Start: `npm start`

For containerization, see Dockerfile in project root.

## Documentation

- Full OpenAPI 3.1 spec: `/openapi.yaml`
- Interactive Swagger UI: `http://localhost:4000/docs`
- API Docs: https://docs.shoutboard.io
- Contributing: See CONTRIBUTING.md
