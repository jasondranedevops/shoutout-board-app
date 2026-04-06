import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@/db/client'
import { nanoid } from 'nanoid'
import {
  exchangeZoomCode,
  postSlashCommandResponse,
  verifyZoomWebhook,
  parseDateTime,
  formatDate,
} from '@/services/zoom.service'
import { encrypt, decrypt } from '@/services/encryption.service'
import pino from 'pino'

const logger = pino({ name: 'zoom-routes' })

const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const API_URL = process.env.API_URL || 'http://localhost:4000'
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID || ''
const ZOOM_BOT_JID = process.env.ZOOM_BOT_JID || ''
const ZOOM_VERIFICATION_TOKEN = process.env.ZOOM_VERIFICATION_TOKEN || ''

async function getZoomCredentials(orgId: string) {
  const config = await prisma.zoomAppConfig.findUnique({ where: { orgId } })
  return {
    clientId: config?.clientId || ZOOM_CLIENT_ID,
    clientSecret: config ? decrypt(config.clientSecretEnc) : (process.env.ZOOM_CLIENT_SECRET || ''),
    botJid: config?.botJid || ZOOM_BOT_JID,
    verificationToken: config?.verificationTokenEnc ? decrypt(config.verificationTokenEnc) : ZOOM_VERIFICATION_TOKEN,
    hasConfig: !!config,
  }
}

export const zoomRoutes: FastifyPluginAsync = async (app) => {
  // ── App Configuration ──────────────────────────────────────────────────────
  app.put<{ Body: { clientId: string; clientSecret: string; botJid?: string; verificationToken?: string } }>(
    '/v1/zoom/app-config',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { clientId, clientSecret, botJid, verificationToken } = request.body
      if (!clientId || !clientSecret) {
        return reply.status(400).send({ success: false, error: { message: 'clientId and clientSecret are required' } })
      }
      await prisma.zoomAppConfig.upsert({
        where: { orgId: request.org!.id },
        update: {
          clientId,
          clientSecretEnc: encrypt(clientSecret),
          botJid: botJid || null,
          verificationTokenEnc: verificationToken ? encrypt(verificationToken) : null,
        },
        create: {
          orgId: request.org!.id,
          clientId,
          clientSecretEnc: encrypt(clientSecret),
          botJid: botJid || null,
          verificationTokenEnc: verificationToken ? encrypt(verificationToken) : null,
        },
      })
      return reply.send({ success: true })
    }
  )

  app.get(
    '/v1/zoom/app-config',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const config = await prisma.zoomAppConfig.findUnique({
        where: { orgId: request.org!.id },
        select: { clientId: true, botJid: true, createdAt: true },
      })
      return reply.send({
        success: true,
        data: {
          config: config
            ? {
                clientId: config.clientId,
                botJid: config.botJid,
                hasClientSecret: true,
                hasVerificationToken: true,
                createdAt: config.createdAt,
              }
            : null,
        },
      })
    }
  )

  app.delete(
    '/v1/zoom/app-config',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      await prisma.zoomAppConfig.deleteMany({ where: { orgId: request.org!.id } })
      return reply.send({ success: true })
    }
  )

  // ── Webhook URL ────────────────────────────────────────────────────────────
  app.get(
    '/v1/zoom/webhook-url',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      return reply.send({
        success: true,
        data: { url: `${API_URL}/api/zoom/commands/${request.org!.id}` },
      })
    }
  )

  // ── OAuth Install URL (JSON) ───────────────────────────────────────────────
  app.get(
    '/v1/zoom/oauth/install-url',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const state = Buffer.from(
        JSON.stringify({ orgId: request.org!.id, nonce: nanoid(12) })
      ).toString('base64url')

      const creds = await getZoomCredentials(request.org!.id)
      if (!creds.clientId) {
        return reply.status(400).send({ success: false, error: { message: 'Zoom app credentials not configured' } })
      }

      const url = new URL('https://zoom.us/oauth/authorize')
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('client_id', creds.clientId)
      url.searchParams.set('redirect_uri', `${API_URL}/api/zoom/oauth/callback`)
      url.searchParams.set('state', state)

      return reply.send({ success: true, data: { url: url.toString() } })
    }
  )

  // ── OAuth Callback ─────────────────────────────────────────────────────────
  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/api/zoom/oauth/callback',
    async (request, reply) => {
      const { code, state, error } = request.query

      if (error || !code || !state) {
        return reply.redirect(`${APP_URL}/integrations?zoom=error&reason=${error || 'missing_code'}`)
      }

      let orgId: string
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
        orgId = decoded.orgId
      } catch {
        return reply.redirect(`${APP_URL}/integrations?zoom=error&reason=invalid_state`)
      }

      try {
        const creds = await getZoomCredentials(orgId)
        const redirectUri = `${API_URL}/api/zoom/oauth/callback`
        const { accountId, accountName } = await exchangeZoomCode(code, redirectUri, creds.clientId, creds.clientSecret)

        await prisma.zoomInstallation.upsert({
          where: { orgId },
          update: { accountId, accountName },
          create: { orgId, accountId, accountName },
        })

        logger.info({ orgId, accountId }, 'Zoom installed')
        return reply.redirect(`${APP_URL}/integrations?zoom=success`)
      } catch (err) {
        logger.error({ err }, 'Zoom OAuth callback failed')
        return reply.redirect(`${APP_URL}/integrations?zoom=error&reason=oauth_failed`)
      }
    }
  )

  // ── Bot Commands (DM-based) ────────────────────────────────────────────────
  // Receives Zoom webhook events. Each org gets a unique URL:
  //   POST /api/zoom/commands/:orgId
  // Handles: endpoint.url_validation + chat_message.sent (DM commands)
  app.post<{ Params: { orgId: string } }>(
    '/api/zoom/commands/:orgId',
    async (request, reply) => {
      const { orgId } = request.params
      const body = request.body as any
      const rawBody = (request as any).rawBody || JSON.stringify(body)

      // ── URL validation challenge (Zoom fires this when saving the endpoint) ─
      if (body?.event === 'endpoint.url_validation') {
        const plainToken = body.payload?.plainToken
        if (!plainToken) return reply.status(400).send('Missing plainToken')
        const creds = await getZoomCredentials(orgId)
        const secretToken = creds.verificationToken
        if (!secretToken) return reply.status(400).send('Secret token not configured')
        const crypto = await import('crypto')
        const encryptedToken = crypto.createHmac('sha256', secretToken).update(plainToken).digest('hex')
        return reply.send({ plainToken, encryptedToken })
      }

      // ── Verify HMAC-SHA256 signature ───────────────────────────────────────
      const timestamp = request.headers['x-zm-request-timestamp'] as string
      const signature = request.headers['x-zm-signature'] as string

      const creds = await getZoomCredentials(orgId)
      const secretToken = creds.verificationToken

      if (!secretToken || !verifyZoomWebhook(secretToken, timestamp, rawBody, signature)) {
        return reply.status(401).send('Unauthorized')
      }

      // ── Only handle DM messages ────────────────────────────────────────────
      const event = body?.event
      if (event !== 'chat_message.sent') {
        return reply.send({ message: 'ok' })
      }

      const payload = body.payload
      const object = payload?.object

      // Only process Direct Messages (type 'D') to the bot
      if (!object || object.type !== 'D') {
        return reply.send({ message: 'ok' })
      }

      const message: string = (object.message || '').trim()

      // Only process messages that start with /shoutboard
      if (!message.toLowerCase().startsWith('/shoutboard')) {
        return reply.send({ message: 'ok' })
      }

      // Look up installation by orgId
      const installation = await prisma.zoomInstallation.findUnique({ where: { orgId } })
      if (!installation) {
        return reply.send({ message: 'ok' })
      }

      const accountId = payload.account_id || installation.accountId
      // toJid = the user who sent the DM (we reply back to them)
      const toJid = object.sender_id || payload.operator_id || ''

      // Parse command
      const trimmed = message.replace(/^\/shoutboard\s*/i, '').trim()
      const spaceIdx = trimmed.indexOf(' ')
      const subcommand = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase()
      const rest = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim()

      // Respond immediately
      reply.send({ message: 'ok' })

      // Process asynchronously
      setImmediate(async () => {
        try {
          // ── help ──────────────────────────────────────────────────────────
          if (!subcommand || subcommand === 'help') {
            await postSlashCommandResponse(accountId, toJid, {
              head: { text: 'Shoutboard Commands' },
              body: [
                {
                  type: 'message',
                  text: [
                    '`/shoutboard list` — Show recent boards',
                    '`/shoutboard create "Title" for Name` — Create a board (open immediately)',
                    '`/shoutboard create "Title" for Name on Dec 25` — Create & schedule send date',
                    '`/shoutboard create "Title" for Name on Dec 25 at 9am` — Create with date & time',
                    '`/shoutboard schedule "Title" on Dec 25 at 9am` — Set/update send date on existing board',
                    '`/shoutboard help` — Show this message',
                  ].join('\n'),
                },
                {
                  type: 'message',
                  text: 'Date formats: `Dec 25`, `12/25`, `2026-12-25` · Time: `at 9am`, `at 2:30pm`',
                },
              ],
            }, creds.clientId, creds.clientSecret, creds.botJid)
            return
          }

          // ── list ──────────────────────────────────────────────────────────
          if (subcommand === 'list') {
            const boards = await prisma.board.findMany({
              where: { orgId },
              orderBy: { createdAt: 'desc' },
              take: 5,
              select: { id: true, title: true, status: true, recipientName: true, slug: true, scheduledAt: true },
            })

            if (boards.length === 0) {
              await postSlashCommandResponse(accountId, toJid, {
                head: { text: 'Recent Shoutboards' },
                body: [
                  {
                    type: 'message',
                    text: 'No boards yet. Create one with `/shoutboard create "Happy Birthday, Alex!" for Alex on Dec 25`',
                  },
                ],
              }, creds.clientId, creds.clientSecret, creds.botJid)
              return
            }

            const statusEmoji: Record<string, string> = {
              DRAFT: '📝',
              ACTIVE: '🟢',
              SENT: '✅',
            }

            await postSlashCommandResponse(accountId, toJid, {
              head: { text: 'Recent Shoutboards' },
              body: boards.map((b) => {
                const scheduledLine = b.scheduledAt
                  ? `\n📅 Sends ${formatDate(new Date(b.scheduledAt))}`
                  : ''
                return {
                  type: 'message',
                  text: `${statusEmoji[b.status] ?? '•'} *${b.title}*\nFor ${b.recipientName} · ${b.status}${scheduledLine} · [View](${APP_URL}/b/${b.slug})`,
                }
              }),
            }, creds.clientId, creds.clientSecret, creds.botJid)
            return
          }

          // ── create ────────────────────────────────────────────────────────
          if (subcommand === 'create') {
            // Parse: create "Title" for RecipientName [on <date> [at <time>]]
            const match = rest.match(/^"(.+?)"\s+for\s+(.+)$/i)

            if (!match) {
              await postSlashCommandResponse(accountId, toJid, {
                head: { text: 'Usage Error' },
                body: [{
                  type: 'message',
                  text: '❌ Usage: `/shoutboard create "Board title" for Name` or `/shoutboard create "Board title" for Name on Dec 25 at 9am`',
                }],
              }, creds.clientId, creds.clientSecret, creds.botJid)
              return
            }

            const title = match[1]
            const recipientAndDate = match[2]
            const onIdx = recipientAndDate.search(/\s+on\s+/i)
            let recipientName: string
            let scheduledAt: Date | null = null

            if (onIdx !== -1) {
              recipientName = recipientAndDate.slice(0, onIdx).replace(/^@/, '').trim()
              const dateStr = recipientAndDate.slice(onIdx).replace(/^\s+on\s+/i, '').trim()
              scheduledAt = parseDateTime(dateStr)
              if (!scheduledAt) {
                await postSlashCommandResponse(accountId, toJid, {
                  head: { text: 'Date Parse Error' },
                  body: [{
                    type: 'message',
                    text: `❌ Couldn't parse date: *${dateStr}*\nTry formats like \`Dec 25\`, \`Dec 25 at 9am\`, \`12/25\`, \`2026-12-25 at 2pm\``,
                  }],
                }, creds.clientId, creds.clientSecret, creds.botJid)
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
              where: { orgId, role: 'ADMIN' },
            })
            if (!creator) {
              await postSlashCommandResponse(accountId, toJid, {
                head: { text: 'Error' },
                body: [{ type: 'message', text: '❌ Could not find an admin user for your organization.' }],
              }, creds.clientId, creds.clientSecret, creds.botJid)
              return
            }

            const slug = `${title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .slice(0, 40)}-${nanoid(6)}`

            const board = await prisma.board.create({
              data: {
                orgId,
                creatorId: creator.id,
                title,
                occasionType: occasionType as any,
                slug,
                status: 'ACTIVE',
                recipientName,
                ...(scheduledAt && { scheduledAt }),
              },
            })

            await postSlashCommandResponse(accountId, toJid, {
              head: { text: '🎉 Board Created!' },
              body: [
                {
                  type: 'message',
                  text: `*${title}* has been created for *${recipientName}*!\n${scheduledAt ? `📅 Will automatically send on *${formatDate(scheduledAt)}*` : 'Share the link so teammates can add messages.'}`,
                },
                {
                  type: 'actions',
                  items: [
                    {
                      text: '✍️ Add a message',
                      value: 'add_message',
                      style: 'Primary',
                      action: `${APP_URL}/b/${board.slug}`,
                    },
                    {
                      text: '⚙️ Manage board',
                      value: 'manage_board',
                      style: 'Default',
                      action: `${APP_URL}/boards/${board.id}`,
                    },
                  ],
                },
              ],
            }, creds.clientId, creds.clientSecret, creds.botJid)
            return
          }

          // ── schedule ──────────────────────────────────────────────────────
          if (subcommand === 'schedule') {
            // Usage: schedule "Title" on <date> [at <time>]
            const match = rest.match(/^"(.+?)"\s+on\s+(.+)$/i)

            if (!match) {
              await postSlashCommandResponse(accountId, toJid, {
                head: { text: 'Usage Error' },
                body: [{ type: 'message', text: '❌ Usage: `/shoutboard schedule "Board title" on Dec 25 at 9am`' }],
              }, creds.clientId, creds.clientSecret, creds.botJid)
              return
            }

            const titleQuery = match[1].trim()
            const dateStr = match[2].trim()
            const scheduledAt = parseDateTime(dateStr)

            if (!scheduledAt) {
              await postSlashCommandResponse(accountId, toJid, {
                head: { text: 'Date Parse Error' },
                body: [{
                  type: 'message',
                  text: `❌ Couldn't parse date: *${dateStr}*\nTry formats like \`Dec 25\`, \`Dec 25 at 9am\`, \`12/25\`, \`2026-12-25 at 2pm\``,
                }],
              }, creds.clientId, creds.clientSecret, creds.botJid)
              return
            }

            // Find board by title (partial match, most recent first)
            const board = await prisma.board.findFirst({
              where: {
                orgId,
                title: { contains: titleQuery, mode: 'insensitive' },
                status: { not: 'SENT' },
              },
              orderBy: { createdAt: 'desc' },
            })

            if (!board) {
              await postSlashCommandResponse(accountId, toJid, {
                head: { text: 'Board Not Found' },
                body: [{
                  type: 'message',
                  text: `❌ No active board found matching *"${titleQuery}"*. Use \`/shoutboard list\` to see your boards.`,
                }],
              }, creds.clientId, creds.clientSecret, creds.botJid)
              return
            }

            await prisma.board.update({
              where: { id: board.id },
              data: { scheduledAt },
            })

            await postSlashCommandResponse(accountId, toJid, {
              head: { text: '✅ Board Scheduled' },
              body: [
                {
                  type: 'message',
                  text: `✅ *${board.title}* is scheduled to send on *${formatDate(scheduledAt)}*`,
                },
                {
                  type: 'actions',
                  items: [{
                    text: '⚙️ Manage board',
                    value: 'manage_board',
                    style: 'Default',
                    action: `${APP_URL}/boards/${board.id}`,
                  }],
                },
              ],
            }, creds.clientId, creds.clientSecret, creds.botJid)
            return
          }

          // ── Unknown subcommand ─────────────────────────────────────────────
          await postSlashCommandResponse(accountId, toJid, {
            head: { text: 'Unknown Command' },
            body: [{ type: 'message', text: `❓ Unknown command \`${subcommand}\`. Try \`/shoutboard help\`.` }],
          }, creds.clientId, creds.clientSecret, creds.botJid)
        } catch (err) {
          logger.error({ err }, 'Zoom command processing failed')
          await postSlashCommandResponse(accountId, toJid, {
            head: { text: 'Error' },
            body: [{ type: 'message', text: '❌ Something went wrong. Please try again.' }],
          }, creds.clientId, creds.clientSecret, creds.botJid).catch(() => {})
        }
      })
    }
  )

  // ── Status ─────────────────────────────────────────────────────────────────
  app.get(
    '/v1/zoom/status',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const installation = await prisma.zoomInstallation.findUnique({
        where: { orgId: request.org!.id },
        select: {
          id: true,
          accountId: true,
          accountName: true,
          createdAt: true,
        },
      })
      return reply.send({ success: true, data: { installation } })
    }
  )

  // ── Disconnect ─────────────────────────────────────────────────────────────
  app.delete(
    '/v1/zoom',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      await prisma.zoomInstallation.deleteMany({
        where: { orgId: request.org!.id },
      })
      return reply.send({ success: true })
    }
  )
}
