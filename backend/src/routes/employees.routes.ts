import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/db/client'
import { NotFoundError, ValidationError } from '@/utils/errors'

const EmployeeSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  department: z.string().max(100).optional(),
  birthday: z.string().datetime().optional().nullable(),   // ISO date string
  hireDate: z.string().datetime().optional().nullable(),   // ISO date string
  active: z.boolean().default(true),
})

const MilestoneConfigSchema = z.object({
  birthdayEnabled: z.boolean(),
  anniversaryEnabled: z.boolean(),
  daysAhead: z.number().int().min(1).max(90),
  autoActivate: z.boolean(),
})

export const employeesRoutes: FastifyPluginAsync = async (app) => {
  // ── Employees ─────────────────────────────────────────────────────────────

  // List employees
  app.get(
    '/v1/employees',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'List all employees for the organization',
        tags: ['Employees'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const employees = await prisma.employee.findMany({
        where: { orgId: request.org!.id },
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
      })
      return reply.send({ success: true, data: { employees } })
    }
  )

  // Create employee
  app.post<{ Body: z.infer<typeof EmployeeSchema> }>(
    '/v1/employees',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Add an employee',
        tags: ['Employees'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const body = EmployeeSchema.parse(request.body)
        const employee = await prisma.employee.create({
          data: {
            orgId: request.org!.id,
            name: body.name,
            email: body.email || null,
            department: body.department || null,
            birthday: body.birthday ? new Date(body.birthday) : null,
            hireDate: body.hireDate ? new Date(body.hireDate) : null,
            active: body.active,
          },
        })
        return reply.status(201).send({ success: true, data: employee })
      } catch (err) {
        if (err instanceof z.ZodError) throw new ValidationError(err.issues[0].message)
        throw err
      }
    }
  )

  // Update employee
  app.patch<{ Params: { id: string }; Body: Partial<z.infer<typeof EmployeeSchema>> }>(
    '/v1/employees/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Update an employee',
        tags: ['Employees'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const employee = await prisma.employee.findFirst({
        where: { id: request.params.id, orgId: request.org!.id },
      })
      if (!employee) throw new NotFoundError('Employee')

      const body = EmployeeSchema.partial().parse(request.body)
      const updated = await prisma.employee.update({
        where: { id: request.params.id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.email !== undefined && { email: body.email || null }),
          ...(body.department !== undefined && { department: body.department || null }),
          ...(body.birthday !== undefined && {
            birthday: body.birthday ? new Date(body.birthday) : null,
          }),
          ...(body.hireDate !== undefined && {
            hireDate: body.hireDate ? new Date(body.hireDate) : null,
          }),
          ...(body.active !== undefined && { active: body.active }),
        },
      })
      return reply.send({ success: true, data: updated })
    }
  )

  // Delete employee
  app.delete<{ Params: { id: string } }>(
    '/v1/employees/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Delete an employee',
        tags: ['Employees'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const employee = await prisma.employee.findFirst({
        where: { id: request.params.id, orgId: request.org!.id },
      })
      if (!employee) throw new NotFoundError('Employee')

      await prisma.employee.delete({ where: { id: request.params.id } })
      return reply.send({ success: true, data: { id: request.params.id } })
    }
  )

  // ── Milestone Config ───────────────────────────────────────────────────────

  // Get config (creates default if none exists)
  app.get(
    '/v1/milestones/config',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Get milestone automation config',
        tags: ['Milestones'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      let config = await prisma.milestoneConfig.findUnique({
        where: { orgId: request.org!.id },
      })
      if (!config) {
        config = await prisma.milestoneConfig.create({
          data: { orgId: request.org!.id },
        })
      }
      return reply.send({ success: true, data: config })
    }
  )

  // Update config
  app.patch<{ Body: Partial<z.infer<typeof MilestoneConfigSchema>> }>(
    '/v1/milestones/config',
    {
      onRequest: [app.authenticate],
      schema: {
        description: 'Update milestone automation config',
        tags: ['Milestones'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const body = MilestoneConfigSchema.partial().parse(request.body)
        const config = await prisma.milestoneConfig.upsert({
          where: { orgId: request.org!.id },
          update: body,
          create: { orgId: request.org!.id, ...body },
        })
        return reply.send({ success: true, data: config })
      } catch (err) {
        if (err instanceof z.ZodError) throw new ValidationError(err.issues[0].message)
        throw err
      }
    }
  )
}
