<script setup lang="ts">
const props = defineProps<{ weeks: { weekStart: string, count: number }[] }>()

const HEIGHT = 220
const PAD = { top: 16, right: 8, bottom: 28, left: 28 }
const innerH = HEIGHT - PAD.top - PAD.bottom

// Draw at the container's real width so text and bars keep their pixel size
// instead of scaling with the viewBox.
const container = ref<HTMLElement | null>(null)
const width = ref(640)
let observer: ResizeObserver | undefined
onMounted(() => {
  if (!container.value) return
  width.value = container.value.clientWidth || width.value
  observer = new ResizeObserver(([entry]) => {
    if (entry) width.value = Math.max(280, Math.round(entry.contentRect.width))
  })
  observer.observe(container.value)
})
onBeforeUnmount(() => observer?.disconnect())
const innerW = computed(() => width.value - PAD.left - PAD.right)

const max = computed(() => Math.max(...props.weeks.map(w => w.count), 0))
// Round the scale up to a friendly number so the gridlines land on integers.
const scaleMax = computed(() => {
  const m = Math.max(max.value, 4)
  const step = Math.ceil(m / 4)
  return step * 4
})
const ticks = computed(() => [0, 1, 2, 3, 4].map(i => (scaleMax.value / 4) * i))

const slot = computed(() => innerW.value / Math.max(props.weeks.length, 1))
const barWidth = computed(() => Math.min(28, slot.value - 6))

const bars = computed(() =>
  props.weeks.map((week, index) => {
    const height = (week.count / scaleMax.value) * innerH
    const x = PAD.left + index * slot.value + (slot.value - barWidth.value) / 2
    return { ...week, x, y: PAD.top + innerH - height, height, slotX: PAD.left + index * slot.value }
  }),
)

const shortDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const label = (weekStart: string) => shortDate.format(new Date(`${weekStart}T00:00:00Z`))

const active = ref<number | null>(null)
const activeBar = computed(() => (active.value === null ? null : bars.value[active.value] ?? null))

/** Rounded top corners only, so the bar sits flat on the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return ''
  const r = Math.min(4, h, w / 2)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

const summary = computed(() => {
  const total = props.weeks.reduce((sum, w) => sum + w.count, 0)
  return `Applications sent per week over the last ${props.weeks.length} weeks: ${total} in total, at most ${max.value} in one week.`
})
</script>

<template>
  <div
    ref="container"
    class="weekly"
  >
    <svg
      :viewBox="`0 0 ${width} ${HEIGHT}`"
      role="img"
      :aria-label="summary"
      @mouseleave="active = null"
    >
      <g class="grid">
        <g
          v-for="tick in ticks"
          :key="tick"
        >
          <line
            :x1="PAD.left"
            :x2="width - PAD.right"
            :y1="PAD.top + innerH - (tick / scaleMax) * innerH"
            :y2="PAD.top + innerH - (tick / scaleMax) * innerH"
          />
          <text
            :x="PAD.left - 8"
            :y="PAD.top + innerH - (tick / scaleMax) * innerH + 4"
            text-anchor="end"
          >{{ tick }}</text>
        </g>
      </g>

      <g>
        <path
          v-for="(bar, index) in bars"
          :key="bar.weekStart"
          class="bar"
          :class="{ dim: active !== null && active !== index }"
          :d="barPath(bar.x, bar.y, barWidth, bar.height)"
        />
      </g>

      <g class="axis">
        <text
          v-for="(bar, index) in bars"
          v-show="index % 2 === bars.length % 2 || index === bars.length - 1"
          :key="bar.weekStart"
          :x="bar.x + barWidth / 2"
          :y="HEIGHT - 8"
          text-anchor="middle"
        >{{ label(bar.weekStart) }}</text>
      </g>

      <!-- Hit targets span the whole slot so thin or empty bars are easy to hover. -->
      <rect
        v-for="(bar, index) in bars"
        :key="`hit-${bar.weekStart}`"
        class="hit"
        :x="bar.slotX"
        :y="PAD.top"
        :width="slot"
        :height="innerH"
        @mouseenter="active = index"
      />
    </svg>

    <div
      v-if="activeBar"
      class="tooltip"
      :style="{ left: `${((activeBar.x + barWidth / 2) / width) * 100}%` }"
      aria-hidden="true"
    >
      <span class="muted">Week of {{ label(activeBar.weekStart) }}</span>
      <strong>{{ activeBar.count }} {{ activeBar.count === 1 ? 'application' : 'applications' }}</strong>
    </div>
  </div>
</template>

<style scoped>
.weekly {
  position: relative;
}

svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.grid line {
  stroke: var(--border);
  stroke-width: 1;
}

.grid text,
.axis text {
  fill: var(--text-muted);
  font-size: 11px;
}

.bar {
  fill: var(--accent);
  transition: opacity 0.15s;
}

.bar.dim {
  opacity: 0.45;
}

.hit {
  fill: transparent;
}

.tooltip {
  position: absolute;
  top: 0;
  transform: translate(-50%, -70%);
  display: grid;
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  font-size: 0.8rem;
  white-space: nowrap;
  pointer-events: none;
}
</style>
