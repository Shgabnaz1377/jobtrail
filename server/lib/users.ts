import { eq, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { users } from '../db/schema'
import type { User } from '../db/schema'

export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'isDemo'>

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, isDemo: user.isDemo }
}

export async function findUserByEmail(db: Database, email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
    .limit(1)
  return user
}

export async function findUserById(db: Database, id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return user
}

export class EmailTakenError extends Error {
  constructor() {
    super('An account with this email already exists')
  }
}

export async function createUser(
  db: Database,
  input: { name: string, email: string, passwordHash: string, isDemo?: boolean },
): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      isDemo: input.isDemo ?? false,
    })
    .onConflictDoNothing()
    .returning()
  if (!user) throw new EmailTakenError()
  return user
}
