import crypto from 'crypto'
import { prisma } from '@/db/client'
import pino from 'pino'

const logger = pino({ name: 'slack' })

const SLACK_API = 'https://slack.com/api'

// ── Signature verification ────────────────────────────────────────────────────

export function verifySlackSignature(
  signingSecret: string,
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  const fiveMinutes = 5 * 60
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > fiveMinutes) return false

  const base = `v0:${timestamp}:${rawBody}`
  const expected = `v0=${crypto.createHmac('sha256', signingSecret).update(base).digest('hex')}`
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// ── Slack API helpers ─────────────────────────────────────────────────────────

async function slackPost(method: string, token: string, body: Record<string, unknown>) {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json() as Record<string, unknown>
  if (!json.ok) {
    logger.error({ method, error: json.error }, 'Slack API error')
    throw new Error(`Slack API error: ${json.error}`)
  }
  return json
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

export async function exchangeSlackCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{
  teamId: string
  teamName: string
  botToken: string
  botUserId: string
}> {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  })

  const res = await fetch(`${SLACK_API}/oauth.v2.access?${params}`)
  const json = await res.json() as any

  if (!json.ok) throw new Error(`Slack OAuth error: ${json.error}`)

  return {
    teamId: json.team.id,
    teamName: json.team.name,
    botToken: json.access_token,
    botUserId: json.bot_user_id,
  }
}

// ── Message sending ───────────────────────────────────────────────────────────

export async function postBoardCreatedMessage(
  token: string,
  channel: string,
  opts: {
    title: string
    recipientName: string
    boardSlug: string
    occasionType: string
    appUrl: string
  }
) {
  const emoji = {
    BIRTHDAY: '🎂',
    ANNIVERSARY: '🎉',
    FAREWELL: '👋',
    PROMOTION: '🚀',
    WELCOME: '👋',
    CUSTOM: '⭐',
  }[opts.occasionType] ?? '⭐'

  const boardUrl = `${opts.appUrl}/b/${opts.boardSlug}`

  return slackPost('chat.postMessage', token, {
    channel,
    text: `${emoji} A new recognition board has been created for *${opts.recipientName}*!`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${opts.title}*\nA group card for *${opts.recipientName}* is ready for contributions.`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✍️ Add a message', emoji: true },
            style: 'primary',
            url: boardUrl,
            action_id: 'add_message',
          },
        ],
      },
    ],
  })
}

export async function postBoardSentMessage(
  token: string,
  channel: string,
  opts: {
    title: string
    recipientName: string
    boardSlug: string
    postCount: number
    appUrl: string
  }
) {
  const boardUrl = `${opts.appUrl}/b/${opts.boardSlug}`

  return slackPost('chat.postMessage', token, {
    channel,
    text: `🎉 The board "${opts.title}" has been sent to ${opts.recipientName}!`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🎉 *${opts.title}* has been delivered to *${opts.recipientName}* with *${opts.postCount}* message${opts.postCount !== 1 ? 's' : ''}!`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '👀 View board', emoji: true },
            url: boardUrl,
            action_id: 'view_board',
          },
        ],
      },
    ],
  })
}

export async function postSlashCommandResponse(
  responseUrl: string,
  message: Record<string, unknown>
) {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })
}

// ── Notify org's Slack channel ────────────────────────────────────────────────

export async function notifySlackBoardCreated(
  orgId: string,
  board: { title: string; recipientName: string; slug: string; occasionType: string }
) {
  const installation = await prisma.slackInstallation.findUnique({ where: { orgId } })
  if (!installation?.incomingChannel) return

  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  try {
    await postBoardCreatedMessage(installation.botToken, installation.incomingChannel, {
      ...board,
      appUrl,
    })
  } catch (err) {
    logger.error({ err, orgId }, 'Failed to post board.created to Slack')
  }
}

export async function notifySlackBoardSent(
  orgId: string,
  board: { title: string; recipientName: string; slug: string; postCount: number }
) {
  const installation = await prisma.slackInstallation.findUnique({ where: { orgId } })
  if (!installation?.incomingChannel) return

  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  try {
    await postBoardSentMessage(installation.botToken, installation.incomingChannel, {
      ...board,
      appUrl,
    })
  } catch (err) {
    logger.error({ err, orgId }, 'Failed to post board.sent to Slack')
  }
}
