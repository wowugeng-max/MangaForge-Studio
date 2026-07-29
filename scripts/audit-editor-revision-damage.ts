import { stat } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { Database } from 'bun:sqlite'
import { detectEditorRevisionDamage } from '../ui/server/src/novel/editor-revision-damage-audit'
import {
  chapterFromRow,
  chapterVersionFromRow,
  reviewFromRow,
  runFromRow,
} from '../ui/server/src/novel/row-mappers'

type CliOptions = {
  workspace: string
  projectId: number | null
}

function argumentError(message: string): never {
  throw new Error(message)
}

function optionValue(args: string[], index: number, flag: string) {
  const value = args[index + 1]
  if (!value || value.startsWith('--')) argumentError(`${flag} requires a value`)
  return value
}

function parseProjectId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) argumentError('--project-id must be a positive integer')
  const projectId = Number(value)
  if (!Number.isSafeInteger(projectId)) argumentError('--project-id must be a positive integer')
  return projectId
}

function parseArgs(args: string[]): CliOptions {
  let workspace = ''
  let projectId: number | null = null

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index]
    if (/^--.*(?:restore|apply)/i.test(flag)) {
      argumentError(`restore/apply operations are not supported: ${flag}`)
    }
    if (flag === '--workspace') {
      if (workspace) argumentError('--workspace may only be provided once')
      workspace = optionValue(args, index, flag)
      index += 1
      continue
    }
    if (flag === '--project-id') {
      if (projectId !== null) argumentError('--project-id may only be provided once')
      projectId = parseProjectId(optionValue(args, index, flag))
      index += 1
      continue
    }
    argumentError(`unknown flag: ${flag}`)
  }

  if (!workspace) argumentError('--workspace is required')
  if (!isAbsolute(workspace)) argumentError('--workspace must be an absolute path')
  return { workspace, projectId }
}

async function requireNovelDatabase(workspace: string) {
  const dbPath = join(workspace, 'novel.sqlite')
  try {
    const details = await stat(dbPath)
    if (!details.isFile()) argumentError(`novel.sqlite is not a file: ${dbPath}`)
  } catch (error: any) {
    if (error?.code === 'ENOENT') argumentError(`novel.sqlite not found: ${dbPath}`)
    throw error
  }
  return dbPath
}

function auditDatabase(dbPath: string, projectId: number | null) {
  const db = new Database(dbPath, { readonly: true })
  try {
    if (projectId === null) {
      db.query('SELECT id FROM projects ORDER BY id').all()
      return detectEditorRevisionDamage({
        chapters: (db.query('SELECT * FROM chapters ORDER BY project_id, chapter_no, id').all() as any[]).map(chapterFromRow),
        versions: (db.query('SELECT * FROM chapter_versions ORDER BY project_id, chapter_id, version_no, id').all() as any[]).map(chapterVersionFromRow),
        reviews: (db.query('SELECT * FROM reviews ORDER BY project_id, created_at, id').all() as any[]).map(reviewFromRow),
        runs: (db.query('SELECT * FROM runs ORDER BY project_id, created_at, id').all() as any[]).map(runFromRow),
      })
    }

    db.query('SELECT id FROM projects WHERE id = ? ORDER BY id').all(projectId)
    return detectEditorRevisionDamage({
      chapters: (db.query('SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_no, id').all(projectId) as any[]).map(chapterFromRow),
      versions: (db.query('SELECT * FROM chapter_versions WHERE project_id = ? ORDER BY chapter_id, version_no, id').all(projectId) as any[]).map(chapterVersionFromRow),
      reviews: (db.query('SELECT * FROM reviews WHERE project_id = ? ORDER BY created_at, id').all(projectId) as any[]).map(reviewFromRow),
      runs: (db.query('SELECT * FROM runs WHERE project_id = ? ORDER BY created_at, id').all(projectId) as any[]).map(runFromRow),
    })
  } finally {
    db.close()
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const dbPath = await requireNovelDatabase(options.workspace)
  const evidence = auditDatabase(dbPath, options.projectId)
  const result = {
    workspace: options.workspace,
    project_id: options.projectId,
    damaged_count: evidence.length,
    evidence,
    restore_performed: false,
  }
  console.log(JSON.stringify(result, null, 2))
}

try {
  await main()
} catch (error: any) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
