import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

export interface ApiKeyPair {
  raw: string
  hash: string
  prefix: string
}

export function generateApiKey(): ApiKeyPair {
  const prefix = 'sb_live_'
  const randomPart = nanoid(32)
  const raw = `${prefix}${randomPart}`

  // For display purposes, use first 8 chars after prefix
  const displayPrefix = `${prefix}${randomPart.substring(0, 4)}`

  const hash = bcrypt.hashSync(raw, 10)

  return {
    raw,
    hash,
    prefix: displayPrefix,
  }
}

export function hashApiKey(key: string): string {
  return bcrypt.hashSync(key, 10)
}

export function verifyApiKey(raw: string, hash: string): boolean {
  return bcrypt.compareSync(raw, hash)
}
