<script setup lang="ts">
import { STATUSES, STATUS_LABELS } from '#shared/constants'
import type { Status } from '#shared/constants'

const props = defineProps<{ byStatus: Record<Status, number> }>()

const total = computed(() => STATUSES.reduce((sum, status) => sum + props.byStatus[status], 0))
const segments = computed(() => STATUSES.filter(status => props.byStatus[status] > 0))
</script>

<template>
  <div class="breakdown">
    <div
      class="stacked"
      role="img"
      :aria-label="STATUSES.map(s => `${STATUS_LABELS[s]} ${byStatus[s]}`).join(', ')"
    >
      <span
        v-for="status in segments"
        :key="status"
        class="segment"
        :class="`stage-${status}`"
        :style="{ flexGrow: byStatus[status] }"
        :title="`${STATUS_LABELS[status]}: ${byStatus[status]}`"
      />
      <span
        v-if="total === 0"
        class="segment empty"
      />
    </div>
    <ul class="legend">
      <li
        v-for="status in STATUSES"
        :key="status"
      >
        <span
          class="swatch"
          :class="`stage-${status}`"
          aria-hidden="true"
        />
        {{ STATUS_LABELS[status] }}
        <strong>{{ byStatus[status] }}</strong>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.stacked {
  display: flex;
  gap: 2px;
  height: 1.25rem;
  border-radius: 4px;
  overflow: hidden;
}

.segment {
  flex-basis: 0;
  min-width: 4px;
}

.segment.empty {
  flex-grow: 1;
  background: var(--surface-2);
}

.legend {
  list-style: none;
  margin: 0.9rem 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.1rem;
  font-size: 0.875rem;
}

.legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.swatch {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 3px;
}

.stage-wishlist { background: var(--status-wishlist); }
.stage-applied { background: var(--status-applied); }
.stage-interview { background: var(--status-interview); }
.stage-offer { background: var(--status-offer); }
.stage-rejected { background: var(--status-rejected); }
</style>
