import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { DatabaseHandle } from '../../server/db/client'
import { createApplication, moveApplication } from '../../server/lib/applications'
import { loadStats, summarize, weekStart } from '../../server/lib/stats'
import type { StatsInput } from '../../server/lib/stats'
import { createUser } from '../../server/lib/users'
import { applicationCreateSchema } from '../../shared/schemas'
import { createTestDatabase } from './helpers/db'

const now = new Date('2026-03-12T10:00:00Z') // a Thursday

describe('weekStart', () => {
  it('returns the Monday of the week in UTC', () => {
    expect(weekStart(new Date('2026-03-12T10:00:00Z'))).toBe('2026-03-09')
    expect(weekStart(new Date('2026-03-09T00:00:00Z'))).toBe('2026-03-09')
    expect(weekStart(new Date('2026-03-15T23:59:00Z'))).toBe('2026-03-09')
  })
})

describe('summarize', () => {
  const input: StatsInput = {
    applications: [
      { id: 'w', status: 'wishlist', appliedOn: null },
      { id: 'a1', status: 'applied', appliedOn: '2026-03-10' },
      { id: 'a2', status: 'applied', appliedOn: '2026-03-02' },
      { id: 'i1', status: 'interview', appliedOn: '2026-02-20' },
      // Interviewed, then rejected: still counts as having reached interview.
      { id: 'r1', status: 'rejected', appliedOn: '2026-02-18' },
      // Rejected straight after applying.
      { id: 'r2', status: 'rejected', appliedOn: '2026-03-03' },
      { id: 'o1', status: 'offer', appliedOn: '2026-02-01' },
    ],
    statusChanges: [
      { applicationId: 'r1', toStatus: 'applied' },
      { applicationId: 'r1', toStatus: 'interview' },
      { applicationId: 'r1', toStatus: 'rejected' },
      { applicationId: 'r2', toStatus: 'applied' },
      { applicationId: 'r2', toStatus: 'rejected' },
      // Created straight in "offer": earlier stages are implied.
      { applicationId: 'o1', toStatus: 'offer' },
    ],
  }

  const stats = summarize(input, { now })

  it('counts current stages', () => {
    expect(stats.total).toBe(7)
    expect(stats.byStatus).toEqual({ wishlist: 1, applied: 2, interview: 1, offer: 1, rejected: 2 })
  })

  it('builds a funnel from the furthest stage each application reached', () => {
    expect(stats.funnel).toEqual([
      { stage: 'applied', reached: 6, conversionFromPrevious: null },
      { stage: 'interview', reached: 3, conversionFromPrevious: 0.5 },
      { stage: 'offer', reached: 1, conversionFromPrevious: 1 / 3 },
    ])
  })

  it('counts interviews, offers and rejections as responses', () => {
    expect(stats.sent).toBe(6)
    expect(stats.responded).toBe(4)
    expect(stats.responseRate).toBeCloseTo(4 / 6)
  })

  it('buckets applications per week for the last 12 weeks, oldest first', () => {
    expect(stats.perWeek).toHaveLength(12)
    expect(stats.perWeek.at(-1)).toEqual({ weekStart: '2026-03-09', count: 1 })
    expect(stats.perWeek.at(-2)).toEqual({ weekStart: '2026-03-02', count: 2 })
    expect(stats.perWeek.reduce((sum, w) => sum + w.count, 0)).toBe(6)
  })

  it('returns null rates instead of dividing by zero', () => {
    const empty = summarize({ applications: [], statusChanges: [] }, { now })
    expect(empty.responseRate).toBeNull()
    expect(empty.funnel[1]!.conversionFromPrevious).toBeNull()
  })
})

describe('loadStats', () => {
  let handle: DatabaseHandle

  beforeAll(async () => {
    handle = await createTestDatabase()
  })

  afterAll(async () => {
    await handle.close()
  })

  it('reads only the user\'s own applications and status history', async () => {
    const alice = (await createUser(handle.db, { name: 'A', email: 'a@example.com', passwordHash: 'h' })).id
    const bob = (await createUser(handle.db, { name: 'B', email: 'b@example.com', passwordHash: 'h' })).id
    const app = await createApplication(handle.db, alice, applicationCreateSchema.parse({ company: 'A', role: 'R', status: 'applied' }))
    await moveApplication(handle.db, alice, app.id, 'interview', 0)
    await moveApplication(handle.db, alice, app.id, 'rejected', 0)
    await createApplication(handle.db, bob, applicationCreateSchema.parse({ company: 'B', role: 'R', status: 'offer' }))

    const stats = await loadStats(handle.db, alice)
    expect(stats.total).toBe(1)
    expect(stats.funnel.map(step => step.reached)).toEqual([1, 1, 0])
    expect(stats.responseRate).toBe(1)
  })
})
