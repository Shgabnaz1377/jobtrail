<script setup lang="ts">
import { STATUS_LABELS } from '#shared/constants'
import type { Status } from '#shared/constants'

defineProps<{ status: Status }>()
</script>

<template>
  <span
    class="badge status-badge"
    :class="`status-${status}`"
  >
    <span
      class="dot"
      aria-hidden="true"
    />
    {{ STATUS_LABELS[status] }}
  </span>
</template>

<style scoped>
.status-badge {
  /* Text stays in the text ink; the dot carries the stage colour. */
  color: var(--text);
  background: color-mix(in srgb, var(--status-color) 16%, transparent);
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--status-color);
}

.status-wishlist { --status-color: var(--status-wishlist); }
.status-applied { --status-color: var(--status-applied); }
.status-interview { --status-color: var(--status-interview); }
.status-offer { --status-color: var(--status-offer); }
.status-rejected { --status-color: var(--status-rejected); }
</style>
