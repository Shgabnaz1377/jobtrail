import { idSchema } from '#shared/schemas'
import { getApplication } from '../../lib/applications'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = readParamWith(event, 'id', idSchema)
  return getApplication(await useDb(), user.id, id).catch(rethrowAsHttp)
})
