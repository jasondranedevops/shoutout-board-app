import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@/db/client'
import { nanoid } from 'nanoid'
import {
  exchangeSlackCode,
  verifySlackSignature,
  postSlashCommandResponse,
  notifySlackBoardCreated,
} from '@/services/slack.service'
import { encrypt, decrypt } from '@/services/encryption.service'
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

/**
 * Parse a human-readable date/time string into a Date.
 *
 * Date formats accepted:
 *   YYYY-MM-DD, MM/DD/YYYY, MM/DD,
 *   "Dec 25", "December 25", "Dec 25 2026", "December 25, 2026"
 *
 * Optional time suffix (append to any date above):
 *   "at 9am", "at 9:30am", "at 14:00", "at 2pm"
 *
 * Examples:
 *   "Dec 25"            → Dec 25 current/next year at 9:00 AM
 *   "Dec 25 at 3pm"     → Dec 25 current/next year at 3:00 PM
 *   "2026-06-15 at 10am"→ June 15 2026 at 10:00 AM
 *   "03/15 at 9:30am"   → Mar 15 current/next year at 9:30 AM
 *
 * If no year is given and the date has passed, assumes next year.
 * If no time is given, defaults to 9:00 AM.
 */
function parseDateTime(str: string): Date | null {
  const s = str.trim()

  // Split off optional "at HH:MMam/pm" or "at HH:MM" time suffix
  const atMatch = s.match(/^(.+?)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  const datePart = atMatch ? atMatch[1].trim() : s
  let hours = 9   // default 9 AM
  let minutes = 0
  if (atMatch) {
    hours = parseInt(atMatch[2])
    minutes = atMatch[3] ? parseInt(atMatch[3]) : 0
    const meridiem = atMatch[4]?.toLowerCase()
    if (meridiem === 'pm' && hours !== 12) hours += 12
    if (meridiem === 'am' && hours === 12) hours = 0
  }

  const MONTHS: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  }

  let d: Date | null = null

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [y, mo, day] = datePart.split('-').map(Number)
    d = new Date(y, mo - 1, day, hours, minutes)
  }

  // MM/DD/YYYY
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(datePart)) {
    const [mo, day, y] = datePart.split('/').map(Number)
    d = new Date(y, mo - 1, day, hours, minutes)
  }

  // MM/DD — assume current or next year
  else if (/^\d{1,2}\/\d{1,2}$/.test(datePart)) {
    const [mo, day] = datePart.split('/').map(Number)
    const now = new Date()
    d = new Date(now.getFullYear(), mo - 1, day, hours, minutes)
    if (d <= now) d.setFullYear(d.getFullYear() + 1)
  }

  // "Month DD", "Month DD YYYY", "Month DD, YYYY"
  else {
    const mname = datePart.match(/^([a-z]+)\s+(\d{1,2})(?:[,\s]+(\d{4}))?$/i)
    if (mname) {
      const monthNum = MONTHS[mname[1].toLowerCase()]
      if (monthNum === undefined) return null
      const day = parseInt(mname[2])
      if (mname[3]) {
        d = new Date(parseInt(mname[3]), monthNum, day, hours, minutes)
      } else {
        const now = new Date()
        d = new Date(now.getFullYear(), monthNum, day, hours, minutes)
        if (d <= now) d.setFullYear(d.getFullYear() + 1)
      }
    }
  }

  if (!d || isNaN(d.getTime())) return null
  return d
}

function formatDate(d: Date): string {
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

async function getSlackCredentials(orgId: string) {
  const config = await prisma.slackAppConfig.findUnique({ where: { orgId } })
  return {
    clientId: config?.clientId || SLACK_CLIENT_ID,
    clientSecret: config ? decrypt(config.clientSecretEnc) : (process.env.SLACK_CLIENT_SECRET || ''),
    signingSecret: config ? decrypt(config.signingSecretEnc) : SLACK_SIGNING_SECRET,
    hasConfig: !!config,
  }
}

export const slackRoutes: FastifyPluginAsync = async (app) => {
  // ── App Configuration ──────────────────────────────────────────────────────
  // Save org-level Slack app credentials (clientId, clientSecret, signingSecret)
  app.put<{ Body: { clientId: string; clientSecret: string; signingSecret: string } }>(
    '/v1/slack/app-config',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { clientId, clientSecret, signingSecret } = request.body
      if (!clientId || !clientSecret || !signingSecret) {
        return reply.status(400).send({ success: false, error: { message: 'clientId, clientSecret, and signingSecret are required' } })
      }
      await prisma.slackAppConfig.upsert({
        where: { orgId: request.org!.id },
        update: {
          clientId,
          clientSecretEnc: encrypt(clientSecret),
          signingSecretEnc: encrypt(signingSecret),
        },
        create: {
          orgId: request.org!.id,
          clientId,
          clientSecretEnc: encrypt(clientSecret),
          signingSecretEnc: encrypt(signingSecret),
        },
      })
      return reply.send({ success: true })
    }
  )

  // Get org's Slack app config (non-sensitive fields only)
  app.get(
    '/v1/slack/app-config',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const config = await prisma.slackAppConfig.findUnique({
        where: { orgId: request.org!.id },
        select: { clientId: true, createdAt: true },
      })
      return reply.send({
        success: true,
        data: {
          config: config
            ? { clientId: config.clientId, hasClientSecret: true, hasSigningSecret: true, createdAt: config.createdAt }
            : null,
        },
      })
    }
  )

  // Delete org's Slack app config
  app.delete(
    '/v1/slack/app-config',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      await prisma.slackAppConfig.deleteMany({ where: { orgId: request.org!.id } })
      return reply.send({ success: true })
    }
  )


  // ── OAuth Install URL (JSON) ───────────────────────────────────────────────
  // Returns the Slack OAuth URL as JSON. Used by the frontend to initiate the
  // install flow without needing to navigate directly (browser can't set headers).
  app.get(
    '/v1/slack/oauth/install-url',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const state = Buffer.from(
        JSON.stringify({ orgId: request.org!.id, nonce: nanoid(12) })
      ).toString('base64url')

      const url = new URL('https://slack.com/oauth/v2/authorize')
      url.searchParams.set('client_id', SLACK_CLIENT_ID)
      url.searchParams.set('scope', SLACK_SCOPES)
      url.searchParams.set('redirect_uri', `${API_URL}/api/slack/oauth/callback`)
      url.searchParams.set('state', state)

      return reply.send({ success: true, data: { url: url.toString() } })
    }
  )

  // ── OAuth Install (redirect) ───────────────────────────────────────────────
  // Kept for backward compatibility — redirects to Slack's OAuth page.
  app.get<{ Querystring: { orgId: string } }>(
    '/v1/slack/oauth/install',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const state = Buffer.from(
        JSON.stringify({ orgId: request.org!.id, nonce: nanoid(12) })
      ).toString('base64url')

      const creds = await getSlackCredentials(request.org!.id)
      if (!creds.clientId) {
        return reply.status(400).send({ success: false, error: { message: 'Slack app credentials not configured' } })
      }

      const url = new URL('https://slack.com/oauth/v2/authorize')
      url.searchParams.set('client_id', creds.clientId)
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
        const creds = await getSlackCredentials(orgId)
        const redirectUri = `${API_URL}/api/slack/oauth/callback`
        const { teamId, teamName, botToken, botUserId } = await exchangeSlackCode(
          code, creds.clientId, creds.clientSecret, redirectUri
        )

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
      const timestamp = request.headers['x-slack-request-timestamp'] as string
      const signature = request.headers['x-slack-signature'] as string
      const rawBody = (request as any).rawBody || ''

      const body = request.body as Record<string, string>
      const { command, text = '', response_url, team_id } = body

      // Look up org by Slack team ID to get their signing secret
      const installation = await prisma.slackInstallation.findFirst({
        where: { teamId: team_id },
      })

      // Get signing secret — org config takes precedence over env var
      let signingSecret = SLACK_SIGNING_SECRET
      if (installation) {
        const config = await prisma.slackAppConfig.findUnique({ where: { orgId: installation.orgId } })
        if (config) signingSecret = decrypt(config.signingSecretEnc)
      }

      if (!verifySlackSignature(signingSecret, rawBody, timestamp, signature)) {
        return reply.status(401).send('Unauthorized')
      }

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
              blocks: [
                {
                  type: 'section',
                  text: { type: 'mrkdwn', text: '*Shoutboard commands:*' },
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: [
                      '`/shoutboard list` — Show recent boards',
                      '`/shoutboard create "Title" for Name` — Create a board (open immediately)',
                      '`/shoutboard create "Title" for Name on Dec 25` — Create & schedule send date',
                      '`/shoutboard create "Title" for Name on Dec 25 at 9am` — Create with date & time',
                      '`/shoutboard schedule "Title" on Dec 25 at 9am` — Set/update send date on existing board',
                      '`/shoutboard help` — Show this message',
                    ].join('\n'),
                  },
                },
                {
                  type: 'context',
                  elements: [{
                    type: 'mrkdwn',
                    text: 'Date formats: `Dec 25`, `12/25`, `2026-12-25` · Time: `at 9am`, `at 2:30pm`',
                  }],
                },
              ],
            })
            return
          }

          if (subcommand === 'list') {
            const boards = await prisma.board.findMany({
              where: { orgId: installation.orgId },
              orderBy: { createdAt: 'desc' },
              take: 5,
              select: { id: true, title: true, status: true, recipientName: true, slug: true, scheduledAt: true },
            })

            if (boards.length === 0) {
              await postSlashCommandResponse(response_url, {
                response_type: 'ephemeral',
                text: 'No boards yet. Create one with `/shoutboard create "Happy Birthday, Alex!" for Alex on Dec 25`',
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
                ...boards.map((b) => {
                  const scheduledLine = b.scheduledAt
                    ? `\n📅 Sends ${formatDate(new Date(b.scheduledAt))}`
                    : ''
                  return {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: `${statusEmoji[b.status] ?? '•'} *${b.title}*\nFor ${b.recipientName} · ${b.status}${scheduledLine}`,
                    },
                    accessory: {
                      type: 'button',
                      text: { type: 'plain_text', text: 'View', emoji: true },
                      url: `${APP_URL}/b/${b.slug}`,
                      action_id: `view_${b.id}`,
                    },
                  }
                }),
              ],
            })
            return
          }

          if (subcommand === 'create') {
            // Parse: create "Title" for RecipientName [on <date> [at <time>]]
            const fullText = args.slice(1).join(' ')
            const match = fullText.match(/^"(.+?)"\s+for\s+(.+)$/i)

            if (!match) {
              await postSlashCommandResponse(response_url, {
                response_type: 'ephemeral',
                text: '❌ Usage: `/shoutboard create "Board title" for Name` or `/shoutboard create "Board title" for Name on Dec 25 at 9am`',
              })
              return
            }

            const title = match[1]
            // Split recipient from optional "on <date>" clause
            const recipientAndDate = match[2]
            const onIdx = recipientAndDate.search(/\s+on\s+/i)
            let recipientName: string
            let scheduledAt: Date | null = null

            if (onIdx !== -1) {
              recipientName = recipientAndDate.slice(0, onIdx).replace(/^@/, '').trim()
              const dateStr = recipientAndDate.slice(onIdx).replace(/^\s+on\s+/i, '').trim()
              scheduledAt = parseDateTime(dateStr)
              if (!scheduledAt) {
                await postSlashCommandResponse(response_url, {
                  response_type: 'ephemeral',
                  text: `❌ Couldn't parse date: *${dateStr}*\nTry formats like \`Dec 25\`, \`Dec 25 at 9am\`, \`12/25\`, \`2026-12-25 at 2pm\``,
                })
                return
              }
            } else {
              recipientName = recipientAndDate.replace(/^@/, '').trim()
            }

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
                ...(scheduledAt && { scheduledAt }),
              },
            })

            const scheduleNote = scheduledAt
              ? `\n📅 Will automatically send on *${formatDate(scheduledAt)}*`
              : '\nShare the link so teammates can add their messages.'

            await postSlashCommandResponse(response_url, {
              response_type: 'in_channel',
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `🎉 *${title}* has been created for *${recipientName}*!${scheduleNote}`,
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

          if (subcommand === 'schedule') {
            // Usage: schedule "Title" on <date> [at <time>]
            const fullText = args.slice(1).join(' ')
            const match = fullText.match(/^"(.+?)"\s+on\s+(.+)$/i)

            if (!match) {
              await postSlashCommandResponse(response_url, {
                response_type: 'ephemeral',
                text: '❌ Usage: `/shoutboard schedule "Board title" on Dec 25 at 9am`',
              })
              return
            }

            const titleQuery = match[1].trim()
            const dateStr = match[2].trim()
            const scheduledAt = parseDateTime(dateStr)

            if (!scheduledAt) {
              await postSlashCommandResponse(response_url, {
                response_type: 'ephemeral',
                text: `❌ Couldn't parse date: *${dateStr}*\nTry formats like \`Dec 25\`, \`Dec 25 at 9am\`, \`12/25\`, \`2026-12-25 at 2pm\``,
              })
              return
            }

            // Find board by title (partial match, most recent first)
            const board = await prisma.board.findFirst({
              where: {
                orgId: installation.orgId,
                title: { contains: titleQuery, mode: 'insensitive' },
                status: { not: 'SENT' },
              },
              orderBy: { createdAt: 'desc' },
            })

            if (!board) {
              await postSlashCommandResponse(response_url, {
                response_type: 'ephemeral',
                text: `❌ No active board found matching *"${titleQuery}"*. Use \`/shoutboard list\` to see your boards.`,
              })
              return
            }

            await prisma.board.update({
              where: { id: board.id },
              data: { scheduledAt },
            })

            await postSlashCommandResponse(response_url, {
              response_type: 'ephemeral',
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `✅ *${board.title}* is scheduled to send on *${formatDate(scheduledAt)}*`,
                  },
                },
                {
                  type: 'actions',
                  elements: [{
                    type: 'button',
                    text: { type: 'plain_text', text: '⚙️ Manage board', emoji: true },
                    url: `${APP_URL}/boards/${board.id}`,
                    action_id: 'manage_board',
                  }],
                },
              ],
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

    // Parse payload first to get team_id for org-specific signing secret lookup
    const body = request.body as Record<string, string>
    let teamId: string | undefined
    try {
      const p = JSON.parse(body.payload)
      teamId = p?.team?.id
    } catch { /* ignore */ }

    let signingSecret = SLACK_SIGNING_SECRET
    if (teamId) {
      const inst = await prisma.slackInstallation.findFirst({ where: { teamId } })
      if (inst) {
        const config = await prisma.slackAppConfig.findUnique({ where: { orgId: inst.orgId } })
        if (config) signingSecret = decrypt(config.signingSecretEnc)
      }
    }

    if (!verifySlackSignature(signingSecret, rawBody, timestamp, signature)) {
      return reply.status(401).send('Unauthorized')
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
