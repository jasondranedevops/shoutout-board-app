import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/db/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/utils/errors'

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
})

const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  active: z.boolean().optional(),
})

export const webhooksRoutes: FastifyPluginAsync = async (app) => {
  // List webhooks
  app.get(
    '/v1/webhooks',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'List webhook subscriptions',
        tags: ['Webhooks'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      if (request.user!.role !== 'ADMIN') {
        throw new ForbiddenError('Only admins can manage webhooks')
      }

      const webhooks = await prisma.webhookSubscription.findMany({
        where: { orgId: request.org!.id },
        select: {
          id: true,
          url: true,
          events: true,
          active: true,
          createdAt: true,
        },
      })

      return reply.send({
        success: true,
        data: { webhooks },
      })
    }
  )

  // Create webhook
  app.post<{ Body: z.infer<typeof CreateWebhookSchema> }>(
    '/v1/webhooks',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Create a webhook subscription',
        tags: ['Webhooks'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        if (request.user!.role !== 'ADMIN') {
          throw new ForbiddenError('Only admins can create webhooks')
        }

        const body = CreateWebhookSchema.parse(request.body)

        const secret = crypto.randomBytes(32).toString('hex')
        const secretHash = bcrypt.hashSync(secret, 10)

        const webhook = await prisma.webhookSubscription.create({
          data: {
            orgId: request.org!.id,
            url: body.url,
            events: body.events,
            secretHash,
          },
        })

        return reply.status(201).send({
          success: true,
          data: {
            id: webhook.id,
            url: webhook.url,
            events: webhook.events,
            secret, // Only returned on creation
            active: webhook.active,
            createdAt: webhook.createdAt,
          },
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(error.issues[0].message)
        }
        throw error
      }
    }
  )

  // Update webhook
  app.patch<{
    Params: { id: string }
    Body: z.infer<typeof UpdateWebhookSchema>
  }>(
    '/v1/webhooks/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Update webhook configuration',
        tags: ['Webhooks'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        if (request.user!.role !== 'ADMIN') {
          throw new ForbiddenError('Only admins can update webhooks')
        }

        const body = UpdateWebhookSchema.parse(request.body)

        const webhook = await prisma.webhookSubscription.findFirst({
          where: { id: request.params.id, orgId: request.org!.id },
        })

        if (!webhook) {
          throw new NotFoundError('Webhook')
        }

        const updated = await prisma.webhookSubscription.update({
          where: { id: request.params.id },
          data: {
            ...(body.url && { url: body.url }),
            ...(body.events && { events: body.events }),
            ...(body.active !== undefined && { active: body.active }),
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

  // Delete webhook
  app.delete<{ Params: { id: string } }>(
    '/v1/webhooks/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Delete a webhook subscription',
        tags: ['Webhooks'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      if (request.user!.role !== 'ADMIN') {
        throw new ForbiddenError('Only admins can delete webhooks')
      }

      const webhook = await prisma.webhookSubscription.findFirst({
        where: { id: request.params.id, orgId: request.org!.id },
      })

      if (!webhook) {
        throw new NotFoundError('Webhook')
      }

      await prisma.webhookSubscription.delete({
        where: { id: request.params.id },
      })

      return reply.send({
        success: true,
        data: { id: request.params.id },
      })
    }
  )

  // List deliveries
  app.get<{ Params: { id: string }; Querystring: any }>(
    '/v1/webhooks/:id/deliveries',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'List recent webhook deliveries',
        tags: ['Webhooks'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50 },
          },
        },
      },
    },
    async (request, reply) => {
      if (request.user!.role !== 'ADMIN') {
        throw new ForbiddenError('Only admins can view webhook deliveries')
      }

      const webhook = await prisma.webhookSubscription.findFirst({
        where: { id: request.params.id, orgId: request.org!.id },
      })

      if (!webhook) {
        throw new NotFoundError('Webhook')
      }

      const limit = Math.min((request.query as Record<string, any>).limit || 50, 100)

      const deliveries = await prisma.webhookDelivery.findMany({
        where: { webhookId: request.params.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          event: true,
          responseStatus: true,
          attemptCount: true,
          deliveredAt: true,
          createdAt: true,
        },
      })

      return reply.send({
        success: true,
        data: { deliveries },
      })
    }
  )
}
