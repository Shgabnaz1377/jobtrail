import { describe, expect, it } from 'vitest'
import type { Status } from '../../shared/constants'
import { dropIndex, keyboardTarget, locate, moveCard, toColumns } from '../../app/utils/board'

const card = (id: string, status: Status, position: number) => ({ id, status, position })

const cards = [
  card('a', 'wishlist', 0),
  card('b', 'applied', 1),
  card('c', 'applied', 0),
  card('d', 'interview', 0),
]

const ids = (list: { id: string }[]) => list.map(item => item.id)

describe('toColumns', () => {
  it('groups by status and orders by position', () => {
    const columns = toColumns(cards)
    expect(ids(columns.applied)).toEqual(['c', 'b'])
    expect(columns.offer).toEqual([])
  })
})

describe('moveCard', () => {
  it('moves across columns and renumbers both', () => {
    const next = moveCard(toColumns(cards), 'c', 'interview', 0)
    expect(ids(next.applied)).toEqual(['b'])
    expect(next.applied[0]!.position).toBe(0)
    expect(next.interview.map(c => [c.id, c.status, c.position])).toEqual([['c', 'interview', 0], ['d', 'interview', 1]])
  })

  it('reorders inside a column and clamps the index', () => {
    const next = moveCard(toColumns(cards), 'c', 'applied', 50)
    expect(ids(next.applied)).toEqual(['b', 'c'])
  })

  it('does not mutate the input', () => {
    const columns = toColumns(cards)
    moveCard(columns, 'a', 'offer', 0)
    expect(ids(columns.wishlist)).toEqual(['a'])
  })

  it('ignores unknown ids', () => {
    const columns = toColumns(cards)
    expect(moveCard(columns, 'zzz', 'offer', 0)).toBe(columns)
  })
})

describe('keyboardTarget', () => {
  const columns = toColumns(cards)

  it('moves right into the next stage keeping the row where possible', () => {
    expect(keyboardTarget(columns, { status: 'applied', index: 1 }, 'ArrowRight')).toEqual({ status: 'interview', index: 1 })
    expect(keyboardTarget(columns, { status: 'wishlist', index: 0 }, 'ArrowRight')).toEqual({ status: 'applied', index: 0 })
  })

  it('stops at the outer columns', () => {
    expect(keyboardTarget(columns, { status: 'wishlist', index: 0 }, 'ArrowLeft')).toEqual({ status: 'wishlist', index: 0 })
    const rejected = moveCard(columns, 'a', 'rejected', 0)
    expect(keyboardTarget(rejected, { status: 'rejected', index: 0 }, 'ArrowRight')).toEqual({ status: 'rejected', index: 0 })
  })

  it('reorders with up, down, Home and End within bounds', () => {
    expect(keyboardTarget(columns, { status: 'applied', index: 0 }, 'ArrowUp')).toEqual({ status: 'applied', index: 0 })
    expect(keyboardTarget(columns, { status: 'applied', index: 0 }, 'ArrowDown')).toEqual({ status: 'applied', index: 1 })
    expect(keyboardTarget(columns, { status: 'applied', index: 1 }, 'ArrowDown')).toEqual({ status: 'applied', index: 1 })
    expect(keyboardTarget(columns, { status: 'applied', index: 1 }, 'Home')).toEqual({ status: 'applied', index: 0 })
    expect(keyboardTarget(columns, { status: 'applied', index: 0 }, 'End')).toEqual({ status: 'applied', index: 1 })
  })
})

describe('locate and dropIndex', () => {
  it('finds cards', () => {
    expect(locate(toColumns(cards), 'b')).toEqual({ status: 'applied', index: 1 })
    expect(locate(toColumns(cards), 'nope')).toBeNull()
  })

  it('drops before the first card whose midpoint is below the pointer', () => {
    expect(dropIndex([100, 200, 300], 50)).toBe(0)
    expect(dropIndex([100, 200, 300], 150)).toBe(1)
    expect(dropIndex([100, 200, 300], 999)).toBe(3)
    expect(dropIndex([], 10)).toBe(0)
  })
})
