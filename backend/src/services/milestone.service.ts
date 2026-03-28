import { prisma } from '@/db/client'
import { dispatchWebhook } from './webhook.service'
import { sendBoardDeliveryEmail } from './email.service'
import pino from 'pino'
import { nanoid } from 'nanoid'

const logger = pino({ name: 'milestone-scheduler' })

/**
 * Returns true if the month/day of `date` falls within `daysAhead` days from today.
 * Year is ignored — we compare month+day only so birthdays fire every year.
 */
function isWithinDaysAhead(date: Date, daysAhead: number): boolean {
  const today = new Date()
  // Build a candidate date in the current year
  let candidate = new Date(today.getFullYear(), date.getMonth(), date.getDate())
  // If the anniversary already passed this year, look at next year
  if (candidate < today) {
    candidate = new Date(today.getFullYear() + 1, date.getMonth(), date.getDate())
  }
  const diffMs = candidate.getTime() - today.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays < daysAhead
}

/**
 * Returns the next occurrence of a month/day anniversary (this year or next).
 */
function nextOccurrence(date: Date): Date {
  const today = new Date()
  let candidate = new Date(today.getFullYear(), date.getMonth(), date.getDate())
  if (candidate < today) {
    candidate = new Date(today.getFullYear() + 1, date.getMonth(), date.getDate())
  }
  return candidate
}

/**
 * Generates a unique board slug.
 */
function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${base}-${nanoid(6)}`
}

/**
 * Check for a duplicate board for this employee+occasion in the current cycle
 * (i.e. a board already created for this birthday/anniversary this year).
 */
async function boardAlreadyExists(
  orgId: string,
  employeeName: string,
  occasionType: 'BIRTHDAY' | 'ANNIVERSARY',
  targetDate: Date
): Promise<boolean> {
  const yearStart = new Date(targetDate.getFullYear(), 0, 1)
  const yearEnd = new Date(targetDate.getFullYear() + 1, 0, 1)

  const existing = await prisma.board.findFirst({
    where: {
      orgId,
      occasionType,
      recipientName: employeeName,
      createdAt: { gte: yearStart, lt: yearEnd },
    },
  })
  return !!existing
}

async function processMilestones() {
  // Fetch all orgs with milestone config enabled
  const configs = await prisma.milestoneConfig.findMany({
    where: {
      OR: [{ birthdayEnabled: true }, { anniversaryEnabled: true }],
    },
    include: { org: true },
  })

  if (configs.length === 0) return

  for (const config of configs) {
    const employees = await prisma.employee.findMany({
      where: { orgId: config.orgId, active: true },
    })

    for (const emp of employees) {
      // ── Birthday ─────────────────────────────────────────────────────────
      if (config.birthdayEnabled && emp.birthday) {
        const withinWindow = isWithinDaysAhead(emp.birthday, config.daysAhead)
        if (withinWindow) {
          const targetDate = nextOccurrence(emp.birthday)
          const alreadyCreated = await boardAlreadyExists(
            config.orgId,
            emp.name,
            'BIRTHDAY',
            targetDate
          )

          if (!alreadyCreated) {
            try {
              const title = `Happy Birthday, ${emp.name}! 🎂`
              const board = await prisma.board.create({
                data: {
                  orgId: config.orgId,
                  creatorId: (await getSystemUserId(config.orgId)),
                  title,
                  occasionType: 'BIRTHDAY',
                  slug: makeSlug(title),
                  status: config.autoActivate ? 'ACTIVE' : 'DRAFT',
                  recipientName: emp.name,
                  recipientEmail: emp.email,
                  scheduledAt: targetDate,
                },
              })

              await dispatchWebhook(config.orgId, 'board.created', {
                boardId: board.id,
                title: board.title,
                occasionType: 'BIRTHDAY',
                recipientName: emp.name,
                autoCreated: true,
              })

              logger.info(
                `Milestone: created birthday board for ${emp.name} (org ${config.orgId})`
              )
            } catch (err) {
              logger.error({ err }, `Milestone: failed to create birthday board for ${emp.name}`)
            }
          }
        }
      }

      // ── Work Anniversary ──────────────────────────────────────────────────
      if (config.anniversaryEnabled && emp.hireDate) {
        const withinWindow = isWithinDaysAhead(emp.hireDate, config.daysAhead)
        if (withinWindow) {
          const targetDate = nextOccurrence(emp.hireDate)
          const yearsOfService =
            targetDate.getFullYear() - emp.hireDate.getFullYear()

          const alreadyCreated = await boardAlreadyExists(
            config.orgId,
            emp.name,
            'ANNIVERSARY',
            targetDate
          )

          if (!alreadyCreated) {
            try {
              const title =
                yearsOfService === 1
                  ? `Happy 1-Year Work Anniversary, ${emp.name}! 🎉`
                  : `Happy ${yearsOfService}-Year Work Anniversary, ${emp.name}! 🎉`

              const board = await prisma.board.create({
                data: {
                  orgId: config.orgId,
                  creatorId: (await getSystemUserId(config.orgId)),
                  title,
                  occasionType: 'ANNIVERSARY',
                  slug: makeSlug(title),
                  status: config.autoActivate ? 'ACTIVE' : 'DRAFT',
                  recipientName: emp.name,
                  recipientEmail: emp.email,
                  scheduledAt: targetDate,
                },
              })

              await dispatchWebhook(config.orgId, 'board.created', {
                boardId: board.id,
                title: board.title,
                occasionType: 'ANNIVERSARY',
                recipientName: emp.name,
                yearsOfService,
                autoCreated: true,
              })

              logger.info(
                `Milestone: created ${yearsOfService}yr anniversary board for ${emp.name} (org ${config.orgId})`
              )
            } catch (err) {
              logger.error(
                { err },
                `Milestone: failed to create anniversary board for ${emp.name}`
              )
            }
          }
        }
      }
    }
  }
}

/**
 * Returns the ID of the first admin user in the org (used as the board creator).
 */
async function getSystemUserId(orgId: string): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { orgId, role: 'ADMIN' },
    select: { id: true },
  })
  if (admin) return admin.id

  // Fallback: any member
  const member = await prisma.user.findFirst({
    where: { orgId },
    select: { id: true },
  })
  if (!member) throw new Error(`No users found in org ${orgId}`)
  return member.id
}

export function startMilestoneScheduler(intervalMs = 60 * 60 * 1000) {
  logger.info(`Milestone scheduler started — checking every ${intervalMs / 60_000}min`)
  // Run once at startup
  processMilestones().catch((err) =>
    logger.error({ err }, 'Milestone: initial run failed')
  )
  return setInterval(() => {
    processMilestones().catch((err) =>
      logger.error({ err }, 'Milestone: tick failed')
    )
  }, intervalMs)
}
