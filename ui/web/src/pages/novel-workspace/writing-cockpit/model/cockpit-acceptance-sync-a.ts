import type {
  AnyRecord,
  WritingCockpitRole,
  WritingCockpitActionKey,
  WritingReadinessStatus,
  WritingReadinessCheck,
  WritingCockpitChapter,
  WritingQueueItemStatus,
  WritingQueueItem,
  WritingQueueModel,
  ChapterPlanningReadiness,
  ChapterContextPackageStatus,
  ChapterScenePlanStatus,
  ChapterPlanningDeskSceneCard,
  ChapterQualityContinuitySceneMapItem,
  ChapterWritePreparationBrief,
  ChapterPlanningDeskModel,
  ChapterAcceptanceStatus,
  DeslopGateDiagnosticsModel,
  ChapterAcceptanceDeskModel,
  ChapterHandoffStatus,
  ChapterHandoffDeskModel,
  LongformWorkflowStageKey,
  LongformWorkflowStageStatus,
  LongformWorkflowStageModel,
  LongformWorkflowModel,
  WritingCockpitModel,
  BuildWritingCockpitModelInput,
} from './types'
import { parseWorkspacePayload } from '../../payloadParseCache'


import {
  ACTION_LABELS,
  QUALITY_PASS_THRESHOLD,
  arrayValue,
  buildApprovalBlockerSummary,
  buildBlueprintReceiptSummary,
  buildDeliveryRiskReceiptSummary,
  buildDeslopGateDiagnosticsSummary,
  buildPlatformRubricSummary,
  buildQualityAuditSummary,
  buildRevisionReceiptSummary,
  buildSceneCardReceiptSummary,
  compareReviewRefs,
  countArray,
  createdTime,
  deliveryReceiptsFrom,
  firstNonEmpty,
  hasProse,
  issueText,
  latestReviewRef,
  parsedTime,
  proseQualityReviewMatchesCurrentChapter,
  qualityPayload,
  reportPayload,
  reviewPayload,
  reviewType,
  revisionPayload,
  storylineSyncPayload,
  stringArray,
  text,
  uniqueObjects,
  uniqueStrings,
} from './cockpit-basics'

export function buildStorylineSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['storylineSync'] {
  if (!review) return null
  const payload = storylineSyncPayload(review)
  const completedCount = countArray(payload?.completed)
  const missedCount = countArray(payload?.missed)
  const unplannedCount = countArray(payload?.unplanned)
  const forbiddenCount = countArray(payload?.forbidden_touched)
  const hasRisk = missedCount > 0 || unplannedCount > 0 || forbiddenCount > 0 || payload?.status === 'warn'
  const riskParts = [
    missedCount > 0 ? `漏推 ${missedCount}` : '',
    unplannedCount > 0 ? `额外推进 ${unplannedCount}` : '',
    forbiddenCount > 0 ? `禁揭风险 ${forbiddenCount}` : '',
  ].filter(Boolean)

  return {
    status: hasRisk ? 'warn' : 'ok',
    label: hasRisk ? (riskParts.join(' · ') || '剧情线需复盘') : '剧情线 OK',
    completedCount,
    missedCount,
    unplannedCount,
    forbiddenCount,
  }
}

export function storyUnitSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.story_unit_sync || payload?.result?.story_unit_sync || payload?.result || payload
}

export function buildStoryUnitSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['storyUnitSync'] {
  if (!review) return null
  const payload = storyUnitSyncPayload(review)
  const missedCount = Number(payload?.missed_count ?? countArray(payload?.missed))
  const rushedCount = Number(payload?.rushed_count ?? countArray(payload?.rushed_ahead))
  const forbiddenCount = Number(payload?.forbidden_count ?? countArray(payload?.forbidden_touched))
  const safeMissedCount = Number.isFinite(missedCount) ? missedCount : 0
  const safeRushedCount = Number.isFinite(rushedCount) ? rushedCount : 0
  const safeForbiddenCount = Number.isFinite(forbiddenCount) ? forbiddenCount : 0
  const riskCount = safeMissedCount + safeRushedCount + safeForbiddenCount
  const scoreValue = Number(payload?.score)
  const score = Number.isFinite(scoreValue) ? scoreValue : null
  const hasRisk = riskCount > 0 || payload?.status === 'warn' || review?.status === 'warn'
  const riskParts = [
    safeMissedCount > 0 ? `单元漏写 ${safeMissedCount}` : '',
    safeRushedCount > 0 ? `单元抢跑 ${safeRushedCount}` : '',
    safeForbiddenCount > 0 ? `禁抢跑 ${safeForbiddenCount}` : '',
  ].filter(Boolean)

  return {
    status: hasRisk ? 'warn' : 'ok',
    label: hasRisk ? (riskParts.join(' · ') || text(payload?.label) || '剧情单元需复盘') : '剧情单元 OK',
    score,
    scoreLabel: score === null ? '单元兑现 -' : `单元兑现 ${score}`,
    missedCount: safeMissedCount,
    rushedCount: safeRushedCount,
    forbiddenCount: safeForbiddenCount,
    riskCount,
  }
}

export function assetIntakePayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.asset_intake || payload?.result?.asset_intake || payload?.result || payload
}

export function buildAssetIntakeSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['assetIntake'] {
  if (!review) return null
  const payload = assetIntakePayload(review)
  const discoveredAssets = Array.isArray(payload?.discovered_assets) ? payload.discovered_assets : []
  const appliedNames = new Set(
    Array.isArray(payload?.applied_asset_names)
      ? payload.applied_asset_names.map((item: any) => String(item || '').trim()).filter(Boolean)
      : [],
  )
  const pendingCount = discoveredAssets.filter((item: any) => !appliedNames.has(String(item?.name || '').trim())).length
  if (pendingCount <= 0) return {
    status: 'applied',
    label: '新资产已确认',
    pendingCount: 0,
  }
  return {
    status: 'pending',
    label: `新资产 ${pendingCount} 待确认`,
    pendingCount,
  }
}

export function ipSceneIntakePayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.ip_scene_intake || payload?.result?.ip_scene_intake || payload?.result || payload
}

export function buildIpSceneIntakeSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['ipSceneIntake'] {
  if (!review) return null
  const payload = ipSceneIntakePayload(review)
  const candidates = Array.isArray(payload?.ip_scene_candidates) ? payload.ip_scene_candidates : []
  const candidateCount = candidates.length
  if (candidateCount <= 0) return null
  return {
    status: 'ready',
    label: `IP场面 ${candidateCount}`,
    candidateCount,
    candidates: candidates.slice(0, 5).map((item: AnyRecord) => ({
      title: text(item?.title || item?.name, '未命名强场面'),
      summary: text(item?.summary || item?.description),
      visualHook: text(item?.visual_hook || item?.visualHook || item?.visual),
      adaptationValue: text(item?.adaptation_value || item?.adaptationValue || item?.ip_value),
      spreadPoint: text(item?.spread_point || item?.spreadPoint || item?.comment_point),
    })),
  }
}

export function signatureSceneSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.signature_scene_sync || payload?.result?.signature_scene_sync || payload?.result || payload
}

export function buildSignatureSceneSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['signatureSceneSync'] {
  if (!review) return null
  const payload = signatureSceneSyncPayload(review)
  const plannedCountValue = Number(payload?.planned_count ?? payload?.plannedCount)
  const plannedCount = Number.isFinite(plannedCountValue) ? plannedCountValue : countArray(payload?.planned)
  if (plannedCount <= 0) return null
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const missedCountValue = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(missedCountValue) ? missedCountValue : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '强场面 OK' : text(payload?.label) || `强场面漏写 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '强场面兑现 -' : `强场面兑现 ${safeScore}`,
    missedCount,
    plannedCount,
  }
}

export function readabilityPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.readability_review || payload?.result?.readability_review || payload?.result || payload
}

export function buildReadabilityReviewSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['readabilityReview'] {
  if (!review) return null
  const payload = readabilityPayload(review)
  const scoreValue = payload?.readability_score ?? payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const openingScoreValue = payload?.opening_hook_score ?? payload?.openingHookScore
  const openingScore = openingScoreValue === null || openingScoreValue === undefined || openingScoreValue === '' ? null : Number(openingScoreValue)
  const safeOpeningScore = Number.isFinite(openingScore) ? openingScore : null
  const openingHookRisk = safeOpeningScore !== null && safeOpeningScore > 0 && safeOpeningScore < 70
  const endingScoreValue = payload?.ending_hook_score ?? payload?.endingHookScore
  const endingScore = endingScoreValue === null || endingScoreValue === undefined || endingScoreValue === '' ? null : Number(endingScoreValue)
  const safeEndingScore = Number.isFinite(endingScore) ? endingScore : null
  const endingHookRisk = safeEndingScore !== null && safeEndingScore > 0 && safeEndingScore < 70
  const sceneScoreValue = payload?.scene_readability_score ?? payload?.sceneReadabilityScore
  const sceneScore = sceneScoreValue === null || sceneScoreValue === undefined || sceneScoreValue === '' ? null : Number(sceneScoreValue)
  const safeSceneScore = Number.isFinite(sceneScore) ? sceneScore : null
  const sceneReadabilityRisk = safeSceneScore !== null && safeSceneScore > 0 && safeSceneScore < 70
  const payoffScoreValue = payload?.payoff_density_score ?? payload?.payoffDensityScore
  const payoffScore = payoffScoreValue === null || payoffScoreValue === undefined || payoffScoreValue === '' ? null : Number(payoffScoreValue)
  const safePayoffScore = Number.isFinite(payoffScore) ? payoffScore : null
  const payoffDensityRisk = safePayoffScore !== null && safePayoffScore > 0 && safePayoffScore < 70
  const memeSense = payload?.meme_sense || {}
  const aiSmell = payload?.ai_smell || payload?.aiSmell || {}
  const aiSmellLevel = firstNonEmpty(aiSmell?.level, payload?.ai_smell_level, payload?.aiSmellLevel)
  const aiSmellHitCount = arrayValue(aiSmell?.pattern_hits || aiSmell?.patternHits).length
  const aiSmellTactics = arrayValue(aiSmell?.rewrite_tactics || aiSmell?.rewriteTactics)
    .map(item => text(item))
    .filter(Boolean)
  const aiSmellRisk = Boolean(aiSmellLevel && !['无', 'none', '低', 'clean'].includes(aiSmellLevel.toLowerCase?.() || aiSmellLevel)) || aiSmellHitCount > 0
  const aiSmellLabel = aiSmellRisk ? `AI味${aiSmellLevel || '待降'} ${aiSmellHitCount}` : 'AI味 0'
  const immersionRiskCount = Array.isArray(memeSense?.immersion_risks)
    ? memeSense.immersion_risks.length
    : countArray(payload?.immersion_risks)
  const riskCount = immersionRiskCount
    + (openingHookRisk ? 1 : 0)
    + (endingHookRisk ? 1 : 0)
    + (sceneReadabilityRisk ? 1 : 0)
    + (payoffDensityRisk ? 1 : 0)
    + (aiSmellRisk ? Math.max(1, aiSmellHitCount) : 0)
  const intensity = firstNonEmpty(memeSense?.intensity, payload?.meme_intensity, '')

  return {
    score: safeScore,
    scoreLabel: safeScore === null ? '可读性 -' : `可读性 ${safeScore}`,
    openingHookScore: safeOpeningScore,
    openingHookLabel: safeOpeningScore === null ? '开篇吸引力 -' : `开篇吸引力 ${safeOpeningScore}`,
    openingHookRisk,
    endingHookScore: safeEndingScore,
    endingHookLabel: safeEndingScore === null ? '章末翻页 -' : `章末翻页 ${safeEndingScore}`,
    endingHookRisk,
    sceneReadabilityScore: safeSceneScore,
    sceneReadabilityLabel: safeSceneScore === null ? '场景推进 -' : `场景推进 ${safeSceneScore}`,
    sceneReadabilityRisk,
    payoffDensityScore: safePayoffScore,
    payoffDensityLabel: safePayoffScore === null ? '爽点密度 -' : `爽点密度 ${safePayoffScore}`,
    payoffDensityRisk,
    aiSmellLabel,
    aiSmellRisk,
    aiSmellHitCount,
    aiSmellTactics,
    memeLabel: intensity ? `网感${intensity}` : '网感未评',
    riskLabel: openingHookRisk
      ? `开篇吸引力弱 ${safeOpeningScore}`
      : endingHookRisk
        ? `章末翻页弱 ${safeEndingScore}`
        : sceneReadabilityRisk
          ? `场景推进弱 ${safeSceneScore}`
          : payoffDensityRisk
            ? `爽点密度弱 ${safePayoffScore}`
            : aiSmellRisk
              ? aiSmellLabel
        : immersionRiskCount > 0 ? `出戏风险 ${immersionRiskCount}` : '出戏风险 0',
    riskCount,
  }
}

export function coreDriftPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.core_drift || payload?.result?.core_drift || payload?.result || payload
}

export function buildCoreDriftSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['coreDrift'] {
  if (!review) return null
  const payload = coreDriftPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const riskCount = Array.isArray(payload?.drift_risks)
    ? payload.drift_risks.length
    : countArray(payload?.risks)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && riskCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '核心 OK' : `核心偏移 ${riskCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '核心守恒 -' : `核心守恒 ${safeScore}`,
    riskCount,
  }
}

export function runwaySyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.runway_sync || payload?.result?.runway_sync || payload?.result || payload
}

export function buildRunwaySyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['runwaySync'] {
  if (!review) return null
  const payload = runwaySyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadRiskCount = Number(payload?.risk_count ?? payload?.riskCount)
  const riskCount = Number.isFinite(payloadRiskCount)
    ? payloadRiskCount
    : countArray(payload?.four_question_missed) + countArray(payload?.reader_fuel_missed) + countArray(payload?.redline_touched)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && riskCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '航线 OK' : text(payload?.label) || `航线风险 ${riskCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '航线兑现 -' : `航线兑现 ${safeScore}`,
    riskCount,
  }
}

export function readerPayoffSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.reader_payoff_sync || payload?.result?.reader_payoff_sync || payload?.result || payload
}

export function buildReaderPayoffSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['readerPayoffSync'] {
  if (!review) return null
  const payload = readerPayoffSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadDebtCount = Number(payload?.debt_count ?? payload?.debtCount)
  const debtCount = Number.isFinite(payloadDebtCount) ? payloadDebtCount : countArray(payload?.missed) + countArray(payload?.debts)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && debtCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '回报 OK' : text(payload?.label) || `回报欠账 ${debtCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '回报兑现 -' : `回报兑现 ${safeScore}`,
    debtCount,
  }
}

export function readerExpectationSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.reader_expectation_sync || payload?.result?.reader_expectation_sync || payload?.result || payload
}

export function isOpeningHandoffMiss(value: any) {
  const searchable = [
    value?.key,
    value?.type,
    value?.label,
    value?.name,
    value?.category,
    value?.match_scope,
    value?.scope,
  ].map(item => text(item).toLowerCase()).join(' ')
  return searchable.includes('opening_handoff')
    || searchable.includes('previous_handoff')
    || searchable.includes('上一章承接')
    || (searchable.includes('handoff') && searchable.includes('opening'))
}

export function buildReaderExpectationSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['readerExpectationSync'] {
  if (!review) return null
  const payload = readerExpectationSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const openingHandoffMissedCount = arrayValue(payload?.missed).filter(isOpeningHandoffMiss).length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok'
      ? '期待 OK'
      : openingHandoffMissedCount > 0
        ? `开篇承接漏写 ${openingHandoffMissedCount}`
        : text(payload?.label) || `期待欠账 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '期待兑现 -' : `期待兑现 ${safeScore}`,
    missedCount,
    openingHandoffMissedCount,
  }
}

export function qualityAuditSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.quality_audit_sync || payload?.result?.quality_audit_sync || payload?.result || payload
}

export function qualityAuditSyncEvidence(value: any) {
  const label = text(value?.label || value?.name || value?.key)
  const detail = firstNonEmpty(value?.text, value?.evidence, value?.message, value?.summary, value?.detail)
  if (label && detail) return `${label}：${detail}`
  return firstNonEmpty(
    detail,
    label,
  )
}

export function buildQualityAuditSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['qualityAuditSync'] {
  if (!review) return null
  const payload = qualityAuditSyncPayload(review)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missed = arrayValue(payload?.missed || payload?.gaps || payload?.issues)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : missed.length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'
  const evidence = [
    text(payload?.summary),
    ...missed.map(qualityAuditSyncEvidence),
  ].filter(Boolean).slice(0, 5)
  const nextActions = arrayValue(payload?.next_actions || payload?.nextActions || payload?.required_actions || payload?.requiredActions)
    .map(item => text(item))
    .filter(Boolean)
    .slice(0, 4)

  return {
    status,
    label: status === 'ok' ? '诊断承接 OK' : text(payload?.label) || `诊断承接缺口 ${missedCount}`,
    missedCount,
    evidence,
    nextActions,
  }
}

export function chapterHandoffSyncPayload(review: AnyRecord | null | undefined, snakeKey: string, camelKey: string) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.[snakeKey]
    || payload?.[camelKey]
    || payload?.result?.[snakeKey]
    || payload?.result?.[camelKey]
    || payload?.result
    || payload
}

export function buildChapterHandoffSyncSummary(
  review: AnyRecord | null | undefined,
  snakeKey: string,
  camelKey: string,
  okLabel: string,
  fallbackPrefix: string,
): ChapterAcceptanceDeskModel['chapterHandoffSync'] {
  if (!review) return null
  const payload = chapterHandoffSyncPayload(review, snakeKey, camelKey)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missed = arrayValue(payload?.missed || payload?.gaps || payload?.issues)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : missed.length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'
  const evidence = [
    text(payload?.summary),
    ...missed.map(qualityAuditSyncEvidence),
  ].filter(Boolean).slice(0, 5)
  const nextActions = arrayValue(payload?.next_actions || payload?.nextActions || payload?.required_actions || payload?.requiredActions)
    .map(item => text(item))
    .filter(Boolean)
    .slice(0, 4)

  return {
    status,
    label: status === 'ok' ? okLabel : text(payload?.label) || `${fallbackPrefix} ${missedCount}`,
    missedCount,
    evidence,
    nextActions,
  }
}

export function qualityAuditRepairReceiptSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.quality_audit_repair_receipt_sync
    || payload?.qualityAuditRepairReceiptSync
    || payload?.result?.quality_audit_repair_receipt_sync
    || payload?.result?.qualityAuditRepairReceiptSync
    || payload?.result
    || payload
}

export function buildQualityAuditRepairReceiptSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['qualityAuditRepairReceiptSync'] {
  if (!review) return null
  const payload = qualityAuditRepairReceiptSyncPayload(review)
  const missed = arrayValue(payload?.missed || payload?.gaps || payload?.issues)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : missed.length
  const payloadReceiptCount = Number(payload?.receipt_count ?? payload?.receiptCount)
  const receiptCount = Number.isFinite(payloadReceiptCount) ? payloadReceiptCount : countArray(payload?.completed) + missed.length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'
  const evidence = [
    text(payload?.summary),
    ...missed.map(qualityAuditSyncEvidence),
  ].filter(Boolean).slice(0, 5)
  const nextActions = arrayValue(payload?.next_actions || payload?.nextActions || payload?.required_actions || payload?.requiredActions)
    .map(item => text(item))
    .filter(Boolean)
    .slice(0, 4)

  return {
    status,
    label: status === 'ok' ? '质量修复回执 OK' : text(payload?.label) || `质量诊断修复回执缺口 ${missedCount}`,
    missedCount,
    receiptCount,
    evidence,
    nextActions,
  }
}

export function contractSyncPayload(review: AnyRecord | null | undefined, snakeKey: string, camelKey: string) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.[snakeKey]
    || payload?.[camelKey]
    || payload?.result?.[snakeKey]
    || payload?.result?.[camelKey]
    || payload?.result
    || payload
}

export function preDraftExecutionReceiptSections(payload?: AnyRecord | null) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const receiptSources = uniqueObjects([
    deliveryReceiptsFrom(review),
    deliveryReceiptsFrom(selfCheck),
    deliveryReceiptsFrom(payload),
  ])
  return uniqueObjects([
    review?.pre_draft_execution_receipts || review?.preDraftExecutionReceipts,
    selfCheck?.pre_draft_execution_receipts || selfCheck?.preDraftExecutionReceipts,
    payload?.pre_draft_execution_receipts || payload?.preDraftExecutionReceipts,
    ...receiptSources.map(source => source?.pre_draft_execution_receipts || source?.preDraftExecutionReceipts),
  ])
}

export function preDraftExecutionCheckNeedsRepair(value: any) {
  const status = text(value?.status).toLowerCase()
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'no', '0'].includes(status)) return true
  if (value?.delivered === false) return true
  return Boolean(firstNonEmpty(value?.remaining_risk, value?.remainingRisk))
}

export function buildPreDraftExecutionSyncSummary(
  payload: AnyRecord | null,
  snakeKey: string,
  camelKey: string,
  label: string,
): ChapterAcceptanceDeskModel['intentConfirmationSync'] {
  const sections = preDraftExecutionReceiptSections(payload)
  const checks = sections.flatMap(section => arrayValue(section?.[snakeKey] || section?.[camelKey]))
  const missed = checks.filter(preDraftExecutionCheckNeedsRepair)
  if (checks.length <= 0 && missed.length <= 0) return null
  const missedCount = missed.length
  const evidence = missed
    .map(item => firstNonEmpty(item?.remaining_risk, item?.remainingRisk, item?.evidence, item?.issue, item?.reason, item?.description, item?.label, item?.key))
    .filter(Boolean)
    .slice(0, 5)
  const nextActions = missed
    .map(item => firstNonEmpty(item?.fix, item?.repair_instruction, item?.repairInstruction, item?.suggestion, item?.remaining_risk, item?.remainingRisk))
    .filter(Boolean)
    .slice(0, 4)
  return {
    status: missedCount > 0 ? 'warn' : 'ok',
    label: missedCount > 0 ? `${label}缺口 ${missedCount}` : `${label} OK`,
    missedCount,
    evidence,
    nextActions,
  }
}

export function mergeContractSyncSummary(
  explicitSummary: ChapterAcceptanceDeskModel['intentConfirmationSync'],
  receiptSummary: ChapterAcceptanceDeskModel['intentConfirmationSync'],
  label: string,
) {
  if (!explicitSummary) return receiptSummary
  if (!receiptSummary) return explicitSummary
  const missedCount = explicitSummary.missedCount + receiptSummary.missedCount
  return {
    status: missedCount > 0 ? 'warn' as const : 'ok' as const,
    label: missedCount > 0 ? `${label}缺口 ${missedCount}` : `${label} OK`,
    missedCount,
    evidence: uniqueStrings([...explicitSummary.evidence, ...receiptSummary.evidence]).slice(0, 5),
    nextActions: uniqueStrings([...explicitSummary.nextActions, ...receiptSummary.nextActions]).slice(0, 4),
  }
}

export function qualityCheckNeedsRepair(value: any) {
  if (typeof value === 'string') return true
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  if (['pass', 'passed', 'ok', 'done', 'true', 'yes'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error', 'false', 'no', '0'].includes(status)) return true
  if (value?.ready === false || value?.passed === false || value?.delivered === false || value?.ok === false) return true
  if (value?.ready === true || value?.passed === true || value?.delivered === true || value?.ok === true) return false
  return Boolean(firstNonEmpty(value?.remaining_risk, value?.remainingRisk, value?.fix, value?.evidence))
}

export function buildQualityCheckSummary(
  payload: AnyRecord | null,
  snakeKey: string,
  camelKey: string,
  label: string,
): ChapterAcceptanceDeskModel['sourceReadiness'] {
  if (!payload) return null
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || payload?.review || {}
  const checks = [
    ...arrayValue(review?.[snakeKey] || review?.[camelKey]),
    ...arrayValue(selfCheck?.[snakeKey] || selfCheck?.[camelKey]),
    ...arrayValue(payload?.[snakeKey] || payload?.[camelKey]),
  ]
  if (checks.length <= 0) return null

  const missed = checks.filter(qualityCheckNeedsRepair)
  const missedCount = missed.length
  return {
    status: missedCount > 0 ? 'warn' : 'ok',
    label: missedCount > 0 ? `${label}缺口 ${missedCount}` : `${label} OK`,
    missedCount,
    evidence: missed
      .map(item => firstNonEmpty(item?.evidence, item?.message, item?.summary, item?.text, item?.remaining_risk, item?.remainingRisk, item?.label, item?.key))
      .filter(Boolean)
      .slice(0, 5),
    nextActions: missed
      .map(item => firstNonEmpty(item?.fix, item?.action, item?.required_action, item?.requiredAction, item?.suggestion, item?.remaining_risk, item?.remainingRisk))
      .filter(Boolean)
      .slice(0, 4),
  }
}

export function sceneCardDirectiveCheckText(value: any) {
  if (typeof value === 'string') return text(value)
  return [
    value?.key,
    value?.label,
    value?.type,
    value?.status,
    value?.evidence,
    value?.fix,
    value?.message,
    value?.summary,
    value?.text,
    value?.remaining_risk,
    value?.remainingRisk,
    value?.required_action,
    value?.requiredAction,
  ].map(item => text(item)).filter(Boolean).join(' ')
}

export function sceneCardDirectiveCheckMatches(value: any) {
  const valueText = sceneCardDirectiveCheckText(value)
  return /scene[_\s-]*card[_\s-]*\d+[_\s-]*(execution[_\s-]*directives|forbidden[_\s-]*directives)/i.test(valueText)
    || /场景卡(执行|禁令)/.test(valueText)
}

export function buildSceneCardDirectiveSummary(payload: AnyRecord | null): ChapterAcceptanceDeskModel['proseCraft'] {
  if (!payload) return null
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || payload?.review || {}
  const checks = [
    ...arrayValue(review?.prose_craft_checks || review?.proseCraftChecks),
    ...arrayValue(selfCheck?.prose_craft_checks || selfCheck?.proseCraftChecks),
    ...arrayValue(payload?.prose_craft_checks || payload?.proseCraftChecks),
    ...arrayValue(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...arrayValue(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...arrayValue(payload?.quality_audit_checks || payload?.qualityAuditChecks),
  ].filter(sceneCardDirectiveCheckMatches)

  const missed = checks.filter(qualityCheckNeedsRepair)
  const missedCount = missed.length
  if (missedCount <= 0) return null

  return {
    status: 'warn',
    label: `场景卡执行缺口 ${missedCount}`,
    missedCount,
    evidence: missed
      .map(item => firstNonEmpty(item?.evidence, item?.message, item?.summary, item?.text, item?.remaining_risk, item?.remainingRisk, sceneCardDirectiveCheckText(item)))
      .filter(Boolean)
      .slice(0, 5),
    nextActions: missed
      .map(item => firstNonEmpty(item?.fix, item?.action, item?.required_action, item?.requiredAction, item?.suggestion, item?.remaining_risk, item?.remainingRisk))
      .filter(Boolean)
      .slice(0, 4),
  }
}

