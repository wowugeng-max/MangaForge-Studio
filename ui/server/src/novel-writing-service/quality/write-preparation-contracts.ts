import { asArray } from '../../routes/novel-route-utils'
import { buildRollingRhythmPreflight, normalizeRecentFatigueBrief } from '../../novel-writing/rolling-rhythm-preflight'
import {
  buildCreationContractChecklist,
  buildWritePreparationBriefFromParts,
  normalizeWritePreparationBenchmarkRecallContext,
} from '../../novel-writing/write-preparation-brief'
import { normalizeStateSourceReadiness } from '../../novel-writing/state-tracking-basics'
import { normalizeDeliveryRiskCarryOverContext } from '../post-delivery/delivery-risk-core'
import {
  benchmarkRecallExplicitBrief,
  buildBenchmarkRecallBrief,
} from './intent-benchmark-contracts'
import { reconcileSerialStoryStateSourceRows } from './state-tracking-contracts'
import { compactBriefText } from './text-utils'

export function buildWritePreparationBenchmarkRecallContext(contextPackage: any = {}, options: any = {}) {
  const benchmarkRecallBrief = options.benchmark_recall_brief
    || options.benchmarkRecallBrief
    || benchmarkRecallExplicitBrief(contextPackage)
    || buildBenchmarkRecallBrief(contextPackage, options)
  return normalizeWritePreparationBenchmarkRecallContext(benchmarkRecallBrief, options)
}

export function buildWritePreparationBrief(contextPackage: any = {}, options: any = {}) {
  const stateTrackingContract = options.state_tracking_contract
    || contextPackage?.chapter_target?.state_tracking_contract
    || contextPackage?.state_tracking_contract
    || contextPackage?.pre_draft_brief?.state_tracking_contract
    || {}
  const assetLinkageContract = options.asset_linkage_contract
    || contextPackage?.chapter_target?.asset_linkage_contract
    || contextPackage?.asset_linkage_contract
    || contextPackage?.pre_draft_brief?.asset_linkage_contract
    || {}
  const chapterBlueprint = options.chapter_blueprint
    || contextPackage?.chapter_target?.chapter_blueprint
    || contextPackage?.chapter_blueprint
    || contextPackage?.pre_draft_brief?.chapter_blueprint
    || {}
  const readerRetentionBrief = options.reader_retention_brief
    || contextPackage?.chapter_target?.reader_retention_brief
    || contextPackage?.reader_retention_brief
    || contextPackage?.pre_draft_brief?.reader_retention_brief
    || {}
  const creationContractChecklist = buildCreationContractChecklist(options)
  const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverContext(
    options.delivery_risk_carry_over
      || contextPackage?.chapter_target?.delivery_risk_carry_over
      || contextPackage?.delivery_risk_carry_over
      || contextPackage?.pre_draft_brief?.delivery_risk_carry_over,
  )
  const recentFatigueSource = options.recent_fatigue_brief
    || options.recentFatigueBrief
    || contextPackage?.chapter_target?.recent_fatigue_brief
    || contextPackage?.chapter_target?.recentFatigueBrief
    || contextPackage?.chapter_target?.recent_fatigue_radar
    || contextPackage?.chapter_target?.recentFatigueRadar
    || contextPackage?.pre_draft_brief?.recent_fatigue_brief
    || contextPackage?.preDraftBrief?.recentFatigueBrief
    || contextPackage?.recent_fatigue_brief
    || contextPackage?.recentFatigueBrief
    || contextPackage?.recent_fatigue_radar
    || contextPackage?.recentFatigueRadar
  const recentFatigueBrief = recentFatigueSource ? normalizeRecentFatigueBrief(recentFatigueSource) : null
  const rollingRhythmPreflight = buildRollingRhythmPreflight(contextPackage, {
    recent_fatigue_brief: recentFatigueBrief,
    batch_preflight: options.batch_preflight || options.batchPreflight || contextPackage?.chapter_target?.batch_preflight || contextPackage?.batch_preflight,
    reader_expectation_debt_context: options.reader_expectation_debt_context || options.readerExpectationDebtContext || contextPackage?.chapter_target?.reader_expectation_debt_context || contextPackage?.reader_expectation_debt_context,
  })
  const benchmarkRecallPreparation = buildWritePreparationBenchmarkRecallContext(contextPackage, options)
  // Drop stale serial_story_state rows once live story_state has caught up, so write-prep
  // readiness does not hard-block on a cached "状态机只更新到第N章" snapshot.
  const sourceRows = reconcileSerialStoryStateSourceRows(
    normalizeStateSourceReadiness(stateTrackingContract?.source_readiness || stateTrackingContract?.sourceReadiness),
    contextPackage,
  )
  return buildWritePreparationBriefFromParts({
    state_source_rows: sourceRows,
    benchmark_recall_preparation: benchmarkRecallPreparation,
    asset_linkage_contract: assetLinkageContract,
    delivery_risk_carry_over: deliveryRiskCarryOver,
    chapter_blueprint: chapterBlueprint,
    reader_retention_brief: readerRetentionBrief,
    rolling_rhythm_preflight: rollingRhythmPreflight,
    creation_contract_checklist: creationContractChecklist,
  })
}
