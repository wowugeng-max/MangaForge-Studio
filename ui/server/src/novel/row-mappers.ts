import type {
  NovelProjectRecord, NovelWorldbuildingRecord, NovelCharacterRecord, NovelOutlineRecord,
  NovelChapterRecord, NovelChapterVersionRecord, NovelReviewRecord, NovelReviewSummaryRecord,
  NovelRunRecord, NovelRunSummaryRecord, NovelSettingEntityRecord, NovelChapterSettingUsageRecord, NovelProjectSeedDraftRecord,
} from './types'
import { parseDbJson, parseDbArray } from './json'
import { nullableSqliteBoolean } from './db'

export function projectFromRow(item: any): NovelProjectRecord {
  return { ...item, sub_genres: parseDbArray(item.sub_genres), style_tags: parseDbArray(item.style_tags), commercial_tags: parseDbArray(item.commercial_tags), reference_config: parseDbJson(item.reference_config, {}) }
}

export function worldbuildingFromRow(item: any): NovelWorldbuildingRecord {
  return { ...item, rules: parseDbJson(item.rules, []), factions: parseDbArray(item.factions), locations: parseDbArray(item.locations), systems: parseDbJson(item.systems, []), items: parseDbArray(item.items), timeline_anchor: parseDbJson(item.timeline_anchor, item.timeline_anchor || ''), known_unknowns: parseDbArray(item.known_unknowns), raw_payload: parseDbJson(item.raw_payload, {}) }
}

export function characterFromRow(item: any): NovelCharacterRecord {
  return { ...item, personality: parseDbJson(item.personality, []), abilities: parseDbArray(item.abilities), relationships: parseDbJson(item.relationships, []), relationship_graph: parseDbJson(item.relationship_graph, {}), current_state: parseDbJson(item.current_state, {}), raw_payload: parseDbJson(item.raw_payload, {}) }
}

export function outlineFromRow(item: any): NovelOutlineRecord {
  return { ...item, beats: parseDbArray(item.beats), conflict_points: parseDbArray(item.conflict_points), turning_points: parseDbArray(item.turning_points), raw_payload: parseDbJson(item.raw_payload, {}) }
}

export function chapterFromRow(item: any): NovelChapterRecord {
  return { ...item, scene_breakdown: parseDbArray(item.scene_breakdown), scene_list: parseDbArray(item.scene_list), continuity_notes: parseDbArray(item.continuity_notes), items_in_play: parseDbArray(item.items_in_play), foreshadowing: parseDbJson(item.foreshadowing, []), raw_payload: parseDbJson(item.raw_payload, {}) }
}

export function chapterVersionFromRow(item: any): NovelChapterVersionRecord {
  return { ...item, scene_breakdown: parseDbArray(item.scene_breakdown), continuity_notes: parseDbArray(item.continuity_notes) }
}

export function reviewFromRow(item: any): NovelReviewRecord {
  return { ...item, issues: parseDbArray(item.issues), payload: item.payload || '' }
}

export function reviewSummaryFromRow(item: any): NovelReviewSummaryRecord {
  return {
    ...item,
    chapter_id: item.chapter_id === null || item.chapter_id === undefined ? null : Number(item.chapter_id) || null,
    chapter_no: item.chapter_no === null || item.chapter_no === undefined ? null : Number(item.chapter_no) || null,
    issue_count: Number(item.issue_count || 0),
    preview: String(item.preview || ''),
    score: item.score === null || item.score === undefined || item.score === '' ? null : Number(item.score),
    passed: nullableSqliteBoolean(item.passed),
    payload_bytes: Number(item.payload_bytes || 0),
  }
}

export function runFromRow(item: any): NovelRunRecord {
  return {
    ...item,
    scope_key: item.scope_key ?? null,
    updated_at: item.updated_at ?? null,
    lease_owner: item.lease_owner ?? null,
    lease_expires_at: item.lease_expires_at ?? null,
    cancel_requested_at: item.cancel_requested_at ?? null,
  }
}

export function runSummaryFromRow(item: any): NovelRunSummaryRecord {
  return {
    ...runFromRow(item),
    chapter_id: item.chapter_id === null || item.chapter_id === undefined ? null : Number(item.chapter_id) || null,
    chapter_no: item.chapter_no === null || item.chapter_no === undefined ? null : Number(item.chapter_no) || null,
    input_bytes: Number(item.input_bytes || 0),
    output_bytes: Number(item.output_bytes || 0),
    admission_status: String(item.admission_status || ''),
    admission_warning_count: Number(item.admission_warning_count || 0),
    admission_warning_preview: String(item.admission_warning_preview || ''),
    story_state_status: String(item.story_state_status || ''),
    story_state_pending: Boolean(item.story_state_pending),
    story_state_warning: String(item.story_state_warning || ''),
    post_commit_warning_count: Number(item.post_commit_warning_count || 0),
    post_commit_warning_preview: String(item.post_commit_warning_preview || ''),
  }
}

export function settingEntityFromRow(item: any): NovelSettingEntityRecord {
  return { ...item, related_character_ids: parseDbArray(item.related_character_ids).map(Number).filter(Boolean), related_chapter_ids: parseDbArray(item.related_chapter_ids).map(Number).filter(Boolean), related_entity_ids: parseDbArray(item.related_entity_ids).map(Number).filter(Boolean), constraints_json: parseDbJson(item.constraints_json, {}), state_json: parseDbJson(item.state_json, {}), payload_json: parseDbJson(item.payload_json, {}) }
}

export function chapterSettingUsageFromRow(item: any): NovelChapterSettingUsageRecord {
  return { ...item, required: Boolean(item.required), allowed: item.allowed !== 0, forbidden: Boolean(item.forbidden), expected_state_change: parseDbJson(item.expected_state_change, {}), actual_state_change: parseDbJson(item.actual_state_change, {}) }
}

export function projectSeedDraftFromRow(row: any): NovelProjectSeedDraftRecord {
  return {
    id: Number(row.id || 0),
    title: String(row.title || ''),
    idea: String(row.idea || ''),
    seed: parseDbJson(row.seed, {}),
    review_model: parseDbJson(row.review_model, {}),
    diagnostics: parseDbJson(row.diagnostics, {}),
    model_id: row.model_id === null || row.model_id === undefined ? null : Number(row.model_id) || null,
    source: String(row.source || 'deep_draft'),
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
  }
}
