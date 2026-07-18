import { parseJsonValue } from './chapter-group'
import type {
  SafeBatchDefaultFiveChapterLaneTemplateFailedRequirementSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot,
  SafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot,
  SafeBatchDefaultFiveChapterRecoveryVerdictSnapshot,
  SafeBatchDefaultFiveChapterRegressionSnapshot,
  SafeBatchRecoveryRestoreStabilityEvidenceSnapshot,
  SafeBatchRecoveryRestoreStabilityLaneSnapshot,
} from './drawer-model'
import {
  compactEvidenceText,
  isDefaultFiveChapterLaneRequirementKey,
  normalizeChapterNos,
  normalizeEvidenceTextList,
} from './drawer-model'

function buildSafeBatchDefaultFiveChapterLaneTemplateFailedRequirementsSnapshot(requirementsLike: any): SafeBatchDefaultFiveChapterLaneTemplateFailedRequirementSnapshot[] {
  const requirements = Array.isArray(requirementsLike) ? requirementsLike : []
  return requirements
    .map((item: any) => ({
      key: compactEvidenceText(item?.key || ''),
      label: compactEvidenceText(item?.label || item?.name || item?.key || ''),
      failureReason: compactEvidenceText(item?.failure_reason || item?.failureReason || ''),
      chapterNos: normalizeChapterNos(item?.chapter_nos || item?.chapterNos),
    }))
    .filter((item: any) => item.key || item.label || item.failureReason || item.chapterNos.length)
}

function buildSafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot(verdictLike: any): SafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot | null {
  const verdict = parseJsonValue(verdictLike) || verdictLike || null
  if (!verdict || verdict.visible === false) return null
  const rawStatus = compactEvidenceText(verdict?.status || '')
  const failedRequirements = buildSafeBatchDefaultFiveChapterLaneTemplateFailedRequirementsSnapshot(
    verdict?.failed_requirements || verdict?.failedRequirements,
  )
  const snapshot = {
    visible: true,
    status: rawStatus === 'failed' ? 'failed' as const : 'passed' as const,
    label: compactEvidenceText(verdict?.label || '默认档位模板生产后验判定'),
    templateVersionId: compactEvidenceText(verdict?.template_version_id || verdict?.templateVersionId || ''),
    defaultBatchChapterNos: normalizeChapterNos(verdict?.default_batch_chapter_nos || verdict?.defaultBatchChapterNos),
    restoreChapterNos: normalizeChapterNos(verdict?.restore_chapter_nos || verdict?.restoreChapterNos),
    previousValidationChapterNos: normalizeChapterNos(verdict?.previous_validation_chapter_nos || verdict?.previousValidationChapterNos),
    validationChapterNos: normalizeChapterNos(verdict?.validation_chapter_nos || verdict?.validationChapterNos),
    failureReasons: normalizeEvidenceTextList(verdict?.failure_reasons || verdict?.failureReasons),
    clearedFailureReasons: normalizeEvidenceTextList(verdict?.cleared_failure_reasons || verdict?.clearedFailureReasons),
    remainingFailureReasons: normalizeEvidenceTextList(verdict?.remaining_failure_reasons || verdict?.remainingFailureReasons),
    failureReasonStatuses: (Array.isArray(verdict?.failure_reason_statuses)
      ? verdict.failure_reason_statuses
      : Array.isArray(verdict?.failureReasonStatuses)
        ? verdict.failureReasonStatuses
        : []
    ).map((item: any) => {
      const statusText = compactEvidenceText(item?.status || '')
      return {
        reason: compactEvidenceText(item?.reason || ''),
        status: statusText === 'remaining' ? 'remaining' as const : 'cleared' as const,
        riskCount: Number(item?.risk_count ?? item?.riskCount ?? 0),
      }
    }).filter((item: any) => item.reason),
    failedCount: Number(verdict?.failed_count ?? verdict?.failedCount ?? failedRequirements.length),
    failedRequirements,
    summary: compactEvidenceText(verdict?.summary || ''),
  }
  if (!snapshot.summary && !snapshot.failureReasons.length && !snapshot.failedRequirements.length) return null
  return snapshot
}

export function buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(versionLike: any): SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot | null {
  const version = parseJsonValue(versionLike) || versionLike || null
  if (!version || version.visible === false) return null
  const id = compactEvidenceText(version?.id || version?.template_version_id || version?.templateVersionId || version?.version_id || version?.versionId || '')
  const snapshot = {
    id,
    label: compactEvidenceText(version?.label || '默认5章档位模板版本'),
    source: compactEvidenceText(version?.source || ''),
    redesignSource: compactEvidenceText(version?.redesign_source || version?.redesignSource || ''),
    sourceRunId: version?.source_run_id ?? version?.sourceRunId ?? null,
    summary: compactEvidenceText(version?.summary || ''),
    latestStatus: compactEvidenceText(version?.latest_status || version?.latestStatus || ''),
    latestBatchCreatedAt: compactEvidenceText(version?.latest_batch_created_at || version?.latestBatchCreatedAt || ''),
    latestChapterNos: normalizeChapterNos(version?.latest_chapter_nos || version?.latestChapterNos),
    validationBatchCount: Number(version?.validation_batch_count ?? version?.validationBatchCount ?? 0),
    passedBatchCount: Number(version?.passed_batch_count ?? version?.passedBatchCount ?? 0),
    failedBatchCount: Number(version?.failed_batch_count ?? version?.failedBatchCount ?? 0),
    passStreak: Number(version?.pass_streak ?? version?.passStreak ?? 0),
    requiredPassStreak: Number(version?.required_pass_streak ?? version?.requiredPassStreak ?? 0),
    status: compactEvidenceText(version?.status || ''),
    productionValidationFailedCount: Number(version?.production_validation_failed_count ?? version?.productionValidationFailedCount ?? 0),
    latestProductionRelapseVerdict: buildSafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot(
      version?.latest_production_relapse_verdict || version?.latestProductionRelapseVerdict,
    ),
  }
  if (!snapshot.id && !snapshot.summary && !snapshot.sourceRunId && !snapshot.redesignSource) return null
  return snapshot
}

export function buildSafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot(verdictLike: any): SafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot | null {
  const verdict = parseJsonValue(verdictLike) || verdictLike || null
  if (!verdict || verdict.visible === false) return null
  const rawStatus = compactEvidenceText(verdict?.status || '')
  const status = rawStatus === 'failed' ? 'failed' : 'passed'
  const requirements = (Array.isArray(verdict?.requirements)
    ? verdict.requirements
    : Array.isArray(verdict?.items)
      ? verdict.items
      : []
  ).map((item: any) => {
    const itemStatus = compactEvidenceText(item?.status || '')
    return {
      key: compactEvidenceText(item?.key || ''),
      label: compactEvidenceText(item?.label || item?.name || item?.key || ''),
      status: itemStatus === 'missing'
        ? 'missing' as const
        : itemStatus === 'unverified'
          ? 'unverified' as const
          : 'fulfilled' as const,
    }
  }).filter((item: any) => item.key || item.label)
  const missingRequirements = (Array.isArray(verdict?.missing_requirements)
    ? verdict.missing_requirements
    : Array.isArray(verdict?.missingRequirements)
      ? verdict.missingRequirements
      : []
  ).map((item: any) => ({
    key: compactEvidenceText(item?.key || ''),
    label: compactEvidenceText(item?.label || item?.name || item?.key || ''),
    chapterNos: normalizeChapterNos(item?.chapter_nos || item?.chapterNos),
  })).filter((item: any) => item.key || item.label || item.chapterNos.length)
  const missingCount = Number(verdict?.missing_count ?? verdict?.missingCount ?? missingRequirements.reduce((sum: number, item: any) => sum + item.chapterNos.length, 0))
  const productionRelapseVerdict = buildSafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot(
    verdict?.production_relapse_verdict || verdict?.productionRelapseVerdict,
  )
  const productionFailedRequirements = buildSafeBatchDefaultFiveChapterLaneTemplateFailedRequirementsSnapshot(
    verdict?.production_failed_requirements
      || verdict?.productionFailedRequirements
      || productionRelapseVerdict?.failedRequirements,
  )
  const productionFailedCount = Number(verdict?.production_failed_count ?? verdict?.productionFailedCount ?? productionRelapseVerdict?.failedCount ?? productionFailedRequirements.length)
  const snapshot = {
    visible: true,
    status,
    label: compactEvidenceText(verdict?.label || '默认档位模板回检'),
    summary: compactEvidenceText(verdict?.summary || ''),
    validationChapterNos: normalizeChapterNos(verdict?.validation_chapter_nos || verdict?.validationChapterNos),
    requirements,
    missingCount: Number.isFinite(missingCount) ? missingCount : 0,
    missingRequirements,
    productionFailedCount: Number.isFinite(productionFailedCount) ? productionFailedCount : 0,
    productionRelapseVerdict,
    productionFailedRequirements,
    templateVersion: buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(
      verdict?.template_version || verdict?.templateVersion,
    ),
  }
  if (!snapshot.summary && !snapshot.requirements.length && !snapshot.missingRequirements.length && !snapshot.productionRelapseVerdict) return null
  return snapshot
}

export function buildSafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot(profileLike: any): SafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot | null {
  const profile = parseJsonValue(profileLike) || profileLike || null
  if (!profile || profile.visible === false) return null
  const requirements = (Array.isArray(profile?.requirements)
    ? profile.requirements
    : Array.isArray(profile?.items)
      ? profile.items
      : []
  ).map((item: any) => ({
    key: compactEvidenceText(item?.key || ''),
    label: compactEvidenceText(item?.label || item?.name || item?.key || ''),
    passedCount: Number(item?.passed_count ?? item?.passedCount ?? 0),
    failedCount: Number(item?.failed_count ?? item?.failedCount ?? 0),
    latestStatus: compactEvidenceText(item?.latest_status || item?.latestStatus || ''),
    latestMissingChapterNos: normalizeChapterNos(item?.latest_missing_chapter_nos || item?.latestMissingChapterNos),
  })).filter((item: any) => item.key || item.label || item.passedCount > 0 || item.failedCount > 0)
  const topFailedRaw = profile?.top_failed_requirement || profile?.topFailedRequirement || null
  const topFailedRequirement = topFailedRaw ? {
    key: compactEvidenceText(topFailedRaw?.key || ''),
    label: compactEvidenceText(topFailedRaw?.label || topFailedRaw?.name || topFailedRaw?.key || ''),
    failedCount: Number(topFailedRaw?.failed_count ?? topFailedRaw?.failedCount ?? 0),
  } : null
  const templateVersionProfiles = (Array.isArray(profile?.template_version_profiles)
    ? profile.template_version_profiles
    : Array.isArray(profile?.templateVersionProfiles)
      ? profile.templateVersionProfiles
      : []
  ).map(buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot)
    .filter(Boolean) as SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot[]
  const latestTemplateVersionProfile = buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(
    profile?.latest_template_version_profile || profile?.latestTemplateVersionProfile,
  )
  const snapshot = {
    visible: true,
    status: compactEvidenceText(profile?.status || ''),
    label: compactEvidenceText(profile?.label || '默认档位模板稳定性'),
    summary: compactEvidenceText(profile?.summary || ''),
    latestStatus: compactEvidenceText(profile?.latest_status || profile?.latestStatus || ''),
    latestBatchCreatedAt: compactEvidenceText(profile?.latest_batch_created_at || profile?.latestBatchCreatedAt || ''),
    latestChapterNos: normalizeChapterNos(profile?.latest_chapter_nos || profile?.latestChapterNos),
    validationBatchCount: Number(profile?.validation_batch_count ?? profile?.validationBatchCount ?? 0),
    passedBatchCount: Number(profile?.passed_batch_count ?? profile?.passedBatchCount ?? 0),
    failedBatchCount: Number(profile?.failed_batch_count ?? profile?.failedBatchCount ?? 0),
    passStreak: Number(profile?.pass_streak ?? profile?.passStreak ?? 0),
    requiredPassStreak: Number(profile?.required_pass_streak ?? profile?.requiredPassStreak ?? 0),
    recommendation: compactEvidenceText(profile?.recommendation || ''),
    failedRequirementCount: Number(profile?.failed_requirement_count ?? profile?.failedRequirementCount ?? 0),
    requirements,
    topFailedRequirement: topFailedRequirement && (topFailedRequirement.key || topFailedRequirement.label || topFailedRequirement.failedCount > 0)
      ? topFailedRequirement
      : null,
    templateVersionProfiles,
    latestTemplateVersionProfile,
  }
  if (!snapshot.summary && !snapshot.requirements.length && snapshot.validationBatchCount <= 0) return null
  return snapshot
}

export function buildSafeBatchDefaultFiveChapterRecoveryVerdictSnapshot(verdictLike: any): SafeBatchDefaultFiveChapterRecoveryVerdictSnapshot | null {
  const verdict = parseJsonValue(verdictLike) || verdictLike || null
  if (!verdict || verdict.visible === false) return null
  const rawStatus = compactEvidenceText(verdict?.status || '')
  const status = rawStatus === 'failed' ? 'failed' : 'passed'
  const failureReasonStatuses = (Array.isArray(verdict?.failure_reason_statuses)
    ? verdict.failure_reason_statuses
    : Array.isArray(verdict?.failureReasonStatuses)
      ? verdict.failureReasonStatuses
      : []
  ).map((item: any) => {
    const itemStatus = compactEvidenceText(item?.status || '')
    return {
      reason: compactEvidenceText(item?.reason || ''),
      status: itemStatus === 'remaining' ? 'remaining' as const : 'cleared' as const,
      riskCount: Number(item?.risk_count ?? item?.riskCount ?? 0),
    }
  }).filter((item: any) => item.reason)
  const snapshot = {
    visible: true,
    status,
    label: compactEvidenceText(verdict?.label || '默认档位恢复判定'),
    summary: compactEvidenceText(verdict?.summary || ''),
    defaultBatchChapterNos: normalizeChapterNos(verdict?.default_batch_chapter_nos || verdict?.defaultBatchChapterNos),
    restoreChapterNos: normalizeChapterNos(verdict?.restore_chapter_nos || verdict?.restoreChapterNos),
    previousValidationChapterNos: normalizeChapterNos(verdict?.previous_validation_chapter_nos || verdict?.previousValidationChapterNos),
    validationChapterNos: normalizeChapterNos(verdict?.validation_chapter_nos || verdict?.validationChapterNos),
    failureReasons: normalizeEvidenceTextList(verdict?.failure_reasons || verdict?.failureReasons),
    clearedFailureReasons: normalizeEvidenceTextList(verdict?.cleared_failure_reasons || verdict?.clearedFailureReasons),
    remainingFailureReasons: normalizeEvidenceTextList(verdict?.remaining_failure_reasons || verdict?.remainingFailureReasons),
    failureReasonStatuses,
  }
  if (!snapshot.summary && !snapshot.failureReasons.length && !snapshot.failureReasonStatuses.length) return null
  return snapshot
}

export function buildSafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot(relapseLike: any): SafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot | null {
  const relapse = parseJsonValue(relapseLike) || relapseLike || null
  if (!relapse || relapse.visible === false) return null
  const hotspot = relapse?.repeated_hotspot_segment || relapse?.repeatedHotspotSegment || null
  const failureReasonStatuses = (Array.isArray(relapse?.failure_reason_statuses)
    ? relapse.failure_reason_statuses
    : Array.isArray(relapse?.failureReasonStatuses)
      ? relapse.failureReasonStatuses
      : []
  ).map((item: any) => {
    const itemStatus = compactEvidenceText(item?.status || '')
    return {
      reason: compactEvidenceText(item?.reason || ''),
      status: itemStatus === 'stable' ? 'stable' as const : 'relapsed' as const,
      riskCount: Number(item?.risk_count ?? item?.riskCount ?? 0),
    }
  }).filter((item: any) => item.reason)
  const snapshot = {
    visible: true,
    status: compactEvidenceText(relapse?.status || 'relapsed'),
    label: compactEvidenceText(relapse?.label || '恢复判定失效'),
    source: compactEvidenceText(relapse?.source || ''),
    summary: compactEvidenceText(relapse?.summary || ''),
    defaultBatchChapterNos: normalizeChapterNos(relapse?.default_batch_chapter_nos || relapse?.defaultBatchChapterNos),
    restoreChapterNos: normalizeChapterNos(relapse?.restore_chapter_nos || relapse?.restoreChapterNos),
    previousValidationChapterNos: normalizeChapterNos(relapse?.previous_validation_chapter_nos || relapse?.previousValidationChapterNos),
    validationChapterNos: normalizeChapterNos(relapse?.validation_chapter_nos || relapse?.validationChapterNos),
    relapseBatchChapterNos: normalizeChapterNos(relapse?.relapse_batch_chapter_nos || relapse?.relapseBatchChapterNos),
    relapsedChapterNos: normalizeChapterNos(relapse?.relapsed_chapter_nos || relapse?.relapsedChapterNos),
    repeatedHotspotSegment: hotspot ? {
      key: compactEvidenceText(hotspot?.key || ''),
      label: compactEvidenceText(hotspot?.label || hotspot?.key || '复发段位'),
      riskCount: Number(hotspot?.risk_count ?? hotspot?.riskCount ?? 0),
    } : null,
    failureReasons: normalizeEvidenceTextList(relapse?.failure_reasons || relapse?.failureReasons),
    clearedFailureReasons: normalizeEvidenceTextList(relapse?.cleared_failure_reasons || relapse?.clearedFailureReasons),
    relapsedFailureReasons: normalizeEvidenceTextList(relapse?.relapsed_failure_reasons || relapse?.relapsedFailureReasons),
    stableFailureReasons: normalizeEvidenceTextList(relapse?.stable_failure_reasons || relapse?.stableFailureReasons),
    failureReasonStatuses,
  }
  if (!snapshot.summary && !snapshot.relapsedFailureReasons.length && !snapshot.failureReasonStatuses.length) return null
  return snapshot
}

export function buildSafeBatchRecoveryRestoreStabilityEvidenceSnapshot(evidenceLike: any): SafeBatchRecoveryRestoreStabilityEvidenceSnapshot | null {
  const evidence = parseJsonValue(evidenceLike) || evidenceLike || null
  if (!evidence || evidence.visible === false) return null
  const restoreChapterNos = normalizeChapterNos(evidence?.restore_chapter_nos || evidence?.restoreChapterNos)
  const validationChapterNos = normalizeChapterNos(evidence?.validation_chapter_nos || evidence?.validationChapterNos)
  const stablePassStreak = Number(evidence?.stable_pass_streak ?? evidence?.stablePassStreak ?? 0)
  const snapshot = {
    status: compactEvidenceText(evidence?.status || ''),
    source: compactEvidenceText(evidence?.source || ''),
    restoredBatchCreatedAt: compactEvidenceText(evidence?.restored_batch_created_at || evidence?.restoredBatchCreatedAt || ''),
    restoreChapterNos,
    validationChapterNos,
    stablePassStreak: Number.isFinite(stablePassStreak) ? stablePassStreak : 0,
    summary: compactEvidenceText(evidence?.summary || ''),
  }
  if (!snapshot.status && !snapshot.source && !snapshot.restoreChapterNos.length && !snapshot.validationChapterNos.length && !snapshot.summary) return null
  return snapshot
}

export function buildSafeBatchRecoveryRestoreStabilityLaneSnapshot(
  laneLike: any,
  fallbackEvidence?: SafeBatchRecoveryRestoreStabilityEvidenceSnapshot | null,
): SafeBatchRecoveryRestoreStabilityLaneSnapshot | null {
  const lane = parseJsonValue(laneLike) || laneLike || null
  if (!lane || lane.visible === false) return null
  const stablePassStreak = Number(lane?.stable_pass_streak ?? lane?.stablePassStreak ?? fallbackEvidence?.stablePassStreak ?? 0)
  const requiredStablePassStreak = Number(lane?.required_stable_pass_streak ?? lane?.requiredStablePassStreak ?? 2)
  const normalizedStablePassStreak = Number.isFinite(stablePassStreak) ? stablePassStreak : 0
  const normalizedRequiredStablePassStreak = Number.isFinite(requiredStablePassStreak) && requiredStablePassStreak > 0
    ? requiredStablePassStreak
    : 2
  const rawStatus = compactEvidenceText(lane?.status || '')
  const explicitDefaultFiveChapterReady = lane?.default_five_chapter_ready ?? lane?.defaultFiveChapterReady
  const defaultFiveChapterReady = explicitDefaultFiveChapterReady === undefined || explicitDefaultFiveChapterReady === null
    ? rawStatus === 'ready' || normalizedStablePassStreak >= normalizedRequiredStablePassStreak
    : Boolean(explicitDefaultFiveChapterReady)
  const status = rawStatus || (defaultFiveChapterReady ? 'ready' : 'observing')
  const label = compactEvidenceText(lane?.label || (defaultFiveChapterReady ? '默认5章档位' : '5章观察批'))
  const restoreChapterNos = normalizeChapterNos(lane?.restore_chapter_nos || lane?.restoreChapterNos)
  const validationChapterNos = normalizeChapterNos(lane?.validation_chapter_nos || lane?.validationChapterNos)
  const summary = compactEvidenceText(lane?.summary || fallbackEvidence?.summary || '')
  const latestTemplateVersionProfile = buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(
    lane?.latest_template_version_profile || lane?.latestTemplateVersionProfile,
  )
  const snapshot = {
    visible: true,
    status,
    label,
    source: compactEvidenceText(lane?.source || fallbackEvidence?.source || ''),
    stablePassStreak: normalizedStablePassStreak,
    requiredStablePassStreak: normalizedRequiredStablePassStreak,
    defaultFiveChapterReady,
    restoreChapterNos: restoreChapterNos.length ? restoreChapterNos : fallbackEvidence?.restoreChapterNos || [],
    validationChapterNos: validationChapterNos.length ? validationChapterNos : fallbackEvidence?.validationChapterNos || [],
    summary,
    taskCenterFilterLabel: compactEvidenceText(lane?.task_center_filter_label || lane?.taskCenterFilterLabel || `批次复盘筛选：${label}`),
    latestTemplateVersionProfile,
  }
  if (!snapshot.status && !snapshot.label && !snapshot.restoreChapterNos.length && !snapshot.validationChapterNos.length && !snapshot.summary) return null
  return snapshot
}

export function buildSafeBatchDefaultFiveChapterRegressionSnapshot(regressionLike: any): SafeBatchDefaultFiveChapterRegressionSnapshot | null {
  const regression = parseJsonValue(regressionLike) || regressionLike || null
  if (!regression || regression.visible === false) return null
  const hotspot = regression?.repeated_hotspot_segment || regression?.repeatedHotspotSegment || null
  const stablePassStreak = Number(regression?.stable_pass_streak ?? regression?.stablePassStreak ?? 0)
  const requiredStablePassStreak = Number(regression?.required_stable_pass_streak ?? regression?.requiredStablePassStreak ?? 2)
  const failureReasons = (Array.isArray(regression?.failure_reasons)
    ? regression.failure_reasons
    : Array.isArray(regression?.failureReasons)
      ? regression.failureReasons
      : []
  ).map((item: any) => compactEvidenceText(item)).filter(Boolean)
  const templateVersion = buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(
    regression?.template_version || regression?.templateVersion,
  )
  const templateVersionId = compactEvidenceText(
    regression?.template_version_id || regression?.templateVersionId || templateVersion?.id || '',
  )
  const templateVersionFailedRequirements = (Array.isArray(regression?.template_version_failed_requirements)
    ? regression.template_version_failed_requirements
    : Array.isArray(regression?.templateVersionFailedRequirements)
      ? regression.templateVersionFailedRequirements
      : []
  ).map((item: any) => ({
    key: compactEvidenceText(item?.key || ''),
    label: compactEvidenceText(item?.label || item?.key || ''),
    failureReason: compactEvidenceText(item?.failure_reason || item?.failureReason || ''),
  })).filter((item: any) => item.key || item.label || item.failureReason)
  const snapshot = {
    visible: true,
    status: compactEvidenceText(regression?.status || ''),
    label: compactEvidenceText(regression?.label || '默认5章档位回退原因'),
    source: compactEvidenceText(regression?.source || ''),
    stablePassStreak: Number.isFinite(stablePassStreak) ? stablePassStreak : 0,
    requiredStablePassStreak: Number.isFinite(requiredStablePassStreak) && requiredStablePassStreak > 0 ? requiredStablePassStreak : 2,
    defaultBatchChapterNos: normalizeChapterNos(regression?.default_batch_chapter_nos || regression?.defaultBatchChapterNos),
    restoreChapterNos: normalizeChapterNos(regression?.restore_chapter_nos || regression?.restoreChapterNos),
    validationChapterNos: normalizeChapterNos(regression?.validation_chapter_nos || regression?.validationChapterNos),
    repeatedHotspotSegment: hotspot ? {
      key: compactEvidenceText(hotspot?.key || ''),
      label: compactEvidenceText(hotspot?.label || hotspot?.key || '复发段位'),
      riskCount: Number(hotspot?.risk_count ?? hotspot?.riskCount ?? 0),
    } : null,
    failureReasons,
    templateVersionId,
    templateVersion,
    templateVersionFailedRequirements,
    summary: compactEvidenceText(regression?.summary || ''),
  }
  if (!snapshot.status && !snapshot.defaultBatchChapterNos.length && !snapshot.summary) return null
  return snapshot
}

