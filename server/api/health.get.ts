import { sql } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = await useDb()
  await db.execute(sql`select 1`)
  return { ok: true }
})
