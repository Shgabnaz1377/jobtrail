<script setup lang="ts">
const { loggedIn } = useUserSession()
const demo = useDemo()

if (loggedIn.value) {
  await navigateTo(HOME_ROUTE)
}
</script>

<template>
  <div class="container landing">
    <section class="hero">
      <h1>Your job search, organised.</h1>
      <p class="lead">
        JobTrail keeps every application on one board, from the wishlist to the offer,
        with interview dates, follow-up reminders and honest numbers about how it is going.
      </p>
      <div class="row">
        <NuxtLink
          to="/register"
          class="btn btn-primary"
        >
          Create a free account
        </NuxtLink>
        <button
          type="button"
          class="btn"
          :disabled="demo.pending.value"
          @click="demo.start"
        >
          {{ demo.pending.value ? 'Preparing demo…' : 'Try the demo' }}
        </button>
      </div>
      <p
        v-if="demo.error.value"
        class="alert demo-error"
        role="alert"
      >
        {{ demo.error.value }}
      </p>
      <p class="muted small">
        The demo opens a private account filled with sample applications. It is deleted after 24 hours.
      </p>
    </section>

    <ul class="features">
      <li class="card">
        <h2>Kanban board</h2>
        <p class="muted">
          Drag applications between Wishlist, Applied, Interview, Offer and Rejected, or move them with the keyboard.
        </p>
      </li>
      <li class="card">
        <h2>Timeline &amp; reminders</h2>
        <p class="muted">
          Log interviews and follow-ups per application and see what is coming up next.
        </p>
      </li>
      <li class="card">
        <h2>Stats that matter</h2>
        <p class="muted">
          Funnel conversion between stages, applications per week and your response rate.
        </p>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.hero {
  max-width: 44rem;
  padding: 3rem 0 2rem;
}

.hero h1 {
  font-size: clamp(2rem, 5vw, 2.9rem);
  letter-spacing: -0.02em;
  margin-bottom: 1rem;
}

.lead {
  font-size: 1.1rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.demo-error {
  margin-top: 1rem;
}

.hero .row + .muted {
  margin-top: 0.9rem;
}

.features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
}

.features p {
  margin: 0;
}
</style>
