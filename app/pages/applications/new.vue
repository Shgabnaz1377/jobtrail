<script setup lang="ts">
import { STATUSES } from '#shared/constants'
import type { Status } from '#shared/constants'
import type { ApplicationCreateInput } from '#shared/schemas'

useHead({ title: 'Add application' })

const route = useRoute()
const initialStatus = STATUSES.find(status => status === route.query.status) as Status | undefined

const pending = ref(false)
const error = ref<ApiErrorInfo | null>(null)

async function create(values: ApplicationCreateInput) {
  pending.value = true
  error.value = null
  try {
    const created = await $fetch('/api/applications', { method: 'POST', body: values })
    await navigateTo(`/applications/${created.id}`)
  }
  catch (err) {
    error.value = describeApiError(err, 'Could not save the application')
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="container narrow">
    <header class="page-header">
      <h1>Add application</h1>
    </header>
    <ApplicationForm
      :initial="initialStatus ? { status: initialStatus } : {}"
      submit-label="Add application"
      :pending="pending"
      :server-error="error"
      @submit="create"
      @cancel="$router.back()"
    />
  </div>
</template>

<style scoped>
.narrow {
  max-width: 48rem;
}
</style>
