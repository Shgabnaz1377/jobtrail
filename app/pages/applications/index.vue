<script setup lang="ts">
import { STATUSES, STATUS_LABELS, WORK_MODES, WORK_MODE_LABELS } from '#shared/constants'
import type { Status, WorkMode } from '#shared/constants'
import { APPLICATION_SORTS } from '#shared/schemas'

useHead({ title: 'Applications' })

const route = useRoute()
const router = useRouter()

const asList = <T extends string>(value: unknown, allowed: readonly T[]): T[] =>
  String(value ?? '')
    .split(',')
    .filter((item): item is T => (allowed as readonly string[]).includes(item))

const search = ref(String(route.query.q ?? ''))
const statuses = ref<Status[]>(asList(route.query.status, STATUSES))
const workMode = ref<WorkMode | ''>(asList(route.query.workMode, WORK_MODES)[0] ?? '')
const sort = ref<(typeof APPLICATION_SORTS)[number]>(
  asList(route.query.sort, APPLICATION_SORTS)[0] ?? 'updated',
)

// Debounce typing so every keystroke does not hit the API.
const debouncedSearch = ref(search.value)
let timer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => (debouncedSearch.value = value.trim()), 250)
})

const query = computed(() => ({
  q: debouncedSearch.value || undefined,
  status: statuses.value.length ? statuses.value.join(',') : undefined,
  workMode: workMode.value || undefined,
  sort: sort.value === 'updated' ? undefined : sort.value,
}))

// Keep filters in the URL so they survive reloads and can be shared.
watch(query, value => router.replace({ query: value }))

const { data: applications, status: fetchStatus, refresh } = await useFetch('/api/applications', { query })

function toggleStatus(status: Status) {
  statuses.value = statuses.value.includes(status)
    ? statuses.value.filter(item => item !== status)
    : [...statuses.value, status]
}

const hasFilters = computed(() => !!(debouncedSearch.value || statuses.value.length || workMode.value))

function clearFilters() {
  search.value = ''
  debouncedSearch.value = ''
  statuses.value = []
  workMode.value = ''
}

const SORT_LABELS: Record<(typeof APPLICATION_SORTS)[number], string> = {
  updated: 'Recently updated',
  created: 'Recently added',
  company: 'Company A–Z',
  applied: 'Date applied',
}
</script>

<template>
  <div class="container">
    <header class="page-header">
      <h1>Applications</h1>
      <div class="row header-actions">
        <CsvTools @imported="refresh()" />
        <NuxtLink
          to="/applications/new"
          class="btn btn-primary"
        >
          Add application
        </NuxtLink>
      </div>
    </header>

    <section
      class="card filters"
      aria-label="Search and filters"
    >
      <div class="filter-row">
        <div class="field search">
          <label for="search">Search</label>
          <input
            id="search"
            v-model="search"
            class="input"
            type="search"
            placeholder="Company, role, location or notes"
          >
        </div>
        <div class="field">
          <label for="work-mode">Work mode</label>
          <select
            id="work-mode"
            v-model="workMode"
            class="select"
          >
            <option value="">
              Any
            </option>
            <option
              v-for="mode in WORK_MODES"
              :key="mode"
              :value="mode"
            >
              {{ WORK_MODE_LABELS[mode] }}
            </option>
          </select>
        </div>
        <div class="field">
          <label for="sort">Sort by</label>
          <select
            id="sort"
            v-model="sort"
            class="select"
          >
            <option
              v-for="option in APPLICATION_SORTS"
              :key="option"
              :value="option"
            >
              {{ SORT_LABELS[option] }}
            </option>
          </select>
        </div>
      </div>

      <div
        class="row status-filters"
        role="group"
        aria-label="Filter by stage"
      >
        <button
          v-for="status in STATUSES"
          :key="status"
          type="button"
          class="chip"
          :class="`chip-${status}`"
          :aria-pressed="statuses.includes(status)"
          @click="toggleStatus(status)"
        >
          {{ STATUS_LABELS[status] }}
        </button>
        <button
          v-if="hasFilters"
          type="button"
          class="btn btn-ghost btn-sm"
          @click="clearFilters"
        >
          Clear filters
        </button>
      </div>
    </section>

    <p
      class="sr-only"
      aria-live="polite"
    >
      {{ fetchStatus === 'pending' ? 'Loading' : `${applications?.length ?? 0} applications` }}
    </p>

    <div
      v-if="applications && applications.length === 0"
      class="card empty"
    >
      <template v-if="hasFilters">
        No applications match these filters.
      </template>
      <template v-else>
        <p>No applications yet.</p>
        <NuxtLink
          to="/applications/new"
          class="btn btn-primary"
        >
          Add your first application
        </NuxtLink>
      </template>
    </div>

    <ul
      v-else
      class="app-list"
    >
      <li
        v-for="app in applications"
        :key="app.id"
      >
        <NuxtLink
          :to="`/applications/${app.id}`"
          class="card app-row"
        >
          <div class="app-main">
            <span class="app-company">{{ app.company }}</span>
            <span class="app-role">{{ app.role }}</span>
          </div>
          <div class="app-meta muted small">
            <span v-if="app.location">{{ app.location }}</span>
            <span>{{ WORK_MODE_LABELS[app.workMode] }}</span>
            <span v-if="app.salaryMin != null || app.salaryMax != null">
              {{ formatSalary(app.salaryMin, app.salaryMax, app.currency) }}
            </span>
            <span v-if="app.appliedOn">Applied {{ formatDay(app.appliedOn) }}</span>
          </div>
          <StatusBadge :status="app.status" />
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.header-actions {
  align-items: flex-start;
}

.filters {
  display: grid;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.filter-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 11rem 12rem;
  gap: 0.75rem;
}

@media (width <= 720px) {
  .filter-row {
    grid-template-columns: 1fr 1fr;
  }

  .search {
    grid-column: span 2;
  }
}

.chip {
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.chip[aria-pressed='true'] {
  color: var(--text);
  background: color-mix(in srgb, var(--chip-color, var(--accent)) 18%, var(--surface));
  border-color: var(--chip-color, var(--accent));
  box-shadow: inset 0 0 0 1px var(--chip-color, var(--accent));
}

.chip-wishlist { --chip-color: var(--status-wishlist); }
.chip-applied { --chip-color: var(--status-applied); }
.chip-interview { --chip-color: var(--status-interview); }
.chip-offer { --chip-color: var(--status-offer); }
.chip-rejected { --chip-color: var(--status-rejected); }

.app-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}

.app-row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.5fr) auto;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1.1rem;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s;
}

.app-row:hover {
  border-color: var(--accent);
}

.app-main {
  display: grid;
  min-width: 0;
}

.app-company {
  font-weight: 700;
}

.app-role {
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.9rem;
}

@media (width <= 720px) {
  .app-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .app-meta {
    grid-row: 2;
    grid-column: span 2;
  }
}
</style>
