import { randomUUID } from 'node:crypto'
import { cleanupDemoAccounts, createDemoAccount } from '../../lib/demo'

export default defineEventHandler(async (event) => {
  const db = await useDb()
  // Opportunistic cleanup so expired demos also disappear without the cron.
  await cleanupDemoAccounts(db)
  // A random secret nobody knows: demo accounts can only be entered via this route.
  const user = await createDemoAccount(db, await hashPassword(randomUUID()))
  await startSession(event, user)
  setResponseStatus(event, 201)
  return { user: { id: user.id, name: user.name } }
})
