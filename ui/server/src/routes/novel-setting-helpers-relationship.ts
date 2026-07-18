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

import type {
  SettingRelationshipRepairPatch,
} from './novel-setting-helpers-shared'
import {
  RELATIONSHIP_REPAIR_PATCH_TYPES,
  asSettingArray,
  clampConfidence,
  isRelationshipRepairPatchTypeSafe,
  settingByIdOrName,
} from './novel-setting-helpers-shared'

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

