import 'fastify'
import '@fastify/jwt'

export interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'MEMBER'
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'STARTER' | 'GROWTH' | 'SCALE' | 'ENTERPRISE'
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: User
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any
    authenticateApiKey: any
  }

  interface FastifyRequest {
    user?: User
    org?: Organization
    apiKeyId?: string
  }
}
