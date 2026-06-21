export type SettingRelationshipNodeKind = 'setting' | 'chapter'
export type SettingRelationshipConfidence = 'explicit' | 'inferred' | 'usage'

export type SettingRelationshipStateChange = {
  chapter_id?: number
  chapter_no?: number | null
  usage_type?: string
  reveal_level?: string
  expected_state_change?: any
  actual_state_change?: any
  status?: string
  note?: string
}

export type SettingRelationshipNode = {
  id: string
  kind: SettingRelationshipNodeKind
  entity_id?: number
  chapter_id?: number
  entity_type?: string
  name: string
  summary?: string
  metadata: Record<string, any>
}

export type SettingRelationshipEdge = {
  id: string
  source: string
  target: string
  relation_type: string
  label: string
  confidence: SettingRelationshipConfidence
  start_chapter_no?: number | null
  end_chapter_no?: number | null
  status?: string
  state?: any
  state_changes?: SettingRelationshipStateChange[]
  evidence?: string
}

export type SettingRelationshipDiagnostic = {
  type: string
  severity: 'info' | 'warning' | 'high'
  entity_id?: number
  entity_name?: string
  message: string
  evidence?: string
}

export type SettingRelationshipGraph = {
  nodes: SettingRelationshipNode[]
  edges: SettingRelationshipEdge[]
  diagnostics: SettingRelationshipDiagnostic[]
  summary: {
    node_count: number
    edge_count: number
    isolated_key_asset_count: number
    missing_owner_count: number
    missing_start_chapter_count: number
    timeline_conflict_count: number
    owner_mismatch_count: number
  }
}

export type SettingRelationshipGraphInput = {
  settings: any[]
  characters?: any[]
  chapters?: any[]
  usage?: any[]
}

const STORYLINE_TYPES = new Set(['mainline', 'subplot', 'character_arc', 'relationship_arc', 'faction_arc', 'foreshadowing_arc'])
const KEY_ASSET_TYPES = new Set(['character', 'ability', 'realm', 'item', 'boss', 'faction', 'foreshadowing', ...STORYLINE_TYPES])

function settingNodeId(setting: any) {
  return `setting-${Number(setting?.id || 0)}`
}

function chapterNodeId(chapterId: number) {
  return `chapter-${chapterId}`
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function stringValues(value: any): string[] {
  return asArray(value)
    .flatMap(item => {
      if (typeof item === 'string' || typeof item === 'number') return [String(item)]
      if (item && typeof item === 'object') return [
        item.name,
        item.title,
        item.target,
        item.target_name,
        item.faction,
        item.realm,
        item.owner,
      ].filter(Boolean).map(String)
      return []
    })
    .map(item => item.trim())
    .filter(Boolean)
}

function firstText(...values: any[]) {
  for (const value of values) {
    const text = String(value || '').trim()
    if (text) return text
  }
  return ''
}

function firstNumber(...values: any[]) {
  for (const value of values) {
    const number = Number(value || 0)
    if (number > 0) return number
  }
  return null
}

function meaningfulObject(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0
}

function normalizeStateChanges(value: any): SettingRelationshipStateChange[] {
  return asArray(value)
    .map(item => {
      if (!item) return null
      if (typeof item === 'object' && !Array.isArray(item)) return item as SettingRelationshipStateChange
      return { note: String(item) }
    })
    .filter(Boolean) as SettingRelationshipStateChange[]
}

function relationRefs(value: any) {
  return asArray(value)
    .map(item => {
      if (typeof item === 'string' || typeof item === 'number') return { name: String(item).trim() }
      if (!item || typeof item !== 'object') return null
      const name = firstText(item.name, item.title, item.target, item.target_name, item.character, item.faction, item.realm, item.owner)
      if (!name) return null
      return {
        name,
        relation_type: firstText(item.type, item.relation_type, item.relationship, item.role),
        status: firstText(item.status, item.state, item.current_state),
        start_chapter_no: firstNumber(item.start_chapter_no, item.start_chapter, item.chapter_no),
        end_chapter_no: firstNumber(item.end_chapter_no, item.end_chapter),
        state_changes: normalizeStateChanges(item.state_changes ?? item.changes ?? item.timeline),
      }
    })
    .filter(Boolean) as Array<{
      name: string
      relation_type?: string
      status?: string
      start_chapter_no?: number | null
      end_chapter_no?: number | null
      state_changes?: SettingRelationshipStateChange[]
    }>
}

function relationLabel(type: string) {
  const labels: Record<string, string> = {
    related: '关联',
    has_ability: '能力',
    in_realm: '境界',
    member_of: '势力',
    owned_by: '拥有者',
    in_storyline: '剧情线',
    character_relation: '人物关系',
    related_chapter: '关联章节',
    used_in_chapter: '章节调用',
    advanced_in_chapter: '推进',
    planted_in_chapter: '埋线',
    paid_off_in_chapter: '回收',
  }
  return labels[type] || type
}

function usageRelationType(usageType: string) {
  if (usageType === 'advance') return 'advanced_in_chapter'
  if (usageType === 'plant') return 'planted_in_chapter'
  if (usageType === 'payoff') return 'paid_off_in_chapter'
  return 'used_in_chapter'
}

function uniqueEdgeId(source: string, target: string, relationType: string) {
  return `${source}->${target}:${relationType}`
}

function mergeCharacterMetadata(setting: any, charactersById: Map<number, any>, charactersByName: Map<string, any>) {
  const relatedCharacter = asArray(setting.related_character_ids)
    .map(id => charactersById.get(Number(id)))
    .find(Boolean)
  const namedCharacter = charactersByName.get(String(setting.name || '').trim())
  const character = relatedCharacter || namedCharacter || {}
  const state = setting.state_json || {}
  const payload = setting.payload_json || {}
  return {
    age: state.age ?? character.age ?? character.current_state?.age ?? payload.age,
    realm: state.realm ?? state.cultivation_realm ?? character.current_state?.realm ?? character.current_state?.cultivation_realm ?? payload.realm,
    abilities: stringValues(state.abilities ?? character.abilities ?? payload.abilities),
    techniques: stringValues(
      state.techniques
      ?? state.cultivation_method
      ?? state.cultivation_methods
      ?? state.methods
      ?? character.current_state?.techniques
      ?? character.current_state?.cultivation_method
      ?? character.techniques
      ?? payload.techniques
      ?? payload.cultivation_method,
    ),
    faction: state.faction ?? state.affiliation ?? character.current_state?.faction ?? character.current_state?.affiliation ?? payload.faction,
    relationships: state.relationships ?? character.relationships ?? payload.relationships ?? [],
    character_id: relatedCharacter?.id || namedCharacter?.id || payload.character_id || null,
  }
}

function addEdge(edges: SettingRelationshipEdge[], edge: Omit<SettingRelationshipEdge, 'id' | 'label'> & { label?: string }) {
  if (!edge.source || !edge.target || edge.source === edge.target) return null
  const id = uniqueEdgeId(edge.source, edge.target, edge.relation_type)
  const existing = edges.find(item => item.id === id)
  if (existing) {
    const currentStart = firstNumber(existing.start_chapter_no)
    const nextStart = firstNumber(edge.start_chapter_no)
    if (!currentStart || (nextStart && nextStart < currentStart)) existing.start_chapter_no = nextStart
    if (edge.end_chapter_no && !existing.end_chapter_no) existing.end_chapter_no = edge.end_chapter_no
    if (edge.status && !existing.status) existing.status = edge.status
    if (edge.state && typeof edge.state === 'object') existing.state = { ...(existing.state || {}), ...edge.state }
    if (edge.state_changes?.length) existing.state_changes = [...(existing.state_changes || []), ...edge.state_changes]
    return existing
  }
  const next = {
    id,
    label: edge.label || relationLabel(edge.relation_type),
    ...edge,
  }
  edges.push(next)
  return next
}

function usageStateChange(item: any, chapter: any): SettingRelationshipStateChange {
  return {
    chapter_id: Number(item.chapter_id || 0) || undefined,
    chapter_no: chapter?.chapter_no ?? null,
    usage_type: String(item.usage_type || 'allowed'),
    reveal_level: item.reveal_level ? String(item.reveal_level) : undefined,
    expected_state_change: item.expected_state_change || {},
    actual_state_change: item.actual_state_change || {},
  }
}

function mergedUsageState(item: any) {
  const expected = meaningfulObject(item.expected_state_change) ? item.expected_state_change : {}
  const actual = meaningfulObject(item.actual_state_change) ? item.actual_state_change : {}
  return { ...expected, ...actual }
}

export function buildSettingRelationshipGraph(input: SettingRelationshipGraphInput): SettingRelationshipGraph {
  const settings = Array.isArray(input.settings) ? input.settings : []
  const chapters = Array.isArray(input.chapters) ? input.chapters : []
  const usage = Array.isArray(input.usage) ? input.usage : []
  const characters = Array.isArray(input.characters) ? input.characters : []
  const settingsById = new Map(settings.map(item => [Number(item.id), item]))
  const settingsByName = new Map(settings.map(item => [String(item.name || '').trim(), item]).filter(([name]) => name))
  const chaptersById = new Map(chapters.map(item => [Number(item.id), item]))
  const charactersById = new Map(characters.map(item => [Number(item.id), item]))
  const charactersByName = new Map(characters.map(item => [String(item.name || '').trim(), item]).filter(([name]) => name))
  const nodes: SettingRelationshipNode[] = []
  const chapterNodes = new Map<number, SettingRelationshipNode>()
  const edges: SettingRelationshipEdge[] = []
  const diagnostics: SettingRelationshipDiagnostic[] = []

  const ensureChapterNode = (chapterId: number) => {
    if (!chapterId || chapterNodes.has(chapterId)) return
    const chapter = chaptersById.get(chapterId)
    if (!chapter) return
    chapterNodes.set(chapterId, {
      id: chapterNodeId(chapterId),
      kind: 'chapter',
      chapter_id: chapterId,
      name: `第${chapter.chapter_no || '?'}章 ${chapter.title || '未命名'}`,
      summary: chapter.chapter_summary || chapter.chapter_goal || '',
      metadata: {
        chapter_no: chapter.chapter_no,
        title: chapter.title,
        status: chapter.status,
      },
    })
  }

  for (const setting of settings) {
    const characterMetadata = setting.entity_type === 'character'
      ? mergeCharacterMetadata(setting, charactersById, charactersByName)
      : {}
    nodes.push({
      id: settingNodeId(setting),
      kind: 'setting',
      entity_id: Number(setting.id),
      entity_type: setting.entity_type || 'rule',
      name: String(setting.name || '未命名资产'),
      summary: setting.summary || '',
      metadata: {
        status: setting.status || 'active',
        visibility: setting.visibility || 'public',
        first_chapter_no: setting.first_chapter_no ?? null,
        last_chapter_no: setting.last_chapter_no ?? null,
        constraints: setting.constraints_json || {},
        state: setting.state_json || {},
        payload: setting.payload_json || {},
        ...characterMetadata,
      },
    })
  }

  for (const setting of settings) {
    const source = settingNodeId(setting)
    for (const targetId of asArray(setting.related_entity_ids).map(Number).filter(Boolean)) {
      const target = settingsById.get(targetId)
      if (!target) {
        diagnostics.push({
          type: 'dangling_relation',
          severity: 'warning',
          entity_id: Number(setting.id),
          entity_name: setting.name,
          message: `${setting.name} 关联了不存在的资产 #${targetId}`,
          evidence: 'related_entity_ids',
        })
        continue
      }
      addEdge(edges, {
        source,
        target: settingNodeId(target),
        relation_type: 'related',
        confidence: 'explicit',
        start_chapter_no: firstNumber(setting.first_chapter_no, target.first_chapter_no),
        evidence: 'related_entity_ids',
      })
    }

    for (const chapterId of asArray(setting.related_chapter_ids).map(Number).filter(Boolean)) {
      ensureChapterNode(chapterId)
      if (chapterNodes.has(chapterId)) {
        addEdge(edges, {
          source,
          target: chapterNodeId(chapterId),
          relation_type: 'related_chapter',
          confidence: 'explicit',
          start_chapter_no: chaptersById.get(chapterId)?.chapter_no ?? null,
          evidence: 'related_chapter_ids',
        })
      }
    }

    const state = setting.state_json || {}
    const payload = setting.payload_json || {}

    if (setting.entity_type === 'character') {
      const abilityRefs = relationRefs(state.abilities ?? payload.abilities)
      for (const ref of abilityRefs) {
        const target = settingsByName.get(ref.name)
        if (target) addEdge(edges, { source, target: settingNodeId(target), relation_type: 'has_ability', confidence: 'inferred', start_chapter_no: firstNumber(ref.start_chapter_no, setting.first_chapter_no, target.first_chapter_no), end_chapter_no: ref.end_chapter_no, status: ref.status, state_changes: ref.state_changes, evidence: 'state_json.abilities' })
      }
      for (const ref of relationRefs(state.realm ?? state.cultivation_realm ?? payload.realm)) {
        const target = settingsByName.get(ref.name)
        if (target) addEdge(edges, { source, target: settingNodeId(target), relation_type: 'in_realm', confidence: 'inferred', start_chapter_no: firstNumber(ref.start_chapter_no, setting.first_chapter_no, target.first_chapter_no), end_chapter_no: ref.end_chapter_no, status: ref.status, state_changes: ref.state_changes, evidence: 'state_json.realm' })
      }
      for (const ref of relationRefs(state.faction ?? state.affiliation ?? payload.faction)) {
        const target = settingsByName.get(ref.name)
        if (target) addEdge(edges, { source, target: settingNodeId(target), relation_type: 'member_of', confidence: 'inferred', start_chapter_no: firstNumber(ref.start_chapter_no, setting.first_chapter_no, target.first_chapter_no), end_chapter_no: ref.end_chapter_no, status: ref.status, state_changes: ref.state_changes, evidence: 'state_json.faction' })
      }
      for (const ref of relationRefs(state.relationships ?? payload.relationships)) {
        const target = settingsByName.get(ref.name)
        if (target) addEdge(edges, {
          source,
          target: settingNodeId(target),
          relation_type: 'character_relation',
          label: ref.relation_type || relationLabel('character_relation'),
          confidence: 'inferred',
          start_chapter_no: firstNumber(ref.start_chapter_no, setting.first_chapter_no),
          end_chapter_no: ref.end_chapter_no,
          status: ref.status,
          state: {
            ...(ref.relation_type ? { relation_type: ref.relation_type } : {}),
            ...(ref.status ? { status: ref.status } : {}),
          },
          state_changes: ref.state_changes,
          evidence: 'state_json.relationships',
        })
      }
    }

    if (['ability', 'item'].includes(String(setting.entity_type || ''))) {
      for (const name of stringValues(state.owner ?? payload.owner)) {
        const target = settingsByName.get(name)
        if (target) addEdge(edges, { source: settingNodeId(target), target: source, relation_type: setting.entity_type === 'ability' ? 'has_ability' : 'related', confidence: 'inferred', start_chapter_no: firstNumber(setting.first_chapter_no, target.first_chapter_no), evidence: 'state_json.owner' })
      }
    }

    if (STORYLINE_TYPES.has(String(setting.entity_type || ''))) {
      for (const name of stringValues(payload.related_characters ?? payload.related_factions)) {
        const target = settingsByName.get(name)
        if (target) addEdge(edges, { source: settingNodeId(target), target: source, relation_type: 'in_storyline', confidence: 'inferred', start_chapter_no: firstNumber(setting.first_chapter_no, payload.start_chapter_no), evidence: 'payload_json.related_characters' })
      }
    }
  }

  for (const item of usage) {
    const setting = settingsById.get(Number(item.entity_id || 0))
    const chapterId = Number(item.chapter_id || 0)
    if (!setting || !chapterId) continue
    ensureChapterNode(chapterId)
    if (!chapterNodes.has(chapterId)) continue
    const relationType = usageRelationType(String(item.usage_type || 'allowed'))
    const chapter = chaptersById.get(chapterId)
    addEdge(edges, {
      source: settingNodeId(setting),
      target: chapterNodeId(chapterId),
      relation_type: relationType,
      confidence: 'usage',
      start_chapter_no: chapter?.chapter_no ?? null,
      state: mergedUsageState(item),
      state_changes: [usageStateChange(item, chapter)],
      evidence: 'chapter_setting_usage',
    })
  }

  nodes.push(...chapterNodes.values())

  const connectedByNonChapterEdge = new Set<string>()
  for (const edge of edges) {
    if (edge.target.startsWith('chapter-') || edge.source.startsWith('chapter-')) continue
    connectedByNonChapterEdge.add(edge.source)
    connectedByNonChapterEdge.add(edge.target)
  }

  const missingStartEdgeIds = new Set<string>()
  const timelineConflictEdgeIds = new Set<string>()

  for (const edge of edges) {
    if (edge.target.startsWith('chapter-') || edge.source.startsWith('chapter-')) continue
    const sourceSetting = settingsById.get(Number(edge.source.replace('setting-', '')))
    const targetSetting = settingsById.get(Number(edge.target.replace('setting-', '')))
    if (!sourceSetting || !targetSetting) continue
    if (!firstNumber(edge.start_chapter_no) && !missingStartEdgeIds.has(edge.id)) {
      missingStartEdgeIds.add(edge.id)
      diagnostics.push({
        type: 'missing_start_chapter',
        severity: 'info',
        entity_id: Number(sourceSetting.id),
        entity_name: sourceSetting.name,
        message: `${sourceSetting.name} 与 ${targetSetting.name} 的关系缺少开始章节`,
        evidence: 'relationship_graph',
      })
    }
    const start = firstNumber(edge.start_chapter_no)
    const sourceFirst = firstNumber(sourceSetting.first_chapter_no)
    const targetFirst = firstNumber(targetSetting.first_chapter_no)
    if (start && ((sourceFirst && start < sourceFirst) || (targetFirst && start < targetFirst)) && !timelineConflictEdgeIds.has(edge.id)) {
      timelineConflictEdgeIds.add(edge.id)
      diagnostics.push({
        type: 'timeline_conflict',
        severity: 'warning',
        entity_id: Number(sourceSetting.id),
        entity_name: sourceSetting.name,
        message: `${sourceSetting.name} 与 ${targetSetting.name} 的关系开始于第${start}章，早于资产登场时间`,
        evidence: 'start_chapter_no',
      })
    }
  }

  const ownerMismatchKeys = new Set<string>()
  for (const ability of settings.filter(item => item.entity_type === 'ability')) {
    const declaredOwner = relationRefs(ability.state_json?.owner ?? ability.payload_json?.owner)[0]?.name
    if (!declaredOwner) continue
    for (const character of settings.filter(item => item.entity_type === 'character')) {
      if (String(character.name || '').trim() === declaredOwner) continue
      const ownsAbility = relationRefs(character.state_json?.abilities ?? character.payload_json?.abilities)
        .some(ref => ref.name === ability.name)
      if (!ownsAbility) continue
      const key = `${ability.id}:${character.id}`
      if (ownerMismatchKeys.has(key)) continue
      ownerMismatchKeys.add(key)
      diagnostics.push({
        type: 'owner_ability_mismatch',
        severity: 'warning',
        entity_id: Number(ability.id),
        entity_name: ability.name,
        message: `${ability.name} 的拥有者是 ${declaredOwner}，但 ${character.name} 的能力列表也引用了它`,
        evidence: 'state_json.abilities',
      })
    }
  }

  for (const setting of settings) {
    const nodeId = settingNodeId(setting)
    const entityType = String(setting.entity_type || '')
    if (KEY_ASSET_TYPES.has(entityType) && !connectedByNonChapterEdge.has(nodeId)) {
      diagnostics.push({
        type: 'isolated_key_asset',
        severity: 'warning',
        entity_id: Number(setting.id),
        entity_name: setting.name,
        message: `${setting.name} 还没有和其他核心资产建立关系`,
        evidence: 'relationship_graph',
      })
    }
    if (entityType === 'ability' && !edges.some(edge => edge.target === nodeId && edge.relation_type === 'has_ability')) {
      diagnostics.push({
        type: 'missing_owner',
        severity: 'high',
        entity_id: Number(setting.id),
        entity_name: setting.name,
        message: `${setting.name} 缺少拥有者，生成正文时难以判断谁能使用该能力`,
        evidence: 'state_json.owner',
      })
    }
  }

  const isolatedKeyAssetCount = diagnostics.filter(item => item.type === 'isolated_key_asset').length
  const missingOwnerCount = diagnostics.filter(item => item.type === 'missing_owner').length
  const missingStartChapterCount = diagnostics.filter(item => item.type === 'missing_start_chapter').length
  const timelineConflictCount = diagnostics.filter(item => item.type === 'timeline_conflict').length
  const ownerMismatchCount = diagnostics.filter(item => item.type === 'owner_ability_mismatch').length

  return {
    nodes,
    edges,
    diagnostics,
    summary: {
      node_count: nodes.length,
      edge_count: edges.length,
      isolated_key_asset_count: isolatedKeyAssetCount,
      missing_owner_count: missingOwnerCount,
      missing_start_chapter_count: missingStartChapterCount,
      timeline_conflict_count: timelineConflictCount,
      owner_mismatch_count: ownerMismatchCount,
    },
  }
}
