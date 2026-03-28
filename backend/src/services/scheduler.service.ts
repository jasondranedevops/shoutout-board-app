import { prisma } from '@/db/client'
import { dispatchWebhook } from './webhook.service'
import { sendBoardDeliveryEmail } from './email.service'
import pino from 'pino'

const logger = pino({ name: 'scheduler' })

/**
 * Finds all ACTIVE boards whose scheduledAt has passed and sends them.
 * Runs on an interval — call startScheduler() once at server startup.
 */
async function processDueBoards() {
  const now = new Date()

  const dueBoards = await prisma.board.findMany({
    where: {
      status: 'ACTIVE',
      scheduledAt: { lte: now },
    },
  })

  if (dueBoards.length === 0) return

  logger.info(`Scheduler: found ${dueBoards.length} board(s) due to send`)

  for (const board of dueBoards) {
    try {
      await prisma.board.update({
        where: { id: board.id },
        data: { status: 'SENT', sentAt: now },
      })

      if (board.recipientEmail) {
        await sendBoardDeliveryEmail(
          board.recipientEmail,
          board.recipientName,
          board.slug,
          board.title
        )
      }

      await dispatchWebhook(board.orgId, 'board.sent', {
        boardId: board.id,
        title: board.title,
        recipientName: board.recipientName,
        recipientEmail: board.recipientEmail,
        sentAt: now,
        scheduledSend: true,
      })

      logger.info(`Scheduler: sent board ${board.id} ("${board.title}")`)
    } catch (err) {
      logger.error({ err, boardId: board.id }, 'Scheduler: failed to send board')
    }
  }
}

export function startScheduler(intervalMs = 60_000) {
  logger.info(`Scheduler started — checking every ${intervalMs / 1000}s`)
  // Run once immediately on startup to catch any boards that were missed
  processDueBoards().catch((err) => logger.error({ err }, 'Scheduler: initial run failed'))
  return setInterval(() => {
    processDueBoards().catch((err) => logger.error({ err }, 'Scheduler: tick failed'))
  }, intervalMs)
}
