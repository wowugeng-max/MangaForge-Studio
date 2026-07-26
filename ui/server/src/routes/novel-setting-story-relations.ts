/**
 * oh-story aligned story relation / foreshadow / chapter-brief layer.
 * Authoritative narrative sources live in project.reference_config.story_state:
 * - character_relationships
 * - foreshadowing_status
 * Graph edges remain auxiliary diagnostics, not the writing truth table.
 */
import {
  createNovelSettingEntity,
  listNovelCharacters,
  listNovelSettingEntities,
  updateNovelCharacter,
  updateNovelSettingEntity,
} from '../novel'
import {
  attachChangeNodesFromEstablishedEvents,
  applyForeshadowChapterWindow,
  countDueSoonForeshadow,
  listEstablishedEvents,
} from './novel-setting-story-relations-events'

function isEmptyValue(value: any): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return !value.trim()
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/** Local non-empty merge to avoid circular import with asset-upgrade. */
function mergeNonEmpty<T = any>(base: T, patch: any): T {
  if (patch === undefined || patch === null) return base
  if (Array.isArray(base) || Array.isArray(patch)) {
    const left = (Array.isArray(base) ? base : []).filter(item => !isEmptyValue(item))
    const right = (Array.isArray(patch) ? patch : []).filter(item => !isEmptyValue(item))
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
      if ((typeof prev === 'object' && prev) || (typeof value === 'object' && value) || Array.isArray(prev) || Array.isArray(value)) {
        next[key] = mergeNonEmpty(prev, value)
      }
    }
    return next as T
  }
  if (isEmptyValue(base) && !isEmptyValue(patch)) return patch as T
  return base
}

export const STORY_RELATION_TYPES = ['冲突', '联盟', '亲密', '权威', '敌对', '支配', '暧昧', '工作', '亲属', '未知'] as const

export type StoryRelationRow = {
  id: string
  pair_key: string
  party_a: string
  party_b: string
  story_relation_type: string
  emotion: '正面' | '负面' | '中性' | '混合'
  current_status: string
  start_chapter_no: number | null
  change_nodes: Array<{ chapter_no?: number | null; note: string }>
  source: string
  confidence: 'explicit' | 'inferred' | 'story_state'
  setting_id?: number | null
}

export type ForeshadowLifecycleRow = {
  id: string
  name: string
  summary: string
  lifecycle: '未埋' | '已埋' | '已回收' | '已过期' | '章钩子'
  importance: '高' | '中' | '低'
  plant_chapter_no: number | null
  expected_resolve_chapter_no: number | null
  resolve_chapter_no: number | null
  source: string
  setting_id?: number | null
  is_chapter_hook: boolean
}

function text(value: any, limit = 0) {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!raw) return ''
  return limit > 0 && raw.length > limit ? `${raw.slice(0, limit)}…` : raw
}

/** Same prose gate as asset-upgrade light chapters (avoid text(..., limit) truncation). */
function chapterHasProse(chapter: any) {
  if (chapter?.has_prose === true || chapter?.hasProse === true) return true
  const wordCount = Number(chapter?.word_count || chapter?.wordCount || 0)
  if (wordCount >= 80) return true
  const prose = String(chapter?.chapter_text || chapter?.chapterText || chapter?.content || chapter?.body || '')
    .replace(/\s+/g, ' ')
    .trim()
  return prose.length >= 80
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function asObject(value: any): Record<string, any> {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) return value
  return {}
}

export function isChapterHookName(name: string) {
  const value = text(name, 80)
  return /^第\d+章.+钩子$/.test(value) || (/^第\d+章/.test(value) && /钩子$/.test(value))
}

export function relationPairKey(a: string, b: string) {
  const left = text(a, 40)
  const right = text(b, 40)
  if (!left || !right) return ''
  return [left, right].sort((x, y) => x.localeCompare(y, 'zh')).join('↔')
}

/**
 * Word boundary for "与<名字><关系描述>" style strings: the name capture must stop
 * before a separator / copula / relation descriptor word, never swallow it (id 40).
 */
const RELATION_DESCRIPTOR_WORDS = [
  '亦师亦友', '亦敌亦友', '同盟', '联盟', '结盟', '盟友', '合作', '并肩', '伙伴', '搭档',
  '宿敌', '死敌', '仇敌', '仇人', '结仇', '结怨', '敌对', '敌人', '对立', '对抗', '竞争', '冲突', '反目', '决裂',
  '师徒', '师父', '师傅', '徒弟', '朋友', '好友', '挚友', '交好', '相识', '认识',
  '恋人', '恋爱', '暧昧', '喜欢', '爱慕', '夫妻', '兄弟', '姐妹', '亲人', '家人', '亲属', '祖孙',
  '同事', '同僚', '同门', '同窗', '上司', '下属', '上下级', '主仆', '追随', '效忠',
]

const STRING_RELATION_PATTERN = new RegExp(
  `^与?([\\u4e00-\\u9fffA-Za-z0-9·]{1,12}?)(?=[：:，,、\\s]|[是系乃]|(?:${RELATION_DESCRIPTOR_WORDS.join('|')}))`,
)

export function inferStoryRelationType(status: string) {
  const raw = text(status, 120)
  if (!raw) return '未知'
  if (/敌对|仇|宿敌|对抗|打压|造谣|黑子|锁定/.test(raw)) return '敌对'
  if (/支配|震慑|压迫|勒索|绝对压制|上下级|上司|下属|命令/.test(raw)) return '权威'
  if (/联盟|同盟|合作|并肩|伙伴|力保|赏识|背书/.test(raw)) return '联盟'
  if (/暧昧|恋爱|感情|喜欢|亲密|祖孙|亲情|家人|兄弟/.test(raw)) return '亲密'
  if (/冲突|对立|竞争/.test(raw)) return '冲突'
  if (/工作|采访|同事|同僚/.test(raw)) return '工作'
  return '未知'
}

export function inferEmotion(status: string): StoryRelationRow['emotion'] {
  const raw = text(status, 120)
  if (!raw) return '中性'
  if (/恐惧|敌对|负面|仇恨|打压|压制|震慑|残|杀|吞噬|出局/.test(raw) && /正面|赏识|暧昧|升温|力保/.test(raw)) return '混合'
  if (/恐惧|敌对|负面|仇恨|打压|压制|震慑|残|杀|吞噬|出局|黑/.test(raw)) return '负面'
  if (/正面|赏识|暧昧|升温|力保|联盟|合作|感激|背书|温馨/.test(raw)) return '正面'
  return '中性'
}

/** Parse keys like "江哲-顾主任" / "江哲与邻居" / "江哲↔秦建国". */
export function parseRelationPairKey(key: string, status = ''): { party_a: string; party_b: string } {
  const raw = text(key, 80)
  if (!raw) return { party_a: '', party_b: '' }
  if (raw.includes('↔')) {
    const [a, b] = raw.split('↔').map(part => text(part, 40))
    return { party_a: a, party_b: b }
  }
  if (raw.includes('-')) {
    const [a, b] = raw.split('-').map(part => text(part, 40))
    if (a && b) return { party_a: a, party_b: b }
  }
  const withYu = raw.match(/^([\u4e00-\u9fffA-Za-z0-9·（）()]{1,20})与([\u4e00-\u9fffA-Za-z0-9·（）()]{1,20})$/)
  if (withYu) return { party_a: withYu[1], party_b: withYu[2] }
  // Fallback: treat key as label, try to peel first known-looking token from status
  return { party_a: raw, party_b: '相关方' }
}

function chapterNoFromText(value: any): number | null {
  const raw = text(value, 80)
  const match = raw.match(/第\s*(\d+)\s*章/)
  if (match) return Number(match[1]) || null
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : null
}

function normalizeLifecycle(raw: any, name = '', lastWrittenNo = 0): ForeshadowLifecycleRow['lifecycle'] {
  if (isChapterHookName(name)) return '章钩子'
  const value = text(raw, 40).toLowerCase()
  if (/已回收|resolved|closed|回收完成|已关闭/.test(value)) return '已回收'
  if (/已过期|expired|错过|超期/.test(value)) return '已过期'
  if (/未埋|planned|planned_only|待埋/.test(value)) return '未埋'
  if (/已埋|open|planted|已铺垫|推进中|开放/.test(value)) return '已埋'
  // free-text foreshadowing_status values are usually open plants
  if (text(raw, 8)) return '已埋'
  if (lastWrittenNo > 0) return '已埋'
  return '未埋'
}

export function buildStoryRelationMaster(input: {
  storyState?: any
  settings?: any[]
  characters?: any[]
} = {}) {
  const storyState = asObject(input.storyState)
  const settings = asArray(input.settings)
  const characters = asArray(input.characters)
  const bag = new Map<string, StoryRelationRow>()

  const confidenceRank = (value?: string) => {
    // story_state is the writing truth layer; persisted entities are materialization.
    if (value === 'story_state') return 3
    if (value === 'explicit') return 2
    if (value === 'inferred') return 1
    return 0
  }

  const upsert = (row: Partial<StoryRelationRow> & { party_a: string; party_b: string; current_status: string }) => {
    const partyA = text(row.party_a, 40)
    const partyB = text(row.party_b, 40)
    if (!partyA || !partyB || partyA === partyB) return
    const pairKey = relationPairKey(partyA, partyB)
    if (!pairKey) return
    const prev = bag.get(pairKey)
    const status = text(row.current_status, 240)
    const incomingConfidence = row.confidence || 'story_state'
    // Lower-confidence mirrors (character card copies) must not clobber story_state authority.
    if (prev && confidenceRank(incomingConfidence) < confidenceRank(prev.confidence)) {
      bag.set(pairKey, {
        ...prev,
        setting_id: row.setting_id ?? prev.setting_id ?? null,
        change_nodes: [
          ...asArray(prev.change_nodes),
          ...asArray(row.change_nodes),
        ].filter(item => text(item?.note, 120)).slice(-8),
      })
      return
    }
    // infer* always returns a truthy default (未知/中性); only a real hit may
    // shadow prev, otherwise keep the previously known type/emotion (id 44).
    const inferredType = inferStoryRelationType(status)
    const inferredEmotion = inferEmotion(status)
    const next: StoryRelationRow = {
      id: prev?.id || row.id || `rel-${pairKey}`,
      pair_key: pairKey,
      party_a: partyA,
      party_b: partyB,
      story_relation_type: text(row.story_relation_type, 20) || (inferredType !== '未知' ? inferredType : '') || prev?.story_relation_type || '未知',
      emotion: row.emotion || (inferredEmotion !== '中性' ? inferredEmotion : undefined) || prev?.emotion || '中性',
      current_status: status || prev?.current_status || '',
      start_chapter_no: row.start_chapter_no ?? prev?.start_chapter_no ?? null,
      change_nodes: [
        ...asArray(prev?.change_nodes),
        ...asArray(row.change_nodes),
      ].filter(item => text(item?.note, 120)).slice(-8),
      source: text(row.source, 40) || prev?.source || 'story_state',
      confidence: incomingConfidence || prev?.confidence || 'story_state',
      setting_id: row.setting_id ?? prev?.setting_id ?? null,
    }
    if (prev && prev.current_status && next.current_status && prev.current_status !== next.current_status) {
      if (next.current_status.length + 8 < prev.current_status.length && confidenceRank(prev.confidence) >= confidenceRank(next.confidence)) {
        next.current_status = prev.current_status
        next.story_relation_type = prev.story_relation_type
        next.emotion = prev.emotion
        next.party_a = prev.party_a
        next.party_b = prev.party_b
      }
    }
    bag.set(pairKey, next)
  }

  // 1) Explicit relationship entities
  for (const setting of settings.filter(item => String(item.entity_type || '') === 'relationship')) {
    const state = asObject(setting.state_json)
    const payload = asObject(setting.payload_json)
    const partyA = text(state.party_a || payload.party_a, 40)
    const partyB = text(state.party_b || payload.party_b, 40)
    const pair = partyA && partyB ? { party_a: partyA, party_b: partyB } : parseRelationPairKey(setting.name)
    upsert({
      id: `setting-${setting.id}`,
      party_a: pair.party_a,
      party_b: pair.party_b,
      story_relation_type: text(state.story_relation_type || state.relation_type, 20),
      emotion: (text(state.emotion, 8) as any) || undefined,
      current_status: text(state.current_status || setting.summary, 240),
      start_chapter_no: Number(state.start_chapter_no || setting.first_chapter_no || 0) || null,
      change_nodes: asArray(state.change_nodes),
      source: 'setting_entity',
      confidence: 'explicit',
      setting_id: Number(setting.id) || null,
    })
  }

  // 2) story_state.character_relationships (authoritative writing truth)
  const relMap = asObject(storyState.character_relationships || storyState.characterRelationships)
  for (const [key, value] of Object.entries(relMap)) {
    const status = typeof value === 'string' ? value : text((value as any)?.status || (value as any)?.current_status || JSON.stringify(value), 240)
    const pair = typeof value === 'object' && value
      ? {
          party_a: text((value as any).party_a || (value as any).a, 40),
          party_b: text((value as any).party_b || (value as any).b, 40),
        }
      : parseRelationPairKey(key, status)
    if (!pair.party_a || pair.party_a === key && !pair.party_b) {
      const parsed = parseRelationPairKey(key, status)
      pair.party_a = parsed.party_a
      pair.party_b = parsed.party_b
    }
    upsert({
      party_a: pair.party_a,
      party_b: pair.party_b,
      current_status: status,
      story_relation_type: typeof value === 'object' ? text((value as any)?.type || (value as any)?.relation_type, 20) : '',
      start_chapter_no: typeof value === 'object' ? chapterNoFromText((value as any)?.start_chapter_no || (value as any)?.start) : null,
      change_nodes: typeof value === 'object' ? asArray((value as any)?.change_nodes) : [],
      source: 'story_state.character_relationships',
      confidence: 'story_state',
    })
  }

  // 3) character.relationships arrays
  for (const character of characters) {
    const name = text(character?.name, 40)
    if (!name) continue
    for (const rel of asArray(character?.relationships)) {
      if (typeof rel === 'string') {
        const status = text(rel, 240)
        if (!status) continue
        // "与小林同盟" style: cut the name at the descriptor boundary; skip when unsplittable.
        const m = status.match(STRING_RELATION_PATTERN)
        if (m) {
          upsert({
            party_a: name,
            party_b: m[1],
            current_status: status,
            source: 'character.relationships',
            confidence: 'inferred',
          })
        }
        continue
      }
      if (rel && typeof rel === 'object') {
        const other = text(rel.target || rel.name || rel.party_b || rel.with, 40)
        if (!other) continue
        upsert({
          party_a: name,
          party_b: other,
          current_status: text(rel.status || rel.state || rel.relation_type || rel.type || rel.summary, 240),
          story_relation_type: text(rel.story_relation_type || rel.relation_type || rel.type, 20),
          start_chapter_no: chapterNoFromText(rel.start_chapter_no || rel.start),
          source: 'character.relationships',
          confidence: 'inferred',
        })
      }
    }
  }

  const events = listEstablishedEvents(storyState)
  const rows = attachChangeNodesFromEstablishedEvents(
    [...bag.values()].sort((a, b) => a.party_a.localeCompare(b.party_a, 'zh') || a.party_b.localeCompare(b.party_b, 'zh')),
    events,
  )
  return {
    version: 'story_relation_master_v1',
    summary: {
      total: rows.length,
      conflict: rows.filter(item => /冲突|敌对/.test(item.story_relation_type)).length,
      alliance: rows.filter(item => /联盟|工作/.test(item.story_relation_type)).length,
      intimate: rows.filter(item => /亲密|暧昧|亲属/.test(item.story_relation_type)).length,
      authority: rows.filter(item => /权威|支配/.test(item.story_relation_type)).length,
      negative: rows.filter(item => item.emotion === '负面').length,
      with_change_nodes: rows.filter(item => asArray(item.change_nodes).length > 0).length,
      established_events_used: events.length,
    },
    rows,
  }
}

export function buildForeshadowLifecycleBoard(input: {
  storyState?: any
  settings?: any[]
  chapters?: any[]
  includeChapterHooks?: boolean
} = {}) {
  const storyState = asObject(input.storyState)
  const settings = asArray(input.settings)
  const chapters = asArray(input.chapters)
  const lastWrittenNo = chapters
    .filter(chapterHasProse)
    .reduce((max, item) => Math.max(max, Number(item.chapter_no || 0) || 0), 0)
  const bag = new Map<string, ForeshadowLifecycleRow>()

  const upsert = (row: Partial<ForeshadowLifecycleRow> & { name: string }) => {
    const name = text(row.name, 80)
    if (!name) return
    const isHook = row.is_chapter_hook === true || isChapterHookName(name)
    if (isHook && input.includeChapterHooks === false) return
    const prev = bag.get(name)
    const summary = text(row.summary, 280) || prev?.summary || ''
    // story_state is the writing truth layer (id 41): setting entities may only
    // supplement chapter numbers etc., never downgrade a story_state lifecycle.
    const prevIsStoryState = Boolean(prev && String(prev.source || '').startsWith('story_state'))
    const incomingIsSetting = ['setting_entity', 'outline_hook'].includes(text(row.source, 40))
    const lifecycle = prevIsStoryState && incomingIsSetting
      ? prev!.lifecycle
      : row.lifecycle || normalizeLifecycle(row.lifecycle || summary, name, lastWrittenNo)
    bag.set(name, {
      id: prev?.id || row.id || `fs-${name}`,
      name,
      summary,
      lifecycle: isHook ? '章钩子' : lifecycle,
      importance: (row.importance as any) || prev?.importance || (/高|关键|主线|核心/.test(summary) ? '高' : '中'),
      plant_chapter_no: row.plant_chapter_no ?? prev?.plant_chapter_no ?? null,
      expected_resolve_chapter_no: row.expected_resolve_chapter_no ?? prev?.expected_resolve_chapter_no ?? null,
      resolve_chapter_no: row.resolve_chapter_no ?? prev?.resolve_chapter_no ?? null,
      source: prevIsStoryState && incomingIsSetting
        ? prev!.source
        : text(row.source, 40) || prev?.source || 'story_state',
      setting_id: row.setting_id ?? prev?.setting_id ?? null,
      is_chapter_hook: isHook,
    })
  }

  const statusMap = asObject(storyState.foreshadowing_status || storyState.foreshadowingStatus)
  for (const [name, value] of Object.entries(statusMap)) {
    if (typeof value === 'string') {
      upsert({ name, summary: value, source: 'story_state.foreshadowing_status' })
      continue
    }
    if (value && typeof value === 'object') {
      upsert({
        name,
        summary: text((value as any).summary || (value as any).status || (value as any).detail || JSON.stringify(value), 280),
        lifecycle: normalizeLifecycle((value as any).lifecycle || (value as any).status, name, lastWrittenNo),
        plant_chapter_no: chapterNoFromText((value as any).plant_chapter_no || (value as any).planted_at),
        expected_resolve_chapter_no: chapterNoFromText((value as any).expected_resolve_chapter_no || (value as any).due),
        resolve_chapter_no: chapterNoFromText((value as any).resolve_chapter_no || (value as any).resolved_at),
        importance: text((value as any).importance, 8) as any,
        source: 'story_state.foreshadowing_status',
      })
    }
  }

  for (const setting of settings.filter(item => String(item.entity_type || '') === 'foreshadowing')) {
    const payload = asObject(setting.payload_json)
    const state = asObject(setting.state_json)
    const isHook = String(payload.source || '') === 'outline_hook' || isChapterHookName(setting.name)
    upsert({
      id: `setting-${setting.id}`,
      name: setting.name,
      summary: text(state.summary || setting.summary || payload.summary, 280),
      lifecycle: isHook ? '章钩子' : normalizeLifecycle(state.lifecycle || state.status, setting.name, lastWrittenNo),
      plant_chapter_no: Number(state.plant_chapter_no || setting.first_chapter_no || 0) || null,
      expected_resolve_chapter_no: Number(state.expected_resolve_chapter_no || 0) || null,
      resolve_chapter_no: Number(state.resolve_chapter_no || setting.last_chapter_no || 0) || null,
      importance: (text(state.importance, 8) as any) || '中',
      source: isHook ? 'outline_hook' : 'setting_entity',
      setting_id: Number(setting.id) || null,
      is_chapter_hook: isHook,
    })
  }

  const rows = [...bag.values()]
    .filter(item => input.includeChapterHooks ? true : !item.is_chapter_hook)
    .map(item => applyForeshadowChapterWindow(item, lastWrittenNo))
    .sort((a, b) => {
      const rank = (row: ForeshadowLifecycleRow) => (
        row.lifecycle === '已过期' ? 0
          : row.lifecycle === '已埋' ? 1
            : row.lifecycle === '未埋' ? 2
              : row.lifecycle === '已回收' ? 3
                : 4
      )
      return rank(a) - rank(b) || a.name.localeCompare(b.name, 'zh')
    })

  return {
    version: 'foreshadow_lifecycle_board_v1',
    last_written_chapter: lastWrittenNo || null,
    summary: {
      total: rows.length,
      open: rows.filter(item => item.lifecycle === '已埋' || item.lifecycle === '未埋').length,
      resolved: rows.filter(item => item.lifecycle === '已回收').length,
      expired: rows.filter(item => item.lifecycle === '已过期').length,
      due_soon: countDueSoonForeshadow(rows, lastWrittenNo),
      chapter_hooks_hidden: input.includeChapterHooks ? 0 : settings.filter(item => String(item.entity_type || '') === 'foreshadowing' && (String(asObject(item.payload_json).source || '') === 'outline_hook' || isChapterHookName(item.name))).length,
    },
    rows,
  }
}

export function buildChapterWritingBrief(input: {
  chapter?: any
  storyState?: any
  settings?: any[]
  characters?: any[]
  storyRelations?: ReturnType<typeof buildStoryRelationMaster>
  foreshadowBoard?: ReturnType<typeof buildForeshadowLifecycleBoard>
  characterStatus?: any
} = {}) {
  const chapter = input.chapter || {}
  const chapterNo = Number(chapter.chapter_no || 0) || null
  const storyState = asObject(input.storyState)
  const relations = input.storyRelations || buildStoryRelationMaster({
    storyState,
    settings: input.settings,
    characters: input.characters,
  })
  const foreshadow = input.foreshadowBoard || buildForeshadowLifecycleBoard({
    storyState,
    settings: input.settings,
    chapters: chapterNo ? [chapter] : [],
    includeChapterHooks: false,
  })
  const statusRows = asArray(input.characterStatus?.characters)

  // Prefer characters mentioned in chapter outline-ish fields / story positions
  const focusNames = new Set<string>()
  for (const name of Object.keys(asObject(storyState.character_positions || storyState.characterPositions))) {
    if (text(name, 40)) focusNames.add(text(name, 40))
  }
  for (const row of statusRows.slice(0, 12)) {
    if (text(row?.name, 40)) focusNames.add(text(row.name, 40))
  }
  for (const character of asArray(input.characters).slice(0, 8)) {
    if (text(character?.name, 40)) focusNames.add(text(character.name, 40))
  }
  // Always keep protagonist-looking first card
  if (!focusNames.size) {
    for (const row of relations.rows) {
      focusNames.add(row.party_a)
      focusNames.add(row.party_b)
    }
  }

  const relationRows = relations.rows.filter(row => focusNames.has(row.party_a) || focusNames.has(row.party_b)).slice(0, 12)
  const characterLines = (statusRows.length ? statusRows : asArray(input.characters).map(item => ({
    name: item.name,
    identity: item.role || item.role_type,
    summary: text(asObject(item.current_state).summary || item.goal, 120),
    abilities: asArray(item.abilities),
  })))
    .filter((row: any) => !focusNames.size || focusNames.has(text(row.name, 40)))
    .slice(0, 8)
    .map((row: any) => ({
      name: text(row.name, 40),
      line: text([
        row.identity,
        asArray(row.abilities).slice(0, 2).join('、'),
        row.summary,
        row.public_image,
      ].filter(Boolean).join('；'), 160),
    }))

  const foreshadowLines = foreshadow.rows
    .filter(item => item.lifecycle === '已埋' || item.lifecycle === '已过期' || item.lifecycle === '未埋')
    .slice(0, 8)
    .map(item => ({
      name: item.name,
      lifecycle: item.lifecycle,
      action: item.lifecycle === '已过期' ? '需补回收或改判放弃' : item.lifecycle === '未埋' ? '可埋设' : '可推进/回收',
      summary: item.summary,
    }))

  const worldConstraints = [
    ...asArray(storyState.world_rules).map((item: any) => text(typeof item === 'string' ? item : item?.summary || item?.name, 120)),
    ...asArray(input.settings)
      .filter(item => ['rule', 'system'].includes(String(item.entity_type || '')))
      .slice(0, 6)
      .map(item => text(`${item.name}：${item.summary || ''}`, 120)),
  ].filter(Boolean).slice(0, 8)

  return {
    version: 'chapter_writing_brief_v1',
    chapter_id: Number(chapter.id || 0) || null,
    chapter_no: chapterNo,
    filter_rule: '只保留会影响本章写对的关系、角色状态、伏笔与世界约束（oh-story 本节速记）。',
    character_states: characterLines,
    relations: relationRows.map(row => ({
      pair: `${row.party_a}↔${row.party_b}`,
      type: row.story_relation_type,
      emotion: row.emotion,
      status: row.current_status,
    })),
    foreshadowing: foreshadowLines,
    world_constraints: worldConstraints,
    unresolved_conflicts: asArray(storyState.unresolved_conflicts).map((item: any) => text(item, 120)).filter(Boolean).slice(0, 8),
    next_priorities: asArray(storyState.next_chapter_priorities).map((item: any) => text(item, 120)).filter(Boolean).slice(0, 8),
  }
}

export function buildStoryRelationPatchesFromState(storyState: any = {}) {
  const master = buildStoryRelationMaster({ storyState })
  return master.rows.map(row => ({
    party_a: row.party_a,
    party_b: row.party_b,
    story_relation_type: row.story_relation_type,
    emotion: row.emotion,
    current_status: row.current_status,
    start_chapter_no: row.start_chapter_no,
    change_nodes: row.change_nodes,
    pair_key: row.pair_key,
  }))
}

/** Persist story relations as setting entities + character.relationships (non-empty merge). */
export async function materializeStoryRelations(
  activeWorkspace: string,
  projectId: number,
  input: {
    storyState?: any
    rows?: any[]
    dryRun?: boolean
  } = {},
) {
  const settings = await listNovelSettingEntities(activeWorkspace, projectId)
  const characters = await listNovelCharacters(activeWorkspace, projectId)
  const master = input.rows?.length
    ? {
        rows: input.rows.map((row: any) => ({
          pair_key: row.pair_key || relationPairKey(row.party_a, row.party_b),
          party_a: text(row.party_a, 40),
          party_b: text(row.party_b, 40),
          story_relation_type: text(row.story_relation_type, 20) || inferStoryRelationType(row.current_status),
          emotion: row.emotion || inferEmotion(row.current_status),
          current_status: text(row.current_status, 240),
          start_chapter_no: Number(row.start_chapter_no || 0) || null,
          change_nodes: asArray(row.change_nodes),
          source: text(row.source, 40) || 'manual',
          confidence: row.confidence || 'explicit',
        })),
      }
    : buildStoryRelationMaster({ storyState: input.storyState, settings, characters })

  const existing = settings.filter(item => String(item.entity_type || '') === 'relationship')
  const byPair = new Map<string, any>()
  for (const item of existing) {
    const state = asObject(item.state_json)
    const payload = asObject(item.payload_json)
    const key = text(payload.pair_key || relationPairKey(state.party_a, state.party_b) || item.name, 80)
    if (key) byPair.set(key, item)
  }

  const created: any[] = []
  const updated: any[] = []
  const characterPatches: any[] = []

  for (const row of master.rows) {
    if (!row.party_a || !row.party_b || !row.current_status) continue
    const pairKey = row.pair_key || relationPairKey(row.party_a, row.party_b)
    const name = pairKey
    const nextState = {
      party_a: row.party_a,
      party_b: row.party_b,
      story_relation_type: row.story_relation_type || inferStoryRelationType(row.current_status),
      emotion: row.emotion || inferEmotion(row.current_status),
      current_status: row.current_status,
      start_chapter_no: row.start_chapter_no,
      change_nodes: asArray(row.change_nodes).slice(-8),
    }
    const prev = byPair.get(pairKey)
    if (input.dryRun) {
      if (prev) updated.push({ id: prev.id, name, dry_run: true })
      else created.push({ name, dry_run: true })
      continue
    }
    if (prev) {
      const mergedState = mergeNonEmpty(asObject(prev.state_json), nextState)
      const mergedPayload = mergeNonEmpty(asObject(prev.payload_json), {
        source: 'story_relation_master',
        pair_key: pairKey,
      })
      const saved = await updateNovelSettingEntity(activeWorkspace, Number(prev.id), {
        name,
        summary: row.current_status,
        state_json: mergedState,
        payload_json: mergedPayload,
        status: 'active',
      } as any)
      if (saved) updated.push(saved)
    } else {
      const saved = await createNovelSettingEntity(activeWorkspace, {
        project_id: projectId,
        entity_type: 'relationship',
        name,
        summary: row.current_status,
        status: 'active',
        visibility: 'public',
        state_json: nextState,
        payload_json: {
          source: 'story_relation_master',
          pair_key: pairKey,
        },
        constraints_json: {},
        related_entity_ids: [],
        related_chapter_ids: [],
        related_character_ids: [],
      } as any)
      created.push(saved)
      byPair.set(pairKey, saved)
    }

    // Mirror onto character cards (both sides) without blank overwrite.
    for (const side of [row.party_a, row.party_b]) {
      const character = characters.find(item => text(item.name, 40) === side)
      if (!character) continue
      const other = side === row.party_a ? row.party_b : row.party_a
      const prevRels = asArray(character.relationships)
      const nextRel = {
        name: other,
        target: other,
        type: row.story_relation_type,
        status: row.current_status,
        emotion: row.emotion,
      }
      const exists = prevRels.some((item: any) => {
        if (typeof item === 'string') return item.includes(other)
        return text(item?.name || item?.target, 40) === other
      })
      const relationships = exists
        ? prevRels.map((item: any) => {
            if (typeof item === 'string' && item.includes(other)) return `${other}：${row.current_status}`
            if (typeof item === 'object' && text(item?.name || item?.target, 40) === other) {
              return mergeNonEmpty(item, nextRel)
            }
            return item
          })
        : [...prevRels, nextRel]
      if (input.dryRun) continue
      const savedChar = await updateNovelCharacter(activeWorkspace, Number(character.id), {
        relationships,
      } as any)
      if (savedChar) {
        characterPatches.push({ id: character.id, name: character.name, other })
        // keep local list fresh for subsequent sides
        character.relationships = relationships
      }
    }
  }

  return {
    version: 'materialize_story_relations_v1',
    dry_run: Boolean(input.dryRun),
    summary: {
      total: master.rows.length,
      created: created.length,
      updated: updated.length,
      character_patches: characterPatches.length,
    },
    created,
    updated,
    character_patches: characterPatches,
    rows: master.rows,
  }
}

export function enhanceCharacterStatusWithRelations(
  statusOverview: any,
  storyRelations: ReturnType<typeof buildStoryRelationMaster>,
) {
  const rows = asArray(statusOverview?.characters).map((row: any) => {
    const name = text(row.name, 40)
    const related = storyRelations.rows
      .filter(item => item.party_a === name || item.party_b === name)
      .map(item => {
        const other = item.party_a === name ? item.party_b : item.party_a
        return `${other}（${item.story_relation_type}·${item.emotion}）：${item.current_status}`
      })
    const relationships = related.length
      ? Array.from(new Set([...asArray(row.relationships).map((item: any) => text(item, 160)), ...related])).filter(Boolean).slice(0, 12)
      : asArray(row.relationships)
    const missing = asArray(row.missing_fields).filter((item: any) => item !== '关系' || relationships.length === 0)
    if (!relationships.length && !missing.includes('关系')) missing.push('关系')
    if (relationships.length) {
      const idx = missing.indexOf('关系')
      if (idx >= 0) missing.splice(idx, 1)
    }
    return {
      ...row,
      relationships,
      missing_fields: missing,
      readiness: missing.length === 0 ? 'ready' : missing.length <= 2 ? 'partial' : 'thin',
    }
  })
  return {
    ...statusOverview,
    version: statusOverview?.version || 'character_status_overview_v1',
    summary: {
      ...(statusOverview?.summary || {}),
      total: rows.length,
      ready: rows.filter((item: any) => item.readiness === 'ready').length,
      partial: rows.filter((item: any) => item.readiness === 'partial').length,
      thin: rows.filter((item: any) => item.readiness === 'thin').length,
    },
    characters: rows,
  }
}

export {
  collectRelationChangeNodesFromEvents,
  foreshadowOpenWindowChapters,
  inferForeshadowExpectedResolveChapter,
} from './novel-setting-story-relations-events'
