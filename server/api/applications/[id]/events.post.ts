import { eventCreateSchema, idSchema } from '#shared/schemas'
import { createEvent } from '../../../lib/events'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = readParamWith(event, 'id', idSchema)
  const input = await readBodyWith(event, eventCreateSchema)
  const created = await createEvent(await useDb(), user.id, id, input).catch(rethrowAsHttp)
  setResponseStatus(event, 201)
  return created
})
