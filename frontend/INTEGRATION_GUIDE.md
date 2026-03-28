# Backend Integration Guide

This guide explains how to connect the Shoutboard frontend to your backend API.

## API Client Configuration

The frontend uses Axios with automatic auth token injection. Configure it in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The client is already set up in `src/lib/api.ts` with:
- Base URL from environment
- Automatic Bearer token injection from localStorage
- 401 redirect to login
- Request/response interceptors

## Expected API Endpoints

### Authentication

**POST /api/auth/login**
```typescript
Request:
{
  email: string
  password: string
}

Response (200):
{
  token: string        // JWT token
  user: User
  org: Org
}

Error (401):
{
  message: "Invalid credentials"
}
```

**POST /api/auth/signup**
```typescript
Request:
{
  name: string
  email: string
  password: string
  orgName: string
}

Response (201):
{
  token: string
  user: User
  org: Org
}
```

**POST /api/auth/logout**
```typescript
Response (200): {}
```

### Boards

**GET /api/boards?page=1&pageSize=12**
```typescript
Response (200):
{
  data: Board[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}
```

**POST /api/boards**
```typescript
Request:
{
  title: string
  occasionType: OccasionType
  recipientName: string
  recipientEmail?: string
  coverTheme: string
}

Response (201):
{
  id: string
  orgId: string
  title: string
  occasionType: OccasionType
  status: 'draft'
  recipientName: string
  coverTheme: string
  slug: string
  postCount: 0
  contributorCount: 0
  createdAt: string
  updatedAt: string
}
```

**GET /api/boards/:id**
```typescript
Response (200): Board
```

**PATCH /api/boards/:id**
```typescript
Request: Partial<Board>
Response (200): Board
```

**POST /api/boards/:id/send**
```typescript
Request (optional):
{
  scheduleFor?: string  // ISO datetime
}

Response (200): Board with status: 'sent' or 'scheduled'
```

**GET /api/boards/:id/posts**
```typescript
Response (200):
{
  data: Post[]
  pagination: {...}
}
```

**POST /api/boards/:id/posts**
```typescript
Request:
{
  authorName: string
  contentText: string
  mediaUrl?: string
  gifUrl?: string
  isAnonymous: boolean
}

Response (201): Post
```

**DELETE /api/boards/:id**
```typescript
Response (204): No content
```

### API Keys

**GET /api/api-keys**
```typescript
Response (200): ApiKey[]
```

**POST /api/api-keys**
```typescript
Request:
{
  name: string
  scopes: string[]  // e.g., ['boards:read', 'boards:write']
}

Response (201):
{
  id: string
  name: string
  secret?: string    // Only on creation!
  scopes: string[]
  lastFourChars?: string
  createdAt: string
}
```

**DELETE /api/api-keys/:id**
```typescript
Response (204): No content
```

### Webhooks

**GET /api/webhooks**
```typescript
Response (200): WebhookSubscription[]
```

**POST /api/webhooks**
```typescript
Request:
{
  url: string
  events: string[]  // e.g., ['board.sent', 'post.created']
}

Response (201): WebhookSubscription
```

**DELETE /api/webhooks/:id**
```typescript
Response (204): No content
```

### Public Board

**GET /api/boards/public/:slug**
```typescript
Request: Public endpoint (no auth required)
Response (200):
{
  board: Board
  posts: Post[]
}
```

**POST /api/boards/public/:slug/posts**
```typescript
Request: Public endpoint (no auth required)
{
  authorName: string
  contentText: string
  isAnonymous: boolean
}

Response (201): Post
```

## Hook Integration

Replace mock data in hooks with actual API calls. Example for `useBoards()`:

```typescript
export function useBoards(page: number = 1, pageSize: number = 12) {
  return useQuery({
    queryKey: [...boardKeys.lists(), page, pageSize],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Board>>(
        '/api/boards',
        { params: { page, pageSize } }
      )
      return response.data
    },
  })
}
```

The hook already has this structure — just ensure your API returns the expected format.

## Type Alignment

All frontend types are in `src/types/index.ts`. Ensure your backend responses match these interfaces:

```typescript
interface Board {
  id: string
  orgId: string
  title: string
  occasionType: OccasionType
  status: BoardStatus
  recipientName: string
  recipientEmail?: string
  coverTheme: string
  slug: string
  scheduledAt?: string
  sentAt?: string
  postCount: number
  contributorCount: number
  createdAt: string
  updatedAt: string
}

interface Post {
  id: string
  boardId: string
  authorName: string
  authorId?: string
  contentText: string
  mediaUrl?: string
  gifUrl?: string
  isAnonymous: boolean
  createdAt: string
}

interface ApiKey {
  id: string
  name: string
  lastFourChars?: string
  scopes: string[]
  lastUsedAt?: string
  createdAt: string
}
```

## Mock Data Removal

Several pages use mock data for demonstration:

1. **Public board view** (`src/app/b/[slug]/page.tsx`)
   - `mockBoard` and `mockPosts` objects
   - Replace with API calls using board slug

2. **Board detail view** (`src/app/(dashboard)/boards/[id]/page.tsx`)
   - `mockPosts` array
   - Use `useBoard(boardId)` hook result

3. **API keys page** (`src/app/(dashboard)/api-keys/page.tsx`)
   - Uses `useApiKeys()` hook (already integrated)
   - Just add the revoke functionality

## Authentication Flow

1. User submits login form
2. Frontend calls `POST /api/auth/login`
3. Receive JWT token in response
4. Store in localStorage via `setToken(token)`
5. Update Zustand store: `useAuthStore().login(token, user, org)`
6. Redirect to `/dashboard`
7. Subsequent requests automatically include token in Authorization header

## Error Handling

The API client already handles:
- 401 responses → clear token and redirect to login
- Network errors → caught by React Query and handled in components
- Form validation errors → displayed in forms

Add error handling in components like:
```typescript
const { data, isLoading, error } = useBoards()

if (error) {
  return <div>Error loading boards: {error.message}</div>
}
```

## CORS Configuration

Your backend should allow CORS from the frontend URL:

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

## Testing Integration

1. Start your backend API on `http://localhost:4000`
2. Update `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```
3. Run `npm install` (first time only)
4. Run `npm run dev`
5. Visit `http://localhost:3000`
6. Test login with credentials from your test user
7. Create a board and verify API calls in browser DevTools

## Debugging

- **Network tab**: See all API requests and responses
- **Console**: Check for errors
- **React Query DevTools**: Inspect cached queries (install separately if needed)
- **Zustand store**: Check auth state in browser console:
  ```javascript
  import { useAuthStore } from './src/store/auth.store'
  useAuthStore.getState()
  ```

## Production Deployment

Update environment variables in production:
```env
NEXT_PUBLIC_API_URL=https://api.shoutboard.io
NEXT_PUBLIC_APP_URL=https://app.shoutboard.io
```

## Common Integration Issues

### "Cannot POST /api/auth/login"
- Verify backend is running and listening on correct port
- Check `NEXT_PUBLIC_API_URL` in `.env.local`

### "Unauthorized" on protected routes
- Verify token is being stored in localStorage
- Check token is included in requests (Network tab → Headers)
- Verify token hasn't expired

### CORS errors
- Add CORS headers to your backend
- Ensure backend allows the frontend origin

### Board not found on public view
- Verify `GET /api/boards/public/:slug` endpoint exists
- Check slug format matches what's generated on create

## Next Steps

1. Implement backend endpoints matching this specification
2. Test each endpoint with Postman/Insomnia
3. Update frontend environment variables
4. Replace mock data with API calls
5. Test full user flows (signup → create board → add posts → send)
6. Deploy!
