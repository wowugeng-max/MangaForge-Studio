import {
  COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS,
  asArray,
  compactText,
  normalizeIssue
} from './novel-route-utils-payload'

export function getStyleLock(project: any) {
  const raw = project?.reference_config?.style_lock || {}
  const defaults = COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS
  const targetLength = raw.chapter_word_range || raw.target_length || (
    project?.length_target === 'short' ? '1800-2500字' : defaults.chapter_word_range
  )
  return {
    narrative_person: raw.narrative_person || raw.narrative_style || defaults.narrative_person,
    sentence_length: raw.sentence_length || defaults.sentence_length,
    dialogue_ratio: raw.dialogue_ratio || defaults.dialogue_ratio,
    banter_density: raw.banter_density || defaults.banter_density,
    payoff_density: raw.payoff_density || defaults.payoff_density,
    description_density: raw.description_density || defaults.description_density,
    chapter_word_range: targetLength,
    banned_words: asArray(raw.banned_words).length ? asArray(raw.banned_words) : [...defaults.banned_words],
    preferred_words: asArray(raw.preferred_words).length ? asArray(raw.preferred_words) : [...defaults.preferred_words],
    ending_policy: raw.ending_policy || defaults.ending_policy,
    banned_shortcuts: asArray(raw.banned_shortcuts).length ? asArray(raw.banned_shortcuts) : [...defaults.banned_shortcuts],
  }
}

export function getSafetyPolicy(project: any) {
  const raw = project?.reference_config?.safety || {}
  return {
    enforce_on_generate: Boolean(raw.enforce_on_generate),
    min_quality_score: Number(raw.min_quality_score || 60),
    max_copy_hits: Number(raw.max_copy_hits ?? 0),
    allowed: asArray(raw.allowed).length ? asArray(raw.allowed) : ['节奏', '结构', '爽点安排', '信息密度', '章节节拍', '情绪曲线'],
    cautious: asArray(raw.cautious).length ? asArray(raw.cautious) : ['人物功能', '设定机制', '资源经济模型'],
    forbidden: asArray(raw.forbidden).length ? asArray(raw.forbidden) : ['具体桥段', '专有设定', '原句', '角色名', '核心梗', '事件顺序'],
  }
}

export const getStoryState = (project: any) => project?.reference_config?.story_state || {}

export function getQualityGate(project: any) {
  return {
    enabled: project.reference_config?.quality_gate?.enabled !== false,
    min_score: Number(project.reference_config?.quality_gate?.min_score ?? project.reference_config?.approval_policy?.low_score_threshold ?? 78),
    max_critical_issues: Number(project.reference_config?.quality_gate?.max_critical_issues ?? 0),
    max_high_issues: Number(project.reference_config?.quality_gate?.max_high_issues ?? 1),
    block_on_safety: project.reference_config?.quality_gate?.block_on_safety !== false,
    require_revision_before_store: project.reference_config?.quality_gate?.require_revision_before_store !== false,
  }
}

const QUALITY_GATE_STRUCTURED_CHECK_FIELDS = [
  ['platform_checks', 'platformChecks'],
  ['content_rubric_checks', 'contentRubricChecks'],
  ['target_reader_checks', 'targetReaderChecks'],
  ['genre_positioning_checks', 'genrePositioningChecks'],
  ['upgrade_rhythm_checks', 'upgradeRhythmChecks'],
  ['conflict_structure_checks', 'conflictStructureChecks'],
  ['deslop_checks', 'deslopChecks'],
  ['prose_meta_checks', 'proseMetaChecks'],
  ['dialogue_checks', 'dialogueChecks'],
  ['plot_dynamics_checks', 'plotDynamicsChecks'],
  ['continuity_heat_checks', 'continuityHeatChecks'],
  ['character_relation_checks', 'characterRelationChecks'],
  ['character_behavior_checks', 'characterBehaviorChecks'],
  ['asset_linkage_checks', 'assetLinkageChecks'],
  ['state_tracking_checks', 'stateTrackingChecks'],
  ['source_readiness_checks', 'sourceReadinessChecks'],
  ['intent_confirmation_checks', 'intentConfirmationChecks'],
  ['benchmark_recall_checks', 'benchmarkRecallChecks'],
  ['information_flow_checks', 'informationFlowChecks'],
  ['expectation_threshold_checks', 'expectationThresholdChecks'],
  ['story_loop_checks', 'storyLoopChecks'],
  ['emotional_arc_checks', 'emotionalArcChecks'],
  ['chapter_hook_checks', 'chapterHookChecks'],
  ['paragraph_hook_checks', 'paragraphHookChecks'],
  ['suspense_checks', 'suspenseChecks'],
  ['reversal_checks', 'reversalChecks'],
  ['opening_checks', 'openingChecks'],
  ['prose_craft_checks', 'proseCraftChecks'],
  ['punctuation_tone_checks', 'punctuationToneChecks'],
  ['quality_audit_checks', 'qualityAuditChecks'],
  ['revision_receipt_checks', 'revisionReceiptChecks'],
  ['deslop_repair_checks', 'deslopRepairChecks'],
]

const QUALITY_GATE_STRUCTURED_CHECK_LABELS: Record<string, string> = {
  platform_checks: '平台检查',
  content_rubric_checks: '内容基准',
  target_reader_checks: '目标读者',
  genre_positioning_checks: '题材定位',
  upgrade_rhythm_checks: '升级节奏',
  conflict_structure_checks: '冲突结构',
  deslop_checks: '去AI味',
  prose_meta_checks: '正文元信息',
  dialogue_checks: '对白质量',
  plot_dynamics_checks: '剧情动力',
  continuity_heat_checks: '连续性热度',
  character_relation_checks: '角色关系',
  character_behavior_checks: '角色行为',
  asset_linkage_checks: '资产挂钩',
  state_tracking_checks: '状态跟踪',
  source_readiness_checks: '来源就绪',
  intent_confirmation_checks: '意图确认',
  benchmark_recall_checks: '文风召回',
  information_flow_checks: '信息流',
  expectation_threshold_checks: '期待阈值',
  story_loop_checks: '故事循环',
  emotional_arc_checks: '情绪弧',
  chapter_hook_checks: '章级钩子',
  paragraph_hook_checks: '段落钩子',
  suspense_checks: '悬念编排',
  reversal_checks: '反转设计',
  opening_checks: '开篇设计',
  prose_craft_checks: '正文工艺',
  punctuation_tone_checks: '语气标点',
  quality_audit_checks: '质量诊断',
  revision_receipt_checks: '修订回执',
  deslop_repair_checks: '去AI味修复回执',
  deslop_gate_diagnostics: '去AI味门禁',
}

function structuredReviewCheckSummary(check: any, field: string) {
  return compactText(
    check?.label
    || check?.key
    || check?.name
    || QUALITY_GATE_STRUCTURED_CHECK_LABELS[field]
    || field
    || '结构化自检失败',
    80,
  )
}

function isPostRepairCarryOverStructuredCheck(check: any, field: string) {
  const status = String(check?.status || '').toLowerCase()
  if (status !== 'fail') return false
  const key = String(check?.key || '').trim()
  const syncKey = String(check?.sync_key || check?.syncKey || '').trim()
  const label = compactText(check?.label || check?.name || '', 120)
  const evidence = compactText(check?.evidence || check?.summary || check?.reason || '', 240)
  const fix = compactText(check?.fix || check?.suggestion || '', 240)
  const remainingRisk = compactText(check?.remaining_risk || check?.remainingRisk || check?.risk || '', 240)
  const text = [key, syncKey, label, evidence, fix, remainingRisk].filter(Boolean).join('；')
  const postRepairCarryOver = /轻度|残留|下一章|下一轮|下一次|后续|继续|继续压|非阻塞|仍需|未完全|下轮|同步|写入|追踪|台账|状态/.test(text)
  const evidenceLocationMiss = /changed_evidence|changedEvidence|旧回执|证据片段|无法定位到修订后正文|定位不到修订后正文|证据未落在|evidence\s*未落在/i.test(text)
  const postDeliverySyncLike = postRepairCarryOver
    || evidenceLocationMiss
    || /状态写回|状态同步|资产状态|角色状态|增量缺口|台账|追踪|文档|入库|后续需|需同步|需要同步/.test(text)
  const hardCurrentFailure = /正文(?:没有|缺少|未写出|没有写出|未呈现|没有呈现|未兑现|没有兑现)|没有执行|未执行|未落成正文|没有落成正文/.test(text)
  const hardProofFailure = /无法证明|证据不足/.test(text) && !evidenceLocationMiss && !postDeliverySyncLike
  const deslopGateSignal = /Gate\s*(?:A|C|D|E|F|G)|章末总结体|模板表达|解释腔|上帝视角|AI味硬伤|禁用词/.test(text)
  const deslopResidualSignal = /仍残留|仍有|仍存在|仍未|未消除|没有消除|未修掉|未修复|未清理|正文仍|正文有|正文出现|硬伤仍|依然|残留风险/.test(text)
  const hardDeslopFailure = deslopGateSignal && deslopResidualSignal
  const hardBenchmarkSourceMissing = /source_paths_missing|missing_primary_contract|profile_missing|module_missing|rhythm_missing|来源缺失|文风召回来源缺失/i.test(text)
  if (/未生成|缺少|missing/i.test(key)) return false
  if (/未生成|没有输出|无可用/.test(text)) return false
  if (hardBenchmarkSourceMissing) return false
  if (/缺少|缺失/.test(text) && !postDeliverySyncLike && key !== 'pre_store_structural_sync') return false
  if (hardCurrentFailure || hardProofFailure) return false
  if (key === 'pre_store_structural_sync') return true
  if (key === 'revision_cascade_impact_evidence') return true
  if (key === 'quality_audit_repair_receipt_sync') return true
  if ((key === 'benchmark_recall_sync' || syncKey === 'benchmark_recall_sync' || field === 'benchmark_recall_checks') && postRepairCarryOver) return true
  if (key === 'prose_revision_receipt_sync' && postRepairCarryOver) return true
  if (key === 'deslop_repair_receipt_sync' && (postRepairCarryOver || evidenceLocationMiss) && !hardDeslopFailure) return true
  if (field === 'quality_audit_checks' && /_sync$/.test(syncKey)) return true
  return false
}

function collectFailedStructuredReviewChecks(review: any, options: { requireCarryOverEvidence?: boolean } = {}) {
  const directChecks = QUALITY_GATE_STRUCTURED_CHECK_FIELDS
    .flatMap(([snakeField, camelField]) => asArray(review?.[snakeField] || review?.[camelField])
      .map((check: any) => ({ check, field: snakeField })))
  const diagnostics = review?.deslop_gate_diagnostics || review?.deslopGateDiagnostics || {}
  const diagnosticGates = asArray(diagnostics?.gates)
    .map((check: any) => ({ check, field: 'deslop_gate_diagnostics' }))
  return [...directChecks, ...diagnosticGates]
    .filter((item: any) => String(item?.check?.status || '').toLowerCase() === 'fail')
    .filter((item: any) => {
      if (!isPostRepairCarryOverStructuredCheck(item.check, item.field)) return true
      if (!options.requireCarryOverEvidence) return false
      return !compactText(
        item?.check?.evidence
        || item?.check?.changed_evidence
        || item?.check?.changedEvidence
        || item?.check?.source_evidence
        || item?.check?.sourceEvidence
        || item?.check?.source_excerpt
        || item?.check?.sourceExcerpt
        || '',
        240,
      )
    })
    .map((item: any) => structuredReviewCheckSummary(item.check, item.field))
    .filter(Boolean)
}

function collectUndeliveredDeliveryRiskReceipts(review: any) {
  return asArray(review?.delivery_risk_receipts || review?.deliveryRiskReceipts)
    .filter((receipt: any) => {
      const remainingRisk = compactText(receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk || '', 120)
      const normalizedRemainingRisk = remainingRisk.toLowerCase()
      const hasRemainingRisk = Boolean(remainingRisk) && !['无', 'none', 'no', 'n/a', 'null', 'false', '0'].includes(normalizedRemainingRisk)
      if (!(receipt?.delivered === false || hasRemainingRisk)) return false
      return !isPostDeliveryOnlyDeliveryRiskReceipt(receipt, remainingRisk)
    })
    .map((receipt: any) => compactText(
      receipt?.risk_item
      || receipt?.riskItem
      || receipt?.required_action
      || receipt?.requiredAction
      || receipt?.remaining_risk
      || receipt?.remainingRisk
      || '上一章承接风险未兑现',
      80,
    ))
    .filter(Boolean)
}

function isPostDeliveryOnlyDeliveryRiskReceipt(receipt: any, remainingRisk = '') {
  const evidence = compactText(
    receipt?.evidence
    || receipt?.changed_evidence
    || receipt?.changedEvidence
    || receipt?.source_excerpt
    || receipt?.sourceExcerpt,
    240,
  )
  if (!evidence) return false
  const risk = compactText(remainingRisk || receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk || '', 240)
  if (!risk) return false
  if (/正文(没有|未|缺少)|无法证明|证据不足|未落成正文|没有落成正文/.test(risk)) return false
  const qualityContinuationCarryOver = /承接回执缺失：(?:补追读|修吸引力|补循环|补期待|补故事力|补章末交接)|漏追读|吸引力缺口|故事循环缺口|期待欠账|故事力缺口/.test(risk)
  if (qualityContinuationCarryOver) return true
  return /(?:资产台账|资产文档|状态更新|状态写回|追踪\/|追踪\\|追踪\/|追踪|伏笔\.md|时间线\.md|角色状态|资产状态|文档|台账|入库|后续需|后续|下一章|下一轮|下轮|状态同步|同步状态|同步资产|需同步|需要同步|需更新|需要更新|写回状态|补更强|evidence\s*未落在|证据未落在)/i.test(risk)
}

function hasUsableNextChapterQualityPlan(review: any) {
  const deliveryReceipts = review?.oh_story_delivery_receipts || review?.ohStoryDeliveryReceipts || {}
  const plan = review?.next_chapter_quality_plan
    || review?.nextChapterQualityPlan
    || deliveryReceipts?.next_chapter_quality_plan
    || deliveryReceipts?.nextChapterQualityPlan
    || null
  if (!plan || typeof plan !== 'object') return false
  const qualityFocus = asArray(plan?.quality_focus || plan?.qualityFocus)
  const openingActions = asArray(plan?.opening_actions || plan?.openingActions)
  const middleActions = asArray(plan?.middle_actions || plan?.middleActions)
  const endingActions = asArray(plan?.ending_actions || plan?.endingActions)
  const avoidRepetition = asArray(plan?.avoid_repetition || plan?.avoidRepetition)
  const evidenceBasis = asArray(plan?.evidence_basis || plan?.evidenceBasis)
  return [
    qualityFocus,
    openingActions,
    middleActions,
    endingActions,
    avoidRepetition,
    evidenceBasis,
  ].every(items => items.some((item: any) => compactText(item, 120)))
}

function dedupeQualityHardFailures(items: any[]) {
  const seen = new Set<string>()
  return asArray(items)
    .filter((item: any) => {
      const message = compactText(typeof item === 'string' ? item : item?.message || item?.key || '', 240)
      if (!message) return false
      const key = compactText(typeof item === 'object' ? item?.key : '', 80) || 'quality_gate'
      const signature = `${key}\u0000${message}`
      if (seen.has(signature)) return false
      seen.add(signature)
      return true
    })
}

export function getQualityGateDecision(project: any, review: any, safetyDecision: any = null) {
  const gate = getQualityGate(project)
  const v2Decision = review?.prose_quality_v2?.decision || null
  const failedStructuredChecks = collectFailedStructuredReviewChecks(review, {
    requireCarryOverEvidence: Boolean(v2Decision),
  })
  const undeliveredDeliveryRiskReceipts = collectUndeliveredDeliveryRiskReceipts(review)
  const missingNextChapterQualityPlan = !hasUsableNextChapterQualityPlan(review)
  const safetyReasons = safetyDecision?.blocked
    ? [`仿写安全未通过：${(safetyDecision.reasons || []).join('；')}`]
    : []
  if (v2Decision) {
    const supplementalHardFailures = [
      ...failedStructuredChecks.map(message => ({
        key: 'structured_quality_gate',
        message: `结构化自检失败：${message}`,
        source: 'deterministic',
      })),
      ...undeliveredDeliveryRiskReceipts.map(message => ({
        key: 'delivery_risk_receipt',
        message: `承接回执未兑现：${message}`,
        source: 'deterministic',
      })),
      ...(missingNextChapterQualityPlan
        ? [{
            key: 'next_chapter_quality_plan',
            message: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan',
            source: 'deterministic',
          }]
        : []),
      ...safetyReasons.map(message => ({
        key: 'reference_safety',
        message,
        source: 'deterministic',
      })),
    ]
    const hardFailures = dedupeQualityHardFailures([
      ...asArray(v2Decision.hard_failures),
      ...supplementalHardFailures,
    ])
    return {
      ...v2Decision,
      gate,
      hard_failures: hardFailures,
      passed: v2Decision.passed === true && hardFailures.length === 0,
      approvable: v2Decision.approvable === true && hardFailures.length === 0,
      reasons: [
        ...hardFailures
          .map((item: any) => typeof item === 'string' ? item : item?.message || item?.key)
          .filter(Boolean),
        ...asArray(v2Decision.advisory_failures)
          .map((item: any) => item?.message || item?.key || item)
          .filter(Boolean),
      ],
    }
  }
  const issues = Array.isArray(review?.issues) ? review.issues.map(normalizeIssue) : []
  const criticalCount = issues.filter(issue => String(issue.severity || '').toLowerCase() === 'critical').length
  const highCount = issues.filter(issue => String(issue.severity || '').toLowerCase() === 'high').length
  const score = Number(review?.score || 0)
  const reasons = [
    score && score < gate.min_score ? `质检评分 ${score} 低于入库阈值 ${gate.min_score}` : '',
    gate.require_revision_before_store && review?.needs_revision && !review?.revised ? '自检要求修订，但当前没有可用修订稿' : '',
    criticalCount > gate.max_critical_issues ? `严重问题 ${criticalCount} 个超过上限 ${gate.max_critical_issues}` : '',
    highCount > gate.max_high_issues ? `高风险问题 ${highCount} 个超过上限 ${gate.max_high_issues}` : '',
    failedStructuredChecks.length ? `结构化自检失败 ${failedStructuredChecks.length} 项：${failedStructuredChecks.slice(0, 5).join('；')}` : '',
    undeliveredDeliveryRiskReceipts.length ? `承接回执未兑现 ${undeliveredDeliveryRiskReceipts.length} 项：${undeliveredDeliveryRiskReceipts.slice(0, 5).join('；')}` : '',
    missingNextChapterQualityPlan ? '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan，包含质量目标、开篇/中段/章末动作、禁用重复和证据依据' : '',
    gate.block_on_safety && safetyDecision?.blocked ? `仿写安全未通过：${(safetyDecision.reasons || []).join('；')}` : '',
  ].filter(Boolean)
  return { gate, passed: !gate.enabled || reasons.length === 0, reasons, score, critical_count: criticalCount, high_count: highCount }
}

