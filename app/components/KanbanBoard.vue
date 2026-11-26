<script setup lang="ts">
import { STATUSES, STATUS_LABELS } from '#shared/constants'
import type { Status } from '#shared/constants'
import type { Columns, KeyboardMove } from '~/utils/board'
import type { KanbanCardData } from './KanbanCard.vue'

const props = defineProps<{ cards: KanbanCardData[] }>()

const emit = defineEmits<{
  move: [payload: { id: string, status: Status, position: number }]
}>()

const columns = ref(toColumns(props.cards))
// Server data that arrived while a card was in the user's hands. Applying it
// mid-move would yank the card back to its old spot, so it waits for the drop.
let deferredCards: KanbanCardData[] | null = null

watch(() => props.cards, (cards) => {
  if (grabbedId.value || draggingId.value) {
    deferredCards = cards
    return
  }
  columns.value = toColumns(cards)
}, { deep: true })

/** Called when a move ends without being committed (cancel or no-op drop). */
function applyDeferred() {
  if (deferredCards) columns.value = toColumns(deferredCards)
  deferredCards = null
}

const announcement = ref('')

function describe(id: string) {
  const location = locate(columns.value, id)
  if (!location) return ''
  return `${STATUS_LABELS[location.status]}, position ${location.index + 1} of ${columns.value[location.status].length}`
}

function cardName(id: string) {
  const location = locate(columns.value, id)
  return location ? columns.value[location.status][location.index]!.company : ''
}

function commit(id: string) {
  const location = locate(columns.value, id)
  if (location) emit('move', { id, status: location.status, position: location.index })
}

/* ---------- Keyboard: pick up with Space/Enter, arrows to move, Space/Enter to drop ---------- */

const grabbedId = ref<string | null>(null)
let beforeGrab: Columns<KanbanCardData> | null = null
let grabbedFrom: { status: Status, index: number } | null = null

async function refocus(id: string) {
  await nextTick()
  document.querySelector<HTMLButtonElement>(`[data-card-handle="${id}"]`)?.focus()
}

function onHandleKeydown(id: string, event: KeyboardEvent) {
  const key = event.key
  if (grabbedId.value !== id) {
    if (key === ' ' || key === 'Enter') {
      event.preventDefault()
      grabbedId.value = id
      beforeGrab = columns.value
      grabbedFrom = locate(columns.value, id)
      announcement.value = `Picked up ${cardName(id)}. ${describe(id)}. Use arrow keys to move, Space to drop, Escape to cancel.`
    }
    return
  }

  if (key === ' ' || key === 'Enter') {
    event.preventDefault()
    const location = locate(columns.value, id)
    grabbedId.value = null
    announcement.value = `Dropped ${cardName(id)} in ${describe(id)}.`
    const moved = location && grabbedFrom
      && (location.status !== grabbedFrom.status || location.index !== grabbedFrom.index)
    if (moved) {
      // A refresh follows the commit, so data deferred during the move is stale.
      deferredCards = null
      commit(id)
    }
    else applyDeferred()
    return
  }

  if (key === 'Escape') {
    event.preventDefault()
    if (beforeGrab) columns.value = beforeGrab
    applyDeferred()
    grabbedId.value = null
    announcement.value = `Move cancelled. ${cardName(id)} is back in ${describe(id)}.`
    refocus(id)
    return
  }

  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
    event.preventDefault()
    const location = locate(columns.value, id)
    if (!location) return
    const target = keyboardTarget(columns.value, location, key as KeyboardMove)
    columns.value = moveCard(columns.value, id, target.status, target.index)
    announcement.value = describe(id)
    refocus(id)
  }
}

function onHandleBlur(id: string) {
  if (grabbedId.value !== id) return
  // Moving a card to another column re-renders it and briefly drops focus;
  // only treat it as "left the card" if focus did not come back to its handle.
  setTimeout(() => {
    if (grabbedId.value !== id) return
    const active = document.activeElement
    if (active instanceof HTMLElement && active.dataset.cardHandle === id) return
    grabbedId.value = null
    const location = locate(columns.value, id)
    announcement.value = `Dropped ${cardName(id)} in ${describe(id)}.`
    if (location && grabbedFrom && (location.status !== grabbedFrom.status || location.index !== grabbedFrom.index)) {
      deferredCards = null
      commit(id)
    }
    else applyDeferred()
  }, 0)
}

/* ---------- Pointer: native drag and drop ---------- */

const draggingId = ref<string | null>(null)
const dropTarget = ref<{ status: Status, index: number } | null>(null)
const listRefs = ref<Partial<Record<Status, HTMLElement>>>({})

function onDragStart(id: string, event: DragEvent) {
  draggingId.value = id
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(status: Status, event: DragEvent) {
  if (!draggingId.value) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  const list = listRefs.value[status]
  if (!list) return
  const midpoints = [...list.querySelectorAll<HTMLElement>('[data-card-id]')]
    .filter(node => node.dataset.cardId !== draggingId.value)
    .map((node) => {
      const rect = node.getBoundingClientRect()
      return rect.top + rect.height / 2
    })
  dropTarget.value = { status, index: dropIndex(midpoints, event.clientY) }
}

function onDrop(status: Status, event: DragEvent) {
  event.preventDefault()
  const id = draggingId.value ?? event.dataTransfer?.getData('text/plain')
  const target = dropTarget.value
  draggingId.value = null
  dropTarget.value = null
  if (!id || !target || target.status !== status) {
    applyDeferred()
    return
  }

  const before = locate(columns.value, id)
  columns.value = moveCard(columns.value, id, target.status, target.index)
  const after = locate(columns.value, id)
  if (before && after && (before.status !== after.status || before.index !== after.index)) {
    announcement.value = `Moved ${cardName(id)} to ${describe(id)}.`
    deferredCards = null
    commit(id)
  }
  else applyDeferred()
}

function onDragEnd() {
  draggingId.value = null
  dropTarget.value = null
  applyDeferred()
}

/** Id of the card the drop marker sits in front of, or null for the end of the column. */
const markerBeforeId = computed(() => {
  const target = dropTarget.value
  if (!target) return undefined
  const others = columns.value[target.status].filter(card => card.id !== draggingId.value)
  return others[target.index]?.id ?? null
})

/* ---------- Small screens: plain stage picker ---------- */

function onChangeStatus(id: string, status: Status) {
  columns.value = moveCard(columns.value, id, status, Number.MAX_SAFE_INTEGER)
  announcement.value = `Moved ${cardName(id)} to ${describe(id)}.`
  commit(id)
}
</script>

<template>
  <div class="board-wrapper">
    <p
      id="board-keyboard-help"
      class="sr-only"
    >
      Press Space or Enter to pick up the card, arrow keys to move it between and within stages, Space or Enter to drop it, Escape to cancel.
    </p>
    <p
      class="sr-only"
      aria-live="assertive"
      aria-atomic="true"
    >
      {{ announcement }}
    </p>

    <div class="board">
      <section
        v-for="status in STATUSES"
        :key="status"
        class="column"
        :class="[`column-${status}`, { 'drop-active': dropTarget?.status === status }]"
        :aria-labelledby="`column-${status}-title`"
        @dragover="onDragOver(status, $event)"
        @drop="onDrop(status, $event)"
      >
        <header class="column-header">
          <h2 :id="`column-${status}-title`">
            <span
              class="column-dot"
              aria-hidden="true"
            />
            {{ STATUS_LABELS[status] }}
            <span class="count">{{ columns[status].length }}</span>
          </h2>
          <NuxtLink
            :to="{ path: '/applications/new', query: { status } }"
            class="btn btn-ghost btn-sm add"
            :aria-label="`Add application to ${STATUS_LABELS[status]}`"
          >
            +
          </NuxtLink>
        </header>

        <ol
          :ref="(el) => { if (el) listRefs[status] = el as HTMLElement }"
          class="cards"
        >
          <template
            v-for="card in columns[status]"
            :key="card.id"
          >
            <li
              v-if="dropTarget?.status === status && markerBeforeId === card.id"
              class="drop-marker"
              aria-hidden="true"
            />
            <li
              :data-card-id="card.id"
              draggable="true"
              @dragstart="onDragStart(card.id, $event)"
              @dragend="onDragEnd"
              @focusout="onHandleBlur(card.id)"
            >
              <KanbanCard
                :card="card"
                :grabbed="grabbedId === card.id"
                :dragging="draggingId === card.id"
                @handle-keydown="onHandleKeydown(card.id, $event)"
                @change-status="onChangeStatus(card.id, $event)"
              />
            </li>
          </template>
          <li
            v-if="dropTarget?.status === status && markerBeforeId === null"
            class="drop-marker"
            aria-hidden="true"
          />
          <li
            v-if="columns[status].length === 0 && dropTarget?.status !== status"
            class="column-empty"
          >
            No applications
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>

<style scoped>
.board {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(15.5rem, 1fr);
  gap: 0.9rem;
  overflow-x: auto;
  padding-bottom: 0.75rem;
  scroll-snap-type: x proximity;
}

.column {
  display: flex;
  flex-direction: column;
  min-height: 24rem;
  padding: 0.75rem;
  border-radius: var(--radius-lg);
  background: var(--surface-2);
  border: 1px solid transparent;
  scroll-snap-align: start;
  transition: border-color 0.15s, background 0.15s;
}

.column.drop-active {
  border-color: var(--column-color);
  background: color-mix(in srgb, var(--column-color) 7%, var(--surface-2));
}

.column-wishlist { --column-color: var(--status-wishlist); }
.column-applied { --column-color: var(--status-applied); }
.column-interview { --column-color: var(--status-interview); }
.column-offer { --column-color: var(--status-offer); }
.column-rejected { --column-color: var(--status-rejected); }

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.column-header h2 {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
  font-size: 0.95rem;
}

.column-dot {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--column-color);
}

.count {
  padding: 0 0.45rem;
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 0.78rem;
}

.add {
  font-size: 1.1rem;
  line-height: 1;
}

.cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  align-content: start;
  gap: 0.55rem;
  flex: 1;
}

.drop-marker {
  height: 0.25rem;
  border-radius: 999px;
  background: var(--column-color);
}

.column-empty {
  padding: 1.5rem 0.5rem;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  color: var(--text-muted);
  font-size: 0.85rem;
  text-align: center;
}

@media (width <= 720px) {
  .board {
    grid-auto-columns: 82%;
    scroll-snap-type: x mandatory;
  }

  .column {
    min-height: 16rem;
  }
}
</style>
