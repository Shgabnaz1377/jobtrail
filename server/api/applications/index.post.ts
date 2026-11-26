import { applicationCreateSchema } from '#shared/schemas'
import { createApplication } from '../../lib/applications'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = await readBodyWith(event, applicationCreateSchema)
  const application = await createApplication(await useDb(), user.id, input)
  setResponseStatus(event, 201)
  return application
})
