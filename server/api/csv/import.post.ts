import { importApplications, parseApplicationsCsv } from '../../lib/csv'

const MAX_BYTES = 1024 * 1024

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const length = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (length > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'CSV files can be at most 1 MB' })
  }
  const text = await readRawBody(event, 'utf8')
  if (!text) throw createError({ statusCode: 400, statusMessage: 'Send the CSV file as the request body' })
  if (Buffer.byteLength(text) > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'CSV files can be at most 1 MB' })
  }

  const result = parseApplicationsCsv(text)
  if (!result.ok) {
    // Nothing is imported unless every row is valid, so a fixed file can simply be re-uploaded.
    throw createError({
      statusCode: 422,
      statusMessage: 'The file has problems; nothing was imported',
      data: { issues: result.issues.slice(0, 50), total: result.issues.length },
    })
  }

  const imported = await importApplications(await useDb(), user.id, result.rows)
  return { imported }
})
