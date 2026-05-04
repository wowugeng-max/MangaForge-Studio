import { access, readFile } from 'fs/promises'
import { join } from 'path'
import { createClient } from '@libsql/client'

async function checkFile(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function main() {
  const dbUrl = process.env.SQLITE_DATABASE_URL || process.env.DATABASE_URL || `file:${join(process.cwd(), '..', 'workspace', 'novel.sqlite')}`
  const workspace = process.env.NOVEL_WORKSPACE || join(process.cwd(), 'workspace')
  const storePath = join(workspace, 'novel-store.json')

  const checks = {
    workspaceExists: await checkFile(workspace),
    storeExists: await checkFile(storePath),
    dbConfigured: Boolean(dbUrl),
    dbConnected: false,
    storeReadable: false,
    storeParsed: false,
    schemaTables: false,
  }

  let store: any = null

  if (checks.storeExists) {
    try {
      const raw = await readFile(storePath, 'utf8')
      checks.storeReadable = true
      store = JSON.parse(raw)
      checks.storeParsed = true
    } catch {
      // handled below in output
    }
  }

  if (dbUrl) {
    const client = createClient({ url: dbUrl })
    try {
      await client.execute('SELECT 1')
      checks.dbConnected = true
      const result = await client.execute(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN ('projects', 'worldbuilding', 'characters', 'outlines', 'chapters', 'reviews', 'runs')
      `)
      checks.schemaTables = result.rows.length >= 7
    } finally {
      client.close()
    }
  }

  const summary = {
    ok: checks.workspaceExists && checks.storeExists && checks.storeReadable && checks.storeParsed && checks.dbConfigured && checks.dbConnected && checks.schemaTables,
    workspace,
    storePath,
    dbUrl,
    checks,
    counts: store
      ? {
          projects: Array.isArray(store.projects) ? store.projects.length : 0,
          worldbuilding: Array.isArray(store.worldbuilding) ? store.worldbuilding.length : 0,
          characters: Array.isArray(store.characters) ? store.characters.length : 0,
          outlines: Array.isArray(store.outlines) ? store.outlines.length : 0,
          chapters: Array.isArray(store.chapters) ? store.chapters.length : 0,
          reviews: Array.isArray(store.reviews) ? store.reviews.length : 0,
          runs: Array.isArray(store.runs) ? store.runs.length : 0,
        }
      : null,
  }

  console.log(JSON.stringify(summary, null, 2))

  if (!summary.ok) {
    process.exitCode = 1
  }
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
