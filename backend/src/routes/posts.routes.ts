import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/db/client'
import { NotFoundError, ForbiddenError, ValidationError } from '@/utils/errors'
import { dispatchWebhook } from '@/services/webhook.service'

const CreatePostSchema = z.object({
  authorName: z.string().min(1).max(100),
  contentText: z.string().min(1).max(5000),
  mediaUrl: z.string().url().optional(),
  gifUrl: z.string().url().optional(),
  isAnonymous: z.boolean().default(false),
})

export const postsRoutes: FastifyPluginAsync = async (app) => {
  // List posts for board
  app.get<{ Params: { boardId: string }; Querystring: any }>(
    '/v1/boards/:boardId/posts',
    {
      schema: {
        description: 'List posts for a board',
        tags: ['Posts'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const board = await prisma.board.findUnique({
        where: { id: request.params.boardId },
      })

      if (!board) {
        throw new NotFoundError('Board')
      }

      // Only allow viewing posts from public sent boards without auth,
      // or from any board with auth for org members
      if (board.status !== 'SENT' && !request.user) {
        throw new ForbiddenError('Board is not public')
      }

      if (request.user && board.orgId !== request.org?.id) {
        throw new ForbiddenError()
      }

      const limit = Math.min(request.query.limit || 50, 100)
      const offset = request.query.offset || 0

      const posts = await prisma.post.findMany({
        where: { boardId: request.params.boardId },
        select: {
          id: true,
          authorName: true,
          contentText: true,
          mediaUrl: true,
          gifUrl: true,
          isAnonymous: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      })

      const total = await prisma.post.count({
        where: { boardId: request.params.boardId },
      })

      return reply.send({
        success: true,
        data: {
          posts,
          pagination: { limit, offset, total },
        },
      })
    }
  )

  // Create post
  app.post<{
    Params: { boardId: string }
    Body: z.infer<typeof CreatePostSchema>
  }>(
    '/v1/boards/:boardId/posts',
    {
      schema: {
        description: 'Add a post to a board (no auth required for public boards)',
        tags: ['Posts'],
      },
    },
    async (request, reply) => {
      try {
        const body = CreatePostSchema.parse(request.body)

        const board = await prisma.board.findUnique({
          where: { id: request.params.boardId },
          include: { org: true },
        })

        if (!board) {
          throw new NotFoundError('Board')
        }

        // Only allow posting to active/draft boards if authenticated org member,
        // or to sent boards without auth
        if (board.status === 'SENT') {
          // Public posting allowed
        } else if (request.user && board.orgId === request.org?.id) {
          // Org member can post to draft/active
        } else {
          throw new ForbiddenError('Cannot post to this board')
        }

        const post = await prisma.post.create({
          data: {
            boardId: request.params.boardId,
            authorId: request.user?.id,
            authorName: body.authorName,
            contentText: body.contentText,
            mediaUrl: body.mediaUrl,
            gifUrl: body.gifUrl,
            isAnonymous: body.isAnonymous,
          },
          select: {
            id: true,
            authorName: true,
            contentText: true,
            mediaUrl: true,
            gifUrl: true,
            isAnonymous: true,
            createdAt: true,
          },
        })

        // Trigger webhook
        await dispatchWebhook(board.org.id, 'post.created', {
          boardId: board.id,
          postId: post.id,
          authorName: post.authorName,
          isAnonymous: post.isAnonymous,
          createdAt: post.createdAt,
        })

        return reply.status(201).send({
          success: true,
          data: post,
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(error.issues[0].message)
        }
        throw error
      }
    }
  )

  // Delete post
  app.delete<{ Params: { boardId: string; postId: string } }>(
    '/v1/boards/:boardId/posts/:postId',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Delete a post (board creator or admin only)',
        tags: ['Posts'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const board = await prisma.board.findFirst({
        where: { id: request.params.boardId, orgId: request.org!.id },
      })

      if (!board) {
        throw new NotFoundError('Board')
      }

      const post = await prisma.post.findFirst({
        where: { id: request.params.postId, boardId: request.params.boardId },
      })

      if (!post) {
        throw new NotFoundError('Post')
      }

      if (
        board.creatorId !== request.user!.id &&
        request.user!.role !== 'ADMIN'
      ) {
        throw new ForbiddenError()
      }

      await prisma.post.delete({
        where: { id: request.params.postId },
      })

      // Trigger webhook
      await dispatchWebhook(request.org!.id, 'post.deleted', {
        boardId: board.id,
        postId: post.id,
      })

      return reply.send({
        success: true,
        data: { id: request.params.postId },
      })
    }
  )
}
