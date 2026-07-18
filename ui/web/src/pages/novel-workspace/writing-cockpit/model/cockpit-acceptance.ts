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

export function buildIntentConfirmationSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['intentConfirmationSync'] {
  if (!review) return null
  const payload = contractSyncPayload(review, 'intent_confirmation_sync', 'intentConfirmationSync')
  const missed = arrayValue(payload?.missed || payload?.gaps || payload?.issues)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
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
    label: status === 'ok' ? '意图确认 OK' : text(payload?.label) || `意图确认缺口 ${missedCount}`,
    missedCount,
    evidence,
    nextActions,
  }
}

export function buildBenchmarkRecallSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['benchmarkRecallSync'] {
  if (!review) return null
  const payload = contractSyncPayload(review, 'benchmark_recall_sync', 'benchmarkRecallSync')
  const missed = arrayValue(payload?.missed || payload?.gaps || payload?.issues)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
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
    label: status === 'ok' ? '文风召回 OK' : text(payload?.label) || `文风召回缺口 ${missedCount}`,
    missedCount,
    evidence,
    nextActions,
  }
}

export function readerRetentionSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.reader_retention_sync || payload?.result?.reader_retention_sync || payload?.result || payload
}

export function buildReaderRetentionSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['readerRetentionSync'] {
  if (!review) return null
  const payload = readerRetentionSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '追读 OK' : text(payload?.label) || `漏追读 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '追读兑现 -' : `追读兑现 ${safeScore}`,
    missedCount,
  }
}

export function chapterAttractionPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.chapter_attraction_review || payload?.result?.chapter_attraction_review || payload?.result || payload
}

export function buildChapterAttractionSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['chapterAttraction'] {
  if (!review) return null
  const payload = chapterAttractionPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadWeakCount = Number(payload?.weak_count ?? payload?.weakCount)
  const weakCount = Number.isFinite(payloadWeakCount)
    ? payloadWeakCount
    : countArray(payload?.weak_dimensions || payload?.weakDimensions || payload?.dimensions)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && weakCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '吸引力 OK' : text(payload?.label) || `吸引力缺口 ${weakCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '吸引力 -' : `吸引力 ${safeScore}`,
    weakCount,
    priorityLabel: text(payload?.priority_repair || payload?.priorityRepair, status === 'ok' ? '吸引力稳定' : '优先修吸引力'),
  }
}

export function storyDriveSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.story_drive_sync || payload?.result?.story_drive_sync || payload?.result || payload
}

export function buildStoryDriveSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['storyDriveSync'] {
  if (!review) return null
  const payload = storyDriveSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '故事力 OK' : text(payload?.label) || `故事力缺口 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '故事力 -' : `故事力 ${safeScore}`,
    missedCount,
    priorityLabel: text(payload?.priority_repair || payload?.priorityRepair, status === 'ok' ? '故事力稳定' : '优先补故事力'),
  }
}

export function characterArcSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.character_arc_sync || payload?.result?.character_arc_sync || payload?.result || payload
}

export function buildCharacterArcSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['characterArcSync'] {
  if (!review) return null
  const payload = characterArcSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '人物弧光 OK' : text(payload?.label) || `人物弧光缺口 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '人物弧光 -' : `人物弧光 ${safeScore}`,
    missedCount,
    priorityLabel: text(payload?.priority_repair || payload?.priorityRepair, status === 'ok' ? '人物弧光稳定' : '优先补人物弧光'),
  }
}

export function chapterBenchmarkSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.chapter_benchmark_sync || payload?.result?.chapter_benchmark_sync || payload?.result || payload
}

export function buildChapterBenchmarkSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['chapterBenchmarkSync'] {
  if (!review) return null
  const payload = chapterBenchmarkSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '基准 OK' : text(payload?.label) || `基准缺口 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '质量基准 -' : `质量基准 ${safeScore}`,
    missedCount,
  }
}

export function styleSampleSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.style_sample_sync || payload?.result?.style_sample_sync || payload?.result || payload
}

export function buildStyleSampleSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['styleSampleSync'] {
  if (!review) return null
  const payload = styleSampleSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const payloadCopyRiskCount = Number(payload?.copy_risk_count ?? payload?.copyRiskCount)
  const copyRiskCount = Number.isFinite(payloadCopyRiskCount) ? payloadCopyRiskCount : countArray(payload?.copied_phrases || payload?.copiedPhrases)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 && copyRiskCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '风格 OK' : text(payload?.label) || `风格缺口 ${missedCount + copyRiskCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '风格 -' : `风格 ${safeScore}`,
    missedCount,
    copyRiskCount,
  }
}

export function latestFirst30RetentionReview(reviews: AnyRecord[]) {
  const matches = reviews.filter(review => reviewType(review) === 'first30_retention_diagnosis')
  if (!matches.length) return null
  return matches.sort((a, b) => (createdTime(b) ?? 0) - (createdTime(a) ?? 0))[0]
}

export function buildFirst30RetentionRecheckSummary(chapter: AnyRecord | null, reviews: AnyRecord[]): ChapterAcceptanceDeskModel['first30RetentionRecheck'] {
  const chapterNo = Number(chapter?.chapter_no || 0)
  if (chapterNo < 1 || chapterNo > 30) return null
  const review = latestFirst30RetentionReview(reviews)
  if (!review) return null
  const reportTime = createdTime(review)
  const chapterTime = parsedTime(chapter?.updated_at || chapter?.modified_at)
  if (!reportTime || !chapterTime || chapterTime <= reportTime) return null
  return {
    status: 'stale',
    label: '留存需复诊',
    reason: `第${chapterNo}章已在前30章诊断后更新，建议重跑留存曲线。`,
  }
}

export function innovationSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.innovation_sync || payload?.result?.innovation_sync || payload?.result || payload
}

export function buildInnovationSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['innovationSync'] {
  if (!review) return null
  const payload = innovationSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '创新 OK' : text(payload?.label) || `创新缺口 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '创新兑现 -' : `创新兑现 ${safeScore}`,
    missedCount,
  }
}

export function volumeBeatSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.volume_beat_sync || payload?.result?.volume_beat_sync || payload?.result || payload
}

export function buildVolumeBeatSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['volumeBeatSync'] {
  if (!review) return null
  const payload = volumeBeatSyncPayload(review)
  const scoreValue = payload?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const missedCount = Number.isFinite(payloadMissedCount) ? payloadMissedCount : countArray(payload?.missed)
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '爆点 OK' : text(payload?.label) || `爆点漏兑现 ${missedCount}`,
    score: safeScore,
    scoreLabel: safeScore === null ? '爆点兑现 -' : `爆点兑现 ${safeScore}`,
    missedCount,
  }
}

export function buildDeliveryRiskQueue(args: {
  mustFix: string[]
  storylineSync: ChapterAcceptanceDeskModel['storylineSync']
  storyUnitSync: ChapterAcceptanceDeskModel['storyUnitSync']
  signatureSceneSync: ChapterAcceptanceDeskModel['signatureSceneSync']
  readabilityReview: ChapterAcceptanceDeskModel['readabilityReview']
  coreDrift: ChapterAcceptanceDeskModel['coreDrift']
  runwaySync: ChapterAcceptanceDeskModel['runwaySync']
  readerPayoffSync: ChapterAcceptanceDeskModel['readerPayoffSync']
  readerExpectationSync: ChapterAcceptanceDeskModel['readerExpectationSync']
  qualityAuditSync: ChapterAcceptanceDeskModel['qualityAuditSync']
  qualityAuditRepairReceiptSync: ChapterAcceptanceDeskModel['qualityAuditRepairReceiptSync']
  chapterHandoffSync: ChapterAcceptanceDeskModel['chapterHandoffSync']
  chapterHandoffDeltaSync: ChapterAcceptanceDeskModel['chapterHandoffDeltaSync']
  writePreparation: ChapterAcceptanceDeskModel['writePreparation']
  intentConfirmationSync: ChapterAcceptanceDeskModel['intentConfirmationSync']
  benchmarkRecallSync: ChapterAcceptanceDeskModel['benchmarkRecallSync']
  sourceReadiness: ChapterAcceptanceDeskModel['sourceReadiness']
  stateTracking: ChapterAcceptanceDeskModel['stateTracking']
  styleBoundary: ChapterAcceptanceDeskModel['styleBoundary']
  informationFlow: ChapterAcceptanceDeskModel['informationFlow']
  expectationThreshold: ChapterAcceptanceDeskModel['expectationThreshold']
  storyLoop: ChapterAcceptanceDeskModel['storyLoop']
  emotionalArc: ChapterAcceptanceDeskModel['emotionalArc']
  chapterHook: ChapterAcceptanceDeskModel['chapterHook']
  paragraphHook: ChapterAcceptanceDeskModel['paragraphHook']
  suspense: ChapterAcceptanceDeskModel['suspense']
  assetLinkage: ChapterAcceptanceDeskModel['assetLinkage']
  dialogue: ChapterAcceptanceDeskModel['dialogue']
  plotDynamics: ChapterAcceptanceDeskModel['plotDynamics']
  characterRelation: ChapterAcceptanceDeskModel['characterRelation']
  characterBehavior: ChapterAcceptanceDeskModel['characterBehavior']
  conflictStructure: ChapterAcceptanceDeskModel['conflictStructure']
  bridgeUnit: ChapterAcceptanceDeskModel['bridgeUnit']
  reversal: ChapterAcceptanceDeskModel['reversal']
  showdown: ChapterAcceptanceDeskModel['showdown']
  opening: ChapterAcceptanceDeskModel['opening']
  proseCraft: ChapterAcceptanceDeskModel['proseCraft']
  sceneCardDirective: ChapterAcceptanceDeskModel['proseCraft']
  punctuationTone: ChapterAcceptanceDeskModel['punctuationTone']
  contentRubric: ChapterAcceptanceDeskModel['contentRubric']
  targetReader: ChapterAcceptanceDeskModel['targetReader']
  genrePositioning: ChapterAcceptanceDeskModel['genrePositioning']
  femaleAudience: ChapterAcceptanceDeskModel['femaleAudience']
  upgradeRhythm: ChapterAcceptanceDeskModel['upgradeRhythm']
  chapterStructure: ChapterAcceptanceDeskModel['chapterStructure']
  chapterProgression: ChapterAcceptanceDeskModel['chapterProgression']
  informationLoad: ChapterAcceptanceDeskModel['informationLoad']
  longformContinuity: ChapterAcceptanceDeskModel['longformContinuity']
  coreContractCheck: ChapterAcceptanceDeskModel['coreContractCheck']
  continuityHeat: ChapterAcceptanceDeskModel['continuityHeat']
  revisionReceiptCheck: ChapterAcceptanceDeskModel['revisionReceiptCheck']
  deslopRepairCheck: ChapterAcceptanceDeskModel['deslopRepairCheck']
  proseMeta: ChapterAcceptanceDeskModel['proseMeta']
  serialRiskRepair: ChapterAcceptanceDeskModel['serialRiskRepair']
  chapterHookQuality: ChapterAcceptanceDeskModel['chapterHookQuality']
  readerRetentionCheck: ChapterAcceptanceDeskModel['readerRetentionCheck']
  readerRetentionSync: ChapterAcceptanceDeskModel['readerRetentionSync']
  chapterAttraction: ChapterAcceptanceDeskModel['chapterAttraction']
  storyDriveSync: ChapterAcceptanceDeskModel['storyDriveSync']
  characterArcSync: ChapterAcceptanceDeskModel['characterArcSync']
  chapterBenchmarkSync: ChapterAcceptanceDeskModel['chapterBenchmarkSync']
  styleSampleSync: ChapterAcceptanceDeskModel['styleSampleSync']
  innovationSync: ChapterAcceptanceDeskModel['innovationSync']
  volumeBeatSync: ChapterAcceptanceDeskModel['volumeBeatSync']
  blueprintReceipt: ChapterAcceptanceDeskModel['blueprintReceipt']
  revisionReceipt: ChapterAcceptanceDeskModel['revisionReceipt']
  deliveryRiskReceipt: ChapterAcceptanceDeskModel['deliveryRiskReceipt']
  sceneCardReceipt: ChapterAcceptanceDeskModel['sceneCardReceipt']
  qualityAudit: ChapterAcceptanceDeskModel['qualityAudit']
  platformRubric: ChapterAcceptanceDeskModel['platformRubric']
  approvalBlocker: ChapterAcceptanceDeskModel['approvalBlocker']
  governanceRecheckSync: ChapterAcceptanceDeskModel['governanceRecheckSync']
}): ChapterAcceptanceDeskModel['deliveryRiskQueue'] {
  const risks: Array<{ count: number; item: string; priorityLabel: string; priorityRank?: number }> = []
  if (args.approvalBlocker) {
    risks.push({
      count: 1,
      item: `处理入库阻断：${args.approvalBlocker.label} · ${args.approvalBlocker.detail}`,
      priorityLabel: '优先处理入库阻断',
      priorityRank: 0,
    })
  }
  if (args.governanceRecheckSync && args.governanceRecheckSync.missedCount > 0) {
    risks.push({
      count: args.governanceRecheckSync.missedCount,
      item: `验恢复依据：${args.governanceRecheckSync.label}`,
      priorityLabel: '优先验恢复依据',
    })
  }
  if (args.coreDrift && args.coreDrift.riskCount > 0) {
    risks.push({ count: args.coreDrift.riskCount, item: `守核心：${args.coreDrift.label}`, priorityLabel: '优先补核心' })
  }
  if (args.blueprintReceipt && args.blueprintReceipt.missedCount > 0) {
    risks.push({ count: args.blueprintReceipt.missedCount, item: `补蓝图：${args.blueprintReceipt.label}`, priorityLabel: '优先补蓝图' })
  }
  if (args.revisionReceipt && args.revisionReceipt.riskCount > 0) {
    risks.push({ count: args.revisionReceipt.riskCount, item: `复核修订：${args.revisionReceipt.label}`, priorityLabel: '优先复核修订' })
  }
  if (args.deliveryRiskReceipt && args.deliveryRiskReceipt.riskCount > 0) {
    risks.push({ count: args.deliveryRiskReceipt.riskCount, item: `复核承接：${args.deliveryRiskReceipt.label}`, priorityLabel: '优先复核承接' })
  }
  if (args.sceneCardReceipt && args.sceneCardReceipt.riskCount > 0) {
    risks.push({ count: args.sceneCardReceipt.riskCount, item: `复核场景回执：${args.sceneCardReceipt.label}`, priorityLabel: '优先复核场景' })
  }
  if (args.sceneCardDirective && args.sceneCardDirective.missedCount > 0) {
    risks.push({
      count: args.sceneCardDirective.missedCount,
      item: `修场景卡：${args.sceneCardDirective.label}`,
      priorityLabel: '优先修场景卡',
      priorityRank: 1,
    })
  }
  if (args.qualityAudit && args.qualityAudit.riskCount > 0) {
    risks.push({ count: args.qualityAudit.riskCount, item: `修质量诊断：${args.qualityAudit.label}`, priorityLabel: '优先修质量诊断' })
  }
  if (args.qualityAuditSync && args.qualityAuditSync.missedCount > 0) {
    risks.push({ count: args.qualityAuditSync.missedCount, item: `补诊断承接：${args.qualityAuditSync.label}`, priorityLabel: '优先补质量诊断' })
  }
  if (args.qualityAuditRepairReceiptSync && args.qualityAuditRepairReceiptSync.missedCount > 0) {
    risks.push({
      count: args.qualityAuditRepairReceiptSync.missedCount,
      item: `复核质量修复回执：${args.qualityAuditRepairReceiptSync.label}`,
      priorityLabel: '优先补质量回执',
    })
  }
  if (args.chapterHandoffSync && args.chapterHandoffSync.missedCount > 0) {
    risks.push({
      count: args.chapterHandoffSync.missedCount,
      item: `补章首承接：${args.chapterHandoffSync.label}`,
      priorityLabel: '优先补章首承接',
    })
  }
  if (args.chapterHandoffDeltaSync && args.chapterHandoffDeltaSync.missedCount > 0) {
    risks.push({
      count: args.chapterHandoffDeltaSync.missedCount,
      item: `补章末交接：${args.chapterHandoffDeltaSync.label}`,
      priorityLabel: '优先补章末交接',
    })
  }
  if (args.writePreparation && args.writePreparation.missedCount > 0) {
    risks.push({
      count: args.writePreparation.missedCount,
      item: `补写前准备：${args.writePreparation.label}`,
      priorityLabel: '优先补写前准备',
    })
  }
  if (args.intentConfirmationSync && args.intentConfirmationSync.missedCount > 0) {
    risks.push({
      count: args.intentConfirmationSync.missedCount,
      item: `补意图确认：${args.intentConfirmationSync.label}`,
      priorityLabel: '优先补意图确认',
    })
  }
  if (args.benchmarkRecallSync && args.benchmarkRecallSync.missedCount > 0) {
    risks.push({
      count: args.benchmarkRecallSync.missedCount,
      item: `补文风召回：${args.benchmarkRecallSync.label}`,
      priorityLabel: '优先补文风召回',
    })
  }
  if (args.sourceReadiness && args.sourceReadiness.missedCount > 0) {
    risks.push({
      count: args.sourceReadiness.missedCount,
      item: `补来源就绪：${args.sourceReadiness.label}`,
      priorityLabel: '优先补来源',
    })
  }
  if (args.stateTracking && args.stateTracking.missedCount > 0) {
    risks.push({
      count: args.stateTracking.missedCount,
      item: `补状态跟踪：${args.stateTracking.label}`,
      priorityLabel: '优先补状态',
    })
  }
  if (args.styleBoundary && args.styleBoundary.missedCount > 0) {
    risks.push({
      count: args.styleBoundary.missedCount,
      item: `校风格边界：${args.styleBoundary.label}`,
      priorityLabel: '优先校风格边界',
    })
  }
  if (args.informationFlow && args.informationFlow.missedCount > 0) {
    risks.push({
      count: args.informationFlow.missedCount,
      item: `调信息流：${args.informationFlow.label}`,
      priorityLabel: '优先调信息流',
    })
  }
  if (args.expectationThreshold && args.expectationThreshold.missedCount > 0) {
    risks.push({
      count: args.expectationThreshold.missedCount,
      item: `补期待阈值：${args.expectationThreshold.label}`,
      priorityLabel: '优先补期待阈值',
    })
  }
  if (args.storyLoop && args.storyLoop.missedCount > 0) {
    risks.push({
      count: args.storyLoop.missedCount,
      item: `补故事闭环：${args.storyLoop.label}`,
      priorityLabel: '优先补闭环',
    })
  }
  if (args.emotionalArc && args.emotionalArc.missedCount > 0) {
    risks.push({
      count: args.emotionalArc.missedCount,
      item: `补情绪弧：${args.emotionalArc.label}`,
      priorityLabel: '优先补情绪弧',
    })
  }
  if (args.chapterHook && args.chapterHook.missedCount > 0) {
    risks.push({
      count: args.chapterHook.missedCount,
      item: `补章级钩子：${args.chapterHook.label}`,
      priorityLabel: '优先补章钩',
    })
  }
  if (args.paragraphHook && args.paragraphHook.missedCount > 0) {
    risks.push({
      count: args.paragraphHook.missedCount,
      item: `补段落钩子：${args.paragraphHook.label}`,
      priorityLabel: '优先补段钩',
    })
  }
  if (args.suspense && args.suspense.missedCount > 0) {
    risks.push({
      count: args.suspense.missedCount,
      item: `补悬念编排：${args.suspense.label}`,
      priorityLabel: '优先补悬念',
    })
  }
  if (args.assetLinkage && args.assetLinkage.missedCount > 0) {
    risks.push({
      count: args.assetLinkage.missedCount,
      item: `挂资产：${args.assetLinkage.label}`,
      priorityLabel: '优先补资产挂钩',
    })
  }
  if (args.dialogue && args.dialogue.missedCount > 0) {
    risks.push({
      count: args.dialogue.missedCount,
      item: `修对白：${args.dialogue.label}`,
      priorityLabel: '优先修对白',
    })
  }
  if (args.plotDynamics && args.plotDynamics.missedCount > 0) {
    risks.push({
      count: args.plotDynamics.missedCount,
      item: `补动力：${args.plotDynamics.label}`,
      priorityLabel: '优先补剧情动力',
    })
  }
  if (args.characterRelation && args.characterRelation.missedCount > 0) {
    risks.push({
      count: args.characterRelation.missedCount,
      item: `修关系：${args.characterRelation.label}`,
      priorityLabel: '优先修角色关系',
    })
  }
  if (args.characterBehavior && args.characterBehavior.missedCount > 0) {
    risks.push({
      count: args.characterBehavior.missedCount,
      item: `修行为：${args.characterBehavior.label}`,
      priorityLabel: '优先修角色行为',
    })
  }
  if (args.conflictStructure && args.conflictStructure.missedCount > 0) {
    risks.push({
      count: args.conflictStructure.missedCount,
      item: `加冲突：${args.conflictStructure.label}`,
      priorityLabel: '优先修冲突结构',
    })
  }
  if (args.bridgeUnit && args.bridgeUnit.missedCount > 0) {
    risks.push({
      count: args.bridgeUnit.missedCount,
      item: `补桥段：${args.bridgeUnit.label}`,
      priorityLabel: '优先补桥段节奏',
    })
  }
  if (args.reversal && args.reversal.missedCount > 0) {
    risks.push({
      count: args.reversal.missedCount,
      item: `补反转：${args.reversal.label}`,
      priorityLabel: '优先补反转设计',
    })
  }
  if (args.showdown && args.showdown.missedCount > 0) {
    risks.push({
      count: args.showdown.missedCount,
      item: `补高潮：${args.showdown.label}`,
      priorityLabel: '优先补高潮对抗',
    })
  }
  if (args.opening && args.opening.missedCount > 0) {
    risks.push({
      count: args.opening.missedCount,
      item: `改开篇：${args.opening.label}`,
      priorityLabel: '优先修开篇',
    })
  }
  if (args.proseCraft && args.proseCraft.missedCount > 0) {
    risks.push({
      count: args.proseCraft.missedCount,
      item: `修工艺：${args.proseCraft.label}`,
      priorityLabel: '优先修正文工艺',
    })
  }
  if (args.punctuationTone && args.punctuationTone.missedCount > 0) {
    risks.push({
      count: args.punctuationTone.missedCount,
      item: `调语气：${args.punctuationTone.label}`,
      priorityLabel: '优先修语气标点',
    })
  }
  if (args.contentRubric && args.contentRubric.missedCount > 0) {
    risks.push({
      count: args.contentRubric.missedCount,
      item: `补内容：${args.contentRubric.label}`,
      priorityLabel: '优先修内容基准',
    })
  }
  if (args.targetReader && args.targetReader.missedCount > 0) {
    risks.push({
      count: args.targetReader.missedCount,
      item: `创作契约：目标读者缺口 ${args.targetReader.missedCount}`,
      priorityLabel: '优先修创作契约',
      priorityRank: 1,
    })
  }
  if (args.genrePositioning && args.genrePositioning.missedCount > 0) {
    risks.push({
      count: args.genrePositioning.missedCount,
      item: `创作契约：题材定位缺口 ${args.genrePositioning.missedCount}`,
      priorityLabel: '优先修创作契约',
      priorityRank: 1,
    })
  }
  if (args.femaleAudience && args.femaleAudience.missedCount > 0) {
    risks.push({
      count: args.femaleAudience.missedCount,
      item: `补女频：${args.femaleAudience.label}`,
      priorityLabel: '优先补女频长篇',
    })
  }
  if (args.upgradeRhythm && args.upgradeRhythm.missedCount > 0) {
    risks.push({
      count: args.upgradeRhythm.missedCount,
      item: `补升级：${args.upgradeRhythm.label}`,
      priorityLabel: '优先补升级节奏',
    })
  }
  if (args.chapterStructure && args.chapterStructure.missedCount > 0) {
    risks.push({
      count: args.chapterStructure.missedCount,
      item: `补结构：${args.chapterStructure.label}`,
      priorityLabel: '优先补章节结构',
    })
  }
  if (args.chapterProgression && args.chapterProgression.missedCount > 0) {
    risks.push({
      count: args.chapterProgression.missedCount,
      item: `补推进：${args.chapterProgression.label}`,
      priorityLabel: '优先补章节推进',
    })
  }
  if (args.informationLoad && args.informationLoad.missedCount > 0) {
    risks.push({
      count: args.informationLoad.missedCount,
      item: `压信息：${args.informationLoad.label}`,
      priorityLabel: '优先压信息负载',
    })
  }
  if (args.longformContinuity && args.longformContinuity.missedCount > 0) {
    risks.push({
      count: args.longformContinuity.missedCount,
      item: `保长篇：${args.longformContinuity.label}`,
      priorityLabel: '优先保长篇连续性',
    })
  }
  if (args.coreContractCheck && args.coreContractCheck.missedCount > 0) {
    risks.push({
      count: args.coreContractCheck.missedCount,
      item: `创作契约：核心承诺缺口 ${args.coreContractCheck.missedCount}`,
      priorityLabel: '优先修创作契约',
      priorityRank: 1,
    })
  }
  if (args.continuityHeat && args.continuityHeat.missedCount > 0) {
    risks.push({
      count: args.continuityHeat.missedCount,
      item: `补热度：${args.continuityHeat.label}`,
      priorityLabel: '优先补连续性热度',
    })
  }
  if (args.revisionReceiptCheck && args.revisionReceiptCheck.missedCount > 0) {
    risks.push({
      count: args.revisionReceiptCheck.missedCount,
      item: `补回执：${args.revisionReceiptCheck.label}`,
      priorityLabel: '优先补修订回执',
    })
  }
  if (args.deslopRepairCheck && args.deslopRepairCheck.missedCount > 0) {
    risks.push({
      count: args.deslopRepairCheck.missedCount,
      item: `补去味：${args.deslopRepairCheck.label}`,
      priorityLabel: '优先补去AI味修复',
    })
  }
  if (args.proseMeta && args.proseMeta.missedCount > 0) {
    risks.push({
      count: args.proseMeta.missedCount,
      item: `删元叙：${args.proseMeta.label}`,
      priorityLabel: '优先删正文元叙事',
    })
  }
  if (args.serialRiskRepair && args.serialRiskRepair.missedCount > 0) {
    risks.push({
      count: args.serialRiskRepair.missedCount,
      item: `补连修：${args.serialRiskRepair.label}`,
      priorityLabel: '优先补连续风险修复',
    })
  }
  if (args.chapterHookQuality && args.chapterHookQuality.missedCount > 0) {
    risks.push({
      count: args.chapterHookQuality.missedCount,
      item: `强章钩：${args.chapterHookQuality.label}`,
      priorityLabel: '优先强章钩质量',
    })
  }
  if (args.readerRetentionCheck && args.readerRetentionCheck.missedCount > 0) {
    risks.push({
      count: args.readerRetentionCheck.missedCount,
      item: `创作契约：追读留存缺口 ${args.readerRetentionCheck.missedCount}`,
      priorityLabel: '优先修创作契约',
      priorityRank: 1,
    })
  }
  if (args.platformRubric && args.platformRubric.missedCount > 0) {
    risks.push({ count: args.platformRubric.missedCount, item: `平台适配：平台缺口 ${args.platformRubric.missedCount}`, priorityLabel: '优先修平台适配' })
  }
  if (args.runwaySync && args.runwaySync.riskCount > 0) {
    risks.push({ count: args.runwaySync.riskCount, item: `补航线：${args.runwaySync.label}`, priorityLabel: '优先补航线' })
  }
  if (args.storyUnitSync && args.storyUnitSync.riskCount > 0) {
    risks.push({ count: args.storyUnitSync.riskCount, item: `校剧情单元：${args.storyUnitSync.label}`, priorityLabel: '优先校单元' })
  }
  if (args.signatureSceneSync && args.signatureSceneSync.missedCount > 0) {
    risks.push({ count: args.signatureSceneSync.missedCount, item: `补强场面：${args.signatureSceneSync.label}`, priorityLabel: '优先补强场面' })
  }
  if (args.mustFix.length > 0) {
    risks.push({ count: args.mustFix.length, item: `修质量：${args.mustFix.slice(0, 2).join('；')}`, priorityLabel: '优先修质量' })
  }
  if (args.readerExpectationSync && args.readerExpectationSync.missedCount > 0) {
    risks.push(args.readerExpectationSync.openingHandoffMissedCount > 0
      ? { count: args.readerExpectationSync.missedCount, item: `修开篇承接：${args.readerExpectationSync.label}`, priorityLabel: '优先修开篇' }
      : { count: args.readerExpectationSync.missedCount, item: `补期待：${args.readerExpectationSync.label}`, priorityLabel: '优先补期待' })
  } else if (args.readerRetentionSync && args.readerRetentionSync.missedCount > 0) {
    risks.push({ count: args.readerRetentionSync.missedCount, item: `补追读：${args.readerRetentionSync.label}`, priorityLabel: '优先补追读' })
  }
  if (args.chapterAttraction && args.chapterAttraction.weakCount > 0) {
    risks.push({ count: args.chapterAttraction.weakCount, item: `修吸引力：${args.chapterAttraction.label}`, priorityLabel: args.chapterAttraction.priorityLabel || '优先修吸引力' })
  }
  if (args.storyDriveSync && args.storyDriveSync.missedCount > 0) {
    risks.push({
      count: args.storyDriveSync.missedCount,
      item: `补故事力：${args.storyDriveSync.label}`,
      priorityLabel: args.storyDriveSync.priorityLabel || '优先补故事力',
    })
  }
  if (args.characterArcSync && args.characterArcSync.missedCount > 0) {
    risks.push({
      count: args.characterArcSync.missedCount,
      item: `补人物弧光：${args.characterArcSync.label}`,
      priorityLabel: args.characterArcSync.priorityLabel || '优先补人物弧光',
    })
  }
  if (args.chapterBenchmarkSync && args.chapterBenchmarkSync.missedCount > 0) {
    risks.push({ count: args.chapterBenchmarkSync.missedCount, item: `补基准：${args.chapterBenchmarkSync.label}`, priorityLabel: '优先补基准' })
  }
  if (args.styleSampleSync && (args.styleSampleSync.missedCount > 0 || args.styleSampleSync.copyRiskCount > 0)) {
    risks.push({
      count: args.styleSampleSync.missedCount + args.styleSampleSync.copyRiskCount,
      item: `校风格：${args.styleSampleSync.label}`,
      priorityLabel: '优先校风格',
    })
  }
  if (args.innovationSync && args.innovationSync.missedCount > 0) {
    risks.push({ count: args.innovationSync.missedCount, item: `补创新：${args.innovationSync.label}`, priorityLabel: '优先补创新' })
  }
  if (args.volumeBeatSync && args.volumeBeatSync.missedCount > 0) {
    risks.push({ count: args.volumeBeatSync.missedCount, item: `补爆点：${args.volumeBeatSync.label}`, priorityLabel: '优先补爆点' })
  }
  if (!args.readerExpectationSync && args.readerPayoffSync && args.readerPayoffSync.debtCount > 0) {
    risks.push({ count: args.readerPayoffSync.debtCount, item: `补回报：${args.readerPayoffSync.label}`, priorityLabel: '优先补回报' })
  }
  if (args.storylineSync) {
    const storylineRiskCount = args.storylineSync.missedCount + args.storylineSync.unplannedCount + args.storylineSync.forbiddenCount
    if (storylineRiskCount > 0) {
      risks.push({ count: storylineRiskCount, item: `校剧情线：${args.storylineSync.label}`, priorityLabel: '优先校剧情线' })
    }
  }
  if (args.readabilityReview && args.readabilityReview.riskCount > 0) {
    risks.push(args.readabilityReview.openingHookRisk
      ? { count: args.readabilityReview.riskCount, item: `修开篇吸引力：${args.readabilityReview.riskLabel}`, priorityLabel: '优先修开篇' }
      : args.readabilityReview.endingHookRisk
        ? { count: args.readabilityReview.riskCount, item: `修章末翻页：${args.readabilityReview.riskLabel}`, priorityLabel: '优先修章末' }
        : args.readabilityReview.sceneReadabilityRisk
          ? { count: args.readabilityReview.riskCount, item: `修场景推进：${args.readabilityReview.riskLabel}`, priorityLabel: '优先修场景' }
          : args.readabilityReview.payoffDensityRisk
            ? { count: args.readabilityReview.riskCount, item: `补爽点密度：${args.readabilityReview.riskLabel}`, priorityLabel: '优先补爽点' }
            : args.readabilityReview.aiSmellRisk
              ? { count: args.readabilityReview.riskCount, item: `去AI味：${args.readabilityReview.riskLabel}`, priorityLabel: '优先去AI味' }
      : { count: args.readabilityReview.riskCount, item: `调可读性：${args.readabilityReview.riskLabel}`, priorityLabel: '优先调可读性' })
  }

  const totalCount = risks.reduce((sum, risk) => sum + risk.count, 0)
  if (totalCount <= 0) return null
  const orderedRisks = risks
    .map((risk, index) => ({ ...risk, index }))
    .sort((left, right) => (left.priorityRank ?? 2) - (right.priorityRank ?? 2) || left.index - right.index)

  return {
    totalCount,
    label: `待修复 ${totalCount}`,
    priorityLabel: orderedRisks[0]?.priorityLabel || '优先复盘本章',
    items: orderedRisks.map(risk => risk.item),
  }
}

export function deliveryRiskConvergencePayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.delivery_risk_convergence || payload?.result?.delivery_risk_convergence || payload?.result || payload
}

export function buildDeliveryRiskConvergenceSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['deliveryRiskConvergence'] {
  if (!review) return null
  const payload = deliveryRiskConvergencePayload(review)
  const statusText = text(payload?.status || review?.status).toLowerCase()
  const status: 'cleared' | 'improved' | 'unchanged' | 'worse' =
    statusText === 'cleared' || statusText === 'improved' || statusText === 'worse' ? statusText : 'unchanged'
  const residualCountValue = Number(payload?.residual_count ?? payload?.residualCount ?? payload?.after_count)
  const resolvedCountValue = Number(payload?.resolved_count ?? payload?.resolvedCount)
  const residualCount = Number.isFinite(residualCountValue) ? residualCountValue : 0
  const resolvedCount = Number.isFinite(resolvedCountValue) ? resolvedCountValue : 0
  const nextActions = Array.isArray(payload?.next_actions) ? payload.next_actions.map((item: any) => text(item)).filter(Boolean) : []

  return {
    status,
    label: text(payload?.label) || (status === 'cleared' ? '风险已清零' : status === 'improved' ? `风险收敛 ${resolvedCount}` : status === 'worse' ? '新增风险' : `仍有残留 ${residualCount}`),
    residualCount,
    resolvedCount,
    nextAction: nextActions[0] || '',
  }
}

export function governanceRecheckSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.governance_recheck_sync || payload?.result?.governance_recheck_sync || payload?.result || payload
}

export function reviewItemTextArray(value: any): string[] {
  if (!Array.isArray(value)) return stringArray(value)
  return value.map(item => {
    if (!item || typeof item !== 'object') return text(item)
    return firstNonEmpty(item.text, item.label, item.summary, item.detail, item.name, item.title)
  }).filter(Boolean)
}

export function buildGovernanceRecheckSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['governanceRecheckSync'] {
  if (!review) return null
  const payload = governanceRecheckSyncPayload(review)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const failedEvidence = reviewItemTextArray(payload?.failed_evidence || payload?.failedEvidence)
  const missedItems = reviewItemTextArray(payload?.missed || payload?.missed_items || payload?.missedItems)
  const missedCount = Number.isFinite(payloadMissedCount)
    ? payloadMissedCount
    : failedEvidence.length + missedItems.length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '恢复依据 OK' : text(payload?.label) || `恢复依据缺口 ${missedCount}`,
    missedCount,
    failedEvidence: failedEvidence.slice(0, 6),
    watchItems: reviewItemTextArray(payload?.watch_items || payload?.watchItems).slice(0, 6),
    summary: text(payload?.summary || review?.summary),
  }
}

export function extractQualityScore(quality: AnyRecord) {
  const value = quality?.score ?? quality?.overall_score ?? quality?.quality_score
  if (value === null || value === undefined || value === '') return null
  const score = Number(value)
  return Number.isFinite(score) ? score : null
}

export function recordValue(value: any): AnyRecord {
  if (!value) return {}
  if (typeof value === 'object') return value
  const parsed = parseWorkspacePayload(value, { kind: 'admission', field: 'payload' })
  return parsed && typeof parsed === 'object' ? parsed : {}
}

export function unwrapStorageEnvelope(record: AnyRecord): AnyRecord {
  if (!record || typeof record !== 'object') return {}
  const preview = typeof record.preview === 'string' ? recordValue(record.preview) : {}
  const hasPreview = Object.keys(preview).length > 0
  if (!record.truncated || !hasPreview) return record
  return {
    ...preview,
    ...record,
    chapter_id: record.chapter_id ?? record.chapterId ?? preview.chapter_id ?? preview.chapterId ?? preview.chapter?.id,
    chapter_no: record.chapter_no ?? record.chapterNo ?? preview.chapter_no ?? preview.chapterNo ?? preview.chapter?.chapter_no ?? preview.chapter?.chapterNo,
    admission_status: firstNonEmpty(record.admission_status, record.admissionStatus, preview.admission_status, preview.admissionStatus),
    prose_admission: record.prose_admission || record.proseAdmission || preview.prose_admission || preview.proseAdmission,
    quality_score: record.quality_score ?? record.qualityScore ?? preview.quality_score ?? preview.qualityScore ?? preview.score,
    quality_warnings: record.quality_warnings || record.qualityWarnings || preview.quality_warnings || preview.qualityWarnings || preview.warnings,
    story_state_status: firstNonEmpty(record.story_state_status, record.storyStateStatus, preview.story_state_status, preview.storyStateStatus),
    post_commit_warnings: record.post_commit_warnings || record.postCommitWarnings || preview.post_commit_warnings || preview.postCommitWarnings,
  }
}

export function normalizeAdmissionCandidate(value: any): AnyRecord | null {
  const record = unwrapStorageEnvelope(recordValue(value))
  const direct = record?.prose_admission || record?.proseAdmission
  if (direct && typeof direct === 'object') {
    const status = firstNonEmpty(direct.status, direct.admission_status, direct.admissionStatus)
    if (!['accepted', 'accepted_with_warnings', 'blocked_invalid'].includes(status)) return null
    return {
      ...direct,
      status,
      quality_score: direct.quality_score ?? direct.qualityScore ?? record?.quality_score ?? record?.qualityScore ?? record?.score,
      quality_warnings: direct.quality_warnings || direct.qualityWarnings || record?.quality_warnings || record?.qualityWarnings || record?.warnings,
      story_state_status: direct.story_state_status || direct.storyStateStatus || record?.story_state_status || record?.storyStateStatus,
      story_state_warning: direct.story_state_warning || direct.storyStateWarning || record?.story_state_warning || record?.storyStateWarning || null,
      post_commit_warnings: direct.post_commit_warnings || direct.postCommitWarnings || record?.post_commit_warnings || record?.postCommitWarnings,
    }
  }
  const status = firstNonEmpty(record?.status, record?.admission_status, record?.admissionStatus)
  if (!['accepted', 'accepted_with_warnings', 'blocked_invalid'].includes(status)) return null
  return {
    ...record,
    status,
    quality_score: record?.quality_score ?? record?.qualityScore ?? record?.score,
    quality_warnings: record?.quality_warnings || record?.qualityWarnings || record?.warnings,
    story_state_status: record?.story_state_status || record?.storyStateStatus,
    story_state_warning: record?.story_state_warning || record?.storyStateWarning || null,
    post_commit_warnings: record?.post_commit_warnings || record?.postCommitWarnings,
  }
}

export function recordBelongsToChapter(record: AnyRecord, chapter: AnyRecord) {
  const recordId = text(record?.chapter_id ?? record?.chapterId ?? record?.chapter?.id)
  const recordNoValue = record?.chapter_no ?? record?.chapterNo ?? record?.chapter?.chapter_no ?? record?.chapter?.chapterNo
  const recordNo = Number(recordNoValue || 0)
  const chapterId = text(chapter?.id)
  const chapterNo = Number(chapter?.chapter_no || chapter?.chapterNo || 0)
  if (!recordId && recordNo <= 0) return false
  if (recordId && (!chapterId || recordId !== chapterId)) return false
  if (recordNo > 0 && (!chapterNo || recordNo !== chapterNo)) return false
  return true
}

export function runAdmissionOrder(run: AnyRecord) {
  const timestamp = Date.parse(firstNonEmpty(run?.updated_at, run?.updatedAt, run?.completed_at, run?.completedAt, run?.created_at, run?.createdAt))
  if (Number.isFinite(timestamp)) return timestamp
  const id = Number(run?.id || 0)
  return Number.isFinite(id) ? id : 0
}

export function admissionRank(status: string) {
  if (status === 'accepted') return 3
  if (status === 'accepted_with_warnings') return 2
  if (status === 'blocked_invalid') return 1
  return 0
}

export function runAdmission(runs: AnyRecord[], chapter: AnyRecord): AnyRecord | null {
  const sortedRuns = [...runs].sort((left, right) => runAdmissionOrder(right) - runAdmissionOrder(left))
  let best: AnyRecord | null = null
  let bestRank = 0
  for (const run of sortedRuns) {
    const roots = [run?.output_ref, run?.outputRef, run?.output, run?.payload, run]
      .map(recordValue)
      .map(unwrapStorageEnvelope)
      .filter(value => Object.keys(value).length > 0)
    for (const root of roots) {
      const direct = recordBelongsToChapter(root, chapter) ? normalizeAdmissionCandidate(root) : null
      const items = [...arrayValue(root?.chapters), ...arrayValue(root?.results)]
      const item = items.find(candidate => recordBelongsToChapter(candidate, chapter))
      const nested = normalizeAdmissionCandidate(item)
      const candidate = direct || nested
      if (!candidate) continue
      const status = firstNonEmpty(candidate.status, candidate.admission_status, candidate.admissionStatus)
      const rank = admissionRank(status)
      // Prefer the newest successful admission; only fall back to blocked_invalid when nothing better exists.
      if (rank > bestRank || (rank === bestRank && !best)) {
        best = candidate
        bestRank = rank
      }
      if (bestRank >= 2) return best
    }
  }
  return best
}

export function resolveProseAdmission(chapter: AnyRecord, qualityReviewPayload: AnyRecord, runs: AnyRecord[]) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const fromChapter = normalizeAdmissionCandidate(rawPayload?.prose_admission || rawPayload?.proseAdmission)
  if (fromChapter) return fromChapter
  const fromReview = normalizeAdmissionCandidate(qualityReviewPayload?.prose_admission || qualityReviewPayload?.proseAdmission)
  if (fromReview) return fromReview
  const fromRun = runAdmission(runs, chapter)
  if (!fromRun) return null
  const status = firstNonEmpty(fromRun.status, fromRun.admission_status, fromRun.admissionStatus)
  // blocked_invalid means prose was rejected before store. If the chapter already has prose,
  // the failed run is stale relative to a later successful commit.
  if (status === 'blocked_invalid' && hasProse(chapter)) return null
  return fromRun
}

export function normalizedAdmissionWarnings(value: any): Array<{ code: string; source: string; message: string }> {
  const seen = new Set<string>()
  return arrayValue(value).map((item: any) => {
    if (typeof item === 'string') return { code: 'admission_warning', source: 'quality', message: text(item) }
    return {
      code: firstNonEmpty(item?.code, item?.key, 'admission_warning'),
      source: firstNonEmpty(item?.source, item?.stage, 'quality'),
      message: firstNonEmpty(item?.message, item?.detail, item?.summary, item?.label),
    }
  }).filter(item => item.message && !seen.has(`${item.source}:${item.code}:${item.message}`) && Boolean(seen.add(`${item.source}:${item.code}:${item.message}`)))
}

export function normalizedPostCommitWarnings(value: any): Array<{ stage: string; message: string }> {
  const seen = new Set<string>()
  return arrayValue(value).map((item: any) => {
    if (typeof item === 'string') return { stage: 'post_commit', message: text(item) }
    return {
      stage: firstNonEmpty(item?.stage, item?.source, 'post_commit'),
      message: firstNonEmpty(item?.message, item?.detail, item?.summary, item?.label),
    }
  }).filter(item => item.message && !seen.has(`${item.stage}:${item.message}`) && Boolean(seen.add(`${item.stage}:${item.message}`)))
}

export function hasUsableProseQualityReview(review?: AnyRecord | null) {
  const quality = qualityPayload(review)
  return extractQualityScore(quality) !== null
    || typeof quality?.passed === 'boolean'
}


export function hasHighSeverityIssue(issue: any) {
  if (typeof issue === 'string') return false
  const severity = text(issue?.severity || issue?.level || issue?.grade).toLowerCase()
  return severity === 'high' || severity === 'critical' || severity === 'blocker' || severity === 'must_fix'
}

export function extractMustFix(quality: AnyRecord, report: AnyRecord) {
  const fromQuality = [
    ...stringArray(quality?.must_fix),
    ...stringArray(quality?.mustFix),
    ...stringArray(quality?.revision_directives),
  ]
  const fromHighIssues = arrayValue(quality?.issues).filter(hasHighSeverityIssue).map(issueText).filter(Boolean)
  const fromReport = [
    ...stringArray(report?.must_fix),
    ...stringArray(report?.mustFix),
  ]
  return Array.from(new Set([...fromQuality, ...fromHighIssues, ...fromReport])).slice(0, 5)
}

export function extractOptionalImprovements(quality: AnyRecord, report: AnyRecord) {
  const items = [
    ...stringArray(quality?.optional_improvements),
    ...stringArray(quality?.optionalImprovements),
    ...stringArray(report?.optional_improvements),
    ...stringArray(report?.optionalImprovements),
  ]
  return Array.from(new Set(items)).slice(0, 5)
}

export function reportBelongsToCurrentQualityCycle(args: {
  reportRef: ReviewRef | null
  qualityRef: ReviewRef | null
  revisionRef: ReviewRef | null
}) {
  if (!args.reportRef || !args.qualityRef) return false
  return compareReviewRefs(args.reportRef, args.qualityRef) >= 0
    && (!args.revisionRef || compareReviewRefs(args.reportRef, args.revisionRef) > 0)
}


export function storyStateFailureMessages(warning: any): string[] {
  const failures = arrayValue(warning?.hard_failures || warning?.hardFailures || warning?.failures)
  const messages = failures.map((item: any) => {
    if (typeof item === 'string') return text(item)
    return firstNonEmpty(item?.message, item?.detail, item?.summary, item?.key)
  }).filter(Boolean)
  const skipped = firstNonEmpty(warning?.reason, warning?.skipped === true ? 'story_state_skipped' : '')
  if (skipped && !messages.length) {
    if (/draft_only/i.test(skipped)) return ['当前是“只生成正文初稿”模式，正文入库后故意不更新状态机，避免草稿污染长期记忆。']
    if (/draft_review/i.test(skipped)) return ['当前是“生成并自检”模式，正文入库后故意不更新状态机；完整流水线或手动同步后才会写入。']
    return [`状态机更新被跳过：${skipped}`]
  }
  if (warning?.error) messages.unshift(firstNonEmpty(warning.error, '故事状态准备失败'))
  return Array.from(new Set(messages)).slice(0, 6)
}

export function buildStoryStatePanel(args: {
  chapter: AnyRecord
  storyState: AnyRecord
  proseAdmission: AnyRecord | null
  hasChapterProse: boolean
}): ChapterAcceptanceDeskModel['storyStatePanel'] {
  if (!args.hasChapterProse) return null
  const chapterNo = Number(args.chapter?.chapter_no || args.chapter?.chapterNo || 0)
  const lastUpdatedChapter = Number(args.storyState?.last_updated_chapter || args.storyState?.lastUpdatedChapter || 0)
  const admissionStoryStatus = firstNonEmpty(
    args.proseAdmission?.story_state_status,
    args.proseAdmission?.storyStateStatus,
  )
  const warning = args.proseAdmission?.story_state_warning || args.proseAdmission?.storyStateWarning || null
  const reasons = storyStateFailureMessages(warning)
  const skippedReason = firstNonEmpty(warning?.reason, '')
  const skippedByMode = /draft_only|draft_review/i.test(skippedReason)
  const laggingByCursor = chapterNo > 0 && lastUpdatedChapter > 0 && lastUpdatedChapter < chapterNo
  const laggingUnknown = chapterNo > 0 && lastUpdatedChapter === 0
  let status: 'synced' | 'pending' | 'skipped' | 'lagging' | 'synced_with_gaps' = 'synced'
  if (admissionStoryStatus === 'pending' || skippedByMode) {
    status = skippedByMode ? 'skipped' : 'pending'
  } else if (admissionStoryStatus === 'synced' && reasons.length > 0) {
    status = 'synced_with_gaps'
  } else if (admissionStoryStatus === 'synced') {
    status = laggingByCursor ? 'lagging' : 'synced'
  } else if (laggingByCursor || laggingUnknown) {
    status = 'lagging'
  } else if (reasons.length > 0) {
    status = 'pending'
  } else {
    status = lastUpdatedChapter >= chapterNo && chapterNo > 0 ? 'synced' : 'lagging'
  }

  const statusLabel = ({
    synced: '已同步',
    pending: '待同步',
    skipped: '本模式跳过',
    lagging: '落后于正文',
    synced_with_gaps: '已同步（有缺口）',
  } as const)[status]

  const headline = ({
    synced: `状态机已同步到第 ${Math.max(lastUpdatedChapter, chapterNo)} 章`,
    pending: '正文已入库，故事状态机尚未写入',
    skipped: '当前生产模式不会自动更新状态机',
    lagging: `状态机仍停在第 ${lastUpdatedChapter || 0} 章，落后于第 ${chapterNo} 章正文`,
    synced_with_gaps: '状态机已推进，但仍有计划状态缺口',
  } as const)[status]

  const defaultSummary = ({
    synced: '角色位置、道具归属、伏笔和时间线已与本章正文对齐。',
    pending: '系统设计会把“正文入库”和“状态机写入”拆开：准备不完整时先保住正文，避免用不完整 delta 污染长期记忆。',
    skipped: '只初稿 / 生成并自检 模式为防草稿污染，不会自动写状态机。满意正文后可手动同步。',
    lagging: '已有正文比状态机更新更靠后。继续写下一章前，建议先同步本章状态机。',
    synced_with_gaps: 'last_updated_chapter 已推进，但部分角色/资产/交接变化仍被标记为缺口，可按需重新同步补齐。',
  } as const)[status]

  const guidance = ({
    synced: '可继续下一章；若你刚改过大纲或角色设定，也可重新同步一次。',
    pending: '正文不用重写。点“立即同步故事状态”即可补写状态机；同步时允许带软警告推进。',
    skipped: '切换到“生成、自检、修订、入库”会自动尝试更新；或现在直接点“立即同步故事状态”。',
    lagging: '点“立即同步故事状态”，系统会从本章起按已写正文补跑状态机。',
    synced_with_gaps: '若你对正文已满意，可再点一次同步尝试补齐缺口；也可先继续写作。',
  } as const)[status]

  const eventSource = Array.isArray(args.storyState?.established_events)
    ? args.storyState.established_events
    : Array.isArray(args.storyState?.establishedEvents)
      ? args.storyState.establishedEvents
      : Array.isArray(args.storyState?.canon_facts)
        ? args.storyState.canon_facts
        : Array.isArray(args.storyState?.canonFacts)
          ? args.storyState.canonFacts
          : []
  const preview = eventSource
    .map((item: any) => {
      if (typeof item === 'string') return String(item || '').trim()
      return String(item?.fact || item?.text || item?.summary || '').trim()
    })
    .filter(Boolean)
    .slice(0, 5)
  const confirmedCount = eventSource.filter((item: any) => {
    if (typeof item === 'string') return Boolean(item.trim())
    const st = String(item?.status || 'confirmed')
    return st === 'confirmed' || !item?.status
  }).length
  const candidateCount = eventSource.filter((item: any) => item && typeof item === 'object' && item.status === 'candidate').length
  const hardCount = eventSource.filter((item: any) => {
    if (typeof item === 'string') return false
    return item?.lock_level === 'hard' || item?.lockLevel === 'hard' || item?.kind === 'death' || item?.kind === 'rule_trigger'
  }).length
  const establishedEvents = {
    confirmedCount,
    candidateCount,
    hardCount,
    preview,
    guidance: preview.length
      ? `已锁正史事件 ${confirmedCount} 条（硬锁 ${hardCount}）。下一章闪回/复述必须一致。`
      : (status === 'synced'
        ? '本章已同步，但还没有抽到事件级正史。若正文含死亡方式/规则触发，建议重新同步。'
        : '同步故事状态后，会抽取死亡方式、规则触发等不可改写事件。'),
  }
  const panelReasons = [...reasons]
  if (!preview.length && status === 'synced') {
    panelReasons.push('未抽到事件级正史（死亡/规则等），闪回章可能改写旧事实')
  }

  const canSync = status !== 'synced'
  return {
    visible: true,
    status,
    statusLabel,
    headline,
    summary: defaultSummary,
    reasons: Array.from(new Set(panelReasons)).slice(0, 6),
    guidance,
    chapterNo,
    lastUpdatedChapter,
    canSync,
    primaryAction: canSync
      ? { key: 'sync_story_state', label: status === 'skipped' || status === 'pending' || status === 'lagging' ? '立即同步故事状态' : '重新同步故事状态' }
      : { key: 'sync_story_state', label: '重新同步故事状态' },
    establishedEvents,
  }
}

export function buildHiddenAcceptanceDesk(): ChapterAcceptanceDeskModel {
  return {
    visible: false,
    acceptanceStatus: 'hidden',
    admissionStatus: '',
    qualityWarnings: [],
    storyStateStatus: '',
    storyStatePanel: null,
    postCommitWarnings: [],
    statusLabel: '等待正文',
    acceptanceReasons: ['本章还没有正文，先完成章节计划和初稿。'],
    storylineSync: null,
    storyUnitSync: null,
    assetIntake: null,
    ipSceneIntake: null,
    signatureSceneSync: null,
    readabilityReview: null,
    deslopGateDiagnostics: null,
    coreDrift: null,
    runwaySync: null,
    readerPayoffSync: null,
    readerExpectationSync: null,
    qualityAuditSync: null,
    qualityAuditRepairReceiptSync: null,
    chapterHandoffSync: null,
    chapterHandoffDeltaSync: null,
    writePreparation: null,
    intentConfirmationSync: null,
    benchmarkRecallSync: null,
    sourceReadiness: null,
    stateTracking: null,
    styleBoundary: null,
    informationFlow: null,
    expectationThreshold: null,
    storyLoop: null,
    emotionalArc: null,
    chapterHook: null,
    paragraphHook: null,
    suspense: null,
    assetLinkage: null,
    dialogue: null,
    plotDynamics: null,
    characterRelation: null,
    characterBehavior: null,
    conflictStructure: null,
    bridgeUnit: null,
    reversal: null,
    showdown: null,
    opening: null,
    proseCraft: null,
    punctuationTone: null,
    contentRubric: null,
    targetReader: null,
    genrePositioning: null,
    femaleAudience: null,
    upgradeRhythm: null,
    chapterStructure: null,
    chapterProgression: null,
    informationLoad: null,
    longformContinuity: null,
    coreContractCheck: null,
    continuityHeat: null,
    revisionReceiptCheck: null,
    deslopRepairCheck: null,
    proseMeta: null,
    serialRiskRepair: null,
    chapterHookQuality: null,
    readerRetentionCheck: null,
    readerRetentionSync: null,
    chapterAttraction: null,
    storyDriveSync: null,
    characterArcSync: null,
    chapterBenchmarkSync: null,
    styleSampleSync: null,
    first30RetentionRecheck: null,
    innovationSync: null,
    volumeBeatSync: null,
    blueprintReceipt: null,
    revisionReceipt: null,
    deliveryRiskReceipt: null,
    sceneCardReceipt: null,
    qualityAudit: null,
    platformRubric: null,
    approvalBlocker: null,
    governanceRecheckSync: null,
    deliveryRiskQueue: null,
    deliveryRiskConvergence: null,
    qualityScore: null,
    qualityStatus: '',
    mustFix: [],
    optionalImprovements: [],
    latestQualityReviewId: null,
    latestEditorReportId: null,
    latestRevisionReviewId: null,
    latestEditorReportSummary: '',
    latestRevisionSummary: '',
    storyStateSynced: false,
    recommendedAcceptanceAction: { key: 'write_draft', label: ACTION_LABELS.write_draft },
    secondaryActions: [],
    shouldAutoExpandAcceptance: false,
  }
}

export function buildChapterAcceptanceDesk(args: {
  nextChapter: AnyRecord | null
  cockpitChapter: WritingCockpitChapter | null
  reviews: AnyRecord[]
  activeRuns: AnyRecord[]
  storyState: AnyRecord
}): ChapterAcceptanceDeskModel {
  if (!args.nextChapter) return buildHiddenAcceptanceDesk()

  const latestQualityReviewRef = latestReviewRef(args.reviews, args.nextChapter, 'prose_quality')
  const latestQualityRef = latestQualityReviewRef
    && proseQualityReviewMatchesCurrentChapter(latestQualityReviewRef.review, args.nextChapter)
    && hasUsableProseQualityReview(latestQualityReviewRef.review)
    ? latestQualityReviewRef
    : null
  const latestReportRef = latestReviewRef(args.reviews, args.nextChapter, 'editor_report')
  const latestRevisionRef = latestReviewRef(args.reviews, args.nextChapter, 'editor_revision')
  const latestStorylineSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'storyline_sync')
  const latestStoryUnitSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'story_unit_sync')
  const latestAssetIntakeRef = latestReviewRef(args.reviews, args.nextChapter, 'asset_intake')
  const latestAssetLinkageSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'asset_linkage_sync')
  const latestIpSceneIntakeRef = latestReviewRef(args.reviews, args.nextChapter, 'ip_scene_intake')
  const latestSignatureSceneSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'signature_scene_sync')
  const latestReadabilityRef = latestReviewRef(args.reviews, args.nextChapter, 'readability_review')
  const latestCoreDriftRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_core_drift')
  const latestRunwaySyncRef = latestReviewRef(args.reviews, args.nextChapter, 'runway_sync')
  const latestReaderPayoffSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'reader_payoff_sync')
  const latestReaderExpectationSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'reader_expectation_sync')
  const latestQualityAuditSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'quality_audit_sync')
  const latestQualityAuditRepairReceiptSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'quality_audit_repair_receipt_sync')
  const latestChapterHandoffSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_handoff_sync')
  const latestChapterHandoffDeltaSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_handoff_delta_sync')
  const latestIntentConfirmationSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'intent_confirmation_sync')
  const latestBenchmarkRecallSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'benchmark_recall_sync')
  const latestReaderRetentionSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'reader_retention_sync')
  const latestChapterAttractionRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_attraction_review')
  const latestStoryDriveSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'story_drive_sync')
  const latestCharacterArcSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'character_arc_sync')
  const latestChapterBenchmarkSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_benchmark_sync')
  const latestStyleSampleSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'style_sample_sync')
  const latestInnovationSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'innovation_sync')
  const latestVolumeBeatSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'volume_beat_sync')
  const latestGovernanceRecheckSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'governance_recheck_sync')
  const latestDeliveryRiskConvergenceRef = latestReviewRef(args.reviews, args.nextChapter, 'delivery_risk_convergence')
  const latestDeslopRepairReceiptSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'deslop_repair_receipt_sync')
  const latestProseRevisionReceiptSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'prose_revision_receipt_sync')
  const latestQuality = latestQualityRef?.review || null
  const latestReport = latestReportRef?.review || null
  const latestRevision = latestRevisionRef?.review || null
  const latestQualityPayload = reviewPayload(latestQuality)
  const proseAdmission = resolveProseAdmission(args.nextChapter, latestQualityPayload, args.activeRuns)
  const admissionStatus = firstNonEmpty(proseAdmission?.status, proseAdmission?.admission_status, proseAdmission?.admissionStatus) as ChapterAcceptanceDeskModel['admissionStatus']
  const qualityWarnings = normalizedAdmissionWarnings(proseAdmission?.quality_warnings || proseAdmission?.qualityWarnings)
  const storyStateStatus = firstNonEmpty(proseAdmission?.story_state_status, proseAdmission?.storyStateStatus) as ChapterAcceptanceDeskModel['storyStateStatus']
  const postCommitWarnings = normalizedPostCommitWarnings(proseAdmission?.post_commit_warnings || proseAdmission?.postCommitWarnings)
  const storyStatePanel = buildStoryStatePanel({
    chapter: args.nextChapter,
    storyState: args.storyState,
    proseAdmission,
    hasChapterProse: hasProse(args.nextChapter),
  })
  const admissionFields = { admissionStatus, qualityWarnings, storyStateStatus, storyStatePanel, postCommitWarnings }
  if (!hasProse(args.nextChapter) && admissionStatus !== 'blocked_invalid') return buildHiddenAcceptanceDesk()
  const storylineSync = buildStorylineSyncSummary(latestStorylineSyncRef?.review || null)
  const storyUnitSync = buildStoryUnitSyncSummary(latestStoryUnitSyncRef?.review || null)
  const assetIntake = buildAssetIntakeSummary(latestAssetIntakeRef?.review || null)
  const ipSceneIntake = buildIpSceneIntakeSummary(latestIpSceneIntakeRef?.review || null)
  const signatureSceneSync = buildSignatureSceneSyncSummary(latestSignatureSceneSyncRef?.review || null)
  const readabilityReview = buildReadabilityReviewSummary(latestReadabilityRef?.review || null)
  const coreDrift = buildCoreDriftSummary(latestCoreDriftRef?.review || null)
  const runwaySync = buildRunwaySyncSummary(latestRunwaySyncRef?.review || null)
  const readerPayoffSync = buildReaderPayoffSyncSummary(latestReaderPayoffSyncRef?.review || null)
  const readerExpectationSync = buildReaderExpectationSyncSummary(latestReaderExpectationSyncRef?.review || null)
  const qualityAuditSync = buildQualityAuditSyncSummary(latestQualityAuditSyncRef?.review || null)
  const qualityAuditRepairReceiptSync = buildQualityAuditRepairReceiptSyncSummary(latestQualityAuditRepairReceiptSyncRef?.review || null)
  const chapterHandoffSync = mergeContractSyncSummary(
    buildChapterHandoffSyncSummary(
      latestChapterHandoffSyncRef?.review || null,
      'chapter_handoff_sync',
      'chapterHandoffSync',
      '章首承接 OK',
      '章首承接缺口',
    ),
    buildQualityCheckSummary(latestQualityPayload, 'chapter_handoff_checks', 'chapterHandoffChecks', '章首承接'),
    '章首承接',
  )
  const chapterHandoffDeltaSync = buildChapterHandoffSyncSummary(
    latestChapterHandoffDeltaSyncRef?.review || null,
    'chapter_handoff_delta_sync',
    'chapterHandoffDeltaSync',
    '章末交接 OK',
    '章末交接缺口',
  )
  const writePreparation = mergeContractSyncSummary(
    buildQualityCheckSummary(latestQualityPayload, 'write_preparation_checks', 'writePreparationChecks', '写前准备'),
    buildPreDraftExecutionSyncSummary(latestQualityPayload, 'write_preparation_checks', 'writePreparationChecks', '写前准备'),
    '写前准备',
  )
  const intentConfirmationSync = mergeContractSyncSummary(
    buildIntentConfirmationSyncSummary(latestIntentConfirmationSyncRef?.review || null),
    buildPreDraftExecutionSyncSummary(latestQualityPayload, 'intent_confirmation_checks', 'intentConfirmationChecks', '意图确认'),
    '意图确认',
  )
  const benchmarkRecallSync = mergeContractSyncSummary(
    buildBenchmarkRecallSyncSummary(latestBenchmarkRecallSyncRef?.review || null),
    buildPreDraftExecutionSyncSummary(latestQualityPayload, 'benchmark_recall_checks', 'benchmarkRecallChecks', '文风召回'),
    '文风召回',
  )
  const sourceReadiness = buildQualityCheckSummary(latestQualityPayload, 'source_readiness_checks', 'sourceReadinessChecks', '来源就绪')
  const stateTracking = buildQualityCheckSummary(latestQualityPayload, 'state_tracking_checks', 'stateTrackingChecks', '状态跟踪')
  const styleBoundary = buildQualityCheckSummary(latestQualityPayload, 'style_boundary_checks', 'styleBoundaryChecks', '风格边界')
  const informationFlow = buildQualityCheckSummary(latestQualityPayload, 'information_flow_checks', 'informationFlowChecks', '信息流')
  const expectationThreshold = buildQualityCheckSummary(latestQualityPayload, 'expectation_threshold_checks', 'expectationThresholdChecks', '期待阈值')
  const storyLoop = buildQualityCheckSummary(latestQualityPayload, 'story_loop_checks', 'storyLoopChecks', '故事闭环')
  const emotionalArc = buildQualityCheckSummary(latestQualityPayload, 'emotional_arc_checks', 'emotionalArcChecks', '情绪弧')
  const chapterHook = buildQualityCheckSummary(latestQualityPayload, 'chapter_hook_checks', 'chapterHookChecks', '章级钩子')
  const paragraphHook = buildQualityCheckSummary(latestQualityPayload, 'paragraph_hook_checks', 'paragraphHookChecks', '段落级钩子')
  const suspense = buildQualityCheckSummary(latestQualityPayload, 'suspense_checks', 'suspenseChecks', '悬念编排')
  const assetLinkage = mergeContractSyncSummary(
    buildChapterHandoffSyncSummary(
      latestAssetLinkageSyncRef?.review || null,
      'asset_linkage_sync',
      'assetLinkageSync',
      '资产挂钩 OK',
      '资产挂钩缺口',
    ),
    buildQualityCheckSummary(latestQualityPayload, 'asset_linkage_checks', 'assetLinkageChecks', '资产挂钩'),
    '资产挂钩',
  )
  const dialogue = buildQualityCheckSummary(latestQualityPayload, 'dialogue_checks', 'dialogueChecks', '对白质量')
  const plotDynamics = buildQualityCheckSummary(latestQualityPayload, 'plot_dynamics_checks', 'plotDynamicsChecks', '剧情动力')
  const characterRelation = buildQualityCheckSummary(latestQualityPayload, 'character_relation_checks', 'characterRelationChecks', '角色关系')
  const characterBehavior = buildQualityCheckSummary(latestQualityPayload, 'character_behavior_checks', 'characterBehaviorChecks', '角色行为')
  const conflictStructure = buildQualityCheckSummary(latestQualityPayload, 'conflict_structure_checks', 'conflictStructureChecks', '冲突结构')
  const bridgeUnit = buildQualityCheckSummary(latestQualityPayload, 'bridge_unit_checks', 'bridgeUnitChecks', '桥段节奏')
  const reversal = buildQualityCheckSummary(latestQualityPayload, 'reversal_checks', 'reversalChecks', '反转设计')
  const showdown = buildQualityCheckSummary(latestQualityPayload, 'showdown_checks', 'showdownChecks', '高潮对抗')
  const opening = buildQualityCheckSummary(latestQualityPayload, 'opening_checks', 'openingChecks', '开篇设计')
  const proseCraft = buildQualityCheckSummary(latestQualityPayload, 'prose_craft_checks', 'proseCraftChecks', '正文工艺')
  const sceneCardDirective = buildSceneCardDirectiveSummary(latestQualityPayload)
  const punctuationTone = buildQualityCheckSummary(latestQualityPayload, 'punctuation_tone_checks', 'punctuationToneChecks', '语气标点')
  const contentRubric = buildQualityCheckSummary(latestQualityPayload, 'content_rubric_checks', 'contentRubricChecks', '内容基准')
  const targetReader = buildQualityCheckSummary(latestQualityPayload, 'target_reader_checks', 'targetReaderChecks', '目标读者')
  const genrePositioning = buildQualityCheckSummary(latestQualityPayload, 'genre_positioning_checks', 'genrePositioningChecks', '题材定位')
  const femaleAudience = buildQualityCheckSummary(latestQualityPayload, 'female_audience_checks', 'femaleAudienceChecks', '女频长篇')
  const upgradeRhythm = buildQualityCheckSummary(latestQualityPayload, 'upgrade_rhythm_checks', 'upgradeRhythmChecks', '升级节奏')
  const chapterStructure = buildQualityCheckSummary(latestQualityPayload, 'structure_checks', 'structureChecks', '章节结构')
  const chapterProgression = buildQualityCheckSummary(latestQualityPayload, 'progression_checks', 'progressionChecks', '章节推进')
  const informationLoad = buildQualityCheckSummary(latestQualityPayload, 'information_checks', 'informationChecks', '信息负载')
  const longformContinuity = buildQualityCheckSummary(latestQualityPayload, 'longform_checks', 'longformChecks', '长篇连续性')
  const coreContractCheck = buildQualityCheckSummary(latestQualityPayload, 'core_contract_checks', 'coreContractChecks', '核心契约')
  const continuityHeat = buildQualityCheckSummary(latestQualityPayload, 'continuity_heat_checks', 'continuityHeatChecks', '连续性热度')
  const revisionReceiptCheck = buildQualityCheckSummary(latestQualityPayload, 'revision_receipt_checks', 'revisionReceiptChecks', '修订回执')
  const deslopRepairCheck = buildQualityCheckSummary(latestQualityPayload, 'deslop_repair_checks', 'deslopRepairChecks', '去AI味修复')
  const proseMeta = buildQualityCheckSummary(latestQualityPayload, 'prose_meta_checks', 'proseMetaChecks', '正文元叙事')
  const serialRiskRepair = buildQualityCheckSummary(latestQualityPayload, 'serial_risk_repair_checks', 'serialRiskRepairChecks', '连续风险修复')
  const chapterHookQuality = buildQualityCheckSummary(latestQualityPayload, 'chapter_hook_quality_checks', 'chapterHookQualityChecks', '章钩质量')
  const readerRetentionCheck = buildQualityCheckSummary(latestQualityPayload, 'reader_retention_checks', 'readerRetentionChecks', '追读雷达')
  const readerRetentionSync = buildReaderRetentionSyncSummary(latestReaderRetentionSyncRef?.review || null)
  const chapterAttraction = buildChapterAttractionSummary(latestChapterAttractionRef?.review || null)
  const storyDriveSync = buildStoryDriveSyncSummary(latestStoryDriveSyncRef?.review || null)
  const characterArcSync = buildCharacterArcSyncSummary(latestCharacterArcSyncRef?.review || null)
  const chapterBenchmarkSync = buildChapterBenchmarkSyncSummary(latestChapterBenchmarkSyncRef?.review || null)
  const styleSampleSync = buildStyleSampleSyncSummary(latestStyleSampleSyncRef?.review || null)
  const first30RetentionRecheck = buildFirst30RetentionRecheckSummary(args.nextChapter, args.reviews)
  const innovationSync = buildInnovationSyncSummary(latestInnovationSyncRef?.review || null)
  const volumeBeatSync = buildVolumeBeatSyncSummary(latestVolumeBeatSyncRef?.review || null)
  const blueprintReceipt = buildBlueprintReceiptSummary(args.nextChapter)
  const revisionReceipt = buildRevisionReceiptSummary(
    reviewPayload(latestQuality),
    {
      ...reviewPayload(latestDeslopRepairReceiptSyncRef?.review || null),
      ...reviewPayload(latestProseRevisionReceiptSyncRef?.review || null),
    },
  )
  const deliveryRiskReceipt = buildDeliveryRiskReceiptSummary(reviewPayload(latestQuality))
  const sceneCardReceipt = buildSceneCardReceiptSummary(reviewPayload(latestQuality))
  const qualityAudit = buildQualityAuditSummary(reviewPayload(latestQuality))
  const platformRubric = buildPlatformRubricSummary(reviewPayload(latestQuality))
  const governanceRecheckSync = buildGovernanceRecheckSyncSummary(latestGovernanceRecheckSyncRef?.review || null)
  const deliveryRiskConvergence = buildDeliveryRiskConvergenceSummary(latestDeliveryRiskConvergenceRef?.review || null)
  const quality = qualityPayload(latestQuality)
  const legacyApprovalBlocker = buildApprovalBlockerSummary(reviewPayload(latestQuality))
  const admissionApprovalBlocker: ChapterAcceptanceDeskModel['approvalBlocker'] = admissionStatus === 'blocked_invalid'
    ? {
        type: 'blocked_invalid',
        status: 'warn',
        label: '正文无效，未入库',
        detail: qualityWarnings.map(item => item.message).join('；') || '正文未通过有效性检查且未入库。',
        scoreLabel: '终止入库',
        reasons: qualityWarnings.map(item => item.message),
      }
    : null
  const approvalBlocker = ['accepted', 'accepted_with_warnings'].includes(admissionStatus)
    ? null
    : admissionApprovalBlocker || legacyApprovalBlocker
  const report = reportPayload(latestReport)
  const revision = revisionPayload(latestRevision)
  const score = extractQualityScore(proseAdmission || {}) ?? extractQualityScore(quality)
  const qualityStatus = firstNonEmpty(quality?.status, latestQuality?.status)
  const currentReport = reportBelongsToCurrentQualityCycle({
    reportRef: latestReportRef,
    qualityRef: latestQualityRef,
    revisionRef: latestRevisionRef,
  }) ? report : {}
  const deslopGateDiagnostics = buildDeslopGateDiagnosticsSummary(quality)
  const mustFix = extractMustFix(quality, currentReport)
  const optionalImprovements = extractOptionalImprovements(quality, report)
  const deliveryRiskQueue = buildDeliveryRiskQueue({
    mustFix,
    storylineSync,
    storyUnitSync,
    signatureSceneSync,
    readabilityReview,
    coreDrift,
    runwaySync,
    readerPayoffSync,
    readerExpectationSync,
    qualityAuditSync,
    qualityAuditRepairReceiptSync,
    chapterHandoffSync,
    chapterHandoffDeltaSync,
    writePreparation,
    intentConfirmationSync,
    benchmarkRecallSync,
    sourceReadiness,
    stateTracking,
    styleBoundary,
    informationFlow,
    expectationThreshold,
    storyLoop,
    emotionalArc,
    chapterHook,
    paragraphHook,
    suspense,
    assetLinkage,
    dialogue,
    plotDynamics,
    characterRelation,
    characterBehavior,
    conflictStructure,
    bridgeUnit,
    reversal,
    showdown,
    opening,
    proseCraft,
    sceneCardDirective,
    punctuationTone,
    contentRubric,
    targetReader,
    genrePositioning,
    femaleAudience,
    upgradeRhythm,
    chapterStructure,
    chapterProgression,
    informationLoad,
    longformContinuity,
    coreContractCheck,
    continuityHeat,
    revisionReceiptCheck,
    deslopRepairCheck,
    proseMeta,
    serialRiskRepair,
    chapterHookQuality,
    readerRetentionCheck,
    readerRetentionSync,
    chapterAttraction,
    storyDriveSync,
    characterArcSync,
    chapterBenchmarkSync,
    styleSampleSync,
    innovationSync,
    volumeBeatSync,
    blueprintReceipt,
    revisionReceipt,
    deliveryRiskReceipt,
    sceneCardReceipt,
    qualityAudit,
    platformRubric,
    approvalBlocker,
    governanceRecheckSync,
  })
  const storyStateSynced = storyStateStatus
    ? storyStateStatus === 'synced'
    : Number(args.storyState?.last_updated_chapter || 0) >= Number(args.nextChapter?.chapter_no || 0)
  const latestEditorReportSummary = firstNonEmpty(report?.summary, latestReport?.summary)
  const latestRevisionSummary = firstNonEmpty(revision?.revision_summary, latestRevision?.summary)
  const revisionNeedsRecheck = Boolean(
    latestQualityRef
    && latestRevisionRef
    && compareReviewRefs(latestRevisionRef, latestQualityRef) > 0,
  )
  const scoreNeedsRevision = score !== null && score < QUALITY_PASS_THRESHOLD
  const qualityNeedsRevision = Boolean(
    scoreNeedsRevision
    || mustFix.length > 0
    || Boolean(approvalBlocker)
    || quality?.needs_revision === true
    || quality?.passed === false,
  )
  const secondaryActions: Array<{ key: WritingCockpitActionKey; label: string }> = [
    { key: 'review_draft', label: '查看交稿质检' },
    { key: 'open_editor_reports', label: ACTION_LABELS.open_editor_reports },
    { key: 'open_version_history', label: ACTION_LABELS.open_version_history },
  ]

  if (admissionStatus === 'accepted_with_warnings' && (scoreNeedsRevision || mustFix.length > 0 || qualityWarnings.length > 0)) {
    secondaryActions.unshift({ key: 'apply_editor_revision', label: ACTION_LABELS.apply_editor_revision })
  }
  const needsStoryStateSync = Boolean(storyStatePanel && ['pending', 'skipped', 'lagging'].includes(storyStatePanel.status))
  if (needsStoryStateSync) {
    secondaryActions.unshift({
      key: 'sync_story_state',
      label: storyStatePanel?.primaryAction?.label || ACTION_LABELS.sync_story_state,
    })
  }

  const admissionCommon = {
    storylineSync, storyUnitSync, assetIntake, ipSceneIntake, signatureSceneSync, readabilityReview,
    deslopGateDiagnostics, coreDrift, runwaySync, readerPayoffSync, readerExpectationSync,
    qualityAuditSync, qualityAuditRepairReceiptSync, chapterHandoffSync, chapterHandoffDeltaSync,
    writePreparation, intentConfirmationSync, benchmarkRecallSync, sourceReadiness, stateTracking,
    styleBoundary, informationFlow, expectationThreshold, storyLoop, emotionalArc, chapterHook,
    paragraphHook, suspense, assetLinkage, dialogue, plotDynamics, characterRelation, characterBehavior,
    conflictStructure, bridgeUnit, reversal, showdown, opening, proseCraft, punctuationTone, contentRubric,
    targetReader, genrePositioning, femaleAudience, upgradeRhythm, chapterStructure, chapterProgression,
    informationLoad, longformContinuity, coreContractCheck, continuityHeat, revisionReceiptCheck,
    deslopRepairCheck, proseMeta, serialRiskRepair, chapterHookQuality, readerRetentionCheck,
    readerRetentionSync, chapterAttraction, storyDriveSync, characterArcSync, chapterBenchmarkSync,
    styleSampleSync, first30RetentionRecheck, innovationSync, volumeBeatSync, blueprintReceipt,
    revisionReceipt, deliveryRiskReceipt, sceneCardReceipt, qualityAudit, platformRubric, governanceRecheckSync,
    deliveryRiskQueue, deliveryRiskConvergence, qualityScore: score, qualityStatus, mustFix,
    optionalImprovements, latestQualityReviewId: latestQuality?.id || null,
    latestEditorReportId: latestReport?.id || null, latestRevisionReviewId: latestRevision?.id || null,
    latestEditorReportSummary, latestRevisionSummary, storyStateSynced, secondaryActions,
  }

  if (admissionStatus === 'accepted_with_warnings') {
    const storyReason = needsStoryStateSync
      ? (storyStatePanel?.headline || '正文已入库，故事状态待补同步')
      : ''
    return {
      visible: true,
      acceptanceStatus: needsStoryStateSync ? 'needs_state_sync' : 'delivered_with_warnings',
      ...admissionFields,
      statusLabel: needsStoryStateSync ? '已入库，待同步状态机' : '已入库，建议修订',
      acceptanceReasons: [
        storyReason,
        ...qualityWarnings.map(item => item.message),
        ...postCommitWarnings.map(item => item.message),
      ].filter(Boolean).slice(0, 4),
      ...admissionCommon,
      approvalBlocker: null,
      recommendedAcceptanceAction: needsStoryStateSync
        ? { key: 'sync_story_state', label: storyStatePanel?.primaryAction?.label || ACTION_LABELS.sync_story_state }
        : { key: 'accept_chapter_and_continue', label: ACTION_LABELS.accept_chapter_and_continue },
      shouldAutoExpandAcceptance: needsStoryStateSync || Boolean(storyStatePanel?.reasons?.length),
    }
  }

  if (admissionStatus === 'accepted') {
    const storyReason = needsStoryStateSync
      ? (storyStatePanel?.headline || '正文已入库，故事状态待补同步')
      : '正文已入库，可以继续下一章。'
    return {
      visible: true,
      acceptanceStatus: needsStoryStateSync ? 'needs_state_sync' : 'delivered',
      ...admissionFields,
      statusLabel: needsStoryStateSync ? '已入库，待同步状态机' : '已入库',
      acceptanceReasons: [storyReason, ...(storyStatePanel?.reasons || [])].filter(Boolean).slice(0, 4),
      ...admissionCommon,
      approvalBlocker: null,
      recommendedAcceptanceAction: needsStoryStateSync
        ? { key: 'sync_story_state', label: storyStatePanel?.primaryAction?.label || ACTION_LABELS.sync_story_state }
        : { key: 'accept_chapter_and_continue', label: ACTION_LABELS.accept_chapter_and_continue },
      shouldAutoExpandAcceptance: needsStoryStateSync,
    }
  }

  if (admissionStatus === 'blocked_invalid') {
    return {
      visible: true,
      acceptanceStatus: 'needs_revision',
      ...admissionFields,
      statusLabel: '正文无效，未入库',
      acceptanceReasons: qualityWarnings.map(item => item.message).concat('正文未通过有效性检查且未入库。').slice(0, 3),
      ...admissionCommon,
      approvalBlocker,
      recommendedAcceptanceAction: { key: 'open_generation_diagnostics', label: ACTION_LABELS.open_generation_diagnostics },
      shouldAutoExpandAcceptance: true,
    }
  }

  if (!latestQuality) {
    return {
      visible: true,
      acceptanceStatus: 'needs_quality_check',
      ...admissionFields,
      statusLabel: '需复检',
      acceptanceReasons: ['本章已有正文，但还没有当前章节的质量复检记录。'],
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      deslopGateDiagnostics,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      qualityAuditSync,
      qualityAuditRepairReceiptSync,
      chapterHandoffSync,
      chapterHandoffDeltaSync,
      writePreparation,
      intentConfirmationSync,
      benchmarkRecallSync,
      sourceReadiness,
      stateTracking,
      styleBoundary,
      informationFlow,
      expectationThreshold,
      storyLoop,
      emotionalArc,
      chapterHook,
      paragraphHook,
      suspense,
      assetLinkage,
      dialogue,
      plotDynamics,
      characterRelation,
      characterBehavior,
      conflictStructure,
      bridgeUnit,
      reversal,
      showdown,
      opening,
      proseCraft,
      punctuationTone,
      contentRubric,
      targetReader,
      genrePositioning,
      femaleAudience,
      upgradeRhythm,
      chapterStructure,
      chapterProgression,
      informationLoad,
      longformContinuity,
      coreContractCheck,
      continuityHeat,
      revisionReceiptCheck,
      deslopRepairCheck,
      proseMeta,
      serialRiskRepair,
      chapterHookQuality,
      readerRetentionCheck,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
      blueprintReceipt,
      revisionReceipt,
      deliveryRiskReceipt,
      sceneCardReceipt,
      qualityAudit,
      platformRubric,
      approvalBlocker,
      governanceRecheckSync,
      deliveryRiskQueue,
      deliveryRiskConvergence,
      qualityScore: null,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary,
      latestRevisionSummary,
      storyStateSynced,
      recommendedAcceptanceAction: { key: 'refresh_current_quality', label: ACTION_LABELS.refresh_current_quality },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  if (revisionNeedsRecheck) {
    return {
      visible: true,
      acceptanceStatus: 'needs_recheck',
      ...admissionFields,
      statusLabel: '修订后需复检',
      acceptanceReasons: ['本章已有修订记录，修订时间晚于最新质量复检。'],
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      deslopGateDiagnostics,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      qualityAuditSync,
      qualityAuditRepairReceiptSync,
      chapterHandoffSync,
      chapterHandoffDeltaSync,
      writePreparation,
      intentConfirmationSync,
      benchmarkRecallSync,
      sourceReadiness,
      stateTracking,
      styleBoundary,
      informationFlow,
      expectationThreshold,
      storyLoop,
      emotionalArc,
      chapterHook,
      paragraphHook,
      suspense,
      assetLinkage,
      dialogue,
      plotDynamics,
      characterRelation,
      characterBehavior,
      conflictStructure,
      bridgeUnit,
      reversal,
      showdown,
      opening,
      proseCraft,
      punctuationTone,
      contentRubric,
      targetReader,
      genrePositioning,
      femaleAudience,
      upgradeRhythm,
      chapterStructure,
      chapterProgression,
      informationLoad,
      longformContinuity,
      coreContractCheck,
      continuityHeat,
      revisionReceiptCheck,
      deslopRepairCheck,
      proseMeta,
      serialRiskRepair,
      chapterHookQuality,
      readerRetentionCheck,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
      blueprintReceipt,
      revisionReceipt,
      deliveryRiskReceipt,
      sceneCardReceipt,
      qualityAudit,
      platformRubric,
      approvalBlocker,
      governanceRecheckSync,
      deliveryRiskQueue,
      deliveryRiskConvergence,
      qualityScore: score,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: latestQuality?.id || null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary,
      latestRevisionSummary,
      storyStateSynced,
      recommendedAcceptanceAction: { key: 'refresh_current_quality', label: ACTION_LABELS.refresh_current_quality },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  if (qualityNeedsRevision) {
    const hasReportFix = Boolean(latestReport && extractMustFix({}, currentReport).length > 0)
    const key: WritingCockpitActionKey = hasReportFix ? 'apply_editor_revision' : 'create_editor_report'
    return {
      visible: true,
      acceptanceStatus: 'needs_revision',
      ...admissionFields,
      statusLabel: '需修订',
      acceptanceReasons: [
        approvalBlocker ? `${approvalBlocker.label}：${approvalBlocker.detail}` : '',
        scoreNeedsRevision ? `质量分 ${score} 低于 ${QUALITY_PASS_THRESHOLD}` : '',
        mustFix.length > 0 ? `必须修复：${mustFix.slice(0, 2).join('；')}` : '',
      ].filter(Boolean).slice(0, 3),
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      deslopGateDiagnostics,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      qualityAuditSync,
      qualityAuditRepairReceiptSync,
      chapterHandoffSync,
      chapterHandoffDeltaSync,
      writePreparation,
      intentConfirmationSync,
      benchmarkRecallSync,
      sourceReadiness,
      stateTracking,
      styleBoundary,
      informationFlow,
      expectationThreshold,
      storyLoop,
      emotionalArc,
      chapterHook,
      paragraphHook,
      suspense,
      assetLinkage,
      dialogue,
      plotDynamics,
      characterRelation,
      characterBehavior,
      conflictStructure,
      bridgeUnit,
      reversal,
      showdown,
      opening,
      proseCraft,
      punctuationTone,
      contentRubric,
      targetReader,
      genrePositioning,
      femaleAudience,
      upgradeRhythm,
      chapterStructure,
      chapterProgression,
      informationLoad,
      longformContinuity,
      coreContractCheck,
      continuityHeat,
      revisionReceiptCheck,
      deslopRepairCheck,
      proseMeta,
      serialRiskRepair,
      chapterHookQuality,
      readerRetentionCheck,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
      blueprintReceipt,
      revisionReceipt,
      deliveryRiskReceipt,
      sceneCardReceipt,
      qualityAudit,
      platformRubric,
      approvalBlocker,
      governanceRecheckSync,
      deliveryRiskQueue,
      deliveryRiskConvergence,
      qualityScore: score,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: latestQuality?.id || null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary,
      latestRevisionSummary,
      storyStateSynced,
      recommendedAcceptanceAction: { key, label: ACTION_LABELS[key] },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  if (!storyStateSynced) {
    return {
      visible: true,
      acceptanceStatus: 'needs_state_sync',
      ...admissionFields,
      statusLabel: '需同步故事状态',
      acceptanceReasons: [
        storyStatePanel?.headline || `故事状态还没有同步到第 ${args.nextChapter.chapter_no} 章。`,
        ...(storyStatePanel?.reasons || []),
      ].filter(Boolean).slice(0, 4),
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      deslopGateDiagnostics,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      qualityAuditSync,
      qualityAuditRepairReceiptSync,
      chapterHandoffSync,
      chapterHandoffDeltaSync,
      writePreparation,
      intentConfirmationSync,
      benchmarkRecallSync,
      sourceReadiness,
      stateTracking,
      styleBoundary,
      informationFlow,
      expectationThreshold,
      storyLoop,
      emotionalArc,
      chapterHook,
      paragraphHook,
      suspense,
      assetLinkage,
      dialogue,
      plotDynamics,
      characterRelation,
      characterBehavior,
      conflictStructure,
      bridgeUnit,
      reversal,
      showdown,
      opening,
      proseCraft,
      punctuationTone,
      contentRubric,
      targetReader,
      genrePositioning,
      femaleAudience,
      upgradeRhythm,
      chapterStructure,
      chapterProgression,
      informationLoad,
      longformContinuity,
      coreContractCheck,
      continuityHeat,
      revisionReceiptCheck,
      deslopRepairCheck,
      proseMeta,
      serialRiskRepair,
      chapterHookQuality,
      readerRetentionCheck,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
      blueprintReceipt,
      revisionReceipt,
      deliveryRiskReceipt,
      sceneCardReceipt,
      qualityAudit,
      platformRubric,
      approvalBlocker,
      governanceRecheckSync,
      deliveryRiskQueue,
      deliveryRiskConvergence,
      qualityScore: score,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: latestQuality?.id || null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary,
      latestRevisionSummary,
      storyStateSynced,
      recommendedAcceptanceAction: { key: 'sync_story_state', label: ACTION_LABELS.sync_story_state },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  return {
    visible: true,
    acceptanceStatus: 'ready_to_accept',
    ...admissionFields,
    statusLabel: '可验收',
    acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
    storylineSync,
    storyUnitSync,
    assetIntake,
    ipSceneIntake,
    signatureSceneSync,
    readabilityReview,
    deslopGateDiagnostics,
    coreDrift,
    runwaySync,
    readerPayoffSync,
    readerExpectationSync,
    qualityAuditSync,
    qualityAuditRepairReceiptSync,
    chapterHandoffSync,
    chapterHandoffDeltaSync,
    writePreparation,
    intentConfirmationSync,
    benchmarkRecallSync,
    sourceReadiness,
    stateTracking,
    styleBoundary,
    informationFlow,
    expectationThreshold,
    storyLoop,
    emotionalArc,
    chapterHook,
    paragraphHook,
    suspense,
    assetLinkage,
    dialogue,
    plotDynamics,
    characterRelation,
    characterBehavior,
    conflictStructure,
    bridgeUnit,
    reversal,
    showdown,
    opening,
    proseCraft,
    punctuationTone,
    contentRubric,
    targetReader,
    genrePositioning,
    femaleAudience,
    upgradeRhythm,
    chapterStructure,
    chapterProgression,
    informationLoad,
    longformContinuity,
    coreContractCheck,
    continuityHeat,
    revisionReceiptCheck,
    deslopRepairCheck,
    proseMeta,
    serialRiskRepair,
    chapterHookQuality,
    readerRetentionCheck,
    readerRetentionSync,
    chapterAttraction,
    storyDriveSync,
    characterArcSync,
    chapterBenchmarkSync,
    styleSampleSync,
    first30RetentionRecheck,
    innovationSync,
    volumeBeatSync,
    blueprintReceipt,
    revisionReceipt,
    deliveryRiskReceipt,
    sceneCardReceipt,
    qualityAudit,
    platformRubric,
    approvalBlocker,
    governanceRecheckSync,
    deliveryRiskQueue,
    deliveryRiskConvergence,
    qualityScore: score,
    qualityStatus,
    mustFix,
    optionalImprovements,
    latestQualityReviewId: latestQuality?.id || null,
    latestEditorReportId: latestReport?.id || null,
    latestRevisionReviewId: latestRevision?.id || null,
    latestEditorReportSummary,
    latestRevisionSummary,
    storyStateSynced,
    recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: ACTION_LABELS.accept_chapter_and_continue },
    secondaryActions,
    shouldAutoExpandAcceptance: false,
  }
}

