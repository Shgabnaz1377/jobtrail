import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import KanbanBoard from '~/components/KanbanBoard.vue'
import type { KanbanCardData } from '~/components/KanbanCard.vue'

function card(id: string, company: string, status: KanbanCardData['status'], position: number): KanbanCardData {
  return {
    id,
    company,
    status,
    position,
    role: 'Engineer',
    location: null,
    workMode: 'remote',
    salaryMin: null,
    salaryMax: null,
    currency: 'EUR',
  }
}

const cards = [
  card('1', 'Acme', 'applied', 0),
  card('2', 'Globex', 'applied', 1),
  card('3', 'Initech', 'interview', 0),
]

async function mountBoard() {
  return mountSuspended(KanbanBoard, { props: { cards }, attachTo: document.body })
}

const companiesIn = (wrapper: Awaited<ReturnType<typeof mountBoard>>, status: string) =>
  wrapper.findAll(`.column-${status} .company`).map(node => node.text())

describe('KanbanBoard', () => {
  it('renders one column per stage with counts', async () => {
    const wrapper = await mountBoard()
    expect(wrapper.findAll('.column')).toHaveLength(5)
    expect(wrapper.get('#column-applied-title').text()).toContain('2')
    expect(companiesIn(wrapper, 'applied')).toEqual(['Acme', 'Globex'])
    wrapper.unmount()
  })

  it('moves a card with the keyboard and emits the final position on drop', async () => {
    const wrapper = await mountBoard()
    const handle = () => wrapper.get('[data-card-handle="1"]')

    await handle().trigger('keydown', { key: ' ' })
    expect(handle().attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('Picked up Acme')

    await handle().trigger('keydown', { key: 'ArrowRight' })
    expect(companiesIn(wrapper, 'interview')).toEqual(['Acme', 'Initech'])
    await handle().trigger('keydown', { key: 'ArrowDown' })
    expect(companiesIn(wrapper, 'interview')).toEqual(['Initech', 'Acme'])
    expect(wrapper.emitted('move')).toBeUndefined()

    await handle().trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('move')).toEqual([[{ id: '1', status: 'interview', position: 1 }]])
    expect(wrapper.text()).toContain('Dropped Acme in Interview, position 2 of 2')
    wrapper.unmount()
  })

  it('restores the original order when the move is cancelled', async () => {
    const wrapper = await mountBoard()
    const handle = () => wrapper.get('[data-card-handle="2"]')

    await handle().trigger('keydown', { key: 'Enter' })
    await handle().trigger('keydown', { key: 'ArrowLeft' })
    expect(companiesIn(wrapper, 'wishlist')).toEqual(['Globex'])
    await handle().trigger('keydown', { key: 'Escape' })

    expect(companiesIn(wrapper, 'applied')).toEqual(['Acme', 'Globex'])
    expect(wrapper.emitted('move')).toBeUndefined()
    wrapper.unmount()
  })

  it('offers a stage picker that moves the card to the end of the new column', async () => {
    const wrapper = await mountBoard()
    await wrapper.get('.column-applied [data-card-id="1"] select').setValue('interview')
    expect(wrapper.emitted('move')).toEqual([[{ id: '1', status: 'interview', position: 1 }]])
    expect(companiesIn(wrapper, 'interview')).toEqual(['Initech', 'Acme'])
    wrapper.unmount()
  })
})
