import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import type { DatabaseHandle } from '../../server/db/client'
import { applicationEvents, applications, users } from '../../server/db/schema'
import { listApplications } from '../../server/lib/applications'
import { cleanupDemoAccounts, createDemoAccount, DEMO_APPLICATIONS } from '../../server/lib/demo'
import { listReminders } from '../../server/lib/events'
import { loadStats } from '../../server/lib/stats'
import { createUser } from '../../server/lib/users'
import { createTestDatabase } from './helpers/db'

let handle: DatabaseHandle
const now = new Date('2026-06-15T12:00:00Z')

beforeAll(async () => {
  handle = await createTestDatabase()
})

afterAll(async () => {
  await handle.close()
})

describe('createDemoAccount', () => {
  it('creates a flagged account with every sample application', async () => {
    const user = await createDemoAccount(handle.db, 'hash', now)
    expect(user.isDemo).toBe(true)
    expect(user.email).toMatch(/^demo-.+@demo\.jobtrail\.invalid$/)

    const apps = await listApplications(handle.db, user.id)
    expect(apps).toHaveLength(DEMO_APPLICATIONS.length)
    const statuses = new Set(apps.map(app => app.status))
    expect([...statuses].sort()).toEqual(['applied', 'interview', 'offer', 'rejected', 'wishlist'])
  })

  it('produces dense board positions, a useful reminders panel and meaningful stats', async () => {
    const user = await createDemoAccount(handle.db, 'hash', now)
    const apps = await listApplications(handle.db, user.id)
    for (const status of ['wishlist', 'applied', 'interview', 'offer', 'rejected'] as const) {
      const positions = apps.filter(app => app.status === status).map(app => app.position).sort((a, b) => a - b)
      expect(positions).toEqual(positions.map((_, i) => i))
    }

    const reminders = await listReminders(handle.db, user.id, { now })
    expect(reminders.length).toBeGreaterThanOrEqual(4)
    expect(reminders.some(reminder => reminder.overdue)).toBe(true)

    const stats = await loadStats(handle.db, user.id, now)
    expect(stats.funnel.map(step => step.reached)).toEqual([11, 5, 1])
    expect(stats.perWeek.filter(week => week.count > 0).length).toBeGreaterThan(4)
  })

  it('gives each demo its own account', async () => {
    const a = await createDemoAccount(handle.db, 'hash', now)
    const b = await createDemoAccount(handle.db, 'hash', now)
    expect(a.id).not.toBe(b.id)
    expect(a.email).not.toBe(b.email)
  })
})

describe('cleanupDemoAccounts', () => {
  it('deletes only demo accounts older than 24 hours, with all their data', async () => {
    const old = await createDemoAccount(handle.db, 'hash', new Date(now.getTime() - 25 * 60 * 60 * 1000))
    const fresh = await createDemoAccount(handle.db, 'hash', new Date(now.getTime() - 60 * 60 * 1000))
    const real = await createUser(handle.db, { name: 'Real', email: 'real@example.com', passwordHash: 'h' })
    await handle.db.update(users).set({ createdAt: new Date('2020-01-01') }).where(eq(users.id, real.id))

    const deleted = await cleanupDemoAccounts(handle.db, now)
    expect(deleted).toBeGreaterThanOrEqual(1)

    const remaining = (await handle.db.select({ id: users.id }).from(users)).map(row => row.id)
    expect(remaining).not.toContain(old.id)
    expect(remaining).toContain(fresh.id)
    expect(remaining).toContain(real.id)
    expect(await handle.db.select().from(applications).where(eq(applications.userId, old.id))).toEqual([])
    expect(await handle.db.select().from(applicationEvents).where(eq(applicationEvents.userId, old.id))).toEqual([])
  })
})
