const compact = new Map<string, Intl.NumberFormat>()

function moneyFormat(currency: string) {
  let format = compact.get(currency)
  if (!format) {
    format = new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    })
    compact.set(currency, format)
  }
  return format
}

/** "€65K–€80K", "from €65K", "up to €80K" or "" when no salary is known. */
export function formatSalary(min: number | null | undefined, max: number | null | undefined, currency = 'EUR'): string {
  const fmt = moneyFormat(currency)
  if (min != null && max != null) return min === max ? fmt.format(min) : `${fmt.format(min)}–${fmt.format(max)}`
  if (min != null) return `from ${fmt.format(min)}`
  if (max != null) return `up to ${fmt.format(max)}`
  return ''
}

const dateFormat = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const dateTimeFormats = new Map<string, Intl.DateTimeFormat>()

/** Formats a calendar date ("2026-03-04") without shifting it by the local time zone. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return ''
  return dateFormat.format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

/** "Thu, 27 Nov, 09:30" in `timeZone`, or in the runtime's own zone when it is omitted. */
export function formatDateTime(value: string | Date, timeZone?: string): string {
  const key = timeZone ?? ''
  let format = dateTimeFormats.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat('en', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    })
    dateTimeFormats.set(key, format)
  }
  return format.format(new Date(value))
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "in 3 days", "tomorrow", "2 hours ago". */
export function formatRelative(value: string | Date, now = new Date()): string {
  const diff = new Date(value).getTime() - now.getTime()
  const minutes = Math.round(diff / 60_000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour')
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) return relative.format(days, 'day')
  return relative.format(Math.round(days / 30), 'month')
}

/** Value for an `<input type="datetime-local">` in the browser's time zone. */
export function toDateTimeLocal(value: string | Date): string {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

/** Host name of a job posting link, for compact display. */
export function linkHost(url: string | null | undefined): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  catch {
    return url
  }
}

const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 })

/** 0.4 -> "40%"; null (no data to divide by) -> "–". */
export function formatPercent(value: number | null | undefined): string {
  return value == null ? '–' : percent.format(value)
}
