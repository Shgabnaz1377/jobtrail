import { describe, expect, it } from 'vitest'
import { safeRedirect } from '../../app/utils/routes'
import { describeApiError } from '../../app/utils/errors'

describe('safeRedirect', () => {
  it('keeps same-origin paths', () => {
    expect(safeRedirect('/applications?status=offer')).toBe('/applications?status=offer')
  })

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'board', undefined, 42])(
    'falls back for %s',
    (value) => {
      expect(safeRedirect(value, '/home')).toBe('/home')
    },
  )
})

describe('describeApiError', () => {
  it('maps zod issues to fields', () => {
    const info = describeApiError({
      data: {
        statusMessage: 'Validation failed',
        data: { issues: [{ path: 'email', message: 'Enter a valid email address' }] },
      },
    })
    expect(info).toEqual({ message: 'Validation failed', fields: { email: 'Enter a valid email address' } })
  })

  it('falls back when nothing useful is present', () => {
    expect(describeApiError(null, 'Nope')).toEqual({ message: 'Nope', fields: {} })
  })
})
