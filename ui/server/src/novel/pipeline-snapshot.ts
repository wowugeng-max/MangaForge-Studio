import * as core from './core'
import type * as T from './types'

const {
  nowIso, openDb, ensureSqliteSchema, ensureLegacyNovelStoreImportedForRead, withNovelDbWrite, withNovelWorkspaceMutation,
  importLegacyNovelStoreIfNeeded, nextTableId, nextChapterVersionNo, createChapterVersionRecord, versionedChapterSnapshotChanged,
  projectFromRow, worldbuildingFromRow, characterFromRow, outlineFromRow, chapterFromRow, chapterVersionFromRow,
  reviewFromRow, reviewSummaryFromRow, runSummaryFromRow, settingEntityFromRow, chapterSettingUsageFromRow, projectSeedDraftFromRow,
  normalizeProjectRecord, normalizeWorldbuildingRecord, normalizeCharacterRecord, normalizeOutlineRecord, normalizeChapterRecord,
  normalizeReviewRecord, normalizeRunRecord, normalizeProjectSeedDraftRecord, normalizeSettingEntityRecord, normalizeChapterSettingUsageRecord,
  insertProjectRow, updateProjectRow, insertWorldbuildingRow, updateWorldbuildingRow, insertCharacterRow, updateCharacterRow,
  insertOutlineRow, updateOutlineRow, insertChapterRow, updateChapterRow, insertChapterVersionRow, insertSettingEntityRow,
  updateSettingEntityRow, insertChapterSettingUsageRow, updateChapterSettingUsageRow, updateRunRow, dedupById, jsonText, textValue,
  parseDbJson, compactRawPayloadForStorage, compactPersistedText, compactReviewPayloadText, sanitizeJsonValue, NESTED_STORAGE_KEYS,
  MAX_PERSISTED_DIAGNOSTIC_CHARS, summarizeNovelRunPipelineRefs, toAnyArray, outlineChapterNo, cleanChapterPlanTitle,
  chapterPlanOutlineTitle, chapterPlanOutlineSummary, loadAcceptanceWorkingSet, persistNovelChapterAcceptanceDelta,
  NOVEL_PIPELINE_SQL_TRIM_CHARS, NOVEL_PIPELINE_CHAPTER_REVIEW_TYPES, NOVEL_PIPELINE_GOVERNANCE_REVIEW_TYPES,
  NOVEL_PIPELINE_BATCH_RUN_TYPES, NOVEL_PIPELINE_REPAIR_RUN_TYPES, NOVEL_PIPELINE_GOVERNANCE_RUN_TYPES,
  pipelineJsonTruthySql, pipelineAnyJsonTruthySql, pipelineJsonAnchorTruthySql, projectNovelPipelineReview, pipelineReviewArray,
  pipelineReviewText, nullableSqliteBoolean,
} = core as any

type NovelProjectRecord = T.NovelProjectRecord
type NovelWorldbuildingRecord = T.NovelWorldbuildingRecord
type NovelCharacterRecord = T.NovelCharacterRecord
type NovelOutlineRecord = T.NovelOutlineRecord
type NovelChapterRecord = T.NovelChapterRecord
type NovelChapterWorkspaceRecord = T.NovelChapterWorkspaceRecord
type NovelChapterVersionRecord = T.NovelChapterVersionRecord
type NovelReviewRecord = T.NovelReviewRecord
type NovelReviewSummaryRecord = T.NovelReviewSummaryRecord
type NovelRunRecord = T.NovelRunRecord
type NovelRunSummaryRecord = T.NovelRunSummaryRecord
type NovelProjectSeedDraftRecord = T.NovelProjectSeedDraftRecord
type NovelSettingEntityRecord = T.NovelSettingEntityRecord
type NovelChapterSettingUsageRecord = T.NovelChapterSettingUsageRecord
type UpdateNovelChapterOptions = T.UpdateNovelChapterOptions
type NovelChapterAcceptanceInput = T.NovelChapterAcceptanceInput
type NovelPipelineSnapshot = T.NovelPipelineSnapshot
type NovelReferenceConfig = T.NovelReferenceConfig

export async function getNovelPipelineSnapshot(activeWorkspace: string, projectId: number): Promise<NovelPipelineSnapshot | null> {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const projectRow = db.query(`
      SELECT
        id,
        title,
        CASE WHEN length(trim(COALESCE(synopsis, ''), ${NOVEL_PIPELINE_SQL_TRIM_CHARS})) > 0 THEN '[pipeline-present]' ELSE '' END AS synopsis,
        ${pipelineAnyJsonTruthySql('reference_config', [
          '$.writing_bible.reader_promise', '$.writing_bible.readerPromise', '$.writing_bible.promise',
          '$.writing_bible.reader_hook', '$.writing_bible.readerHook',
        ])} AS pipeline_reader_promise,
        ${pipelineAnyJsonTruthySql('reference_config', [
          '$.writing_bible.protagonist_drive', '$.writing_bible.protagonistDrive', '$.writing_bible.protagonist_motivation',
          '$.writing_bible.main_character_drive', '$.writing_bible.hero_drive', '$.writing_bible.motivation',
        ])} AS pipeline_protagonist_drive,
        ${pipelineAnyJsonTruthySql('reference_config', [
          '$.writing_bible.core_conflict', '$.writing_bible.coreConflict', '$.writing_bible.main_conflict',
          '$.writing_bible.conflict_axis', '$.writing_bible.longform_conflict',
        ])} AS pipeline_core_conflict,
        ${pipelineAnyJsonTruthySql('reference_config', [
          '$.writing_bible.current_volume_goal', '$.writing_bible.currentVolumeGoal', '$.writing_bible.volume_goal',
          '$.writing_bible.first_volume_goal', '$.writing_bible.stage_goal',
        ])} AS pipeline_volume_goal,
        ${pipelineAnyJsonTruthySql('reference_config', [
          '$.writing_bible.innovation_hook', '$.writing_bible.innovationHook', '$.writing_bible.original_hook',
          '$.writing_bible.unique_selling_point', '$.writing_bible.selling_point', '$.writing_bible.freshness_hook',
        ])} AS pipeline_innovation_hook,
        ${pipelineAnyJsonTruthySql('reference_config', [
          '$.writing_bible.first30_plan', '$.writing_bible.first30Plan', '$.writing_bible.first_30_plan',
          '$.writing_bible.opening_strategy', '$.writing_bible.retention_plan', '$.writing_bible.first_thirty_plan',
        ])} AS pipeline_first30_plan,
        ${pipelineAnyJsonTruthySql('reference_config', [
          '$.writing_bible.longform_capacity', '$.writing_bible.longformCapacity', '$.writing_bible.million_word_spine',
          '$.writing_bible.longform_spine', '$.writing_bible.serial_engine', '$.writing_bible.longform_engine',
        ])} AS pipeline_longform_capacity,
        CASE WHEN
          ${pipelineJsonTruthySql('reference_config', '$.writing_bible.world_summary')}
          OR ${pipelineJsonTruthySql('reference_config', '$.writing_bible.worldSummary')}
          OR ${pipelineJsonAnchorTruthySql('reference_config', '$.writing_bible.world_rules')}
        THEN 1 ELSE 0 END AS pipeline_world_anchor,
        CASE WHEN json_valid(reference_config)
          AND json_type(reference_config, '$.writing_bible.characters') = 'array'
          AND EXISTS (
            SELECT 1
            FROM json_each(reference_config, '$.writing_bible.characters') AS character
            WHERE ${pipelineJsonTruthySql('character.value', '$.name')}
              OR ${pipelineJsonTruthySql('character.value', '$.goal')}
              OR ${pipelineJsonTruthySql('character.value', '$.desire')}
              OR ${pipelineJsonTruthySql('character.value', '$.arc')}
          )
        THEN 1 ELSE 0 END AS pipeline_character_anchor,
        CASE WHEN json_valid(reference_config) THEN CAST(json_extract(reference_config, '$.story_state.last_updated_chapter') AS INTEGER) ELSE 0 END AS pipeline_story_state_chapter,
        updated_at
      FROM projects
      WHERE id = ?
      LIMIT 1
    `).get(projectId) as any
    if (!projectRow) return null
    const project = {
      id: Number(projectRow.id || 0),
      title: String(projectRow.title || ''),
      synopsis: String(projectRow.synopsis || ''),
      reference_config: {
        writing_bible: {
          reader_promise: projectRow.pipeline_reader_promise ? '[pipeline-present]' : '',
          protagonist_drive: projectRow.pipeline_protagonist_drive ? '[pipeline-present]' : '',
          core_conflict: projectRow.pipeline_core_conflict ? '[pipeline-present]' : '',
          current_volume_goal: projectRow.pipeline_volume_goal ? '[pipeline-present]' : '',
          innovation_hook: projectRow.pipeline_innovation_hook ? '[pipeline-present]' : '',
          first30_plan: projectRow.pipeline_first30_plan ? '[pipeline-present]' : '',
          longform_capacity: projectRow.pipeline_longform_capacity ? '[pipeline-present]' : '',
          world_summary: projectRow.pipeline_world_anchor ? '[pipeline-present]' : '',
          characters: projectRow.pipeline_character_anchor ? [{ name: '[pipeline-present]' }] : [],
        },
        story_state: { last_updated_chapter: Number(projectRow.pipeline_story_state_chapter || 0) },
      },
      updated_at: String(projectRow.updated_at || ''),
    } as NovelProjectRecord

    const chapters = (db.query(`
      SELECT
        id,
        project_id,
        chapter_no,
        title,
        chapter_goal,
        chapter_summary,
        conflict,
        ending_hook,
        CASE
          WHEN length(trim(
            COALESCE(chapter_text, ''),
            char(9) || char(10) || char(11) || char(12) || char(13) || char(32) || char(160) || char(5760)
              || char(8192) || char(8193) || char(8194) || char(8195) || char(8196) || char(8197)
              || char(8198) || char(8199) || char(8200) || char(8201) || char(8202) || char(8232)
              || char(8233) || char(8239) || char(8287) || char(12288) || char(65279)
          )) = 0 THEN ''
          WHEN instr(chapter_text, '【占位正文】') > 0 THEN '【占位正文】'
          ELSE '[pipeline-prose-present]'
        END AS chapter_text,
        CASE
          WHEN json_valid(raw_payload) THEN json_object(
            'scene_cards', CASE
              WHEN json_type(raw_payload, '$.scene_cards') = 'array' AND json_array_length(raw_payload, '$.scene_cards') > 0
                THEN json_array(json_object('pipeline_signal', 1))
              ELSE json('[]')
            END,
            'scenes', CASE
              WHEN json_type(raw_payload, '$.scenes') = 'array' AND json_array_length(raw_payload, '$.scenes') > 0
                THEN json_array(json_object('pipeline_signal', 1))
              ELSE json('[]')
            END,
            'pre_draft_brief', CASE
              WHEN ${pipelineJsonTruthySql('raw_payload', '$.pre_draft_brief')}
                THEN json_object('pipeline_signal', 1)
              ELSE NULL
            END
          )
          ELSE '{}'
        END AS raw_payload,
        updated_at
      FROM chapters
      WHERE project_id = ?
      ORDER BY chapter_no ASC
    `).all(projectId) as any[]).map(chapterFromRow)

    const targetChapter = chapters.find(chapter => !chapter.chapter_text || chapter.chapter_text.includes('【占位正文】'))
      || chapters[chapters.length - 1]
      || null
    const targetChapterId = Number(targetChapter?.id || 0)

    const outlines = (db.query(`
      SELECT
        id,
        project_id,
        title,
        CASE
          WHEN json_valid(raw_payload) THEN json_object(
            'chapter_no', json_extract(raw_payload, '$.chapter_no'),
            'future100', json_object('chapter_no', json_extract(raw_payload, '$.future100.chapter_no')),
            'skeleton', json_object('chapter_no', json_extract(raw_payload, '$.skeleton.chapter_no')),
            'rollingPlan', json_object('chapter_no', json_extract(raw_payload, '$.rollingPlan.chapter_no'))
          )
          ELSE '{}'
        END AS raw_payload
      FROM outlines
      WHERE project_id = ?
    `).all(projectId) as any[]).map(outlineFromRow)

    const worldbuilding = (db.query(`
      SELECT id, project_id, world_summary, rules, systems
      FROM worldbuilding
      WHERE project_id = ?
    `).all(projectId) as any[]).map(worldbuildingFromRow)

    const characters = (db.query(`
      SELECT id, project_id, name, goal, motivation, current_state
      FROM characters
      WHERE project_id = ?
    `).all(projectId) as any[]).map(characterFromRow)

    const chapterReviewPlaceholders = NOVEL_PIPELINE_CHAPTER_REVIEW_TYPES.map(() => '?').join(', ')
    const governanceReviewPlaceholders = NOVEL_PIPELINE_GOVERNANCE_REVIEW_TYPES.map(() => '?').join(', ')
    const chapterReviews = (db.query(`
      WITH target_review_times AS (
        SELECT review_type, MAX(created_at) AS created_at
        FROM reviews
        WHERE project_id = ?
          AND review_type IN (${chapterReviewPlaceholders})
          AND json_valid(payload)
          AND CAST(json_extract(payload, '$.chapter_id') AS INTEGER) = ?
        GROUP BY review_type
      ), chapter_review_winners AS (
        SELECT MIN(review.id) AS id
        FROM reviews AS review
        JOIN target_review_times AS latest
          ON latest.review_type = review.review_type
          AND latest.created_at = review.created_at
        WHERE review.project_id = ?
          AND json_valid(review.payload)
          AND CAST(json_extract(review.payload, '$.chapter_id') AS INTEGER) = ?
        GROUP BY review.review_type
      )
      SELECT
        review.id,
        review.project_id,
        CASE WHEN json_valid(review.payload) THEN CAST(json_extract(review.payload, '$.chapter_id') AS INTEGER) END AS chapter_id,
        CASE WHEN json_valid(review.payload) THEN CAST(json_extract(review.payload, '$.chapter_no') AS INTEGER) END AS chapter_no,
        review.review_type,
        review.status,
        '' AS summary,
        '[]' AS issues,
        review.payload,
        review.created_at
      FROM chapter_review_winners AS winner
      JOIN reviews AS review ON review.id = winner.id
    `).all(
      projectId,
      ...NOVEL_PIPELINE_CHAPTER_REVIEW_TYPES,
      targetChapterId,
      projectId,
      targetChapterId,
    ) as any[]).map(row => projectNovelPipelineReview(reviewFromRow(row)))
    const governanceReviews = (db.query(`
      SELECT
        -MIN(id) AS id,
        project_id,
        review_type,
        MAX(created_at) AS created_at
      FROM reviews
      WHERE project_id = ? AND review_type IN (${governanceReviewPlaceholders})
      GROUP BY project_id, review_type
    `).all(projectId, ...NOVEL_PIPELINE_GOVERNANCE_REVIEW_TYPES) as any[]).map(row => reviewFromRow({
      ...row,
      status: 'ok',
      summary: '',
      issues: '[]',
      payload: '',
    }))
    const reviews = [...chapterReviews, ...governanceReviews]

    const batchRunPlaceholders = NOVEL_PIPELINE_BATCH_RUN_TYPES.map(() => '?').join(', ')
    const repairRunPlaceholders = NOVEL_PIPELINE_REPAIR_RUN_TYPES.map(() => '?').join(', ')
    const governanceRunPlaceholders = NOVEL_PIPELINE_GOVERNANCE_RUN_TYPES.map(() => '?').join(', ')
    const batchSemanticRows = db.query(`
      SELECT
        -MIN(id) AS id,
        project_id,
        run_type,
        MAX(created_at) AS created_at,
        SUM(CASE
          WHEN LOWER(status) IN ('completed', 'complete', 'success', 'succeeded', 'done', 'ok')
            AND COALESCE(pipeline_chapter_failure_count, 0) = 0 THEN 1
          ELSE 0
        END) AS successful_run_count,
        SUM(CASE
          WHEN LOWER(status) IN ('failed', 'error', 'blocked', 'cancelled')
            OR COALESCE(pipeline_chapter_failure_count, 0) > 0 THEN 1
          ELSE 0
        END) AS failed_run_count,
        SUM(CASE
          WHEN LOWER(status) IN ('queued', 'ready', 'running', 'paused', 'pending', 'needs_approval') THEN 1
          ELSE 0
        END) AS active_run_count
      FROM runs
      WHERE project_id = ? AND run_type IN (${batchRunPlaceholders})
      GROUP BY project_id, run_type
    `).all(projectId, ...NOVEL_PIPELINE_BATCH_RUN_TYPES) as any[]
    const batchRows: NovelRunRecord[] = []
    for (const row of batchSemanticRows) {
      const shared = {
        project_id: Number(row.project_id || projectId),
        run_type: String(row.run_type || ''),
        input_ref: '',
        output_ref: '',
        created_at: String(row.created_at || ''),
        pipeline_open_task_count: 0,
      }
      const successfulCount = Math.max(0, Number(row.successful_run_count || 0))
      const failedCount = Math.max(0, Number(row.failed_run_count || 0))
      const activeCount = Math.max(0, Number(row.active_run_count || 0))
      if (successfulCount) batchRows.push({
        ...shared,
        id: Number(row.id || 0),
        step_name: 'pipeline-completed-batch',
        status: 'completed',
        pipeline_run_count: successfulCount,
        pipeline_chapter_failure_count: 0,
      })
      if (failedCount) batchRows.push({
        ...shared,
        id: Number(row.id || 0) - 1,
        step_name: 'pipeline-failed-batch',
        status: 'failed',
        pipeline_run_count: failedCount,
        pipeline_chapter_failure_count: 1,
      })
      if (activeCount) batchRows.push({
        ...shared,
        id: Number(row.id || 0) - 2,
        step_name: 'pipeline-active-batch',
        status: 'paused',
        pipeline_run_count: activeCount,
        pipeline_chapter_failure_count: 0,
      })
    }

    const repairSemanticRows = db.query(`
      SELECT
        -MIN(id) AS id,
        project_id,
        run_type,
        MAX(created_at) AS created_at,
        SUM(COALESCE(pipeline_open_task_count, 0)) AS open_task_count,
        SUM(CASE WHEN LOWER(status) IN ('failed', 'error', 'blocked', 'cancelled') THEN 1 ELSE 0 END) AS failed_run_count,
        SUM(CASE WHEN LOWER(status) IN ('queued', 'ready', 'running', 'paused', 'pending', 'needs_approval') THEN 1 ELSE 0 END) AS active_run_count,
        SUM(CASE
          WHEN LOWER(status) NOT IN (
            'completed', 'complete', 'success', 'succeeded', 'done', 'ok',
            'failed', 'error', 'blocked', 'cancelled',
            'queued', 'ready', 'running', 'paused', 'pending', 'needs_approval'
          ) AND COALESCE(pipeline_task_count, 0) = 0 THEN 1
          ELSE 0
        END) AS incomplete_run_count
      FROM runs
      WHERE project_id = ? AND run_type IN (${repairRunPlaceholders})
      GROUP BY project_id, run_type
    `).all(projectId, ...NOVEL_PIPELINE_REPAIR_RUN_TYPES) as any[]
    const repairRows: NovelRunRecord[] = []
    for (const row of repairSemanticRows) {
      const shared = {
        project_id: Number(row.project_id || projectId),
        run_type: String(row.run_type || ''),
        input_ref: '',
        output_ref: '',
        created_at: String(row.created_at || ''),
        pipeline_chapter_failure_count: 0,
      }
      const failedCount = Math.max(0, Number(row.failed_run_count || 0))
      const activeCount = Math.max(0, Number(row.active_run_count || 0))
      const incompleteCount = Math.max(0, Number(row.incomplete_run_count || 0))
      const openTaskCount = Math.max(0, Number(row.open_task_count || 0))
      if (failedCount) repairRows.push({
        ...shared,
        id: Number(row.id || 0),
        step_name: 'pipeline-failed-repair',
        status: 'failed',
        pipeline_run_count: failedCount,
        pipeline_open_task_count: 0,
      })
      if (activeCount) repairRows.push({
        ...shared,
        id: Number(row.id || 0) - 1,
        step_name: 'pipeline-active-repair',
        status: 'paused',
        pipeline_run_count: activeCount,
        pipeline_open_task_count: 0,
      })
      if (incompleteCount) repairRows.push({
        ...shared,
        id: Number(row.id || 0) - 2,
        step_name: 'pipeline-incomplete-repair',
        status: 'pending',
        pipeline_run_count: incompleteCount,
        pipeline_open_task_count: 0,
      })
      if (openTaskCount) repairRows.push({
        ...shared,
        id: Number(row.id || 0) - 3,
        step_name: 'pipeline-open-repair',
        status: 'completed',
        pipeline_run_count: 1,
        pipeline_open_task_count: openTaskCount,
      })
    }

    const governanceRows = db.query(`
      WITH governance_run_times AS (
        SELECT run_type, MAX(created_at) AS created_at
        FROM runs
        WHERE project_id = ?
          AND run_type IN (${governanceRunPlaceholders})
          AND LOWER(status) IN ('completed', 'complete', 'success', 'succeeded', 'done', 'ok')
        GROUP BY run_type
      ), governance_run_winners AS (
        SELECT MIN(run.id) AS id
        FROM runs AS run
        JOIN governance_run_times AS latest
          ON latest.run_type = run.run_type
          AND latest.created_at = run.created_at
        WHERE run.project_id = ?
          AND LOWER(run.status) IN ('completed', 'complete', 'success', 'succeeded', 'done', 'ok')
        GROUP BY run.run_type
      )
      SELECT run.id, run.project_id, run.run_type, run.step_name, run.status, run.created_at
      FROM governance_run_winners AS winner
      JOIN runs AS run ON run.id = winner.id
    `).all(
      projectId,
      ...NOVEL_PIPELINE_GOVERNANCE_RUN_TYPES,
      projectId,
    ) as any[]
    const governanceRuns: NovelRunRecord[] = governanceRows.map(row => ({
      ...row,
      input_ref: '',
      output_ref: '',
      pipeline_run_count: 1,
      pipeline_chapter_failure_count: 0,
      pipeline_open_task_count: 0,
    }))
    const runs = [...batchRows.filter(row => Number(row.pipeline_run_count || 0) > 0), ...repairRows, ...governanceRuns]

    return {
      project,
      chapters: dedupById(chapters).sort((a, b) => a.chapter_no - b.chapter_no),
      outlines: dedupById(outlines),
      worldbuilding: dedupById(worldbuilding),
      characters: dedupById(characters),
      reviews,
      runs: runs.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    }
  } finally {
    db.close()
  }
}
