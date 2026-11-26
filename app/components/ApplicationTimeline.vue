<script setup lang="ts">
import { EVENT_KIND_LABELS, MANUAL_EVENT_KINDS } from '#shared/constants'
import type { EventKind, ManualEventKind, Status } from '#shared/constants'

export interface TimelineEvent {
  id: string
  kind: EventKind
  title: string
  notes: string | null
  occursAt: string
  done: boolean
  fromStatus: Status | null
  toStatus: Status | null
}

const time = useLocalTime()

const props = defineProps<{
  applicationId: string
  events: TimelineEvent[]
}>()

const emit = defineEmits<{ changed: [] }>()

const DEFAULT_TITLES: Record<ManualEventKind, string> = {
  interview: 'Interview',
  follow_up: 'Follow up',
  note: 'Note',
}

function freshDraft() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  tomorrow.setMinutes(0, 0, 0)
  return { kind: 'interview' as ManualEventKind, title: '', notes: '', occursAt: toDateTimeLocal(tomorrow) }
}

const draft = reactive(freshDraft())
const adding = ref(false)
const pending = ref(false)
const error = ref<ApiErrorInfo | null>(null)

const sorted = computed(() =>
  [...props.events].sort((a, b) => new Date(b.occursAt).getTime() - new Date(a.occursAt).getTime()),
)

async function add() {
  pending.value = true
  error.value = null
  try {
    await $fetch(`/api/applications/${props.applicationId}/events`, {
      method: 'POST',
      body: {
        kind: draft.kind,
        title: draft.title.trim() || DEFAULT_TITLES[draft.kind],
        notes: draft.notes,
        occursAt: new Date(draft.occursAt).toISOString(),
        // Notes describe something that already happened.
        done: draft.kind === 'note',
      },
    })
    Object.assign(draft, freshDraft())
    adding.value = false
    emit('changed')
  }
  catch (err) {
    error.value = describeApiError(err, 'Could not add the event')
  }
  finally {
    pending.value = false
  }
}

async function toggleDone(event: TimelineEvent) {
  await $fetch(`/api/events/${event.id}`, { method: 'PATCH', body: { done: !event.done } })
  emit('changed')
}

async function remove(event: TimelineEvent) {
  if (!confirm(`Delete "${event.title}"?`)) return
  await $fetch(`/api/events/${event.id}`, { method: 'DELETE' })
  emit('changed')
}

const isUpcoming = (event: TimelineEvent) => !event.done && new Date(event.occursAt).getTime() > Date.now()
const isOverdue = (event: TimelineEvent) =>
  !event.done && event.kind !== 'note' && new Date(event.occursAt).getTime() <= Date.now()
</script>

<template>
  <section
    class="card timeline"
    aria-labelledby="timeline-heading"
  >
    <header class="timeline-header">
      <h2 id="timeline-heading">
        Timeline
      </h2>
      <button
        v-if="!adding"
        type="button"
        class="btn btn-sm"
        @click="adding = true"
      >
        Add event
      </button>
    </header>

    <form
      v-if="adding"
      class="event-form"
      @submit.prevent="add"
    >
      <p
        v-if="error"
        class="alert"
        role="alert"
      >
        {{ error.message }}
      </p>
      <div class="event-form-grid">
        <div class="field">
          <label for="event-kind">Type</label>
          <select
            id="event-kind"
            v-model="draft.kind"
            class="select"
          >
            <option
              v-for="kind in MANUAL_EVENT_KINDS"
              :key="kind"
              :value="kind"
            >
              {{ EVENT_KIND_LABELS[kind] }}
            </option>
          </select>
        </div>
        <div class="field">
          <label for="event-when">When</label>
          <input
            id="event-when"
            v-model="draft.occursAt"
            class="input"
            type="datetime-local"
            required
          >
        </div>
        <div class="field span-all">
          <label for="event-title">Title</label>
          <input
            id="event-title"
            v-model="draft.title"
            class="input"
            :placeholder="DEFAULT_TITLES[draft.kind]"
          >
        </div>
        <div class="field span-all">
          <label for="event-notes">Notes</label>
          <textarea
            id="event-notes"
            v-model="draft.notes"
            class="textarea"
            rows="2"
          />
        </div>
      </div>
      <div class="row">
        <button
          type="submit"
          class="btn btn-primary btn-sm"
          :disabled="pending"
        >
          {{ pending ? 'Adding…' : 'Add to timeline' }}
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          @click="adding = false"
        >
          Cancel
        </button>
      </div>
    </form>

    <ol class="events">
      <li
        v-for="event in sorted"
        :key="event.id"
        class="event"
        :class="[`event-${event.kind}`, { 'event-done': event.done && event.kind !== 'status_change' && event.kind !== 'note' }]"
      >
        <span
          class="event-marker"
          aria-hidden="true"
        />
        <div class="event-body">
          <div class="event-title-row">
            <span class="event-title">{{ event.title }}</span>
            <span
              v-if="event.kind !== 'status_change'"
              class="badge"
            >{{ EVENT_KIND_LABELS[event.kind] }}</span>
            <span
              v-if="isOverdue(event)"
              class="badge badge-overdue"
            >Overdue</span>
            <span
              v-else-if="isUpcoming(event)"
              class="badge badge-upcoming"
            >Upcoming</span>
          </div>
          <time
            class="muted small"
            :datetime="event.occursAt"
          >
            {{ time.dateTime(event.occursAt) }}<template v-if="time.ready.value"> · {{ time.relative(event.occursAt) }}</template>
          </time>
          <p
            v-if="event.notes"
            class="event-notes"
          >
            {{ event.notes }}
          </p>
        </div>
        <div
          v-if="event.kind !== 'status_change'"
          class="event-actions"
        >
          <button
            v-if="event.kind !== 'note'"
            type="button"
            class="btn btn-ghost btn-sm"
            :aria-label="event.done ? `Mark ${event.title} as not done` : `Mark ${event.title} as done`"
            @click="toggleDone(event)"
          >
            {{ event.done ? 'Undo' : 'Done' }}
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            :aria-label="`Delete ${event.title}`"
            @click="remove(event)"
          >
            Delete
          </button>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.timeline-header h2 {
  margin: 0;
}

.event-form {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: var(--radius);
  background: var(--surface-2);
}

.event-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.span-all {
  grid-column: 1 / -1;
}

.events {
  list-style: none;
  margin: 0;
  padding: 0;
}

.event {
  position: relative;
  display: grid;
  grid-template-columns: 1.25rem minmax(0, 1fr) auto;
  gap: 0.75rem;
  padding: 0 0 1.1rem;
}

.event::before {
  content: '';
  position: absolute;
  left: calc(0.625rem - 1px);
  top: 1.2rem;
  bottom: 0;
  width: 2px;
  background: var(--border);
}

.event:last-child::before {
  display: none;
}

.event-marker {
  width: 0.85rem;
  height: 0.85rem;
  margin: 0.3rem auto 0;
  border-radius: 50%;
  border: 2px solid var(--accent);
  background: var(--surface);
}

.event-status_change .event-marker {
  border-color: var(--text-muted);
  background: var(--text-muted);
  transform: scale(0.75);
}

.event-interview .event-marker {
  border-color: var(--status-interview);
}

.event-follow_up .event-marker {
  border-color: var(--status-applied);
}

.event-done .event-marker {
  background: var(--success);
  border-color: var(--success);
}

.event-done .event-title {
  text-decoration: line-through;
  color: var(--text-muted);
}

.event-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.event-title {
  font-weight: 600;
}

.event-notes {
  margin: 0.3rem 0 0;
  white-space: pre-line;
}

.event-actions {
  display: flex;
  gap: 0.25rem;
  align-items: flex-start;
}

.badge-overdue {
  color: var(--danger);
  background: var(--danger-soft);
}

.badge-upcoming {
  color: var(--accent);
  background: var(--accent-soft);
}

@media (width <= 560px) {
  .event {
    grid-template-columns: 1.25rem minmax(0, 1fr);
  }

  .event-actions {
    grid-column: 2;
  }

  .event-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
