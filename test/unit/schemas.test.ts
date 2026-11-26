import { describe, expect, it } from 'vitest'
import {
  applicationCreateSchema,
  applicationListQuerySchema,
  applicationUpdateSchema,
  eventCreateSchema,
} from '../../shared/schemas'

describe('applicationCreateSchema', () => {
  it('applies defaults and turns empty optional fields into null', () => {
    const value = applicationCreateSchema.parse({ company: ' Acme ', role: 'Engineer', location: '', notes: '   ' })
    expect(value).toMatchObject({
      company: 'Acme',
      status: 'wishlist',
      workMode: 'onsite',
      currency: 'EUR',
      location: null,
      notes: null,
      url: null,
      salaryMin: null,
    })
  })

  it('accepts salaries as numbers or formatted strings', () => {
    const value = applicationCreateSchema.parse({ company: 'A', role: 'B', salaryMin: '65,000', salaryMax: 80000 })
    expect([value.salaryMin, value.salaryMax]).toEqual([65000, 80000])
  })

  it('rejects negative or fractional salaries and inverted ranges', () => {
    expect(applicationCreateSchema.safeParse({ company: 'A', role: 'B', salaryMin: -1 }).success).toBe(false)
    expect(applicationCreateSchema.safeParse({ company: 'A', role: 'B', salaryMin: 1.5 }).success).toBe(false)
    const inverted = applicationCreateSchema.safeParse({ company: 'A', role: 'B', salaryMin: 90000, salaryMax: 80000 })
    expect(inverted.success).toBe(false)
    expect(inverted.error?.issues[0]?.path).toEqual(['salaryMax'])
  })

  it('normalises links and rejects junk', () => {
    expect(applicationCreateSchema.parse({ company: 'A', role: 'B', url: 'jobs.example.com/123' }).url)
      .toBe('https://jobs.example.com/123')
    expect(applicationCreateSchema.safeParse({ company: 'A', role: 'B', url: 'javascript:alert(1)' }).success).toBe(false)
    expect(applicationCreateSchema.safeParse({ company: 'A', role: 'B', url: 'not a url' }).success).toBe(false)
  })

  it('requires a real calendar date for appliedOn', () => {
    expect(applicationCreateSchema.parse({ company: 'A', role: 'B', appliedOn: '2026-02-03' }).appliedOn).toBe('2026-02-03')
    expect(applicationCreateSchema.safeParse({ company: 'A', role: 'B', appliedOn: '03/02/2026' }).success).toBe(false)
  })

  it('rejects unknown statuses', () => {
    expect(applicationCreateSchema.safeParse({ company: 'A', role: 'B', status: 'ghosted' }).success).toBe(false)
  })
})

describe('applicationUpdateSchema', () => {
  it('keeps absent keys absent so they are not overwritten', () => {
    expect(applicationUpdateSchema.parse({ notes: 'Hi' })).toEqual({ notes: 'Hi' })
  })

  it('rejects an empty patch', () => {
    expect(applicationUpdateSchema.safeParse({}).success).toBe(false)
  })
})

describe('applicationListQuerySchema', () => {
  it('accepts comma lists and repeated params', () => {
    expect(applicationListQuerySchema.parse({ status: 'applied,offer' }).status).toEqual(['applied', 'offer'])
    expect(applicationListQuerySchema.parse({ status: ['applied', 'offer'] }).status).toEqual(['applied', 'offer'])
    expect(applicationListQuerySchema.parse({}).sort).toBe('updated')
  })
})

describe('eventCreateSchema', () => {
  it('parses the timestamp and refuses status_change events from clients', () => {
    expect(eventCreateSchema.parse({ kind: 'interview', title: 'Call', occursAt: '2026-03-01T10:00:00Z' }).occursAt)
      .toEqual(new Date('2026-03-01T10:00:00Z'))
    expect(eventCreateSchema.safeParse({ kind: 'status_change', title: 'x', occursAt: '2026-03-01' }).success).toBe(false)
  })
})
