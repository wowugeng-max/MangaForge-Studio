import type { NovelRunRecord, NovelRunSummaryRecord } from '../types'
import { openDb, ensureSqliteSchema } from '../db'
import { ensureLegacyNovelStoreImportedForRead } from '../legacy-import'
import { withNovelWorkspaceMutation } from '../lock'
import { nowIso, parseDbJson } from '../json'
import { normalizeRunRecord } from '../normalize'
import { runFromRow, runSummaryFromRow } from '../row-mappers'
import { withNovelDbWrite, updateRunRow } from '../sql-rows'


export async function listNovelRuns(activeWorkspace: string, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return (db.query(`
      SELECT id, project_id, run_type, step_name, status, input_ref, output_ref, duration_ms, error_message,
        scope_key, updated_at, lease_owner, lease_expires_at, cancel_requested_at, created_at
      FROM runs
      WHERE project_id = ?
      ORDER BY created_at DESC
    `).all(projectId) as any[]).map(runFromRow)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  } finally {
    db.close()
  }
}

export async function listNovelRunSummaries(activeWorkspace: string, projectId: number, limit?: number): Promise<NovelRunSummaryRecord[]> {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const currentChapterIndexSql = `CASE
      WHEN json_type(output_ref, '$.chapters') = 'array'
        AND json_array_length(output_ref, '$.chapters') > 0
      THEN MIN(
        MAX(CAST(COALESCE(json_extract(output_ref, '$.current_index'), 0) AS INTEGER), 0),
        json_array_length(output_ref, '$.chapters') - 1
      )
      ELSE 0
    END`
    const normalizedLimit = Number.isInteger(limit) && Number(limit) > 0 ? Number(limit) : null
    const statement = db.query(`
      SELECT
        id,
        project_id,
        run_type,
        step_name,
        status,
        duration_ms,
        error_message,
        scope_key,
        updated_at,
        lease_owner,
        lease_expires_at,
        cancel_requested_at,
        created_at,
        CASE WHEN json_valid(output_ref) THEN CAST(COALESCE(
          json_extract(output_ref, '$.chapter_id'),
          json_extract(output_ref, '$.chapterId'),
          json_extract(output_ref, '$.chapter.id'),
          json_extract(output_ref, '$.result.chapter_id'),
          json_extract(output_ref, '$.result.chapterId'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].id')
        ) AS INTEGER) END AS chapter_id,
        CASE WHEN json_valid(output_ref) THEN CAST(COALESCE(
          json_extract(output_ref, '$.chapter_no'),
          json_extract(output_ref, '$.chapterNo'),
          json_extract(output_ref, '$.chapter.chapter_no'),
          json_extract(output_ref, '$.chapter.chapterNo'),
          json_extract(output_ref, '$.result.chapter_no'),
          json_extract(output_ref, '$.result.chapterNo'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].chapter_no'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].chapterNo')
        ) AS INTEGER) END AS chapter_no,
        length(CAST(COALESCE(input_ref, '') AS BLOB)) AS input_bytes,
        length(CAST(COALESCE(output_ref, '') AS BLOB)) AS output_bytes,
        CASE WHEN json_valid(output_ref) THEN COALESCE(
          json_extract(output_ref, '$.admission_status'),
          json_extract(output_ref, '$.admissionStatus'),
          json_extract(output_ref, '$.prose_admission.status'),
          json_extract(output_ref, '$.proseAdmission.status'),
          json_extract(output_ref, '$.result.admission_status'),
          json_extract(output_ref, '$.result.admissionStatus'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].admission_status'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].admissionStatus'),
          ''
        ) ELSE '' END AS admission_status,
        CASE WHEN json_valid(output_ref) THEN COALESCE(
          CASE WHEN json_type(output_ref, '$.quality_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.quality_warnings')) END,
          CASE WHEN json_type(output_ref, '$.qualityWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.qualityWarnings')) END,
          CASE WHEN json_type(output_ref, '$.prose_admission.quality_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.prose_admission.quality_warnings')) END,
          CASE WHEN json_type(output_ref, '$.proseAdmission.qualityWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.proseAdmission.qualityWarnings')) END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings')) END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].qualityWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].qualityWarnings')) END,
          0
        ) ELSE 0 END AS admission_warning_count,
        CASE WHEN json_valid(output_ref) THEN substr(COALESCE(
          json_extract(output_ref, '$.quality_warnings[0].message'),
          json_extract(output_ref, '$.qualityWarnings[0].message'),
          json_extract(output_ref, '$.prose_admission.quality_warnings[0].message'),
          json_extract(output_ref, '$.proseAdmission.qualityWarnings[0].message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings[0].message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].qualityWarnings[0].message'),
          CASE WHEN json_type(output_ref, '$.quality_warnings[0]') = 'text' THEN json_extract(output_ref, '$.quality_warnings[0]') END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings[0]') = 'text' THEN json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings[0]') END,
          ''
        ), 1, 220) ELSE '' END AS admission_warning_preview,
        CASE WHEN json_valid(output_ref) THEN COALESCE(
          json_extract(output_ref, '$.story_state_status'),
          json_extract(output_ref, '$.storyStateStatus'),
          json_extract(output_ref, '$.prose_admission.story_state_status'),
          json_extract(output_ref, '$.proseAdmission.storyStateStatus'),
          json_extract(output_ref, '$.result.story_state_status'),
          json_extract(output_ref, '$.result.storyStateStatus'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_status'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].storyStateStatus'),
          ''
        ) ELSE '' END AS story_state_status,
        CASE WHEN json_valid(output_ref) AND (
          COALESCE(
            json_extract(output_ref, '$.story_state_warning'),
            json_extract(output_ref, '$.storyStateWarning'),
            json_extract(output_ref, '$.prose_admission.story_state_warning'),
            json_extract(output_ref, '$.proseAdmission.storyStateWarning'),
            json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_warning'),
            json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].storyStateWarning')
          ) IS NOT NULL
          OR lower(COALESCE(
            json_extract(output_ref, '$.story_state_status'),
            json_extract(output_ref, '$.storyStateStatus'),
            json_extract(output_ref, '$.prose_admission.story_state_status'),
            json_extract(output_ref, '$.proseAdmission.storyStateStatus'),
            json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_status'),
            json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].storyStateStatus'),
            ''
          )) = 'pending'
        ) THEN 1 ELSE 0 END AS story_state_pending,
        CASE WHEN json_valid(output_ref) THEN substr(COALESCE(
          json_extract(output_ref, '$.story_state_warning.message'),
          json_extract(output_ref, '$.storyStateWarning.message'),
          json_extract(output_ref, '$.prose_admission.story_state_warning.message'),
          json_extract(output_ref, '$.proseAdmission.storyStateWarning.message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_warning.message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].storyStateWarning.message'),
          CASE WHEN json_type(output_ref, '$.story_state_warning') = 'text' THEN json_extract(output_ref, '$.story_state_warning') END,
          CASE WHEN json_type(output_ref, '$.storyStateWarning') = 'text' THEN json_extract(output_ref, '$.storyStateWarning') END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_warning') = 'text' THEN json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_warning') END,
          ''
        ), 1, 220) ELSE '' END AS story_state_warning,
        CASE WHEN json_valid(output_ref) THEN COALESCE(
          CASE WHEN json_type(output_ref, '$.post_commit_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.post_commit_warnings')) END,
          CASE WHEN json_type(output_ref, '$.postCommitWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.postCommitWarnings')) END,
          CASE WHEN json_type(output_ref, '$.prose_admission.post_commit_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.prose_admission.post_commit_warnings')) END,
          CASE WHEN json_type(output_ref, '$.proseAdmission.postCommitWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.proseAdmission.postCommitWarnings')) END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings')) END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].postCommitWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].postCommitWarnings')) END,
          0
        ) ELSE 0 END AS post_commit_warning_count,
        CASE WHEN json_valid(output_ref) THEN substr(COALESCE(
          json_extract(output_ref, '$.post_commit_warnings[0].message'),
          json_extract(output_ref, '$.postCommitWarnings[0].message'),
          json_extract(output_ref, '$.prose_admission.post_commit_warnings[0].message'),
          json_extract(output_ref, '$.proseAdmission.postCommitWarnings[0].message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings[0].message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].postCommitWarnings[0].message'),
          CASE WHEN json_type(output_ref, '$.post_commit_warnings[0]') = 'text' THEN json_extract(output_ref, '$.post_commit_warnings[0]') END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings[0]') = 'text' THEN json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings[0]') END,
          ''
        ), 1, 220) ELSE '' END AS post_commit_warning_preview
      FROM runs
      WHERE project_id = ?
      ORDER BY created_at DESC, id DESC
      ${normalizedLimit ? 'LIMIT ?' : ''}
    `)
    const rows = normalizedLimit ? statement.all(projectId, normalizedLimit) : statement.all(projectId)
    return (rows as any[]).map(runSummaryFromRow)
  } finally {
    db.close()
  }
}

export async function getNovelRun(activeWorkspace: string, runId: number, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const row = db.query(`
      SELECT id, project_id, run_type, step_name, status, input_ref, output_ref, duration_ms, error_message,
        scope_key, updated_at, lease_owner, lease_expires_at, cancel_requested_at, created_at
      FROM runs
      WHERE id = ? AND project_id = ?
    `).get(runId, projectId) as any
    return row ? runFromRow(row) : null
  } finally {
    db.close()
  }
}

export async function appendNovelRun(activeWorkspace: string, data: Partial<NovelRunRecord>) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const record = normalizeRunRecord(data)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const result = db.query('INSERT INTO runs (project_id,run_type,step_name,status,input_ref,output_ref,duration_ms,error_message,pipeline_chapter_failure_count,pipeline_open_task_count,pipeline_task_count,scope_key,updated_at,lease_owner,lease_expires_at,cancel_requested_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
      record.project_id,
      record.run_type,
      record.step_name,
      record.status,
      record.input_ref || '',
      record.output_ref || '',
      record.duration_ms || 0,
      record.error_message || '',
      record.pipeline_chapter_failure_count ?? 0,
      record.pipeline_open_task_count ?? 0,
      record.pipeline_task_count ?? 0,
      record.scope_key ?? null,
      record.updated_at ?? null,
      record.lease_owner ?? null,
      record.lease_expires_at ?? null,
      record.cancel_requested_at ?? null,
      record.created_at,
    ) as any
    const id = Number(result?.lastInsertRowid || (db.query('SELECT last_insert_rowid() AS id').get() as any)?.id || 0)
    return { ...record, id }
  } finally {
    db.close()
  }
  })
}

export async function updateNovelRun(activeWorkspace: string, id: number, data: Partial<NovelRunRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM runs WHERE id = ? LIMIT 1').get(id) as any
    if (!row) return null
    const next = normalizeRunRecord(data, row)
    updateRunRow(db, next)
    return next
  })
}

type NovelRunTaskStatus = 'open' | 'in_progress' | 'needs_review' | 'resolved'

type UpdateNovelRunTaskStatusInput = {
  projectId: number
  runId: number
  taskIndex: number
  status: NovelRunTaskStatus
  note?: string
  editorRevisionRunId?: number
  annotationKey?: string
  annotationStatus?: string
  now?: string
}

type UpdateNovelRunTasksStatusInput = {
  projectId: number
  runId: number
  taskIndices?: number[]
  status: NovelRunTaskStatus
  note?: string
  now?: string
}

function runTaskStatusError(code: string, message: string) {
  return Object.assign(new Error(message), { code })
}

function taskStatusSummary(tasks: any[], timestamp: string) {
  return {
    total: tasks.length,
    resolved: tasks.filter(task => task?.task_status === 'resolved').length,
    needs_review: tasks.filter(task => task?.task_status === 'needs_review').length,
    open: tasks.filter(task => !task?.task_status || task.task_status === 'open').length,
    updated_at: timestamp,
  }
}

function taskWithStatus(task: any, status: NovelRunTaskStatus, note: string, timestamp: string) {
  return {
    ...task,
    task_status: status,
    status_note: note,
    updated_at: timestamp,
    started_at: status === 'in_progress' ? timestamp : task.started_at,
    needs_review_at: status === 'needs_review' ? timestamp : task.needs_review_at,
    resolved_at: status === 'resolved' ? timestamp : task.resolved_at,
  }
}

function persistNovelRunTasks(
  db: import('bun:sqlite').Database,
  input: { projectId: number; runId: number },
  run: NovelRunRecord,
  payload: any,
  nextTasks: any[],
  timestamp: string,
) {
  const summary = taskStatusSummary(nextTasks, timestamp)
  const nextRunStatus = nextTasks.length > 0 && summary.resolved === nextTasks.length
    ? 'completed'
    : run.status === 'completed' ? 'ready' : run.status
  db.query(`
    UPDATE runs
    SET status = ?, output_ref = ?, updated_at = ?
    WHERE id = ? AND project_id = ?
  `).run(
    nextRunStatus,
    JSON.stringify({ ...payload, tasks: nextTasks, task_status_summary: summary }),
    timestamp,
    input.runId,
    input.projectId,
  )
  const updatedRow = db.query('SELECT * FROM runs WHERE id = ? AND project_id = ? LIMIT 1')
    .get(input.runId, input.projectId) as any
  return { run: runFromRow(updatedRow), task_status_summary: summary }
}

function editorRevisionClosesExactTask(db: import('bun:sqlite').Database, input: UpdateNovelRunTaskStatusInput) {
  const revisionRunId = Number(input.editorRevisionRunId || 0)
  if (!Number.isInteger(revisionRunId) || revisionRunId < 1) return false
  const row = db.query(`
    SELECT project_id, run_type, status, input_ref, output_ref
    FROM runs
    WHERE id = ? AND project_id = ?
    LIMIT 1
  `).get(revisionRunId, input.projectId) as any
  if (!row || row.run_type !== 'editor_revision' || !['completed', 'failed', 'canceled'].includes(String(row.status || ''))) {
    return false
  }
  const revisionInput = parseDbJson(row.input_ref, {})
  const checkpoint = parseDbJson(row.output_ref, {})
  const link = revisionInput?.repair_task_link
  return checkpoint?.prose_persisted === true
    && Number(link?.run_id) === input.runId
    && Number(link?.task_index) === input.taskIndex
}

export async function updateNovelRunTaskStatus(
  activeWorkspace: string,
  input: UpdateNovelRunTaskStatusInput,
) {
  const timestamp = input.now ? new Date(input.now).toISOString() : nowIso()
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM runs WHERE id = ? AND project_id = ? LIMIT 1')
      .get(input.runId, input.projectId) as any
    if (!row) throw runTaskStatusError('NOVEL_RUN_NOT_FOUND', 'run not found')
    const run = runFromRow(row)
    const payload = parseDbJson(run.output_ref, {})
    const tasks = Array.isArray(payload?.tasks) ? payload.tasks : []
    if (!Number.isInteger(input.taskIndex) || input.taskIndex < 0 || input.taskIndex >= tasks.length) {
      throw runTaskStatusError('NOVEL_RUN_TASK_NOT_FOUND', 'task not found')
    }

    const revisionRunId = Number(input.editorRevisionRunId || 0)
    if (input.editorRevisionRunId !== undefined && !editorRevisionClosesExactTask(db, input)) {
      throw runTaskStatusError('EDITOR_REVISION_TASK_CLOSURE_NOT_READY', 'editor revision task closure is not ready')
    }
    const currentTask = tasks[input.taskIndex] || {}
    const annotationKey = String(input.annotationKey || '').trim()
    const annotationStatus = String(input.annotationStatus || '').trim()
    if ((annotationKey && !annotationStatus) || (!annotationKey && annotationStatus)) {
      throw runTaskStatusError('EDITOR_REVISION_TASK_CLOSURE_INVALID', 'annotation closure receipt is incomplete')
    }
    const requiredAnnotationKey = revisionRunId && input.status === 'resolved'
      ? String(currentTask.annotation_key || '').trim()
      : ''
    if (requiredAnnotationKey && (annotationKey !== requiredAnnotationKey || annotationStatus !== 'resolved')) {
      throw runTaskStatusError('EDITOR_REVISION_TASK_CLOSURE_INVALID', 'resolved task annotation closure receipt is required')
    }

    const receiptKey = String(revisionRunId)
    const currentReceipts = currentTask.editor_revision_closure_receipts
      && typeof currentTask.editor_revision_closure_receipts === 'object'
      && !Array.isArray(currentTask.editor_revision_closure_receipts)
      ? currentTask.editor_revision_closure_receipts
      : {}
    if (revisionRunId && currentReceipts[receiptKey]) {
      const existingReceipt = currentReceipts[receiptKey]
      const sameRequest = Number(existingReceipt.editor_revision_run_id) === revisionRunId
        && String(existingReceipt.task_status || '') === input.status
        && String(existingReceipt.note ?? currentTask.status_note ?? '') === String(input.note || '')
        && String(existingReceipt.annotation_key || '') === annotationKey
        && String(existingReceipt.annotation_status || '') === annotationStatus
      const currentMatchesReceipt = String(currentTask.task_status || '') === String(existingReceipt.task_status || '')
        && String(currentTask.status_note || '') === String(existingReceipt.note || '')
      if (!sameRequest || !currentMatchesReceipt) {
        throw runTaskStatusError('EDITOR_REVISION_TASK_CLOSURE_CONFLICT', 'editor revision task closure receipt conflicts with the committed request')
      }
      return {
        run,
        task: currentTask,
        task_status_summary: payload.task_status_summary || taskStatusSummary(tasks, timestamp),
        replayed: true,
      }
    }

    const receipt = revisionRunId ? {
      editor_revision_run_id: revisionRunId,
      repair_run_id: input.runId,
      task_index: input.taskIndex,
      task_status: input.status,
      note: String(input.note || ''),
      completed_at: timestamp,
      ...(annotationKey ? { annotation_key: annotationKey, annotation_status: annotationStatus } : {}),
    } : null
    const nextTask = {
      ...taskWithStatus(currentTask, input.status, String(input.note || ''), timestamp),
      ...(receipt ? {
        editor_revision_closure_receipts: {
          ...currentReceipts,
          [receiptKey]: receipt,
        },
      } : {}),
    }
    const nextTasks = tasks.map((task: any, index: number) => index === input.taskIndex ? nextTask : task)
    const persisted = persistNovelRunTasks(db, input, run, payload, nextTasks, timestamp)
    return {
      run: persisted.run,
      task: nextTask,
      task_status_summary: persisted.task_status_summary,
      replayed: false,
    }
  }, 'update-novel-run-task-status')
}

export async function updateNovelRunTasksStatus(
  activeWorkspace: string,
  input: UpdateNovelRunTasksStatusInput,
) {
  const timestamp = input.now ? new Date(input.now).toISOString() : nowIso()
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM runs WHERE id = ? AND project_id = ? LIMIT 1')
      .get(input.runId, input.projectId) as any
    if (!row) throw runTaskStatusError('NOVEL_RUN_NOT_FOUND', 'run not found')
    const run = runFromRow(row)
    const payload = parseDbJson(run.output_ref, {})
    const tasks = Array.isArray(payload?.tasks) ? payload.tasks : []
    const requested = Array.isArray(input.taskIndices) && input.taskIndices.length > 0
      ? input.taskIndices.map(Number).filter(index => Number.isInteger(index) && index >= 0 && index < tasks.length)
      : tasks.map((_: any, index: number) => index)
    if (!requested.length) throw runTaskStatusError('NOVEL_RUN_TASKS_NOT_FOUND', 'no valid task indices')
    const selected = new Set(requested)
    const note = String(input.note || '')
    const nextTasks = tasks.map((task: any, index: number) => selected.has(index)
      ? taskWithStatus(task, input.status, note, timestamp)
      : task)
    const persisted = persistNovelRunTasks(db, input, run, payload, nextTasks, timestamp)
    return {
      run: persisted.run,
      updated_count: requested.length,
      task_status_summary: persisted.task_status_summary,
    }
  }, 'update-novel-run-tasks-status')
}
