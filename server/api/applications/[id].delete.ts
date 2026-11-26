import { idSchema } from '#shared/schemas'
import { deleteApplication } from '../../lib/applications'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = readParamWith(event, 'id', idSchema)
  await deleteApplication(await useDb(), user.id, id).catch(rethrowAsHttp)
  setResponseStatus(event, 204)
  return null
})
