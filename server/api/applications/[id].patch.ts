import { applicationUpdateSchema, idSchema } from '#shared/schemas'
import { updateApplication } from '../../lib/applications'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = readParamWith(event, 'id', idSchema)
  const patch = await readBodyWith(event, applicationUpdateSchema)
  return updateApplication(await useDb(), user.id, id, patch).catch(rethrowAsHttp)
})
