import { prisma } from '@/db/client'
import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

const webhookQueue = new Queue('webhooks', { connection: redis })

interface WebhookPayload {
  [key: string]: any
}

export async function dispatchWebhook(
  orgId: string,
  event: string,
  payload: WebhookPayload
): Promise<void> {
  try {
    const subscriptions = await prisma.webhookSubscription.findMany({
      where: {
        orgId,
        active: true,
        events: { hasSome: [event, '*'] },
      },
    })

    for (const subscription of subscriptions) {
      await webhookQueue.add(
        'deliver',
        {
          webhookId: subscription.id,
          event,
          payload,
          secretHash: subscription.secretHash,
          url: subscription.url,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      )
    }
  } catch (error) {
    console.error('Failed to dispatch webhook:', error)
  }
}

export async function deliverWebhook(
  webhookId: string,
  event: string,
  payload: WebhookPayload,
  secretHash: string,
  url: string,
  attemptNumber: number = 0
): Promise<void> {
  try {
    // Create HMAC signature
    const body = JSON.stringify(payload)
    const signature = crypto
      .createHmac('sha256', secretHash)
      .update(body)
      .digest('hex')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shoutboard-Event': event,
        'X-Shoutboard-Signature': signature,
      },
      body,
    })

    // Record delivery attempt
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload,
        responseStatus: response.status,
        responseBody: await response.text(),
        attemptCount: attemptNumber + 1,
        deliveredAt: response.ok ? new Date() : null,
      },
    })

    if (!response.ok && attemptNumber < 2) {
      throw new Error(
        `Webhook delivery failed with status ${response.status}`
      )
    }
  } catch (error) {
    console.error('Webhook delivery failed:', error)
    throw error
  }
}

// Setup worker (run separately or in same process)
export function setupWebhookWorker() {
  const worker = new Worker(
    'webhooks',
    async (job) => {
      const { webhookId, event, payload, secretHash, url } = job.data
      await deliverWebhook(
        webhookId,
        event,
        payload,
        secretHash,
        url,
        job.attemptsMade
      )
    },
    { connection: redis }
  )

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message)
  })

  return worker
}
