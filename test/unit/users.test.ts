import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { DatabaseHandle } from '../../server/db/client'
import { createUser, EmailTakenError, findUserByEmail, toPublicUser } from '../../server/lib/users'
import { createTestDatabase } from './helpers/db'

let handle: DatabaseHandle

beforeAll(async () => {
  handle = await createTestDatabase()
})

afterAll(async () => {
  await handle.close()
})

describe('users', () => {
  it('stores emails lower-cased and finds them case-insensitively', async () => {
    const user = await createUser(handle.db, { name: 'Lin', email: 'Lin@Example.COM', passwordHash: 'h' })
    expect(user.email).toBe('lin@example.com')
    expect((await findUserByEmail(handle.db, 'LIN@example.com'))?.id).toBe(user.id)
  })

  it('throws EmailTakenError on a duplicate', async () => {
    await expect(createUser(handle.db, { name: 'Lin 2', email: 'lin@example.com', passwordHash: 'h' }))
      .rejects.toBeInstanceOf(EmailTakenError)
  })

  it('never exposes the password hash', async () => {
    const user = await createUser(handle.db, { name: 'Sam', email: 'sam@example.com', passwordHash: 'secret-hash' })
    expect(toPublicUser(user)).not.toHaveProperty('passwordHash')
  })
})
