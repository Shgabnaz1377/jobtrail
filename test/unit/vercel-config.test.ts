import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('vercel.json', () => {
  const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))

  it('schedules the demo cleanup once a day (allowed on every plan)', () => {
    expect(config.crons).toEqual([{ path: '/api/cron/cleanup-demo', schedule: '0 4 * * *' }])
  })

  it('points the cron at a route that exists', () => {
    expect(existsSync(new URL('../../server/api/cron/cleanup-demo.get.ts', import.meta.url))).toBe(true)
  })
})
