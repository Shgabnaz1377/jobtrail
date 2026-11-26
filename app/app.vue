<script setup lang="ts">
const { preference } = useTheme()

useHead({
  htmlAttrs: {
    'data-theme': computed(() => (preference.value === 'system' ? undefined : preference.value)),
  },
  titleTemplate: title => (title && title !== 'JobTrail' ? `${title} · JobTrail` : 'JobTrail'),
})

// Lets browser tests (and anything else) wait until the page is interactive.
onMounted(() => {
  document.documentElement.dataset.hydrated = 'true'
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
