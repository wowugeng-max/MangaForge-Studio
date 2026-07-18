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

import {
  SETTING_TYPES,
  STORYLINE_TYPES,
  asSettingArray,
  firstText,
  normalizeSettingInput,
  parseJsonField,
  settingJson,
} from './novel-setting-helpers-shared'

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

