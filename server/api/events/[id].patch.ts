import { eventUpdateSchema, idSchema } from '#shared/schemas'
import { updateEvent } from '../../lib/events'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = readParamWith(event, 'id', idSchema)
  const patch = await readBodyWith(event, eventUpdateSchema)
  return updateEvent(await useDb(), user.id, id, patch).catch(rethrowAsHttp)
})
