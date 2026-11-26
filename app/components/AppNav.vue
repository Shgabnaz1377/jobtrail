<script setup lang="ts">
const links = [
  { to: '/applications', label: 'Applications' },
]

const route = useRoute()
// Sections own every page below them (e.g. /applications/123/edit).
const isActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`)
</script>

<template>
  <nav
    class="app-nav"
    aria-label="Main"
  >
    <NuxtLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="app-nav-link"
      :class="{ active: isActive(link.to) }"
      :aria-current="isActive(link.to) ? 'page' : undefined"
    >
      {{ link.label }}
    </NuxtLink>
  </nav>
</template>

<style scoped>
.app-nav {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
}

.app-nav-link {
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius);
  color: var(--text-muted);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.app-nav-link:hover {
  color: var(--text);
  background: var(--surface-2);
}

.app-nav-link.active {
  color: var(--accent);
  background: var(--accent-soft);
}

@media (width <= 720px) {
  .app-nav {
    order: 3;
    width: 100%;
  }
}
</style>
