/** Starts a throwaway demo session and opens the board. */
export function useDemo() {
  const { fetch: refreshSession } = useUserSession()
  const pending = ref(false)
  const error = ref('')

  async function start() {
    pending.value = true
    error.value = ''
    try {
      await $fetch('/api/auth/demo', { method: 'POST' })
      await refreshSession()
      await navigateTo(HOME_ROUTE)
    }
    catch (err) {
      error.value = describeApiError(err, 'Could not start the demo').message
    }
    finally {
      pending.value = false
    }
  }

  return { start, pending, error }
}
