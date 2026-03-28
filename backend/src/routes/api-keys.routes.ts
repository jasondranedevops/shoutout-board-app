import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/db/client'
import { generateApiKey } from '@/utils/api-key'
import { NotFoundError, ForbiddenError, ValidationError } from '@/utils/errors'

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).default(['boards:read', 'boards:write']),
})

export const apiKeysRoutes: FastifyPluginAsync = async (app) => {
  // List API keys
  app.get(
    '/v1/api-keys',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'List API keys for organization',
        tags: ['API Keys'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      if (request.user!.role !== 'ADMIN') {
        throw new ForbiddenError('Only admins can manage API keys')
      }

      const keys = await prisma.apiKey.findMany({
        where: { orgId: request.org!.id, revokedAt: null },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          scopes: true,
          lastUsedAt: true,
          createdAt: true,
        },
      })

      return reply.send({
        success: true,
        data: { keys },
      })
    }
  )

  // Create API key
  app.post<{ Body: z.infer<typeof CreateApiKeySchema> }>(
    '/v1/api-keys',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Create a new API key (returned once)',
        tags: ['API Keys'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        if (request.user!.role !== 'ADMIN') {
          throw new ForbiddenError('Only admins can create API keys')
        }

        const body = CreateApiKeySchema.parse(request.body)

        const { raw, hash, prefix } = generateApiKey()

        const apiKey = await prisma.apiKey.create({
          data: {
            orgId: request.org!.id,
            name: body.name,
            keyHash: hash,
            keyPrefix: prefix,
            scopes: body.scopes,
          },
        })

        return reply.status(201).send({
          success: true,
          data: {
            id: apiKey.id,
            name: apiKey.name,
            key: raw, // Only returned on creation
            prefix: apiKey.keyPrefix,
            scopes: apiKey.scopes,
            createdAt: apiKey.createdAt,
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

  // Revoke API key
  app.delete<{ Params: { id: string } }>(
    '/v1/api-keys/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Revoke an API key',
        tags: ['API Keys'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      if (request.user!.role !== 'ADMIN') {
        throw new ForbiddenError('Only admins can revoke API keys')
      }

      const apiKey = await prisma.apiKey.findFirst({
        where: { id: request.params.id, orgId: request.org!.id },
      })

      if (!apiKey) {
        throw new NotFoundError('API Key')
      }

      const revoked = await prisma.apiKey.update({
        where: { id: request.params.id },
        data: { revokedAt: new Date() },
      })

      return reply.send({
        success: true,
        data: {
          id: revoked.id,
          revokedAt: revoked.revokedAt,
        },
      })
    }
  )
}
