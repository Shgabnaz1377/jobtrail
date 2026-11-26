import { loadStats } from '../lib/stats'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return loadStats(await useDb(), user.id)
})
