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
  DISCOVERED_ASSET_TYPES,
  firstText,
  normalizeSettingInput,
  parseJsonField,
} from './novel-setting-helpers-shared'

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

