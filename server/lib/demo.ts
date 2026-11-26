import { randomUUID } from 'node:crypto'
import { and, eq, lt } from 'drizzle-orm'
import { DEMO_TTL_HOURS, STATUS_LABELS } from '../../shared/constants'
import type { Currency, Status, WorkMode } from '../../shared/constants'
import type { Database } from '../db/client'
import { applicationEvents, applications, users } from '../db/schema'
import type { User } from '../db/schema'

const DAY = 24 * 60 * 60 * 1000

interface SeedEvent {
  kind: 'interview' | 'follow_up' | 'note'
  title: string
  /** Relative to "now"; negative = in the past. */
  inDays: number
  hour?: number
  done?: boolean
  notes?: string
}

interface SeedApplication {
  company: string
  role: string
  location: string | null
  workMode: WorkMode
  salary?: [number, number]
  currency?: Currency
  url?: string
  /** Stages passed through, in order. The last one is the current status. */
  path: Status[]
  /** Days ago the application was sent (or added, for wishlist items). */
  daysAgo: number
  notes?: string
  events?: SeedEvent[]
}

/** Fictional companies and a believable spread of outcomes for the demo account. */
export const DEMO_APPLICATIONS: SeedApplication[] = [
  {
    company: 'Northwind Analytics',
    role: 'Senior Frontend Engineer',
    location: 'Amsterdam',
    workMode: 'hybrid',
    salary: [78000, 92000],
    url: 'https://careers.northwind.example/jobs/frontend',
    path: ['applied', 'interview', 'offer'],
    daysAgo: 38,
    notes: 'Vue + TypeScript design system team. Hiring manager: Priya.',
    events: [
      { kind: 'interview', title: 'Recruiter screen', inDays: -31, hour: 10, done: true },
      { kind: 'interview', title: 'Pair-programming exercise', inDays: -22, hour: 14, done: true },
      { kind: 'interview', title: 'Panel with the design system team', inDays: -12, hour: 15, done: true },
      { kind: 'follow_up', title: 'Reply to the offer', inDays: 3, hour: 12, notes: 'Ask about the learning budget and on-call.' },
    ],
  },
  {
    company: 'Lumen Labs',
    role: 'Full-Stack Developer',
    location: 'Berlin',
    workMode: 'remote',
    salary: [70000, 85000],
    path: ['applied', 'interview'],
    daysAgo: 20,
    notes: 'Nuxt + Postgres. Small team, Series A.',
    events: [
      { kind: 'interview', title: 'Intro call with the CTO', inDays: -12, hour: 11, done: true },
      { kind: 'interview', title: 'System design interview', inDays: 2, hour: 15, notes: 'Review queues and idempotency.' },
    ],
  },
  {
    company: 'Brightwave Energy',
    role: 'Software Engineer, Platform',
    location: 'Copenhagen',
    workMode: 'onsite',
    salary: [72000, 84000],
    path: ['applied', 'interview'],
    daysAgo: 16,
    events: [
      { kind: 'interview', title: 'Technical phone screen', inDays: -6, hour: 9, done: true },
      { kind: 'interview', title: 'Onsite loop', inDays: 6, hour: 10 },
    ],
  },
  {
    company: 'Fernhill Health',
    role: 'Frontend Engineer',
    location: 'London',
    workMode: 'hybrid',
    salary: [65000, 75000],
    currency: 'GBP',
    path: ['applied'],
    daysAgo: 9,
    events: [
      { kind: 'follow_up', title: 'Follow up with the recruiter', inDays: -1, hour: 9 },
    ],
  },
  {
    company: 'Copperleaf',
    role: 'TypeScript Engineer',
    location: 'Remote (EU)',
    workMode: 'remote',
    salary: [72000, 80000],
    path: ['applied'],
    daysAgo: 5,
    events: [
      { kind: 'follow_up', title: 'Check application status', inDays: 9, hour: 10 },
    ],
  },
  {
    company: 'Kestrel Robotics',
    role: 'Web Engineer, Fleet Tools',
    location: 'Munich',
    workMode: 'hybrid',
    salary: [75000, 88000],
    path: ['applied'],
    daysAgo: 3,
  },
  {
    company: 'Harbor & Pine',
    role: 'Product Engineer',
    location: 'Lisbon',
    workMode: 'remote',
    salary: [55000, 65000],
    path: ['applied', 'rejected'],
    daysAgo: 44,
    notes: 'Rejected after the take-home: wanted more backend depth.',
    events: [
      { kind: 'note', title: 'Take-home submitted', inDays: -36, hour: 18, done: true },
    ],
  },
  {
    company: 'Quillstack',
    role: 'Senior Vue Developer',
    location: 'Vienna',
    workMode: 'hybrid',
    path: ['applied', 'interview', 'rejected'],
    daysAgo: 52,
    events: [
      { kind: 'interview', title: 'Culture interview', inDays: -45, hour: 13, done: true },
      { kind: 'note', title: 'Feedback received', inDays: -40, done: true, notes: 'Strong technically; went with an internal candidate.' },
    ],
  },
  {
    company: 'Tidepool Analytics',
    role: 'Data Visualisation Engineer',
    location: 'Zurich',
    workMode: 'onsite',
    salary: [110000, 130000],
    currency: 'CHF',
    path: ['applied', 'rejected'],
    daysAgo: 28,
  },
  {
    company: 'Orbitly',
    role: 'Frontend Developer',
    location: 'Paris',
    workMode: 'hybrid',
    path: ['applied'],
    daysAgo: 60,
    notes: 'No answer yet. Probably ghosted.',
  },
  {
    company: 'Sable Systems',
    role: 'Staff Engineer, Web Platform',
    location: 'Dublin',
    workMode: 'hybrid',
    salary: [120000, 140000],
    path: ['wishlist'],
    daysAgo: 4,
    url: 'https://jobs.sable.example/staff-web',
    notes: 'Ask Sam for a referral first.',
    events: [
      { kind: 'follow_up', title: 'Message Sam about a referral', inDays: 1, hour: 18 },
    ],
  },
  {
    company: 'Meadowlark Media',
    role: 'Senior Software Engineer',
    location: 'Barcelona',
    workMode: 'remote',
    path: ['wishlist'],
    daysAgo: 2,
  },
  {
    company: 'Nimbus Freight',
    role: 'Frontend Lead',
    location: 'Rotterdam',
    workMode: 'onsite',
    salary: [90000, 105000],
    path: ['wishlist'],
    daysAgo: 1,
  },
  {
    company: 'Juniper Bank',
    role: 'Software Engineer II',
    location: 'Frankfurt',
    workMode: 'hybrid',
    salary: [68000, 76000],
    path: ['applied', 'interview'],
    daysAgo: 24,
    events: [
      { kind: 'interview', title: 'HR screen', inDays: -15, hour: 16, done: true },
      { kind: 'follow_up', title: 'Send thank-you note', inDays: -14, done: true },
      { kind: 'interview', title: 'Coding interview', inDays: 4, hour: 11 },
    ],
  },
]

function at(now: Date, inDays: number, hour = 10): Date {
  const date = new Date(now.getTime() + inDays * DAY)
  date.setUTCHours(hour, 0, 0, 0)
  return date
}

/**
 * Creates a throwaway account full of sample data. The password hash is passed
 * in (hashing lives in the HTTP layer) and is never revealed to anyone.
 */
export async function createDemoAccount(db: Database, passwordHash: string, now = new Date()): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      email: `demo-${randomUUID()}@demo.jobtrail.invalid`,
      name: 'Demo User',
      passwordHash,
      isDemo: true,
      createdAt: now,
    })
    .returning()

  const positions = new Map<Status, number>()
  const inserted = await db
    .insert(applications)
    .values(DEMO_APPLICATIONS.map((seed) => {
      const status = seed.path.at(-1)!
      const position = positions.get(status) ?? 0
      positions.set(status, position + 1)
      const sentAt = at(now, -seed.daysAgo, 9)
      return {
        userId: user!.id,
        company: seed.company,
        role: seed.role,
        url: seed.url ?? null,
        location: seed.location,
        workMode: seed.workMode,
        salaryMin: seed.salary?.[0] ?? null,
        salaryMax: seed.salary?.[1] ?? null,
        currency: seed.currency ?? 'EUR',
        status,
        position,
        notes: seed.notes ?? null,
        appliedOn: status === 'wishlist' ? null : sentAt.toISOString().slice(0, 10),
        createdAt: sentAt,
        updatedAt: sentAt,
      }
    }))
    .returning({ id: applications.id })

  const events = DEMO_APPLICATIONS.flatMap((seed, index) => {
    const applicationId = inserted[index]!.id
    const sentDay = -seed.daysAgo
    // Spread status changes between the send date and today.
    const step = seed.path.length > 1 ? Math.max(1, Math.floor(seed.daysAgo / seed.path.length)) : 0
    const statusEvents = seed.path.map((status, i) => ({
      applicationId,
      userId: user!.id,
      kind: 'status_change' as const,
      title: i === 0 ? `Added to ${STATUS_LABELS[status]}` : `Moved to ${STATUS_LABELS[status]}`,
      occursAt: at(now, sentDay + i * step, 9 + i),
      done: true,
      fromStatus: i === 0 ? null : seed.path[i - 1]!,
      toStatus: status,
    }))
    const manualEvents = (seed.events ?? []).map(event => ({
      applicationId,
      userId: user!.id,
      kind: event.kind,
      title: event.title,
      notes: event.notes ?? null,
      occursAt: at(now, event.inDays, event.hour),
      done: event.done ?? false,
    }))
    return [...statusEvents, ...manualEvents]
  })
  await db.insert(applicationEvents).values(events)

  return user!
}

/** Deletes demo accounts older than the TTL; cascades remove their data. */
export async function cleanupDemoAccounts(db: Database, now = new Date(), ttlHours = DEMO_TTL_HOURS): Promise<number> {
  const cutoff = new Date(now.getTime() - ttlHours * 60 * 60 * 1000)
  const deleted = await db
    .delete(users)
    .where(and(eq(users.isDemo, true), lt(users.createdAt, cutoff)))
    .returning({ id: users.id })
  return deleted.length
}
