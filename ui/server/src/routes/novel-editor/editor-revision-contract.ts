export const EDITOR_REVISION_PHASES = [
  'generate_candidate',
  'admit_candidate',
  'persist_chapter',
  'post_quality',
  'sync_current_story_state',
  'record_continuity_warning',
  'completed',
] as const

export type EditorRevisionPhase = typeof EDITOR_REVISION_PHASES[number]

export const EDITOR_REVISION_PHASE_LABELS = {
  generate_candidate: '生成候选',
  admit_candidate: '安全检查',
  persist_chapter: '保存版本',
  post_quality: '当前章质检',
  sync_current_story_state: '当前章状态更新',
  record_continuity_warning: '记录连续性提示',
  completed: '完成',
} as const satisfies Record<EditorRevisionPhase, string>

export type EditorRevisionRunStatus =
  | 'queued'
  | 'running'
  | 'cancel_requested'
  | 'completed'
  | 'failed'
  | 'canceled'

export type EditorRevisionPhaseState = {
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed' | 'canceled'
  attempt: number
  started_at?: string
  completed_at?: string
  error_code?: string
  error?: string
  summary?: Record<string, unknown>
}

export type EditorRevisionRunInput = {
  schema_version: 1
  project_id: number
  chapter_id: number
  chapter_no: number
  chapter_title: string
  review_id: number
  source_chapter_updated_at: string
  source_text: string
  source_text_hash: string
  source_char_count: number
  source_review: Record<string, unknown>
  report: Record<string, unknown>
  context_package: Record<string, unknown>
  revision_mode: string
  revision_strategy: string
  user_prompt: string
  model_id?: number
  auto_quality_check: boolean
  auto_story_state: boolean
  repair_task_link?: {
    run_id: number
    task_index: number
    task: Record<string, unknown>
  }
  created_at: string
}

export type EditorRevisionRejectedCandidateEvidence = {
  hash: string
  char_count: number
  text?: string
  head_preview?: string
  tail_preview?: string
}

export type EditorRevisionCheckpoint = {
  schema_version: 1
  phase: EditorRevisionPhase
  phases: Record<EditorRevisionPhase, EditorRevisionPhaseState>
  runtime_config?: {
    llm_timeout_ms: number
    story_state_max_tokens?: number
  }
  candidate?: {
    text: string
    hash: string
    char_count: number
    applied_patches: unknown[]
    diagnostics: Record<string, unknown>
  }
  prose_persisted: boolean
  committed_chapter_updated_at?: string
  editor_revision_review_id?: number
  post_quality?: Record<string, unknown>
  story_state?: Record<string, unknown>
  continuity_warning_review_id?: number
  delivery_risk_convergence?: Record<string, unknown>
  linked_task_closure?: { status: 'pending' | 'completed'; completed_at?: string }
  warnings: Array<{ code: string; message: string }>
  error?: { code: string; message: string; diagnostics?: Record<string, unknown> }
  completed_at?: string
}
