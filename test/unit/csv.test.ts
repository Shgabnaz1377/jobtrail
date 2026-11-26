import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { DatabaseHandle } from '../../server/db/client'
import { exportApplicationsCsv, importApplications, MAX_IMPORT_ROWS, parseApplicationsCsv } from '../../server/lib/csv'
import { createApplication, getApplication, listApplications } from '../../server/lib/applications'
import { createUser } from '../../server/lib/users'
import { CsvParseError, parseCsv, toCsv } from '../../shared/csv'
import { applicationCreateSchema } from '../../shared/schemas'
import { createTestDatabase } from './helpers/db'

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, embedded newlines, CRLF and a BOM', () => {
    const text = '﻿a,b,c\r\n"x, y","say ""hi""","line 1\nline 2"\r\n1,,3\n'
    expect(parseCsv(text)).toEqual([
      ['a', 'b', 'c'],
      ['x, y', 'say "hi"', 'line 1\nline 2'],
      ['1', '', '3'],
    ])
  })

  it('skips blank lines and rejects unterminated quotes', () => {
    expect(parseCsv('a\n\nb\n')).toEqual([['a'], ['b']])
    expect(() => parseCsv('"open')).toThrow(CsvParseError)
  })
})

describe('toCsv', () => {
  it('quotes when needed and neutralises spreadsheet formulas', () => {
    const csv = toCsv(['a', 'b', 'c'], [['=HYPERLINK("x")', 'plain', 42], [null, 'with,comma', '-1']])
    expect(csv).toBe('a,b,c\r\n"\'=HYPERLINK(""x"")",plain,42\r\n,"with,comma",\'-1\r\n')
  })

  it('round-trips through parseCsv', () => {
    const rows = [['Acme "Labs"', 'multi\nline', '']]
    expect(parseCsv(toCsv(['x', 'y', 'z'], rows)).slice(1)).toEqual(rows)
  })
})

describe('parseApplicationsCsv', () => {
  it('maps header aliases and human-readable labels', () => {
    const result = parseApplicationsCsv(
      'Employer,Job Title,Stage,Work Mode,Min Salary,Date applied\n'
      + 'Acme,Engineer,Interview,Remote,"70,000",2026-02-01\n',
    )
    expect(result).toEqual({
      ok: true,
      rows: [expect.objectContaining({
        company: 'Acme',
        role: 'Engineer',
        status: 'interview',
        workMode: 'remote',
        salaryMin: 70000,
        appliedOn: '2026-02-01',
      })],
    })
  })

  it('reports every invalid row with its line number', () => {
    const result = parseApplicationsCsv('company,role,status\nAcme,,applied\nGlobex,Dev,ghosted\nOK,Fine,offer\n')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.map(issue => issue.line)).toEqual([2, 3])
    expect(result.issues[0]!.message).toBe('role: Role is required')
  })

  it('requires company and role columns and caps the row count', () => {
    expect(parseApplicationsCsv('name,notes\nx,y\n')).toMatchObject({ ok: false, issues: [{ message: expect.stringContaining('company, role') }] })
    const big = `company,role\n${'A,B\n'.repeat(MAX_IMPORT_ROWS + 1)}`
    expect(parseApplicationsCsv(big)).toMatchObject({ ok: false })
  })
})

describe('import and export', () => {
  let handle: DatabaseHandle
  let alice: string
  let bob: string

  beforeAll(async () => {
    handle = await createTestDatabase()
    alice = (await createUser(handle.db, { name: 'A', email: 'a@example.com', passwordHash: 'h' })).id
    bob = (await createUser(handle.db, { name: 'B', email: 'b@example.com', passwordHash: 'h' })).id
  })

  afterAll(async () => {
    await handle.close()
  })

  it('round-trips a user\'s applications and appends imports to the board', async () => {
    await createApplication(handle.db, alice, applicationCreateSchema.parse({ company: '=cmd', role: 'Dev', status: 'applied', notes: 'Line 1\nLine 2' }))
    await createApplication(handle.db, bob, applicationCreateSchema.parse({ company: 'Bob Co', role: 'Dev' }))

    const csv = await exportApplicationsCsv(handle.db, alice)
    expect(csv).not.toContain('Bob Co')
    expect(csv).toContain('\'=cmd')

    const parsed = parseApplicationsCsv(csv)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.rows[0]).toMatchObject({ company: '=cmd', notes: 'Line 1\nLine 2', status: 'applied' })

    expect(await importApplications(handle.db, alice, parsed.rows)).toBe(1)
    const applied = (await listApplications(handle.db, alice, { status: ['applied'] })).map(app => app.position).sort()
    expect(applied).toEqual([0, 1])

    const imported = (await listApplications(handle.db, alice)).find(app => app.position === 1)!
    const { events } = await getApplication(handle.db, alice, imported.id)
    expect(events.map(event => event.title)).toEqual(['Imported into Applied'])
    expect(await listApplications(handle.db, bob)).toHaveLength(1)
  })
})
