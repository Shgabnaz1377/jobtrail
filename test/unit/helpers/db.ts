import { createPgliteDatabase } from '../../../server/db/client'
import type { DatabaseHandle } from '../../../server/db/client'

/** A fresh, fully migrated in-memory Postgres for one test file. */
export function createTestDatabase(): Promise<DatabaseHandle> {
  return createPgliteDatabase()
}
