import { idSchema } from '#shared/schemas'
import { deleteEvent } from '../../lib/events'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = readParamWith(event, 'id', idSchema)
  await deleteEvent(await useDb(), user.id, id).catch(rethrowAsHttp)
  setResponseStatus(event, 204)
  return null
})
