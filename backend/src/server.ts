import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import fastifyMultipart from '@fastify/multipart'
import { config } from 'dotenv'
import pino from 'pino'

// Plugins
import { authPlugin } from '@/plugins/auth.plugin'

// Routes
import { authRoutes } from '@/routes/auth.routes'
import { boardsRoutes } from '@/routes/boards.routes'
import { postsRoutes } from '@/routes/posts.routes'
import { apiKeysRoutes } from '@/routes/api-keys.routes'
import { webhooksRoutes } from '@/routes/webhooks.routes'
import { analyticsRoutes } from '@/routes/analytics.routes'

config()

const logger = pino(
  process.env.NODE_ENV === 'production'
    ? undefined
    : { transport: { target: 'pino-pretty' } }
)

const app = Fastify({ logger })

const PORT = parseInt(process.env.PORT || '4000', 10)
const HOST = '0.0.0.0'

async function main() {
  try {
    // Register core plugins
    await app.register(fastifyCors, {
      origin: true,
      credentials: true,
    })

    await app.register(fastifyJwt, {
      secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-prod',
    })

    await app.register(fastifyRateLimit, {
      max: 100,
      timeWindow: '15 minutes',
    })

    await app.register(fastifyMultipart, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    })

    // Swagger/OpenAPI
    await app.register(fastifySwagger, {
      swagger: {
        info: {
          title: 'Shoutboard API',
          description: 'API-first employee recognition group card platform',
          version: '1.0.0',
          contact: {
            name: 'Shoutboard Support',
            email: 'support@shoutboard.io',
          },
          license: {
            name: 'MIT',
          },
        },
        host: process.env.API_HOST || 'localhost:4000',
        schemes: [process.env.NODE_ENV === 'production' ? 'https' : 'http'],
        consumes: ['application/json'],
        produces: ['application/json'],
        securityDefinitions: {
          bearerAuth: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
            description: 'JWT token in the format "Bearer <token>"',
          },
          apiKey: {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
            description: 'API Key for service-to-service authentication',
          },
        },
      },
    })

    await app.register(fastifySwaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    })

    // Custom auth plugin
    await app.register(authPlugin)

    // Routes
    await app.register(authRoutes)
    await app.register(boardsRoutes)
    await app.register(postsRoutes)
    await app.register(apiKeysRoutes)
    await app.register(webhooksRoutes)
    await app.register(analyticsRoutes)

    // Health check
    app.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    // Start server
    await app.listen({ port: PORT, host: HOST })
    logger.info(`Server listening at http://${HOST}:${PORT}`)
    logger.info(`Swagger docs available at http://${HOST}:${PORT}/docs`)
  } catch (err) {
    logger.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...')
  await app.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...')
  await app.close()
  process.exit(0)
})

main()
