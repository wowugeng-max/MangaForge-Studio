/**
 * Asset capability upgrade helpers (oh-story aligned):
 * - character status overview
 * - prose backfill (non-empty merge)
 * - project-wide intake queue
 * - chapter asset pack
 * - relation master table
 * - gap audit + fill plan
 */
import {
  createNovelCharacter,
  createNovelReview,
  createNovelSettingEntity,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelChapters,
  listNovelWorkspaceChapters,
  getNovelChapter,
  listNovelOutlines,
  listNovelReviews,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  updateNovelCharacter,
  updateNovelSettingEntity,
} from '../novel'
import { executeNovelAgent } from '../llm'
import { planCharacterCardSync } from '../novel-writing/character-card-sync'
import { getNovelPayload, parseJsonLikePayload, safeJsonStringify } from './novel-route-utils'
import { buildSettingRelationshipGraph } from './novel-setting-relationship-graph'
import {
  buildChapterWritingBrief,
  buildForeshadowLifecycleBoard,
  buildStoryRelationMaster,
  enhanceCharacterStatusWithRelations,
  materializeStoryRelations,
} from './novel-setting-story-relations'
import {
  DISCOVERED_ASSET_TYPES,
  firstText,
  parseJsonField,
  seedSettingsFromLocalData,
} from './novel-setting-helpers'
import { applyDiscoveredAssetsToProject } from './novel-setting-helpers-state-assets'

export type AssetGapItem = {
  key: string
  category: string
  severity: 'info' | 'warn' | 'high'
  title: string
  detail: string
  fix_hint: string
  entity_type?: string
  name?: string
  chapter_no?: number | null
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function text(value: any, limit = 0) {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!raw) return ''
  return limit > 0 && raw.length > limit ? `${raw.slice(0, limit)}…` : raw
}

function isEmptyValue(value: any): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return !value.trim()
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/** Prefer non-empty new values; never blank-overwrite existing good data. */
export function mergeNonEmpty<T = any>(base: T, patch: any): T {
  if (patch === undefined || patch === null) return base
  if (Array.isArray(base) || Array.isArray(patch)) {
    const left = asArray(base).filter(item => !isEmptyValue(item))
    const right = asArray(patch).filter(item => !isEmptyValue(item))
    if (!left.length) return right as any
    if (!right.length) return left as any
    const seen = new Set(left.map(item => JSON.stringify(item)))
    const merged = [...left]
    for (const item of right) {
      const key = JSON.stringify(item)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(item)
    }
    return merged as any
  }
  if (typeof patch === 'object' && !Array.isArray(patch)) {
    const next: Record<string, any> = {
      ...(base && typeof base === 'object' && !Array.isArray(base) ? base as any : {}),
    }
    for (const [key, value] of Object.entries(patch)) {
      if (isEmptyValue(value)) continue
      const prev = next[key]
      if (isEmptyValue(prev)) {
        next[key] = value
        continue
      }
      if (
        (typeof prev === 'object' && prev) ||
        (typeof value === 'object' && value) ||
        Array.isArray(prev) ||
        Array.isArray(value)
      ) {
        next[key] = mergeNonEmpty(prev, value)
        continue
      }
      // keep existing non-empty primitive unless patch is clearly richer string
      if (typeof prev === 'string' && typeof value === 'string') {
        if (value.length > prev.length && value.includes(prev.slice(0, Math.min(12, prev.length)))) {
          next[key] = value
        }
        continue
      }
    }
    return next as T
  }
  if (isEmptyValue(base) && !isEmptyValue(patch)) return patch as T
  return base
}

function parseReviewPayload(review: any) {
  if (!review?.payload) return {}
  if (typeof review.payload === 'object') return review.payload
  return parseJsonLikePayload(String(review.payload || '{}')) || {}
}

function reviewChapterId(review: any) {
  const payload = parseReviewPayload(review)
  return Number(payload?.chapter_id || payload?.chapterId || payload?.chapter?.id || 0) || null
}

function reviewChapterNo(review: any) {
  const payload = parseReviewPayload(review)
  return Number(payload?.chapter_no || payload?.chapterNo || payload?.chapter?.chapter_no || 0) || null
}

function chapterHasProse(chapter: any) {
  if (chapter?.has_prose === true || chapter?.hasProse === true) return true
  const wordCount = Number(chapter?.word_count || chapter?.wordCount || 0)
  if (wordCount >= 80) return true
  return text(chapter?.chapter_text || chapter?.content || chapter?.body).length >= 80
}

function writtenChapters(chapters: any[] = []) {
  return asArray(chapters)
    .filter(chapterHasProse)
    .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
}

/** Drop full prose blobs from chapter lists used by overview/gap diagnostics. */
function lightChapters(chapters: any[] = []) {
  return asArray(chapters).map((item: any) => {
    if (!item || typeof item !== 'object') return item
    const prose = text(item.chapter_text || item.chapterText || item.content || item.body)
    const hasProse = chapterHasProse(item)
    const {
      chapter_text: _ct,
      chapterText: _cT,
      content: _content,
      body: _body,
      raw_payload: _raw,
      rawPayload: _raw2,
      ...rest
    } = item
    return {
      ...rest,
      has_prose: hasProse,
      word_count: Number(item.word_count || item.wordCount || prose.length || 0),
      // writtenChapters()/chapterHasProse fallback marker without retaining multi-MB prose
      chapter_text: hasProse ? 'x'.repeat(100) : '',
    }
  })
}

function storyStateOf(project: any) {
  const config = project?.reference_config && typeof project.reference_config === 'object'
    ? project.reference_config
    : {}
  return config.story_state && typeof config.story_state === 'object' ? config.story_state : {}
}

function characterStateRows(storyState: any) {
  const rows = asArray(
    storyState?.character_states
    || storyState?.characters
    || storyState?.character_status
    || storyState?.cast_status,
  )
  return rows.map((item: any) => {
    if (typeof item === 'string') return { name: item, summary: item }
    return {
      name: text(item?.name || item?.character || item?.title, 40),
      summary: text(item?.summary || item?.status || item?.current_state || item?.state || item?.description, 240),
      identity: text(item?.identity || item?.current_identity || item?.role_label, 120),
      abilities: asArray(item?.abilities || item?.powers),
      relationships: asArray(item?.relationships || item?.relations),
      open_foreshadowing: asArray(item?.open_foreshadowing || item?.pending_hooks || item?.foreshadowing),
      public_image: text(item?.public_image || item?.image, 160),
      changelog: asArray(item?.changelog || item?.state_changelog || item?.history),
      chapter_no: Number(item?.chapter_no || item?.last_seen_chapter || item?.updated_chapter || 0) || null,
      raw: item,
    }
  }).filter((item: any) => item.name)
}

export function buildCharacterStatusOverview(input: {
  characters?: any[]
  settings?: any[]
  storyState?: any
  chapters?: any[]
} = {}) {
  const characters = asArray(input.characters)
  const settings = asArray(input.settings)
  const storyRows = characterStateRows(input.storyState)
  const storyByName = new Map(storyRows.map(item => [item.name, item]))
  const written = writtenChapters(input.chapters)
  const lastWrittenNo = written.length ? Number(written[written.length - 1].chapter_no || 0) : 0

  const settingCharacters = settings.filter(item => String(item.entity_type || '') === 'character')
  const names = new Set<string>()
  for (const item of characters) {
    const name = text(item?.name, 40)
    if (name) names.add(name)
  }
  for (const item of settingCharacters) {
    const name = text(item?.name, 40)
    if (name) names.add(name)
  }
  for (const item of storyRows) {
    if (item.name) names.add(item.name)
  }

  const rows = Array.from(names).map(name => {
    const character = characters.find(item => text(item?.name, 40) === name) || null
    const setting = settingCharacters.find(item => text(item?.name, 40) === name) || null
    const story = storyByName.get(name) || null
    const currentState = mergeNonEmpty(
      mergeNonEmpty(character?.current_state || {}, setting?.state_json || {}),
      story?.raw && typeof story.raw === 'object' ? story.raw : {},
    )
    const identity = firstText(
      story?.identity,
      currentState?.identity,
      currentState?.current_identity,
      currentState?.role_label,
      currentState?.title,
      character?.role,
      character?.role_type,
      setting?.summary,
    )
    const abilities = asArray(
      story?.abilities?.length ? story.abilities : null
      || character?.abilities
      || currentState?.abilities
      || currentState?.powers,
    )
    const relationships = asArray(
      story?.relationships?.length ? story.relationships : null
      || character?.relationships
      || currentState?.relationships,
    )
    const openForeshadowing = asArray(
      story?.open_foreshadowing?.length ? story.open_foreshadowing : null
      || currentState?.open_foreshadowing
      || currentState?.pending_hooks,
    )
    const publicImage = firstText(story?.public_image, currentState?.public_image, currentState?.image)
    const lastSeen = Number(
      currentState?.last_seen_chapter
      || currentState?.last_checked_chapter_no
      || story?.chapter_no
      || character?.last_chapter_no
      || setting?.last_chapter_no
      || 0,
    ) || null
    const statusLabel = firstText(
      currentState?.status,
      currentState?.identity_status,
      character?.status,
      setting?.status,
      'active',
    )
    const summary = firstText(
      story?.summary,
      character?.goal && `目标：${character.goal}`,
      setting?.summary,
      text(JSON.stringify(currentState), 160),
    )
    const missing: string[] = []
    if (!identity) missing.push('身份')
    if (!abilities.length) missing.push('能力')
    if (!relationships.length) missing.push('关系')
    if (!summary) missing.push('状态摘要')
    if (lastWrittenNo > 0 && (!lastSeen || lastSeen < Math.max(1, lastWrittenNo - 8))) missing.push('近期出场')

    return {
      name,
      character_id: character?.id || null,
      setting_id: setting?.id || null,
      role: firstText(character?.role, character?.role_type, setting?.payload_json?.role, 'supporting'),
      identity,
      abilities: abilities.slice(0, 12),
      relationships: relationships.slice(0, 12),
      public_image: publicImage,
      open_foreshadowing: openForeshadowing.slice(0, 12),
      current_state: currentState,
      status: statusLabel,
      last_seen_chapter: lastSeen,
      summary,
      missing_fields: missing,
      readiness: missing.length === 0 ? 'ready' : missing.length <= 2 ? 'partial' : 'thin',
      source: [
        character ? 'character_card' : null,
        setting ? 'setting_entity' : null,
        story ? 'story_state' : null,
      ].filter(Boolean),
    }
  }).sort((a, b) => {
    const rank = (row: any) => (row.readiness === 'thin' ? 0 : row.readiness === 'partial' ? 1 : 2)
    return rank(a) - rank(b) || String(a.name).localeCompare(String(b.name), 'zh')
  })

  return {
    version: 'character_status_overview_v1',
    last_written_chapter: lastWrittenNo || null,
    summary: {
      total: rows.length,
      ready: rows.filter(item => item.readiness === 'ready').length,
      partial: rows.filter(item => item.readiness === 'partial').length,
      thin: rows.filter(item => item.readiness === 'thin').length,
      missing_card: rows.filter(item => !item.character_id).length,
    },
    characters: rows,
  }
}

export function buildRelationMasterTable(input: {
  settings?: any[]
  characters?: any[]
  chapters?: any[]
  usage?: any[]
} = {}) {
  const graph = buildSettingRelationshipGraph({
    settings: input.settings || [],
    characters: input.characters || [],
    chapters: input.chapters || [],
    usage: input.usage || [],
  })
  const nodeMap = new Map(graph.nodes.map(node => [node.id, node]))
  const rows = graph.edges
    .filter(edge => edge.source.startsWith('setting-') && edge.target.startsWith('setting-'))
    .map(edge => {
      const source = nodeMap.get(edge.source)
      const target = nodeMap.get(edge.target)
      return {
        id: edge.id,
        source_id: source?.entity_id || null,
        source_name: source?.name || edge.source,
        source_type: source?.entity_type || '',
        target_id: target?.entity_id || null,
        target_name: target?.name || edge.target,
        target_type: target?.entity_type || '',
        relation_type: edge.relation_type,
        label: edge.label,
        confidence: edge.confidence,
        status: edge.status || 'active',
        start_chapter_no: edge.start_chapter_no ?? null,
        end_chapter_no: edge.end_chapter_no ?? null,
        evidence: edge.evidence || '',
        state: edge.state || {},
      }
    })
    .sort((a, b) => String(a.source_name).localeCompare(String(b.source_name), 'zh')
      || String(a.target_name).localeCompare(String(b.target_name), 'zh'))

  return {
    version: 'relation_master_table_v1',
    summary: {
      total: rows.length,
      explicit: rows.filter(item => item.confidence === 'explicit').length,
      inferred: rows.filter(item => item.confidence === 'inferred').length,
      usage: rows.filter(item => item.confidence === 'usage').length,
      diagnostics: graph.diagnostics.length,
      isolated_key_asset_count: graph.summary.isolated_key_asset_count,
    },
    rows,
    diagnostics: graph.diagnostics,
  }
}

export function buildChapterAssetPack(input: {
  chapter?: any
  settings?: any[]
  characters?: any[]
  usage?: any[]
  storyState?: any
} = {}) {
  const chapter = input.chapter || {}
  const chapterId = Number(chapter?.id || 0)
  const chapterNo = Number(chapter?.chapter_no || 0) || null
  const usage = asArray(input.usage).filter(item => !chapterId || Number(item.chapter_id || 0) === chapterId)
  const usageEntityIds = new Set(usage.map(item => Number(item.entity_id || 0)).filter(Boolean))
  const settings = asArray(input.settings)
  const characters = asArray(input.characters)
  const relatedSettings = settings.filter(item => {
    if (usageEntityIds.has(Number(item.id))) return true
    const relatedChapters = asArray(item.related_chapter_ids).map(Number)
    if (chapterId && relatedChapters.includes(chapterId)) return true
    const first = Number(item.first_chapter_no || 0)
    const last = Number(item.last_chapter_no || 0)
    if (chapterNo && first && first === chapterNo) return true
    if (chapterNo && first && last && chapterNo >= first && chapterNo <= last) return true
    return false
  })
  const relatedCharacterIds = new Set<number>()
  for (const setting of relatedSettings) {
    for (const id of asArray(setting.related_character_ids).map(Number).filter(Boolean)) relatedCharacterIds.add(id)
    if (setting.entity_type === 'character') {
      const matched = characters.find(item => text(item.name, 40) === text(setting.name, 40))
      if (matched?.id) relatedCharacterIds.add(Number(matched.id))
    }
  }
  const relatedCharacters = characters.filter(item => relatedCharacterIds.has(Number(item.id)))
  const byType = relatedSettings.reduce((acc: Record<string, any[]>, item) => {
    const key = String(item.entity_type || 'rule')
    acc[key] = acc[key] || []
    acc[key].push({
      id: item.id,
      name: item.name,
      summary: item.summary,
      status: item.status,
      state: item.state_json || {},
      constraints: item.constraints_json || {},
    })
    return acc
  }, {})

  const statusOverview = buildCharacterStatusOverview({
    characters: relatedCharacters.length ? relatedCharacters : characters,
    settings: relatedSettings,
    storyState: input.storyState,
    chapters: chapterNo ? [{ ...chapter, chapter_text: chapter.chapter_text || 'x'.repeat(100) }] : [],
  })

  return {
    version: 'chapter_asset_pack_v1',
    chapter_id: chapterId || null,
    chapter_no: chapterNo,
    summary: {
      setting_count: relatedSettings.length,
      character_count: relatedCharacters.length,
      usage_count: usage.length,
      types: Object.fromEntries(Object.entries(byType).map(([key, list]) => [key, list.length])),
    },
    characters: relatedCharacters.map(item => ({
      id: item.id,
      name: item.name,
      role: item.role || item.role_type,
      current_state: item.current_state || {},
      summary: firstText(item.goal, item.motivation, item.appearance),
    })),
    settings_by_type: byType,
    usage: usage.map(item => ({
      entity_id: item.entity_id,
      usage_type: item.usage_type || (item.required ? 'required' : item.forbidden ? 'forbidden' : 'allowed'),
      reveal_level: item.reveal_level || 'none',
      expected_state_change: item.expected_state_change || {},
      actual_state_change: item.actual_state_change || {},
    })),
    character_status: statusOverview.characters.slice(0, 20),
  }
}

export function collectPendingIntakeQueue(input: {
  reviews?: any[]
  settings?: any[]
  characters?: any[]
} = {}) {
  const settings = asArray(input.settings)
  const characters = asArray(input.characters)
  const characterNames = new Set(characters.map(item => text(item?.name, 40)).filter(Boolean))
  const settingKeys = new Set(settings.map(item => `${item.entity_type}:${text(item?.name, 40)}`))
  const appliedNames = new Set<string>()

  for (const review of asArray(input.reviews).filter(item => item?.review_type === 'asset_intake_apply')) {
    const payload = parseReviewPayload(review)
    for (const item of asArray(payload?.created_settings)) appliedNames.add(text(item?.payload_json?.original_name || item?.name, 40))
    for (const item of asArray(payload?.created_characters)) appliedNames.add(text(item?.name, 40))
    for (const item of asArray(payload?.merged_assets)) appliedNames.add(text(item?.source_name || item?.name, 40))
    for (const item of asArray(payload?.cameo_assets)) appliedNames.add(text(item?.name, 40))
    for (const item of asArray(payload?.skipped_existing)) appliedNames.add(text(item?.name, 40))
    for (const name of asArray(payload?.applied_asset_names)) appliedNames.add(text(name, 40))
  }

  const pending: any[] = []
  const seen = new Set<string>()
  const intakeReviews = asArray(input.reviews)
    .filter(item => item?.review_type === 'asset_intake')
    .sort((a, b) => Date.parse(String(b.created_at || '')) - Date.parse(String(a.created_at || '')))

  for (const review of intakeReviews) {
    const payload = parseReviewPayload(review)
    const assets = asArray(payload?.discovered_assets || payload?.asset_intake?.discovered_assets)
    const chapterId = reviewChapterId(review)
    const chapterNo = reviewChapterNo(review)
    for (const [index, asset] of assets.entries()) {
      const entityType = text(asset?.entity_type || asset?.type, 40) || 'item'
      const name = text(asset?.name || asset?.title, 40)
      if (!name) continue
      if (appliedNames.has(name)) continue
      const key = `${entityType}:${name}`
      if (seen.has(key)) continue
      if (settingKeys.has(key) || (entityType === 'character' && characterNames.has(name))) continue
      if (!DISCOVERED_ASSET_TYPES.includes(entityType) && entityType !== 'boss' && entityType !== 'rule') continue
      seen.add(key)
      pending.push({
        ...asset,
        entity_type: entityType,
        name,
        summary: text(asset?.summary || asset?.description || asset?.role || '', 240),
        evidence: text(asset?.evidence || asset?.source_excerpt || '', 240),
        chapter_id: Number(asset?.chapter_id || asset?.payload_json?.source_chapter_id || chapterId || 0) || null,
        chapter_no: Number(asset?.first_chapter_no || asset?.chapter_no || asset?.payload_json?.source_chapter_no || chapterNo || 0) || null,
        review_id: review?.id || null,
        disposition_default: 'confirm',
        _key: `${entityType}:${name}:${chapterId || 0}:${index}`,
      })
    }
  }

  return {
    version: 'asset_intake_queue_v1',
    summary: {
      total: pending.length,
      by_type: pending.reduce((acc: Record<string, number>, item) => {
        acc[item.entity_type] = (acc[item.entity_type] || 0) + 1
        return acc
      }, {}),
    },
    items: pending,
  }
}

export function buildAssetGapAudit(input: {
  characters?: any[]
  settings?: any[]
  chapters?: any[]
  worldbuilding?: any[]
  outlines?: any[]
  storyState?: any
  usage?: any[]
} = {}) {
  const characters = asArray(input.characters)
  const settings = asArray(input.settings)
  const chapters = writtenChapters(input.chapters)
  const worldbuilding = asArray(input.worldbuilding)
  const outlines = asArray(input.outlines)
  const status = buildCharacterStatusOverview({
    characters,
    settings,
    storyState: input.storyState,
    chapters: input.chapters,
  })
  const relations = buildRelationMasterTable({
    settings,
    characters,
    chapters: input.chapters,
    usage: input.usage,
  })
  const gaps: AssetGapItem[] = []

  if (chapters.length > 0 && characters.length < 2) {
    gaps.push({
      key: 'characters_too_few',
      category: 'character',
      severity: 'high',
      title: '角色卡过少',
      detail: `已写 ${chapters.length} 章，但仅有 ${characters.length} 张角色卡。`,
      fix_hint: '从正文回填角色，或确认新资产队列中的角色候选。',
      entity_type: 'character',
    })
  }

  for (const row of status.characters.filter(item => item.readiness !== 'ready').slice(0, 30)) {
    gaps.push({
      key: `character_status_${row.name}`,
      category: 'character_status',
      severity: row.readiness === 'thin' ? 'high' : 'warn',
      title: `角色状态不足：${row.name}`,
      detail: `缺少：${row.missing_fields.join('、') || '状态信息'}`,
      fix_hint: '同步故事状态机或从正文回填后完善角色卡。',
      entity_type: 'character',
      name: row.name,
      chapter_no: row.last_seen_chapter,
    })
  }

  const counts = settings.reduce((acc: Record<string, number>, item) => {
    const type = String(item.entity_type || 'rule')
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
  const requiredTypes: Array<{ type: string; label: string; min: number }> = [
    { type: 'location', label: '地点', min: 1 },
    { type: 'rule', label: '规则', min: 1 },
    { type: 'foreshadowing', label: '伏笔', min: Math.min(3, Math.max(1, Math.floor(chapters.length / 5))) },
    { type: 'faction', label: '势力', min: chapters.length >= 5 ? 1 : 0 },
    { type: 'item', label: '物品', min: chapters.length >= 3 ? 1 : 0 },
    { type: 'ability', label: '能力', min: chapters.length >= 3 ? 1 : 0 },
  ]
  for (const req of requiredTypes) {
    if (req.min <= 0) continue
    const have = Number(counts[req.type] || 0)
    if (have < req.min) {
      gaps.push({
        key: `missing_type_${req.type}`,
        category: 'setting_coverage',
        severity: have === 0 ? 'high' : 'warn',
        title: `${req.label}设定不足`,
        detail: `当前 ${have} 条，建议至少 ${req.min} 条。`,
        fix_hint: '使用正文回填或缺口补齐，从已有正文/世界观提炼。',
        entity_type: req.type,
      })
    }
  }

  const storyState = input.storyState
  const storyRelations = buildStoryRelationMaster({ storyState, settings, characters })
  if (storyRelations.summary.total === 0 && characters.length >= 2) {
    gaps.push({
      key: 'story_relation_master_empty',
      category: '关系主表',
      severity: 'high',
      title: '缺少故事关系主表',
      detail: '故事状态中还没有可用的角色关系真相层，写前无法稳定下发“谁和谁什么关系”。',
      fix_hint: '写后同步故事状态，或点“物化关系主表”从已有 character_relationships 生成。',
    })
  }
  const foreshadowBoard = buildForeshadowLifecycleBoard({
    storyState,
    settings,
    chapters: input.chapters,
    includeChapterHooks: false,
  })
  if (foreshadowBoard.summary.expired > 0) {
    gaps.push({
      key: 'foreshadow_expired',
      category: '伏笔生命周期',
      severity: 'warn',
      title: '存在过期伏笔',
      detail: `有 ${foreshadowBoard.summary.expired} 条伏笔已过期未处理。`,
      fix_hint: '复检/修订中补回收，或在故事状态将状态改为已回收/放弃。',
    })
  }

  // Graph isolation is secondary when story relation master already covers cast truth.
  if (relations.summary.isolated_key_asset_count > 0 && storyRelations.summary.total === 0) {
    gaps.push({
      key: 'isolated_key_assets',
      category: 'relation',
      severity: 'warn',
      title: '关键资产关系孤立',
      detail: `有 ${relations.summary.isolated_key_asset_count} 个关键资产缺少关系边。`,
      fix_hint: '优先补故事关系主表；图边诊断仅作辅助。',
    })
  } else if (relations.summary.isolated_key_asset_count > 8) {
    gaps.push({
      key: 'isolated_key_assets',
      category: 'relation',
      severity: 'info',
      title: '图诊断仍有孤立边',
      detail: `故事关系主表已有 ${storyRelations.summary.total} 条；图上仍有 ${relations.summary.isolated_key_asset_count} 个节点未连非章节边（可忽略章钩子/次要道具）。`,
      fix_hint: '不必为图边噪音打断写作；需要时再物化关系或修图。',
    })
  }

  if (worldbuilding.length === 0 && chapters.length > 0) {
    gaps.push({
      key: 'worldbuilding_missing',
      category: 'worldbuilding',
      severity: 'warn',
      title: '世界观资料为空',
      detail: '没有 worldbuilding 记录，设定补齐缺少源头。',
      fix_hint: '先完善写作圣经/世界观，再做设定孵化。',
    })
  }

  const chapterOutlines = outlines.filter(item => item.outline_type === 'chapter')
  if (chapters.length >= 10 && chapterOutlines.length < chapters.length) {
    gaps.push({
      key: 'outline_lag',
      category: 'outline',
      severity: 'info',
      title: '细纲覆盖落后正文',
      detail: `正文 ${chapters.length} 章，章纲 ${chapterOutlines.length} 条。`,
      fix_hint: '到大纲页做动态修订或扩写，避免任务书脱节。',
    })
  }

  const score = Math.max(0, 100 - gaps.reduce((sum, item) => {
    if (item.severity === 'high') return sum + 12
    if (item.severity === 'warn') return sum + 6
    return sum + 2
  }, 0))

  return {
    version: 'asset_gap_audit_v1',
    score,
    summary: {
      total_gaps: gaps.length,
      high: gaps.filter(item => item.severity === 'high').length,
      warn: gaps.filter(item => item.severity === 'warn').length,
      info: gaps.filter(item => item.severity === 'info').length,
      character_count: characters.length,
      setting_count: settings.length,
      written_chapter_count: chapters.length,
      relation_count: relations.summary.total,
    },
    gaps,
    character_status_summary: status.summary,
    relation_summary: relations.summary,
  }
}

function deterministicBackfillCandidates(input: {
  projectId: number
  chapters?: any[]
  characters?: any[]
  settings?: any[]
  worldbuilding?: any[]
  outlines?: any[]
  reviews?: any[]
}) {
  const chapters = writtenChapters(input.chapters)
  const existingCharacters = [...asArray(input.characters)]
  const existingSettings = [...asArray(input.settings)]
  const characterCreates: any[] = []
  const characterUpdates: any[] = []
  const settingSeeds: any[] = []
  const discoveredFromReviews = collectPendingIntakeQueue({
    reviews: input.reviews,
    settings: existingSettings,
    characters: existingCharacters,
  }).items

  for (const asset of discoveredFromReviews) {
    settingSeeds.push({
      project_id: input.projectId,
      entity_type: asset.entity_type,
      name: asset.name,
      summary: asset.summary || '',
      status: 'active',
      visibility: 'public',
      first_chapter_no: asset.chapter_no,
      constraints_json: parseJsonField(asset.constraints_json || asset.constraints, {}),
      state_json: parseJsonField(asset.state_json || asset.state, {}),
      payload_json: {
        source: 'prose_backfill_intake',
        evidence: asset.evidence || '',
        source_chapter_id: asset.chapter_id,
        source_chapter_no: asset.chapter_no,
        raw: asset,
      },
    })
  }

  for (let i = 0; i < chapters.length; i += 1) {
    const chapter = chapters[i]
    const previous = chapters.slice(Math.max(0, i - 8), i)
    const plan = planCharacterCardSync({
      projectId: input.projectId,
      chapter,
      existingCharacters,
      previousChapters: previous,
      characterUpdates: [],
    })
    for (const create of plan.character_creates) {
      characterCreates.push(create)
      existingCharacters.push({
        id: -existingCharacters.length - 1,
        name: create.name,
        role: create.role,
        role_type: create.role_type,
        current_state: create.current_state || {},
      })
    }
    for (const update of plan.character_updates) {
      characterUpdates.push(update)
      const target = existingCharacters.find(item =>
        (update.id && Number(item.id) === Number(update.id))
        || text(item.name, 40) === text(update.name, 40),
      )
      if (target) {
        target.current_state = mergeNonEmpty(target.current_state || {}, update.patch?.current_state || {})
        if (update.patch?.role && isEmptyValue(target.role)) target.role = update.patch.role
      }
    }
  }

  // Local worldbuilding / outline seeds only fill missing types; never replace.
  const localSeeds = seedSettingsFromLocalData(
    input.worldbuilding || [],
    existingCharacters,
    input.outlines || [],
    input.projectId,
  )
  const existingKeys = new Set(existingSettings.map(item => `${item.entity_type}:${text(item.name, 40)}`))
  for (const seed of localSeeds) {
    const key = `${seed.entity_type}:${text(seed.name, 40)}`
    if (existingKeys.has(key)) continue
    settingSeeds.push({
      ...seed,
      payload_json: {
        ...(seed.payload_json || {}),
        source: seed.payload_json?.source || 'prose_backfill_local_seed',
      },
    })
    existingKeys.add(key)
  }

  // Deduplicate setting seeds
  const seedMap = new Map<string, any>()
  for (const seed of settingSeeds) {
    const key = `${seed.entity_type}:${text(seed.name, 40)}`
    if (!key.endsWith(':')) {
      const prev = seedMap.get(key)
      seedMap.set(key, prev ? mergeNonEmpty(prev, seed) : seed)
    }
  }

  return {
    character_creates: uniqueByName(characterCreates),
    character_updates: uniqueUpdates(characterUpdates),
    setting_seeds: Array.from(seedMap.values()),
    discovered_assets: discoveredFromReviews,
  }
}

function uniqueByName(rows: any[]) {
  const map = new Map<string, any>()
  for (const row of rows) {
    const name = text(row?.name, 40)
    if (!name) continue
    map.set(name, map.has(name) ? mergeNonEmpty(map.get(name), row) : row)
  }
  return Array.from(map.values())
}

function uniqueUpdates(rows: any[]) {
  const map = new Map<string, any>()
  for (const row of rows) {
    const key = String(row?.id || row?.name || '')
    if (!key) continue
    const prev = map.get(key)
    map.set(key, prev
      ? { ...prev, patch: mergeNonEmpty(prev.patch || {}, row.patch || {}) }
      : row)
  }
  return Array.from(map.values())
}

export async function applyProseBackfillPlan(activeWorkspace: string, projectId: number, plan: {
  character_creates?: any[]
  character_updates?: any[]
  setting_seeds?: any[]
  dry_run?: boolean
}) {
  const [characters, settings] = await Promise.all([
    listNovelCharacters(activeWorkspace, projectId),
    listNovelSettingEntities(activeWorkspace, projectId),
  ])
  const createdCharacters: any[] = []
  const updatedCharacters: any[] = []
  const createdSettings: any[] = []
  const updatedSettings: any[] = []
  const skipped: any[] = []

  if (plan.dry_run) {
    return {
      dry_run: true,
      would_create_characters: asArray(plan.character_creates).length,
      would_update_characters: asArray(plan.character_updates).length,
      would_create_settings: asArray(plan.setting_seeds).length,
      character_creates: plan.character_creates || [],
      character_updates: plan.character_updates || [],
      setting_seeds: plan.setting_seeds || [],
    }
  }

  const characterByName = new Map(characters.map(item => [text(item.name, 40), item]))
  for (const create of asArray(plan.character_creates)) {
    const name = text(create?.name, 40)
    if (!name) continue
    if (characterByName.has(name)) {
      skipped.push({ kind: 'character', name, reason: 'exists' })
      continue
    }
    const created = await createNovelCharacter(activeWorkspace, {
      project_id: projectId,
      name,
      role_type: create.role_type || create.role || 'supporting',
      role: create.role || create.role_type || '配角',
      goal: create.goal || '',
      motivation: create.motivation || '',
      conflict: create.conflict || '',
      appearance: create.appearance || '',
      abilities: create.abilities || [],
      current_state: create.current_state || {},
      raw_payload: {
        source: 'prose_asset_backfill',
        ...(create.raw_payload || {}),
        source_excerpt: create.source_excerpt || '',
      },
    } as any)
    createdCharacters.push(created)
    characterByName.set(name, created)
  }

  for (const update of asArray(plan.character_updates)) {
    const target = characters.find(item =>
      (update.id && Number(item.id) === Number(update.id))
      || text(item.name, 40) === text(update.name, 40),
    ) || characterByName.get(text(update.name, 40))
    if (!target) {
      skipped.push({ kind: 'character_update', name: update.name, reason: 'missing' })
      continue
    }
    const patch = update.patch || {}
    const next = {
      role: isEmptyValue(target.role) ? (patch.role || target.role) : target.role,
      role_type: isEmptyValue(target.role_type) ? (patch.role_type || target.role_type) : target.role_type,
      goal: isEmptyValue(target.goal) ? (patch.goal || target.goal) : target.goal,
      motivation: isEmptyValue(target.motivation) ? (patch.motivation || target.motivation) : target.motivation,
      appearance: isEmptyValue(target.appearance) ? (patch.appearance || target.appearance) : target.appearance,
      abilities: mergeNonEmpty(target.abilities || [], patch.abilities || []),
      current_state: mergeNonEmpty(target.current_state || {}, patch.current_state || {}),
      relationships: mergeNonEmpty(target.relationships || [], patch.relationships || []),
    }
    const updated = await updateNovelCharacter(activeWorkspace, target.id, next as any)
    if (updated) updatedCharacters.push(updated)
  }

  const settingKey = (item: any) => `${item.entity_type}:${text(item.name, 40)}`
  const settingByKey = new Map(settings.map(item => [settingKey(item), item]))
  for (const seed of asArray(plan.setting_seeds)) {
    const name = text(seed?.name, 40)
    const entityType = text(seed?.entity_type || seed?.type, 40) || 'rule'
    if (!name) continue
    const key = `${entityType}:${name}`
    const existing = settingByKey.get(key)
    if (existing) {
      const merged = {
        summary: isEmptyValue(existing.summary) ? (seed.summary || existing.summary) : existing.summary,
        constraints_json: mergeNonEmpty(existing.constraints_json || {}, seed.constraints_json || {}),
        state_json: mergeNonEmpty(existing.state_json || {}, seed.state_json || {}),
        payload_json: mergeNonEmpty(existing.payload_json || {}, seed.payload_json || {}),
        first_chapter_no: existing.first_chapter_no ?? seed.first_chapter_no ?? null,
        last_chapter_no: existing.last_chapter_no ?? seed.last_chapter_no ?? null,
      }
      const updated = await updateNovelSettingEntity(activeWorkspace, existing.id, merged as any)
      if (updated) {
        updatedSettings.push(updated)
        settingByKey.set(key, updated)
      }
      continue
    }
    if (entityType === 'character') {
      let character = characterByName.get(name)
      if (!character) {
        character = await createNovelCharacter(activeWorkspace, {
          project_id: projectId,
          name,
          role_type: 'supporting',
          role: '配角',
          current_state: seed.state_json || {},
          raw_payload: { source: 'prose_asset_backfill_setting', raw: seed },
        } as any)
        createdCharacters.push(character)
        characterByName.set(name, character)
      }
      const created = await createNovelSettingEntity(activeWorkspace, {
        project_id: projectId,
        entity_type: 'character',
        name,
        summary: seed.summary || '',
        status: seed.status || 'active',
        visibility: seed.visibility || 'public',
        first_chapter_no: seed.first_chapter_no ?? null,
        last_chapter_no: seed.last_chapter_no ?? null,
        related_character_ids: [character.id],
        constraints_json: seed.constraints_json || {},
        state_json: seed.state_json || {},
        payload_json: mergeNonEmpty({ character_id: character.id }, seed.payload_json || {}),
      } as any)
      createdSettings.push(created)
      settingByKey.set(key, created)
      continue
    }
    const created = await createNovelSettingEntity(activeWorkspace, {
      project_id: projectId,
      entity_type: entityType,
      name,
      summary: seed.summary || '',
      status: seed.status || 'active',
      visibility: seed.visibility || 'public',
      first_chapter_no: seed.first_chapter_no ?? null,
      last_chapter_no: seed.last_chapter_no ?? null,
      constraints_json: seed.constraints_json || {},
      state_json: seed.state_json || {},
      payload_json: seed.payload_json || {},
    } as any)
    createdSettings.push(created)
    settingByKey.set(key, created)
  }

  return {
    dry_run: false,
    created_characters: createdCharacters,
    updated_characters: updatedCharacters,
    created_settings: createdSettings,
    updated_settings: updatedSettings,
    skipped,
    total_created: createdCharacters.length + createdSettings.length,
    total_updated: updatedCharacters.length + updatedSettings.length,
  }
}

export async function runProseAssetBackfill(activeWorkspace: string, project: any, options: {
  modelId?: number | string
  dryRun?: boolean
  maxChapters?: number
} = {}) {
  const projectId = Number(project.id)
  const [chapters, characters, settings, worldbuilding, outlines, reviews] = await Promise.all([
    listNovelChapters(activeWorkspace, projectId),
    listNovelCharacters(activeWorkspace, projectId),
    listNovelSettingEntities(activeWorkspace, projectId),
    listNovelWorldbuilding(activeWorkspace, projectId),
    listNovelOutlines(activeWorkspace, projectId),
    listNovelReviews(activeWorkspace, projectId),
  ])
  const written = writtenChapters(chapters)
  const windowed = options.maxChapters
    ? written.slice(Math.max(0, written.length - Number(options.maxChapters)))
    : written

  const deterministic = deterministicBackfillCandidates({
    projectId,
    chapters: windowed,
    characters,
    settings,
    worldbuilding,
    outlines,
    reviews,
  })

  let modelAssets: any[] = []
  if (options.modelId) {
    const sample = windowed.slice(-6).map(chapter => ({
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      text: text(chapter.chapter_text, 3500),
    }))
    const existingBrief = {
      characters: characters.map(item => item.name).slice(0, 40),
      settings: settings.map(item => ({ type: item.entity_type, name: item.name })).slice(0, 80),
    }
    const prompt = [
      '任务：从已写正文中提取应长期管理、但尚未入库的资产。只输出 JSON。',
      '硬性规则：',
      '1) 只补缺失资产，不要重写已有资产。',
      '2) entity_type 只能是 character/item/ability/faction/location/foreshadowing。',
      '3) 每项必须有 name、summary、evidence（正文原句）、first_chapter_no。',
      '4) 不要输出空 summary；不要输出一次性路人。',
      safeJsonStringify({ existing: existingBrief, chapters: sample }, 2, 14000),
      '输出：{"assets":[{"entity_type":"","name":"","summary":"","evidence":"","first_chapter_no":1,"state_json":{},"constraints_json":{}}]}',
    ].join('\n')
    try {
      const result = await executeNovelAgent('setting-agent', project, { task: prompt }, {
        activeWorkspace,
        modelId: String(options.modelId),
        maxTokens: 4500,
        temperature: 0.15,
        skipMemory: true,
      })
      const payload = getNovelPayload(result) || parseJsonLikePayload((result as any).output || (result as any).content || '') || {}
      modelAssets = asArray(payload?.assets || payload?.discovered_assets || payload?.settings)
        .map((item: any) => ({
          project_id: projectId,
          entity_type: text(item?.entity_type || item?.type, 40),
          name: text(item?.name || item?.title, 40),
          summary: text(item?.summary || item?.description, 240),
          first_chapter_no: Number(item?.first_chapter_no || item?.chapter_no || 0) || null,
          constraints_json: parseJsonField(item?.constraints_json || item?.constraints, {}),
          state_json: parseJsonField(item?.state_json || item?.state, {}),
          payload_json: {
            source: 'prose_asset_backfill_model',
            evidence: text(item?.evidence || item?.source_excerpt, 240),
            raw: item,
          },
        }))
        .filter((item: any) => item.name && DISCOVERED_ASSET_TYPES.includes(item.entity_type))
    } catch {
      modelAssets = []
    }
  }

  const settingSeeds = [
    ...deterministic.setting_seeds,
    ...modelAssets,
  ]
  const applyResult = await applyProseBackfillPlan(activeWorkspace, projectId, {
    character_creates: deterministic.character_creates,
    character_updates: deterministic.character_updates,
    setting_seeds: settingSeeds,
    dry_run: options.dryRun === true,
  })

  if (!options.dryRun) {
    await createNovelReview(activeWorkspace, {
      project_id: projectId,
      review_type: 'asset_prose_backfill',
      status: 'ok',
      summary: `正文回填资产：新建 ${applyResult.total_created || 0}，更新 ${applyResult.total_updated || 0}`,
      issues: [
        ...asArray(applyResult.created_characters).map((item: any) => `角色+ ${item.name}`),
        ...asArray(applyResult.created_settings).map((item: any) => `${item.entity_type}+ ${item.name}`),
        ...asArray(applyResult.updated_characters).map((item: any) => `角色更新 ${item.name}`),
        ...asArray(applyResult.updated_settings).map((item: any) => `${item.entity_type}更新 ${item.name}`),
      ].slice(0, 40),
      payload: JSON.stringify({
        written_chapters: windowed.length,
        model_used: Boolean(options.modelId),
        deterministic: {
          character_creates: deterministic.character_creates.length,
          character_updates: deterministic.character_updates.length,
          setting_seeds: deterministic.setting_seeds.length,
          intake_pending: deterministic.discovered_assets.length,
        },
        model_assets: modelAssets.length,
        result: applyResult,
      }),
    })
  }

  return {
    ok: true,
    written_chapters: windowed.length,
    model_used: Boolean(options.modelId),
    plan: {
      character_creates: deterministic.character_creates,
      character_updates: deterministic.character_updates,
      setting_seeds: settingSeeds,
      intake_pending: deterministic.discovered_assets,
    },
    result: applyResult,
  }
}

export async function runAssetGapFill(activeWorkspace: string, project: any, options: {
  modelId?: number | string
  dryRun?: boolean
} = {}) {
  const projectId = Number(project.id)
  const [chapters, characters, settings, worldbuilding, outlines, reviews, usage] = await Promise.all([
    listNovelChapters(activeWorkspace, projectId),
    listNovelCharacters(activeWorkspace, projectId),
    listNovelSettingEntities(activeWorkspace, projectId),
    listNovelWorldbuilding(activeWorkspace, projectId),
    listNovelOutlines(activeWorkspace, projectId),
    listNovelReviews(activeWorkspace, projectId),
    listNovelChapterSettingUsage(activeWorkspace, projectId),
  ])
  const auditBefore = buildAssetGapAudit({
    characters,
    settings,
    chapters,
    worldbuilding,
    outlines,
    storyState: storyStateOf(project),
    usage,
  })

  // First: apply pending intake + deterministic backfill (safe non-empty merge)
  const backfill = await runProseAssetBackfill(activeWorkspace, project, {
    modelId: options.modelId,
    dryRun: options.dryRun,
  })

  if (!options.dryRun) {
    await createNovelReview(activeWorkspace, {
      project_id: projectId,
      review_type: 'asset_gap_fill',
      status: auditBefore.summary.high > 0 ? 'warn' : 'ok',
      summary: `设定缺口补齐：回填新建 ${backfill.result?.total_created || 0}，更新 ${backfill.result?.total_updated || 0}`,
      issues: auditBefore.gaps.slice(0, 20).map(item => `${item.severity}:${item.title}`),
      payload: JSON.stringify({
        audit_before: auditBefore.summary,
        gaps: auditBefore.gaps,
        backfill: {
          total_created: backfill.result?.total_created || 0,
          total_updated: backfill.result?.total_updated || 0,
        },
      }),
    })
  }

  const [charactersAfter, settingsAfter] = options.dryRun
    ? [characters, settings]
    : await Promise.all([
      listNovelCharacters(activeWorkspace, projectId),
      listNovelSettingEntities(activeWorkspace, projectId),
    ])
  const auditAfter = buildAssetGapAudit({
    characters: charactersAfter,
    settings: settingsAfter,
    chapters,
    worldbuilding,
    outlines,
    storyState: storyStateOf(project),
    usage,
  })

  return {
    ok: true,
    dry_run: options.dryRun === true,
    audit_before: auditBefore,
    audit_after: auditAfter,
    backfill,
  }
}

export async function loadAssetUpgradeBundle(activeWorkspace: string, project: any, chapterId?: number) {
  const projectId = Number(project.id)
  // Overview must NOT pull full chapter_text for all chapters (can be multi-MB and inflate RSS).
  const [workspaceChapters, characters, settings, worldbuilding, outlines, reviews, allUsage] = await Promise.all([
    listNovelWorkspaceChapters(activeWorkspace, projectId),
    listNovelCharacters(activeWorkspace, projectId),
    listNovelSettingEntities(activeWorkspace, projectId),
    listNovelWorldbuilding(activeWorkspace, projectId),
    listNovelOutlines(activeWorkspace, projectId),
    listNovelReviews(activeWorkspace, projectId),
    listNovelChapterSettingUsage(activeWorkspace, projectId),
  ])
  const chapters = lightChapters(workspaceChapters)
  // Overview only needs intake-related reviews; full review history can be multi-MB.
  // listNovelReviews returns insert order (oldest first), so keep the NEWEST 80 (id 42).
  const lightReviews = (reviews || []).filter((item: any) => {
    const type = String(item?.review_type || "")
    return type === "asset_intake" || type === "asset_intake_apply" || type === "story_relation_materialize"
  }).slice(-80)
  const storyState = storyStateOf(project)
  let chapter = chapterId
    ? chapters.find(item => Number(item.id) === Number(chapterId)) || null
    : writtenChapters(chapters).slice(-1)[0] || null
  if (chapterId) {
    const full = await getNovelChapter(activeWorkspace, Number(chapterId), projectId)
    if (full) chapter = full
  }
  const chapterUsage = chapter
    ? allUsage.filter(item => Number(item.chapter_id || 0) === Number(chapter.id))
    : []

  return {
    character_status: (() => {
      const base = buildCharacterStatusOverview({ characters, settings, storyState, chapters })
      const storyRelations = buildStoryRelationMaster({ storyState, settings, characters })
      return enhanceCharacterStatusWithRelations(base, storyRelations)
    })(),
    relations: buildRelationMasterTable({ settings, characters, chapters, usage: allUsage }),
    story_relations: buildStoryRelationMaster({ storyState, settings, characters }),
    foreshadow_lifecycle: buildForeshadowLifecycleBoard({
      storyState,
      settings,
      chapters,
      includeChapterHooks: false,
    }),
    chapter_brief: chapter
      ? buildChapterWritingBrief({
        chapter,
        storyState,
        settings,
        characters,
        characterStatus: buildCharacterStatusOverview({ characters, settings, storyState, chapters }),
      })
      : null,
    intake_queue: collectPendingIntakeQueue({ reviews: lightReviews, settings, characters }),
    gap_audit: buildAssetGapAudit({
      characters,
      settings,
      chapters,
      worldbuilding,
      outlines,
      storyState,
      usage: allUsage,
    }),
    chapter_pack: chapter
      ? buildChapterAssetPack({
        chapter,
        settings,
        characters,
        usage: chapterUsage,
        storyState,
      })
      : null,
  }
}

export async function applyProjectIntakeQueue(
  activeWorkspace: string,
  projectId: number,
  assets: any[] = [],
  chapterHint?: any,
) {
  const chapters = await listNovelChapters(activeWorkspace, projectId)
  const byId = new Map(chapters.map(item => [Number(item.id), item]))
  const byNo = new Map(chapters.map(item => [Number(item.chapter_no), item]))
  const groups = new Map<number, any[]>()
  const fallbackChapter = chapterHint || writtenChapters(chapters).slice(-1)[0] || chapters[0] || { id: 0, chapter_no: 0 }

  for (const asset of asArray(assets)) {
    const chapterId = Number(asset?.chapter_id || 0)
    const chapterNo = Number(asset?.chapter_no || asset?.first_chapter_no || 0)
    const chapter = (chapterId && byId.get(chapterId))
      || (chapterNo && byNo.get(chapterNo))
      || fallbackChapter
    const key = Number(chapter?.id || 0)
    const list = groups.get(key) || []
    list.push(asset)
    groups.set(key, list)
  }

  const createdCharacters: any[] = []
  const createdSettings: any[] = []
  const mergedAssets: any[] = []
  const cameoAssets: any[] = []
  const skippedExisting: any[] = []

  for (const [chapterId, group] of groups.entries()) {
    const chapter = byId.get(chapterId) || fallbackChapter
    const result = await applyDiscoveredAssetsToProject(activeWorkspace, projectId, chapter, group)
    createdCharacters.push(...(result.created_characters || []))
    createdSettings.push(...(result.created_settings || []))
    mergedAssets.push(...(result.merged_assets || []))
    cameoAssets.push(...(result.cameo_assets || []))
    skippedExisting.push(...(result.skipped_existing || []))
  }

  await createNovelReview(activeWorkspace, {
    project_id: projectId,
    review_type: 'asset_intake_apply',
    status: 'ok',
    summary: `项目队列确认新资产 ${createdSettings.length} 项，合并 ${mergedAssets.length} 项，过场 ${cameoAssets.length} 项`,
    issues: [
      ...createdSettings.map((item: any) => `${item.entity_type}：${item.name}`),
      ...mergedAssets.map((item: any) => `合并：${item.source_name} → ${item.target_name}`),
      ...cameoAssets.map((item: any) => `过场：${item.entity_type}：${item.name}`),
      ...skippedExisting.map((item: any) => `已存在：${item.entity_type}：${item.name}`),
    ],
    payload: JSON.stringify({
      project_level: true,
      created_characters: createdCharacters,
      created_settings: createdSettings,
      merged_assets: mergedAssets,
      cameo_assets: cameoAssets,
      skipped_existing: skippedExisting,
    }),
  })

  return {
    created_characters: createdCharacters,
    created_settings: createdSettings,
    merged_assets: mergedAssets,
    cameo_assets: cameoAssets,
    skipped_existing: skippedExisting,
    total: createdCharacters.length + createdSettings.length,
  }
}
