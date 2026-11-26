import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ThemeToggle from '~/components/ThemeToggle.vue'

describe('ThemeToggle', () => {
  it('cycles system -> light -> dark -> system', async () => {
    const wrapper = await mountSuspended(ThemeToggle)
    const button = wrapper.get('button')
    const labels = [button.attributes('title')]
    for (let i = 0; i < 3; i++) {
      await button.trigger('click')
      labels.push(button.attributes('title'))
    }
    expect(labels).toEqual(['System theme', 'Light theme', 'Dark theme', 'System theme'])
  })

  it('has an accessible name describing the current theme', async () => {
    const wrapper = await mountSuspended(ThemeToggle)
    expect(wrapper.get('button').attributes('aria-label')).toMatch(/theme\. Switch theme$/)
  })
})
