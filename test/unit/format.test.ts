import { describe, expect, it } from 'vitest'
import { formatDay, formatRelative, formatSalary, linkHost } from '../../app/utils/format'

describe('formatSalary', () => {
  it('formats ranges and open-ended values compactly', () => {
    expect(formatSalary(65000, 80000, 'EUR')).toBe('€65K–€80K')
    expect(formatSalary(120000, 120000, 'USD')).toBe('$120K')
    expect(formatSalary(65000, null, 'GBP')).toBe('from £65K')
    expect(formatSalary(null, 90000, 'EUR')).toBe('up to €90K')
    expect(formatSalary(null, null)).toBe('')
  })
})

describe('formatDay', () => {
  it('does not shift calendar dates across time zones', () => {
    expect(formatDay('2026-01-01')).toBe('Jan 1, 2026')
    expect(formatDay(null)).toBe('')
  })
})

describe('formatRelative', () => {
  const now = new Date('2026-05-01T12:00:00Z')
  it('picks a sensible unit', () => {
    expect(formatRelative('2026-05-01T12:20:00Z', now)).toBe('in 20 minutes')
    expect(formatRelative('2026-05-02T12:00:00Z', now)).toBe('tomorrow')
    expect(formatRelative('2026-04-28T12:00:00Z', now)).toBe('3 days ago')
  })
})

describe('linkHost', () => {
  it('shows the host without www', () => {
    expect(linkHost('https://www.example.com/jobs/1')).toBe('example.com')
    expect(linkHost(null)).toBe('')
  })
})
