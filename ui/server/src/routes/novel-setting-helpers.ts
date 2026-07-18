import type { Express } from 'express'
import {
  createNovelCharacter,
  createNovelReview,
  createNovelSettingEntity,
  deleteNovelSettingEntity,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  replaceNovelChapterSettingUsage,
  updateNovelChapterSettingUsage,
  updateNovelSettingEntity,
} from '../novel'
import { executeNovelAgent } from '../llm'
import { formatReviewIssueForStorage, getNovelPayload, parseJsonLikePayload, safeJsonStringify } from './novel-route-utils'
import { buildSettingRelationshipGraph } from './novel-setting-relationship-graph'

export type NovelSettingRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  buildChapterContextPackage: (workspace: string, project: any, chapter: any, chapters: any[], worldbuilding: any[], characters: any[], outlines: any[], reviews?: any[]) => Promise<any>
}

export const STORYLINE_TYPES = ['mainline', 'subplot', 'character_arc', 'relationship_arc', 'faction_arc', 'foreshadowing_arc']
export const SETTING_TYPES = ['character', 'realm', 'ability', 'item', 'boss', 'rule', 'faction', 'location', 'foreshadowing', 'timeline', ...STORYLINE_TYPES]
const DISCOVERED_ASSET_TYPES = ['character', 'item', 'ability', 'faction', 'location', 'foreshadowing']
const RELATIONSHIP_REPAIR_PATCH_TYPES = [
  'related_entity_ids',
  'state_owner',
  'state_abilities',
  'state_realm',
  'state_faction',
  'state_relationships',
  'payload_related_characters',
  'payload_related_factions',
  'payload_related_foreshadowing',
]

export function settingJson(value: any, maxChars = 0) {
  return safeJsonStringify(value, 2, maxChars)
}

export type SettingRelationshipRepairPatch = {
  source_id: number
  source_name: string
  source_type: string
  target_id: number
  target_name: string
  target_type: string
  patch_type: string
  relation_type: string
  reason: string
  confidence: number
}

function parseJsonField(value: any, fallback: any) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'object') return value
  return parseJsonLikePayload(String(value)) || fallback
}

export function normalizeSettingInput(body: any, projectId: number) {
  return {
    project_id: projectId,
    entity_type: SETTING_TYPES.includes(String(body.entity_type || body.entityType || body.type || '')) ? String(body.entity_type || body.entityType || body.type) : 'rule',
    name: String(body.name || '').trim() || '未命名设定',
    summary: String(body.summary || ''),
    status: String(body.status || 'active'),
    visibility: String(body.visibility || 'public'),
    first_chapter_no: (body.first_chapter_no ?? body.firstChapterNo) === undefined || (body.first_chapter_no ?? body.firstChapterNo) === '' ? null : Number(body.first_chapter_no ?? body.firstChapterNo),
    last_chapter_no: (body.last_chapter_no ?? body.lastChapterNo) === undefined || (body.last_chapter_no ?? body.lastChapterNo) === '' ? null : Number(body.last_chapter_no ?? body.lastChapterNo),
    related_character_ids: Array.isArray(body.related_character_ids ?? body.relatedCharacterIds) ? (body.related_character_ids ?? body.relatedCharacterIds).map(Number).filter(Boolean) : [],
    related_chapter_ids: Array.isArray(body.related_chapter_ids ?? body.relatedChapterIds) ? (body.related_chapter_ids ?? body.relatedChapterIds).map(Number).filter(Boolean) : [],
    related_entity_ids: Array.isArray(body.related_entity_ids ?? body.relatedEntityIds) ? (body.related_entity_ids ?? body.relatedEntityIds).map(Number).filter(Boolean) : [],
    constraints_json: parseJsonField(body.constraints_json ?? body.constraintsJson ?? body.constraints, {}),
    state_json: parseJsonField(body.state_json ?? body.stateJson ?? body.state, {}),
    payload_json: parseJsonField(body.payload_json ?? body.payloadJson ?? body.payload, {}),
  }
}

function firstText(...values: any[]) {
  for (const value of values) {
    const text = String(value || '').trim()
    if (text) return text
  }
  return ''
}

function asSettingArray(value: any) {
  return Array.isArray(value) ? value : []
}

function clampConfidence(value: any) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0.5
  return Math.max(0, Math.min(1, number))
}

function settingByName(settings: any[], name: string) {
  const normalized = String(name || '').trim()
  if (!normalized) return null
  return settings.find(item => String(item.name || '').trim() === normalized) || null
}

function settingByIdOrName(settings: any[], id: any, name: any) {
  const settingId = Number(id || 0)
  if (settingId) {
    const found = settings.find(item => Number(item.id) === settingId)
    if (found) return found
  }
  return settingByName(settings, String(name || ''))
}

function isRelationshipRepairPatchTypeSafe(patchType: string, source: any, target: any) {
  const sourceType = String(source?.entity_type || '')
  const targetType = String(target?.entity_type || '')
  if (patchType === 'related_entity_ids') return true
  if (patchType === 'state_owner') return ['ability', 'item'].includes(sourceType) && ['character', 'faction'].includes(targetType)
  if (patchType === 'state_abilities') return sourceType === 'character' && targetType === 'ability'
  if (patchType === 'state_realm') return sourceType === 'character' && targetType === 'realm'
  if (patchType === 'state_faction') return sourceType === 'character' && targetType === 'faction'
  if (patchType === 'state_relationships') return sourceType === 'character' && targetType === 'character'
  if (patchType === 'payload_related_characters') return STORYLINE_TYPES.includes(sourceType) && targetType === 'character'
  if (patchType === 'payload_related_factions') return STORYLINE_TYPES.includes(sourceType) && targetType === 'faction'
  if (patchType === 'payload_related_foreshadowing') return STORYLINE_TYPES.includes(sourceType) && targetType === 'foreshadowing'
  return false
}

export function buildSettingAgentPrompt(project: any, worldbuilding: any[] = [], characters: any[] = [], outlines: any[] = [], existing: any[] = []) {
  return [
    '任务：你是 setting-agent，负责为商业长篇小说生成和补全“设定工坊”资产池。只输出 JSON，不要解释。',
    `作品标题：${project.title || '未命名作品'}`,
    `篇幅目标：${project.length_target || 'longform'}`,
    '',
    '必须构建可长期连载复用的设定系统，而不是只写世界观摘要。重点包括：',
    '1. 能力体系：能力来源、能力名、拥有者、代价、限制、克制关系、升级路径。',
    '2. 境界/等级体系：阶段名称、晋升条件、瓶颈、资源消耗、战力差距。',
    '3. 物品体系：关键物品、归属规则、消耗/损坏、位置、禁用条件。',
    '4. 势力体系：组织目标、资源、敌友关系、行动边界、登场阶段。',
    '5. Boss/反派阶梯：每卷或阶段的对手、行动逻辑、压迫方式、失败代价。',
    '6. 规则/地点/时间线/伏笔：触发条件、禁忌、揭示范围、回收章节。',
    '7. 剧情线工坊：主线、支线、角色线、感情/关系线、势力线、伏笔线；每条线必须写推进规则、当前状态、最近推进章节、下一次应推进章节、禁揭内容和预期回报。',
    '',
    '【现有项目资料】',
    JSON.stringify({ project, worldbuilding, characters, outlines: outlines.slice(0, 120), existing_settings: existing.slice(0, 120) }, null, 2).slice(0, 20000),
    '',
    '输出 JSON 字段：',
    'settings: array，每项包含 entity_type,name,summary,status,visibility,first_chapter_no,last_chapter_no,constraints_json,state_json,payload_json。',
    '也可以额外输出 ability_system{abilities}, realm_system{realms}, item_system{items}, faction_system{factions}, boss_ladder{bosses}, rules, locations, timeline, foreshadowing；系统会归一化入库。',
    '剧情线可以输出 storylines，也可以分开输出 mainlines, subplots, character_arcs, relationship_arcs, faction_arcs, foreshadowing_arcs。',
    '剧情线字段建议包含 name,summary,priority,start_chapter_no,end_chapter_no,related_characters,related_factions,related_foreshadowing,advance_rule,taboo,forbidden_reveal,current_state,last_advanced_chapter,next_advance_chapter,payoff_status,expected_payoff。',
    'entity_type 只能是 character/realm/ability/item/boss/rule/faction/location/foreshadowing/timeline/mainline/subplot/character_arc/relationship_arc/faction_arc/foreshadowing_arc。',
    '每个能力、物品、规则、Boss 必须写 constraints_json；每个已登场或可追踪对象必须写 state_json。',
  ].join('\n')
}

export function buildSettingRelationshipRepairPrompt(project: any, settings: any[] = [], diagnostics: any[] = [], graph: any = {}) {
  const isolatedIds = new Set(diagnostics.filter(item => item?.type === 'isolated_key_asset').map(item => Number(item.entity_id || 0)).filter(Boolean))
  const isolatedAssets = settings
    .filter(item => isolatedIds.has(Number(item.id)))
    .map(item => ({
      id: item.id,
      entity_type: item.entity_type,
      name: item.name,
      summary: item.summary,
      first_chapter_no: item.first_chapter_no,
      state_json: item.state_json,
      payload_json: item.payload_json,
      constraints_json: item.constraints_json,
    }))
  const candidateTargets = settings
    .filter(item => !isolatedIds.has(Number(item.id)) || ['character', 'mainline', 'subplot', 'foreshadowing_arc', 'faction_arc', 'relationship_arc', 'faction'].includes(String(item.entity_type || '')))
    .map(item => ({
      id: item.id,
      entity_type: item.entity_type,
      name: item.name,
      summary: item.summary,
      first_chapter_no: item.first_chapter_no,
      state_json: item.state_json,
      payload_json: item.payload_json,
    }))
  return [
    '任务：relationship repair。你是 setting-agent，负责把孤立设定资产挂到已有核心资产上。只输出 JSON，不要解释。',
    `作品标题：${project.title || '未命名作品'}`,
    '',
    '输出字段：patches(array)。每项必须包含 source_id, target_id, patch_type, relation_type, reason, confidence。',
    'patch_type 只能使用：related_entity_ids, state_owner, state_abilities, state_realm, state_faction, state_relationships, payload_related_characters, payload_related_factions, payload_related_foreshadowing。',
    '写法规则：',
    '- 通用弱关联或 Boss/物品/势力/伏笔挂主线：用 related_entity_ids。',
    '- 能力/物品缺归属：用 state_owner，target 必须是角色或势力。',
    '- 角色挂能力/境界/势力：用 state_abilities/state_realm/state_faction。',
    '- 人物关系只能 character → character；剧情线挂角色/势力/伏笔必须由 mainline/subplot/character_arc/relationship_arc/faction_arc/foreshadowing_arc 发起。',
    '- 剧情线挂角色/势力/伏笔：用 payload_related_characters/payload_related_factions/payload_related_foreshadowing。',
    '- 只有有明确叙事理由才输出；不要为了消除孤立而强连。',
    '',
    '【孤立资产】',
    JSON.stringify(isolatedAssets, null, 2).slice(0, 12000),
    '',
    '【可挂钩候选】',
    JSON.stringify(candidateTargets, null, 2).slice(0, 14000),
    '',
    '【关系诊断摘要】',
    JSON.stringify({ diagnostics, summary: graph?.summary || {} }, null, 2).slice(0, 4000),
  ].join('\n')
}

export function normalizeSettingRelationshipRepairPayload(payload: any, settings: any[] = []): SettingRelationshipRepairPatch[] {
  const rows = Array.isArray(payload?.patches)
    ? payload.patches
    : Array.isArray(payload?.relationshipPatches)
      ? payload.relationshipPatches
      : Array.isArray(payload?.relationship_patches)
        ? payload.relationship_patches
        : Array.isArray(payload?.relationships)
          ? payload.relationships
          : []
  const normalized: SettingRelationshipRepairPatch[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const patchType = String(row.patch_type || row.patchType || row.type || '').trim()
    if (!RELATIONSHIP_REPAIR_PATCH_TYPES.includes(patchType)) continue
    const source = settingByIdOrName(settings, row.source_id || row.sourceId || row.entity_id || row.entityId, row.source_name || row.sourceName || row.source || row.entity_name || row.entityName)
    const target = settingByIdOrName(settings, row.target_id || row.targetId || row.related_id || row.relatedId, row.target_name || row.targetName || row.target || row.related_name || row.relatedName)
    if (!source || !target || Number(source.id) === Number(target.id)) continue
    if (!isRelationshipRepairPatchTypeSafe(patchType, source, target)) continue
    const key = `${source.id}:${target.id}:${patchType}`
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push({
      source_id: Number(source.id),
      source_name: String(source.name || ''),
      source_type: String(source.entity_type || ''),
      target_id: Number(target.id),
      target_name: String(target.name || ''),
      target_type: String(target.entity_type || ''),
      patch_type: patchType,
      relation_type: String(row.relation_type || row.relationType || row.relationship || patchType),
      reason: String(row.reason || row.evidence || row.rationale || '模型建议补齐资产关系'),
      confidence: clampConfidence(row.confidence),
    })
  }
  return normalized
}

function appendUnique<T>(items: T[], value: T) {
  return items.some(item => item === value) ? items : [...items, value]
}

function appendRelationObject(items: any[], relation: any) {
  return items.some(item => String(item?.name || item?.target || item) === String(relation.name || relation.target))
    ? items
    : [...items, relation]
}

export async function applySettingRelationshipRepairPatches(activeWorkspace: string, projectId: number, patches: any[] = []) {
  const settings = await listNovelSettingEntities(activeWorkspace, projectId)
  const normalized = normalizeSettingRelationshipRepairPayload({ patches }, settings)
  const applied: SettingRelationshipRepairPatch[] = []
  const skipped: any[] = []

  for (const patch of normalized) {
    const source = settings.find(item => Number(item.id) === Number(patch.source_id))
    const target = settings.find(item => Number(item.id) === Number(patch.target_id))
    if (!source || !target) {
      skipped.push({ ...patch, reason: 'missing_source_or_target' })
      continue
    }
    const next: any = { ...source }
    const state = source.state_json && typeof source.state_json === 'object' && !Array.isArray(source.state_json) ? { ...source.state_json } : {}
    const payload = source.payload_json && typeof source.payload_json === 'object' && !Array.isArray(source.payload_json) ? { ...source.payload_json } : {}

    if (patch.patch_type === 'related_entity_ids') {
      next.related_entity_ids = appendUnique((source.related_entity_ids || []).map(Number).filter(Boolean), Number(target.id))
    } else if (patch.patch_type === 'state_owner') {
      next.state_json = { ...state, owner: target.name }
    } else if (patch.patch_type === 'state_abilities') {
      next.state_json = { ...state, abilities: appendUnique(asSettingArray(state.abilities), target.name) }
    } else if (patch.patch_type === 'state_realm') {
      next.state_json = { ...state, realm: target.name }
    } else if (patch.patch_type === 'state_faction') {
      next.state_json = { ...state, faction: target.name }
    } else if (patch.patch_type === 'state_relationships') {
      next.state_json = {
        ...state,
        relationships: appendRelationObject(asSettingArray(state.relationships), {
          name: target.name,
          type: patch.relation_type || 'related',
          status: 'suggested',
        }),
      }
    } else if (patch.patch_type === 'payload_related_characters') {
      next.payload_json = { ...payload, related_characters: appendUnique(asSettingArray(payload.related_characters).map(String), target.name) }
    } else if (patch.patch_type === 'payload_related_factions') {
      next.payload_json = { ...payload, related_factions: appendUnique(asSettingArray(payload.related_factions).map(String), target.name) }
    } else if (patch.patch_type === 'payload_related_foreshadowing') {
      next.payload_json = { ...payload, related_foreshadowing: appendUnique(asSettingArray(payload.related_foreshadowing).map(String), target.name) }
    } else {
      skipped.push({ ...patch, reason: 'unsupported_patch_type' })
      continue
    }

    const repairPayload = next.payload_json && typeof next.payload_json === 'object' && !Array.isArray(next.payload_json) ? next.payload_json : payload
    next.payload_json = {
      ...repairPayload,
      relationship_repair_log: [
        ...asSettingArray(repairPayload.relationship_repair_log),
        {
          target_id: target.id,
          target_name: target.name,
          patch_type: patch.patch_type,
          relation_type: patch.relation_type,
          reason: patch.reason,
          confidence: patch.confidence,
        },
      ],
    }

    const updated = await updateNovelSettingEntity(activeWorkspace, source.id, next)
    if (updated) {
      const index = settings.findIndex(item => Number(item.id) === Number(updated.id))
      if (index >= 0) settings[index] = updated
      applied.push(patch)
    }
  }

  if (applied.length > 0) {
    await createNovelReview(activeWorkspace, {
      project_id: projectId,
      review_type: 'setting_relationship_repair_apply',
      status: 'ok',
      summary: `已应用资产关系补丁 ${applied.length} 项`,
      issues: applied.map(item => `${item.source_name} → ${item.target_name}｜${item.patch_type}`),
      payload: JSON.stringify({ applied, skipped }),
    })
  }

  return { ok: true, applied, skipped, total: applied.length }
}

function normalizeAgentSettingItem(item: any, projectId: number, fallbackType: string, source: string) {
  const entityType = SETTING_TYPES.includes(String(item?.entity_type || item?.entityType || item?.type || fallbackType))
    ? String(item?.entity_type || item?.entityType || item?.type || fallbackType)
    : fallbackType
  const name = firstText(item?.name, item?.title, item?.ability_name, item?.abilityName, item?.realm_name, item?.realmName, item?.item_name, item?.itemName, item?.faction_name, item?.factionName, item?.boss_name, item?.bossName)
  if (!name) return null
  const constraints = parseJsonField(item?.constraints_json ?? item?.constraintsJson ?? item?.constraints, {})
  const state = parseJsonField(item?.state_json ?? item?.stateJson ?? item?.state, {})
  const payload = parseJsonField(item?.payload_json ?? item?.payloadJson ?? item?.payload, {})
  if (entityType === 'ability') {
    Object.assign(constraints, {
      ...(item?.cost ? { cost: item.cost } : {}),
      ...(item?.limit ? { limit: item.limit } : {}),
      ...(item?.condition ? { condition: item.condition } : {}),
      ...(item?.counter ? { counter: item.counter } : {}),
    })
    Object.assign(state, {
      ...(item?.owner ? { owner: item.owner } : {}),
      ...(item?.status ? { status: item.status } : {}),
    })
  }
  if (entityType === 'realm') {
    Object.assign(constraints, {
      ...(item?.advancement_condition || item?.advancementCondition ? { advancement_condition: item.advancement_condition || item.advancementCondition } : {}),
      ...(item?.bottleneck ? { bottleneck: item.bottleneck } : {}),
      ...(item?.resource_cost || item?.resourceCost ? { resource_cost: item.resource_cost || item.resourceCost } : {}),
    })
  }
  if (entityType === 'item') {
    Object.assign(constraints, {
      ...(item?.owner_rule || item?.ownerRule ? { owner_rule: item.owner_rule || item.ownerRule } : {}),
      ...(item?.limitation ? { limitation: item.limitation } : {}),
      ...(item?.cost ? { cost: item.cost } : {}),
    })
    Object.assign(state, {
      ...(item?.owner ? { owner: item.owner } : {}),
      ...(item?.location ? { location: item.location } : {}),
      ...(item?.status ? { status: item.status } : {}),
    })
  }
  if (entityType === 'faction') {
    Object.assign(constraints, {
      ...(item?.agenda ? { agenda: item.agenda } : {}),
      ...(item?.resources ? { resources: item.resources } : {}),
      ...(item?.boundary ? { boundary: item.boundary } : {}),
    })
  }
  if (entityType === 'boss') {
    Object.assign(constraints, {
      ...(item?.action_logic || item?.actionLogic ? { action_logic: item.action_logic || item.actionLogic } : {}),
      ...(item?.pressure_method || item?.pressureMethod ? { pressure_method: item.pressure_method || item.pressureMethod } : {}),
      ...(item?.weakness ? { weakness: item.weakness } : {}),
    })
  }
  if (entityType === 'rule') {
    Object.assign(constraints, {
      ...(item?.trigger ? { trigger: item.trigger } : {}),
      ...(item?.consequence ? { consequence: item.consequence } : {}),
      ...(item?.taboo ? { taboo: item.taboo } : {}),
    })
  }
  if (entityType === 'foreshadowing') {
    Object.assign(state, {
      ...(item?.plant_chapter || item?.plantChapter ? { plant_chapter: item.plant_chapter || item.plantChapter } : {}),
      ...(item?.payoff_chapter || item?.payoffChapter ? { payoff_chapter: item.payoff_chapter || item.payoffChapter } : {}),
      status: item?.status || state.status || 'planned',
    })
  }
  if (STORYLINE_TYPES.includes(entityType)) {
    Object.assign(constraints, {
      ...(item?.advance_rule || item?.advanceRule ? { advance_rule: item.advance_rule || item.advanceRule } : {}),
      ...(item?.advance_rules || item?.advanceRules ? { advance_rules: item.advance_rules || item.advanceRules } : {}),
      ...(item?.taboo ? { taboo: item.taboo } : {}),
      ...(item?.forbidden_reveal || item?.forbiddenReveal ? { forbidden_reveal: item.forbidden_reveal || item.forbiddenReveal } : {}),
      ...(item?.forbidden_content || item?.forbiddenContent ? { forbidden_content: item.forbidden_content || item.forbiddenContent } : {}),
      ...(item?.conflict_escalation || item?.conflictEscalation ? { conflict_escalation: item.conflict_escalation || item.conflictEscalation } : {}),
      ...(item?.escalation ? { escalation: item.escalation } : {}),
    })
    Object.assign(state, {
      ...(item?.current_state || item?.currentState ? { current_state: item.current_state || item.currentState } : {}),
      ...(item?.last_advanced_chapter || item?.lastAdvancedChapter ? { last_advanced_chapter: item.last_advanced_chapter || item.lastAdvancedChapter } : {}),
      ...(item?.last_advance_chapter || item?.lastAdvanceChapter ? { last_advanced_chapter: item.last_advance_chapter || item.lastAdvanceChapter } : {}),
      ...(item?.next_advance_chapter || item?.nextAdvanceChapter ? { next_advance_chapter: item.next_advance_chapter || item.nextAdvanceChapter } : {}),
      ...(item?.payoff_status || item?.payoffStatus ? { payoff_status: item.payoff_status || item.payoffStatus } : {}),
      status: item?.status || state.status || 'active',
    })
    Object.assign(payload, {
      line_type: entityType,
      ...(item?.priority !== undefined ? { priority: item.priority } : {}),
      ...(item?.start_chapter_no !== undefined || item?.startChapterNo !== undefined ? { start_chapter_no: item.start_chapter_no ?? item.startChapterNo } : {}),
      ...(item?.start_chapter !== undefined || item?.startChapter !== undefined ? { start_chapter_no: item.start_chapter ?? item.startChapter } : {}),
      ...(item?.end_chapter_no !== undefined || item?.endChapterNo !== undefined ? { end_chapter_no: item.end_chapter_no ?? item.endChapterNo } : {}),
      ...(item?.end_chapter !== undefined || item?.endChapter !== undefined ? { end_chapter_no: item.end_chapter ?? item.endChapter } : {}),
      ...(item?.related_characters || item?.relatedCharacters ? { related_characters: item.related_characters || item.relatedCharacters } : {}),
      ...(item?.related_factions || item?.relatedFactions ? { related_factions: item.related_factions || item.relatedFactions } : {}),
      ...(item?.related_foreshadowing || item?.relatedForeshadowing ? { related_foreshadowing: item.related_foreshadowing || item.relatedForeshadowing } : {}),
      ...(item?.expected_payoff || item?.expectedPayoff ? { expected_payoff: item.expected_payoff || item.expectedPayoff } : {}),
    })
  }
  return normalizeSettingInput({
    project_id: projectId,
    entity_type: entityType,
    name,
    summary: firstText(item?.summary, item?.description, item?.role, item?.effect, item?.content),
    status: item?.status || 'active',
    visibility: item?.visibility || (entityType === 'foreshadowing' ? 'hidden' : 'public'),
    first_chapter_no: item?.first_chapter_no ?? item?.firstChapterNo ?? item?.first_chapter ?? item?.firstChapter ?? item?.start_chapter_no ?? item?.startChapterNo ?? item?.start_chapter ?? item?.startChapter ?? null,
    last_chapter_no: item?.last_chapter_no ?? item?.lastChapterNo ?? item?.last_chapter ?? item?.lastChapter ?? item?.end_chapter_no ?? item?.endChapterNo ?? item?.end_chapter ?? item?.endChapter ?? null,
    constraints_json: constraints,
    state_json: state,
    payload_json: { ...payload, source, raw: item },
  }, projectId)
}

export function normalizeSettingAgentPayload(payload: any, projectId: number) {
  const candidates: Array<{ item: any; type: string; source: string }> = []
  for (const item of asSettingArray(payload?.settings || payload?.entities || payload?.setting_entities || payload?.settingEntities)) candidates.push({ item, type: String(item?.entity_type || item?.entityType || item?.type || 'rule'), source: 'setting_agent_direct' })
  for (const item of asSettingArray(payload?.ability_system?.abilities || payload?.abilitySystem?.abilities || payload?.abilities)) candidates.push({ item, type: 'ability', source: 'setting_agent_ability_system' })
  for (const item of asSettingArray(payload?.realm_system?.realms || payload?.realmSystem?.realms || payload?.realms)) candidates.push({ item, type: 'realm', source: 'setting_agent_realm_system' })
  for (const item of asSettingArray(payload?.item_system?.items || payload?.itemSystem?.items || payload?.items)) candidates.push({ item, type: 'item', source: 'setting_agent_item_system' })
  for (const item of asSettingArray(payload?.faction_system?.factions || payload?.factionSystem?.factions || payload?.factions)) candidates.push({ item, type: 'faction', source: 'setting_agent_faction_system' })
  for (const item of asSettingArray(payload?.boss_ladder?.bosses || payload?.bossLadder?.bosses || payload?.bosses)) candidates.push({ item, type: 'boss', source: 'setting_agent_boss_ladder' })
  for (const item of asSettingArray(payload?.rules)) candidates.push({ item, type: 'rule', source: 'setting_agent_rule' })
  for (const item of asSettingArray(payload?.locations)) candidates.push({ item, type: 'location', source: 'setting_agent_location' })
  for (const item of asSettingArray(payload?.timeline)) candidates.push({ item, type: 'timeline', source: 'setting_agent_timeline' })
  for (const item of asSettingArray(payload?.foreshadowing || payload?.foreshadowing_plan || payload?.foreshadowingPlan)) candidates.push({ item, type: 'foreshadowing', source: 'setting_agent_foreshadowing' })
  for (const item of asSettingArray(payload?.storylines)) candidates.push({ item, type: String(item?.entity_type || item?.entityType || item?.type || 'mainline'), source: 'setting_agent_storyline' })
  for (const item of asSettingArray(payload?.mainlines || payload?.mainLines)) candidates.push({ item, type: 'mainline', source: 'setting_agent_mainline' })
  for (const item of asSettingArray(payload?.subplots || payload?.subPlots)) candidates.push({ item, type: 'subplot', source: 'setting_agent_subplot' })
  for (const item of asSettingArray(payload?.character_arcs || payload?.characterArcs)) candidates.push({ item, type: 'character_arc', source: 'setting_agent_character_arc' })
  for (const item of asSettingArray(payload?.relationship_arcs || payload?.relationshipArcs)) candidates.push({ item, type: 'relationship_arc', source: 'setting_agent_relationship_arc' })
  for (const item of asSettingArray(payload?.faction_arcs || payload?.factionArcs)) candidates.push({ item, type: 'faction_arc', source: 'setting_agent_faction_arc' })
  for (const item of asSettingArray(payload?.foreshadowing_arcs || payload?.foreshadowingArcs)) candidates.push({ item, type: 'foreshadowing_arc', source: 'setting_agent_foreshadowing_arc' })

  const normalized: any[] = []
  const seen = new Set<string>()
  for (const candidate of candidates) {
    const item = normalizeAgentSettingItem(candidate.item, projectId, candidate.type, candidate.source)
    if (!item) continue
    const key = `${item.entity_type}:${item.name}`
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(item)
  }
  return normalized
}

export function normalizeUsageInput(item: any) {
  const usageType = String(item.usage_type || item.usageType || (item.forbidden ? 'forbidden' : item.required ? 'required' : 'allowed'))
  const positiveStorylineUsage = ['advance', 'plant', 'payoff'].includes(usageType)
  return {
    entity_id: Number(item.entity_id || item.entityId || item.setting_id || item.settingId || item.storyline_id || item.storylineId || item.id || 0),
    usage_type: usageType,
    required: Boolean(item.required || usageType === 'required' || positiveStorylineUsage),
    allowed: item.allowed === undefined ? usageType !== 'forbidden' : Boolean(item.allowed),
    forbidden: Boolean(item.forbidden || usageType === 'forbidden'),
    reveal_level: String(item.reveal_level || item.revealLevel || 'none'),
    expected_state_change: parseJsonField(item.expected_state_change ?? item.expectedStateChange, {}),
    actual_state_change: parseJsonField(item.actual_state_change ?? item.actualStateChange, {}),
  }
}

export function normalizeSettingUsagePayload(payload: any): any[] {
  const rows = Array.isArray(payload?.usage)
    ? payload.usage
    : Array.isArray(payload?.settingUsage)
      ? payload.settingUsage
      : Array.isArray(payload?.setting_usage)
        ? payload.setting_usage
        : Array.isArray(payload?.storylineUsage)
          ? payload.storylineUsage
          : Array.isArray(payload?.storyline_usage)
            ? payload.storyline_usage
            : Array.isArray(payload?.usages)
              ? payload.usages
              : []
  return rows.map(normalizeUsageInput).filter((item: any) => item.entity_id)
}

function settingText(setting: any) {
  return [
    setting.name,
    setting.summary,
    JSON.stringify(setting.constraints_json || {}),
    JSON.stringify(setting.state_json || {}),
  ].join(' ')
}

export function heuristicUsageSuggestions(chapter: any, settings: any[]) {
  const chapterText = [
    chapter.title,
    chapter.chapter_goal,
    chapter.chapter_summary,
    chapter.conflict,
    chapter.ending_hook,
    settingJson(chapter.raw_payload || {}),
  ].join(' ')
  const scored = settings.map(setting => {
    const text = settingText(setting)
    const name = String(setting.name || '')
    let score = 0
    if (name && chapterText.includes(name)) score += 40
    for (const token of text.split(/[\s,，。；;、/|]+/).filter(item => item.length >= 2).slice(0, 50)) {
      if (chapterText.includes(token)) score += 2
    }
    if (['character', 'boss', 'rule'].includes(setting.entity_type)) score += 4
    if (['ability', 'item', 'foreshadowing'].includes(setting.entity_type)) score += 2
    if (STORYLINE_TYPES.includes(setting.entity_type)) score += 5
    return { setting, score }
  }).filter(item => item.score >= 6).sort((a, b) => b.score - a.score)
  return scored.slice(0, 12).map(({ setting, score }, index) => ({
    entity_id: setting.id,
    usage_type: STORYLINE_TYPES.includes(setting.entity_type) ? 'advance' : index < 4 || score >= 30 ? 'required' : 'allowed',
    required: STORYLINE_TYPES.includes(setting.entity_type) || index < 4 || score >= 30,
    allowed: true,
    forbidden: false,
    reveal_level: setting.visibility === 'hidden' || setting.visibility === 'spoiler' ? 'hint' : 'partial',
    expected_state_change: { reason: `自动匹配：与本章目标/摘要/冲突相似度 ${score}` },
  }))
}

export function seedSettingsFromLocalData(worldbuilding: any[], characters: any[], outlines: any[], projectId: number) {
  const firstWorld = worldbuilding[0] || {}
  const seeds: any[] = []
  for (const char of characters) {
    seeds.push({
      project_id: projectId,
      entity_type: char.role_type === 'antagonist' || /反派|boss|敌/.test(String(char.role || char.role_type || '')) ? 'boss' : 'character',
      name: char.name,
      summary: [char.role || char.role_type, char.motivation, char.goal].filter(Boolean).join('；'),
      constraints_json: { knowledge_scope: char.current_state?.knowledge_scope || [], information_boundaries: char.current_state?.information_boundaries || [] },
      state_json: { ...(char.current_state || {}), appearance: char.appearance || '', abilities: char.abilities || [], relationships: char.relationships || [] },
      related_character_ids: [char.id],
      payload_json: { source: 'character_card', character_id: char.id },
    })
    for (const ability of Array.isArray(char.abilities) ? char.abilities : []) {
      const abilityName = typeof ability === 'string' ? ability : ability?.name
      if (!abilityName) continue
      seeds.push({
        project_id: projectId,
        entity_type: 'ability',
        name: String(abilityName),
        summary: typeof ability === 'string' ? ability : String(ability?.summary || ability?.description || ''),
        constraints_json: typeof ability === 'object' ? { cost: ability.cost, limit: ability.limit, condition: ability.condition } : {},
        state_json: { owner: char.name, status: 'known' },
        related_character_ids: [char.id],
        payload_json: { source: 'character_ability', raw: ability },
      })
    }
  }
  for (const rule of Array.isArray(firstWorld.rules) ? firstWorld.rules : []) {
    const name = typeof rule === 'string' ? rule.slice(0, 30) : String(rule?.name || rule?.title || '世界规则')
    seeds.push({ project_id: projectId, entity_type: 'rule', name, summary: typeof rule === 'string' ? rule : String(rule?.summary || rule?.description || ''), constraints_json: typeof rule === 'object' ? rule : {}, state_json: {}, payload_json: { source: 'worldbuilding_rule', raw: rule } })
  }
  for (const item of Array.isArray(firstWorld.items) ? firstWorld.items : []) {
    const name = typeof item === 'string' ? item.slice(0, 30) : String(item?.name || item?.title || '关键物品')
    seeds.push({ project_id: projectId, entity_type: 'item', name, summary: typeof item === 'string' ? item : String(item?.summary || item?.description || ''), constraints_json: typeof item === 'object' ? { owner_rule: item.owner_rule, limitation: item.limitation } : {}, state_json: typeof item === 'object' ? { owner: item.owner, status: item.status } : {}, payload_json: { source: 'worldbuilding_item', raw: item } })
  }
  for (const faction of Array.isArray(firstWorld.factions) ? firstWorld.factions : []) {
    const name = typeof faction === 'string' ? faction.slice(0, 30) : String(faction?.name || faction?.title || '势力')
    seeds.push({ project_id: projectId, entity_type: 'faction', name, summary: typeof faction === 'string' ? faction : String(faction?.summary || faction?.description || ''), constraints_json: typeof faction === 'object' ? faction : {}, state_json: {}, payload_json: { source: 'worldbuilding_faction', raw: faction } })
  }
  for (const location of Array.isArray(firstWorld.locations) ? firstWorld.locations : []) {
    const name = typeof location === 'string' ? location.slice(0, 30) : String(location?.name || location?.title || '地点')
    seeds.push({ project_id: projectId, entity_type: 'location', name, summary: typeof location === 'string' ? location : String(location?.summary || location?.description || ''), constraints_json: typeof location === 'object' ? location : {}, state_json: {}, payload_json: { source: 'worldbuilding_location', raw: location } })
  }
  for (const outline of outlines.filter(item => item.outline_type === 'chapter').slice(0, 120)) {
    if (outline.hook) seeds.push({ project_id: projectId, entity_type: 'foreshadowing', name: `${outline.title}钩子`, summary: outline.hook, related_chapter_ids: [], payload_json: { source: 'outline_hook', outline_id: outline.id } })
  }
  return seeds
}

export function normalizeSettingConsistencyStateUpdatesPayload(payload: any): any[] {
  if (Array.isArray(payload?.required_state_updates)) return payload.required_state_updates
  if (Array.isArray(payload?.requiredStateUpdates)) return payload.requiredStateUpdates
  if (Array.isArray(payload?.state_updates)) return payload.state_updates
  if (Array.isArray(payload?.stateUpdates)) return payload.stateUpdates
  return []
}

export function buildPendingStateUpdates(stateUpdates: any[], settings: any[], usage: any[], chapter: any) {
  return stateUpdates.map(update => {
    const entityId = Number(update?.entity_id || update?.entityId || 0)
    const name = String(update?.name || update?.entity_name || update?.entityName || '').trim()
    const entity = settings.find(item => (entityId && item.id === entityId) || (!!name && item.name === name))
    if (!entity) return null
    const actual = parseJsonField(update.actual_state_change || update.actualStateChange || update.state_delta || update.stateDelta, {})
    if (!actual || typeof actual !== 'object' || Array.isArray(actual) || Object.keys(actual).length === 0) return null
    const currentState = entity.state_json || {}
    const usageRecord = usage.find(item => item.entity_id === entity.id)
    return {
      entity_id: entity.id,
      name: entity.name,
      entity_type: entity.entity_type,
      summary: entity.summary || '',
      chapter_id: chapter.id,
      chapter_no: chapter.chapter_no,
      usage_id: usageRecord?.id || null,
      current_state: currentState,
      actual_state_change: actual,
      next_state: {
        ...currentState,
        ...actual,
        last_checked_chapter_id: chapter.id,
        last_checked_chapter_no: chapter.chapter_no,
      },
      reason: String(update?.reason || update?.description || update?.suggestion || update?.rationale || ''),
    }
  }).filter(Boolean)
}

export async function applyPendingStateUpdates(activeWorkspace: string, projectId: number, chapter: any, settings: any[], usage: any[], updates: any[]) {
  const appliedStateUpdates: any[] = []
  for (const update of updates) {
    const entityId = Number(update?.entity_id || 0)
    const name = String(update?.name || '').trim()
    const entity = settings.find(item => (entityId && item.id === entityId) || (!!name && item.name === name))
    if (!entity) continue
    const actual = parseJsonField(update.actual_state_change || update.state_delta, {})
    if (!actual || typeof actual !== 'object' || Array.isArray(actual) || Object.keys(actual).length === 0) continue
    const updated = await updateNovelSettingEntity(activeWorkspace, entity.id, {
      state_json: {
        ...(entity.state_json || {}),
        ...(actual || {}),
        last_checked_chapter_id: chapter.id,
        last_checked_chapter_no: chapter.chapter_no,
      },
    } as any)
    const matchedUsage = usage.find(item => item.entity_id === entity.id)
    if (matchedUsage) {
      await updateNovelChapterSettingUsage(activeWorkspace, matchedUsage.id, {
        actual_state_change: {
          ...(matchedUsage.actual_state_change || {}),
          ...(actual || {}),
        },
      } as any)
    }
    appliedStateUpdates.push({ entity_id: entity.id, name: entity.name, actual_state_change: actual, updated: Boolean(updated) })
  }
  if (appliedStateUpdates.length > 0) {
    await createNovelReview(activeWorkspace, {
      project_id: projectId,
      review_type: 'setting_state_update_apply',
      status: 'ok',
      summary: `已确认设定状态变更 ${appliedStateUpdates.length} 项`,
      issues: appliedStateUpdates.map(item => `${item.name}：${Object.keys(item.actual_state_change || {}).join('、')}`),
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, applied_state_updates: appliedStateUpdates }),
    })
  }
  return appliedStateUpdates
}

function normalizeDiscoveredAssetForSetting(asset: any, projectId: number, chapter: any) {
  const entityType = String(asset?.entity_type || asset?.type || '')
  const name = String(asset?.target_name || asset?.targetName || asset?.rename_to || asset?.renameTo || asset?.name || asset?.title || '').trim()
  if (!DISCOVERED_ASSET_TYPES.includes(entityType) || !name) return null
  return normalizeSettingInput({
    project_id: projectId,
    entity_type: entityType,
    name,
    summary: String(asset?.summary || asset?.description || asset?.role || asset?.effect || ''),
    status: asset?.status || 'active',
    visibility: asset?.visibility || (entityType === 'foreshadowing' ? 'hidden' : 'public'),
    first_chapter_no: asset?.first_chapter_no ?? chapter?.chapter_no ?? null,
    constraints_json: parseJsonField(asset?.constraints_json ?? asset?.constraints, {}),
    state_json: {
      ...parseJsonField(asset?.state_json ?? asset?.state ?? asset?.suggested_state, {}),
      ...(chapter?.chapter_no ? { first_seen_chapter: chapter.chapter_no } : {}),
    },
    payload_json: {
      ...parseJsonField(asset?.payload_json ?? asset?.payload, {}),
      source: 'discovered_asset_apply',
      source_chapter_id: chapter?.id || null,
      source_chapter_no: chapter?.chapter_no || null,
      evidence: asset?.evidence || '',
      source_excerpt: asset?.source_excerpt || asset?.evidence || '',
      original_name: asset?.name || asset?.title || name,
      raw: asset,
    },
  }, projectId)
}

function discoveredAssetDisposition(asset: any) {
  const value = String(asset?.disposition || asset?.disposition_action || asset?.action || 'confirm').trim()
  if (['rename', 'merge', 'cameo', 'ignore', 'confirm'].includes(value)) return value
  if (['one_off', 'one-time', 'one_time', 'temporary'].includes(value)) return 'cameo'
  return 'confirm'
}

function findMergeTarget(settings: any[], asset: any) {
  const targetId = Number(asset?.merge_target_id || asset?.mergeTargetId || asset?.target_id || asset?.targetId || 0)
  if (targetId) return settings.find(item => Number(item.id) === targetId) || null
  const targetName = firstText(asset?.target_name, asset?.targetName, asset?.merge_target_name, asset?.mergeTargetName)
  const targetType = String(asset?.target_entity_type || asset?.targetEntityType || asset?.entity_type || asset?.type || '')
  if (!targetName) return null
  return settings.find(item => String(item.name || '').trim() === targetName && (!targetType || item.entity_type === targetType)) || null
}

function mergedAssetEvidence(asset: any, chapter: any) {
  return {
    entity_type: String(asset?.entity_type || asset?.type || ''),
    name: String(asset?.name || asset?.title || '').trim(),
    summary: String(asset?.summary || asset?.description || asset?.role || asset?.effect || ''),
    evidence: asset?.evidence || asset?.source_excerpt || '',
    source_chapter_id: chapter?.id || null,
    source_chapter_no: chapter?.chapter_no || null,
  }
}

export async function applyDiscoveredAssetsToProject(activeWorkspace: string, projectId: number, chapter: any, assets: any[] = []) {
  const [characters, settings] = await Promise.all([
    listNovelCharacters(activeWorkspace, projectId),
    listNovelSettingEntities(activeWorkspace, projectId),
  ])
  const characterNames = new Set(characters.map(item => String(item.name || '').trim()).filter(Boolean))
  const settingKeys = new Set(settings.map(item => `${item.entity_type}:${String(item.name || '').trim()}`))
  const createdCharacters: any[] = []
  const createdSettings: any[] = []
  const skippedExisting: any[] = []
  const mergedAssets: any[] = []
  const cameoAssets: any[] = []
  const seen = new Set<string>()

  for (const asset of Array.isArray(assets) ? assets : []) {
    const disposition = discoveredAssetDisposition(asset)
    if (disposition === 'cameo' || disposition === 'ignore') {
      const cameo = mergedAssetEvidence(asset, chapter)
      if (cameo.name) cameoAssets.push(cameo)
      continue
    }
    if (disposition === 'merge') {
      const target = findMergeTarget(settings, asset)
      const source = mergedAssetEvidence(asset, chapter)
      if (!target || !source.name) {
        skippedExisting.push({ entity_type: source.entity_type || String(asset?.entity_type || asset?.type || 'unknown'), name: source.name || String(asset?.name || asset?.title || ''), reason: 'merge_target_missing' })
        continue
      }
      const payload = target.payload_json && typeof target.payload_json === 'object' && !Array.isArray(target.payload_json)
        ? target.payload_json
        : {}
      const mergedEvidence = Array.isArray(payload.merged_discovered_assets) ? payload.merged_discovered_assets : []
      const updated = await updateNovelSettingEntity(activeWorkspace, target.id, {
        ...target,
        payload_json: {
          ...payload,
          merged_discovered_assets: [
            ...mergedEvidence,
            source,
          ],
        },
      } as any)
      if (updated) {
        const index = settings.findIndex(item => Number(item.id) === Number(updated.id))
        if (index >= 0) settings[index] = updated
      }
      mergedAssets.push({
        ...source,
        source_name: source.name,
        target_id: target.id,
        target_name: target.name,
        target_entity_type: target.entity_type,
      })
      continue
    }
    const seed = normalizeDiscoveredAssetForSetting(asset, projectId, chapter)
    if (!seed) continue
    const key = `${seed.entity_type}:${seed.name}`
    if (seen.has(key) || settingKeys.has(key) || (seed.entity_type === 'character' && characterNames.has(seed.name))) {
      skippedExisting.push({ entity_type: seed.entity_type, name: seed.name })
      continue
    }
    seen.add(key)
    if (seed.entity_type === 'character') {
      const character = await createNovelCharacter(activeWorkspace, {
        project_id: projectId,
        name: seed.name,
        role_type: String(asset?.role_type || asset?.role || 'supporting'),
        role: String(asset?.role || asset?.role_type || '配角'),
        goal: String(asset?.goal || ''),
        motivation: String(asset?.motivation || ''),
        conflict: String(asset?.conflict || ''),
        appearance: String(asset?.appearance || ''),
        current_state: seed.state_json || {},
        raw_payload: { source: 'discovered_asset_apply', source_chapter_id: chapter?.id || null, raw: asset },
      } as any)
      createdCharacters.push(character)
      const setting = await createNovelSettingEntity(activeWorkspace, {
        ...seed,
        related_character_ids: [character.id],
        payload_json: { ...(seed.payload_json || {}), character_id: character.id },
      } as any)
      createdSettings.push(setting)
      characterNames.add(seed.name)
      settingKeys.add(key)
      continue
    }
    const setting = await createNovelSettingEntity(activeWorkspace, seed as any)
    createdSettings.push(setting)
    settingKeys.add(key)
  }

  return {
    created_characters: createdCharacters,
    created_settings: createdSettings,
    skipped_existing: skippedExisting,
    merged_assets: mergedAssets,
    cameo_assets: cameoAssets,
    total: createdCharacters.length + createdSettings.length,
  }
}

