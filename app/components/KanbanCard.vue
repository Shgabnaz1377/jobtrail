<script setup lang="ts">
import { STATUSES, STATUS_LABELS, WORK_MODE_LABELS } from '#shared/constants'
import type { Status, WorkMode } from '#shared/constants'

export interface KanbanCardData {
  id: string
  status: Status
  position: number
  company: string
  role: string
  location: string | null
  workMode: WorkMode
  salaryMin: number | null
  salaryMax: number | null
  currency: string
}

const props = defineProps<{
  card: KanbanCardData
  grabbed?: boolean
  dragging?: boolean
}>()

const emit = defineEmits<{
  handleKeydown: [event: KeyboardEvent]
  changeStatus: [status: Status]
}>()

const salary = computed(() => formatSalary(props.card.salaryMin, props.card.salaryMax, props.card.currency))
</script>

<template>
  <article
    class="kanban-card"
    :class="{ grabbed, dragging }"
  >
    <div class="card-top">
      <button
        type="button"
        class="handle"
        :data-card-handle="card.id"
        :aria-pressed="grabbed"
        :aria-label="`Move ${card.company}, ${card.role}`"
        aria-describedby="board-keyboard-help"
        @keydown="emit('handleKeydown', $event)"
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          aria-hidden="true"
        >
          <circle
            v-for="(pos, i) in [[5, 3], [11, 3], [5, 8], [11, 8], [5, 13], [11, 13]]"
            :key="i"
            :cx="pos[0]"
            :cy="pos[1]"
            r="1.4"
            fill="currentColor"
          />
        </svg>
      </button>
      <NuxtLink
        :to="`/applications/${card.id}`"
        class="company"
        draggable="false"
      >
        {{ card.company }}
      </NuxtLink>
    </div>
    <p class="role">
      {{ card.role }}
    </p>
    <p class="meta">
      <span>{{ card.location ? `${card.location} · ` : '' }}{{ WORK_MODE_LABELS[card.workMode] }}</span>
      <span v-if="salary">{{ salary }}</span>
    </p>
    <label class="mobile-move">
      <span class="sr-only">Stage for {{ card.company }}</span>
      <select
        class="select"
        :value="card.status"
        @change="emit('changeStatus', ($event.target as HTMLSelectElement).value as Status)"
      >
        <option
          v-for="status in STATUSES"
          :key="status"
          :value="status"
        >
          {{ STATUS_LABELS[status] }}
        </option>
      </select>
    </label>
  </article>
</template>

<style scoped>
.kanban-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 0.7rem 0.8rem;
  cursor: grab;
  transition: box-shadow 0.15s, transform 0.15s, opacity 0.15s;
}

.kanban-card:hover {
  border-color: var(--border-strong);
}

.kanban-card.dragging {
  opacity: 0.45;
}

.kanban-card.grabbed {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent), var(--shadow-lg);
  transform: rotate(-1deg);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.handle {
  display: inline-grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  margin-left: -0.3rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: grab;
}

.handle:hover,
.handle[aria-pressed='true'] {
  background: var(--surface-2);
  color: var(--accent);
}

.company {
  font-weight: 700;
  color: var(--text);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.company:hover {
  color: var(--accent);
  text-decoration: underline;
}

.role {
  margin: 0.15rem 0 0.4rem;
  font-size: 0.9rem;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 0.75rem;
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.mobile-move {
  display: none;
}

@media (width <= 720px), (pointer: coarse) {
  .mobile-move {
    display: block;
    margin-top: 0.6rem;
  }

  .mobile-move .select {
    min-height: 2rem;
    padding: 0.2rem 0.5rem;
    font-size: 0.85rem;
  }
}
</style>
