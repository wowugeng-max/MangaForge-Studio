import type { NovelReviewRecord } from './types'

export const NOVEL_PIPELINE_CHAPTER_REVIEW_TYPES = ['prose_quality', 'editor_report', 'editor_revision'] as const

export const NOVEL_PIPELINE_SQL_TRIM_CHARS = [
  9, 10, 11, 12, 13, 32, 160, 5760,
  8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202,
  8232, 8233, 8239, 8287, 12288, 65279,
].map(codePoint => `char(${codePoint})`).join(' || ')

export const NOVEL_PIPELINE_GOVERNANCE_REVIEW_TYPES = [
  'longform_production_repair_audit',
  'book_review',
  'quality_benchmark',
  'delivery_risk_convergence',
] as const

export const NOVEL_PIPELINE_BATCH_RUN_TYPES = ['chapter_group_generation', 'batch_generate_prose'] as const

export const NOVEL_PIPELINE_REPAIR_RUN_TYPES = ['longform_production_repair', 'release_repair_queue'] as const

export const NOVEL_PIPELINE_GOVERNANCE_RUN_TYPES = [
  'longform_creation_diagnosis',
  'longform_pressure_test',
  'quality_benchmark',
  'book_review',
  'regression_benchmark',
  'first30_retention_diagnosis',
] as const


export function pipelineJsonTruthySql(column: string, path: string) {
  const type = `json_type(${column}, '${path}')`
  const value = `json_extract(${column}, '${path}')`
  return `(json_valid(${column}) AND CASE ${type}
    WHEN 'null' THEN 0
    WHEN 'false' THEN 0
    WHEN 'true' THEN 1
    WHEN 'integer' THEN ${value} != 0
    WHEN 'real' THEN ${value} != 0
    WHEN 'text' THEN length(trim(CAST(${value} AS TEXT), ${NOVEL_PIPELINE_SQL_TRIM_CHARS})) > 0
    WHEN 'array' THEN EXISTS (
      WITH RECURSIVE pipeline_array_string(item_value, item_type) AS (
        SELECT json_extract(${column}, '${path}'), json_type(${column}, '${path}')
        UNION ALL
        SELECT json_extract(item_value, '$[0]'), json_type(item_value, '$[0]')
        FROM pipeline_array_string
        WHERE item_type = 'array' AND json_array_length(item_value) = 1
      )
      SELECT 1
      FROM pipeline_array_string
      WHERE CASE item_type
        WHEN 'null' THEN 0
        WHEN 'text' THEN length(trim(CAST(item_value AS TEXT), ${NOVEL_PIPELINE_SQL_TRIM_CHARS})) > 0
        WHEN 'array' THEN json_array_length(item_value) > 1
        ELSE 1
      END
      LIMIT 1
    )
    WHEN 'object' THEN 1
    ELSE 0
  END)`
}

export function pipelineAnyJsonTruthySql(column: string, paths: string[]) {
  return `CASE WHEN ${paths.map(path => pipelineJsonTruthySql(column, path)).join(' OR ')} THEN 1 ELSE 0 END`
}

export function pipelineJsonAnchorTruthySql(column: string, path: string) {
  const type = `json_type(${column}, '${path}')`
  const value = `json_extract(${column}, '${path}')`
  return `(json_valid(${column}) AND CASE ${type}
    WHEN 'null' THEN 0
    WHEN 'false' THEN 0
    WHEN 'true' THEN 1
    WHEN 'integer' THEN ${value} != 0
    WHEN 'real' THEN ${value} != 0
    WHEN 'text' THEN length(trim(CAST(${value} AS TEXT), ${NOVEL_PIPELINE_SQL_TRIM_CHARS})) > 0
    WHEN 'array' THEN json_array_length(${column}, '${path}') > 0
    WHEN 'object' THEN 1
    ELSE 0
  END)`
}

export function pipelineReviewText(...values: any[]) {
  for (const value of values) {
    const normalized = String(value ?? '').trim()
    if (normalized) return normalized
  }
  return ''
}

export function pipelineReviewArray(value: any): any[] {
  return Array.isArray(value) ? value : []
}

export function projectNovelPipelineReview(review: NovelReviewRecord): NovelReviewRecord {
  let payload: any = {}
  try { payload = review.payload ? JSON.parse(String(review.payload)) : {} } catch { payload = {} }
  if (!payload || typeof payload !== 'object') payload = {}
  if (review.review_type === 'prose_quality') {
    const quality = payload.self_check?.review || payload.review || payload.quality || payload.result || payload
    const score = Number(quality?.score ?? quality?.overall_score ?? quality?.quality_score ?? 0)
    const passed = quality?.passed === true
      || (Number.isFinite(score) && score >= 75 && quality?.passed !== false)
    return { ...review, issues: [], payload: JSON.stringify({ passed }) }
  }
  if (review.review_type === 'editor_report') {
    const report = payload.editor_report || payload.report || payload.result || payload
    const hasIssues = [
      ...pipelineReviewArray(report?.issues),
      ...pipelineReviewArray(report?.revision_items),
      ...pipelineReviewArray(report?.revisions),
      ...pipelineReviewArray(payload?.issues),
    ].length > 0
    const status = pipelineReviewText(report?.status, payload?.status, review.status).toLowerCase()
    const needsRevision = hasIssues
      || /warn|fail|risk|revision|revise|needs/.test(status)
      || !/ok|pass|clean|accept|accepted|completed/.test(status)
    return {
      ...review,
      issues: [],
      payload: JSON.stringify({ status: needsRevision ? 'needs_revision' : 'accepted', issues: needsRevision ? ['[pipeline-issue-present]'] : [] }),
    }
  }
  return { ...review, issues: [], payload: '' }
}
