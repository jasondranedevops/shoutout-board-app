import { HttpClient } from './client'
import { BoardsResource } from './resources/boards'
import { PostsResource } from './resources/posts'
import { WebhooksResource } from './resources/webhooks'
import { AnalyticsResource } from './resources/analytics'
import { ShoutboardClientOptions } from './types'

export { ShoutboardError } from './client'
export * from './types'

/**
 * Shoutboard API client
 *
 * @example
 * ```ts
 * import { ShoutboardClient } from '@shoutboard/sdk'
 *
 * const client = new ShoutboardClient({ apiKey: 'sb_live_...' })
 *
 * const boards = await client.boards.list()
 * const board  = await client.boards.create({
 *   title: 'Happy Birthday, Jane!',
 *   occasionType: 'BIRTHDAY',
 *   recipientName: 'Jane Smith',
 *   recipientEmail: 'jane@example.com',
 * })
 * await client.boards.send(board.id)
 * ```
 */
export class ShoutboardClient {
  readonly boards: BoardsResource
  readonly posts: PostsResource
  readonly webhooks: WebhooksResource
  readonly analytics: AnalyticsResource

  constructor(options: ShoutboardClientOptions) {
    const http = new HttpClient(options)
    this.boards = new BoardsResource(http)
    this.posts = new PostsResource(http)
    this.webhooks = new WebhooksResource(http)
    this.analytics = new AnalyticsResource(http)
  }
}
