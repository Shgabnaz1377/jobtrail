<script setup lang="ts">
const emit = defineEmits<{ imported: [count: number] }>()

const input = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const message = ref('')
const issues = ref<{ line: number, message: string }[]>([])
const moreIssues = ref(0)

interface ImportError {
  data?: { statusMessage?: string, data?: { issues?: { line: number, message: string }[], total?: number } }
}

async function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  busy.value = true
  message.value = ''
  issues.value = []
  moreIssues.value = 0
  try {
    const { imported } = await $fetch('/api/csv/import', {
      method: 'POST',
      body: await file.text(),
      headers: { 'content-type': 'text/csv' },
    })
    message.value = `Imported ${imported} ${imported === 1 ? 'application' : 'applications'} from ${file.name}.`
    emit('imported', imported)
  }
  catch (error) {
    const err = error as ImportError
    message.value = err.data?.statusMessage ?? 'Import failed'
    issues.value = err.data?.data?.issues ?? []
    moreIssues.value = Math.max(0, (err.data?.data?.total ?? 0) - issues.value.length)
  }
  finally {
    busy.value = false
    if (input.value) input.value.value = ''
  }
}
</script>

<template>
  <div class="csv-tools">
    <div class="row">
      <a
        href="/api/csv/export"
        class="btn"
        download
      >Export CSV</a>
      <button
        type="button"
        class="btn"
        :disabled="busy"
        @click="input?.click()"
      >
        {{ busy ? 'Importing…' : 'Import CSV' }}
      </button>
      <input
        ref="input"
        type="file"
        accept=".csv,text/csv"
        class="sr-only"
        tabindex="-1"
        aria-label="CSV file to import"
        @change="onFile"
      >
    </div>

    <div
      v-if="message"
      class="csv-result"
      :class="{ alert: issues.length }"
      role="status"
    >
      <p>{{ message }}</p>
      <ul v-if="issues.length">
        <li
          v-for="(issue, index) in issues"
          :key="index"
        >
          <template v-if="issue.line">
            Line {{ issue.line }}:
          </template>{{ issue.message }}
        </li>
        <li v-if="moreIssues">
          …and {{ moreIssues }} more
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.csv-tools {
  display: grid;
  gap: 0.75rem;
  justify-items: end;
}

.csv-result {
  justify-self: stretch;
  font-size: 0.9rem;
}

.csv-result p {
  margin: 0;
}

.csv-result ul {
  margin: 0.4rem 0 0;
  padding-left: 1.2rem;
}
</style>
