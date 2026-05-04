import { readFile } from 'fs/promises'
import { join } from 'path'
import { createClient } from '@libsql/client'

type NovelStore = {
  projects: any[]
  worldbuilding: any[]
  characters: any[]
  outlines: any[]
  chapters: any[]
  reviews: any[]
  runs: any[]
}

function parseJsonArray(value: any, fallback: any[] = []) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : fallback
    } catch {
      return fallback
    }
  }
  return fallback
}

function toText(value: any, fallback = '') {
  return value == null ? fallback : String(value)
}

function toNumber(value: any, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function nowIso() {
  return new Date().toISOString()
}

async function loadNovelStore(activeWorkspace: string): Promise<NovelStore> {
  const raw = await readFile(join(activeWorkspace, 'novel-store.json'), 'utf8')
  const parsed = JSON.parse(raw)
  return {
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    worldbuilding: Array.isArray(parsed.worldbuilding) ? parsed.worldbuilding : [],
    characters: Array.isArray(parsed.characters) ? parsed.characters : [],
    outlines: Array.isArray(parsed.outlines) ? parsed.outlines : [],
    chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
    reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
    runs: Array.isArray(parsed.runs) ? parsed.runs : [],
  }
}

async function main() {
  const dbUrl = process.env.SQLITE_DATABASE_URL || process.env.DATABASE_URL || ''
  const workspace = process.env.NOVEL_WORKSPACE || join(process.cwd(), 'workspace')

  if (!dbUrl) {
    throw new Error('Missing SQLITE_DATABASE_URL or DATABASE_URL')
  }

  const client = createClient({ url: dbUrl })
  const store = await loadNovelStore(workspace)
  const importedAt = nowIso()

  await client.execute('BEGIN')
  try {
    for (const project of store.projects) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO projects (id, title, genre, sub_genres, length_target, target_audience, style_tags, commercial_tags, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          toNumber(project.id),
          toText(project.title, '未命名小说'),
          toText(project.genre),
          JSON.stringify(parseJsonArray(project.sub_genres)),
          toText(project.length_target, 'medium'),
          toText(project.target_audience),
          JSON.stringify(parseJsonArray(project.style_tags)),
          JSON.stringify(parseJsonArray(project.commercial_tags)),
          toText(project.status, 'draft'),
          toText(project.created_at, importedAt),
          toText(project.updated_at, importedAt),
        ],
      })
    }

    for (const item of store.worldbuilding) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO worldbuilding (id, project_id, world_summary, rules, factions, locations, systems, timeline_anchor, known_unknowns, version, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          toNumber(item.id),
          toNumber(item.project_id),
          toText(item.world_summary),
          JSON.stringify(parseJsonArray(item.rules)),
          JSON.stringify(parseJsonArray(item.factions)),
          JSON.stringify(parseJsonArray(item.locations)),
          JSON.stringify(parseJsonArray(item.systems)),
          toText(item.timeline_anchor),
          JSON.stringify(parseJsonArray(item.known_unknowns)),
          toNumber(item.version, 1),
          toText(item.created_at, importedAt),
          toText(item.updated_at, importedAt),
        ],
      })
    }

    for (const item of store.characters) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO characters (id, project_id, name, role_type, archetype, motivation, goal, conflict, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          toNumber(item.id),
          toNumber(item.project_id),
          toText(item.name, '未命名角色'),
          toText(item.role_type),
          toText(item.archetype),
          toText(item.motivation),
          toText(item.goal),
          toText(item.conflict),
          toText(item.created_at, importedAt),
          toText(item.updated_at, importedAt),
        ],
      })
    }

    for (const item of store.outlines) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO outlines (id, project_id, outline_type, title, summary, conflict_points, turning_points, hook, parent_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          toNumber(item.id),
          toNumber(item.project_id),
          toText(item.outline_type, 'master'),
          toText(item.title, '未命名大纲'),
          toText(item.summary),
          JSON.stringify(parseJsonArray(item.conflict_points)),
          JSON.stringify(parseJsonArray(item.turning_points)),
          toText(item.hook),
          item.parent_id == null ? null : toNumber(item.parent_id),
          toText(item.created_at, importedAt),
          toText(item.updated_at, importedAt),
        ],
      })
    }

    for (const item of store.chapters) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO chapters (id, project_id, outline_id, chapter_no, title, chapter_goal, chapter_summary, conflict, ending_hook, chapter_text, scene_breakdown, continuity_notes, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          toNumber(item.id),
          toNumber(item.project_id),
          item.outline_id == null ? null : toNumber(item.outline_id),
          toNumber(item.chapter_no, 1),
          toText(item.title, '第一章'),
          toText(item.chapter_goal),
          toText(item.chapter_summary),
          toText(item.conflict),
          toText(item.ending_hook),
          toText(item.chapter_text),
          JSON.stringify(parseJsonArray(item.scene_breakdown)),
          JSON.stringify(parseJsonArray(item.continuity_notes)),
          toText(item.status, 'draft'),
          toText(item.created_at, importedAt),
          toText(item.updated_at, importedAt),
        ],
      })
    }

    for (const item of store.reviews) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO reviews (id, project_id, review_type, status, summary, issues, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          toNumber(item.id),
          toNumber(item.project_id),
          toText(item.review_type, 'continuity'),
          toText(item.status, 'ok'),
          toText(item.summary),
          JSON.stringify(parseJsonArray(item.issues)),
          toText(item.created_at, importedAt),
        ],
      })
    }

    for (const item of store.runs) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO runs (id, project_id, run_type, step_name, status, input_ref, output_ref, duration_ms, error_message, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          toNumber(item.id),
          toNumber(item.project_id),
          toText(item.run_type, 'plan'),
          toText(item.step_name, 'step'),
          toText(item.status, 'pending'),
          toText(item.input_ref),
          toText(item.output_ref),
          toNumber(item.duration_ms, 0),
          toText(item.error_message),
          toText(item.created_at, importedAt),
        ],
      })
    }

    await client.execute('COMMIT')
    console.log('Import complete')
    console.log(`Projects: ${store.projects.length}`)
    console.log(`Worldbuilding: ${store.worldbuilding.length}`)
    console.log(`Characters: ${store.characters.length}`)
    console.log(`Outlines: ${store.outlines.length}`)
    console.log(`Chapters: ${store.chapters.length}`)
    console.log(`Reviews: ${store.reviews.length}`)
    console.log(`Runs: ${store.runs.length}`)
  } catch (error) {
    await client.execute('ROLLBACK')
    throw error
  } finally {
    client.close()
  }
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
