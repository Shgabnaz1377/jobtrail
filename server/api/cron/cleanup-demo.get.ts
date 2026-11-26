import { timingSafeEqual } from 'node:crypto'
import { cleanupDemoAccounts } from '../../lib/demo'

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * Deletes demo accounts older than 24 hours. Vercel Cron calls this with
 * `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set on the project.
 */
export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    throw createError({ statusCode: 503, statusMessage: 'CRON_SECRET is not configured' })
  }
  const header = getRequestHeader(event, 'authorization') ?? ''
  if (!safeEqual(header, `Bearer ${secret}`)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const deleted = await cleanupDemoAccounts(await useDb())
  return { deleted }
})
