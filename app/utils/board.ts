import { STATUSES } from '#shared/constants'
import type { Status } from '#shared/constants'

export interface BoardCard {
  id: string
  status: Status
  position: number
}

export type Columns<T extends BoardCard> = Record<Status, T[]>

/** Groups cards into one ordered list per stage. */
export function toColumns<T extends BoardCard>(cards: readonly T[]): Columns<T> {
  const columns = Object.fromEntries(STATUSES.map(status => [status, [] as T[]])) as Columns<T>
  for (const card of cards) columns[card.status].push(card)
  for (const status of STATUSES) columns[status].sort((a, b) => a.position - b.position)
  return columns
}

export interface CardLocation {
  status: Status
  index: number
}

export function locate<T extends BoardCard>(columns: Columns<T>, id: string): CardLocation | null {
  for (const status of STATUSES) {
    const index = columns[status].findIndex(card => card.id === id)
    if (index !== -1) return { status, index }
  }
  return null
}

/**
 * Returns new columns with the card moved to `status` at `index` (clamped).
 * Positions are rewritten to match the new order, mirroring the server.
 */
export function moveCard<T extends BoardCard>(columns: Columns<T>, id: string, status: Status, index: number): Columns<T> {
  const from = locate(columns, id)
  if (!from) return columns
  const card = columns[from.status][from.index]!

  const next = { ...columns }
  next[from.status] = columns[from.status].filter(item => item.id !== id)
  const target = from.status === status ? next[from.status] : [...columns[status]]
  const clamped = Math.max(0, Math.min(index, target.length))
  target.splice(clamped, 0, { ...card, status })
  next[status] = target.map((item, position) => ({ ...item, position }))
  if (from.status !== status) {
    next[from.status] = next[from.status].map((item, position) => ({ ...item, position }))
  }
  return next
}

export type KeyboardMove = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End'

/**
 * Where a grabbed card goes for an arrow key. Left/right change stage and keep
 * the row where possible; up/down reorder inside the stage.
 */
export function keyboardTarget<T extends BoardCard>(
  columns: Columns<T>,
  current: CardLocation,
  key: KeyboardMove,
): CardLocation {
  const column = STATUSES.indexOf(current.status)
  const lengthOf = (status: Status, includesCard: boolean) => columns[status].length - (includesCard ? 1 : 0)

  switch (key) {
    case 'ArrowLeft':
    case 'ArrowRight': {
      const nextColumn = column + (key === 'ArrowLeft' ? -1 : 1)
      if (nextColumn < 0 || nextColumn >= STATUSES.length) return current
      const status = STATUSES[nextColumn]!
      return { status, index: Math.min(current.index, lengthOf(status, false)) }
    }
    case 'ArrowUp':
      return { ...current, index: Math.max(0, current.index - 1) }
    case 'ArrowDown':
      return { ...current, index: Math.min(lengthOf(current.status, true), current.index + 1) }
    case 'Home':
      return { ...current, index: 0 }
    case 'End':
      return { ...current, index: lengthOf(current.status, true) }
  }
}

/**
 * Index at which a dragged card should land, given the vertical midpoints of
 * the other cards in the column and the pointer's Y coordinate.
 */
export function dropIndex(midpoints: readonly number[], pointerY: number): number {
  const index = midpoints.findIndex(mid => pointerY < mid)
  return index === -1 ? midpoints.length : index
}
