<script setup lang="ts">
import { STATUS_LABELS } from '#shared/constants'

const props = defineProps<{
  funnel: { stage: 'applied' | 'interview' | 'offer', reached: number, conversionFromPrevious: number | null }[]
}>()

const max = computed(() => Math.max(1, ...props.funnel.map(step => step.reached)))
</script>

<template>
  <ol
    class="funnel"
    aria-label="Funnel: applications that reached each stage"
  >
    <li
      v-for="step in funnel"
      :key="step.stage"
      class="step"
    >
      <span class="stage">{{ STATUS_LABELS[step.stage] }}</span>
      <span
        class="track"
        :title="`${STATUS_LABELS[step.stage]}: ${step.reached}`"
      >
        <span
          class="bar"
          :style="{ width: `${(step.reached / max) * 100}%` }"
        />
      </span>
      <span class="value">
        <strong>{{ step.reached }}</strong>
        <span
          v-if="step.conversionFromPrevious !== null"
          class="muted"
        > · {{ formatPercent(step.conversionFromPrevious) }} of previous</span>
      </span>
    </li>
  </ol>
</template>

<style scoped>
.funnel {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.9rem;
}

.step {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr) 10.5rem;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.stage {
  font-weight: 600;
}

.track {
  height: 1.1rem;
  border-radius: 0 4px 4px 0;
  background: var(--surface-2);
}

.bar {
  display: block;
  height: 100%;
  min-width: 2px;
  border-radius: 0 4px 4px 0;
  background: var(--accent);
}

@media (width <= 560px) {
  .step {
    grid-template-columns: 5rem minmax(0, 1fr);
  }

  .value {
    grid-column: 2;
    font-size: 0.8rem;
  }
}
</style>
