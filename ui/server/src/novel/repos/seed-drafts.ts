import type { NovelProjectSeedDraftRecord } from '../types'
import { openDb, ensureSqliteSchema } from '../db'
import { jsonText } from '../json'
import { withNovelWorkspaceMutation } from '../lock'
import { normalizeProjectSeedDraftRecord } from '../normalize'
import { projectSeedDraftFromRow } from '../row-mappers'


export async function listNovelProjectSeedDrafts(activeWorkspace: string) {
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const rows = db.query('SELECT * FROM project_seed_drafts ORDER BY updated_at DESC, id DESC').all() as any[]
    return rows.map(projectSeedDraftFromRow)
  } finally {
    db.close()
  }
}

export async function createNovelProjectSeedDraft(activeWorkspace: string, data: Partial<NovelProjectSeedDraftRecord>) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const draft = normalizeProjectSeedDraftRecord(data)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const result = db.query('INSERT INTO project_seed_drafts (title,idea,seed,review_model,diagnostics,model_id,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
      draft.title,
      draft.idea || '',
      jsonText(draft.seed, {}),
      jsonText(draft.review_model, {}),
      jsonText(draft.diagnostics, {}),
      draft.model_id ?? null,
      draft.source || 'deep_draft',
      draft.created_at,
      draft.updated_at,
    ) as any
    const id = Number(result?.lastInsertRowid || (db.query('SELECT last_insert_rowid() AS id').get() as any)?.id || 0)
    const row = db.query('SELECT * FROM project_seed_drafts WHERE id=?').get(id) as any
    return projectSeedDraftFromRow(row)
  } finally {
    db.close()
  }
  })
}

export async function deleteNovelProjectSeedDraft(activeWorkspace: string, id: number) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const result = db.query('DELETE FROM project_seed_drafts WHERE id=?').run(id) as any
    return Number(result?.changes || 0) > 0
  } finally {
    db.close()
  }
  })
}
