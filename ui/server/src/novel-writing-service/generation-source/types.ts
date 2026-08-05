import type { GenerationSourceProgress } from '../../mcp/adapters/types'
import type { ChapterGenerationSourceState } from './source-config'

export const MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY = 'mcp_generation_source_v1' as const
export const CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY = 'chapter_generation_stage_v1' as const

const CHAPTER_TASK_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,511}$/

export function isChapterTaskId(value: unknown): value is string {
  return typeof value === 'string' && CHAPTER_TASK_ID.test(value)
}

export type GenerationSourceReceiptAuthority =
  | typeof MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY
  | typeof CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY

export type ChapterTaskStage =
  | 'draft'
  | 'word_target_repair'
  | 'commercial_editor_rewrite'
  | 'meme_polish'
  | 'readability_review'
  | 'humanize'
  | 'quality_review'
  | 'quality_recheck'
  | 'structured_review_fill'
  | 'quality_repair'
  | 'manual_recheck'
  | 'editor_report'
  | 'revision'
  | 'post_revision_review'
  | 'story_state_sync'

export type ChapterStageResponseContract =
  | 'draft_prose'
  | 'word_target_prose'
  | 'editor_rewrite_prose'
  | 'meme_polish_prose'
  | 'readability_json'
  | 'humanize_prose'
  | 'quality_review_json'
  | 'structured_review_json'
  | 'revision_prose'
  | 'editor_report_json'
  | 'story_state_json'

export type ChapterTaskProvenance = {
  task_id: string
  project_id: number
  chapter_id: number
  source: 'model' | 'mcp'
  source_fingerprint: string
  authority_fingerprint: string
  context_version: string
  model_id?: number
  server_id?: string
  key_id?: number
  adapter_id?: string
  agent_id?: string
  model?: string
  session_id?: string
}

export function acceptanceBindingFingerprintFromGenerationSource(generationSource: any) {
  const chapterFingerprint = acceptanceChapterGenerationSourceFingerprintFromGenerationSource(generationSource)
  if (chapterFingerprint) return chapterFingerprint
  if (
    generationSource?.resolved_type !== 'mcp'
    || generationSource?.receipt_authority !== MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY
    || typeof generationSource?.binding_fingerprint !== 'string'
  ) return ''
  const fingerprint = generationSource.binding_fingerprint.trim()
  return /^sha256:[0-9a-f]{64}$/.test(fingerprint) ? fingerprint : ''
}

export function acceptanceChapterGenerationSourceFingerprintFromGenerationSource(generationSource: any) {
  if (
    generationSource?.receipt_authority !== CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY
    || (generationSource?.source !== 'model' && generationSource?.source !== 'mcp')
  ) return ''
  const authority = typeof generationSource?.authority_fingerprint === 'string'
    ? generationSource.authority_fingerprint.trim()
    : ''
  if (/^sha256:[0-9a-f]{64}$/.test(authority)) return authority
  const compatibility = typeof generationSource?.source_fingerprint === 'string'
    ? generationSource.source_fingerprint.trim()
    : ''
  return /^sha256:[0-9a-f]{64}$/.test(compatibility) ? compatibility : ''
}

export type ProseGenerationRequest = {
  requestId: string
  activeWorkspace: string
  project: any
  chapter: any
  chapterNo: number
  paragraphTask: string
  promptDiagnostics?: any
  contextPackage?: any
  modelContext: Record<string, any>
  modelId?: number | string
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
  onProgress?: (event: GenerationSourceProgress) => Promise<void> | void
}

export type ProseGenerationResult = {
  prose_chapters?: Array<{ chapter_no: number; title?: string; chapter_text: string }>
  source: 'model' | 'mcp'
  completed?: boolean
  modelName?: string
  adapter_id?: string
  agent_id?: string
  session_id?: string
  snapshot_hash?: string
  source_receipt?: Record<string, unknown> & {
    receipt_authority?: GenerationSourceReceiptAuthority
  }
  raw?: unknown
  [key: string]: any
}

export interface GenerationSource {
  generateProse(request: ProseGenerationRequest): Promise<ProseGenerationResult>
}

export type BeginChapterTaskInput = {
  taskId?: string
  activeWorkspace: string
  project: any
  chapter: any
  contextPackage: any
  requestedModelId?: number
  options?: Record<string, any>
  signal?: AbortSignal
  onProgress?: ProseGenerationRequest['onProgress']
}

export type ResolvedChapterTaskInput = BeginChapterTaskInput & {
  taskId: string
  sourceState: ChapterGenerationSourceState
  authorityFingerprint: string
  fingerprint: string
  contextVersion: string
  assertCurrent: () => Promise<void>
}

export interface ChapterTaskExecution {
  readonly taskId: string
  readonly source: 'model' | 'mcp'
  readonly modelId?: number
  readonly authorityFingerprint: string
  readonly fingerprint: string
  readonly contextVersion: string
  provenance(): ChapterTaskProvenance
  generateDraft(request: ProseGenerationRequest): Promise<ProseGenerationResult>
  executeAgent(
    stage: ChapterTaskStage,
    responseContract: ChapterStageResponseContract,
    agentId: string,
    project: any,
    context: Record<string, any>,
    options?: Record<string, any>,
  ): Promise<any>
  assertCurrent(): Promise<void>
  close(outcome?: { status: 'success' | 'failed' | 'cancelled'; error?: unknown }): Promise<void>
}

export async function executeChapterStage<T = any>(input: {
  execution?: ChapterTaskExecution
  fallback: (agentId: string, project: any, context: Record<string, any>, options?: Record<string, any>) => T | Promise<T>
  stage: ChapterTaskStage
  responseContract: ChapterStageResponseContract
  agentId: string
  project: any
  context: Record<string, any>
  options?: Record<string, any>
}): Promise<T> {
  if (input.execution) {
    return input.execution.executeAgent(
      input.stage,
      input.responseContract,
      input.agentId,
      input.project,
      input.context,
      input.options,
    )
  }
  return input.fallback(input.agentId, input.project, input.context, input.options)
}

export interface ChapterGenerationSource {
  beginTask(input: BeginChapterTaskInput): Promise<ChapterTaskExecution>
}
