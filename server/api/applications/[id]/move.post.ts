import { idSchema, moveSchema } from '#shared/schemas'
import { moveApplication } from '../../../lib/applications'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = readParamWith(event, 'id', idSchema)
  const { status, position } = await readBodyWith(event, moveSchema)
  return moveApplication(await useDb(), user.id, id, status, position).catch(rethrowAsHttp)
})
