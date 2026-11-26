<script setup lang="ts">
import { STATUSES, STATUS_LABELS } from '#shared/constants'

useHead({ title: 'Stats' })

const { data: stats } = await useFetch('/api/stats')

const interviewRate = computed(() => stats.value?.funnel.find(step => step.stage === 'interview')?.conversionFromPrevious ?? null)
const sentLast4Weeks = computed(() => stats.value?.perWeek.slice(-4).reduce((sum, week) => sum + week.count, 0) ?? 0)
const weekLabel = (weekStart: string) => formatDay(weekStart)
</script>

<template>
  <div
    v-if="stats"
    class="container"
  >
    <header class="page-header">
      <h1>Stats</h1>
    </header>

    <div
      v-if="stats.total === 0"
      class="card empty"
    >
      <p>No data yet. Stats appear once you add applications.</p>
      <NuxtLink
        to="/applications/new"
        class="btn btn-primary"
      >
        Add application
      </NuxtLink>
    </div>

    <template v-else>
      <section
        class="tiles"
        aria-label="Key numbers"
      >
        <div class="card tile">
          <span class="tile-label">Applications sent</span>
          <span class="tile-value">{{ stats.sent }}</span>
          <span class="muted small">{{ sentLast4Weeks }} in the last 4 weeks</span>
        </div>
        <div class="card tile">
          <span class="tile-label">Response rate</span>
          <span class="tile-value">{{ formatPercent(stats.responseRate) }}</span>
          <span class="muted small">{{ stats.responded }} of {{ stats.sent }} heard back</span>
        </div>
        <div class="card tile">
          <span class="tile-label">Interview rate</span>
          <span class="tile-value">{{ formatPercent(interviewRate) }}</span>
          <span class="muted small">of sent applications reached an interview</span>
        </div>
        <div class="card tile">
          <span class="tile-label">Offers</span>
          <span class="tile-value">{{ stats.offers }}</span>
          <span class="muted small">{{ stats.byStatus.wishlist }} still on the wishlist</span>
        </div>
      </section>

      <div class="charts">
        <section
          class="card"
          aria-labelledby="funnel-heading"
        >
          <h2 id="funnel-heading">
            Funnel
          </h2>
          <p class="muted small">
            Applications that reached each stage, including ones rejected later.
          </p>
          <StatsFunnelChart :funnel="stats.funnel" />
        </section>

        <section
          class="card"
          aria-labelledby="stages-heading"
        >
          <h2 id="stages-heading">
            Where things stand
          </h2>
          <p class="muted small">
            Current stage of all {{ stats.total }} applications.
          </p>
          <StatsStageBreakdown :by-status="stats.byStatus" />
        </section>

        <section
          class="card span-2"
          aria-labelledby="weekly-heading"
        >
          <h2 id="weekly-heading">
            Applications per week
          </h2>
          <p class="muted small">
            By date applied, last 12 weeks.
          </p>
          <StatsWeeklyChart :weeks="stats.perWeek" />
        </section>
      </div>

      <details class="card data-table">
        <summary>Show the data as tables</summary>
        <div class="tables">
          <table>
            <caption>Funnel</caption>
            <thead>
              <tr>
                <th scope="col">
                  Stage
                </th><th scope="col">
                  Reached
                </th><th scope="col">
                  Conversion
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="step in stats.funnel"
                :key="step.stage"
              >
                <th scope="row">
                  {{ STATUS_LABELS[step.stage] }}
                </th>
                <td>{{ step.reached }}</td>
                <td>{{ formatPercent(step.conversionFromPrevious) }}</td>
              </tr>
            </tbody>
          </table>
          <table>
            <caption>Current stage</caption>
            <tbody>
              <tr
                v-for="status in STATUSES"
                :key="status"
              >
                <th scope="row">
                  {{ STATUS_LABELS[status] }}
                </th>
                <td>{{ stats.byStatus[status] }}</td>
              </tr>
            </tbody>
          </table>
          <table>
            <caption>Applications per week</caption>
            <tbody>
              <tr
                v-for="week in stats.perWeek"
                :key="week.weekStart"
              >
                <th scope="row">
                  {{ weekLabel(week.weekStart) }}
                </th>
                <td>{{ week.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </template>
  </div>
</template>

<style scoped>
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.tile {
  display: grid;
  gap: 0.2rem;
}

.tile-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.tile-value {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.charts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.charts .span-2 {
  grid-column: span 2;
}

@media (width <= 820px) {
  .charts {
    grid-template-columns: 1fr;
  }

  .charts .span-2 {
    grid-column: auto;
  }
}

.data-table {
  margin-top: 1rem;
}

.data-table summary {
  cursor: pointer;
  font-weight: 600;
}

.tables {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.875rem;
}

caption {
  text-align: left;
  font-weight: 600;
  margin-bottom: 0.4rem;
}

th,
td {
  padding: 0.3rem 0.4rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
  font-variant-numeric: tabular-nums;
}

th[scope='row'] {
  font-weight: 500;
}
</style>
