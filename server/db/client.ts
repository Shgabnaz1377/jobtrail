import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import * as schema from './schema'

/**
 * The app only uses the query surface shared by every Postgres driver, so the
 * concrete driver (PGlite locally, Neon in production) stays an implementation detail.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>

export interface DatabaseHandle {
  db: Database
  driver: 'pglite' | 'neon'
  close: () => Promise<void>
}

export const MIGRATIONS_FOLDER = resolve(process.cwd(), 'server/db/migrations')

/**
 * PGlite only creates the last path segment of a data directory, so a fresh
 * checkout with no `.data/` folder fails on its first query. Plain paths are
 * made absolute and created up front; URLs such as `memory://` pass through.
 */
export function preparePgliteDataDir(dataDir?: string): string | undefined {
  if (!dataDir || /^[a-z]+:\/\//i.test(dataDir)) return dataDir
  const absolute = resolve(process.cwd(), dataDir)
  mkdirSync(absolute, { recursive: true })
  return absolute
}

/**
 * In-process Postgres. `dataDir` is a folder path for persistence, or
 * `memory://` / undefined for a throwaway database (tests).
 */
export async function createPgliteDatabase(dataDir?: string): Promise<DatabaseHandle> {
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
    import('drizzle-orm/pglite/migrator'),
  ])
  const client = new PGlite(preparePgliteDataDir(dataDir))
  const db = drizzle({ client, schema })
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  return {
    db: db as unknown as Database,
    driver: 'pglite',
    close: () => client.close(),
  }
}

/** Serverless Postgres over HTTP. Migrations are applied separately (`npm run db:migrate`). */
export async function createNeonDatabase(url: string): Promise<DatabaseHandle> {
  const [{ neon }, { drizzle }] = await Promise.all([
    import('@neondatabase/serverless'),
    import('drizzle-orm/neon-http'),
  ])
  const db = drizzle({ client: neon(url), schema })
  return {
    db: db as unknown as Database,
    driver: 'neon',
    close: async () => {},
  }
}
