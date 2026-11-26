import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { STATUS_LABELS } from '../../shared/constants'
import type { Status } from '../../shared/constants'
import type {
  ApplicationCreateInput,
  ApplicationListQuery,
  ApplicationUpdateInput,
} from '../../shared/schemas'
import type { Database } from '../db/client'
import { applicationEvents, applications } from '../db/schema'
import type { Application, ApplicationEvent } from '../db/schema'

export class NotFoundError extends Error {
  constructor(what = 'Application') {
    super(`${what} not found`)
  }
}

export class InvalidInputError extends Error {
  constructor(message: string, public readonly path: string) {
    super(message)
  }
}

export type ApplicationWithEvents = Application & { events: ApplicationEvent[] }

/** Escapes LIKE wildcards so user input is matched literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, char => `\\${char}`)
}

function today(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** Statuses that imply the application has been sent. */
const SENT_STATUSES: Status[] = ['applied', 'interview', 'offer', 'rejected']

export async function listApplications(
  db: Database,
  userId: string,
  query: Partial<ApplicationListQuery> = {},
): Promise<Application[]> {
  const conditions: SQL[] = [eq(applications.userId, userId)]

  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`
    conditions.push(
      or(
        ilike(applications.company, pattern),
        ilike(applications.role, pattern),
        ilike(applications.location, pattern),
        ilike(applications.notes, pattern),
      )!,
    )
  }
  if (query.status?.length) conditions.push(inArray(applications.status, query.status))
  if (query.workMode?.length) conditions.push(inArray(applications.workMode, query.workMode))

  const orderBy = {
    updated: [desc(applications.updatedAt)],
    created: [desc(applications.createdAt)],
    company: [asc(sql`lower(${applications.company})`), asc(applications.role)],
    applied: [sql`${applications.appliedOn} desc nulls last`, desc(applications.createdAt)],
  }[query.sort ?? 'updated']

  return db
    .select()
    .from(applications)
    .where(and(...conditions))
    .orderBy(...orderBy, asc(applications.id))
}

export async function getApplication(db: Database, userId: string, id: string): Promise<ApplicationWithEvents> {
  const [application] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .limit(1)
  if (!application) throw new NotFoundError()

  const events = await db
    .select()
    .from(applicationEvents)
    .where(and(eq(applicationEvents.applicationId, id), eq(applicationEvents.userId, userId)))
    .orderBy(desc(applicationEvents.occursAt), desc(applicationEvents.createdAt))

  return { ...application, events }
}

async function nextPosition(db: Database, userId: string, status: Status): Promise<number> {
  const [row] = await db
    .select({ next: sql<number>`coalesce(max(${applications.position}) + 1, 0)::int` })
    .from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.status, status)))
  return row?.next ?? 0
}

async function recordStatusChange(
  db: Database,
  userId: string,
  applicationId: string,
  from: Status | null,
  to: Status,
  at = new Date(),
) {
  await db.insert(applicationEvents).values({
    applicationId,
    userId,
    kind: 'status_change',
    title: from ? `Moved to ${STATUS_LABELS[to]}` : `Added to ${STATUS_LABELS[to]}`,
    occursAt: at,
    done: true,
    fromStatus: from,
    toStatus: to,
  })
}

export async function createApplication(
  db: Database,
  userId: string,
  input: ApplicationCreateInput,
): Promise<Application> {
  const status = input.status ?? 'wishlist'
  const [application] = await db
    .insert(applications)
    .values({
      ...input,
      userId,
      status,
      appliedOn: input.appliedOn ?? (SENT_STATUSES.includes(status) ? today() : null),
      position: await nextPosition(db, userId, status),
    })
    .returning()
  await recordStatusChange(db, userId, application!.id, null, status)
  return application!
}

export async function updateApplication(
  db: Database,
  userId: string,
  id: string,
  patch: ApplicationUpdateInput,
): Promise<Application> {
  const current = await getApplication(db, userId, id)

  const salaryMin = patch.salaryMin === undefined ? current.salaryMin : patch.salaryMin
  const salaryMax = patch.salaryMax === undefined ? current.salaryMax : patch.salaryMax
  if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
    throw new InvalidInputError('Minimum salary must not exceed the maximum', 'salaryMax')
  }

  const changes: Partial<Application> = { ...patch, updatedAt: new Date() }
  const statusChanged = patch.status !== undefined && patch.status !== current.status
  if (statusChanged) {
    changes.position = await nextPosition(db, userId, patch.status!)
    if (!current.appliedOn && patch.appliedOn === undefined && SENT_STATUSES.includes(patch.status!)) {
      changes.appliedOn = today()
    }
  }

  const [updated] = await db
    .update(applications)
    .set(changes)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .returning()
  if (!updated) throw new NotFoundError()

  if (statusChanged) await recordStatusChange(db, userId, id, current.status, patch.status!)
  return updated
}

export async function deleteApplication(db: Database, userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .returning({ id: applications.id })
  if (deleted.length === 0) throw new NotFoundError()
}

/**
 * Moves a card to `status` at index `position` and renumbers that column so
 * positions stay dense (0..n-1). Moving within the same column reorders it.
 */
export async function moveApplication(
  db: Database,
  userId: string,
  id: string,
  status: Status,
  position: number,
): Promise<Application> {
  const current = await getApplication(db, userId, id)

  const column = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.status, status)))
    .orderBy(asc(applications.position), asc(applications.createdAt))

  const order = column.map(row => row.id).filter(rowId => rowId !== id)
  order.splice(Math.min(position, order.length), 0, id)

  const statusChanged = current.status !== status
  const now = new Date()
  const cases = sql.join(
    order.map((rowId, index) => sql`when ${applications.id} = ${rowId} then ${index}::int`),
    sql` `,
  )

  await db
    .update(applications)
    .set({ position: sql`case ${cases} else ${applications.position} end` })
    .where(and(eq(applications.userId, userId), inArray(applications.id, order)))

  const [updated] = await db
    .update(applications)
    .set({
      status,
      updatedAt: now,
      ...(statusChanged && !current.appliedOn && SENT_STATUSES.includes(status) ? { appliedOn: today(now) } : {}),
    })
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .returning()

  if (statusChanged) await recordStatusChange(db, userId, id, current.status, status, now)
  return updated!
}
