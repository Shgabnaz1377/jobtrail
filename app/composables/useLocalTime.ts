import { formatDateTime, formatRelative } from '~/utils/format'

/**
 * Dates shown in the visitor's own time zone.
 *
 * The server cannot know that zone, so while the page hydrates both sides render
 * UTC and leave out relative times (they depend on the clock, which also differs).
 * Right after mount the local values replace them. Without this, any reminder on
 * the board made Vue report a hydration mismatch.
 */
export function useLocalTime() {
  const ready = ref(import.meta.client && !useNuxtApp().isHydrating)
  if (!ready.value) {
    onMounted(() => {
      ready.value = true
    })
  }
  return {
    ready,
    dateTime: (value: string | Date) => formatDateTime(value, ready.value ? undefined : 'UTC'),
    relative: (value: string | Date) => (ready.value ? formatRelative(value) : ''),
  }
}
