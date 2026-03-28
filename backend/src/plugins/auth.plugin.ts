import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@/db/client'
import { hashApiKey } from '@/utils/api-key'
import { UnauthorizedError } from '@/utils/errors'
import crypto from 'crypto'

export const authPlugin: FastifyPluginAsync = async (app) => {
  // JWT authentication decorator
  app.decorate('authenticate', async function (request: any) {
    try {
      await request.jwtVerify()

      const user = await prisma.user.findUnique({
        where: { id: request.user.sub },
      })

      if (!user) {
        throw new UnauthorizedError()
      }

      const org = await prisma.organization.findUnique({
        where: { id: user.orgId },
      })

      if (!org) {
        throw new UnauthorizedError()
      }

      request.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }

      request.org = {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
      }
    } catch (err) {
      throw new UnauthorizedError()
    }
  })

  // API Key authentication decorator
  app.decorate(
    'authenticateApiKey',
    async function (request: any) {
      try {
        const apiKey = request.headers['x-api-key'] as string

        if (!apiKey) {
          throw new UnauthorizedError()
        }

        const hash = hashApiKey(apiKey)

        const keyRecord = await prisma.apiKey.findUnique({
          where: { keyHash: hash },
          include: { org: true },
        })

        if (!keyRecord || keyRecord.revokedAt) {
          throw new UnauthorizedError()
        }

        // Update last used
        await prisma.apiKey.update({
          where: { id: keyRecord.id },
          data: { lastUsedAt: new Date() },
        })

        request.org = {
          id: keyRecord.org.id,
          name: keyRecord.org.name,
          slug: keyRecord.org.slug,
          plan: keyRecord.org.plan,
        }

        request.apiKeyId = keyRecord.id
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          throw err
        }
        throw new UnauthorizedError()
      }
    }
  )
}
