/** Novel store record and option types. */

export type NovelReferenceConfig = {
  references?: Array<{ project_title: string; weight?: number; use_for?: string[]; dimensions?: string[]; avoid?: string[] }>
  strength?: 'light' | 'balanced' | 'strong'
  notes?: string
  style_lock?: any
  safety?: any
  story_state?: any
  writing_bible?: any
  generation_pipeline?: any
  [key: string]: any
}

export type NovelProjectRecord = { id: number; title: string; genre?: string; sub_genres?: string[]; synopsis?: string; length_target?: string; target_audience?: string; style_tags?: string[]; commercial_tags?: string[]; reference_config?: NovelReferenceConfig; status?: string; created_at?: string; updated_at: string }

export type NovelWorldbuildingRecord = { id: number; project_id: number; world_summary?: string; rules?: any; factions?: any[]; locations?: any[]; systems?: any; items?: any[]; timeline_anchor?: any; known_unknowns?: any[]; version?: number; raw_payload?: any; created_at: string; updated_at: string }

export type NovelCharacterRecord = { id: number; project_id: number; name: string; role?: string; role_type?: string; archetype?: string; personality?: any; motivation?: string; goal?: string; conflict?: string; abilities?: any[]; backstory?: string; relationships?: any; relationship_graph?: any; growth_arc?: string; arc_hint?: string; current_state?: any; secret?: string; appearance?: string; status?: string; version?: number; raw_payload?: any; created_at?: string; updated_at: string }

export type NovelOutlineRecord = { id: number; project_id: number; outline_type?: string; title: string; summary?: string; beats?: any[]; conflict_points?: string[]; turning_points?: string[]; hook?: string; target_length?: string; version?: number; parent_id?: number | null; raw_payload?: any; created_at?: string; updated_at: string }

export type NovelChapterRecord = { id: number; project_id: number; chapter_no: number; title: string; chapter_goal?: string; chapter_summary?: string; conflict?: string; ending_hook?: string; chapter_text?: string; scene_breakdown?: any[]; scene_list?: any[]; continuity_notes?: string[]; items_in_play?: any[]; foreshadowing?: any; timeline_note?: string; status?: string; version?: number; published_at?: string | null; outline_id?: number | null; raw_payload?: any; created_at?: string; updated_at: string }

export type NovelChapterWorkspaceRecord = Omit<NovelChapterRecord, 'chapter_text' | 'scene_breakdown' | 'scene_list' | 'continuity_notes' | 'items_in_play' | 'foreshadowing' | 'raw_payload'> & { has_prose: boolean; has_scene_plan: boolean; word_count: number }

export type NovelChapterVersionSource = 'manual_edit' | 'agent_execute' | 'repair' | 'rollback'

export type NovelChapterVersionRecord = { id: number; chapter_id: number; project_id: number; version_no: number; chapter_text: string; scene_breakdown: any[]; continuity_notes: string[]; source: NovelChapterVersionSource; created_at: string }

export type NovelReviewRecord = { id: number; project_id: number; chapter_id?: number | null; chapter_no?: number | null; review_type: string; status: string; summary: string; issues: string[]; created_at: string; payload?: string }

export type NovelReviewSummaryRecord = Omit<NovelReviewRecord, 'issues' | 'payload'> & { issue_count: number; preview: string; score: number | null; passed: boolean | null; payload_bytes: number }

export type NovelRunRecord = { id: number; project_id: number; run_type: string; step_name: string; status: string; input_ref?: string; output_ref?: string; duration_ms?: number; error_message?: string; scope_key?: string | null; updated_at?: string | null; lease_owner?: string | null; lease_expires_at?: string | null; cancel_requested_at?: string | null; created_at: string; pipeline_run_count?: number; pipeline_chapter_failure_count?: number; pipeline_open_task_count?: number; pipeline_task_count?: number }

export type NovelRunSummaryRecord = Omit<NovelRunRecord, 'input_ref' | 'output_ref'> & { chapter_id: number | null; chapter_no: number | null; input_bytes: number; output_bytes: number; admission_status: string; admission_warning_count: number; admission_warning_preview: string; story_state_status: string; story_state_pending: boolean; story_state_warning: string; post_commit_warning_count: number; post_commit_warning_preview: string }

export type NovelProjectSeedDraftRecord = { id: number; title: string; idea?: string; seed: any; review_model?: any; diagnostics?: any; model_id?: number | null; source?: string; created_at: string; updated_at: string }

export type NovelSettingEntityRecord = {
  id: number
  project_id: number
  entity_type: string
  name: string
  summary?: string
  status?: string
  visibility?: string
  first_chapter_no?: number | null
  last_chapter_no?: number | null
  related_character_ids?: number[]
  related_chapter_ids?: number[]
  related_entity_ids?: number[]
  constraints_json?: any
  state_json?: any
  payload_json?: any
  created_at?: string
  updated_at: string
}

export type NovelChapterSettingUsageRecord = {
  id: number
  project_id: number
  chapter_id: number
  entity_id: number
  usage_type?: string
  required?: boolean
  allowed?: boolean
  forbidden?: boolean
  reveal_level?: string
  expected_state_change?: any
  actual_state_change?: any
  created_at?: string
  updated_at: string
}

export type NovelStore = { projects: NovelProjectRecord[]; worldbuilding: NovelWorldbuildingRecord[]; characters: NovelCharacterRecord[]; outlines: NovelOutlineRecord[]; chapters: NovelChapterRecord[]; chapter_versions: NovelChapterVersionRecord[]; reviews: NovelReviewRecord[]; runs: NovelRunRecord[]; setting_entities: NovelSettingEntityRecord[]; chapter_setting_usage: NovelChapterSettingUsageRecord[] }

export type UpdateNovelChapterOptions = { createVersion?: boolean; versionSource?: NovelChapterVersionSource; forceVersion?: boolean; allowEmptyProse?: boolean }

export type NovelChapterAcceptanceUpdate = {
  id?: number
  name?: string
  entity_id?: number
  entityId?: number
  entity_type?: string
  entityType?: string
  patch?: Record<string, any>
}

export type NovelChapterAcceptanceInput = {
  chapter_id: number
  chapter_patch: Partial<NovelChapterRecord>
  version_source?: NovelChapterVersionSource
  project_patch?: Partial<NovelProjectRecord>
  next_reference_config?: NovelReferenceConfig
  worldbuilding_creates?: Partial<NovelWorldbuildingRecord>[]
  character_creates?: Partial<NovelCharacterRecord>[]
  setting_creates?: Partial<NovelSettingEntityRecord>[]
  chapter_setting_usage_replacement?: Array<Partial<NovelChapterSettingUsageRecord> & { entity_name?: string; entity_type?: string }>
  character_updates?: NovelChapterAcceptanceUpdate[]
  setting_updates?: NovelChapterAcceptanceUpdate[]
  usage_updates?: NovelChapterAcceptanceUpdate[]
  reviews?: Partial<NovelReviewRecord>[]
}

export type CommitEditorRevisionChapterInput = {
  projectId: number
  chapterId: number
  runId: number
  sourceTextHash: string
  candidateText: string
  candidateHash: string
  chapterPatch: Partial<NovelChapterRecord>
  reviewPayload: Record<string, unknown>
}

export type CommitEditorRevisionChapterResult = {
  status: 'committed' | 'already_committed'
  chapter: NovelChapterRecord
  review: NovelReviewRecord
  versionCreated: boolean
}

export type NovelPipelineSnapshot = {
  project: NovelProjectRecord
  chapters: NovelChapterRecord[]
  outlines: NovelOutlineRecord[]
  worldbuilding: NovelWorldbuildingRecord[]
  characters: NovelCharacterRecord[]
  reviews: NovelReviewRecord[]
  runs: NovelRunRecord[]
}
