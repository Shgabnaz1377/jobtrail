<script setup lang="ts">
import type { Status } from '#shared/constants'

useHead({ title: 'Board' })

const { data: applications, refresh } = await useFetch('/api/applications')
const error = ref('')

async function move({ id, status, position }: { id: string, status: Status, position: number }) {
  error.value = ''
  try {
    await $fetch(`/api/applications/${id}/move`, { method: 'POST', body: { status, position } })
  }
  catch (err) {
    error.value = describeApiError(err, 'Could not move the application').message
  }
  // Re-sync with the server either way so positions match what was stored.
  await refresh()
}
</script>

<template>
  <div class="container wide">
    <header class="page-header">
      <h1>Board</h1>
      <NuxtLink
        to="/applications/new"
        class="btn btn-primary"
      >
        Add application
      </NuxtLink>
    </header>

    <UpcomingReminders />

    <p
      v-if="error"
      class="alert"
      role="alert"
    >
      {{ error }}
    </p>

    <KanbanBoard
      v-if="applications"
      :cards="applications"
      @move="move"
    />
  </div>
</template>

<style scoped>
.wide {
  max-width: 96rem;
}

.alert {
  margin-bottom: 1rem;
}
</style>
