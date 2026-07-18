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

export * from './cockpit-acceptance-desk'
