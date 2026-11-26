import { beforeAll, describe, expect, it } from 'vitest'
import { createAgent, registeredAgent, setupServer } from './helpers'
import type { Agent } from './helpers'

await setupServer()

interface App {
  id: string
  userId: string
  company: string
  status: string
  position: number
  events?: { id: string, kind: string }[]
}

describe('applications API', () => {
  let alice: Agent

  beforeAll(async () => {
    alice = (await registeredAgent('Alice')).agent
  })

  it('requires a session', async () => {
    const anon = createAgent()
    expect((await anon.get('/api/applications')).status).toBe(401)
    expect((await anon.post('/api/applications', { company: 'A', role: 'B' })).status).toBe(401)
    expect((await anon.get('/api/reminders')).status).toBe(401)
  })

  it('creates, reads, updates and deletes an application', async () => {
    const created = await alice.post<App>('/api/applications', {
      company: 'Acme',
      role: 'Staff Engineer',
      url: 'careers.acme.example/42',
      salaryMin: 90000,
      salaryMax: 110000,
      workMode: 'hybrid',
      status: 'applied',
    })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ company: 'Acme', status: 'applied', url: 'https://careers.acme.example/42' })

    const read = await alice.get<App>(`/api/applications/${created.body.id}`)
    expect(read.status).toBe(200)
    expect(read.body.events?.map(e => e.kind)).toEqual(['status_change'])

    const patched = await alice.patch<App>(`/api/applications/${created.body.id}`, { status: 'interview', notes: 'Recruiter call went well' })
    expect(patched.status).toBe(200)
    expect(patched.body.status).toBe('interview')

    const list = await alice.get<App[]>('/api/applications?q=acme')
    expect(list.body.map(a => a.id)).toContain(created.body.id)

    expect((await alice.delete(`/api/applications/${created.body.id}`)).status).toBe(204)
    expect((await alice.get(`/api/applications/${created.body.id}`)).status).toBe(404)
  })

  it('answers 400 with field issues for invalid input', async () => {
    const res = await alice.post<{ data: { issues: { path: string }[] } }>('/api/applications', {
      company: '',
      role: 'x',
      salaryMin: 5,
      salaryMax: 1,
      status: 'ghosted',
    })
    expect(res.status).toBe(400)
    expect(res.body.data.issues.map(i => i.path)).toEqual(expect.arrayContaining(['company', 'status']))
  })

  it('answers 404 rather than 500 for malformed ids', async () => {
    expect((await alice.get('/api/applications/not-a-uuid')).status).toBe(404)
  })

  it('manages timeline events and lists them as reminders', async () => {
    const app = (await alice.post<App>('/api/applications', { company: 'Globex', role: 'SRE', status: 'applied' })).body
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    const event = await alice.post<{ id: string }>(`/api/applications/${app.id}/events`, {
      kind: 'interview',
      title: 'Panel interview',
      occursAt: soon,
    })
    expect(event.status).toBe(201)

    const reminders = await alice.get<{ title: string }[]>('/api/reminders')
    expect(reminders.body.map(r => r.title)).toContain('Panel interview')

    expect((await alice.patch(`/api/events/${event.body.id}`, { done: true })).status).toBe(200)
    expect((await alice.get<{ title: string }[]>('/api/reminders')).body.map(r => r.title)).not.toContain('Panel interview')
  })

  it('moves cards between columns', async () => {
    const app = (await alice.post<App>('/api/applications', { company: 'Umbrella', role: 'Dev', status: 'applied' })).body
    const moved = await alice.post<App>(`/api/applications/${app.id}/move`, { status: 'offer', position: 0 })
    expect(moved.status).toBe(200)
    expect(moved.body).toMatchObject({ status: 'offer', position: 0 })
  })
})

describe('data isolation between users', () => {
  let alice: Agent
  let bob: Agent
  let aliceApp: App
  let aliceEventId: string

  beforeAll(async () => {
    alice = (await registeredAgent('Alice')).agent
    bob = (await registeredAgent('Bob')).agent
    aliceApp = (await alice.post<App>('/api/applications', { company: 'Secret Corp', role: 'CTO', status: 'interview' })).body
    aliceEventId = (await alice.post<{ id: string }>(`/api/applications/${aliceApp.id}/events`, {
      kind: 'interview',
      title: 'Final round',
      occursAt: new Date(Date.now() + 86_400_000).toISOString(),
    })).body.id
  })

  it('does not list or search another user\'s applications', async () => {
    expect((await bob.get<App[]>('/api/applications')).body).toEqual([])
    expect((await bob.get<App[]>('/api/applications?q=secret')).body).toEqual([])
    expect((await bob.get<unknown[]>('/api/reminders')).body).toEqual([])
  })

  it('cannot read, modify, move or delete another user\'s application', async () => {
    const path = `/api/applications/${aliceApp.id}`
    expect((await bob.get(path)).status).toBe(404)
    expect((await bob.patch(path, { company: 'Pwned' })).status).toBe(404)
    expect((await bob.post(`${path}/move`, { status: 'rejected', position: 0 })).status).toBe(404)
    expect((await bob.delete(path)).status).toBe(404)
  })

  it('cannot add, edit or delete events on another user\'s application', async () => {
    expect((await bob.post(`/api/applications/${aliceApp.id}/events`, {
      kind: 'note',
      title: 'Injected',
      occursAt: new Date().toISOString(),
    })).status).toBe(404)
    expect((await bob.patch(`/api/events/${aliceEventId}`, { title: 'Changed' })).status).toBe(404)
    expect((await bob.delete(`/api/events/${aliceEventId}`)).status).toBe(404)
  })

  it('leaves the owner\'s data untouched', async () => {
    const res = await alice.get<App>(`/api/applications/${aliceApp.id}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ company: 'Secret Corp', status: 'interview' })
    expect(res.body.events?.map(e => e.kind).sort()).toEqual(['interview', 'status_change'])
  })
})
