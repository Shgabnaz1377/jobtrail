import { applicationListQuerySchema } from '#shared/schemas'
import { listApplications } from '../../lib/applications'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = readQueryWith(event, applicationListQuerySchema)
  return listApplications(await useDb(), user.id, query)
})
