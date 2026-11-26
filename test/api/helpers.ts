import { fileURLToPath } from 'node:url'
import { beforeAll } from 'vitest'
import { setup, url } from '@nuxt/test-utils/e2e'

export const CRON_SECRET = 'test-cron-secret'

// The test-utils context is only reachable from the top-level suite, so the
// server's address is captured once and reused by nested describe blocks.
let baseUrl = ''

/** Builds the app once per test file and serves it against an in-memory PGlite database. */
export async function setupServer() {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    server: true,
    browser: false,
    setupTimeout: 240_000,
    env: {
      NUXT_SESSION_PASSWORD: 'test-session-password-that-is-at-least-32-chars',
      PGLITE_DATA_DIR: 'memory://',
      CRON_SECRET,
    },
  })
  beforeAll(() => {
    baseUrl = url('/')
  })
}

export interface ApiResponse<T = unknown> {
  status: number
  body: T
  headers: Headers
}

/**
 * A tiny HTTP client that keeps its own session cookie, so one test can act
 * as several signed-in users at once.
 */
export function createAgent() {
  let cookie = ''

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<ApiResponse<T>> {
    const isText = typeof body === 'string'
    const response = await fetch(new URL(path, baseUrl), {
      method,
      redirect: 'manual',
      headers: {
        ...(body === undefined ? {} : { 'content-type': isText ? 'text/csv' : 'application/json' }),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isText ? body : JSON.stringify(body),
    })
    for (const entry of response.headers.getSetCookie()) {
      const [pair] = entry.split(';')
      if (pair?.startsWith('nuxt-session=')) cookie = pair
    }
    const contentType = response.headers.get('content-type') ?? ''
    const parsed = contentType.includes('application/json') ? await response.json() : await response.text()
    return { status: response.status, body: parsed as T, headers: response.headers }
  }

  return {
    get: <T = unknown>(path: string, headers?: Record<string, string>) =>
      request<T>('GET', path, undefined, headers),
    post: <T = unknown>(path: string, body?: unknown, headers?: Record<string, string>) =>
      request<T>('POST', path, body ?? {}, headers),
    patch: <T = unknown>(path: string, body: unknown) => request<T>('PATCH', path, body),
    delete: <T = unknown>(path: string) => request<T>('DELETE', path),
    get cookie() {
      return cookie
    },
  }
}

export type Agent = ReturnType<typeof createAgent>

let counter = 0

/** Registers a fresh user and returns an agent signed in as them. */
export async function registeredAgent(name = 'Test User') {
  const agent = createAgent()
  counter += 1
  const email = `user${Date.now()}-${counter}@example.com`
  const res = await agent.post<{ user: { id: string } }>('/api/auth/register', {
    name,
    email,
    password: 'correct horse battery',
  })
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`)
  return { agent, email, id: res.body.user.id }
}
