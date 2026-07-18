import type {
  NovelReferenceConfig, NovelProjectRecord, NovelWorldbuildingRecord, NovelCharacterRecord, NovelOutlineRecord,
  NovelChapterRecord, NovelReviewRecord, NovelRunRecord, NovelProjectSeedDraftRecord, NovelSettingEntityRecord,
  NovelChapterSettingUsageRecord,
} from './types'
import { nowIso, toStringArray, toAnyArray, toJsonable, jsonText } from './json'
import { compactRawPayloadForStorage, compactReviewPayloadText, compactPersistedText, summarizeNovelRunPipelineRefs } from './storage-compaction'

export function normalizeReferenceConfig(value: any): NovelReferenceConfig {
  const raw = value && typeof value === 'object' ? value : {}
  const references = Array.isArray(raw.references)
    ? raw.references.map((item: any) => ({
      project_title: String(item?.project_title || item?.projectTitle || '').trim(),
      weight: Math.max(0.1, Math.min(1, Number(item?.weight || 0.7) || 0.7)),
      use_for: toStringArray(item?.use_for || item?.useFor),
      dimensions: toStringArray(item?.dimensions),
      avoid: toStringArray(item?.avoid),
    })).filter((item: any) => item.project_title)
    : []
  const strength = raw.strength === 'light' || raw.strength === 'strong' ? raw.strength : 'balanced'
  return {
    ...raw,
    references,
    strength,
    notes: String(raw.notes || ''),
  }
}

export function normalizeProjectRecord(data: Partial<NovelProjectRecord>, existing?: Partial<NovelProjectRecord>): NovelProjectRecord { const ts = nowIso(); return { id: Number(existing?.id || data.id || 0), title: String(data.title ?? existing?.title ?? '未命名小说'), genre: String(data.genre ?? existing?.genre ?? ''), sub_genres: toStringArray(data.sub_genres ?? existing?.sub_genres), synopsis: String(data.synopsis ?? existing?.synopsis ?? ''), length_target: String(data.length_target ?? existing?.length_target ?? 'medium'), target_audience: String(data.target_audience ?? existing?.target_audience ?? ''), style_tags: toStringArray(data.style_tags ?? existing?.style_tags), commercial_tags: toStringArray(data.commercial_tags ?? existing?.commercial_tags), reference_config: normalizeReferenceConfig(data.reference_config ?? existing?.reference_config), status: String(data.status ?? existing?.status ?? 'draft'), created_at: String(existing?.created_at ?? data.created_at ?? ts), updated_at: String(existing?.updated_at ?? data.updated_at ?? ts) } }

export function normalizeWorldbuildingRecord(data: Partial<NovelWorldbuildingRecord>, existing?: Partial<NovelWorldbuildingRecord>): NovelWorldbuildingRecord {
  const raw = { ...(existing?.raw_payload || {}), ...(data.raw_payload || {}), ...data }
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    world_summary: String(data.world_summary ?? existing?.world_summary ?? ''),
    rules: toJsonable(data.rules ?? existing?.rules, []),
    factions: toAnyArray(data.factions ?? existing?.factions),
    locations: toAnyArray(data.locations ?? existing?.locations),
    systems: toJsonable(data.systems ?? existing?.systems, []),
    items: toAnyArray((data as any).items ?? existing?.items),
    timeline_anchor: toJsonable(data.timeline_anchor ?? existing?.timeline_anchor, ''),
    known_unknowns: toAnyArray(data.known_unknowns ?? existing?.known_unknowns),
    version: Number(data.version ?? existing?.version ?? 1),
    raw_payload: raw,
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}

export function normalizeCharacterRecord(data: Partial<NovelCharacterRecord>, existing?: Partial<NovelCharacterRecord>): NovelCharacterRecord {
  const raw = { ...(existing?.raw_payload || {}), ...(data.raw_payload || {}), ...data }
  const role = String(data.role ?? data.role_type ?? existing?.role ?? existing?.role_type ?? '')
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    name: String(data.name ?? existing?.name ?? '未命名角色'),
    role,
    role_type: String(data.role_type ?? existing?.role_type ?? role),
    archetype: String(data.archetype ?? existing?.archetype ?? ''),
    personality: toJsonable(data.personality ?? existing?.personality, []),
    motivation: String(data.motivation ?? existing?.motivation ?? ''),
    goal: String(data.goal ?? existing?.goal ?? ''),
    conflict: String(data.conflict ?? existing?.conflict ?? ''),
    abilities: toAnyArray(data.abilities ?? existing?.abilities),
    backstory: String(data.backstory ?? existing?.backstory ?? ''),
    relationships: toJsonable(data.relationships ?? existing?.relationships, []),
    relationship_graph: toJsonable(data.relationship_graph ?? existing?.relationship_graph, {}),
    growth_arc: String(data.growth_arc ?? existing?.growth_arc ?? ''),
    arc_hint: String(data.arc_hint ?? existing?.arc_hint ?? ''),
    current_state: toJsonable(data.current_state ?? existing?.current_state, {}),
    secret: String(data.secret ?? existing?.secret ?? ''),
    appearance: String(data.appearance ?? existing?.appearance ?? ''),
    status: String(data.status ?? existing?.status ?? 'active'),
    version: Number(data.version ?? existing?.version ?? 1),
    raw_payload: raw,
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}

export function normalizeOutlineRecord(data: Partial<NovelOutlineRecord>, existing?: Partial<NovelOutlineRecord>): NovelOutlineRecord {
  const raw = { ...(existing?.raw_payload || {}), ...(data.raw_payload || {}), ...data }
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    outline_type: String(data.outline_type ?? existing?.outline_type ?? 'master'),
    title: String(data.title ?? existing?.title ?? '未命名大纲'),
    summary: String(data.summary ?? existing?.summary ?? ''),
    beats: toAnyArray(data.beats ?? existing?.beats),
    conflict_points: toStringArray(data.conflict_points ?? existing?.conflict_points),
    turning_points: toStringArray(data.turning_points ?? existing?.turning_points),
    hook: String(data.hook ?? existing?.hook ?? ''),
    target_length: String(data.target_length ?? existing?.target_length ?? ''),
    version: Number(data.version ?? existing?.version ?? 1),
    parent_id: data.parent_id ?? existing?.parent_id ?? null,
    raw_payload: raw,
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}

export function normalizeChapterRecord(data: Partial<NovelChapterRecord>, existing?: Partial<NovelChapterRecord>): NovelChapterRecord {
  const raw = { ...(existing?.raw_payload || {}), ...(data.raw_payload || {}), ...data }
  const sceneBreakdown = toAnyArray(data.scene_breakdown ?? data.scene_list ?? existing?.scene_breakdown ?? existing?.scene_list)
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    chapter_no: Number(data.chapter_no ?? existing?.chapter_no ?? 1),
    title: String(data.title ?? existing?.title ?? '第一章'),
    chapter_goal: String(data.chapter_goal ?? existing?.chapter_goal ?? ''),
    chapter_summary: String(data.chapter_summary ?? existing?.chapter_summary ?? ''),
    conflict: String(data.conflict ?? existing?.conflict ?? ''),
    ending_hook: String(data.ending_hook ?? existing?.ending_hook ?? ''),
    chapter_text: String(data.chapter_text ?? existing?.chapter_text ?? ''),
    scene_breakdown: sceneBreakdown,
    scene_list: toAnyArray(data.scene_list ?? existing?.scene_list ?? sceneBreakdown),
    continuity_notes: toStringArray(data.continuity_notes ?? existing?.continuity_notes),
    items_in_play: toAnyArray(data.items_in_play ?? existing?.items_in_play),
    foreshadowing: toJsonable(data.foreshadowing ?? existing?.foreshadowing, []),
    timeline_note: String(data.timeline_note ?? existing?.timeline_note ?? ''),
    status: String(data.status ?? existing?.status ?? 'draft'),
    version: Number(data.version ?? existing?.version ?? 1),
    published_at: data.published_at ?? existing?.published_at ?? null,
    outline_id: data.outline_id ?? existing?.outline_id ?? null,
    raw_payload: compactRawPayloadForStorage(raw),
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}

export function normalizeReviewRecord(data: Partial<NovelReviewRecord>, existing?: Partial<NovelReviewRecord>): NovelReviewRecord {
  const reviewType = String(data.review_type ?? existing?.review_type ?? 'continuity')
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    review_type: reviewType,
    status: String(data.status ?? existing?.status ?? 'ok'),
    summary: String(data.summary ?? existing?.summary ?? ''),
    issues: toStringArray(data.issues ?? existing?.issues),
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    payload: compactReviewPayloadText(data.payload ?? existing?.payload ?? '', reviewType),
  }
}

export function normalizeRunRecord(data: Partial<NovelRunRecord>, existing?: Partial<NovelRunRecord>): NovelRunRecord {
  const inputRef = compactPersistedText(data.input_ref ?? existing?.input_ref ?? '')
  const outputRef = compactPersistedText(data.output_ref ?? existing?.output_ref ?? '')
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    run_type: String(data.run_type ?? existing?.run_type ?? 'plan'),
    step_name: String(data.step_name ?? existing?.step_name ?? 'step'),
    status: String(data.status ?? existing?.status ?? 'pending'),
    input_ref: inputRef,
    output_ref: outputRef,
    duration_ms: Number(data.duration_ms ?? existing?.duration_ms ?? 0),
    error_message: String(data.error_message ?? existing?.error_message ?? ''),
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    ...summarizeNovelRunPipelineRefs(inputRef, outputRef),
  }
}

export function normalizeProjectSeedDraftRecord(data: Partial<NovelProjectSeedDraftRecord>, existing?: Partial<NovelProjectSeedDraftRecord>): NovelProjectSeedDraftRecord {
  const seed = data.seed ?? existing?.seed ?? {}
  const title = String(data.title ?? existing?.title ?? seed?.title ?? seed?.project_title ?? '未命名孵化草稿').trim() || '未命名孵化草稿'
  return {
    id: Number(existing?.id || data.id || 0),
    title,
    idea: String(data.idea ?? existing?.idea ?? ''),
    seed,
    review_model: data.review_model ?? existing?.review_model ?? {},
    diagnostics: data.diagnostics ?? existing?.diagnostics ?? {},
    model_id: data.model_id === undefined ? (existing?.model_id ?? null) : (data.model_id === null ? null : Number(data.model_id) || null),
    source: String(data.source ?? existing?.source ?? 'deep_draft'),
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}

export function normalizeSettingEntityRecord(data: Partial<NovelSettingEntityRecord>, existing?: Partial<NovelSettingEntityRecord>): NovelSettingEntityRecord {
  const raw = { ...(existing?.payload_json || {}), ...(data.payload_json || {}), ...data }
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    entity_type: String(data.entity_type ?? existing?.entity_type ?? 'rule'),
    name: String(data.name ?? existing?.name ?? '未命名设定'),
    summary: String(data.summary ?? existing?.summary ?? ''),
    status: String(data.status ?? existing?.status ?? 'active'),
    visibility: String(data.visibility ?? existing?.visibility ?? 'public'),
    first_chapter_no: data.first_chapter_no ?? existing?.first_chapter_no ?? null,
    last_chapter_no: data.last_chapter_no ?? existing?.last_chapter_no ?? null,
    related_character_ids: toAnyArray(data.related_character_ids ?? existing?.related_character_ids).map(Number).filter(Boolean),
    related_chapter_ids: toAnyArray(data.related_chapter_ids ?? existing?.related_chapter_ids).map(Number).filter(Boolean),
    related_entity_ids: toAnyArray(data.related_entity_ids ?? existing?.related_entity_ids).map(Number).filter(Boolean),
    constraints_json: toJsonable(data.constraints_json ?? existing?.constraints_json, {}),
    state_json: toJsonable(data.state_json ?? existing?.state_json, {}),
    payload_json: raw,
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}

export function normalizeChapterSettingUsageRecord(data: Partial<NovelChapterSettingUsageRecord>, existing?: Partial<NovelChapterSettingUsageRecord>): NovelChapterSettingUsageRecord {
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    chapter_id: Number(data.chapter_id ?? existing?.chapter_id ?? 0),
    entity_id: Number(data.entity_id ?? existing?.entity_id ?? 0),
    usage_type: String(data.usage_type ?? existing?.usage_type ?? (data.forbidden ? 'forbidden' : data.required ? 'required' : 'allowed')),
    required: Boolean(data.required ?? existing?.required ?? false),
    allowed: data.allowed ?? existing?.allowed ?? true,
    forbidden: Boolean(data.forbidden ?? existing?.forbidden ?? false),
    reveal_level: String(data.reveal_level ?? existing?.reveal_level ?? 'none'),
    expected_state_change: toJsonable(data.expected_state_change ?? existing?.expected_state_change, {}),
    actual_state_change: toJsonable(data.actual_state_change ?? existing?.actual_state_change, {}),
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}

export function dedupById<T extends { id: number | string }>(items: T[]): T[] {
  const seen = new Set<number | string>()
  return items.filter(item => {
    const key = item.id
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
