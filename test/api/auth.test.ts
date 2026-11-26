import { describe, expect, it } from 'vitest'
import { createAgent, registeredAgent, setupServer } from './helpers'

await setupServer()

describe('auth API', () => {
  it('registers, reads the session and signs out', async () => {
    const agent = createAgent()
    const register = await agent.post('/api/auth/register', {
      name: 'Ada Lovelace',
      email: 'Ada@Example.com',
      password: 'analytical-engine',
    })
    expect(register.status).toBe(201)
    expect(agent.cookie).toMatch(/^nuxt-session=/)

    const me = await agent.get<{ user: { email: string, name: string } }>('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.user).toMatchObject({ email: 'ada@example.com', name: 'Ada Lovelace' })

    await agent.post('/api/auth/logout')
    expect((await agent.get('/api/auth/me')).status).toBe(401)
  })

  it('signs in with the right password only', async () => {
    const { email } = await registeredAgent()

    const wrong = await createAgent().post('/api/auth/login', { email, password: 'not the password' })
    expect(wrong.status).toBe(401)

    const agent = createAgent()
    const right = await agent.post('/api/auth/login', {
      email: email.toUpperCase(),
      password: 'correct horse battery',
    })
    expect(right.status).toBe(200)
    expect((await agent.get('/api/auth/me')).status).toBe(200)
  })

  it('gives the same answer for unknown emails and wrong passwords', async () => {
    const res = await createAgent().post<{ statusMessage: string }>('/api/auth/login', {
      email: 'nobody@example.com',
      password: 'whatever123',
    })
    expect(res.status).toBe(401)
    expect(res.body.statusMessage).toBe('Invalid email or password')
  })

  it('rejects duplicate emails regardless of case', async () => {
    const { email } = await registeredAgent()
    const res = await createAgent().post('/api/auth/register', {
      name: 'Copy',
      email: email.toUpperCase(),
      password: 'another-password',
    })
    expect(res.status).toBe(409)
  })

  it('validates the registration payload with field-level issues', async () => {
    const res = await createAgent().post<{ data: { issues: { path: string }[] } }>('/api/auth/register', {
      name: '',
      email: 'not-an-email',
      password: 'short',
    })
    expect(res.status).toBe(400)
    expect(res.body.data.issues.map(issue => issue.path).sort()).toEqual(['email', 'name', 'password'])
  })

  it('renders the sign-in page on the server', async () => {
    const res = await createAgent().get<string>('/login')
    expect(res.status).toBe(200)
    expect(res.body).toContain('Welcome back')
  })

  it('redirects anonymous visitors away from private pages', async () => {
    const res = await createAgent().get('/applications')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/login?redirect=/applications')
  })
})
