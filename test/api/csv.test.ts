import { describe, expect, it } from 'vitest'
import { createAgent, registeredAgent, setupServer } from './helpers'

await setupServer()

describe('CSV API', () => {
  it('requires a session', async () => {
    expect((await createAgent().get('/api/csv/export')).status).toBe(401)
    expect((await createAgent().post('/api/csv/import', 'company,role\nA,B\n')).status).toBe(401)
  })

  it('imports a file and exports it again as a download', async () => {
    const { agent } = await registeredAgent()
    const imported = await agent.post<{ imported: number }>(
      '/api/csv/import',
      'company,role,status,location\nAcme,Engineer,applied,Berlin\n"Globex, Inc",Designer,Wishlist,\n',
    )
    expect(imported.status).toBe(200)
    expect(imported.body.imported).toBe(2)

    const exported = await agent.get<string>('/api/csv/export')
    expect(exported.status).toBe(200)
    expect(exported.headers.get('content-type')).toContain('text/csv')
    expect(exported.headers.get('content-disposition')).toMatch(/attachment; filename="jobtrail-applications-\d{4}-\d{2}-\d{2}\.csv"/)
    expect(exported.body.split('\r\n')[0]).toBe('company,role,status,url,location,work_mode,salary_min,salary_max,currency,applied_on,notes,created_at')
    expect(exported.body).toContain('"Globex, Inc",Designer,wishlist')
  })

  it('imports nothing when any row is invalid and says which lines are wrong', async () => {
    const { agent } = await registeredAgent()
    const res = await agent.post<{ data: { issues: { line: number }[] } }>(
      '/api/csv/import',
      'company,role,salary_min,salary_max\nGood,Row,1,2\nBad,Row,9,1\n',
    )
    expect(res.status).toBe(422)
    expect(res.body.data.issues.map(issue => issue.line)).toEqual([3])
    expect((await agent.get<unknown[]>('/api/applications')).body).toEqual([])
  })

  it('never exports another user\'s data', async () => {
    const alice = (await registeredAgent('Alice')).agent
    const bob = (await registeredAgent('Bob')).agent
    await alice.post('/api/applications', { company: 'Alice Secret Co', role: 'CTO' })
    const exported = await bob.get<string>('/api/csv/export')
    expect(exported.body).not.toContain('Alice Secret Co')
  })
})
