<script setup lang="ts">
useHead({ title: 'Create account' })

const { fetch: refreshSession } = useUserSession()

const form = reactive({ name: '', email: '', password: '' })
const pending = ref(false)
const error = ref<ApiErrorInfo | null>(null)

async function submit() {
  pending.value = true
  error.value = null
  try {
    await $fetch('/api/auth/register', { method: 'POST', body: form })
    await refreshSession()
    await navigateTo(HOME_ROUTE)
  }
  catch (err) {
    error.value = describeApiError(err, 'Could not create the account')
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <section class="card auth-card">
      <h1>Create your account</h1>
      <p class="muted">
        Keep every application, interview and follow-up in one place.
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
          <label for="register-name">Name</label>
          <input
            id="register-name"
            v-model="form.name"
            class="input"
            name="name"
            autocomplete="name"
            required
          >
          <span
            v-if="error?.fields.name"
            class="field-error"
          >{{ error.fields.name }}</span>
        </div>

        <div class="field">
          <label for="register-email">Email</label>
          <input
            id="register-email"
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
          <label for="register-password">Password</label>
          <input
            id="register-password"
            v-model="form.password"
            class="input"
            type="password"
            name="password"
            autocomplete="new-password"
            minlength="8"
            aria-describedby="register-password-hint"
            required
          >
          <span
            v-if="error?.fields.password"
            class="field-error"
          >{{ error.fields.password }}</span>
          <span
            v-else
            id="register-password-hint"
            class="muted small"
          >At least 8 characters.</span>
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-block"
          :disabled="pending"
        >
          {{ pending ? 'Creating account…' : 'Create account' }}
        </button>
      </form>

      <p class="muted small auth-switch">
        Already have an account?
        <NuxtLink to="/login">
          Sign in
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
