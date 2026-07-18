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
export const DISCOVERED_ASSET_TYPES = ['character', 'item', 'ability', 'faction', 'location', 'foreshadowing']
export const RELATIONSHIP_REPAIR_PATCH_TYPES = [
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

export function parseJsonField(value: any, fallback: any) {
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

export function firstText(...values: any[]) {
  for (const value of values) {
    const text = String(value || '').trim()
    if (text) return text
  }
  return ''
}

export function asSettingArray(value: any) {
  return Array.isArray(value) ? value : []
}

export function clampConfidence(value: any) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0.5
  return Math.max(0, Math.min(1, number))
}

export function settingByName(settings: any[], name: string) {
  const normalized = String(name || '').trim()
  if (!normalized) return null
  return settings.find(item => String(item.name || '').trim() === normalized) || null
}

export function settingByIdOrName(settings: any[], id: any, name: any) {
  const settingId = Number(id || 0)
  if (settingId) {
    const found = settings.find(item => Number(item.id) === settingId)
    if (found) return found
  }
  return settingByName(settings, String(name || ''))
}

export function isRelationshipRepairPatchTypeSafe(patchType: string, source: any, target: any) {
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

