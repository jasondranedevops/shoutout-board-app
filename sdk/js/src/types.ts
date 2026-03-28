export type OccasionType =
  | 'BIRTHDAY'
  | 'ANNIVERSARY'
  | 'FAREWELL'
  | 'PROMOTION'
  | 'WELCOME'
  | 'CUSTOM'

export type BoardStatus = 'DRAFT' | 'ACTIVE' | 'SENT'

export type Plan = 'STARTER' | 'GROWTH' | 'SCALE' | 'ENTERPRISE'

export interface Board {
  id: string
  orgId: string
  title: string
  occasionType: OccasionType
  status: BoardStatus
  recipientName: string
  recipientEmail?: string
  coverTheme: string
  slug: string
  postCount: number
  viewCount: number
  scheduledAt?: string
  sentAt?: string
  createdAt: string
  updatedAt: string
  creator?: { id: string; name: string; email: string }
  posts?: Post[]
}

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

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt?: string
  createdAt: string
  revokedAt?: string
}

export interface WebhookSubscription {
  id: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  event: string
  payload: Record<string, unknown>
  responseStatus?: number
  responseBody?: string
  attemptCount: number
  deliveredAt?: string
  createdAt: string
}

export interface OrgAnalytics {
  totalBoards: number
  totalPosts: number
  totalContributors: number
  totalAnonymousContributions: number
  boardsSentThisMonth: number
  avgPostsPerBoard: number
}

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

export interface Pagination {
  limit: number
  offset: number
  total: number
}

export interface PaginatedResult<T> {
  items: T[]
  pagination: Pagination
}

export interface CreateBoardParams {
  title: string
  occasionType: OccasionType
  recipientName: string
  recipientEmail?: string
  coverTheme?: string
  scheduledAt?: string
}

export interface UpdateBoardParams {
  title?: string
  recipientName?: string
  coverTheme?: string
  scheduledAt?: string
}

export interface ListBoardsParams {
  status?: BoardStatus
  occasionType?: OccasionType
  limit?: number
  offset?: number
}

export interface CreatePostParams {
  authorName: string
  contentText: string
  mediaUrl?: string
  gifUrl?: string
  isAnonymous?: boolean
}

export interface CreateWebhookParams {
  url: string
  events: string[]
  secret: string
}

export interface ShoutboardClientOptions {
  apiKey: string
  baseUrl?: string
}
