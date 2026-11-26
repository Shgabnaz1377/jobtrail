<script setup lang="ts">
import { CURRENCIES, STATUSES, STATUS_LABELS, WORK_MODES, WORK_MODE_LABELS } from '#shared/constants'
import type { Currency, Status, WorkMode } from '#shared/constants'
import { applicationCreateSchema } from '#shared/schemas'
import type { ApplicationCreateInput } from '#shared/schemas'

export interface ApplicationFormValues {
  company: string
  role: string
  url: string
  salaryMin: string
  salaryMax: string
  currency: Currency
  location: string
  workMode: WorkMode
  status: Status
  appliedOn: string
  notes: string
}

const props = withDefaults(defineProps<{
  initial?: Partial<ApplicationFormValues>
  submitLabel?: string
  pending?: boolean
  serverError?: ApiErrorInfo | null
}>(), {
  initial: () => ({}),
  submitLabel: 'Save',
  pending: false,
  serverError: null,
})

const emit = defineEmits<{
  submit: [values: ApplicationCreateInput]
  cancel: []
}>()

const form = reactive<ApplicationFormValues>({
  company: '',
  role: '',
  url: '',
  salaryMin: '',
  salaryMax: '',
  currency: 'EUR',
  location: '',
  workMode: 'onsite',
  status: 'wishlist',
  appliedOn: '',
  notes: '',
  ...props.initial,
})

const clientErrors = ref<Record<string, string>>({})
const errors = computed(() => ({ ...props.serverError?.fields, ...clientErrors.value }))

function submit() {
  const result = applicationCreateSchema.safeParse(form)
  if (!result.success) {
    const next: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.')
      if (!next[key]) next[key] = issue.message
    }
    clientErrors.value = next
    return
  }
  clientErrors.value = {}
  emit('submit', result.data)
}

const id = useId()
const fieldId = (name: string) => `${id}-${name}`
</script>

<template>
  <form
    class="card"
    novalidate
    @submit.prevent="submit"
  >
    <p
      v-if="serverError && !Object.keys(serverError.fields).length"
      class="alert"
      role="alert"
    >
      {{ serverError.message }}
    </p>

    <div class="form-grid">
      <div class="field">
        <label :for="fieldId('company')">Company *</label>
        <input
          :id="fieldId('company')"
          v-model="form.company"
          class="input"
          name="company"
          required
          :aria-invalid="!!errors.company"
        >
        <span
          v-if="errors.company"
          class="field-error"
        >{{ errors.company }}</span>
      </div>

      <div class="field">
        <label :for="fieldId('role')">Role *</label>
        <input
          :id="fieldId('role')"
          v-model="form.role"
          class="input"
          name="role"
          required
          :aria-invalid="!!errors.role"
        >
        <span
          v-if="errors.role"
          class="field-error"
        >{{ errors.role }}</span>
      </div>

      <div class="field span-2">
        <label :for="fieldId('url')">Job posting link</label>
        <input
          :id="fieldId('url')"
          v-model="form.url"
          class="input"
          name="url"
          inputmode="url"
          placeholder="https://"
          :aria-invalid="!!errors.url"
        >
        <span
          v-if="errors.url"
          class="field-error"
        >{{ errors.url }}</span>
      </div>

      <div class="field">
        <label :for="fieldId('status')">Stage</label>
        <select
          :id="fieldId('status')"
          v-model="form.status"
          class="select"
          name="status"
        >
          <option
            v-for="status in STATUSES"
            :key="status"
            :value="status"
          >
            {{ STATUS_LABELS[status] }}
          </option>
        </select>
      </div>

      <div class="field">
        <label :for="fieldId('appliedOn')">Applied on</label>
        <input
          :id="fieldId('appliedOn')"
          v-model="form.appliedOn"
          class="input"
          type="date"
          name="appliedOn"
          :aria-invalid="!!errors.appliedOn"
        >
        <span
          v-if="errors.appliedOn"
          class="field-error"
        >{{ errors.appliedOn }}</span>
      </div>

      <div class="field">
        <label :for="fieldId('location')">Location</label>
        <input
          :id="fieldId('location')"
          v-model="form.location"
          class="input"
          name="location"
          placeholder="City, country"
        >
      </div>

      <div class="field">
        <label :for="fieldId('workMode')">Work mode</label>
        <select
          :id="fieldId('workMode')"
          v-model="form.workMode"
          class="select"
          name="workMode"
        >
          <option
            v-for="mode in WORK_MODES"
            :key="mode"
            :value="mode"
          >
            {{ WORK_MODE_LABELS[mode] }}
          </option>
        </select>
      </div>

      <fieldset class="field span-2 salary">
        <legend class="label">
          Salary range (per year)
        </legend>
        <div class="salary-inputs">
          <input
            :id="fieldId('salaryMin')"
            v-model="form.salaryMin"
            class="input"
            name="salaryMin"
            inputmode="numeric"
            placeholder="Min"
            aria-label="Minimum salary"
            :aria-invalid="!!errors.salaryMin"
          >
          <span aria-hidden="true">–</span>
          <input
            :id="fieldId('salaryMax')"
            v-model="form.salaryMax"
            class="input"
            name="salaryMax"
            inputmode="numeric"
            placeholder="Max"
            aria-label="Maximum salary"
            :aria-invalid="!!errors.salaryMax"
          >
          <select
            v-model="form.currency"
            class="select currency"
            name="currency"
            aria-label="Currency"
          >
            <option
              v-for="currency in CURRENCIES"
              :key="currency"
              :value="currency"
            >
              {{ currency }}
            </option>
          </select>
        </div>
        <span
          v-if="errors.salaryMin || errors.salaryMax"
          class="field-error"
        >{{ errors.salaryMin || errors.salaryMax }}</span>
      </fieldset>

      <div class="field span-2">
        <label :for="fieldId('notes')">Notes</label>
        <textarea
          :id="fieldId('notes')"
          v-model="form.notes"
          class="textarea"
          name="notes"
          placeholder="Contacts, tech stack, why you are excited…"
        />
      </div>
    </div>

    <div class="row actions">
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="pending"
      >
        {{ pending ? 'Saving…' : submitLabel }}
      </button>
      <button
        type="button"
        class="btn btn-ghost"
        @click="emit('cancel')"
      >
        Cancel
      </button>
    </div>
  </form>
</template>

<style scoped>
.salary {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}

.salary-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) 6rem;
  align-items: center;
  gap: 0.5rem;
}

.actions {
  margin-top: 1.25rem;
}
</style>
