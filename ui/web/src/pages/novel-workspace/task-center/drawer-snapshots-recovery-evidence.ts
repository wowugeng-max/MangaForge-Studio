import {
  parseJsonValue,
} from './chapter-group'
import type {
  StrengthenedRepairAcceptanceTrendSnapshot,
} from './drawer-safe-batch'
import {
  compactEvidenceText,
} from './drawer-model'
import {
  compactAuditList,
} from './drawer-recovery-evidence'

export type RecoveryEvidenceSourceRiskProfileSnapshot = {
  visible: boolean
  status: 'ok' | 'warn'
  label: string
  summary: string
  totalFailureCount: number
  repeatSourceCount: number
  strengthenedAcceptanceTrend: StrengthenedRepairAcceptanceTrendSnapshot | null
  sources: {
    source: string
    label: string
    releaseFailureCount: number
    trendLabel: string
    evidence: string[]
    deepRepairDirection: string
    deepRepairEffect: {
      status: 'none' | 'pending' | 'observing' | 'recurred'
      label: string
      summary: string
      latestRepairRunId: any | null
      latestRepairActionLabel: string
      latestRepairAt: string
      postRepairFailureCount: number
      postRepairEvidence: string[]
      strengthenedClosure: {
        status: 'not_required' | 'needs_repair' | 'pending_recheck' | 'converged' | 'recurred'
        label: string
        summary: string
        latestRepairRunId: any | null
        latestRepairAt: string
        postRepairFailureCount: number
        postRepairEvidence: string[]
      }
    }
  }[]
}

function normalizeStrengthenedRepairAcceptanceTrend(trendLike: any): StrengthenedRepairAcceptanceTrendSnapshot | null {
  const trend = parseJsonValue(trendLike) || trendLike || null
  if (!trend || trend.visible === false) return null
  const status = String(trend?.status || '') === 'warn' ? 'warn' : 'ok'
  const latestStatusText = String(trend?.latest_status || trend?.latestStatus || '').trim()
  const latestStatus = latestStatusText === 'ok' || latestStatusText === 'warn' ? latestStatusText : 'none'
  const dimensions = trend?.dimensions || {}
  const normalizeDimension = (source: any, fallbackLabel: string) => ({
    label: compactEvidenceText(source?.label || fallbackLabel),
    failedCount: Number(source?.failed_count ?? source?.failedCount ?? 0),
  })

  return {
    visible: true,
    status,
    label: compactEvidenceText(trend?.label || '强化恢复验收趋势'),
    summary: compactEvidenceText(trend?.summary || '强化深修恢复后的核心守恒、读者回报和追读拉力趋势已沉淀。'),
    acceptedBatchCount: Number(trend?.accepted_batch_count ?? trend?.acceptedBatchCount ?? 0),
    failedBatchCount: Number(trend?.failed_batch_count ?? trend?.failedBatchCount ?? 0),
    passStreak: Number(trend?.pass_streak ?? trend?.passStreak ?? 0),
    latestStatus,
    latestBatchLabel: compactEvidenceText(trend?.latest_batch_label || trend?.latestBatchLabel || ''),
    latestRunId: trend?.latest_run_id ?? trend?.latestRunId ?? null,
    sourceEvidence: compactAuditList(
      Array.isArray(trend?.source_evidence)
        ? trend.source_evidence
        : Array.isArray(trend?.sourceEvidence)
          ? trend.sourceEvidence
          : [],
      6,
    ),
    dimensions: {
      core: normalizeDimension(dimensions.core, '核心守恒'),
      payoff: normalizeDimension(dimensions.payoff, '读者回报'),
      readerPull: normalizeDimension(dimensions.reader_pull || dimensions.readerPull, '读者拉力'),
    },
  }
}

function recoveryEvidenceSourceDeepRepairDirection(source: string, label: string) {
  if (source === 'single_chapter_governance_recheck') {
    return '回到单章任务书，确认治理复查证据已经写成正文里的可见冲突、对白动作、读者回报和章末钩子。'
  }
  if (source === 'safe_batch_recovery_recheck') {
    return '复盘批次任务书，把多章承诺拆回每章冲突职责、回报落点和剧情线推进，再恢复批量连写。'
  }
  if (source === 'review_governance_closure') {
    return '回到治理复查台，重新确认修后证据、观察项和关闭条件，再让后续正文承接。'
  }
  return `复查${label || '恢复依据来源'}的关闭条件，把抽象依据改成下一章可执行的事件、选择、代价和回报。`
}

function normalizeRecoveryEvidenceSourceDeepRepairEffect(effect: any, fallbackLabel: string): RecoveryEvidenceSourceRiskProfileSnapshot['sources'][number]['deepRepairEffect'] {
  const status = String(effect?.status || '').trim()
  const normalizedStatus = status === 'pending' || status === 'observing' || status === 'recurred' ? status : 'none'
  const defaultLabel = normalizedStatus === 'recurred'
    ? '深修后仍失效'
    : normalizedStatus === 'observing'
      ? '深修后暂无再失效'
      : normalizedStatus === 'pending'
        ? '深修待复查'
        : '未深修'
  const strengthenedClosure = normalizeRecoveryEvidenceSourceStrengthenedClosure(
    effect?.strengthened_repair_closure || effect?.strengthenedRepairClosure,
    fallbackLabel,
    normalizedStatus,
  )
  return {
    status: normalizedStatus,
    label: compactEvidenceText(effect?.label || defaultLabel),
    summary: compactEvidenceText(effect?.summary || `${fallbackLabel || '恢复依据来源'}尚未生成深层修复队列。`),
    latestRepairRunId: effect?.latest_repair_run_id ?? effect?.latestRepairRunId ?? null,
    latestRepairActionLabel: compactEvidenceText(effect?.latest_repair_action_label || effect?.latestRepairActionLabel || ''),
    latestRepairAt: compactEvidenceText(effect?.latest_repair_at || effect?.latestRepairAt || ''),
    postRepairFailureCount: Number(effect?.post_repair_failure_count ?? effect?.postRepairFailureCount ?? 0),
    postRepairEvidence: compactAuditList(Array.isArray(effect?.post_repair_evidence) ? effect.post_repair_evidence : Array.isArray(effect?.postRepairEvidence) ? effect.postRepairEvidence : [], 4),
    strengthenedClosure,
  }
}

function normalizeRecoveryEvidenceSourceStrengthenedClosure(
  closure: any,
  fallbackLabel: string,
  effectStatus: RecoveryEvidenceSourceRiskProfileSnapshot['sources'][number]['deepRepairEffect']['status'],
): RecoveryEvidenceSourceRiskProfileSnapshot['sources'][number]['deepRepairEffect']['strengthenedClosure'] {
  const status = String(closure?.status || '').trim()
  const normalizedStatus = status === 'needs_repair' || status === 'pending_recheck' || status === 'converged' || status === 'recurred'
    ? status
    : effectStatus === 'recurred'
      ? 'needs_repair'
      : 'not_required'
  const defaultLabel = normalizedStatus === 'needs_repair'
    ? '待强化深修'
    : normalizedStatus === 'pending_recheck'
      ? '强化深修待复检'
      : normalizedStatus === 'converged'
        ? '强化深修已收敛'
        : normalizedStatus === 'recurred'
          ? '强化深修后仍复发'
          : '无需强化深修'
  const defaultSummary = normalizedStatus === 'needs_repair'
    ? `${fallbackLabel || '恢复依据来源'}普通深修后仍出现同源放行失败，需要生成强化深修复检。`
    : normalizedStatus === 'pending_recheck'
      ? `${fallbackLabel || '恢复依据来源'}强化深修任务已生成，等待执行后复检同源失败是否收敛。`
      : normalizedStatus === 'converged'
        ? `${fallbackLabel || '恢复依据来源'}强化深修后暂无新的同源放行后失效，可恢复小批量安全连写并继续观察。`
        : normalizedStatus === 'recurred'
          ? `${fallbackLabel || '恢复依据来源'}强化深修后仍出现同源放行失败，继续禁止放宽安全连写。`
          : `${fallbackLabel || '恢复依据来源'}尚未触发强化深修。`
  return {
    status: normalizedStatus,
    label: compactEvidenceText(closure?.label || defaultLabel),
    summary: compactEvidenceText(closure?.summary || defaultSummary),
    latestRepairRunId: closure?.latest_repair_run_id ?? closure?.latestRepairRunId ?? null,
    latestRepairAt: compactEvidenceText(closure?.latest_repair_at || closure?.latestRepairAt || ''),
    postRepairFailureCount: Number(closure?.post_repair_failure_count ?? closure?.postRepairFailureCount ?? 0),
    postRepairEvidence: compactAuditList(Array.isArray(closure?.post_repair_evidence) ? closure.post_repair_evidence : Array.isArray(closure?.postRepairEvidence) ? closure.postRepairEvidence : [], 4),
  }
}

export function buildRecoveryEvidenceSourceRiskProfileSnapshot(batchPreflight: any): RecoveryEvidenceSourceRiskProfileSnapshot | null {
  const profile = parseJsonValue(
    batchPreflight?.recovery_evidence_source_risk_profile
      || batchPreflight?.recoveryEvidenceSourceRiskProfile,
  ) || batchPreflight?.recovery_evidence_source_risk_profile || batchPreflight?.recoveryEvidenceSourceRiskProfile || null
  const strengthenedAcceptanceTrend = normalizeStrengthenedRepairAcceptanceTrend(
    batchPreflight?.strengthened_repair_acceptance_trend
      || batchPreflight?.strengthenedRepairAcceptanceTrend,
  )
  const sources = [
    ...(Array.isArray(profile?.sources) ? profile.sources : []),
  ].map((item: any) => {
    const source = String(item?.source || item?.sourceMode || '').trim()
    const label = compactEvidenceText(item?.label || item?.source_label || item?.sourceLabel || item?.source || '恢复依据来源')
    const releaseFailureCount = Number(item?.release_failure_count || item?.releaseFailureCount || 0)
    const deepRepairEffect = normalizeRecoveryEvidenceSourceDeepRepairEffect(item?.deep_repair_effect || item?.deepRepairEffect, label)
    return {
      source,
      label,
      releaseFailureCount,
      trendLabel: `近${Math.max(1, releaseFailureCount || 1)}轮失败`,
      evidence: compactAuditList(Array.isArray(item?.evidence) ? item.evidence : [], 4),
      deepRepairDirection: recoveryEvidenceSourceDeepRepairDirection(source, label),
      deepRepairEffect,
    }
  }).filter(item => item.source && item.releaseFailureCount > 0)
    .sort((a, b) => b.releaseFailureCount - a.releaseFailureCount)

  if (!sources.length && !strengthenedAcceptanceTrend) return null
  const repeatedSources = sources.filter(item => item.releaseFailureCount >= 2)
  const focus = repeatedSources[0] || sources[0]
  const status = repeatedSources.length > 0 || String(profile?.status || '') === 'warn' || strengthenedAcceptanceTrend?.status === 'warn' ? 'warn' : 'ok'
  return {
    visible: true,
    status,
    label: '恢复依据画像趋势',
    summary: focus
      ? focus.releaseFailureCount >= 2
        ? `${focus.label}近${focus.releaseFailureCount}轮放行后失效，任务中心应先处理深层创作修复，再恢复多章安全连写。`
        : `${focus.label}已有放行后失效记录，任务中心继续观察来源稳定性。`
      : strengthenedAcceptanceTrend?.summary || '暂无恢复依据来源失效趋势。',
    totalFailureCount: Number(profile?.total_failure_count || profile?.totalFailureCount || sources.reduce((sum, item) => sum + item.releaseFailureCount, 0)),
    repeatSourceCount: Number(profile?.repeat_source_count || profile?.repeatSourceCount || repeatedSources.length),
    strengthenedAcceptanceTrend,
    sources,
  }
}

