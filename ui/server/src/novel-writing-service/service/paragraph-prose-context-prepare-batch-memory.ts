/** Batch preflight and longform memory fields for paragraph prose context prepare. */
import {
  normalizeBatchChapterHandoffContract,
} from '../post-delivery/chapter-handoff-contracts'
import {
  normalizeDeliveryRiskCarryOverContext,
} from '../post-delivery/delivery-risk-core'
import {
  millionWordRunwayFromContext,
} from '../post-delivery/quality-sync-reports'
import {
  normalizeDailyContextSnapshot,
  normalizeDailyProgressSummary,
  normalizeForeshadowingConsistencyRadar,
  normalizeLayeredMemoryContext,
  normalizeLongformMemoryCapsule,
} from '../quality/memory-longform-contracts'

export function prepareBatchMemoryFields(args: {
  contextPackage: any
  preDraftBrief: any
  chapterDraft: any
  project: any
}) {
  const { contextPackage, preDraftBrief, chapterDraft, project } = args
  const batchPreflight = contextPackage?.chapter_target?.batch_preflight
    || contextPackage?.chapter_target?.batchPreflight
    || contextPackage?.batch_preflight
    || contextPackage?.batchPreflight
    || null
  const batchDeliveryRiskCarryOver = normalizeDeliveryRiskCarryOverContext(
    batchPreflight?.delivery_risk_carry_over
    || batchPreflight?.deliveryRiskCarryOver,
  )
  const batchCreationContractCarryOver = batchDeliveryRiskCarryOver?.creation_contract_carry_over || null
  const batchChapterHandoffContract = normalizeBatchChapterHandoffContract(
    batchPreflight?.chapter_handoff_contract
    || batchPreflight?.chapterHandoffContract,
  )
  const longformMemoryAnchor = batchPreflight?.longform_memory_anchor
    || batchPreflight?.longformMemoryAnchor
    || contextPackage?.chapter_target?.longform_memory_anchor
    || contextPackage?.longform_memory_anchor
    || null
  const longformMemoryCapsule = normalizeLongformMemoryCapsule(
    contextPackage?.chapter_target?.longform_memory_capsule
    || contextPackage?.chapter_target?.longformMemoryCapsule
    || preDraftBrief.longform_memory_capsule
    || preDraftBrief.longformMemoryCapsule
    || contextPackage?.longform_memory_capsule
    || contextPackage?.longformMemoryCapsule,
  )
  const layeredMemoryContext = normalizeLayeredMemoryContext(
    contextPackage?.chapter_target?.layered_memory_context
    || contextPackage?.chapter_target?.layeredMemoryContext
    || contextPackage?.chapter_target?.longform_layered_memory
    || contextPackage?.chapter_target?.longformLayeredMemory
    || preDraftBrief.layered_memory_context
    || preDraftBrief.layeredMemoryContext
    || preDraftBrief.longform_layered_memory
    || preDraftBrief.longformLayeredMemory
    || contextPackage?.layered_memory_context
    || contextPackage?.layeredMemoryContext
    || contextPackage?.longform_layered_memory
    || contextPackage?.longformLayeredMemory,
  )
  const progressSummary = normalizeDailyProgressSummary(
    contextPackage?.chapter_target?.progress_summary
    || contextPackage?.chapter_target?.progressSummary
    || preDraftBrief.progress_summary
    || preDraftBrief.progressSummary
    || contextPackage?.progress_summary
    || contextPackage?.progressSummary
    || contextPackage?.story_state?.progress_summary
    || contextPackage?.storyState?.progressSummary
    || project?.reference_config?.story_state?.progress_summary
    || project?.reference_config?.storyState?.progressSummary
    || project?.story_state?.progress_summary
    || project?.storyState?.progressSummary,
  )
  const dailyContextSnapshot = normalizeDailyContextSnapshot(
    contextPackage?.chapter_target?.daily_context_snapshot
    || contextPackage?.chapter_target?.dailyContextSnapshot
    || preDraftBrief.daily_context_snapshot
    || preDraftBrief.dailyContextSnapshot
    || contextPackage?.daily_context_snapshot
    || contextPackage?.dailyContextSnapshot
    || contextPackage?.story_state?.daily_context_snapshot
    || contextPackage?.story_state?.dailyContextSnapshot
    || contextPackage?.storyState?.dailyContextSnapshot
    || project?.reference_config?.story_state?.daily_context_snapshot
    || project?.reference_config?.story_state?.dailyContextSnapshot
    || project?.reference_config?.storyState?.dailyContextSnapshot
    || project?.story_state?.daily_context_snapshot
    || project?.story_state?.dailyContextSnapshot
    || project?.storyState?.dailyContextSnapshot,
  )
  const foreshadowingConsistencyRadar = normalizeForeshadowingConsistencyRadar(
    contextPackage?.chapter_target?.foreshadowing_consistency_radar
    || contextPackage?.chapter_target?.foreshadowingConsistencyRadar
    || preDraftBrief.foreshadowing_consistency_radar
    || preDraftBrief.foreshadowingConsistencyRadar
    || contextPackage?.foreshadowing_consistency_radar
    || contextPackage?.foreshadowingConsistencyRadar
    || contextPackage?.story_state?.foreshadowing_consistency_radar
    || contextPackage?.story_state?.foreshadowingConsistencyRadar
    || contextPackage?.storyState?.foreshadowingConsistencyRadar
    || project?.reference_config?.story_state?.foreshadowing_consistency_radar
    || project?.reference_config?.story_state?.foreshadowingConsistencyRadar
    || project?.reference_config?.storyState?.foreshadowingConsistencyRadar
    || project?.story_state?.foreshadowing_consistency_radar
    || project?.story_state?.foreshadowingConsistencyRadar
    || project?.storyState?.foreshadowingConsistencyRadar
    || {
      foreshadowing_status: contextPackage?.story_state?.foreshadowing_status
        || contextPackage?.story_state?.foreshadowingStatus
        || contextPackage?.storyState?.foreshadowingStatus
        || project?.reference_config?.story_state?.foreshadowing_status
        || project?.reference_config?.story_state?.foreshadowingStatus
        || project?.reference_config?.storyState?.foreshadowingStatus
        || project?.story_state?.foreshadowing_status
        || project?.story_state?.foreshadowingStatus
        || project?.storyState?.foreshadowingStatus,
      payoff_queue: contextPackage?.story_state?.payoff_queue
        || contextPackage?.story_state?.payoffQueue
        || contextPackage?.storyState?.payoffQueue
        || project?.reference_config?.story_state?.payoff_queue
        || project?.reference_config?.story_state?.payoffQueue
        || project?.reference_config?.storyState?.payoffQueue
        || project?.story_state?.payoff_queue
        || project?.story_state?.payoffQueue
        || project?.storyState?.payoffQueue,
    },
    Number(chapterDraft?.chapter_no || contextPackage?.chapter_target?.chapter_no || 0),
  )
  const millionWordRunway = millionWordRunwayFromContext(contextPackage, preDraftBrief)
  return {
    batchPreflight,
    batchDeliveryRiskCarryOver,
    batchCreationContractCarryOver,
    batchChapterHandoffContract,
    longformMemoryAnchor,
    longformMemoryCapsule,
    layeredMemoryContext,
    progressSummary,
    dailyContextSnapshot,
    foreshadowingConsistencyRadar,
    millionWordRunway,
  }
}
