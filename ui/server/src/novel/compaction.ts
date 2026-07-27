import { openDb, ensureSqliteSchema } from './db'
import { withNovelWorkspaceMutation } from './lock'
import { compactPersistedText, compactReviewPayloadText, MAX_PERSISTED_DIAGNOSTIC_CHARS, summarizeNovelRunPipelineRefs } from './storage-compaction'


function isCanonicalEditorRevisionRun(row: any) {
  if (row.run_type !== 'editor_revision' || !row.scope_key) return false
  try {
    const checkpoint = JSON.parse(String(row.output_ref || ''))
    return checkpoint?.schema_version === 1
      && typeof checkpoint?.phase === 'string'
      && checkpoint?.phases
      && typeof checkpoint.phases === 'object'
      && typeof checkpoint?.prose_persisted === 'boolean'
  } catch {
    return false
  }
}


export async function compactNovelStorage(activeWorkspace: string, options: { vacuum?: boolean; maxChars?: number } = {}) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const maxChars = Number(options.maxChars || MAX_PERSISTED_DIAGNOSTIC_CHARS)
  const shouldVacuum = options.vacuum !== false
  const db = openDb(activeWorkspace)
  let scanned = 0
  let compacted = 0
  let committed = false
  const contextPattern = '%context_package%'
  const camelContextPattern = '%contextPackage%'
  try {
    ensureSqliteSchema(db)
    db.exec('BEGIN')

    const runRows = db.query(`
      SELECT id, run_type, scope_key, input_ref, output_ref FROM runs
      WHERE length(coalesce(input_ref,'')) > ?
        OR length(coalesce(output_ref,'')) > ?
        OR input_ref LIKE ?
        OR output_ref LIKE ?
        OR input_ref LIKE ?
        OR output_ref LIKE ?
    `).all(maxChars, maxChars, contextPattern, contextPattern, camelContextPattern, camelContextPattern) as any[]
    const updateRun = db.query('UPDATE runs SET input_ref=?, output_ref=?, pipeline_chapter_failure_count=?, pipeline_open_task_count=?, pipeline_task_count=? WHERE id=?')
    for (const row of runRows) {
      scanned += 1
      if (isCanonicalEditorRevisionRun(row)) continue
      const nextInput = compactPersistedText(row.input_ref || '', maxChars)
      const nextOutput = compactPersistedText(row.output_ref || '', maxChars)
      if (nextInput !== String(row.input_ref || '') || nextOutput !== String(row.output_ref || '')) {
        const summary = summarizeNovelRunPipelineRefs(nextInput, nextOutput)
        updateRun.run(
          nextInput,
          nextOutput,
          summary.pipeline_chapter_failure_count,
          summary.pipeline_open_task_count,
          summary.pipeline_task_count,
          row.id,
        )
        compacted += 1
      }
    }

    const reviewRows = db.query(`
      SELECT id, review_type, payload FROM reviews
      WHERE length(coalesce(payload,'')) > ?
        OR payload LIKE ?
        OR payload LIKE ?
    `).all(maxChars, contextPattern, camelContextPattern) as any[]
    const updateReview = db.query('UPDATE reviews SET payload=? WHERE id=?')
    for (const row of reviewRows) {
      scanned += 1
      const nextPayload = compactReviewPayloadText(row.payload || '', row.review_type || '', maxChars)
      if (nextPayload !== String(row.payload || '')) {
        updateReview.run(nextPayload, row.id)
        compacted += 1
      }
    }

    const chapterRows = db.query(`
      SELECT id, raw_payload FROM chapters
      WHERE length(coalesce(raw_payload,'')) > ?
        OR raw_payload LIKE ?
        OR raw_payload LIKE ?
    `).all(maxChars, contextPattern, camelContextPattern) as any[]
    const updateChapter = db.query('UPDATE chapters SET raw_payload=? WHERE id=?')
    for (const row of chapterRows) {
      scanned += 1
      const nextPayload = compactPersistedText(row.raw_payload || '{}', maxChars)
      if (nextPayload !== String(row.raw_payload || '')) {
        updateChapter.run(nextPayload, row.id)
        compacted += 1
      }
    }

    db.exec('COMMIT')
    committed = true
    if (shouldVacuum && compacted > 0) db.exec('VACUUM')
    return { scanned, compacted, vacuumed: shouldVacuum && compacted > 0, max_chars: maxChars }
  } catch (error) {
    if (!committed) {
      try { db.exec('ROLLBACK') } catch { /* transaction may already be closed */ }
    }
    throw error
  } finally {
    db.close()
  }
  })
}
