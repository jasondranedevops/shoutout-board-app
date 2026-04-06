import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@/db/client'
import { nanoid } from 'nanoid'
import {
  exchangeSlackCode,
  verifySlackSignature,
  postSlashCommandResponse,
  notifySlackBoardCreated,
} from '@/services/slack.service'
import pino from 'pino'

const logger = pino({ name: 'slack-routes' })

const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const API_URL = process.env.API_URL || 'http://localhost:4000'
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || ''
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || ''

// Scopes needed for the bot
const SLACK_SCOPES = [
  'chat:write',
  'commands',
  'channels:read',
  'groups:read',
].join(',')

export const slackRoutes: FastifyPluginAsync = async (app) => {
  // ── OAuth Install ──────────────────────────────────────────────────────────
  // Redirect user to Slack's OAuth page. We pass the orgId as state.
  // Accepts token as query param because this is a browser redirect (can't set headers).
  app.get<{ Querystring: { token?: string } }>(
    '/v1/slack/oauth/install',
    async (request, reply) => {
      // Verify JWT from query param
      const token = request.query.token
      if (!token) return reply.status(401).send('Unauthorized')

      let orgId: string
      try {
        const decoded = app.jwt.verify(token) as { sub: string }
        const user = await prisma.user.findUnique({
          where: { id: decoded.sub },
          select: { orgId: true },
        })
        if (!user) return reply.status(401).send('User not found')
        orgId = user.orgId
      } catch {
        return reply.status(401).send('Invalid token')
      }

      const state = Buffer.from(
        JSON.stringify({ orgId, nonce: nanoid(12) })
      ).toString('base64url')

      const url = new URL('https://slack.com/oauth/v2/authorize')
      url.searchParams.set('client_id', SLACK_CLIENT_ID)
      url.searchParams.set('scope', SLACK_SCOPES)
      url.searchParams.set('redirect_uri', `${API_URL}/api/slack/oauth/callback`)
      url.searchParams.set('state', state)

      return reply.redirect(url.toString())
    }
  )

  // ── OAuth Callback ─────────────────────────────────────────────────────────
  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/api/slack/oauth/callback',
    async (request, reply) => {
      const { code, state, error } = request.query

      if (error || !code || !state) {
        return reply.redirect(`${APP_URL}/settings?slack=error&reason=${error || 'missing_code'}`)
      }

      let orgId: string
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
        orgId = decoded.orgId
      } catch {
        return reply.redirect(`${APP_URL}/settings?slack=error&reason=invalid_state`)
      }

      try {
        const { teamId, teamName, botToken, botUserId } = await exchangeSlackCode(code)

        await prisma.slackInstallation.upsert({
          where: { orgId },
          update: { teamId, teamName, botToken, botUserId },
          create: { orgId, teamId, teamName, botToken, botUserId },
        })

        logger.info({ orgId, teamId }, 'Slack installed')
        return reply.redirect(`${APP_URL}/settings?slack=success`)
      } catch (err) {
        logger.error({ err }, 'Slack OAuth callback failed')
        return reply.redirect(`${APP_URL}/settings?slack=error&reason=oauth_failed`)
      }
    }
  )

  // ── Slash Command: /shoutboard ─────────────────────────────────────────────
  app.post(
    '/api/slack/commands',
    async (request, reply) => {
      // Verify Slack signature
      const timestamp = request.headers['x-slack-request-timestamp'] as string
      const signature = request.headers['x-slack-signature'] as string
      const rawBody = (request as any).rawBody || ''

      if (
        !verifySlackSignature(SLACK_SIGNING_SECRET, rawBody, timestamp, signature)
      ) {
        return reply.status(401).send('Unauthorized')
      }

      const body = request.body as Record<string, string>
      const { command, text = '', response_url, team_id } = body

      // Look up org by Slack team ID
      const installation = await prisma.slackInstallation.findFirst({
        where: { teamId: team_id },
      })

      if (!installation) {
        return reply.send({
          response_type: 'ephemeral',
          text: '⚠️ Shoutboard is not connected to this workspace. Visit your dashboard to install.',
        })
      }

      const args = text.trim().split(/\s+/)
      const subcommand = args[0]?.toLowerCase()

      // Respond immediately (Slack requires response within 3s)
      reply.send({ response_type: 'ephemeral', text: '⏳ Working on it...' })

      // Process asynchronously
      setImmediate(async () => {
        try {
          if (!subcommand || subcommand === 'help') {
            await postSlashCommandResponse(response_url, {
              response_type: 'ephemeral',
              text: [
                '*Shoutboard commands:*',
                '`/shoutboard list` — Show recent boards',
                '`/shoutboard create "Title" for @name` — Create a board',
              ].join('\n'),
            })
            return
          }

          if (subcommand === 'list') {
            const boards = await prisma.board.findMany({
              where: { orgId: installation.orgId },
              orderBy: { createdAt: 'desc' },
              take: 5,
              select: { id: true, title: true, status: true, recipientName: true, slug: true },
            })

            if (boards.length === 0) {
              await postSlashCommandResponse(response_url, {
                response_type: 'ephemeral',
                text: 'No boards yet. Create one with `/shoutboard create "Happy Birthday, Alex!" for Alex`',
              })
              return
            }

            const statusEmoji: Record<string, string> = {
              DRAFT: '📝',
              ACTIVE: '🟢',
              SENT: '✅',
            }

            await postSlashCommandResponse(response_url, {
              response_type: 'ephemeral',
              blocks: [
                {
                  type: 'section',
                  text: { type: 'mrkdwn', text: '*Recent Shoutboards:*' },
                },
                ...boards.map((b) => ({
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `${statusEmoji[b.status] ?? '•'} *${b.title}*\nFor ${b.recipientName} · ${b.status}`,
                  },
                  accessory: {
                    type: 'button',
                    text: { type: 'plain_text', text: 'View', emoji: true },
                    url: `${APP_URL}/b/${b.slug}`,
                    action_id: `view_${b.id}`,
                  },
                })),
              ],
            })
            return
          }

          if (subcommand === 'create') {
            // Parse: create "Title" for RecipientName
            const fullText = args.slice(1).join(' ')
            const match = fullText.match(/^"(.+?)"\s+for\s+(.+)$/i)

            if (!match) {
              await postSlashCommandResponse(response_url, {
                response_type: 'ephemeral',
                text: '❌ Usage: `/shoutboard create "Board title" for Recipient Name`',
              })
              return
            }

            const title = match[1]
            const recipientName = match[2].replace(/^@/, '').trim()

            // Pick occasion type from title keywords
            const titleLower = title.toLowerCase()
            const occasionType =
              titleLower.includes('birthday')
                ? 'BIRTHDAY'
                : titleLower.includes('anniversary')
                ? 'ANNIVERSARY'
                : titleLower.includes('farewell') || titleLower.includes('goodbye')
                ? 'FAREWELL'
                : titleLower.includes('welcome')
                ? 'WELCOME'
                : titleLower.includes('promotion') || titleLower.includes('congrat')
                ? 'PROMOTION'
                : 'CUSTOM'

            // Find admin user for this org
            const creator = await prisma.user.findFirst({
              where: { orgId: installation.orgId, role: 'ADMIN' },
            })
            if (!creator) {
              await postSlashCommandResponse(response_url, {
                response_type: 'ephemeral',
                text: '❌ Could not find an admin user for your organization.',
              })
              return
            }

            const slug = `${title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .slice(0, 40)}-${nanoid(6)}`

            const board = await prisma.board.create({
              data: {
                orgId: installation.orgId,
                creatorId: creator.id,
                title,
                occasionType: occasionType as any,
                slug,
                status: 'ACTIVE',
                recipientName,
              },
            })

            await postSlashCommandResponse(response_url, {
              response_type: 'in_channel',
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `🎉 *${title}* has been created for *${recipientName}*!\nShare the link below so teammates can add their messages.`,
                  },
                },
                {
                  type: 'actions',
                  elements: [
                    {
                      type: 'button',
                      text: { type: 'plain_text', text: '✍️ Add a message', emoji: true },
                      style: 'primary',
                      url: `${APP_URL}/b/${board.slug}`,
                      action_id: 'add_message',
                    },
                    {
                      type: 'button',
                      text: { type: 'plain_text', text: '⚙️ Manage board', emoji: true },
                      url: `${APP_URL}/boards/${board.id}`,
                      action_id: 'manage_board',
                    },
                  ],
                },
              ],
            })

            await notifySlackBoardCreated(installation.orgId, {
              title: board.title,
              recipientName: board.recipientName,
              slug: board.slug,
              occasionType: board.occasionType,
            })

            return
          }

          // Unknown subcommand
          await postSlashCommandResponse(response_url, {
            response_type: 'ephemeral',
            text: `❓ Unknown command \`${subcommand}\`. Try \`/shoutboard help\`.`,
          })
        } catch (err) {
          logger.error({ err }, 'Slash command processing failed')
          await postSlashCommandResponse(response_url, {
            response_type: 'ephemeral',
            text: '❌ Something went wrong. Please try again.',
          }).catch(() => {})
        }
      })
    }
  )

  // ── Interactivity (button clicks) ──────────────────────────────────────────
  app.post('/api/slack/interactions', async (request, reply) => {
    const timestamp = request.headers['x-slack-request-timestamp'] as string
    const signature = request.headers['x-slack-signature'] as string
    const rawBody = (request as any).rawBody || ''

    if (!verifySlackSignature(SLACK_SIGNING_SECRET, rawBody, timestamp, signature)) {
      return reply.status(401).send('Unauthorized')
    }

    // Interactions are URL-encoded with a "payload" field
    const body = request.body as Record<string, string>
    let payload: any
    try {
      payload = JSON.parse(body.payload)
    } catch {
      return reply.send({ ok: true })
    }

    // Most actions (button URL clicks) are handled by Slack itself — just ack
    return reply.send({ ok: true })
  })

  // ── Settings API ───────────────────────────────────────────────────────────

  // Get Slack installation status
  app.get(
    '/v1/slack/status',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const installation = await prisma.slackInstallation.findUnique({
        where: { orgId: request.org!.id },
        select: {
          id: true,
          teamName: true,
          incomingChannel: true,
          createdAt: true,
        },
      })
      return reply.send({ success: true, data: { installation } })
    }
  )

  // Update notification channel
  app.patch<{ Body: { incomingChannel: string } }>(
    '/v1/slack/channel',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { incomingChannel } = request.body
      const installation = await prisma.slackInstallation.findUnique({
        where: { orgId: request.org!.id },
      })
      if (!installation) {
        return reply.status(404).send({ success: false, error: { message: 'Slack not connected' } })
      }
      await prisma.slackInstallation.update({
        where: { orgId: request.org!.id },
        data: { incomingChannel },
      })
      return reply.send({ success: true })
    }
  )

  // Disconnect Slack
  app.delete(
    '/v1/slack',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      await prisma.slackInstallation.deleteMany({
        where: { orgId: request.org!.id },
      })
      return reply.send({ success: true })
    }
  )
}
