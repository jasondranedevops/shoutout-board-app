import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@/db/client'
import { NotFoundError, ForbiddenError } from '@/utils/errors'

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  // Organization analytics
  app.get(
    '/v1/analytics',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Get organization-level analytics',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const orgId = request.org!.id

      // Total boards
      const totalBoards = await prisma.board.count({
        where: { orgId },
      })

      // Total posts
      const totalPosts = await prisma.post.count({
        where: { board: { orgId } },
      })

      // Total contributors (unique authors)
      const totalContributors = await prisma.post.findMany({
        distinct: ['authorId'],
        where: { board: { orgId } },
        select: { authorId: true },
      })

      // Boards sent this month
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const boardsSentThisMonth = await prisma.board.count({
        where: {
          orgId,
          sentAt: { gte: monthStart },
        },
      })

      // Average posts per board
      const avgPostsPerBoard =
        totalBoards > 0 ? totalPosts / totalBoards : 0

      return reply.send({
        success: true,
        data: {
          totalBoards,
          totalPosts,
          totalContributors: totalContributors.filter((c) => c.authorId).length,
          totalAnonymousContributions: await prisma.post.count({
            where: {
              board: { orgId },
              isAnonymous: true,
            },
          }),
          boardsSentThisMonth,
          avgPostsPerBoard: Math.round(avgPostsPerBoard * 100) / 100,
        },
      })
    }
  )

  // Board analytics
  app.get<{ Params: { id: string } }>(
    '/v1/analytics/boards/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Get board-level analytics',
        tags: ['Analytics'],
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

      // View count
      const viewCount = await prisma.boardView.count({
        where: { boardId: request.params.id },
      })

      // Post count
      const postCount = await prisma.post.count({
        where: { boardId: request.params.id },
      })

      // Unique contributors
      const contributors = await prisma.post.findMany({
        distinct: ['authorId'],
        where: { boardId: request.params.id },
        select: {
          authorId: true,
          authorName: true,
        },
      })

      const uniqueContributors = contributors.filter((c) => c.authorId).length
      const anonymousContributions = contributors.filter(
        (c) => !c.authorId
      ).length

      // Posts timeline (posts per day)
      const posts = await prisma.post.findMany({
        where: { boardId: request.params.id },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      })

      const postsPerDay: Record<string, number> = {}
      posts.forEach((post) => {
        const day = post.createdAt.toISOString().split('T')[0]
        postsPerDay[day] = (postsPerDay[day] || 0) + 1
      })

      return reply.send({
        success: true,
        data: {
          viewCount,
          postCount,
          uniqueContributors,
          anonymousContributions,
          postsPerDay,
          boardStatus: board.status,
          createdAt: board.createdAt,
          sentAt: board.sentAt,
        },
      })
    }
  )
}
