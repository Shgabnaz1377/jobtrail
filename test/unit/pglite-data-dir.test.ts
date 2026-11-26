import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { createPgliteDatabase, preparePgliteDataDir } from '../../server/db/client'

const root = mkdtempSync(join(tmpdir(), 'jobtrail-pglite-'))

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('preparePgliteDataDir', () => {
  it('passes in-memory and other URL-style locations through untouched', () => {
    expect(preparePgliteDataDir(undefined)).toBeUndefined()
    expect(preparePgliteDataDir('memory://')).toBe('memory://')
    expect(preparePgliteDataDir('idb://jobtrail')).toBe('idb://jobtrail')
  })

  it('creates missing parent folders for a filesystem path', () => {
    const nested = join(root, 'does', 'not', 'exist', 'pglite')
    expect(preparePgliteDataDir(nested)).toBe(nested)
    expect(existsSync(nested)).toBe(true)
  })
})

describe('createPgliteDatabase with a data directory', () => {
  it('works on a fresh checkout where the parent folder is missing', async () => {
    const handle = await createPgliteDatabase(join(root, 'fresh', '.data', 'pglite'))
    const result = await handle.db.execute('select 1 as ok')
    expect(result).toBeTruthy()
    await handle.close()
  })
})
