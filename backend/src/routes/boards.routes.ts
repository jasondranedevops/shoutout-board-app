import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/db/client'
import { generateBoardSlug } from '@/utils/slugify'
import { NotFoundError, ForbiddenError, ValidationError } from '@/utils/errors'
import { dispatchWebhook } from '@/services/webhook.service'
import { sendBoardDeliveryEmail } from '@/services/email.service'
import crypto from 'crypto'

const CreateBoardSchema = z.object({
  title: z.string().min(1).max(200),
  occasionType: z.enum([
    'BIRTHDAY',
    'ANNIVERSARY',
    'FAREWELL',
    'PROMOTION',
    'WELCOME',
    'CUSTOM',
  ]),
  recipientName: z.string().min(1).max(100),
  recipientEmail: z.string().email().optional(),
  coverTheme: z.string().default('indigo'),
  scheduledAt: z.string().datetime().optional(),
})

const UpdateBoardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  recipientName: z.string().min(1).max(100).optional(),
  coverTheme: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
})

const ScheduleBoardSchema = z.object({
  scheduledAt: z.string().datetime(),
})

export const boardsRoutes: FastifyPluginAsync = async (app) => {
  // List boards
  app.get<{ Querystring: any }>(
    '/v1/boards',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'List boards for the organization',
        tags: ['Boards'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'SENT'] },
            occasionType: { type: 'string' },
            limit: { type: 'number', default: 20 },
            offset: { type: 'number', default: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const limit = Math.min(request.query.limit || 20, 100)
      const offset = request.query.offset || 0

      const boards = await prisma.board.findMany({
        where: {
          orgId: request.org!.id,
          ...(request.query.status && { status: request.query.status }),
          ...(request.query.occasionType && {
            occasionType: request.query.occasionType,
          }),
        },
        include: {
          _count: {
            select: { posts: true, views: true },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })

      const total = await prisma.board.count({
        where: { orgId: request.org!.id },
      })

      return reply.send({
        success: true,
        data: {
          boards: boards.map((b) => ({
            id: b.id,
            title: b.title,
            slug: b.slug,
            occasionType: b.occasionType,
            status: b.status,
            recipientName: b.recipientName,
            coverTheme: b.coverTheme,
            postCount: b._count.posts,
            viewCount: b._count.views,
            createdAt: b.createdAt,
            sentAt: b.sentAt,
            creator: b.creator,
          })),
          pagination: { limit, offset, total },
        },
      })
    }
  )

  // Create board
  app.post<{ Body: z.infer<typeof CreateBoardSchema> }>(
    '/v1/boards',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Create a new board',
        tags: ['Boards'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const body = CreateBoardSchema.parse(request.body)

        const board = await prisma.board.create({
          data: {
            title: body.title,
            slug: generateBoardSlug(body.title),
            occasionType: body.occasionType,
            recipientName: body.recipientName,
            recipientEmail: body.recipientEmail,
            coverTheme: body.coverTheme,
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
            status: 'DRAFT',
            orgId: request.org!.id,
            creatorId: request.user!.id,
          },
          include: {
            creator: { select: { id: true, name: true, email: true } },
          },
        })

        await dispatchWebhook(request.org!.id, 'board.created', {
          boardId: board.id,
          title: board.title,
          recipientName: board.recipientName,
          createdAt: board.createdAt,
        })

        return reply.status(201).send({
          success: true,
          data: board,
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(error.issues[0].message)
        }
        throw error
      }
    }
  )

  // Get board
  app.get<{ Params: { id: string } }>(
    '/v1/boards/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Get board details with posts',
        tags: ['Boards'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const board = await prisma.board.findFirst({
        where: { id: request.params.id, orgId: request.org!.id },
        include: {
          posts: {
            select: {
              id: true,
              authorName: true,
              contentText: true,
              mediaUrl: true,
              gifUrl: true,
              isAnonymous: true,
              createdAt: true,
            },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { views: true },
          },
        },
      })

      if (!board) {
        throw new NotFoundError('Board')
      }

      return reply.send({
        success: true,
        data: {
          ...board,
          viewCount: board._count.views,
        },
      })
    }
  )

  // Update board
  app.patch<{ Params: { id: string }; Body: z.infer<typeof UpdateBoardSchema> }>(
    '/v1/boards/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Update board details',
        tags: ['Boards'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const body = UpdateBoardSchema.parse(request.body)

        const board = await prisma.board.findFirst({
          where: { id: request.params.id, orgId: request.org!.id },
        })

        if (!board) {
          throw new NotFoundError('Board')
        }

        if (
          board.creatorId !== request.user!.id &&
          request.user!.role !== 'ADMIN'
        ) {
          throw new ForbiddenError()
        }

        const updated = await prisma.board.update({
          where: { id: request.params.id },
          data: {
            ...(body.title && { title: body.title }),
            ...(body.recipientName && { recipientName: body.recipientName }),
            ...(body.coverTheme && { coverTheme: body.coverTheme }),
            ...(body.scheduledAt && {
              scheduledAt: new Date(body.scheduledAt),
            }),
          },
        })

        return reply.send({
          success: true,
          data: updated,
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(error.issues[0].message)
        }
        throw error
      }
    }
  )

  // Delete board
  app.delete<{ Params: { id: string } }>(
    '/v1/boards/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Delete a board',
        tags: ['Boards'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const board = await prisma.board.findFirst({
        where: { id: request.params.id, orgId: request.org!.id },
      })

      if (!board) {
        throw new NotFoundError('Board')
      }

      if (
        board.creatorId !== request.user!.id &&
        request.user!.role !== 'ADMIN'
      ) {
        throw new ForbiddenError()
      }

      await prisma.board.delete({
        where: { id: request.params.id },
      })

      return reply.send({
        success: true,
        data: { id: request.params.id },
      })
    }
  )

  // Send board
  app.post<{ Params: { id: string } }>(
    '/v1/boards/:id/send',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Send a board to recipient',
        tags: ['Boards'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const board = await prisma.board.findFirst({
        where: { id: request.params.id, orgId: request.org!.id },
      })

      if (!board) {
        throw new NotFoundError('Board')
      }

      if (
        board.creatorId !== request.user!.id &&
        request.user!.role !== 'ADMIN'
      ) {
        throw new ForbiddenError()
      }

      const updated = await prisma.board.update({
        where: { id: request.params.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      })

      // Send email if recipient email provided
      if (board.recipientEmail) {
        await sendBoardDeliveryEmail(
          board.recipientEmail,
          board.recipientName,
          board.slug,
          board.title
        )
      }

      // Trigger webhook
      await dispatchWebhook(request.org!.id, 'board.sent', {
        boardId: board.id,
        title: board.title,
        recipientName: board.recipientName,
        recipientEmail: board.recipientEmail,
        sentAt: updated.sentAt,
      })

      return reply.send({
        success: true,
        data: updated,
      })
    }
  )

  // Schedule board
  app.post<{
    Params: { id: string }
    Body: z.infer<typeof ScheduleBoardSchema>
  }>(
    '/v1/boards/:id/schedule',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Schedule a board to be sent later',
        tags: ['Boards'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const body = ScheduleBoardSchema.parse(request.body)

        const board = await prisma.board.findFirst({
          where: { id: request.params.id, orgId: request.org!.id },
        })

        if (!board) {
          throw new NotFoundError('Board')
        }

        if (
          board.creatorId !== request.user!.id &&
          request.user!.role !== 'ADMIN'
        ) {
          throw new ForbiddenError()
        }

        const updated = await prisma.board.update({
          where: { id: request.params.id },
          data: {
            scheduledAt: new Date(body.scheduledAt),
            status: 'ACTIVE',
          },
        })

        return reply.send({
          success: true,
          data: updated,
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(error.issues[0].message)
        }
        throw error
      }
    }
  )

  // Get board public
  app.get<{ Params: { slug: string } }>(
    '/v1/boards/:slug/public',
    {
      schema: {
        description: 'Get public board view',
        tags: ['Boards'],
      },
    },
    async (request, reply) => {
      const board = await prisma.board.findUnique({
        where: { slug: request.params.slug },
        include: {
          posts: {
            select: {
              id: true,
              authorName: true,
              contentText: true,
              mediaUrl: true,
              gifUrl: true,
              isAnonymous: true,
              createdAt: true,
            },
          },
          creator: {
            select: { id: true, name: true },
          },
          _count: {
            select: { views: true },
          },
        },
      })

      if (!board || board.status !== 'SENT') {
        throw new NotFoundError('Board')
      }

      // Record view
      const ipHash = crypto
        .createHash('sha256')
        .update(request.ip + process.env.API_KEY_SALT)
        .digest('hex')

      await prisma.boardView.create({
        data: {
          boardId: board.id,
          ipHash,
        },
      })

      return reply.send({
        success: true,
        data: {
          id: board.id,
          title: board.title,
          recipientName: board.recipientName,
          occasionType: board.occasionType,
          coverTheme: board.coverTheme,
          posts: board.posts,
          viewCount: board._count.views + 1,
          createdAt: board.createdAt,
          creator: board.creator,
        },
      })
    }
  )
}
