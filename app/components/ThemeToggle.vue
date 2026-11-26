<script setup lang="ts">
const { preference, cycle } = useTheme()

const label = computed(() => {
  switch (preference.value) {
    case 'light': return 'Light theme'
    case 'dark': return 'Dark theme'
    default: return 'System theme'
  }
})
</script>

<template>
  <button
    type="button"
    class="btn btn-ghost btn-sm"
    :aria-label="`${label}. Switch theme`"
    :title="label"
    @click="cycle"
  >
    <svg
      v-if="preference === 'light'"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-else-if="preference === 'dark'"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
      />
    </svg>
    <svg
      v-else
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="12"
        rx="2"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      />
      <path
        d="M8 20h8M12 16v4"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  </button>
</template>
