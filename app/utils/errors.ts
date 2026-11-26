export interface FieldIssue {
  path: string
  message: string
}

export interface ApiErrorInfo {
  message: string
  fields: Record<string, string>
}

interface ErrorLike {
  statusMessage?: string
  message?: string
  data?: { statusMessage?: string, message?: string, data?: { issues?: FieldIssue[] } }
}

/** Turns an $fetch error into a message plus per-field messages from the zod issue list. */
export function describeApiError(error: unknown, fallback = 'Something went wrong'): ApiErrorInfo {
  const err = (error ?? {}) as ErrorLike
  const fields: Record<string, string> = {}
  for (const issue of err.data?.data?.issues ?? []) {
    if (issue.path && !fields[issue.path]) fields[issue.path] = issue.message
  }
  const message = err.data?.statusMessage || err.data?.message || err.statusMessage || fallback
  return { message, fields }
}
