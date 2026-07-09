import { scanAuthorialForecastRisks } from './authorial-forecast'
import {
  scanBannedWordLeaks,
  scanContextSensitiveWordDensityRisks,
  scanWeakAdverbDensityRisks,
} from './deslop-scans'
import { scanDialogueToneRisks } from './dialogue-tone'
import { scanEndingSummaryRisks } from './ending-summary'
import { scanPayoffDensityRisks } from './emotional-payoff-scans'
import {
  scanModelDegenerationRisks,
  scanProseMetaLeaks,
} from './prose-meta'
import {
  maskYamlFrontMatterForProseScans,
  scanProseFormatRisks,
  scanPunctuationToneRisks,
} from './prose-format'
import { scanRecapFillerRisks } from './prose-craft-scans'
import {
  scanRepeatedReactionRisks,
  scanRepeatedSubjectRisks,
  scanTripleParallelRisks,
  scanUniformRhythmRisks,
} from './rhythm-scans'

function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

const DESLOP_GATE_DEFINITIONS = [
  { gate: 'A', label: '禁用词/模板表达' },
  { gate: 'B', label: '句式套路' },
  { gate: 'C', label: '心理告知/重复描写' },
  { gate: 'D', label: '节奏均匀' },
  { gate: 'E', label: '对话腔调' },
  { gate: 'F', label: '章末总结升华' },
  { gate: 'G', label: '解释腔/上帝视角/安排感' },
] as const

function deslopStatusRank(status: any) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'fail') return 2
  if (normalized === 'warn') return 1
  return 0
}

export function buildDeslopGateDiagnostics(checks: any[] = []) {
  const items = asArray(checks).filter((item: any) => String(item?.gate || '').trim())
  const gates = DESLOP_GATE_DEFINITIONS.map(definition => {
    const gateChecks = items.filter((item: any) => String(item?.gate || '').toUpperCase() === definition.gate)
    const maxRank = gateChecks.reduce((rank, item: any) => Math.max(rank, deslopStatusRank(item?.status)), 0)
    const firstConcern = gateChecks.find((item: any) => deslopStatusRank(item?.status) > 0) || gateChecks[0] || {}
    return {
      gate: definition.gate,
      label: definition.label,
      status: maxRank >= 2 ? 'fail' : maxRank === 1 ? 'warn' : 'pass',
      count: gateChecks.length,
      patterns: Array.from(new Set(gateChecks.map((item: any) => compactBriefText(item?.pattern || item?.label || item?.key)).filter(Boolean))).slice(0, 6),
      evidence: compactBriefText(firstConcern?.evidence),
      fix: compactBriefText(firstConcern?.fix),
    }
  })
  const concernGateCount = gates.filter(item => item.status !== 'pass').length
  return {
    version: 'oh_story_deslop_gate_diagnostics_v1',
    total: items.length,
    concern_gate_count: concernGateCount,
    gates,
    summary: concernGateCount
      ? `去AI味门禁 ${concernGateCount}/7 项需处理，优先修复 fail，其次修复 warn。`
      : '去AI味门禁 A-G 暂未发现确定性问题。',
  }
}

function cleanupReportItemText(value: any) {
  return compactBriefText(value?.fix || value?.required_action || value?.requiredAction || value?.evidence || value?.pattern || value?.label || value?.key || value)
}

export function buildDeterministicProseCleanupReport(chapter: any, text: string) {
  const proseScanText = maskYamlFrontMatterForProseScans(text)
  const modelDegenerationChecks = scanModelDegenerationRisks(proseScanText)
  const proseMetaChecks = scanProseMetaLeaks(proseScanText)
  const proseFormatChecks = scanProseFormatRisks(proseScanText)
  const fillerChecks = scanRecapFillerRisks(proseScanText)
  const payoffDensityChecks = scanPayoffDensityRisks(proseScanText)
  const deslopChecks = [
    ...scanBannedWordLeaks(proseScanText),
    ...scanWeakAdverbDensityRisks(proseScanText),
    ...scanContextSensitiveWordDensityRisks(proseScanText),
    ...scanAuthorialForecastRisks(proseScanText),
    ...scanRepeatedSubjectRisks(proseScanText),
    ...scanTripleParallelRisks(proseScanText),
    ...scanRepeatedReactionRisks(proseScanText),
    ...scanUniformRhythmRisks(proseScanText),
    ...scanDialogueToneRisks(proseScanText),
    ...scanEndingSummaryRisks(proseScanText),
  ]
  const punctuationToneChecks = scanPunctuationToneRisks(proseScanText)
  const categories = [
    {
      type: 'model_degeneration',
      label: '模型退化硬伤',
      priority_repair: '优先处理模型退化',
      checks: modelDegenerationChecks,
    },
    {
      type: 'prose_meta',
      label: '工程词泄露',
      priority_repair: '优先清理工程词',
      checks: proseMetaChecks,
    },
    {
      type: 'prose_format',
      label: '正文格式硬伤',
      priority_repair: '优先修正文格式',
      checks: proseFormatChecks,
    },
    {
      type: 'filler',
      label: '回忆复述水字数',
      priority_repair: '优先删改复述水段',
      checks: fillerChecks,
    },
    {
      type: 'payoff_density',
      label: '回报密度不足',
      priority_repair: '优先补足信息增量和读者回报',
      checks: payoffDensityChecks,
    },
    {
      type: 'deslop',
      label: '去AI味硬伤',
      priority_repair: '优先去AI味',
      checks: deslopChecks,
    },
    {
      type: 'punctuation_tone',
      label: '语气标点硬伤',
      priority_repair: '优先修语气标点',
      checks: punctuationToneChecks,
    },
  ].map(category => ({
    type: category.type,
    label: category.label,
    count: category.checks.length,
    status: category.checks.length > 0 ? 'warn' : 'ok',
    priority_repair: category.priority_repair,
    has_blocking: category.checks.some((item: any) => String(item?.severity || '').toLowerCase() === 'blocking'),
    evidence: category.checks.map((item: any) => compactBriefText(item?.evidence)).filter(Boolean).slice(0, 6),
    required_actions: category.checks.map(cleanupReportItemText).filter(Boolean).slice(0, 6),
  }))
  const failedCategories = categories.filter(category => category.count > 0)
  const priorityCategory = failedCategories.find(category => category.type === 'model_degeneration' && category.has_blocking)
    || failedCategories.find(category => category.type !== 'model_degeneration')
    || failedCategories[0]
  const riskCount = failedCategories.reduce((sum, category) => sum + category.count, 0)
  return {
    version: 'oh_story_deterministic_prose_cleanup_v1',
    chapter_id: Number(chapter?.id || 0) || null,
    chapter_no: Number(chapter?.chapter_no || 0) || null,
    status: riskCount > 0 ? 'warn' : 'ok',
    label: `确定性清理 ${riskCount}`,
    summary: riskCount > 0
      ? `确定性清理发现 ${riskCount} 项模型退化、工程词、正文格式、复述水字数、去AI味或语气标点风险。`
      : '确定性清理未发现工程词、正文格式、复述水字数、去AI味或语气标点硬伤。',
    risk_count: riskCount,
    priority_repair: priorityCategory?.priority_repair || '无需确定性清理',
    categories,
    required_actions: failedCategories.flatMap(category => category.required_actions).slice(0, 12),
    evidence: failedCategories.flatMap(category => category.evidence).slice(0, 12),
  }
}

export function buildQualityGateReviewWithDeterministicCleanup(review: any, cleanup: any) {
  const riskCount = Number(cleanup?.risk_count || cleanup?.riskCount || 0)
  const baseIssues = Array.isArray(review?.issues) ? review.issues : []
  const scoreDefaulted = review?.score_defaulted === true || review?.scoreDefaulted === true
  if (riskCount <= 0) {
    return {
      ...(review || {}),
      score: scoreDefaulted ? Math.max(Number(review?.score || 0) || 80, 85) : review?.score,
      deterministic_score_fallback: scoreDefaulted
        ? {
            reason: 'clean_after_deterministic_cleanup',
            previous_score: Number(review?.score || 0) || 80,
            cleanup_status: cleanup?.status || 'ok',
          }
        : review?.deterministic_score_fallback,
      issues: baseIssues,
    }
  }
  const hardCleanupTypes = new Set(['model_degeneration', 'prose_meta', 'prose_format'])
  const cleanupIssues = asArray(cleanup?.categories)
    .filter((category: any) => Number(category?.count || 0) > 0)
    .map((category: any) => {
      const type = String(category?.type || '')
      const label = compactBriefText(category?.label || type || '确定性清理')
      const evidence = asArray(category?.evidence).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 4)
      const fix = asArray(category?.required_actions || category?.requiredActions).map((item: any) => compactBriefText(item)).filter(Boolean)[0]
        || compactBriefText(cleanup?.required_actions?.[0] || cleanup?.requiredActions?.[0] || cleanup?.priority_repair || cleanup?.priorityRepair)
      const isHardBlocker = Boolean(category?.has_blocking || category?.hasBlocking || hardCleanupTypes.has(type))
      return {
        severity: isHardBlocker ? 'critical' : 'medium',
        category: type === 'punctuation_tone' || type === 'prose_meta' || type === 'prose_format' ? 'format' : 'prose',
        location: cleanup?.chapter_no ? `第${cleanup.chapter_no}章` : '',
        evidence,
        issue: `确定性清理残留：${label} ${Number(category?.count || 0)} 项`,
        fix,
        blocking: isHardBlocker,
      }
    })
  const hasHardBlocker = cleanupIssues.some((issue: any) => issue.blocking)
  return {
    ...(review || {}),
    needs_revision: Boolean(review?.needs_revision || review?.needsRevision || hasHardBlocker),
    deterministic_score_fallback: scoreDefaulted
      ? {
          reason: 'deterministic_cleanup_residuals',
          previous_score: Number(review?.score || 0) || 80,
          cleanup_risk_count: riskCount,
        }
      : review?.deterministic_score_fallback,
    deterministic_prose_cleanup: cleanup,
    issues: [...baseIssues, ...cleanupIssues],
  }
}
