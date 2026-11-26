import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import type { DatabaseHandle } from '../../server/db/client'
import { applications } from '../../server/db/schema'
import {
  createApplication,
  deleteApplication,
  escapeLike,
  getApplication,
  InvalidInputError,
  listApplications,
  moveApplication,
  NotFoundError,
  updateApplication,
} from '../../server/lib/applications'
import { createUser } from '../../server/lib/users'
import { applicationCreateSchema } from '../../shared/schemas'
import { createTestDatabase } from './helpers/db'

let handle: DatabaseHandle
let alice: string
let bob: string

const input = (fields: Record<string, unknown>) => applicationCreateSchema.parse(fields)

beforeAll(async () => {
  handle = await createTestDatabase()
  alice = (await createUser(handle.db, { name: 'Alice', email: 'alice@example.com', passwordHash: 'h' })).id
  bob = (await createUser(handle.db, { name: 'Bob', email: 'bob@example.com', passwordHash: 'h' })).id
})

beforeEach(async () => {
  await handle.db.delete(applications)
})

afterAll(async () => {
  await handle.close()
})

describe('createApplication', () => {
  it('appends to the end of its column and records the initial status', async () => {
    const first = await createApplication(handle.db, alice, input({ company: 'Acme', role: 'Engineer' }))
    const second = await createApplication(handle.db, alice, input({ company: 'Globex', role: 'Engineer' }))
    expect([first.position, second.position]).toEqual([0, 1])

    const { events } = await getApplication(handle.db, alice, first.id)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ kind: 'status_change', fromStatus: null, toStatus: 'wishlist', done: true })
  })

  it('fills in appliedOn when created as already applied', async () => {
    const app = await createApplication(handle.db, alice, input({ company: 'Acme', role: 'SRE', status: 'applied' }))
    expect(app.appliedOn).toBe(new Date().toISOString().slice(0, 10))
  })
})

describe('listApplications', () => {
  beforeEach(async () => {
    await createApplication(handle.db, alice, input({ company: 'Acme', role: 'Frontend Engineer', location: 'Berlin', status: 'applied', workMode: 'remote' }))
    await createApplication(handle.db, alice, input({ company: 'Globex', role: 'Backend Engineer', notes: 'Referral from 100% Sam', status: 'interview' }))
    await createApplication(handle.db, alice, input({ company: 'initech', role: 'Data Analyst', status: 'wishlist' }))
    await createApplication(handle.db, bob, input({ company: 'Acme', role: 'Bob only' }))
  })

  it('only returns the owner\'s applications', async () => {
    const rows = await listApplications(handle.db, alice)
    expect(rows).toHaveLength(3)
    expect(rows.every(row => row.userId === alice)).toBe(true)
  })

  it('searches company, role, location and notes case-insensitively', async () => {
    expect((await listApplications(handle.db, alice, { q: 'acme' })).map(r => r.company)).toEqual(['Acme'])
    expect((await listApplications(handle.db, alice, { q: 'berlin' })).map(r => r.company)).toEqual(['Acme'])
    expect((await listApplications(handle.db, alice, { q: 'ENGINEER' }))).toHaveLength(2)
    expect((await listApplications(handle.db, alice, { q: 'referral' })).map(r => r.company)).toEqual(['Globex'])
  })

  it('matches LIKE wildcards literally', async () => {
    expect((await listApplications(handle.db, alice, { q: '100%' })).map(r => r.company)).toEqual(['Globex'])
    expect(await listApplications(handle.db, alice, { q: '%' })).toHaveLength(1)
    expect(escapeLike('a_b%c\\')).toBe('a\\_b\\%c\\\\')
  })

  it('filters by status and work mode', async () => {
    const byStatus = await listApplications(handle.db, alice, { status: ['applied', 'interview'] })
    expect(byStatus.map(r => r.company).sort()).toEqual(['Acme', 'Globex'])
    const remote = await listApplications(handle.db, alice, { workMode: ['remote'] })
    expect(remote.map(r => r.company)).toEqual(['Acme'])
  })

  it('sorts by company name ignoring case', async () => {
    const rows = await listApplications(handle.db, alice, { sort: 'company' })
    expect(rows.map(r => r.company)).toEqual(['Acme', 'Globex', 'initech'])
  })
})

describe('updateApplication', () => {
  it('records a status change and moves the card to the end of the new column', async () => {
    const existing = await createApplication(handle.db, alice, input({ company: 'A', role: 'R', status: 'interview' }))
    const app = await createApplication(handle.db, alice, input({ company: 'B', role: 'R', status: 'applied' }))

    const updated = await updateApplication(handle.db, alice, app.id, { status: 'interview' })
    expect(updated.status).toBe('interview')
    expect(updated.position).toBe(existing.position + 1)

    const { events } = await getApplication(handle.db, alice, app.id)
    expect(events.map(e => `${e.fromStatus}->${e.toStatus}`)).toContain('applied->interview')
  })

  it('validates the salary range against stored values', async () => {
    const app = await createApplication(handle.db, alice, input({ company: 'A', role: 'R', salaryMin: 50000, salaryMax: 60000 }))
    await expect(updateApplication(handle.db, alice, app.id, { salaryMin: 70000 }))
      .rejects.toBeInstanceOf(InvalidInputError)
    const ok = await updateApplication(handle.db, alice, app.id, { salaryMin: 55000, salaryMax: null })
    expect([ok.salaryMin, ok.salaryMax]).toEqual([55000, null])
  })

  it('refuses to touch another user\'s application', async () => {
    const app = await createApplication(handle.db, bob, input({ company: 'Bob Co', role: 'R' }))
    await expect(updateApplication(handle.db, alice, app.id, { company: 'Hijacked' })).rejects.toBeInstanceOf(NotFoundError)
    await expect(deleteApplication(handle.db, alice, app.id)).rejects.toBeInstanceOf(NotFoundError)
    await expect(moveApplication(handle.db, alice, app.id, 'offer', 0)).rejects.toBeInstanceOf(NotFoundError)
    const [row] = await handle.db.select().from(applications).where(eq(applications.id, app.id))
    expect(row).toMatchObject({ company: 'Bob Co', status: 'wishlist' })
  })
})

describe('moveApplication', () => {
  async function column(userId: string, status: 'applied' | 'interview') {
    const rows = await listApplications(handle.db, userId, { status: [status] })
    return rows.sort((a, b) => a.position - b.position).map(r => `${r.company}:${r.position}`)
  }

  it('inserts at the requested index and keeps positions dense', async () => {
    const a = await createApplication(handle.db, alice, input({ company: 'A', role: 'R', status: 'interview' }))
    await createApplication(handle.db, alice, input({ company: 'B', role: 'R', status: 'interview' }))
    const c = await createApplication(handle.db, alice, input({ company: 'C', role: 'R', status: 'applied' }))

    await moveApplication(handle.db, alice, c.id, 'interview', 1)
    expect(await column(alice, 'interview')).toEqual(['A:0', 'C:1', 'B:2'])

    await moveApplication(handle.db, alice, a.id, 'interview', 99)
    expect(await column(alice, 'interview')).toEqual(['C:0', 'B:1', 'A:2'])
  })

  it('only records a status change when the column changes', async () => {
    const a = await createApplication(handle.db, alice, input({ company: 'A', role: 'R', status: 'applied' }))
    await createApplication(handle.db, alice, input({ company: 'B', role: 'R', status: 'applied' }))
    await moveApplication(handle.db, alice, a.id, 'applied', 1)
    expect((await getApplication(handle.db, alice, a.id)).events).toHaveLength(1)

    const moved = await moveApplication(handle.db, alice, a.id, 'offer', 0)
    expect(moved.status).toBe('offer')
    expect((await getApplication(handle.db, alice, a.id)).events).toHaveLength(2)
  })

  it('does not renumber other users\' cards', async () => {
    const bobs = await createApplication(handle.db, bob, input({ company: 'Bob', role: 'R', status: 'interview' }))
    const mine = await createApplication(handle.db, alice, input({ company: 'Mine', role: 'R', status: 'applied' }))
    await moveApplication(handle.db, alice, mine.id, 'interview', 0)
    const [row] = await handle.db.select().from(applications).where(eq(applications.id, bobs.id))
    expect(row!.position).toBe(bobs.position)
  })
})
