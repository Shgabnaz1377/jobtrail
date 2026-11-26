import { randomUUID } from 'node:crypto'
import { loginSchema } from '#shared/schemas'
import { findUserByEmail } from '../../lib/users'

// Hash of a random secret, verified when the email is unknown so that response
// time does not reveal which emails have accounts.
let dummyHash: Promise<string> | undefined

export default defineEventHandler(async (event) => {
  const input = await readBodyWith(event, loginSchema)
  const db = await useDb()

  const user = await findUserByEmail(db, input.email)
  dummyHash ??= hashPassword(randomUUID())
  const valid = await verifyPassword(user?.passwordHash ?? (await dummyHash), input.password)
  // Demo accounts have no usable password; they are only entered through /api/auth/demo.
  if (!user || !valid || user.isDemo) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  await startSession(event, user)
  return { user: { id: user.id, name: user.name, email: user.email } }
})
