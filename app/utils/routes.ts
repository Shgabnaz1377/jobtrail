/** Where signed-in users land. */
export const HOME_ROUTE = '/'

/** Only allow same-origin, path-only redirects (no `//evil.example` or `/\evil.example`). */
export function safeRedirect(value: unknown, fallback = HOME_ROUTE): string {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}
