import { describe, expect, it } from 'vitest'
import { createAgent, CRON_SECRET, setupServer } from './helpers'

await setupServer()

describe('demo mode', () => {
  it('starts a signed-in session on a seeded demo account', async () => {
    const agent = createAgent()
    const res = await agent.post('/api/auth/demo')
    expect(res.status).toBe(201)

    const me = await agent.get<{ user: { isDemo: boolean } }>('/api/auth/me')
    expect(me.body.user.isDemo).toBe(true)

    const apps = await agent.get<unknown[]>('/api/applications')
    expect(apps.body.length).toBeGreaterThan(10)
  })

  it('keeps each visitor\'s demo separate', async () => {
    const first = createAgent()
    const second = createAgent()
    await first.post('/api/auth/demo')
    await second.post('/api/auth/demo')

    const [app] = (await first.get<{ id: string }[]>('/api/applications')).body
    expect((await second.get(`/api/applications/${app!.id}`)).status).toBe(404)
    expect((await first.delete(`/api/applications/${app!.id}`)).status).toBe(204)
    expect((await second.get<unknown[]>('/api/applications')).body.length).toBeGreaterThan(10)
  })

  it('protects the cleanup route with the cron secret', async () => {
    const anon = createAgent()
    expect((await anon.get('/api/cron/cleanup-demo')).status).toBe(401)
    expect((await anon.get('/api/cron/cleanup-demo', { authorization: 'Bearer wrong' })).status).toBe(401)

    const ok = await anon.get<{ deleted: number }>('/api/cron/cleanup-demo', { authorization: `Bearer ${CRON_SECRET}` })
    expect(ok.status).toBe(200)
    // Demo accounts created in this run are minutes old, so none are due yet.
    expect(ok.body.deleted).toBe(0)
  })
})
