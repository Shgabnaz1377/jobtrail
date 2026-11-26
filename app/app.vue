<script setup lang="ts">
const { preference } = useTheme()

useHead({
  htmlAttrs: {
    'data-theme': computed(() => (preference.value === 'system' ? undefined : preference.value)),
  },
  titleTemplate: title => (title && title !== 'JobTrail' ? `${title} · JobTrail` : 'JobTrail'),
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
