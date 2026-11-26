import { exportApplicationsCsv } from '../../lib/csv'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const csv = await exportApplicationsCsv(await useDb(), user.id)
  const date = new Date().toISOString().slice(0, 10)
  setResponseHeaders(event, {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename="jobtrail-applications-${date}.csv"`,
    'cache-control': 'no-store',
  })
  return csv
})
