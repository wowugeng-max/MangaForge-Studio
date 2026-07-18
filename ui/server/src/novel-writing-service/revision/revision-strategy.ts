import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import { platformCheckNeedsCarryOver } from '../quality/platform-carry-over'
import {
  OH_STORY_REVISION_STRATEGY_ORDER,
  OH_STORY_FOCUSED_REVISION_MODE_SPECS,
  normalizeRevisionStrategy,
  normalizeCraftMetricRisks,
  normalizeSettingViolationRisks,
  normalizeFiveDimensionQualityScores,
} from '../quality/five-dimension-scores'
import { proseQualityGateFailureRisks } from '../quality/prose-quality-risks'

function inferRevisionStrategy(check: any, fieldName = '') {
  const explicit = normalizeRevisionStrategy(
    check?.strategy
    || check?.revision_strategy
    || check?.revisionStrategy
    || check?.repair_strategy
    || check?.repairStrategy,
  )
  if (explicit) return explicit
  const text = [
    fieldName,
    check?.key,
    check?.label,
    check?.category,
    check?.gate,
    check?.pattern,
    check?.evidence,
    check?.issue,
    check?.fix,
  ].map(item => String(item || '')).join('｜')
  if (/serial_risk|recent_fatigue_action|风险修复|近章风险|ten_chapter_selling_point|十章卖点|卖点复核|核心卖点|能力使用|规则限制|读者回报|章末新期待/.test(text)) return 'rewrite'
  if (/deslop|prose_meta|prose_craft|punctuation|style_boundary|文风覆盖|文风边界|Gate F|章末升华|作者预告|样章|万能比喻|ai|AI|去AI|禁用词|套路|解释腔|上帝视角|心理告知|情绪标签|空泛总结|句式/.test(text)) return 'de_ai'
  if (/compress|cut|水文|可删除|压缩|删减|删掉|过长|新概念|设定量|环境描写|氛围段落|信息过载/.test(text)) return 'compress'
  if (/rewrite|重写|serial_risk|recent_fatigue_action|风险修复|近章风险|核心一致|一致度|逻辑|因果|设定冲突|时间线|角色动机|蓝图|五段式|情节|目标阻碍|目标推进|局势变化|章尾|钩子|承接|状态/.test(text)) return 'rewrite'
  return 'polish'
}

export function buildRevisionStrategyBrief(review: any = {}) {
  const focusedRevisionModes = Array.from(new Set([
    ...asArray(review?.focused_revision_modes),
    ...asArray(review?.focusedRevisionModes),
  ].map((item: any) => compactBriefText(item)).filter(Boolean))).slice(0, 8)
  const revisionDirectives = uniqueBriefStrings([
    ...asArray(review?.revision_directives),
    ...asArray(review?.revisionDirectives),
  ], 12)
  const fiveDimensionScores = normalizeFiveDimensionQualityScores(
    review?.five_dimension_scores
    || review?.fiveDimensionScores
    || review?.five_dimensions
    || review?.fiveDimensions
    || review?.quality_audit_scores
    || review?.qualityAuditScores,
  )
  const craftMetricRisks = normalizeCraftMetricRisks(
    review?.craft_metrics
    || review?.craftMetrics
    || review?.craft_metric_scores
    || review?.craftMetricScores,
  )
  const settingViolations = normalizeSettingViolationRisks(
    review?.setting_violations
    || review?.settingViolations,
  )
  const qualityGateFailureRisks = proseQualityGateFailureRisks(review)
  const checkGroups = [
    ['quality_audit_checks', review?.quality_audit_checks || review?.qualityAuditChecks],
    ['content_rubric_checks', review?.content_rubric_checks || review?.contentRubricChecks],
    ['platform_checks', review?.platform_checks || review?.platformChecks],
    ['deslop_checks', review?.deslop_checks || review?.deslopChecks],
    ['prose_meta_checks', review?.prose_meta_checks || review?.proseMetaChecks],
    ['opening_checks', review?.opening_checks || review?.openingChecks],
    ['chapter_hook_checks', review?.chapter_hook_checks || review?.chapterHookChecks],
    ['plot_dynamics_checks', review?.plot_dynamics_checks || review?.plotDynamicsChecks],
    ['state_tracking_checks', review?.state_tracking_checks || review?.stateTrackingChecks],
    ['artifact_protocol_receipts', review?.artifact_protocol_receipts || review?.artifactProtocolReceipts],
    ['write_preparation_checks', review?.write_preparation_checks || review?.writePreparationChecks],
    ['next_chapter_quality_plan_receipts', review?.next_chapter_quality_plan_receipts || review?.nextChapterQualityPlanReceipts],
    ['chapter_handoff_checks', review?.chapter_handoff_checks || review?.chapterHandoffChecks],
    ['intent_confirmation_checks', review?.intent_confirmation_checks || review?.intentConfirmationChecks],
    ['benchmark_recall_checks', review?.benchmark_recall_checks || review?.benchmarkRecallChecks],
    ['style_boundary_checks', review?.style_boundary_checks || review?.styleBoundaryChecks],
    ['style_sample_checks', review?.style_sample_checks || review?.styleSampleChecks],
    ['information_flow_checks', review?.information_flow_checks || review?.informationFlowChecks],
    ['expectation_threshold_checks', review?.expectation_threshold_checks || review?.expectationThresholdChecks],
    ['emotional_arc_checks', review?.emotional_arc_checks || review?.emotionalArcChecks],
    ['prose_craft_checks', review?.prose_craft_checks || review?.proseCraftChecks],
    ['serial_risk_repair_checks', review?.serial_risk_repair_checks || review?.serialRiskRepairChecks],
    ['punctuation_tone_checks', review?.punctuation_tone_checks || review?.punctuationToneChecks],
  ]
  const strategyHits: Record<string, any[]> = {}
  for (const [fieldName, rawChecks] of checkGroups) {
    for (const check of asArray(rawChecks).filter(platformCheckNeedsCarryOver)) {
      const strategy = inferRevisionStrategy(check, String(fieldName))
      if (!strategyHits[strategy]) strategyHits[strategy] = []
      strategyHits[strategy].push({ field: fieldName, check })
    }
  }
  for (const mode of focusedRevisionModes) {
    const spec = OH_STORY_FOCUSED_REVISION_MODE_SPECS[mode] || {
      strategy: 'polish',
      label: mode,
      fix: `polish：执行自检要求的定向修订模式 ${mode}，只修有证据的问题，不改变未被 findings 要求的正史。`,
    }
    const strategy = normalizeRevisionStrategy(spec.strategy) || 'polish'
    strategyHits[strategy] = strategyHits[strategy] || []
    strategyHits[strategy].push({
      field: 'focused_revision_modes',
      check: {
        key: mode,
        label: spec.label,
        status: 'warn',
        evidence: `自检要求定向修订模式：${mode}`,
        fix: spec.fix,
        strategy,
      },
    })
  }
  for (const [index, directive] of revisionDirectives.entries()) {
    const check = {
      key: `revision_directive_${index + 1}`,
      label: 'revision_directive',
      status: 'warn',
      evidence: directive,
      fix: directive,
    }
    const strategy = inferRevisionStrategy(check, 'revision_directives')
    strategyHits[strategy] = strategyHits[strategy] || []
    strategyHits[strategy].push({
      field: 'revision_directives',
      check,
    })
  }
  for (const risk of qualityGateFailureRisks) {
    const strategy = normalizeRevisionStrategy((risk as any)?.strategy) || 'rewrite'
    strategyHits[strategy] = strategyHits[strategy] || []
    strategyHits[strategy].push({
      field: 'quality_gate',
      check: {
        key: 'quality_gate_failure',
        label: '质量门禁失败',
        status: 'fail',
        evidence: compactBriefText((risk as any)?.evidence || (risk as any)?.reason || (risk as any)?.summary),
        fix: compactBriefText((risk as any)?.fix || '按质量门禁失败原因重写对应段落，补足正文证据与修订回执。'),
        strategy,
        score: (risk as any)?.score,
        threshold: (risk as any)?.threshold,
      },
    })
  }
  for (const violation of settingViolations) {
    strategyHits.rewrite = strategyHits.rewrite || []
    strategyHits.rewrite.push({
      field: 'setting_violations',
      check: {
        ...violation,
        fix: `repair_setting_violation：${violation.fix}`,
      },
    })
  }
  for (const metric of craftMetricRisks) {
    const strategy = normalizeRevisionStrategy(metric?.strategy) || 'polish'
    strategyHits[strategy] = strategyHits[strategy] || []
    strategyHits[strategy].push({
      field: 'craft_metrics',
      score: Number(metric?.score ?? 0),
      check: {
        key: metric?.key,
        label: metric?.label,
        status: 'warn',
        evidence: metric?.evidence,
        fix: metric?.fix,
        strategy,
        score: metric?.score,
      },
    })
  }
  const cleanup = review?.deterministic_prose_cleanup || review?.deterministicProseCleanup || {}
  if (Number(cleanup?.risk_count || cleanup?.riskCount || 0) > 0) {
    const cleanupCategories = asArray(cleanup?.categories)
      .filter((category: any) => Number(category?.count || 0) > 0)
    const cleanupHits = cleanupCategories.length ? cleanupCategories : [cleanup]
    for (const cleanupHit of cleanupHits) {
      const cleanupType = String(cleanupHit?.type || cleanupHit?.key || cleanupHit?.category || '').trim()
      const cleanupStrategy = /payoff_density|reader_payoff|hook|chapter_hook|paragraph_hook|ending_hook|scene_card|model_degeneration/.test(cleanupType)
        ? 'rewrite'
        : /filler|recap|description_overuse|水文|复述/.test(cleanupType)
          ? 'compress'
          : 'de_ai'
      const cleanupEvidence = asArray(cleanupHit?.evidence).map((item: any) => compactBriefText(item)).filter(Boolean)
      const cleanupActions = asArray(cleanupHit?.required_actions || cleanupHit?.requiredActions).map((item: any) => compactBriefText(item)).filter(Boolean)
      strategyHits[cleanupStrategy] = strategyHits[cleanupStrategy] || []
      strategyHits[cleanupStrategy].push({
        field: 'deterministic_prose_cleanup',
        check: {
          key: cleanupType || 'deterministic_prose_cleanup',
          label: compactBriefText(cleanupHit?.label || cleanupType || cleanup?.label || '确定性清理残留'),
          status: 'warn',
          evidence: cleanupEvidence[0] || compactBriefText(cleanupHit?.summary || cleanup?.summary || cleanup?.priority_repair || cleanup?.priorityRepair),
          fix: cleanupActions[0] || compactBriefText(cleanupHit?.priority_repair || cleanupHit?.priorityRepair || cleanup?.priority_repair || cleanup?.priorityRepair),
          strategy: cleanupStrategy,
        },
      })
    }
  }
  for (const dimension of asArray(fiveDimensionScores?.below_threshold)) {
    const strategy = normalizeRevisionStrategy(dimension?.strategy) || 'polish'
    strategyHits[strategy] = strategyHits[strategy] || []
    strategyHits[strategy].push({
      field: 'five_dimension_scores',
      score: Number(dimension?.score || 0),
      check: {
        key: dimension?.key,
        label: dimension?.label,
        status: 'warn',
        evidence: dimension?.evidence || `${dimension?.label || dimension?.key} ${dimension?.score} 分，低于 ${fiveDimensionScores.threshold}。`,
        fix: dimension?.fix,
        strategy,
        score: dimension?.score,
      },
    })
  }
  const scoredStrategyOrder = Object.entries(strategyHits)
    .filter(([, hits]) => asArray(hits).some((hit: any) => hit.field === 'five_dimension_scores'))
    .map(([strategy, hits]) => ({
      strategy,
      score: Math.min(...asArray(hits).filter((hit: any) => hit.field === 'five_dimension_scores').map((hit: any) => Number(hit.score || 100))),
    }))
    .sort((a, b) => a.score - b.score)
    .map(item => item.strategy)
  const strategyOrder = [
    ...scoredStrategyOrder,
    ...OH_STORY_REVISION_STRATEGY_ORDER.filter(strategy => asArray(strategyHits[strategy]).length > 0 && !scoredStrategyOrder.includes(strategy)),
  ]
  const effectiveOrder = strategyOrder.length ? strategyOrder : ['polish']
  const reasons = uniqueBriefStrings(effectiveOrder.flatMap(strategy => asArray(strategyHits[strategy]).map((hit: any) => {
    const check = hit.check || {}
    const label = compactBriefText(check.label || check.key || check.gate || check.category || hit.field, hit.field)
    const evidence = compactBriefText(check.evidence || check.issue || check.summary || check.reason || check.pattern)
    return evidence ? `${label}：${evidence}` : label
  })), 10)
  const directives = uniqueBriefStrings(effectiveOrder.flatMap(strategy => {
    const hits = asArray(strategyHits[strategy])
    if (!hits.length && strategy === 'polish') return ['polish：小问题多时，打磨语言细节、段落节奏和信息衔接。']
    return hits.map((hit: any) => {
      const check = hit.check || {}
      const fix = compactBriefText(check.fix || check.repair_instruction || check.repairInstruction || check.suggestion || check.required_action || check.requiredAction)
      const label = compactBriefText(check.label || check.key || check.gate || hit.field, hit.field)
      const targetLabel = check.key && check.key !== label ? `${label}(${check.key})` : label
      if (strategy === 'de_ai') return `de_ai：去AI味，${fix || `修复 ${targetLabel} 的AI腔、解释腔、格式或正文工艺残留。`}`
      if (strategy === 'rewrite') return `rewrite：${fix || `围绕 ${label} 重写影响核心冲突、因果、角色动机或章尾承接的段落。`}`
      if (strategy === 'compress') return `compress：${fix || `压缩 ${label} 中不推动剧情、信息或情绪变化的内容。`}`
      return `polish：${fix || `打磨 ${label} 的语言、节奏和衔接。`}`
    })
  }), 12)
  return {
    version: 'oh_story_revision_strategy_v1',
    primary_strategy: effectiveOrder[0],
    strategy_order: effectiveOrder,
    focused_revision_modes: focusedRevisionModes,
    revision_directives: revisionDirectives,
    craft_metric_risks: craftMetricRisks,
    setting_violations: settingViolations,
    reasons,
    directives,
  }
}
