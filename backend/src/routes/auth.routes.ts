import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/db/client'
import { generateOrgSlug } from '@/utils/slugify'
import { ValidationError, ConflictError } from '@/utils/errors'

const RegisterSchema = z.object({
  orgName: z.string().min(2).max(100),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /auth/register
  app.post<{ Body: z.infer<typeof RegisterSchema> }>(
    '/auth/register',
    {
      schema: {
        description: 'Register a new organization and admin user',
        tags: ['Authentication'],
        body: {
          type: 'object',
          required: ['orgName', 'name', 'email', 'password'],
          properties: {
            orgName: { type: 'string', minLength: 2 },
            name: { type: 'string', minLength: 2 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = RegisterSchema.parse(request.body)

        const existingUser = await prisma.user.findUnique({
          where: { email: body.email },
        })
        if (existingUser) {
          throw new ConflictError('Email already registered')
        }

        const passwordHash = await bcrypt.hash(body.password, 10)

        const org = await prisma.organization.create({
          data: {
            name: body.orgName,
            slug: generateOrgSlug(body.orgName),
            users: {
              create: {
                email: body.email,
                name: body.name,
                passwordHash,
                role: 'ADMIN',
              },
            },
          },
          include: { users: true },
        })

        const user = org.users[0]
        const token = app.jwt.sign({ sub: user.id }, { expiresIn: '7d' })

        return reply.status(201).send({
          success: true,
          data: {
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            org: { id: org.id, name: org.name, slug: org.slug },
          },
        })
      } catch (error) {
        if (error instanceof z.ZodError) throw new ValidationError(error.issues[0].message)
        throw error
      }
    }
  )

  // POST /auth/login
  app.post<{ Body: z.infer<typeof LoginSchema> }>(
    '/auth/login',
    {
      schema: {
        description: 'Login with email and password',
        tags: ['Authentication'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = LoginSchema.parse(request.body)

        const user = await prisma.user.findUnique({
          where: { email: body.email },
          include: { org: true },
        })

        if (!user) {
          return reply.status(401).send({
            success: false,
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
          })
        }

        const passwordMatch = await bcrypt.compare(body.password, user.passwordHash)
        if (!passwordMatch) {
          return reply.status(401).send({
            success: false,
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
          })
        }

        const token = app.jwt.sign({ sub: user.id }, { expiresIn: '7d' })

        return reply.send({
          success: true,
          data: {
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            org: { id: user.org.id, name: user.org.name, slug: user.org.slug },
          },
        })
      } catch (error) {
        if (error instanceof z.ZodError) throw new ValidationError(error.issues[0].message)
        throw error
      }
    }
  )

  // GET /auth/me
  app.get(
    '/auth/me',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Get current authenticated user',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      return reply.send({
        success: true,
        data: { user: request.user, org: request.org },
      })
    }
  )
}
