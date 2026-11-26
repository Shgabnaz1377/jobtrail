<script setup lang="ts">
import type { ApplicationCreateInput } from '#shared/schemas'

const route = useRoute()
const id = String(route.params.id)

const { data: app, error: loadError } = await useFetch(`/api/applications/${id}`)
if (loadError.value) {
  throw createError({ statusCode: loadError.value.statusCode ?? 404, statusMessage: 'Application not found', fatal: true })
}

useHead({ title: () => (app.value ? `Edit ${app.value.company}` : 'Edit application') })

const pending = ref(false)
const error = ref<ApiErrorInfo | null>(null)

async function save(values: ApplicationCreateInput) {
  pending.value = true
  error.value = null
  try {
    await $fetch(`/api/applications/${id}`, { method: 'PATCH', body: values })
    await navigateTo(`/applications/${id}`)
  }
  catch (err) {
    error.value = describeApiError(err, 'Could not save changes')
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div
    v-if="app"
    class="container narrow"
  >
    <header class="page-header">
      <h1>Edit {{ app.company }}</h1>
    </header>
    <ApplicationForm
      :initial="toFormValues(app)"
      submit-label="Save changes"
      :pending="pending"
      :server-error="error"
      @submit="save"
      @cancel="navigateTo(`/applications/${id}`)"
    />
  </div>
</template>

<style scoped>
.narrow {
  max-width: 48rem;
}
</style>
