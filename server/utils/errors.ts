import { InvalidInputError, NotFoundError } from '../lib/applications'
import { ReadOnlyEventError } from '../lib/events'

/** Maps domain errors from server/lib to HTTP errors; anything else is rethrown untouched. */
export function rethrowAsHttp(error: unknown): never {
  if (error instanceof NotFoundError) {
    throw createError({ statusCode: 404, statusMessage: error.message })
  }
  if (error instanceof InvalidInputError) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: { issues: [{ path: error.path, message: error.message }] },
    })
  }
  if (error instanceof ReadOnlyEventError) {
    throw createError({ statusCode: 409, statusMessage: error.message })
  }
  throw error
}
