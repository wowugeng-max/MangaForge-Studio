import { McpError } from '../mcp/errors'
import { withMcpWorkspaceMutation } from '../mcp/workspace-coordinator'
import {
  chapterGenerationSourceFingerprint,
  proseGenerationSourceFingerprint,
  resolveChapterGenerationSource,
  resolveProseGenerationSource,
} from '../novel-writing-service/generation-source/source-config'
import { ChapterGenerationSourceError } from '../novel-writing-service/generation-source/errors'
import type { NovelChapterAcceptanceInput, NovelReferenceConfig } from './types'
import { loadAcceptanceWorkingSet, persistNovelChapterAcceptanceDelta } from './acceptance-helpers'
import { nextChapterVersionNo, createChapterVersionRecord, versionedChapterSnapshotChanged } from './chapter-helpers'
import { openDb, ensureSqliteSchema } from './db'
import { nowIso } from './json'
import { importLegacyNovelStoreIfNeeded } from './legacy-import'
import { withNovelWorkspaceMutation } from './lock'
import { materialRepairContextVersionFromDb } from './material-repair-context-version'
import { normalizeProjectRecord, normalizeWorldbuildingRecord, normalizeCharacterRecord, normalizeChapterRecord, normalizeReviewRecord, normalizeSettingEntityRecord, normalizeChapterSettingUsageRecord } from './normalize'
import { nextTableId } from './sql-rows'

export function mergeAcceptanceReferenceConfig(
  current: NovelReferenceConfig = {},
  prepared?: NovelReferenceConfig,
) {
  if (prepared === undefined) return current
  const next = { ...current }
  if (Object.prototype.hasOwnProperty.call(prepared, 'story_state')) {
    next.story_state = prepared.story_state
  }
  return next
}

export async function commitNovelChapterAcceptance(activeWorkspace: string, input: NovelChapterAcceptanceInput) {
  return withMcpWorkspaceMutation(activeWorkspace, () => withNovelWorkspaceMutation(activeWorkspace, async () => {
  await importLegacyNovelStoreIfNeeded(activeWorkspace)
  const db = openDb(activeWorkspace)
  let committed = false
  try {
  ensureSqliteSchema(db)
  db.exec('BEGIN IMMEDIATE')
  const working = loadAcceptanceWorkingSet(db, Number(input.chapter_id || 0))
  if (!working) throw new Error(`chapter reference not found: ${input.chapter_id}`)
  const store = working.store
  const chapterIndex = working.chapterIndex
  const projectIndex = working.projectIndex
  const currentChapter = store.chapters[chapterIndex]
  const currentProject = store.projects[projectIndex]
  const expectedMaterialContextVersion = typeof input.expected_material_repair_context_version === 'string'
    ? input.expected_material_repair_context_version.trim()
    : ''
  if (expectedMaterialContextVersion) {
    const currentMaterialContextVersion = materialRepairContextVersionFromDb(
      db,
      currentProject.id,
      currentChapter.id,
    )
    if (currentMaterialContextVersion !== expectedMaterialContextVersion) {
      throw Object.assign(new Error('材料上下文已变化，请基于最新材料重试'), {
        code: 'MATERIAL_REPAIR_CONTEXT_CHANGED',
        error_code: 'MATERIAL_REPAIR_CONTEXT_CHANGED',
      })
    }
  }
  const expectedChapterFingerprint = typeof input.expected_chapter_generation_source_fingerprint === 'string'
    ? input.expected_chapter_generation_source_fingerprint.trim()
    : ''
  if (expectedChapterFingerprint) {
    let currentChapterFingerprint = ''
    try {
      currentChapterFingerprint = chapterGenerationSourceFingerprint(resolveChapterGenerationSource(currentProject))
    } catch {
      currentChapterFingerprint = ''
    }
    if (currentChapterFingerprint !== expectedChapterFingerprint) {
      throw new ChapterGenerationSourceError(
        'GENERATION_SOURCE_CHANGED',
        '项目章节生成来源已在任务期间变更；旧任务结果不会入库',
        { reason: 'source_changed' },
      )
    }
  }
  const expectedFingerprint = typeof input.expected_prose_generation_source_fingerprint === 'string'
    ? input.expected_prose_generation_source_fingerprint.trim()
    : ''
  if (expectedFingerprint) {
    const currentFingerprint = proseGenerationSourceFingerprint(resolveProseGenerationSource(currentProject))
    if (currentFingerprint !== expectedFingerprint) {
      throw new McpError(
        'MCP_BINDING_CHANGED',
        '项目正文来源已在生成期间变更；旧请求结果不会入库',
        { reason: 'binding_changed' },
      )
    }
  }
  const beforeStore = structuredClone(store)
  const validateImmutablePatchReferences = (
    patch: any,
    references: Array<[key: string, expected: number]>,
    label: string,
    index?: number,
  ) => {
    for (const [key, expected] of references) {
      if (Object.prototype.hasOwnProperty.call(patch || {}, key) && Number(patch[key]) !== expected) {
        throw new Error(`${label} immutable ${key} reference invalid${index === undefined ? '' : ` at index ${index}`}`)
      }
    }
  }
  validateImmutablePatchReferences(input.chapter_patch, [
    ['id', currentChapter.id],
    ['project_id', currentProject.id],
  ], 'chapter patch')
  validateImmutablePatchReferences(input.project_patch, [['id', currentProject.id]], 'project patch')
  const temporaryEntityIds = new Map<number, number>()
  const validateCreateProject = (record: any, label: string, index: number) => {
    if (record?.project_id !== undefined && Number(record.project_id) !== currentProject.id) {
      throw new Error(`${label} project reference invalid at index ${index}`)
    }
  }
  let nextWorldbuildingId = nextTableId(db, 'worldbuilding')
  for (const [index, create] of (input.worldbuilding_creates || []).entries()) {
    validateCreateProject(create, 'worldbuilding create', index)
    const requestedId = Number(create?.id || 0)
    if (requestedId > 0 && store.worldbuilding.some(item => item.id === requestedId)) throw new Error(`worldbuilding id conflict at index ${index}`)
    const id = requestedId > 0 ? requestedId : nextWorldbuildingId++
    nextWorldbuildingId = Math.max(nextWorldbuildingId, id + 1)
    if (requestedId < 0) temporaryEntityIds.set(requestedId, id)
    store.worldbuilding.push(normalizeWorldbuildingRecord({ ...create, project_id: currentProject.id }, { id }))
  }
  let nextCharacterId = nextTableId(db, 'characters')
  for (const [index, create] of (input.character_creates || []).entries()) {
    validateCreateProject(create, 'character create', index)
    const name = String(create?.name || '').trim()
    if (!name || store.characters.some(item => item.project_id === currentProject.id && item.name === name)) throw new Error(`character create reference conflict at index ${index}`)
    const requestedId = Number(create?.id || 0)
    if (requestedId > 0 && store.characters.some(item => item.id === requestedId)) throw new Error(`character id conflict at index ${index}`)
    const id = requestedId > 0 ? requestedId : nextCharacterId++
    nextCharacterId = Math.max(nextCharacterId, id + 1)
    if (requestedId < 0) temporaryEntityIds.set(requestedId, id)
    store.characters.push(normalizeCharacterRecord({ ...create, project_id: currentProject.id }, { id }))
  }
  let nextSettingId = nextTableId(db, 'setting_entities')
  for (const [index, create] of (input.setting_creates || []).entries()) {
    validateCreateProject(create, 'setting create', index)
    const name = String(create?.name || '').trim()
    const entityType = String(create?.entity_type || 'rule')
    if (!name || store.setting_entities.some(item => item.project_id === currentProject.id && item.name === name && item.entity_type === entityType)) throw new Error(`setting create reference conflict at index ${index}`)
    const requestedId = Number(create?.id || 0)
    if (requestedId > 0 && store.setting_entities.some(item => item.id === requestedId)) throw new Error(`setting id conflict at index ${index}`)
    const id = requestedId > 0 ? requestedId : nextSettingId++
    nextSettingId = Math.max(nextSettingId, id + 1)
    if (requestedId < 0) temporaryEntityIds.set(requestedId, id)
    store.setting_entities.push(normalizeSettingEntityRecord({ ...create, project_id: currentProject.id }, { id }))
  }

  const resolveUniqueRecordIndex = (matches: number[], label: string, index: number) => {
    if (matches.length === 0) throw new Error(`${label} not found at index ${index}`)
    if (matches.length > 1) throw new Error(`${label} ambiguous at index ${index}`)
    return matches[0]
  }
  const resolveSettingReference = (reference: any, label: string, index: number) => {
    const requestedId = Number(reference?.entity_id || reference?.entityId || reference?.id || 0)
    const id = temporaryEntityIds.get(requestedId) || requestedId
    const name = String(reference?.entity_name || reference?.name || '').trim()
    const entityType = String(reference?.entity_type || reference?.entityType || '').trim()
    const hasIdReference = id > 0
    const hasNameReference = Boolean(name)
    if (!hasIdReference && !hasNameReference) throw new Error(`${label} not found at index ${index}`)
    const idRecordIndex = hasIdReference
      ? resolveUniqueRecordIndex(store.setting_entities
          .map((item, recordIndex) => item.project_id === currentProject.id && item.id === id ? recordIndex : -1)
          .filter(recordIndex => recordIndex >= 0), label, index)
      : null
    const nameRecordIndex = hasNameReference
      ? resolveUniqueRecordIndex(store.setting_entities
          .map((item, recordIndex) => item.project_id === currentProject.id && item.name === name && (!entityType || item.entity_type === entityType) ? recordIndex : -1)
          .filter(recordIndex => recordIndex >= 0), label, index)
      : null
    if (idRecordIndex !== null && nameRecordIndex !== null && idRecordIndex !== nameRecordIndex) {
      throw new Error(`${label} inconsistent at index ${index}`)
    }
    const recordIndex = (idRecordIndex ?? nameRecordIndex) as number
    return { recordIndex, entityId: store.setting_entities[recordIndex].id }
  }

  const resolveCharacterReference = (reference: any, label: string, index: number) => {
    const requestedId = Number(reference?.id || 0)
    const id = temporaryEntityIds.get(requestedId) || requestedId
    const name = String(reference?.name || '').trim()
    const hasIdReference = id > 0
    const hasNameReference = Boolean(name)
    if (!hasIdReference && !hasNameReference) throw new Error(`${label} not found at index ${index}`)
    const idRecordIndex = hasIdReference
      ? resolveUniqueRecordIndex(store.characters
          .map((item, recordIndex) => item.project_id === currentProject.id && item.id === id ? recordIndex : -1)
          .filter(recordIndex => recordIndex >= 0), label, index)
      : null
    const nameRecordIndex = hasNameReference
      ? resolveUniqueRecordIndex(store.characters
          .map((item, recordIndex) => item.project_id === currentProject.id && item.name === name ? recordIndex : -1)
          .filter(recordIndex => recordIndex >= 0), label, index)
      : null
    if (idRecordIndex !== null && nameRecordIndex !== null && idRecordIndex !== nameRecordIndex) {
      throw new Error(`${label} inconsistent at index ${index}`)
    }
    return (idRecordIndex ?? nameRecordIndex) as number
  }

  const characterChanges = (input.character_updates || []).map((update, index) => {
    const recordIndex = resolveCharacterReference(update, 'character update reference', index)
    const current = store.characters[recordIndex]
    validateImmutablePatchReferences(update.patch, [
      ['id', current.id],
      ['project_id', currentProject.id],
    ], 'character update patch', index)
    return { recordIndex, patch: update.patch || {} }
  })
  const settingChanges = (input.setting_updates || []).map((update, index) => {
    const { recordIndex } = resolveSettingReference(update, 'setting update reference', index)
    const current = store.setting_entities[recordIndex]
    validateImmutablePatchReferences(update.patch, [
      ['id', current.id],
      ['project_id', currentProject.id],
    ], 'setting update patch', index)
    return { recordIndex, patch: update.patch || {} }
  })
  const replacementUsage = input.chapter_setting_usage_replacement === undefined ? null : input.chapter_setting_usage_replacement.map((usage, index) => {
    const { entityId } = resolveSettingReference(usage, 'usage replacement entity reference', index)
    return { ...usage, entity_id: entityId }
  })
  if (replacementUsage) {
    const seenReplacementEntities = new Set<number>()
    for (const [index, usage] of replacementUsage.entries()) {
      if (seenReplacementEntities.has(usage.entity_id)) throw new Error(`usage replacement entity reference ambiguous at index ${index}`)
      seenReplacementEntities.add(usage.entity_id)
    }
    store.chapter_setting_usage = store.chapter_setting_usage.filter(item => !(item.project_id === currentProject.id && item.chapter_id === currentChapter.id))
    let nextUsageId = nextTableId(db, 'chapter_setting_usage')
    store.chapter_setting_usage.push(...replacementUsage.map(usage => normalizeChapterSettingUsageRecord({
      ...usage,
      id: nextUsageId++,
      project_id: currentProject.id,
      chapter_id: currentChapter.id,
    })))
  }
  const usageChanges = (input.usage_updates || []).map((update, index) => {
    const id = Number(update?.id || 0)
    const hasEntityReference = Number(update?.entity_id || update?.entityId || 0) !== 0 || Boolean(String(update?.name || '').trim())
    if (replacementUsage && !hasEntityReference) throw new Error(`usage update reference not found at index ${index}`)
    const idRecordIndex = id > 0
      ? resolveUniqueRecordIndex(store.chapter_setting_usage
          .map((item, recordIndex) => item.project_id === currentProject.id && item.chapter_id === currentChapter.id && item.id === id ? recordIndex : -1)
          .filter(recordIndex => recordIndex >= 0), 'usage update reference', index)
      : null
    const entityId = hasEntityReference
      ? resolveSettingReference(update, 'usage update reference', index).entityId
      : 0
    const entityRecordIndex = entityId > 0
      ? resolveUniqueRecordIndex(store.chapter_setting_usage
          .map((item, recordIndex) => item.project_id === currentProject.id && item.chapter_id === currentChapter.id && item.entity_id === entityId ? recordIndex : -1)
          .filter(recordIndex => recordIndex >= 0), 'usage update reference', index)
      : null
    if (idRecordIndex !== null && entityRecordIndex !== null && idRecordIndex !== entityRecordIndex) {
      throw new Error(`usage update reference inconsistent at index ${index}`)
    }
    const recordIndex = idRecordIndex ?? entityRecordIndex
    if (recordIndex === null) throw new Error(`usage update reference not found at index ${index}`)
    const current = store.chapter_setting_usage[recordIndex]
    validateImmutablePatchReferences(update.patch, [
      ['id', current.id],
      ['project_id', currentProject.id],
      ['chapter_id', currentChapter.id],
      ['entity_id', current.entity_id],
    ], 'usage update patch', index)
    return { recordIndex, patch: update.patch || {} }
  })
  for (const [index, review] of (input.reviews || []).entries()) {
    if (review.project_id !== undefined && Number(review.project_id) !== currentProject.id) {
      throw new Error(`review project reference invalid at index ${index}`)
    }
  }

  const updatedChapter = normalizeChapterRecord(input.chapter_patch || {}, { ...currentChapter, id: currentChapter.id, updated_at: nowIso() })
  const nextChapter = { ...currentChapter, ...updatedChapter, updated_at: nowIso() }
  if (versionedChapterSnapshotChanged(currentChapter, nextChapter)) {
    store.chapter_versions.push(createChapterVersionRecord({ id: nextTableId(db, 'chapter_versions'), 
      chapter_id: currentChapter.id,
      project_id: currentChapter.project_id,
      version_no: nextChapterVersionNo(db, currentChapter.id),
      chapter_text: currentChapter.chapter_text || '',
      scene_breakdown: currentChapter.scene_breakdown || [],
      continuity_notes: currentChapter.continuity_notes || [],
      source: input.version_source || 'manual_edit',
    }))
  }
  store.chapters[chapterIndex] = nextChapter

  const { reference_config: _ignoredReferenceConfig, ...safeProjectPatch } = input.project_patch || {}
  const projectPatch = {
    ...safeProjectPatch,
    ...(input.next_reference_config === undefined ? {} : {
      reference_config: mergeAcceptanceReferenceConfig(currentProject.reference_config, input.next_reference_config),
    }),
  }
  if (Object.keys(projectPatch).length > 0) {
    const normalizedProject = normalizeProjectRecord(projectPatch, { ...currentProject, id: currentProject.id, updated_at: nowIso() })
    store.projects[projectIndex] = { ...currentProject, ...normalizedProject, updated_at: nowIso() }
  }
  for (const change of characterChanges) {
    const current = store.characters[change.recordIndex]
    const patch = change.patch.current_state === undefined ? change.patch : {
      ...change.patch,
      current_state: { ...(current.current_state || {}), ...(change.patch.current_state || {}) },
    }
    store.characters[change.recordIndex] = normalizeCharacterRecord(patch, current)
  }
  for (const change of settingChanges) {
    const current = store.setting_entities[change.recordIndex]
    const patch = change.patch.state_json === undefined ? change.patch : {
      ...change.patch,
      state_json: { ...(current.state_json || {}), ...(change.patch.state_json || {}) },
    }
    store.setting_entities[change.recordIndex] = normalizeSettingEntityRecord(patch, current)
  }
  for (const change of usageChanges) {
    const current = store.chapter_setting_usage[change.recordIndex]
    const patch = change.patch.actual_state_change === undefined ? change.patch : {
      ...change.patch,
      actual_state_change: { ...(current.actual_state_change || {}), ...(change.patch.actual_state_change || {}) },
    }
    store.chapter_setting_usage[change.recordIndex] = normalizeChapterSettingUsageRecord(patch, current)
  }
  let nextReviewId = nextTableId(db, 'reviews')
  for (const review of input.reviews || []) {
    store.reviews.push(normalizeReviewRecord({ ...review, id: nextReviewId++, project_id: currentProject.id }))
  }

  persistNovelChapterAcceptanceDelta(db, beforeStore, store)
  db.exec('COMMIT')
  committed = true
  return { chapter: store.chapters[chapterIndex], project: store.projects[projectIndex] }
  } catch (error) {
    if (!committed) {
      try { db.exec('ROLLBACK') } catch { /* transaction may not have started */ }
    }
    throw error
  } finally {
    db.close()
  }
  }, 'acceptance'))
}
