<script setup lang="ts">
import { EVENT_KIND_LABELS } from '#shared/constants'

const { data: reminders, refresh } = await useFetch('/api/reminders', { query: { days: 14 } })

const busy = ref<string | null>(null)
async function markDone(id: string) {
  busy.value = id
  try {
    await $fetch(`/api/events/${id}`, { method: 'PATCH', body: { done: true } })
    await refresh()
  }
  finally {
    busy.value = null
  }
}
</script>

<template>
  <section
    class="card reminders"
    aria-labelledby="reminders-heading"
  >
    <header class="reminders-header">
      <h2 id="reminders-heading">
        Upcoming
      </h2>
      <span class="muted small">Interviews and follow-ups for the next two weeks</span>
    </header>

    <p
      v-if="!reminders?.length"
      class="muted small none"
    >
      Nothing scheduled. Add interviews and follow-ups from an application's timeline.
    </p>

    <ul
      v-else
      class="reminder-list"
    >
      <li
        v-for="reminder in reminders"
        :key="reminder.id"
        class="reminder"
        :class="{ overdue: reminder.overdue }"
      >
        <div class="when">
          <time :datetime="String(reminder.occursAt)">{{ formatDateTime(reminder.occursAt) }}</time>
          <span
            class="badge"
            :class="reminder.overdue ? 'badge-overdue' : ''"
          >
            {{ reminder.overdue ? 'Overdue' : formatRelative(reminder.occursAt) }}
          </span>
        </div>
        <p class="what">
          <span class="kind">{{ EVENT_KIND_LABELS[reminder.kind] }}:</span>
          {{ reminder.title }}
        </p>
        <div class="reminder-footer">
          <NuxtLink
            :to="`/applications/${reminder.application.id}`"
            class="small"
          >
            {{ reminder.application.company }} · {{ reminder.application.role }}
          </NuxtLink>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            :disabled="busy === reminder.id"
            :aria-label="`Mark ${reminder.title} at ${reminder.application.company} as done`"
            @click="markDone(reminder.id)"
          >
            Done
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.reminders {
  margin-bottom: 1.25rem;
  padding: 1rem 1.1rem;
}

.reminders-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.75rem;
  margin-bottom: 0.75rem;
}

.reminders-header h2 {
  margin: 0;
}

.none {
  margin: 0;
}

.reminder-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 0.6rem;
}

.reminder {
  display: grid;
  gap: 0.3rem;
  padding: 0.65rem 0.75rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  background: var(--surface);
}

.reminder.overdue {
  border-left-color: var(--danger);
}

.when {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.what {
  margin: 0;
  font-weight: 600;
}

.kind {
  color: var(--text-muted);
  font-weight: 500;
}

.reminder-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.badge-overdue {
  color: var(--danger);
  background: var(--danger-soft);
}
</style>
