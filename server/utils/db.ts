import { createNeonDatabase, createPgliteDatabase } from '../db/client'
import type { Database, DatabaseHandle } from '../db/client'

// Kept on globalThis so dev-server reloads reuse the same PGlite instance
// instead of opening the data directory twice.
const store = globalThis as typeof globalThis & { __jobtrailDb?: Promise<DatabaseHandle> }

function connect(): Promise<DatabaseHandle> {
  const url = process.env.DATABASE_URL
  if (url) return createNeonDatabase(url)
  if (process.env.VERCEL) {
    throw new Error('DATABASE_URL must be set when running on Vercel')
  }
  return createPgliteDatabase(process.env.PGLITE_DATA_DIR || '.data/pglite')
}

export async function useDb(): Promise<Database> {
  store.__jobtrailDb ??= connect().catch((error) => {
    store.__jobtrailDb = undefined
    throw error
  })
  return (await store.__jobtrailDb).db
}
