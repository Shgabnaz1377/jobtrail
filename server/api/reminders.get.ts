import { remindersQuerySchema } from '#shared/schemas'
import { listReminders } from '../lib/events'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { days } = readQueryWith(event, remindersQuerySchema)
  return listReminders(await useDb(), user.id, { days })
})
