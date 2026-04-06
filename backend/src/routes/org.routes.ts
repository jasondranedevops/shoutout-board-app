import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/db/client'
import { ForbiddenError, ValidationError, ConflictError } from '@/utils/errors'

const UpdateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
})

export const orgRoutes: FastifyPluginAsync = async (app) => {
  // Get current org
  app.get(
    '/v1/org',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Get current organization details',
        tags: ['Organization'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const org = await prisma.organization.findUnique({
        where: { id: request.org!.id },
        select: { id: true, name: true, slug: true, plan: true, createdAt: true },
      })

      return reply.send({ success: true, data: { org } })
    }
  )

  // Update org settings
  app.patch<{ Body: z.infer<typeof UpdateOrgSchema> }>(
    '/v1/org',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Update organization settings',
        tags: ['Organization'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      if (request.user!.role !== 'ADMIN') {
        throw new ForbiddenError('Only admins can update organization settings')
      }

      try {
        const body = UpdateOrgSchema.parse(request.body)

        // Check slug uniqueness if being changed
        if (body.slug && body.slug !== request.org!.slug) {
          const existing = await prisma.organization.findUnique({
            where: { slug: body.slug },
          })
          if (existing) {
            throw new ConflictError('Slug is already taken')
          }
        }

        const updated = await prisma.organization.update({
          where: { id: request.org!.id },
          data: {
            ...(body.name && { name: body.name }),
            ...(body.slug && { slug: body.slug }),
          },
          select: { id: true, name: true, slug: true, plan: true },
        })

        return reply.send({
          success: true,
          data: { org: updated },
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(error.issues[0].message)
        }
        throw error
      }
    }
  )
}
