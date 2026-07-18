import { asArray, compactText } from '../../routes/novel-route-utils'
import { anchorMatchScore, anchorTerms, normalizedMatchText } from '../../novel-writing/text-matching'
import {
  buildChapterHandoffDeterministicCheck,
  chapterHandoffPriority,
  normalizeChapterHandoffDeliveryCheck,
} from '../../novel-writing/chapter-handoff-basics'
import { buildReaderRetentionBrief } from '../../novel-writing/reader-retention-brief'
import { sceneBriefFromCard } from '../../novel-writing/scene-briefs'
import {
  applyReaderExpectationDebtAging,
  normalizeReaderExpectationDebtContext,
  normalizeReaderExpectationLedgerContract,
} from '../batch-serial/serial-momentum'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'

type AnyFn = (...args: any[]) => any

let buildReaderExpectationLedger: AnyFn = (_review: any = {}) => ({})
let contextWithChapterRawPreDraftForSync: AnyFn = (contextPackage: any = {}, _chapter: any = {}) => contextPackage || {}
let normalizeBatchChapterHandoffContract: AnyFn = (value: any = {}) => value || {}
let normalizeCoreContractPeriodicDriftCheck: AnyFn = (value: any = {}) => value || {}
let normalizeCoreContractRadar: AnyFn = (value: any = {}) => value || {}

import {
  buildCoreContractDeterministicCheck
} from './core-handoff-sync-reports-core'

export function buildCoreContractSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const radar = normalizeCoreContractRadar(
    target?.core_contract_radar
    || target?.coreContractRadar
    || syncContextPackage?.core_contract_radar
    || syncContextPackage?.coreContractRadar
    || syncContextPackage?.pre_draft_brief?.core_contract_radar
    || syncContextPackage?.pre_draft_brief?.coreContractRadar
    || syncContextPackage?.preDraftBrief?.core_contract_radar
    || syncContextPackage?.preDraftBrief?.coreContractRadar,
  )
  const checks = radar ? [
    normalizeCoreContractServeCheck(radar.must_serve, chapterText),
    normalizeCoreContractNoDriftCheck(radar.no_drift, chapterText),
    normalizeCoreContractThemeUnityCheck(radar.theme_unity_rules || radar.themeUnityRules, chapterText),
    normalizeCoreContractSellingPointExecutionCheck(radar.selling_point_execution_rules || radar.sellingPointExecutionRules, chapterText),
    normalizeCoreContractRepetitionStrategyCheck(radar.repetition_strategy_rules || radar.repetitionStrategyRules, chapterText),
    normalizeCoreContractCommercialRhythmCheck(radar.commercial_rhythm_rules || radar.commercialRhythmRules, chapterText),
    normalizeCoreContractGoldfingerStructureCheck(radar.goldfinger_structure_rules || radar.goldfingerStructureRules, chapterText),
    normalizeCoreContractLaunchPressureCheck(radar.launch_pressure_rules || radar.launchPressureRules, chapterText),
    normalizeCoreContractRepairFocusCheck(radar.repair_focus, chapterText),
    normalizeCoreContractPeriodicSellingPointCheck(radar.periodic_drift_check || radar.periodicDriftCheck, radar.must_serve, chapterText),
    buildCoreConflictRhythmProtectionCheck(project, chapter, contextPackage, chapterText, radar),
    buildCoreContractDeterministicCheck(chapterText),
  ].filter(Boolean) : []
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = coreContractPriority(missed)

  return {
    report_id: `core-contract-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '核心契约未配置' : status === 'ok' ? '核心契约 OK' : `核心契约缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 core_contract_radar，建议补充 must_serve、no_drift、商业卖点执行、重复策略、节奏自检、金手指结构、开篇压力和 repair_focus。'
      : status === 'ok'
        ? '正文已基本服务核心承诺，未触碰漂移红线，并把商业卖点、重复策略、节奏自检、金手指结构、开篇压力和修复焦点落成正文证据。'
        : `正文有 ${missedCount} 项核心契约缺口，${priorityRepair || '优先补核心承诺和漂移红线'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    contract_summary: radar?.summary || '',
    quality_checks: asArray(radar?.checks).map((item: any) => compactBriefText(item?.label || item?.reason || item?.key)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持核心契约：本章必须服务全书承诺、主线推进和读者回报，且不得触碰漂移红线。']
      : [
          '下一章必须补核心契约：先兑现核心承诺和本章读者回报，再检查不得漂移红线。',
          '主题统一缺口必须回到全书核心情绪：随机翻开这一章，也要能看出小情绪服从大情绪。',
          '把 repair_focus 写成现场规则判定、角色选择、代价反馈、主线推进或章末新问题。',
          missed.some((item: any) => item.key === 'core_conflict_premature_resolution')
            ? '非大结局章节只能给局部胜利，必须在章尾补新的代价、风险或下一条期待线。'
            : '',
          missed.some((item: any) => item.key === 'ten_chapter_selling_point')
            ? '第10/20/30章必须回答“当初吸引读者的卖点还在吗”：把核心卖点重新写成冲突、能力使用、规则限制、读者回报或章末新期待。'
            : '',
          missed.some((item: any) => item.key === 'selling_point_execution_rules')
            ? '补卖点四步法：对齐全书卖点、书名卖点、简介卖点和段落卖点，用剧情/对话/反应让读者自己发现卖点。'
            : '',
          missed.some((item: any) => item.key === 'repetition_strategy_rules')
            ? '补重复策略：保留核心重复点，把同一卖点拆出至少3个角度，避免爽点重复导致审美疲劳。'
            : '',
          missed.some((item: any) => item.key === 'commercial_rhythm_rules')
            ? '补节奏自检：读取追踪/上下文.md 与最近3章摘要，连续2章无推进就提高冲突密度，连续爆点无余波就补承接场景。'
            : '',
          missed.some((item: any) => item.key === 'goldfinger_structure_rules')
            ? '补金手指结构：明确替换故事流程哪个环节，保持一眼就懂和系统限制，给出即时变化并暴露更大矛盾。'
            : '',
          missed.some((item: any) => item.key === 'launch_pressure_rules')
            ? '补开篇压力：前300-500字交代处境、危险来源和破局希望，优先环境型压力和否极泰来的起点。'
            : '',
        ].filter(Boolean),
  }
}

function normalizePayoffItem(value: any, source = 'planned') {
  const text = compactText(typeof value === 'string' ? value : value?.text || value?.name || value?.title || value?.summary || value?.description || '', 180)
  if (!text) return null
  return {
    text,
    source,
  }
}

function uniquePayoffItems(items: any[]) {
  const seen = new Set<string>()
  const rows: any[] = []
  for (const item of items) {
    const normalized = normalizePayoffItem(item, item?.source || 'planned')
    if (!normalized) continue
    const key = normalizedMatchText(normalized.text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push(normalized)
  }
  return rows
}

const concretePayoffPattern = /回报|兑现|揭开|真相|反转|夺回|反压|打脸|破局|解决|危机|钩子|伏笔|悬念|奖励|收束|升级|救下|拿到|发现|确认|暴露/
const genericPayoffTerms = new Set(['读者', '看到', '本章', '危机', '钩子', '真相', '支线', '回报', '兑现', '反转', '伏笔', '悬念'])

function isConcreteStorylinePayoff(item: any) {
  const text = compactText(typeof item === 'string' ? item : item?.text || item?.name || item?.title || item?.summary || item?.description || '', 180)
  return concretePayoffPattern.test(text)
}

function salientPayoffTerms(value: any) {
  const terms = anchorTerms(value)
    .filter(term => term.length >= 2)
    .filter(term => !genericPayoffTerms.has(term))
  return new Set(terms)
}

function hasSharedPayoffAnchor(left: any, right: any) {
  const leftTerms = salientPayoffTerms(left)
  const rightTerms = salientPayoffTerms(right)
  for (const term of leftTerms) {
    if (rightTerms.has(term)) return true
  }
  return false
}

function isPayoffDelivered(item: any, match: any) {
  if (match.score >= 60) return true
  if (item?.source === 'scene_card' && match.score >= 40 && asArray(match.matched).length >= 2) return true
  return false
}

function countPayoffDebts(missed: any[], debts: any[]) {
  const nonSceneMisses = missed.filter(item => item.source !== 'scene_card')
  const countedSceneMisses = missed.filter(item => {
    if (item.source !== 'scene_card') return false
    return !nonSceneMisses.some(other => hasSharedPayoffAnchor(item.text, other.text))
  })
  return nonSceneMisses.length + countedSceneMisses.length + debts.length
}

export function buildReaderPayoffSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string, storyStatePayload: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = {
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
  }
  const sceneCards = [
    ...asArray(target.scene_cards || target.sceneCards),
    ...asArray(brief.scene_briefs || brief.sceneBriefs),
  ]
  const planned = uniquePayoffItems([
    normalizePayoffItem(target.payoff || target.reader_reward || target.readerReward || brief.payoff, 'chapter_payoff'),
    ...sceneCards.map((card: any) => normalizePayoffItem(card?.reader_payoff || card?.readerPayoff || card?.payoff || card?.reader_reward || card?.readerReward, 'scene_card')),
    ...asArray(target.storyline_payoffs || target.storylinePayoffs).filter(isConcreteStorylinePayoff).map((item: any) => normalizePayoffItem(item, 'storyline_payoff')),
    ...asArray(brief.storyline_payoffs || brief.storylinePayoffs).filter(isConcreteStorylinePayoff).map((item: any) => normalizePayoffItem(item, 'storyline_payoff')),
  ].filter(Boolean))
  const delivered: any[] = []
  const missed: any[] = []
  for (const item of planned) {
    const match = anchorMatchScore(item.text, chapterText)
    const row = { ...item, score: match.score, evidence: match.matched }
    if (isPayoffDelivered(item, match)) delivered.push(row)
    else missed.push(row)
  }
  const rawDebts = [
    ...asArray(storyStatePayload?.state_delta?.payoff_queue),
    ...asArray(storyStatePayload?.payoff_queue),
    ...asArray(storyStatePayload?.state_delta?.open_questions)
      .filter((item: any) => /回报|兑现|真相|伏笔|钩子|悬念|奖励|腰牌|身份/.test(String(item || ''))),
  ]
  const debts = uniquePayoffItems(rawDebts.map((item: any) => ({ ...(typeof item === 'object' ? item : { text: item }), source: 'payoff_queue' })))
  const debtCount = countPayoffDebts(missed, debts)
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length
      ? (delivered.length / planned.length) * 82 + Math.max(0, 18 - debts.length * 6)
      : debts.length ? 68 - debts.length * 8 : 82,
  )))
  const status = debtCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `reader-payoff-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '回报 OK' : `回报欠账 ${debtCount}`,
    summary: status === 'ok'
      ? '本章承诺的读者回报已在正文中基本兑现。'
      : `本章存在 ${debtCount} 项读者回报欠账或待回收期待。`,
    debt_count: debtCount,
    planned,
    delivered,
    missed,
    debts,
    next_actions: status === 'ok'
      ? ['保持场景卡 reader_payoff、章末钩子和剧情线回收的闭环。']
      : [
          '下一次修订优先补足 missed 中的读者回报，避免只推进设定不兑现爽点。',
          '将 debts 中的待回收期待写入下一章任务书或剧情线调用建议。',
        ],
  }
}

export function buildProseReviewContextPackage(contextPackage: any = {}, finalSceneBreakdown: any[] = [], wordTargetExpansionPatches: any[] = []) {
  const generatedSceneBreakdown = asArray(finalSceneBreakdown)
  const expansionPatches = asArray(wordTargetExpansionPatches).filter(Boolean)
  if (!generatedSceneBreakdown.length && !expansionPatches.length) return contextPackage
  const nextPackage: any = {
    ...contextPackage,
    chapter_target: {
      ...(contextPackage?.chapter_target || {}),
    },
  }
  if (generatedSceneBreakdown.length) {
    nextPackage.generated_scene_breakdown = generatedSceneBreakdown
    nextPackage.chapter_target.generated_scene_breakdown = generatedSceneBreakdown
  }
  if (expansionPatches.length) {
    nextPackage.word_target_expansion_patches = expansionPatches
    nextPackage.chapter_target.word_target_expansion_patches = expansionPatches
  }
  return nextPackage
}

function readerExpectationLedgerFromContext(project: any, chapter: any, contextPackage: any) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief
    || syncContextPackage?.preDraftBrief
    || chapter?.raw_payload?.pre_draft_brief
    || chapter?.raw_payload?.preDraftBrief
    || target?.pre_draft_brief
    || target?.preDraftBrief
    || {}
  const explicit = target.reader_expectation_ledger
    || target.readerExpectationLedger
    || brief.reader_expectation_ledger
    || brief.readerExpectationLedger
    || syncContextPackage?.reader_expectation_ledger
    || syncContextPackage?.readerExpectationLedger
  const debtContext = applyReaderExpectationDebtAging(
    normalizeReaderExpectationDebtContext(
      target.reader_expectation_debt_context
      || target.readerExpectationDebtContext
      || brief.reader_expectation_debt_context
      || brief.readerExpectationDebtContext
      || brief.reader_expectation_debt
      || brief.readerExpectationDebt
      || syncContextPackage?.reader_expectation_debt_context
      || syncContextPackage?.readerExpectationDebtContext,
    ),
    Number(target.chapter_no || brief.chapter_no || chapter?.chapter_no || 0),
  )
  if (explicit) {
    return normalizeReaderExpectationLedgerContract(explicit, target, brief, debtContext)
  }
  const sceneCards = [
    ...asArray(target.scene_cards || target.sceneCards),
    ...asArray(brief.scene_briefs || brief.sceneBriefs),
  ]
  const sceneBriefs = sceneCards.map(sceneBriefFromCard)
  const retentionBrief = target.reader_retention_brief
    || target.readerRetentionBrief
    || brief.reader_retention_brief
    || brief.readerRetentionBrief
    || buildReaderRetentionBrief(project, syncContextPackage, sceneBriefs)
  return buildReaderExpectationLedger(project, syncContextPackage, sceneBriefs, retentionBrief)
}

function expectationBeatMatch(item: any, chapterText: string) {
  const key = String(item?.key || '')
  const type = String(item?.type || '')
  const scope = key.includes('opening') || key.includes('handoff') || type.includes('handoff')
    ? 'opening'
    : key.includes('ending') || /章末|追读/.test(String(item?.label || '')) || type === 'hook'
      ? 'tail'
      : 'full'
  const scopedText = scope === 'opening'
    ? chapterText.slice(0, 900)
    : scope === 'tail'
      ? chapterText.slice(-1200)
      : chapterText
  const match = anchorMatchScore(item?.text, scopedText)
  const threshold = scope === 'tail' ? 48 : 44
  return {
    ...item,
    match_scope: scope,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= threshold,
  }
}

export function buildReaderExpectationSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const ledger = readerExpectationLedgerFromContext(project, chapter, contextPackage)
  const planned = asArray(ledger.must_deliver)
  const checked = planned.map(item => expectationBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const keepAlive = asArray(ledger.keep_alive)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `reader-expectation-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '期待 OK' : `期待欠账 ${missedCount}`,
    summary: status === 'ok'
      ? '本章读者期待账本中的必兑现项已基本落地。'
      : `本章读者期待账本有 ${missedCount} 项未充分兑现。`,
    planned_count: planned.length,
    delivered_count: delivered.length,
    missed_count: missedCount,
    chapter_promise: ledger.chapter_promise || '',
    planned,
    delivered,
    missed,
    keep_alive: keepAlive,
    must_not_break: asArray(ledger.must_not_break),
    next_actions: status === 'ok'
      ? ['保持读者期待账本：承诺、兑现、保留悬念和章末追读要逐章闭环。']
      : [
          '下一次修订优先补足 missed 中的读者期待；不要只补设定说明，要写成可见行动、冲突结果或章末未解问题。',
          'keep_alive 中的长期悬念可以不回收，但下一章任务书必须继续承接，避免读者期待断线。',
        ],
  }
}

function chapterHandoffContractFromContext(contextPackage: any = {}, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  return normalizeBatchChapterHandoffContract(
    syncContextPackage?.batch_preflight?.chapter_handoff_contract
    || syncContextPackage?.batch_preflight?.chapterHandoffContract
    || syncContextPackage?.chapter_target?.chapter_handoff_contract
    || syncContextPackage?.chapter_target?.chapterHandoffContract
    || syncContextPackage?.chapterTarget?.chapter_handoff_contract
    || syncContextPackage?.chapterTarget?.chapterHandoffContract
    || syncContextPackage?.chapter_handoff_contract
    || syncContextPackage?.chapterHandoffContract
    || syncContextPackage?.pre_draft_brief?.chapter_handoff_contract
    || syncContextPackage?.pre_draft_brief?.chapterHandoffContract
    || syncContextPackage?.preDraftBrief?.chapter_handoff_contract
    || syncContextPackage?.preDraftBrief?.chapterHandoffContract,
  )
}

export function buildChapterHandoffSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = chapterHandoffContractFromContext(contextPackage, chapter)
  const checks = contract ? [
    normalizeChapterHandoffDeliveryCheck('previous_handoff', '上一章最后一幕', [contract.previous_handoff], chapterText, { openingOnly: true, threshold: 32 }),
    normalizeChapterHandoffDeliveryCheck('opening_obligations', '开篇义务', contract.opening_obligations, chapterText, { openingOnly: true, threshold: 30 }),
    normalizeChapterHandoffDeliveryCheck('expectation_carry_over', '期待携带', contract.expectation_carry_over, chapterText, { threshold: 34 }),
    normalizeChapterHandoffDeliveryCheck('must_deliver', '必兑现项', contract.must_deliver, chapterText, { threshold: 34 }),
    normalizeChapterHandoffDeliveryCheck('keep_alive', '保活项', contract.keep_alive, chapterText, { threshold: 30 }),
    normalizeChapterHandoffDeliveryCheck('overdue', '逾期待办', contract.overdue, chapterText, { threshold: 30 }),
    buildChapterHandoffDeterministicCheck(chapterText),
  ].filter(Boolean) : []
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = chapterHandoffPriority(missed)

  return {
    report_id: `chapter-handoff-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '章首承接未配置' : status === 'ok' ? '章首承接 OK' : `章首承接缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 chapter_handoff_contract；安全连写第一章建议补上一章最后一幕、开篇义务、必兑现项、保活项和逾期待办。'
      : status === 'ok'
        ? '正文已基本接住上一章最后一幕、开篇义务、期待债、必兑现项、保活项和逾期待办。'
        : `正文有 ${missedCount} 项章首承接缺口，${priorityRepair || '优先补上一章最后一幕和开篇义务'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    source: contract?.source || '',
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持章首承接：开篇先接上一章最后一幕和期待债，再展开新的场景信息。']
      : [
          '下一章必须补章首承接：开篇前300字先处理上一章最后一幕、角色反应和连续危机。',
          '安全连写合同中的 opening_obligations、must_deliver、keep_alive 和 overdue 要写成现场动作、线索推进、规则判定或章末问题。',
      ],
  }
}
