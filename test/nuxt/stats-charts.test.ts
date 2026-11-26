import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FunnelChart from '~/components/stats/FunnelChart.vue'
import StageBreakdown from '~/components/stats/StageBreakdown.vue'
import WeeklyChart from '~/components/stats/WeeklyChart.vue'

describe('FunnelChart', () => {
  it('labels every stage with its count and conversion', async () => {
    const wrapper = await mountSuspended(FunnelChart, {
      props: {
        funnel: [
          { stage: 'applied', reached: 10, conversionFromPrevious: null },
          { stage: 'interview', reached: 4, conversionFromPrevious: 0.4 },
          { stage: 'offer', reached: 1, conversionFromPrevious: 0.25 },
        ],
      },
    })
    const rows = wrapper.findAll('.step').map(row =>
      `${row.get('.stage').text()}: ${row.get('.value').text().replace(/\s+/g, ' ')}`,
    )
    expect(rows).toEqual(['Applied: 10', 'Interview: 4 · 40% of previous', 'Offer: 1 · 25% of previous'])
    expect(wrapper.findAll('.bar').map(bar => bar.attributes('style'))).toEqual([
      'width: 100%;',
      'width: 40%;',
      'width: 10%;',
    ])
  })
})

describe('StageBreakdown', () => {
  it('always shows a legend with counts so colour is never the only cue', async () => {
    const wrapper = await mountSuspended(StageBreakdown, {
      props: { byStatus: { wishlist: 2, applied: 3, interview: 0, offer: 1, rejected: 0 } },
    })
    expect(wrapper.findAll('.segment')).toHaveLength(3)
    expect(wrapper.get('.legend').text().replace(/\s+/g, ' ')).toBe('Wishlist 2 Applied 3 Interview 0 Offer 1 Rejected 0')
  })
})

describe('WeeklyChart', () => {
  const weeks = Array.from({ length: 12 }, (_, i) => ({
    weekStart: new Date(Date.UTC(2026, 0, 5 + i * 7)).toISOString().slice(0, 10),
    count: i % 3,
  }))

  it('describes itself for screen readers and draws a bar per non-empty week', async () => {
    const wrapper = await mountSuspended(WeeklyChart, { props: { weeks } })
    expect(wrapper.get('svg').attributes('aria-label')).toContain('12 weeks: 12 in total, at most 2 in one week')
    expect(wrapper.findAll('path.bar').filter(path => path.attributes('d'))).toHaveLength(8)
  })

  it('shows a tooltip for the hovered week', async () => {
    const wrapper = await mountSuspended(WeeklyChart, { props: { weeks } })
    await wrapper.findAll('rect.hit')[2]!.trigger('mouseenter')
    expect(wrapper.get('.tooltip').text()).toContain('Week of Jan 19')
    expect(wrapper.get('.tooltip').text()).toContain('2 applications')
  })
})
