import type { H3Event } from 'h3'
import type { z } from 'zod'

function toValidationError(error: z.ZodError) {
  return createError({
    statusCode: 400,
    statusMessage: 'Validation failed',
    data: {
      issues: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
    },
  })
}

/** Parses the JSON body with a zod schema, answering 400 with the issue list on failure. */
export async function readBodyWith<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.infer<T>> {
  const body = await readBody(event).catch(() => undefined)
  const result = schema.safeParse(body)
  if (!result.success) throw toValidationError(result.error)
  return result.data
}

export function readQueryWith<T extends z.ZodType>(event: H3Event, schema: T): z.infer<T> {
  const result = schema.safeParse(getQuery(event))
  if (!result.success) throw toValidationError(result.error)
  return result.data
}

export function readParamWith<T extends z.ZodType>(event: H3Event, name: string, schema: T): z.infer<T> {
  const result = schema.safeParse(getRouterParam(event, name))
  if (!result.success) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  return result.data
}
