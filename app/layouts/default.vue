<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()

async function signOut(next = '/login') {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo(next)
}
</script>

<template>
  <div class="shell">
    <a
      href="#main"
      class="skip-link"
    >Skip to content</a>
    <header class="topbar">
      <div class="topbar-inner">
        <NuxtLink
          to="/"
          class="brand"
        >
          <span
            class="brand-mark"
            aria-hidden="true"
          >JT</span>
          JobTrail
        </NuxtLink>

        <AppNav v-if="loggedIn" />

        <div class="topbar-actions">
          <ThemeToggle />
          <template v-if="loggedIn && user">
            <span
              class="user-name"
              :title="user.email"
            >
              {{ user.name }}
              <span
                v-if="user.isDemo"
                class="badge"
              >Demo</span>
            </span>
            <button
              type="button"
              class="btn btn-sm"
              @click="signOut()"
            >
              Sign out
            </button>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="btn btn-ghost btn-sm"
            >
              Sign in
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="btn btn-primary btn-sm"
            >
              Sign up
            </NuxtLink>
          </template>
        </div>
      </div>
    </header>

    <p
      v-if="user?.isDemo"
      class="demo-banner"
    >
      You are exploring a demo account with sample data. Feel free to change anything; it is deleted within 24 hours.
      <button
        type="button"
        class="link-button"
        @click="signOut('/register')"
      >
        Create your own account
      </button>
    </p>

    <main
      id="main"
      tabindex="-1"
    >
      <slot />
    </main>
  </div>
</template>

<style scoped>
.skip-link {
  position: absolute;
  left: 1rem;
  top: -3rem;
  z-index: 10;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  background: var(--accent);
  color: var(--accent-contrast);
}

.skip-link:focus {
  top: 0.5rem;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}

.topbar-inner {
  max-width: 76rem;
  margin: 0 auto;
  padding: 0.6rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text);
  text-decoration: none;
}

.brand-mark {
  display: inline-grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 8px;
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: 0.8rem;
  letter-spacing: 0.02em;
}

.topbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-name {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.demo-banner {
  margin: 0;
  padding: 0.5rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  background: var(--accent-soft);
  color: var(--text);
}

.link-button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

main:focus {
  outline: none;
}

@media (width <= 720px) {
  .topbar-inner {
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
  }

  .user-name {
    display: none;
  }
}
</style>
