import { registerSchema } from '#shared/schemas'
import { createUser, EmailTakenError } from '../../lib/users'

export default defineEventHandler(async (event) => {
  const input = await readBodyWith(event, registerSchema)
  const db = await useDb()

  try {
    const user = await createUser(db, {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    })
    await startSession(event, user)
    setResponseStatus(event, 201)
    return { user: { id: user.id, name: user.name, email: user.email } }
  }
  catch (error) {
    if (error instanceof EmailTakenError) {
      throw createError({ statusCode: 409, statusMessage: error.message })
    }
    throw error
  }
})
