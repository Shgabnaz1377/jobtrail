import type { H3Event } from 'h3'
import type { User } from '#auth-utils'
import { findUserById, toPublicUser } from '../lib/users'
import type { User as DbUser } from '../db/schema'

export async function startSession(event: H3Event, user: DbUser) {
  await setUserSession(event, { user: toPublicUser(user), loggedInAt: Date.now() })
}

/**
 * Resolves the signed-in user and confirms the account still exists
 * (demo accounts are deleted while their cookie may still be around).
 */
export async function requireUser(event: H3Event): Promise<User> {
  const session = await requireUserSession(event)
  const db = await useDb()
  const user = await findUserById(db, session.user.id)
  if (!user) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, statusMessage: 'Session expired' })
  }
  return toPublicUser(user)
}
