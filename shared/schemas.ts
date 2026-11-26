import { z } from 'zod'
import { CURRENCIES, MANUAL_EVENT_KINDS, STATUSES, WORK_MODES } from './constants'

/* ---------- Auth ---------- */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Enter a valid email address' }))
  .refine(value => value.length <= 254, 'Email is too long')

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name is too long'),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(200, 'Password is too long'),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(200),
})
export type LoginInput = z.infer<typeof loginSchema>

/* ---------- Shared field helpers ---------- */

/** Trimmed optional text; empty strings become null so "cleared" fields are stored as NULL. */
function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .nullish()
    .transform(value => (value ? value : null))
}

const salary = z
  .union([z.number(), z.string().trim()])
  .nullish()
  .transform((value, ctx) => {
    if (value === null || value === undefined || value === '') return null
    const number = typeof value === 'number' ? value : Number(value.replace(/[\s,_]/g, ''))
    if (!Number.isInteger(number) || number < 0 || number > 100_000_000) {
      ctx.addIssue({ code: 'custom', message: 'Enter a whole, non-negative amount' })
      return z.NEVER
    }
    return number
  })

const isoDate = z
  .string()
  .trim()
  .nullish()
  .transform((value, ctx) => {
    if (!value) return null
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
      ctx.addIssue({ code: 'custom', message: 'Use the format YYYY-MM-DD' })
      return z.NEVER
    }
    return value
  })

const httpUrl = z
  .string()
  .trim()
  .max(2000, 'URL is too long')
  .nullish()
  .transform((value, ctx) => {
    if (!value) return null
    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
    try {
      const parsed = new URL(withScheme)
      if (!parsed.hostname.includes('.')) throw new Error('no tld')
      return parsed.toString()
    }
    catch {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid link' })
      return z.NEVER
    }
  })

export const idSchema = z.uuid()

/* ---------- Applications ---------- */

const applicationFields = {
  company: z.string().trim().min(1, 'Company is required').max(120, 'Company is too long'),
  role: z.string().trim().min(1, 'Role is required').max(120, 'Role is too long'),
  url: httpUrl,
  salaryMin: salary,
  salaryMax: salary,
  currency: z.enum(CURRENCIES).default('EUR'),
  location: optionalText(120),
  workMode: z.enum(WORK_MODES).default('onsite'),
  status: z.enum(STATUSES).default('wishlist'),
  notes: optionalText(5000),
  appliedOn: isoDate,
}

function salaryRangeIsOrdered(value: { salaryMin?: number | null, salaryMax?: number | null }) {
  return value.salaryMin == null || value.salaryMax == null || value.salaryMin <= value.salaryMax
}

const salaryRangeIssue = { message: 'Minimum salary must not exceed the maximum', path: ['salaryMax'] }

export const applicationCreateSchema = z
  .object(applicationFields)
  .refine(salaryRangeIsOrdered, salaryRangeIssue)
export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>

/** Every field optional; absent keys are left untouched. */
export const applicationUpdateSchema = z
  .object({
    company: applicationFields.company.optional(),
    role: applicationFields.role.optional(),
    url: httpUrl.optional(),
    salaryMin: salary.optional(),
    salaryMax: salary.optional(),
    currency: z.enum(CURRENCIES).optional(),
    location: optionalText(120).optional(),
    workMode: z.enum(WORK_MODES).optional(),
    status: z.enum(STATUSES).optional(),
    notes: optionalText(5000).optional(),
    appliedOn: isoDate.optional(),
  })
  .refine(value => Object.keys(value).length > 0, 'Nothing to update')
export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>

export const APPLICATION_SORTS = ['updated', 'created', 'company', 'applied'] as const

const listOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform(value => (value === undefined ? [] : (Array.isArray(value) ? value : value.split(','))).filter(Boolean))
    .pipe(z.array(z.enum(values)))

export const applicationListQuerySchema = z.object({
  q: z.string().trim().max(100).optional().transform(value => value || undefined),
  status: listOf(STATUSES),
  workMode: listOf(WORK_MODES),
  sort: z.enum(APPLICATION_SORTS).default('updated'),
})
export type ApplicationListQuery = z.infer<typeof applicationListQuerySchema>

export const moveSchema = z.object({
  status: z.enum(STATUSES),
  /** Zero-based index inside the destination column. Larger values append. */
  position: z.number().int().min(0).max(10_000),
})
export type MoveInput = z.infer<typeof moveSchema>

/* ---------- Timeline events ---------- */

const occursAt = z
  .string()
  .trim()
  .refine(value => !Number.isNaN(Date.parse(value)), 'Enter a valid date and time')
  .transform(value => new Date(value))

export const eventCreateSchema = z.object({
  kind: z.enum(MANUAL_EVENT_KINDS),
  title: z.string().trim().min(1, 'Title is required').max(160, 'Title is too long'),
  notes: optionalText(2000),
  occursAt,
  done: z.boolean().default(false),
})
export type EventCreateInput = z.infer<typeof eventCreateSchema>

export const eventUpdateSchema = z
  .object({
    kind: z.enum(MANUAL_EVENT_KINDS).optional(),
    title: eventCreateSchema.shape.title.optional(),
    notes: optionalText(2000).optional(),
    occursAt: occursAt.optional(),
    done: z.boolean().optional(),
  })
  .refine(value => Object.keys(value).length > 0, 'Nothing to update')
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>

export const remindersQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14),
})
