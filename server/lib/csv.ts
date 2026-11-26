import { asc, eq, sql } from 'drizzle-orm'
import { STATUSES, STATUS_LABELS, WORK_MODES, WORK_MODE_LABELS } from '../../shared/constants'
import type { Status } from '../../shared/constants'
import { CsvParseError, parseCsv, toCsv } from '../../shared/csv'
import { applicationCreateSchema } from '../../shared/schemas'
import type { ApplicationCreateInput } from '../../shared/schemas'
import type { Database } from '../db/client'
import { applicationEvents, applications } from '../db/schema'

export const CSV_COLUMNS = [
  'company',
  'role',
  'status',
  'url',
  'location',
  'work_mode',
  'salary_min',
  'salary_max',
  'currency',
  'applied_on',
  'notes',
  'created_at',
] as const

export const MAX_IMPORT_ROWS = 1000

export async function exportApplicationsCsv(db: Database, userId: string): Promise<string> {
  const rows = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(asc(applications.createdAt), asc(applications.id))

  return toCsv(
    CSV_COLUMNS,
    rows.map(app => [
      app.company,
      app.role,
      app.status,
      app.url,
      app.location,
      app.workMode,
      app.salaryMin,
      app.salaryMax,
      app.currency,
      app.appliedOn,
      app.notes,
      app.createdAt.toISOString(),
    ]),
  )
}

/** Header names accepted on import, so exports from other trackers mostly just work. */
const HEADER_ALIASES: Record<string, keyof ApplicationCreateInput> = {
  'company': 'company',
  'employer': 'company',
  'organisation': 'company',
  'organization': 'company',
  'role': 'role',
  'title': 'role',
  'job title': 'role',
  'position': 'role',
  'status': 'status',
  'stage': 'status',
  'url': 'url',
  'link': 'url',
  'job link': 'url',
  'location': 'location',
  'city': 'location',
  'work_mode': 'workMode',
  'work mode': 'workMode',
  'remote': 'workMode',
  'salary_min': 'salaryMin',
  'salary min': 'salaryMin',
  'min salary': 'salaryMin',
  'salary_max': 'salaryMax',
  'salary max': 'salaryMax',
  'max salary': 'salaryMax',
  'currency': 'currency',
  'applied_on': 'appliedOn',
  'applied on': 'appliedOn',
  'date applied': 'appliedOn',
  'notes': 'notes',
}

const normalise = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, ' ')

function fromLabel<T extends string>(value: string, values: readonly T[], labels: Record<T, string>): string {
  const wanted = normalise(value).replace(/ /g, '')
  for (const option of values) {
    if (option === wanted || normalise(labels[option]).replace(/ /g, '') === wanted) return option
  }
  return value.trim().toLowerCase()
}

export interface ImportIssue {
  /** 1-based line number in the file, header included. */
  line: number
  message: string
}

export type ImportResult
  = | { ok: true, rows: ApplicationCreateInput[] }
    | { ok: false, issues: ImportIssue[] }

/** Parses and validates a CSV upload without touching the database. */
export function parseApplicationsCsv(text: string): ImportResult {
  let table: string[][]
  try {
    table = parseCsv(text)
  }
  catch (error) {
    if (error instanceof CsvParseError) return { ok: false, issues: [{ line: 0, message: error.message }] }
    throw error
  }

  const [header, ...body] = table
  if (!header) return { ok: false, issues: [{ line: 1, message: 'The file is empty' }] }

  const columns = header.map(name => HEADER_ALIASES[normalise(name)])
  const missing = (['company', 'role'] as const).filter(name => !columns.includes(name))
  if (missing.length) {
    return { ok: false, issues: [{ line: 1, message: `Missing required column(s): ${missing.join(', ')}` }] }
  }
  if (body.length === 0) return { ok: false, issues: [{ line: 2, message: 'No rows to import' }] }
  if (body.length > MAX_IMPORT_ROWS) {
    return { ok: false, issues: [{ line: 0, message: `At most ${MAX_IMPORT_ROWS} rows can be imported at once` }] }
  }

  const rows: ApplicationCreateInput[] = []
  const issues: ImportIssue[] = []

  body.forEach((cells, index) => {
    const line = index + 2
    const record: Record<string, string> = {}
    columns.forEach((key, column) => {
      // Undo the apostrophe our own export adds in front of formula-like text.
      const value = cells[column]?.trim().replace(/^'(?=[=+@-])/, '')
      if (key && value) record[key] = value
    })
    // Blank required cells should read "Company is required", not a type error.
    record.company ??= ''
    record.role ??= ''
    if (record.status) record.status = fromLabel(record.status, STATUSES, STATUS_LABELS)
    if (record.workMode) record.workMode = fromLabel(record.workMode, WORK_MODES, WORK_MODE_LABELS)
    if (record.currency) record.currency = record.currency.toUpperCase()

    const parsed = applicationCreateSchema.safeParse(record)
    if (parsed.success) rows.push(parsed.data)
    else {
      for (const issue of parsed.error.issues) {
        issues.push({ line, message: `${issue.path.join('.') || 'row'}: ${issue.message}` })
      }
    }
  })

  return issues.length ? { ok: false, issues } : { ok: true, rows }
}

/**
 * Inserts validated rows in two statements (applications, then their initial
 * status events), appending each to the end of its board column.
 */
export async function importApplications(db: Database, userId: string, rows: ApplicationCreateInput[]): Promise<number> {
  if (rows.length === 0) return 0

  const maxima = await db
    .select({ status: applications.status, max: sql<number>`max(${applications.position})::int` })
    .from(applications)
    .where(eq(applications.userId, userId))
    .groupBy(applications.status)
  const next = new Map<Status, number>(maxima.map(row => [row.status, row.max + 1]))

  const inserted = await db
    .insert(applications)
    .values(rows.map((row) => {
      const position = next.get(row.status) ?? 0
      next.set(row.status, position + 1)
      return { ...row, userId, position }
    }))
    .returning({ id: applications.id, status: applications.status })

  const now = new Date()
  await db.insert(applicationEvents).values(inserted.map(app => ({
    applicationId: app.id,
    userId,
    kind: 'status_change' as const,
    title: `Imported into ${STATUS_LABELS[app.status]}`,
    occursAt: now,
    done: true,
    toStatus: app.status,
  })))

  return inserted.length
}
