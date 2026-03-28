# Shoutboard Frontend

A modern Next.js 14 application for Shoutboard — an API-first employee recognition platform.

## Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS 3.4
- **State Management**: Zustand
- **Data Fetching**: React Query + Axios
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Language**: TypeScript 5

### Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Auth pages (login, signup)
│   │   ├── (dashboard)/            # Protected dashboard pages
│   │   ├── b/[slug]/               # Public board view
│   │   ├── docs/                   # API documentation
│   │   ├── page.tsx                # Landing page
│   │   ├── layout.tsx              # Root layout
│   │   └── globals.css             # Global styles
│   ├── components/
│   │   ├── ui/                     # Reusable UI components
│   │   ├── boards/                 # Board-specific components
│   │   ├── layout/                 # Layout components (sidebar, topbar)
│   │   └── providers/              # React providers
│   ├── hooks/                      # Custom React hooks
│   ├── lib/                        # Utilities (API client, auth helpers)
│   ├── store/                      # Zustand stores
│   └── types/                      # TypeScript type definitions
├── public/                         # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
└── next.config.ts
```

## Key Features

### 1. **Authentication**
- Email/password login and signup
- JWT token storage in localStorage
- Auto-redirect to login on 401 responses
- Zustand auth store for global state

### 2. **Dashboard**
- Sidebar navigation with active state highlighting
- Top bar with user dropdown
- Protected routes using middleware patterns
- Board management (create, view, edit)

### 3. **Board Creation Wizard**
- Step 1: Select occasion type and recipient
- Step 2: Board title and cover theme selection
- Step 3: Send options (now, schedule, or get shareable link)
- Form validation with Zod schemas

### 4. **Public Board View**
- Beautiful cover with gradient and emoji
- Form to add messages (anonymous or named)
- Message cards with author avatars (colored by hash)
- Shareable URL

### 5. **API Key Management**
- Create, list, and revoke API keys
- Configure scopes per key
- Display last 4 chars of secret
- Copy to clipboard functionality

### 6. **Settings & Webhooks**
- Organization details management
- Webhook URL configuration
- Danger zone for org deletion (admin only)

## Configuration

### Environment Variables

Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### API Integration

The API client is configured in `src/lib/api.ts`:
- Base URL from `NEXT_PUBLIC_API_URL`
- Automatic Bearer token injection from localStorage
- 401 redirect to login
- Axios interceptors for request/response handling

## UI Components

### Base Components (`src/components/ui/`)

- **Button**: Primary, secondary, outline, ghost, danger variants with sizes (sm, md, lg)
- **Input**: Text input with label, error messages, and helper text
- **Modal**: Accessible modal with escape key handling and backdrop
- **Badge**: Status badges with color variants (draft, active, sent)

### Composed Components (`src/components/boards/`)

- **BoardCard**: Grid card showing board preview, status, and stats
- **PostCard**: Individual message card with author avatar and timestamp

### Layout Components (`src/components/layout/`)

- **Sidebar**: Fixed sidebar with navigation and user info
- **TopBar**: Sticky top bar with page title and user dropdown

## Styling Approach

- **TailwindCSS**: Utility-first CSS framework
- **Custom utilities**: Added via `@layer components` in `globals.css`
- **Brand colors**: Indigo (#6366f1) primary, Violet (#8b5cf6) accent
- **No component library**: All components built manually with Tailwind
- **Responsive**: Mobile-first design with sm/md/lg breakpoints

## Data Flow

```
API Request
  ↓
Axios (src/lib/api.ts)
  ↓
React Query Hook (src/hooks/)
  ↓
Component State
  ↓
Zustand Store (optional, for global state)
  ↓
UI Render
```

## Form Handling

All forms use React Hook Form + Zod:

1. Define schema with Zod
2. Setup form with `useForm()` and `zodResolver`
3. Register inputs with `register()`
4. Display errors from `formState.errors`
5. Handle submit with `handleSubmit()`

Example:
```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const form = useForm({ resolver: zodResolver(schema) })
```

## Authentication Flow

1. User enters credentials on login/signup page
2. Submit to `/api/auth/login` or `/api/auth/signup`
3. Receive JWT token + user + org in response
4. Call `useAuthStore().login()` to store token and user
5. Redirect to `/dashboard`
6. Token automatically included in all API requests via interceptor
7. On 401, token cleared and user redirected to login

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The app will be available at http://localhost:3000
```

## Building for Production

```bash
# Build static assets
npm run build

# Start production server
npm start
```

## Key Decisions

### No shadcn/ui Installation
Components are implemented manually using Tailwind to avoid npm install requirement.

### Zustand for Auth
Lightweight, performant state management for user and org data.

### React Query for Data Fetching
Automatic caching, invalidation, and background refetching.

### File Structure
Pages and layouts in `app/` directory reflect Next.js 14 App Router convention.
Components grouped by feature (ui, boards, layout).

### Type Safety
All components and hooks are fully typed with TypeScript.
Interfaces exported from `src/types/index.ts` and imported throughout.

## Mock Data

Some pages use mock data for demonstration:
- Public board view (`src/app/b/[slug]/page.tsx`)
- Dashboard page shows mock posts
- Analytics placeholder shows example stats

Replace with actual API calls when backend is ready.

## Performance Optimizations

- Image optimization with Next.js Image component (enabled for remotePatterns)
- Code splitting via dynamic imports
- Automatic route prefetching in links
- Memoized components to prevent unnecessary re-renders
- React Query caching to reduce API calls

## Security Considerations

- JWT tokens stored in localStorage (accessible to XSS)
- CSRF protection via same-site cookies (backend responsibility)
- No sensitive data in URL parameters
- Automatic redirect on 401 unauthorized
- Form validation both client and server side

## Contributing

All files are TypeScript. Maintain:
- Type safety throughout
- Component composition patterns
- Tailwind utility classes (no inline styles)
- Exported types from `src/types/index.ts`
