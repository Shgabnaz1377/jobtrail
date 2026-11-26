import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { DatabaseHandle } from '../../server/db/client'
import { applicationEvents, applications } from '../../server/db/schema'
import { createApplication, getApplication, NotFoundError } from '../../server/lib/applications'
import { createEvent, deleteEvent, listReminders, ReadOnlyEventError, updateEvent } from '../../server/lib/events'
import { createUser } from '../../server/lib/users'
import { applicationCreateSchema, eventCreateSchema } from '../../shared/schemas'
import { createTestDatabase } from './helpers/db'

let handle: DatabaseHandle
let alice: string
let bob: string

const DAY = 24 * 60 * 60 * 1000
const now = new Date('2026-03-10T09:00:00Z')
const at = (offsetDays: number) => new Date(now.getTime() + offsetDays * DAY).toISOString()

beforeAll(async () => {
  handle = await createTestDatabase()
  alice = (await createUser(handle.db, { name: 'Alice', email: 'alice@example.com', passwordHash: 'h' })).id
  bob = (await createUser(handle.db, { name: 'Bob', email: 'bob@example.com', passwordHash: 'h' })).id
})

beforeEach(async () => {
  await handle.db.delete(applicationEvents)
  await handle.db.delete(applications)
})

afterAll(async () => {
  await handle.close()
})

async function newApp(userId: string, company = 'Acme') {
  return createApplication(handle.db, userId, applicationCreateSchema.parse({ company, role: 'Engineer', status: 'applied' }))
}

describe('timeline events', () => {
  it('adds events to the owner\'s application only', async () => {
    const app = await newApp(alice)
    const event = await createEvent(handle.db, alice, app.id, eventCreateSchema.parse({
      kind: 'interview',
      title: 'Tech screen',
      occursAt: at(2),
    }))
    expect(event).toMatchObject({ kind: 'interview', done: false, userId: alice })

    await expect(createEvent(handle.db, bob, app.id, eventCreateSchema.parse({
      kind: 'note',
      title: 'Sneaky',
      occursAt: at(0),
    }))).rejects.toBeInstanceOf(NotFoundError)
  })

  it('lets the owner edit and delete manual events but not status changes', async () => {
    const app = await newApp(alice)
    const event = await createEvent(handle.db, alice, app.id, eventCreateSchema.parse({ kind: 'follow_up', title: 'Ping recruiter', occursAt: at(1) }))

    expect((await updateEvent(handle.db, alice, event.id, { done: true })).done).toBe(true)
    await expect(updateEvent(handle.db, bob, event.id, { done: false })).rejects.toBeInstanceOf(NotFoundError)
    await expect(deleteEvent(handle.db, bob, event.id)).rejects.toBeInstanceOf(NotFoundError)

    const statusChange = (await getApplication(handle.db, alice, app.id)).events.find(e => e.kind === 'status_change')!
    await expect(updateEvent(handle.db, alice, statusChange.id, { title: 'x' })).rejects.toBeInstanceOf(ReadOnlyEventError)
    await expect(deleteEvent(handle.db, alice, statusChange.id)).rejects.toBeInstanceOf(ReadOnlyEventError)

    await deleteEvent(handle.db, alice, event.id)
    expect((await getApplication(handle.db, alice, app.id)).events.map(e => e.kind)).toEqual(['status_change'])
  })
})

describe('listReminders', () => {
  it('returns open interviews and follow-ups in the window, soonest first, flagging overdue ones', async () => {
    const app = await newApp(alice, 'Acme')
    const add = (kind: 'interview' | 'follow_up' | 'note', title: string, offset: number, done = false) =>
      createEvent(handle.db, alice, app.id, eventCreateSchema.parse({ kind, title, occursAt: at(offset), done }))

    await add('follow_up', 'Overdue follow-up', -2)
    await add('interview', 'Onsite', 3)
    await add('interview', 'Too far out', 30)
    await add('interview', 'Already done', 1, true)
    await add('note', 'Notes are not reminders', 1)
    await add('follow_up', 'Ancient', -60)

    const reminders = await listReminders(handle.db, alice, { days: 14, now })
    expect(reminders.map(r => [r.title, r.overdue])).toEqual([
      ['Overdue follow-up', true],
      ['Onsite', false],
    ])
    expect(reminders[0]!.application).toMatchObject({ company: 'Acme', status: 'applied' })
  })

  it('never includes another user\'s reminders', async () => {
    const app = await newApp(bob, 'Bob Co')
    await createEvent(handle.db, bob, app.id, eventCreateSchema.parse({ kind: 'interview', title: 'Bob interview', occursAt: at(1) }))
    expect(await listReminders(handle.db, alice, { now })).toEqual([])
    expect(await listReminders(handle.db, bob, { now })).toHaveLength(1)
  })
})
