/**
 * Shoutboard Frontend Type Definitions
 * Core data models for the application
 */

export type OccasionType =
  | 'birthday'
  | 'anniversary'
  | 'farewell'
  | 'promotion'
  | 'welcome'
  | 'custom'
  | 'thank_you'
  | 'team_celebration'
  | 'company_celebration'
  | 'work_anniversary'
  | 'retirement'
  | 'congratulations'
  | 'recruiting_onboarding'
  | 'dei_celebration'
  | 'office_competition'
  | 'department_event'
  | 'sympathy'
  | 'employee_appreciation'
  | 'holiday_celebration'

export type BoardStatus = 'draft' | 'active' | 'sent'

export type UserRole = 'admin' | 'member'

export type Plan = 'starter' | 'growth' | 'scale' | 'enterprise'

/**
 * User represents an authenticated user of the platform
 */
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
}

/**
 * Org represents an organization/workspace
 */
export interface Org {
  id: string
  name: string
  slug: string
  plan: Plan
  createdAt: string
}

/**
 * Board represents a group recognition card
 */
export interface Board {
  id: string
  orgId: string
  title: string
  occasionType: OccasionType
  status: BoardStatus
  recipientName: string
  recipientEmail?: string
  coverTheme: string // gradient theme key: 'indigo', 'violet', 'rose', etc.
  slug: string // public share slug
  scheduledAt?: string
  sentAt?: string
  postCount: number
  contributorCount: number
  createdAt: string
  updatedAt: string
}

/**
 * Post represents a single message/contribution on a board
 */
export interface Post {
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

/**
 * ApiKey represents an API authentication token for programmatic access
 */
export interface ApiKey {
  id: string
  name: string
  lastFourChars?: string // last 4 chars of the key, for display
  scopes: string[] // e.g., ['boards:read', 'boards:write', 'posts:write']
  lastUsedAt?: string
  createdAt: string
}

/**
 * WebhookSubscription represents an event subscription
 */
export interface WebhookSubscription {
  id: string
  url: string
  events: string[] // e.g., ['board.sent', 'post.created']
  active: boolean
  createdAt: string
}

/**
 * Auth response from login/signup
 */
export interface AuthResponse {
  token: string
  user: User
  org: Org
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}

/**
 * API error response
 */
export interface ApiError {
  status: number
  message: string
  errors?: Record<string, string[]>
}

/**
 * Organization-level analytics
 */
export interface OrgAnalytics {
  totalBoards: number
  totalPosts: number
  totalContributors: number
  totalAnonymousContributions: number
  boardsSentThisMonth: number
  avgPostsPerBoard: number
  occasionBreakdown: { occasion: string; count: number }[]
}

/**
 * Monthly activity trend data point
 */
export interface AnalyticsTrend {
  month: string
  boards: number
  posts: number
  contributors: number
}

/**
 * Board-level analytics
 */
export interface BoardAnalytics {
  viewCount: number
  postCount: number
  uniqueContributors: number
  anonymousContributions: number
  postsPerDay: Record<string, number>
  boardStatus: BoardStatus
  createdAt: string
  sentAt?: string
}
