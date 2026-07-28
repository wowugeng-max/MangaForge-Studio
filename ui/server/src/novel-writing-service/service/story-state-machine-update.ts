import {
  findOrCreateNovelReviewByReceipt,
  mergeNovelChapterRawPayload,
  mutateNovelProjectReferenceConfig,
  mutateNovelProjectReferenceConfigForChapterCandidate,
  updateNovelProject,
} from '../../novel'
import {
  blockingPreparedStoryStateHardFailures,
  formatPreparedStoryStateFailureSummary,
} from '../../novel-writing/prepared-story-state'
import { materializeStoryRelations } from '../../routes/novel-setting-story-relations'
import { throwIfAborted } from './runtime-helpers'
import { mergeStoryState } from './story-state-helpers'
import type { PreparedStoryStateUpdate } from '../../novel-writing/prepared-story-state'
import type { PrepareStoryStateUpdateOptions } from './story-state-machine-prepare'
import { applyStoryStateMachineSyncPhaseA } from './story-state-machine-update-phase-a'
import { applyStoryStateMachineSyncPhaseB } from './story-state-machine-update-phase-b'
import { sanitizeJsonValue } from '../../novel/json'

export type StoryStateIdempotencyReceipt = {
  key: string
  source_run_id: number | null
  candidate_hash: string
  chapter_id: number
}

export type StoryStateMachineOptions = PrepareStoryStateUpdateOptions & {
  prepared?: PreparedStoryStateUpdate
  exactChapter?: boolean
  idempotencyReceipt?: StoryStateIdempotencyReceipt
  saveDerivedReview?: (activeWorkspace: string, record: any) => Promise<any>
}

export type StoryStateMachineUpdateOptions = StoryStateMachineOptions

const RECOVERY_MAX_DEPTH = 10
const RECOVERY_MAX_ARRAY_ITEMS = 128
const RECOVERY_MAX_OBJECT_KEYS = 128
const RECOVERY_MAX_STRING_LENGTH = 2_000
const RECOVERY_MAX_NODES_PER_FIELD = 2_048
const RECOVERY_FIELD_BYTE_LIMITS = {
  state_delta: 60_000,
  character_updates: 35_000,
  setting_updates: 35_000,
  storyline_updates: 35_000,
  sync_reports: 15_000,
  hard_failures: 15_000,
  payload: 25_000,
} as const

type RecoveryBudget = { nodes: number; bytes: number }

const utf8Encoder = new TextEncoder()

function jsonByteLength(value: any) {
  return utf8Encoder.encode(JSON.stringify(value)).byteLength
}

function forbiddenRecoveryKey(key: string) {
  const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase()
  return normalized === 'prose'
    || normalized === 'sourceprose'
    || normalized === 'chapterprose'
    || normalized === 'candidateprose'
    || normalized === 'originalprose'
    || normalized === 'revisedprose'
    || normalized === 'finalprose'
    || normalized === 'fullprose'
    || normalized.endsWith('chaptertext')
    || normalized.endsWith('sourcetext')
    || normalized.endsWith('prosetext')
    || normalized === 'finaltext'
    || normalized === 'candidatetext'
    || normalized === 'originaltext'
    || normalized === 'revisedtext'
    || normalized === 'fulltext'
    || normalized === 'context'
    || normalized.endsWith('contextpackage')
    || normalized.endsWith('prompt')
    || normalized === 'provider'
    || normalized.endsWith('providermessages')
    || normalized.endsWith('providerresponse')
    || normalized.endsWith('message')
    || normalized.endsWith('messages')
    || normalized.includes('rawresponse')
    || normalized === 'raw'
    || normalized === 'rawpayload'
    || normalized === 'request'
    || normalized === 'response'
    || normalized === 'task'
    || normalized === 'storystatesyncreceipts'
    || normalized === 'receiptbinding'
}

function sanitizeRecoveryValue(
  value: any,
  depth = 0,
  budget: RecoveryBudget = { nodes: RECOVERY_MAX_NODES_PER_FIELD, bytes: RECOVERY_FIELD_BYTE_LIMITS.payload },
): any {
  if (depth > RECOVERY_MAX_DEPTH || budget.nodes <= 0 || budget.bytes <= 0 || value === undefined) return undefined
  budget.nodes -= 1
  if (typeof value === 'string') {
    const characters = Array.from(value).slice(0, RECOVERY_MAX_STRING_LENGTH)
    let low = 0
    let high = characters.length
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if (jsonByteLength(characters.slice(0, middle).join('')) <= budget.bytes) low = middle
      else high = middle - 1
    }
    const bounded = characters.slice(0, low).join('')
    const bytes = jsonByteLength(bounded)
    if (bytes > budget.bytes) return undefined
    budget.bytes -= bytes
    return bounded
  }
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    const bytes = jsonByteLength(value)
    if (bytes > budget.bytes) return undefined
    budget.bytes -= bytes
    return value
  }
  if (Array.isArray(value)) {
    if (budget.bytes < 2) return undefined
    budget.bytes -= 2
    const output: any[] = []
    for (const item of value.slice(0, RECOVERY_MAX_ARRAY_ITEMS)) {
      const separatorBytes = output.length ? 1 : 0
      if (separatorBytes >= budget.bytes) break
      budget.bytes -= separatorBytes
      const sanitized = sanitizeRecoveryValue(item, depth + 1, budget)
      if (sanitized === undefined) {
        budget.bytes += separatorBytes
        continue
      }
      output.push(sanitized)
      if (budget.nodes <= 0 || budget.bytes <= 0) break
    }
    return output
  }
  if (typeof value !== 'object') return sanitizeRecoveryValue(String(value), depth, budget)
  if (budget.bytes < 2) return undefined
  budget.bytes -= 2
  const output: Record<string, any> = {}
  let retainedKeys = 0
  for (const [key, item] of Object.entries(value)) {
    if (retainedKeys >= RECOVERY_MAX_OBJECT_KEYS || budget.nodes <= 0 || budget.bytes <= 0) break
    if (item === undefined || forbiddenRecoveryKey(key)) continue
    const prefixBytes = (retainedKeys ? 1 : 0) + jsonByteLength(key) + 1
    if (prefixBytes >= budget.bytes) continue
    budget.bytes -= prefixBytes
    const sanitized = sanitizeRecoveryValue(item, depth + 1, budget)
    if (sanitized === undefined) {
      budget.bytes += prefixBytes
      continue
    }
    output[key] = sanitized
    retainedKeys += 1
  }
  return output
}

export function compactPreparedStoryStateForRecovery(prepared: PreparedStoryStateUpdate) {
  const payload = prepared.payload || {}
  const field = (value: any, bytes: number) => sanitizeRecoveryValue(value, 0, {
    nodes: RECOVERY_MAX_NODES_PER_FIELD,
    bytes,
  })
  return sanitizeJsonValue({
    state_delta: field(prepared.state_delta || {}, RECOVERY_FIELD_BYTE_LIMITS.state_delta) || {},
    character_updates: field(prepared.character_updates || [], RECOVERY_FIELD_BYTE_LIMITS.character_updates) || [],
    setting_updates: field(prepared.setting_updates || [], RECOVERY_FIELD_BYTE_LIMITS.setting_updates) || [],
    storyline_updates: field(prepared.storyline_updates || [], RECOVERY_FIELD_BYTE_LIMITS.storyline_updates) || [],
    sync_reports: sanitizeRecoveryValue({
      state_delta_completeness: prepared.sync_reports?.state_delta_completeness || {},
    }, 0, { nodes: RECOVERY_MAX_NODES_PER_FIELD, bytes: RECOVERY_FIELD_BYTE_LIMITS.sync_reports }) || {},
    hard_failures: field(prepared.hard_failures || [], RECOVERY_FIELD_BYTE_LIMITS.hard_failures) || [],
    payload: field({
      discovered_assets: payload.discovered_assets,
      discoveredAssets: payload.discoveredAssets,
      ip_scene_candidates: payload.ip_scene_candidates,
      ipSceneCandidates: payload.ipSceneCandidates,
      foreshadowing_status: payload.foreshadowing_status,
      foreshadowingStatus: payload.foreshadowingStatus,
    }, RECOVERY_FIELD_BYTE_LIMITS.payload) || {},
  }) as PreparedStoryStateUpdate
}

async function buildReceiptDerivedReviewSaver(activeWorkspace: string, projectId: number, receiptKey: string) {
  return async (_workspace: string, record: any) => {
    if (!record) return null
    const reviewType = String(record.review_type || 'story_state')
    const derivedKey = `${receiptKey}:${reviewType}`
    return findOrCreateNovelReviewByReceipt(activeWorkspace, {
      data: { ...record, project_id: projectId, review_type: reviewType },
      receiptKey,
      derivedKey,
    })
  }
}

export async function updateStoryStateMachine(
  activeWorkspace: string,
  project: any,
  chapter: any,
  contextPackage: any,
  chapterText: string,
  modelId: number | undefined = undefined,
  options: StoryStateMachineUpdateOptions = {},
  deps: {
    prepareStoryStateUpdate: (
      activeWorkspace: string,
      project: any,
      chapter: any,
      contextPackage: any,
      chapterText: string,
      modelId?: number,
      options?: PrepareStoryStateUpdateOptions,
    ) => Promise<PreparedStoryStateUpdate>
    refreshFollowingChapterSerialStoryStateReadiness: (...args: any[]) => any
  },
) {
  const prepareStoryStateUpdate = deps.prepareStoryStateUpdate
  const refreshFollowingChapterSerialStoryStateReadiness = deps.refreshFollowingChapterSerialStoryStateReadiness

  let prepared: PreparedStoryStateUpdate = options.prepared || await prepareStoryStateUpdate(activeWorkspace, project, chapter, contextPackage, chapterText, modelId, {
    ...options,
    allowDeterministicFallback: options.exactChapter ? false : options.allowDeterministicFallback !== false,
    retryOnBlockedTransport: options.exactChapter ? false : options.retryOnBlockedTransport !== false,
  })
  const blockingFailures = blockingPreparedStoryStateHardFailures(prepared.hard_failures)
  if (blockingFailures.length) {
    const summary = formatPreparedStoryStateFailureSummary(blockingFailures) || '故事状态准备阶段未通过'
    throw Object.assign(new Error(summary), {
      code: 'STORY_STATE_PREPARE_BLOCKED',
      hard_failures: prepared.hard_failures,
      blocking_hard_failures: blockingFailures,
    })
  }
  let payload = prepared.payload
  let stateDelta = prepared.state_delta
  if (prepared.hard_failures.length) {
    payload.soft_hard_failures = prepared.hard_failures
    payload.story_state_applied_with_warnings = true
  }
  if (options.exactChapter) throwIfAborted(options)
  let appliedProject = project
  let nextReferenceConfig = prepared.next_reference_config
  let receiptReused = false
  const receipt = options.idempotencyReceipt
  if (options.exactChapter) {
    if (!receipt?.key) throw new Error('exact Story State update requires idempotency receipt')
    const compactPrepared = compactPreparedStoryStateForRecovery(prepared)
    const mutation = await mutateNovelProjectReferenceConfigForChapterCandidate(activeWorkspace, {
      projectId: project.id,
      chapterId: receipt.chapter_id,
      candidateHash: receipt.candidate_hash,
      operation: 'apply-exact-story-state',
      signal: options.signal,
      mutate: currentConfig => {
        const receipts = { ...(currentConfig.story_state_sync_receipts || {}) }
        const existing = receipts[receipt.key]
        if (existing?.status === 'completed') {
          return {
            referenceConfig: currentConfig,
            result: { reused: true, completed: true, payload: existing.payload },
          }
        }
        if (existing?.status === 'state_applied') {
          return {
            referenceConfig: currentConfig,
            result: {
              reused: true,
              completed: false,
              prepared: existing.prepared_for_recovery,
            },
          }
        }
        const canonicalPrepared = compactPrepared
        const referenceConfig = {
          ...currentConfig,
          story_state: mergeStoryState(currentConfig.story_state || {}, canonicalPrepared.state_delta, chapter),
          story_state_sync_receipts: {
            ...receipts,
            [receipt.key]: {
              source_run_id: receipt.source_run_id,
              candidate_hash: receipt.candidate_hash,
              chapter_id: receipt.chapter_id,
              status: 'state_applied',
              applied_at: new Date().toISOString(),
              payload: canonicalPrepared.payload,
              prepared_for_recovery: canonicalPrepared,
            },
          },
        }
        return {
          referenceConfig,
          result: { reused: false, completed: false, prepared: canonicalPrepared },
        }
      },
    })
    if (!mutation) throw new Error('project not found')
    appliedProject = mutation.project
    nextReferenceConfig = mutation.project.reference_config
    receiptReused = mutation.result.reused
    if (mutation.result.completed) {
      const completedPayload = sanitizeRecoveryValue(mutation.result.payload || {}) || {}
      completedPayload.story_state_receipt_key = receipt.key
      completedPayload.story_state_receipt_reused = true
      return completedPayload
    }
    if (!mutation.result.prepared) {
      throw Object.assign(new Error('canonical Story State recovery preparation is missing'), {
        code: 'STORY_STATE_RECOVERY_PREPARED_MISSING',
      })
    }
    prepared = mutation.result.prepared as PreparedStoryStateUpdate
    payload = prepared.payload || {}
    stateDelta = prepared.state_delta || {}
    payload.story_state_receipt_key = receipt.key
    payload.story_state_receipt_reused = receiptReused
  } else {
    await updateNovelProject(activeWorkspace, project.id, { reference_config: nextReferenceConfig } as any)
  }
  try {
    const storyState = nextReferenceConfig?.story_state || {}
    if (storyState && (storyState.character_relationships || storyState.characterRelationships)) {
      const materialized = await materializeStoryRelations(activeWorkspace, project.id, { storyState })
      payload.story_relation_materialize = {
        created: materialized.summary.created,
        updated: materialized.summary.updated,
        character_patches: materialized.summary.character_patches,
        total: materialized.summary.total,
      }
    }
  } catch (error: any) {
    payload.story_relation_materialize_error = String(error?.message || error || 'materialize failed')
    if (options.exactChapter) throw error
  }
  payload.style_fingerprint = stateDelta.style_fingerprint
  payload.style_fingerprint_contract = stateDelta.style_fingerprint_contract
  const saveDerivedReview = options.saveDerivedReview
    || (options.exactChapter && receipt?.key
      ? await buildReceiptDerivedReviewSaver(activeWorkspace, project.id, receipt.key)
      : undefined)
  if (options.exactChapter) throwIfAborted(options)
  await applyStoryStateMachineSyncPhaseA({
    activeWorkspace,
    project: appliedProject,
    chapter,
    contextPackage,
    chapterText,
    prepared,
    payload,
    stateDelta,
    saveDerivedReview,
    exactChapter: options.exactChapter,
  })
  if (options.exactChapter) throwIfAborted(options)
  await applyStoryStateMachineSyncPhaseB({
    activeWorkspace,
    project: appliedProject,
    chapter,
    contextPackage,
    chapterText,
    payload,
    saveDerivedReview,
  })
  try {
    const chapterId = Number(chapter?.id || 0)
    if (chapterId) {
      const existingAdmission = (chapter?.raw_payload && typeof chapter.raw_payload === 'object' ? chapter.raw_payload.prose_admission : null)
        || (chapter?.raw_payload && typeof chapter.raw_payload === 'object' ? chapter.raw_payload.proseAdmission : null)
        || {}
      const nextAdmission = {
        ...(existingAdmission && typeof existingAdmission === 'object' ? existingAdmission : {}),
        story_state_status: 'synced',
        story_state_warning: prepared.hard_failures.length
          ? { hard_failures: prepared.hard_failures, soft: true }
          : null,
      }
      await mergeNovelChapterRawPayload(activeWorkspace, chapterId, {
        prose_admission: nextAdmission,
        proseAdmission: nextAdmission,
      })
    }
  } catch (error) {
    if (options.exactChapter) throw error
    // manual sync still succeeds even if chapter admission flag cannot be patched
  }
  if (!options.exactChapter) {
    try {
      await refreshFollowingChapterSerialStoryStateReadiness(
        activeWorkspace,
        project.id,
        Number(chapter?.chapter_no || 0),
        Number(chapter?.chapter_no || 0),
      )
    } catch {
      // cache refresh is best-effort; live preflight reconcile is the source of truth
    }
  }
  if (options.exactChapter && receipt?.key) {
    throwIfAborted(options)
    await mutateNovelProjectReferenceConfig(activeWorkspace, {
      projectId: project.id,
      operation: 'complete-exact-story-state',
      signal: options.signal,
      mutate: currentConfig => {
        const receipts = { ...(currentConfig.story_state_sync_receipts || {}) }
        const existing = receipts[receipt.key]
        if (!existing || existing.status === 'completed') {
          return { referenceConfig: currentConfig, result: false }
        }
        const { prepared_for_recovery: _preparedForRecovery, ...completed } = existing
        return {
          referenceConfig: {
            ...currentConfig,
            story_state_sync_receipts: {
              ...receipts,
              [receipt.key]: {
                ...completed,
                status: 'completed',
                completed_at: new Date().toISOString(),
                payload: sanitizeRecoveryValue(payload),
              },
            },
          },
          result: true,
        }
      },
    })
  }
  return options.exactChapter ? sanitizeRecoveryValue(payload) : payload
}
