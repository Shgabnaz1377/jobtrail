import { and, eq } from 'drizzle-orm'
import { STATUSES } from '../../shared/constants'
import type { Status } from '../../shared/constants'
import type { Database } from '../db/client'
import { applicationEvents, applications } from '../db/schema'

/** How far along the pipeline each stage is. Rejected is an outcome, not a stage. */
const STAGE_RANK: Partial<Record<Status, number>> = { applied: 1, interview: 2, offer: 3 }

export const FUNNEL_STAGES = ['applied', 'interview', 'offer'] as const
export type FunnelStage = (typeof FUNNEL_STAGES)[number]

export interface StatsInput {
  applications: { id: string, status: Status, appliedOn: string | null }[]
  /** Status changes as recorded on the timeline. */
  statusChanges: { applicationId: string, toStatus: Status | null }[]
}

export interface Stats {
  total: number
  byStatus: Record<Status, number>
  funnel: { stage: FunnelStage, reached: number, conversionFromPrevious: number | null }[]
  /** Share of sent applications that got any answer (interview, offer or rejection). */
  responseRate: number | null
  responded: number
  sent: number
  offers: number
  perWeek: { weekStart: string, count: number }[]
}

/** Monday (UTC) of the week containing `day`, as YYYY-MM-DD. */
export function weekStart(day: Date): string {
  const date = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()))
  const offset = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - offset)
  return date.toISOString().slice(0, 10)
}

const ratio = (part: number, whole: number) => (whole === 0 ? null : part / whole)

export function summarize(input: StatsInput, { now = new Date(), weeks = 12 } = {}): Stats {
  const byStatus = Object.fromEntries(STATUSES.map(status => [status, 0])) as Record<Status, number>

  // Every status an application has ever been in, so the funnel credits stages
  // that were passed through even if the application was rejected later.
  const history = new Map<string, Set<Status>>()
  for (const app of input.applications) history.set(app.id, new Set([app.status]))
  for (const change of input.statusChanges) {
    if (change.toStatus) history.get(change.applicationId)?.add(change.toStatus)
  }

  const reached: Record<FunnelStage, number> = { applied: 0, interview: 0, offer: 0 }
  let responded = 0

  for (const app of input.applications) {
    byStatus[app.status] += 1
    const seen = history.get(app.id)!
    let highest = 0
    for (const status of seen) highest = Math.max(highest, STAGE_RANK[status] ?? 0)
    // A rejection with an applied date means it was sent before being turned down.
    if (highest === 0 && seen.has('rejected') && app.appliedOn) highest = 1

    for (const stage of FUNNEL_STAGES) {
      if (highest >= STAGE_RANK[stage]!) reached[stage] += 1
    }
    if (highest >= 1 && (highest >= 2 || seen.has('rejected'))) responded += 1
  }

  const funnel = FUNNEL_STAGES.map((stage, index) => ({
    stage,
    reached: reached[stage],
    conversionFromPrevious: index === 0 ? null : ratio(reached[stage], reached[FUNNEL_STAGES[index - 1]!]),
  }))

  const buckets = new Map<string, number>()
  const thisWeek = new Date(`${weekStart(now)}T00:00:00Z`)
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek)
    start.setUTCDate(start.getUTCDate() - i * 7)
    buckets.set(start.toISOString().slice(0, 10), 0)
  }
  for (const app of input.applications) {
    if (!app.appliedOn) continue
    const key = weekStart(new Date(`${app.appliedOn}T00:00:00Z`))
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1)
  }

  return {
    total: input.applications.length,
    byStatus,
    funnel,
    responseRate: ratio(responded, reached.applied),
    responded,
    sent: reached.applied,
    offers: reached.offer,
    perWeek: [...buckets].map(([weekStart, count]) => ({ weekStart, count })),
  }
}

export async function loadStats(db: Database, userId: string, now = new Date()): Promise<Stats> {
  const [apps, statusChanges] = await Promise.all([
    db
      .select({ id: applications.id, status: applications.status, appliedOn: applications.appliedOn })
      .from(applications)
      .where(eq(applications.userId, userId)),
    db
      .select({ applicationId: applicationEvents.applicationId, toStatus: applicationEvents.toStatus })
      .from(applicationEvents)
      .where(and(eq(applicationEvents.userId, userId), eq(applicationEvents.kind, 'status_change'))),
  ])
  return summarize({ applications: apps, statusChanges }, { now })
}
