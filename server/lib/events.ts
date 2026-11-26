import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm'
import type { EventCreateInput, EventUpdateInput } from '../../shared/schemas'
import type { Database } from '../db/client'
import { applicationEvents, applications } from '../db/schema'
import type { ApplicationEvent } from '../db/schema'
import { NotFoundError } from './applications'

async function assertOwnsApplication(db: Database, userId: string, applicationId: string) {
  const [row] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
    .limit(1)
  if (!row) throw new NotFoundError()
}

export async function createEvent(
  db: Database,
  userId: string,
  applicationId: string,
  input: EventCreateInput,
): Promise<ApplicationEvent> {
  await assertOwnsApplication(db, userId, applicationId)
  const [event] = await db
    .insert(applicationEvents)
    .values({ ...input, applicationId, userId })
    .returning()
  await db
    .update(applications)
    .set({ updatedAt: new Date() })
    .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
  return event!
}

async function getOwnEvent(db: Database, userId: string, id: string): Promise<ApplicationEvent> {
  const [event] = await db
    .select()
    .from(applicationEvents)
    .where(and(eq(applicationEvents.id, id), eq(applicationEvents.userId, userId)))
    .limit(1)
  if (!event) throw new NotFoundError('Event')
  return event
}

export class ReadOnlyEventError extends Error {
  constructor() {
    super('Status changes are recorded automatically and cannot be edited')
  }
}

export async function updateEvent(
  db: Database,
  userId: string,
  id: string,
  patch: EventUpdateInput,
): Promise<ApplicationEvent> {
  const event = await getOwnEvent(db, userId, id)
  if (event.kind === 'status_change') throw new ReadOnlyEventError()
  const [updated] = await db
    .update(applicationEvents)
    .set(patch)
    .where(and(eq(applicationEvents.id, id), eq(applicationEvents.userId, userId)))
    .returning()
  return updated!
}

export async function deleteEvent(db: Database, userId: string, id: string): Promise<void> {
  const event = await getOwnEvent(db, userId, id)
  if (event.kind === 'status_change') throw new ReadOnlyEventError()
  await db
    .delete(applicationEvents)
    .where(and(eq(applicationEvents.id, id), eq(applicationEvents.userId, userId)))
}

export interface Reminder {
  id: string
  kind: 'interview' | 'follow_up'
  title: string
  notes: string | null
  occursAt: Date
  overdue: boolean
  application: { id: string, company: string, role: string, status: string }
}

/**
 * Open interviews and follow-ups: everything overdue plus the next `days` days,
 * soonest first.
 */
export async function listReminders(
  db: Database,
  userId: string,
  { days = 14, now = new Date() }: { days?: number, now?: Date } = {},
): Promise<Reminder[]> {
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  // Overdue items older than 30 days are almost certainly stale; keep the panel useful.
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      id: applicationEvents.id,
      kind: applicationEvents.kind,
      title: applicationEvents.title,
      notes: applicationEvents.notes,
      occursAt: applicationEvents.occursAt,
      applicationId: applications.id,
      company: applications.company,
      role: applications.role,
      status: applications.status,
    })
    .from(applicationEvents)
    .innerJoin(applications, eq(applications.id, applicationEvents.applicationId))
    .where(
      and(
        eq(applicationEvents.userId, userId),
        eq(applications.userId, userId),
        eq(applicationEvents.done, false),
        inArray(applicationEvents.kind, ['interview', 'follow_up']),
        gte(applicationEvents.occursAt, since),
        lte(applicationEvents.occursAt, until),
      ),
    )
    .orderBy(asc(applicationEvents.occursAt))

  return rows.map(row => ({
    id: row.id,
    kind: row.kind as Reminder['kind'],
    title: row.title,
    notes: row.notes,
    occursAt: row.occursAt,
    overdue: row.occursAt.getTime() < now.getTime(),
    application: { id: row.applicationId, company: row.company, role: row.role, status: row.status },
  }))
}
