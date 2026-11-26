<script setup lang="ts">
import { STATUSES, STATUS_LABELS, WORK_MODE_LABELS } from '#shared/constants'
import type { Status } from '#shared/constants'

const route = useRoute()
const id = String(route.params.id)

const { data: app, error: loadError, refresh } = await useFetch(`/api/applications/${id}`)
if (loadError.value) {
  throw createError({ statusCode: loadError.value.statusCode ?? 404, statusMessage: 'Application not found', fatal: true })
}

useHead({ title: () => app.value?.company ?? 'Application' })

const salary = computed(() => (app.value ? formatSalary(app.value.salaryMin, app.value.salaryMax, app.value.currency) : ''))

const changingStatus = ref(false)
async function changeStatus(status: Status) {
  if (!app.value || status === app.value.status) return
  changingStatus.value = true
  try {
    await $fetch(`/api/applications/${id}`, { method: 'PATCH', body: { status } })
    await refresh()
  }
  finally {
    changingStatus.value = false
  }
}

async function remove() {
  if (!app.value || !confirm(`Delete the application at ${app.value.company}? This cannot be undone.`)) return
  await $fetch(`/api/applications/${id}`, { method: 'DELETE' })
  await navigateTo('/applications')
}
</script>

<template>
  <div
    v-if="app"
    class="container detail"
  >
    <NuxtLink
      to="/applications"
      class="back muted small"
    >
      ← All applications
    </NuxtLink>

    <header class="page-header">
      <div>
        <h1>{{ app.company }}</h1>
        <p class="role">
          {{ app.role }}
        </p>
      </div>
      <div class="row">
        <NuxtLink
          :to="`/applications/${id}/edit`"
          class="btn"
        >
          Edit
        </NuxtLink>
        <button
          type="button"
          class="btn btn-danger"
          @click="remove"
        >
          Delete
        </button>
      </div>
    </header>

    <div class="detail-grid">
      <section
        class="card facts"
        aria-label="Details"
      >
        <div class="field">
          <label for="detail-status">Stage</label>
          <select
            id="detail-status"
            class="select"
            :value="app.status"
            :disabled="changingStatus"
            @change="changeStatus(($event.target as HTMLSelectElement).value as Status)"
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

        <dl>
          <div>
            <dt>Location</dt>
            <dd>{{ app.location || '—' }} · {{ WORK_MODE_LABELS[app.workMode] }}</dd>
          </div>
          <div>
            <dt>Salary</dt>
            <dd>{{ salary || '—' }}</dd>
          </div>
          <div>
            <dt>Applied</dt>
            <dd>{{ app.appliedOn ? formatDay(app.appliedOn) : 'Not yet' }}</dd>
          </div>
          <div v-if="app.url">
            <dt>Posting</dt>
            <dd>
              <a
                :href="app.url"
                target="_blank"
                rel="noopener noreferrer"
              >{{ linkHost(app.url) }} ↗</a>
            </dd>
          </div>
        </dl>

        <div v-if="app.notes">
          <h2 class="label">
            Notes
          </h2>
          <p class="notes">
            {{ app.notes }}
          </p>
        </div>
      </section>

      <ApplicationTimeline
        :application-id="id"
        :events="app.events"
        @changed="refresh()"
      />
    </div>
  </div>
</template>

<style scoped>
.back {
  display: inline-block;
  margin-bottom: 0.75rem;
  text-decoration: none;
}

.role {
  color: var(--text-muted);
  font-size: 1.05rem;
  margin: 0.25rem 0 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

@media (width <= 820px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

.facts {
  display: grid;
  gap: 1.1rem;
}

dl {
  display: grid;
  gap: 0.75rem;
  margin: 0;
}

dt {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

dd {
  margin: 0;
}

.notes {
  white-space: pre-line;
  margin: 0.25rem 0 0;
}
</style>
