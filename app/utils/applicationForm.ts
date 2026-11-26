import type { ApplicationFormValues } from '~/components/ApplicationForm.vue'
import type { Currency, Status, WorkMode } from '#shared/constants'

interface StoredApplication {
  company: string
  role: string
  url: string | null
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  location: string | null
  workMode: WorkMode
  status: Status
  appliedOn: string | null
  notes: string | null
}

/** Converts a stored application into the string-based values the form edits. */
export function toFormValues(app: StoredApplication): ApplicationFormValues {
  return {
    company: app.company,
    role: app.role,
    url: app.url ?? '',
    salaryMin: app.salaryMin?.toString() ?? '',
    salaryMax: app.salaryMax?.toString() ?? '',
    currency: app.currency as Currency,
    location: app.location ?? '',
    workMode: app.workMode,
    status: app.status,
    appliedOn: app.appliedOn ?? '',
    notes: app.notes ?? '',
  }
}
