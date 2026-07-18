import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText } from './text-utils'
import { platformCheckNeedsCarryOver } from './platform-carry-over'

export const OH_STORY_REVISION_STRATEGY_ORDER = ['rewrite', 'compress', 'de_ai', 'polish']
export const OH_STORY_FOCUSED_REVISION_MODE_SPECS: Record<string, { strategy: string; label: string; fix: string }> = {
  expand_action: {
    strategy: 'rewrite',
    label: 'expand_action',
    fix: 'expand_action：补足战斗/追逐/清剿/灾祸现场的动作链，写出出手、反应、空间变化、受伤或资源损耗、反制和结果。',
  },
  cut_description: {
    strategy: 'compress',
    label: 'cut_description',
    fix: 'cut_description：压缩不推动剧情的环境描写，尤其是连续氛围段落；保留能影响动作空间、诡异规则和危险判断的描写。',
  },
  tighten_pacing: {
    strategy: 'compress',
    label: 'tighten_pacing',
    fix: 'tighten_pacing：提高事件密度，删掉空泛总结，让每 3-5 段都有行动、选择、信息变化或关系变化。',
  },
  add_consequence: {
    strategy: 'rewrite',
    label: 'add_consequence',
    fix: 'add_consequence：补充行动后果，包括伤势、物品损耗、暴露秘密、角色关系变化、规则代价。',
  },
  restore_hook: {
    strategy: 'rewrite',
    label: 'restore_hook',
    fix: 'restore_hook：保留并强化章末钩子，不要削弱下一章推动力。',
  },
  repair_setting_violation: {
    strategy: 'rewrite',
    label: 'repair_setting_violation',
    fix: 'repair_setting_violation：修复设定工坊违规，确保境界、能力代价、物品归属、Boss行动、规则触发、角色认知边界和禁揭设定全部一致。',
  },
}
export const OH_STORY_FIVE_DIMENSION_SCORE_SPECS = [
  { key: 'core_consistency', label: '核心一致度', strategy: 'rewrite', aliases: ['coreConsistency', 'core', '核心一致度'] },
  { key: 'surface_rewrite', label: '表层重写度', strategy: 'de_ai', aliases: ['surfaceRewrite', 'surface_originality', 'surfaceOriginality', '表层重写度'] },
  { key: 'format_consistency', label: '格式一致度', strategy: 'polish', aliases: ['formatConsistency', 'format', '格式一致度'] },
  { key: 'readability', label: '可读性', strategy: 'de_ai', aliases: ['readability_score', 'readabilityScore', '可读性'] },
  { key: 'logic_coherence', label: '逻辑连贯', strategy: 'rewrite', aliases: ['logicCoherence', 'logic', '逻辑连贯'] },
]
export const OH_STORY_CRAFT_METRIC_SPECS = [
  {
    key: 'action_detail_score',
    label: '动作细节',
    strategy: 'rewrite',
    threshold: 70,
    direction: 'low',
    aliases: ['actionDetailScore', 'action_detail', '动作细节'],
    fix: 'action_detail_score：补足动作链，写出起手、反应、空间变化、受伤或资源损耗、反制和结果。',
  },
  {
    key: 'event_density_score',
    label: '事件密度',
    strategy: 'compress',
    threshold: 70,
    direction: 'low',
    aliases: ['eventDensityScore', 'event_density', '事件密度'],
    fix: 'event_density_score：提高事件密度，删掉空泛总结，让每 3-5 段都有行动、选择、信息变化或关系变化。',
  },
  {
    key: 'combat_process_score',
    label: '战斗过程',
    strategy: 'rewrite',
    threshold: 70,
    direction: 'low',
    aliases: ['combatProcessScore', 'combat_process', '战斗过程'],
    fix: 'combat_process_score：补战斗/追逐/对抗过程，必须写出出手、反应、空间变化、损耗、反制和结果，不能只报胜负。',
  },
  {
    key: 'setting_consistency_score',
    label: '设定一致性',
    strategy: 'rewrite',
    threshold: 70,
    direction: 'low',
    aliases: ['settingConsistencyScore', 'setting_consistency', '设定一致性'],
    fix: 'setting_consistency_score：修复设定一致性，校准能力代价、物品归属、规则触发、角色认知边界和禁揭设定。',
  },
  {
    key: 'description_overuse_score',
    label: '环境描写过量',
    strategy: 'compress',
    threshold: 70,
    direction: 'high',
    aliases: ['descriptionOveruseScore', 'description_overuse', '环境描写过量'],
    fix: 'description_overuse_score：压缩不推动剧情、信息或情绪变化的环境描写；只保留影响动作空间、规则判断或危险判断的细节。',
  },
]

export function normalizeRevisionStrategy(value: any) {
  const text = String(value || '').trim().toLowerCase()
  return OH_STORY_REVISION_STRATEGY_ORDER.find(strategy => text === strategy || text.includes(strategy)) || ''
}

export function fiveDimensionRawValue(input: any, spec: any) {
  if (!input) return undefined
  if (Array.isArray(input)) {
    return input.find((item: any) => {
      const key = String(item?.key || item?.dimension || item?.name || item?.label || '').trim()
      return key === spec.key || key === spec.label || spec.aliases.includes(key)
    })
  }
  for (const key of [spec.key, ...spec.aliases]) {
    if (Object.prototype.hasOwnProperty.call(input, key)) return input[key]
  }
  return undefined
}

export function numericMetricScore(raw: any) {
  const score = typeof raw === 'object'
    ? Number(raw.score ?? raw.value ?? raw.points ?? raw.rating ?? raw.risk_score ?? raw.riskScore)
    : Number(raw)
  return Number.isFinite(score) ? score : null
}

export function metricStatusNeedsRevision(raw: any) {
  if (!raw || typeof raw !== 'object') return false
  return platformCheckNeedsCarryOver({
    status: raw.status ?? raw.state ?? raw.verdict ?? raw.result,
  })
}

export function normalizeCraftMetricRisks(value: any) {
  const metrics = OH_STORY_CRAFT_METRIC_SPECS
    .map(spec => {
      const raw = fiveDimensionRawValue(value, spec)
      if (raw === undefined || raw === null || raw === '') return null
      const score = numericMetricScore(raw)
      const statusNeedsRevision = metricStatusNeedsRevision(raw)
      if (score === null && !statusNeedsRevision) return null
      const scoreNeedsRevision = score !== null
        ? spec.direction === 'high'
          ? score >= spec.threshold
          : score < spec.threshold
        : false
      if (!scoreNeedsRevision && !statusNeedsRevision) return null
      return {
        key: spec.key,
        label: spec.label,
        score,
        threshold: spec.threshold,
        direction: spec.direction,
        strategy: spec.strategy,
        evidence: compactBriefText(
          typeof raw === 'object'
            ? (raw.evidence || raw.reason || raw.summary || raw.comment || raw.issue)
            : `${spec.label} ${score}，触发 ${spec.direction === 'high' ? '过量' : '低分'}修订阈值 ${spec.threshold}。`,
        ),
        fix: compactBriefText(typeof raw === 'object' ? (raw.fix || raw.suggestion || raw.repair_instruction || raw.repairInstruction) : '', spec.fix),
      }
    })
    .filter(Boolean)
  return metrics
}

export function normalizeSettingViolationRisks(value: any) {
  return asArray(value)
    .map((item: any, index: number) => {
      const name = compactBriefText(item?.setting_name || item?.settingName || item?.name || item?.key || `setting_violation_${index + 1}`)
      const type = compactBriefText(item?.type || item?.category || item?.field)
      const description = compactBriefText(item?.description || item?.issue || item?.evidence || item?.reason || item?.message || item)
      const fix = compactBriefText(item?.fix || item?.repair_instruction || item?.repairInstruction || item?.suggestion || item?.required_action || item?.requiredAction)
      if (!name && !description && !fix) return null
      return {
        key: name || `setting_violation_${index + 1}`,
        label: type ? `设定违规-${type}` : '设定违规',
        status: 'warn',
        evidence: description || name,
        fix: fix || `修复 ${name || '设定违规'}，确保能力代价、物品归属、规则触发、角色认知边界和禁揭设定一致。`,
        strategy: 'rewrite',
      }
    })
    .filter(Boolean)
    .slice(0, 8)
}

export function normalizeFiveDimensionQualityScores(value: any, threshold = 78) {
  const dimensions = OH_STORY_FIVE_DIMENSION_SCORE_SPECS
    .map(spec => {
      const raw = fiveDimensionRawValue(value, spec)
      if (raw === undefined || raw === null || raw === '') return null
      const score = typeof raw === 'object'
        ? Number(raw.score ?? raw.value ?? raw.points ?? raw.rating)
        : Number(raw)
      if (!Number.isFinite(score)) return null
      return {
        key: spec.key,
        label: spec.label,
        score,
        strategy: spec.strategy,
        evidence: compactBriefText(typeof raw === 'object' ? (raw.evidence || raw.reason || raw.summary || raw.comment) : ''),
        fix: compactBriefText(typeof raw === 'object' ? (raw.fix || raw.suggestion || raw.repair_instruction || raw.repairInstruction) : ''),
      }
    })
    .filter(Boolean)
  const sorted = [...dimensions].sort((a: any, b: any) => Number(a.score || 0) - Number(b.score || 0))
  const average = dimensions.length
    ? Math.round(dimensions.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / dimensions.length)
    : null
  return {
    version: 'oh_story_five_dimension_scores_v1',
    dimensions,
    average_score: average,
    lowest_dimension: sorted[0] || null,
    below_threshold: dimensions.filter((item: any) => Number(item.score || 0) < threshold),
    threshold,
  }
}

