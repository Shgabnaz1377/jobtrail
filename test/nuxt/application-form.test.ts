import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ApplicationForm from '~/components/ApplicationForm.vue'
import StatusBadge from '~/components/StatusBadge.vue'

describe('ApplicationForm', () => {
  it('shows field errors and does not submit invalid input', async () => {
    const wrapper = await mountSuspended(ApplicationForm)
    await wrapper.get('input[name=role]').setValue('Engineer')
    await wrapper.get('input[name=salaryMin]').setValue('90000')
    await wrapper.get('input[name=salaryMax]').setValue('80000')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    const errors = wrapper.findAll('.field-error').map(node => node.text())
    expect(errors).toContain('Company is required')
    expect(errors).toContain('Minimum salary must not exceed the maximum')
    expect(wrapper.get('input[name=company]').attributes('aria-invalid')).toBe('true')
  })

  it('emits parsed values on a valid submit', async () => {
    const wrapper = await mountSuspended(ApplicationForm, { props: { initial: { status: 'applied' } } })
    await wrapper.get('input[name=company]').setValue('  Northwind ')
    await wrapper.get('input[name=role]').setValue('Frontend Engineer')
    await wrapper.get('input[name=salaryMin]').setValue('70,000')
    await wrapper.get('select[name=workMode]').setValue('remote')
    await wrapper.get('form').trigger('submit')

    const values = wrapper.emitted('submit')?.[0]?.[0]
    expect(values).toMatchObject({
      company: 'Northwind',
      role: 'Frontend Engineer',
      salaryMin: 70000,
      salaryMax: null,
      workMode: 'remote',
      status: 'applied',
      location: null,
    })
  })

  it('shows server-side field errors passed in by the page', async () => {
    const wrapper = await mountSuspended(ApplicationForm, {
      props: { serverError: { message: 'Validation failed', fields: { url: 'Enter a valid link' } } },
    })
    expect(wrapper.text()).toContain('Enter a valid link')
  })
})

describe('StatusBadge', () => {
  it('renders the human label with a status class', async () => {
    const wrapper = await mountSuspended(StatusBadge, { props: { status: 'interview' } })
    expect(wrapper.text()).toBe('Interview')
    expect(wrapper.classes()).toContain('status-interview')
  })
})
