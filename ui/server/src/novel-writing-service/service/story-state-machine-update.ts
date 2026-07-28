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
import {
  compactPreparedStoryStateForRecovery,
  sanitizeRecoveryValue,
} from './story-state-machine-recovery'

export { compactPreparedStoryStateForRecovery } from './story-state-machine-recovery'

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
