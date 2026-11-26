<script setup lang="ts">
const { loggedIn, user } = useUserSession()

if (loggedIn.value && HOME_ROUTE !== '/') {
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
      <div
        v-if="loggedIn && user"
        class="row"
      >
        <p class="muted">
          Signed in as {{ user.name }}.
        </p>
      </div>
      <div
        v-else
        class="row"
      >
        <NuxtLink
          to="/register"
          class="btn btn-primary"
        >
          Create a free account
        </NuxtLink>
        <NuxtLink
          to="/login"
          class="btn"
        >
          Sign in
        </NuxtLink>
      </div>
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
