<script setup lang="ts">
useHead({ title: 'Sign in' })

const route = useRoute()
const { fetch: refreshSession } = useUserSession()

const form = reactive({ email: '', password: '' })
const pending = ref(false)
const error = ref<ApiErrorInfo | null>(null)

async function submit() {
  pending.value = true
  error.value = null
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: form })
    await refreshSession()
    await navigateTo(safeRedirect(route.query.redirect))
  }
  catch (err) {
    error.value = describeApiError(err, 'Could not sign in')
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <section class="card auth-card">
      <h1>Welcome back</h1>
      <p class="muted">
        Sign in to pick up where you left off.
      </p>

      <form
        novalidate
        @submit.prevent="submit"
      >
        <p
          v-if="error"
          class="alert"
          role="alert"
        >
          {{ error.message }}
        </p>

        <div class="field">
          <label for="login-email">Email</label>
          <input
            id="login-email"
            v-model="form.email"
            class="input"
            type="email"
            name="email"
            autocomplete="email"
            required
          >
          <span
            v-if="error?.fields.email"
            class="field-error"
          >{{ error.fields.email }}</span>
        </div>

        <div class="field">
          <label for="login-password">Password</label>
          <input
            id="login-password"
            v-model="form.password"
            class="input"
            type="password"
            name="password"
            autocomplete="current-password"
            required
          >
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-block"
          :disabled="pending"
        >
          {{ pending ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="muted small auth-switch">
        New here?
        <NuxtLink to="/register">
          Create an account
        </NuxtLink>
      </p>
    </section>
  </div>
</template>

<style scoped>
.auth-switch {
  margin: 1.25rem 0 0;
  text-align: center;
}
</style>
