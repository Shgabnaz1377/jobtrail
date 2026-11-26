export const STATUSES = ['wishlist', 'applied', 'interview', 'offer', 'rejected'] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<Status, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

export const WORK_MODES = ['onsite', 'hybrid', 'remote'] as const
export type WorkMode = (typeof WORK_MODES)[number]

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
}

/** Events that live on an application's timeline. */
export const EVENT_KINDS = ['status_change', 'interview', 'follow_up', 'note'] as const
export type EventKind = (typeof EVENT_KINDS)[number]

/** Event kinds a user creates by hand (status changes are recorded automatically). */
export const MANUAL_EVENT_KINDS = ['interview', 'follow_up', 'note'] as const
export type ManualEventKind = (typeof MANUAL_EVENT_KINDS)[number]

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  status_change: 'Status change',
  interview: 'Interview',
  follow_up: 'Follow-up',
  note: 'Note',
}

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD'] as const
export type Currency = (typeof CURRENCIES)[number]

/** Demo accounts are removed this long after creation. */
export const DEMO_TTL_HOURS = 24
