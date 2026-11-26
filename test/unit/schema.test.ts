import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { applicationEvents, applications, users } from '../../server/db/schema'
import type { DatabaseHandle } from '../../server/db/client'
import { createTestDatabase } from './helpers/db'

let handle: DatabaseHandle

beforeAll(async () => {
  handle = await createTestDatabase()
})

afterAll(async () => {
  await handle.close()
})

describe('database schema', () => {
  it('applies migrations and stores an application with defaults', async () => {
    const [user] = await handle.db
      .insert(users)
      .values({ email: 'ada@example.com', name: 'Ada', passwordHash: 'x' })
      .returning()
    const [app] = await handle.db
      .insert(applications)
      .values({ userId: user!.id, company: 'Acme', role: 'Engineer' })
      .returning()

    expect(app).toMatchObject({ status: 'wishlist', workMode: 'onsite', currency: 'EUR', position: 0 })
  })

  it('treats emails case-insensitively for uniqueness', async () => {
    await expect(
      handle.db.insert(users).values({ email: 'ADA@example.com', name: 'Dup', passwordHash: 'x' }),
    ).rejects.toThrow()
  })

  it('cascades deletes from users to applications and events', async () => {
    const [user] = await handle.db
      .insert(users)
      .values({ email: 'grace@example.com', name: 'Grace', passwordHash: 'x' })
      .returning()
    const [app] = await handle.db
      .insert(applications)
      .values({ userId: user!.id, company: 'Initech', role: 'Developer' })
      .returning()
    await handle.db.insert(applicationEvents).values({
      applicationId: app!.id,
      userId: user!.id,
      kind: 'note',
      title: 'Sent CV',
      occursAt: new Date(),
    })

    await handle.db.delete(users).where(eq(users.id, user!.id))

    const [{ count }] = (await handle.db
      .select({ count: sql<number>`count(*)::int` })
      .from(applicationEvents)
      .where(eq(applicationEvents.userId, user!.id))) as [{ count: number }]
    expect(count).toBe(0)
  })
})
