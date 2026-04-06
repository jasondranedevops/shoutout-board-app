import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@/db/client'
import { NotFoundError } from '@/utils/errors'

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

      const [
        totalBoards,
        totalPosts,
        contributors,
        anonymousContributions,
        boardsSentThisMonth,
        occasionGroups,
      ] = await Promise.all([
        prisma.board.count({ where: { orgId } }),

        prisma.post.count({ where: { board: { orgId } } }),

        prisma.post.findMany({
          distinct: ['authorId'],
          where: { board: { orgId } },
          select: { authorId: true },
        }),

        prisma.post.count({
          where: { board: { orgId }, isAnonymous: true },
        }),

        prisma.board.count({
          where: {
            orgId,
            sentAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
        }),

        prisma.board.groupBy({
          by: ['occasionType'],
          where: { orgId },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
        }),
      ])

      const totalContributors = contributors.filter((c) => c.authorId).length
      const avgPostsPerBoard = totalBoards > 0
        ? Math.round((totalPosts / totalBoards) * 100) / 100
        : 0

      const occasionBreakdown = occasionGroups.map((g) => ({
        occasion: g.occasionType.charAt(0).toUpperCase() + g.occasionType.slice(1).toLowerCase(),
        count: g._count.id,
      }))

      return reply.send({
        success: true,
        data: {
          totalBoards,
          totalPosts,
          totalContributors,
          totalAnonymousContributions: anonymousContributions,
          boardsSentThisMonth,
          avgPostsPerBoard,
          occasionBreakdown,
        },
      })
    }
  )

  // Monthly trends — last 6 months
  app.get(
    '/v1/analytics/trends',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Get monthly activity trends for the last 6 months',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const orgId = request.org!.id

      const sixMonthsAgo = new Date()
      sixMonthsAgo.setDate(1)
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
      sixMonthsAgo.setHours(0, 0, 0, 0)

      const [boards, posts] = await Promise.all([
        prisma.board.findMany({
          where: { orgId, createdAt: { gte: sixMonthsAgo } },
          select: { createdAt: true },
        }),
        prisma.post.findMany({
          where: { board: { orgId }, createdAt: { gte: sixMonthsAgo } },
          select: { createdAt: true, authorId: true },
        }),
      ])

      // Build 6-month slots in order
      type Slot = { month: string; boards: number; posts: number; contributorIds: Set<string> }
      const monthMap = new Map<string, Slot>()

      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setDate(1)
        d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthMap.set(key, {
          month: d.toLocaleString('en-US', { month: 'short' }),
          boards: 0,
          posts: 0,
          contributorIds: new Set(),
        })
      }

      const monthKey = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      boards.forEach((b) => {
        const slot = monthMap.get(monthKey(b.createdAt))
        if (slot) slot.boards++
      })

      posts.forEach((p) => {
        const slot = monthMap.get(monthKey(p.createdAt))
        if (slot) {
          slot.posts++
          if (p.authorId) slot.contributorIds.add(p.authorId)
        }
      })

      const trends = Array.from(monthMap.values()).map(({ contributorIds, ...rest }) => ({
        ...rest,
        contributors: contributorIds.size,
      }))

      return reply.send({ success: true, data: trends })
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

      const [viewCount, postCount, contributors, posts] = await Promise.all([
        prisma.boardView.count({ where: { boardId: board.id } }),

        prisma.post.count({ where: { boardId: board.id } }),

        prisma.post.findMany({
          distinct: ['authorId'],
          where: { boardId: board.id },
          select: { authorId: true, authorName: true },
        }),

        prisma.post.findMany({
          where: { boardId: board.id },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
      ])

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
          uniqueContributors: contributors.filter((c) => c.authorId).length,
          anonymousContributions: contributors.filter((c) => !c.authorId).length,
          postsPerDay,
          boardStatus: board.status,
          createdAt: board.createdAt,
          sentAt: board.sentAt,
        },
      })
    }
  )
}
