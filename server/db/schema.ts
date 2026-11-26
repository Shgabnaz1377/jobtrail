import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  date,
} from 'drizzle-orm/pg-core'
import { EVENT_KINDS, STATUSES, WORK_MODES } from '../../shared/constants'

export const statusEnum = pgEnum('application_status', STATUSES)
export const workModeEnum = pgEnum('work_mode', WORK_MODES)
export const eventKindEnum = pgEnum('event_kind', EVENT_KINDS)

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex('users_email_unique').on(sql`lower(${table.email})`),
    index('users_demo_created_idx').on(table.isDemo, table.createdAt),
  ],
)

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    company: text('company').notNull(),
    role: text('role').notNull(),
    url: text('url'),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    currency: text('currency').notNull().default('EUR'),
    location: text('location'),
    workMode: workModeEnum('work_mode').notNull().default('onsite'),
    status: statusEnum('status').notNull().default('wishlist'),
    /** Order of the card inside its board column (0 = top). */
    position: integer('position').notNull().default(0),
    notes: text('notes'),
    appliedOn: date('applied_on', { mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    index('applications_user_status_idx').on(table.userId, table.status, table.position),
  ],
)

export const applicationEvents = pgTable(
  'application_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    /** Denormalised owner so every query can be scoped without a join. */
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: eventKindEnum('kind').notNull(),
    title: text('title').notNull(),
    notes: text('notes'),
    /** When the event happens (interview time, follow-up due date) or happened. */
    occursAt: timestamp('occurs_at', { withTimezone: true }).notNull(),
    done: boolean('done').notNull().default(false),
    fromStatus: statusEnum('from_status'),
    toStatus: statusEnum('to_status'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    index('events_application_idx').on(table.applicationId, table.occursAt),
    index('events_user_occurs_idx').on(table.userId, table.occursAt),
  ],
)

export const usersRelations = relations(users, ({ many }) => ({
  applications: many(applications),
}))

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, { fields: [applications.userId], references: [users.id] }),
  events: many(applicationEvents),
}))

export const applicationEventsRelations = relations(applicationEvents, ({ one }) => ({
  application: one(applications, {
    fields: [applicationEvents.applicationId],
    references: [applications.id],
  }),
}))

export type User = typeof users.$inferSelect
export type Application = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert
export type ApplicationEvent = typeof applicationEvents.$inferSelect
