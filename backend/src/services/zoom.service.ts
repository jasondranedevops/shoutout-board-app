import crypto from 'crypto'
import pino from 'pino'

const logger = pino({ name: 'zoom' })

const ZOOM_API = 'https://api.zoom.us/v2'
const ZOOM_OAUTH = 'https://zoom.us/oauth/token'

// ── Webhook verification ──────────────────────────────────────────────────────

export function verifyZoomWebhook(
  secretToken: string,
  timestamp: string,
  rawBody: string,
  signature: string,
): boolean {
  try {
    const message = `v0:${timestamp}:${rawBody}`
    const expected = `v0=${crypto.createHmac('sha256', secretToken).update(message).digest('hex')}`
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// ── Token helpers ─────────────────────────────────────────────────────────────

async function getBotToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(`${ZOOM_OAUTH}?grant_type=client_credentials`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    logger.error({ status: res.status, body: text }, 'Failed to get Zoom bot token')
    throw new Error(`Zoom bot token error: ${res.status}`)
  }

  const json = await res.json() as { access_token: string }
  return json.access_token
}

// ── Send messages ─────────────────────────────────────────────────────────────

export async function sendZoomMessage(
  accountId: string,
  toJid: string,
  content: object,
  clientId: string,
  clientSecret: string,
  botJid: string,
): Promise<void> {
  const token = await getBotToken(clientId, clientSecret)

  const res = await fetch(`${ZOOM_API}/im/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      robot_jid: botJid,
      to_jid: toJid,
      account_id: accountId,
      content,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    logger.error({ status: res.status, body: text }, 'Failed to send Zoom message')
    throw new Error(`Zoom send message error: ${res.status}`)
  }
}

export async function postSlashCommandResponse(
  accountId: string,
  toJid: string,
  content: object,
  clientId: string,
  clientSecret: string,
  botJid: string,
): Promise<void> {
  return sendZoomMessage(accountId, toJid, content, clientId, clientSecret, botJid)
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

export async function exchangeZoomCode(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accountId: string; accountName: string | null }> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })

  const tokenRes = await fetch(`${ZOOM_OAUTH}?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    logger.error({ status: tokenRes.status, body: text }, 'Zoom OAuth token exchange failed')
    throw new Error(`Zoom OAuth error: ${tokenRes.status}`)
  }

  const tokenJson = await tokenRes.json() as { access_token: string }

  // Get account info
  const accountRes = await fetch(`${ZOOM_API}/accounts/me`, {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
    },
  })

  if (!accountRes.ok) {
    const text = await accountRes.text()
    logger.error({ status: accountRes.status, body: text }, 'Zoom accounts/me failed')
    throw new Error(`Zoom accounts/me error: ${accountRes.status}`)
  }

  const accountJson = await accountRes.json() as { id: string; account_name?: string }

  return {
    accountId: accountJson.id,
    accountName: accountJson.account_name ?? '',
  }
}

// ── Date/time parsing (mirrors slack.routes.ts) ───────────────────────────────

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
export function parseDateTime(str: string): Date | null {
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

export function formatDate(d: Date): string {
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}
