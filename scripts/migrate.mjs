// Applies pending Drizzle migrations.
//   DATABASE_URL=postgres://... npm run db:migrate   -> Neon / any Postgres reachable over HTTP
//   npm run db:migrate                               -> local PGlite data directory
import { resolve } from 'node:path'

const migrationsFolder = resolve(import.meta.dirname, '../server/db/migrations')
const url = process.env.DATABASE_URL

if (url) {
  const { neon } = await import('@neondatabase/serverless')
  const { drizzle } = await import('drizzle-orm/neon-http')
  const { migrate } = await import('drizzle-orm/neon-http/migrator')
  await migrate(drizzle({ client: neon(url) }), { migrationsFolder })
  console.log('Migrations applied to DATABASE_URL')
}
else {
  const dataDir = process.env.PGLITE_DATA_DIR || '.data/pglite'
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const { migrate } = await import('drizzle-orm/pglite/migrator')
  const client = new PGlite(dataDir)
  await migrate(drizzle({ client }), { migrationsFolder })
  await client.close()
  console.log(`Migrations applied to PGlite at ${dataDir}`)
}
