import {
  buildContinuityHeatDeterministicCheck,
  continuityHeatPriority,
  normalizeContinuityActiveExpectationCheck,
  normalizeContinuityDormantBoundaryCheck,
  normalizeContinuityHeatStateCheck,
  normalizeContinuityWatchItemsCheck,
} from '../../novel-writing/continuity-heat-basics'

import {
  buildIntentConfirmationDeterministicCheck,
  buildIntentConfirmationSelfReportCheck,
  intentConfirmationAnchorScore,
  intentConfirmationArray,
  intentConfirmationPriority,
  intentCostRewardPlan,
  normalizeIntentConfirmedCheck,
  normalizeIntentDialogueToneBaselineCheck,
  normalizeIntentEndingHandoffCheck,
  normalizeIntentReactionCheck,
  normalizeIntentRhythmStyleCheck,
} from '../../novel-writing/intent-confirmation-basics'

import {
  buildStateTrackingDeterministicCheck,
  normalizeStateTrackingCharacterCheck,
  normalizeStateTrackingFilterRuleCheck,
  normalizeStateTrackingHistoricalCheck,
  normalizeStateTrackingSourceReadinessCheck,
  normalizeStateTrackingWorldConstraintCheck,
  stateTrackingPriority,
} from '../../novel-writing/state-tracking-basics'

import {
  anchorMatchScore,
} from '../../novel-writing/text-matching'

import {
  asArray,
} from '../../routes/novel-route-utils'

import {
  scanBeatSequenceExecutionRisks,
  scanCharacterOrderExecutionRisks,
  scanCostRewardExecutionRisks,
} from '../quality/chapter-blueprint-execution'

import {
  buildContinuityHeatContract,
} from '../quality/continuity-dialogue-contracts'

import {
  buildIntentConfirmationContract,
} from '../quality/intent-benchmark-contracts'

import {
  buildStateTrackingContract,
} from '../quality/state-tracking-contracts'

import {
  compactBriefText,
  uniqueBriefStrings,
} from '../quality/text-utils'

import {
  contextWithChapterRawPreDraftForSync,
} from './quality-sync-reports-benchmark'

export function stateTrackingContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildStateTrackingContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function buildStateTrackingSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = stateTrackingContractForSync(contextPackage, chapter)
  const checks = [
    normalizeStateTrackingCharacterCheck(contract.character_states || contract.characterStates, chapterText),
    normalizeStateTrackingHistoricalCheck(contract.historical_causality || contract.historicalCausality, chapterText),
    normalizeStateTrackingWorldConstraintCheck(contract.world_constraints || contract.worldConstraints, chapterText),
    normalizeStateTrackingSourceReadinessCheck(contract.source_readiness || contract.sourceReadiness),
    normalizeStateTrackingFilterRuleCheck(contract.filter_rules || contract.filterRules, chapterText),
    buildStateTrackingDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = stateTrackingPriority(missed)

  return {
    report_id: `state-tracking-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '状态跟踪未配置' : status === 'ok' ? '状态跟踪 OK' : `状态跟踪缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 state_tracking_contract，建议补充角色状态、前史因果、世界约束、来源就绪和筛选规则。'
      : status === 'ok'
        ? '正文已基本兑现角色状态、前史因果、世界约束、来源就绪和上下文筛选。'
        : `正文有 ${missedCount} 项状态跟踪缺口，${priorityRepair || '优先修角色状态、前史因果和世界约束'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持状态跟踪：只带入本章会写错的角色状态、伏笔前史、世界约束和知识边界。']
      : [
          '下一章必须补状态跟踪：角色状态、前史因果、世界约束和知识边界要在行动选择、阻碍、代价或信息释放中生效。',
          '删掉不改变本章行动选择的背景和百科设定；missing/warn 来源不能被正文写成既定事实。',
      ],
  }
}

export function intentConfirmationContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildIntentConfirmationContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function normalizeIntentStructureCheck(values: any[], contextPackage: any, chapterText: string) {
  const planned = intentConfirmationArray(values)
  const scannerRisks = [
    ...scanCharacterOrderExecutionRisks(contextPackage, chapterText),
    ...scanBeatSequenceExecutionRisks(contextPackage, chapterText),
  ]
  if (!planned.length && !scannerRisks.length) return null
  const anchor = intentConfirmationAnchorScore(planned, chapterText, 20)
  const text = String(chapterText || '')
  const hasStructureEvidence = /内容概括|逻辑线|出场顺序|周薄森|林青禾|李玄|压问|反击|信息差|章尾|下一问|下一章/.test(text)
  const generic = /大家讨论很久|事情就解决了|本章只是过渡|说了很多背景/.test(text)
  const delivered = scannerRisks.length === 0 && !generic && (planned.length ? (anchor.missed.length === 0 || hasStructureEvidence) : hasStructureEvidence)
  return {
    key: 'structure_inputs',
    label: '结构输入',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, generic ? 18 : 50),
    evidence: uniqueBriefStrings([
      ...anchor.evidence,
      hasStructureEvidence ? '结构输入信号可见' : '',
      ...scannerRisks.map((item: any) => item.evidence),
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      ...anchor.missed.map(item => item.text),
      ...scannerRisks.map((item: any) => item.label),
    ], 8),
    issue: delivered ? '' : '内容概括、逻辑线、人物出场顺序或情节点序列没有按写前结构落地。',
    repair_instruction: delivered ? '' : '补结构输入：按内容概括、逻辑线、出场顺序和情节点序列重排压力铺垫、转折、爽点兑现和承接。',
  }
}

export function normalizeIntentCostRewardCheck(contract: any, contextPackage: any, chapterText: string) {
  const plan = intentCostRewardPlan(contract)
  const scannerRisks = scanCostRewardExecutionRisks(contextPackage, chapterText)
  if (!plan && !scannerRisks.length) return null
  const match = anchorMatchScore(plan, chapterText)
  const text = String(chapterText || '')
  const negated = /没有代价|没有收益|不需要付出|毫无代价|之后再说/.test(text)
  const hasCost = /代价|公开得罪|得罪|开罪|暴露|付出|风险|惩罚|敌视|站队/.test(text)
  const hasReward = /收益|拿到|夺回|获得|解释权|反证入口|洗清|证明|赢下/.test(text)
  const delivered = scannerRisks.length === 0 && !negated && hasCost && hasReward && (match.score >= 18 || hasCost || hasReward)
  return {
    key: 'cost_reward',
    label: '代价/收益',
    text: plan,
    expected: plan,
    score: delivered ? Math.max(84, match.score) : Math.min(match.score, negated ? 12 : 48),
    evidence: uniqueBriefStrings([
      ...match.matched,
      hasCost ? '代价可见' : '',
      hasReward ? '收益可见' : '',
      negated ? '否定代价/收益' : '',
      ...scannerRisks.map((item: any) => item.evidence),
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasCost ? '缺代价' : '',
      !hasReward ? '缺收益' : '',
      ...scannerRisks.map((item: any) => item.label),
    ], 8),
    issue: delivered ? '' : '代价兑现和收益兑现没有拆开落到正文，或被“没有代价/没有收益”跳过。',
    repair_instruction: delivered ? '' : '补代价/收益：写清谁付出代价、谁获得收益、后续账是什么，不能只写结果。',
  }
}

export function buildIntentConfirmationSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const mergedContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const contract = intentConfirmationContractForSync(contextPackage, chapter)
  const checks = [
    normalizeIntentConfirmedCheck(contract.confirmed_intent || contract.confirmedIntent, chapterText),
    normalizeIntentRhythmStyleCheck(contract.rhythm_and_style || contract.rhythmAndStyle, chapterText),
    normalizeIntentStructureCheck(contract.structure_inputs || contract.structureInputs, mergedContextPackage, chapterText),
    normalizeIntentCostRewardCheck(contract, mergedContextPackage, chapterText),
    normalizeIntentEndingHandoffCheck(contract, chapterText),
    normalizeIntentReactionCheck(contract.execution_focus || contract.executionFocus, chapterText),
    normalizeIntentDialogueToneBaselineCheck(contract.dialogue_tone_baseline || contract.dialogueToneBaseline, chapterText),
    buildIntentConfirmationSelfReportCheck(chapterText),
    buildIntentConfirmationDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = intentConfirmationPriority(missed)

  return {
    report_id: `intent-confirmation-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '意图确认未配置' : status === 'ok' ? '意图确认 OK' : `意图确认缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 intent_confirmation_contract，建议补充确认意图、节奏/文风、结构输入、代价/收益和章尾承接。'
      : status === 'ok'
        ? '正文已基本兑现确认意图、节奏/文风、结构输入、代价/收益、章尾承接和信息差反应。'
        : `正文有 ${missedCount} 项意图确认缺口，${priorityRepair || '优先修本章意图、代价收益和章尾承接'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持意图确认：继续让本章意图、节奏文风、结构输入、代价收益和章尾承接在正文中可见。']
      : [
          '下一章必须补意图确认：先重申本章意图，再把代价收益、信息差反应和章尾承接写成可见事件和正文证据。',
          '删掉泛化过渡、讨论后解决、无代价收益和背景说明；按确认意图重排压力铺垫、短句爆发、冷却承接和下一章追问。',
        ],
  }
}

export function continuityHeatContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildContinuityHeatContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function buildContinuityHeatSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = continuityHeatContractForSync(contextPackage, chapter)
  const checks = [
    normalizeContinuityHeatStateCheck(contract.heat_states || contract.heatStates, chapterText),
    normalizeContinuityActiveExpectationCheck(contract.active_expectations || contract.activeExpectations, chapterText),
    normalizeContinuityWatchItemsCheck(contract.watch_items || contract.watchItems, chapterText),
    normalizeContinuityDormantBoundaryCheck(contract.dormant_allowed || contract.dormantAllowed, chapterText),
    buildContinuityHeatDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = continuityHeatPriority(missed)

  return {
    report_id: `continuity-heat-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '连续性热度未配置' : status === 'ok' ? '连续性热度 OK' : `连续性热度缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 continuity_heat_contract，建议补充 hot/warm/cold/archived 热度状态、活跃期待、关注项和休眠边界。'
      : status === 'ok'
        ? '正文已基本兑现 hot/warm/cold/archived 热度管理，活跃期待、关注项和休眠边界都有处理。'
        : `正文有 ${missedCount} 项连续性热度缺口，${priorityRepair || '优先推进活跃期待、触达关注项并修休眠边界'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持连续性热度：hot 推进，warm 触达，cold 回收前升温，archived 保持休眠边界。']
      : [
          '下一章必须补连续性热度：把活跃伏笔和期待写成当场压力、行动门槛、证据变化或章尾问题。',
          '解释允许休眠的元素为什么不能解决当前危机；cold 线回收前必须先升温，避免空 callback 和“以后再说”。',
      ],
  }
}

