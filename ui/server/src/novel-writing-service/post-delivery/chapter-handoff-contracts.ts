import { asArray } from '../../routes/novel-route-utils'
import { formatOutgoingHandoffAsPrevious, readChapterOutgoingHandoff } from '../../novel-writing/chapter-handoff-basics'
import {
  applyReaderExpectationDebtAging,
  normalizeExpectationItem,
  normalizeReaderExpectationDebtContext,
  uniqueExpectationItems,
} from '../batch-serial/serial-momentum'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'

export function compactHandoffExcerpt(value: any, maxChars = 360) {
  const text = compactBriefText(value)
  if (!text || text.length <= maxChars) return text
  const tailChars = Math.max(220, Math.floor(maxChars * 0.7))
  const headChars = Math.max(80, maxChars - tailChars - 3)
  return `${text.slice(0, headChars)}...${text.slice(-tailChars)}`
}

export function buildPreviousChapterHandoff(contextPackage: any) {
  const target = contextPackage?.chapter_target || {}
  const explicitValue = target.previous_handoff
    || target.previousHandoff
    || target.chapter_handoff_contract?.previous_handoff
    || target.chapter_handoff_contract?.previousHandoff
    || target.chapterHandoffContract?.previous_handoff
    || target.chapterHandoffContract?.previousHandoff
    || contextPackage?.previous_handoff
    || contextPackage?.previousHandoff
    || contextPackage?.chapter_handoff_contract?.previous_handoff
    || contextPackage?.chapter_handoff_contract?.previousHandoff
    || contextPackage?.chapterHandoffContract?.previous_handoff
    || contextPackage?.chapterHandoffContract?.previousHandoff
    || contextPackage?.batch_preflight?.chapter_handoff_contract?.previous_handoff
    || contextPackage?.batch_preflight?.chapter_handoff_contract?.previousHandoff
    || contextPackage?.batch_preflight?.chapterHandoffContract?.previous_handoff
    || contextPackage?.batch_preflight?.chapterHandoffContract?.previousHandoff
    || contextPackage?.pre_draft_brief?.chapter_handoff_contract?.previous_handoff
    || contextPackage?.pre_draft_brief?.chapter_handoff_contract?.previousHandoff
    || contextPackage?.pre_draft_brief?.chapterHandoffContract?.previous_handoff
    || contextPackage?.pre_draft_brief?.chapterHandoffContract?.previousHandoff
    || contextPackage?.preDraftBrief?.chapter_handoff_contract?.previous_handoff
    || contextPackage?.preDraftBrief?.chapter_handoff_contract?.previousHandoff
    || contextPackage?.preDraftBrief?.chapterHandoffContract?.previous_handoff
    || contextPackage?.preDraftBrief?.chapterHandoffContract?.previousHandoff
    || contextPackage?.pre_draft_brief?.previous_handoff
    || contextPackage?.pre_draft_brief?.previousHandoff
    || contextPackage?.preDraftBrief?.previous_handoff
    || contextPackage?.preDraftBrief?.previousHandoff
  const explicit = Array.isArray(explicitValue) || (explicitValue && typeof explicitValue === 'object')
    ? handoffContractTextItems([
        explicitValue,
        explicitValue?.immediate_carry,
        explicitValue?.immediateCarry,
        explicitValue?.must_carry,
        explicitValue?.mustCarry,
        explicitValue?.opening_obligation,
        explicitValue?.openingObligation,
        explicitValue?.required_actions,
        explicitValue?.requiredActions,
      ].flat(), 10).join('；')
    : compactBriefText(explicitValue)
  if (explicit) return explicit

  const previous = contextPackage?.continuity?.previous_chapter || contextPackage?.continuity?.previousChapter || null
  if (!previous) return ''
  const label = previous.chapter_no
    ? `第${previous.chapter_no}章${previous.title ? `《${previous.title}》` : ''}`
    : '上一章'
  const endingHook = compactBriefText(previous.ending_hook || previous.endingHook)
  const endingExcerpt = compactBriefText(
    previous.ending_excerpt
    || previous.endingExcerpt
    || previous.chapter_text
    || previous.chapterText,
  )
  const outgoing = previous.outgoing_handoff
    || previous.outgoingHandoff
    || readChapterOutgoingHandoff(previous)
  const formattedOutgoing = formatOutgoingHandoffAsPrevious(outgoing, label)
  // Prefer explicit ending_excerpt / chapter_text over hook-only synthetic outgoing.
  if (formattedOutgoing && !endingExcerpt) return formattedOutgoing
  const parts = [
    endingHook ? `章末钩子：${endingHook}` : '',
    endingExcerpt ? `最后一幕：${compactHandoffExcerpt(endingExcerpt, 360)}` : '',
  ].filter(Boolean)
  if (parts.length) return `${label} ${parts.join('；')}`
  return formattedOutgoing || ''
}

export function handoffContractItemText(item: any) {
  if (typeof item === 'string') return compactBriefText(item)
  return compactBriefText(item?.text || item?.label || item?.name || item?.summary || item?.detail || item?.title || item?.issue)
}

export function handoffContractTextItems(value: any, limit = 12) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of asArray(value)) {
    const normalized = handoffContractItemText(item)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
    if (result.length >= limit) break
  }
  return result
}

export function normalizeGovernanceRecheckMemoryContext(value: any) {
  const raw = value?.governance_recheck_memory || value?.governanceRecheckMemory || value || null
  if (!raw || typeof raw !== 'object') return null
  const evidence = handoffContractTextItems([
    ...asArray(raw.evidence),
    ...asArray(raw.repaired_evidence),
    ...asArray(raw.repairedEvidence),
  ], 8)
  const failedEvidence = handoffContractTextItems([
    ...asArray(raw.failed_evidence),
    ...asArray(raw.failedEvidence),
  ], 8)
  const watchItems = handoffContractTextItems([
    ...asArray(raw.watch_items),
    ...asArray(raw.watchItems),
  ], 8)
  const rawStatus = compactBriefText(raw.status)
  const summary = compactBriefText(raw.summary)
  const sourceRunId = raw.source_run_id ?? raw.sourceRunId ?? null
  const storylineDecisionTaskCount = Math.max(0, Number(raw.storyline_decision_task_count ?? raw.storylineDecisionTaskCount ?? 0) || 0)
  const hasMemory = Boolean(
    rawStatus
      || compactBriefText(raw.label)
      || summary
      || sourceRunId
      || evidence.length
      || failedEvidence.length
      || watchItems.length
      || storylineDecisionTaskCount,
  )
  if (!hasMemory) return null

  const status = rawStatus === 'closed' && failedEvidence.length === 0 && storylineDecisionTaskCount === 0
    ? 'closed'
    : rawStatus === 'closed'
      ? 'needs_followup'
      : rawStatus === 'needs_followup'
        ? 'needs_followup'
        : failedEvidence.length > 0 || storylineDecisionTaskCount > 0
          ? 'needs_followup'
          : 'closed'

  return {
    source_run_id: sourceRunId,
    status,
    label: compactBriefText(raw.label, status === 'closed' ? '治理复查已记录' : '治理复查待处理'),
    summary: summary || (status === 'closed'
      ? '上一轮治理复查已闭环，本章继续继承修后证据和观察项。'
      : '上一轮治理复查仍有待处理项，本章必须先承接失效依据和观察项。'),
    evidence,
    failed_evidence: failedEvidence,
    watch_items: watchItems,
    storyline_decision_task_count: storylineDecisionTaskCount,
  }
}

export function normalizeBatchChapterHandoffContract(value: any) {
  const raw = value?.chapter_handoff_contract || value?.chapterHandoffContract || value || {}
  const previousHandoff = compactBriefText(raw.previous_handoff || raw.previousHandoff)
  const openingObligations = handoffContractTextItems(raw.opening_obligations || raw.openingObligations)
  const expectationCarryOver = handoffContractTextItems(raw.expectation_carry_over || raw.expectationCarryOver)
  const mustDeliver = handoffContractTextItems(raw.must_deliver || raw.mustDeliver)
  const keepAlive = handoffContractTextItems(raw.keep_alive || raw.keepAlive)
  const overdue = handoffContractTextItems(raw.overdue || raw.overdue_items || raw.overdueItems)
  const hasContract = previousHandoff
    || openingObligations.length
    || expectationCarryOver.length
    || mustDeliver.length
    || keepAlive.length
    || overdue.length
  if (!hasContract) return null
  return {
    source: compactBriefText(raw.source, 'safe_batch_chapter_handoff_contract'),
    from_chapter_no: Number(raw.from_chapter_no || raw.fromChapterNo || 0) || null,
    apply_to_chapter_no: Number(raw.apply_to_chapter_no || raw.applyToChapterNo || 0) || null,
    previous_handoff: previousHandoff,
    opening_obligations: openingObligations,
    expectation_carry_over: expectationCarryOver,
    must_deliver: mustDeliver,
    keep_alive: keepAlive,
    overdue,
    policy: compactBriefText(raw.policy, '安全连写第一章必须先接住上一章最后一幕和读者期待债务。'),
  }
}

export function firstMatchingBrief(items: any[], pattern: RegExp) {
  return uniqueBriefStrings(items, 20).find(item => pattern.test(item)) || ''
}

export function buildReaderExpectationLedger(project: any, contextPackage: any, sceneBriefs: any[], readerRetentionBrief: any) {
  const chapterTarget = contextPackage?.chapter_target || {}
  const readerExpectationDebtContext = applyReaderExpectationDebtAging(
    normalizeReaderExpectationDebtContext(
      chapterTarget.reader_expectation_debt_context
      || chapterTarget.readerExpectationDebtContext
      || contextPackage?.reader_expectation_debt_context
      || contextPackage?.readerExpectationDebtContext,
    ),
    Number(chapterTarget.chapter_no || contextPackage?.chapter_no || 0),
  )
  const projectStoryState = project?.reference_config?.story_state || {}
  const contextStoryState = contextPackage?.story_state || {}
  const storyState = {
    ...projectStoryState,
    ...contextStoryState,
    open_questions: [
      ...asArray(projectStoryState?.open_questions),
      ...asArray(contextStoryState?.open_questions),
    ],
    payoff_queue: [
      ...asArray(projectStoryState?.payoff_queue),
      ...asArray(contextStoryState?.payoff_queue),
    ],
  }
  const carryOver = uniqueExpectationItems(readerExpectationDebtContext.must_carry)
  const previousHandoff = buildPreviousChapterHandoff(contextPackage)
  const mustDeliver = uniqueExpectationItems([
    ...carryOver,
    normalizeExpectationItem(previousHandoff, { key: 'opening_handoff', label: '上一章承接', type: 'opening_handoff' }),
    normalizeExpectationItem(readerRetentionBrief?.opening_hook, { key: 'opening_hook', label: '开篇钩子', type: 'hook' }),
    normalizeExpectationItem(readerRetentionBrief?.payoff_promise || chapterTarget.reader_promise || chapterTarget.payoff, { key: 'payoff_promise', label: '爽点承诺', type: 'payoff' }),
    normalizeExpectationItem(readerRetentionBrief?.emotional_reward, { key: 'emotional_reward', label: '情绪回报', type: 'emotion' }),
    ...sceneBriefs.map((scene: any, index: number) => normalizeExpectationItem(scene?.reader_payoff, { key: `scene_payoff_${index + 1}`, label: `场景${index + 1}回报`, type: 'scene_payoff' })),
    normalizeExpectationItem(readerRetentionBrief?.ending_question || chapterTarget.ending_hook, { key: 'ending_hook', label: '章末追读', type: 'hook' }),
  ].filter(Boolean))
  const keepAlive = uniqueExpectationItems([
    ...readerExpectationDebtContext.keep_alive,
    normalizeExpectationItem(readerRetentionBrief?.information_gap, { key: 'information_gap', label: '信息缺口', type: 'question' }),
    ...asArray(storyState?.open_questions).map((item: any, index: number) => normalizeExpectationItem(item, { key: `open_question_${index + 1}`, label: '保留悬念', type: 'question' })),
    ...asArray(storyState?.payoff_queue).map((item: any, index: number) => normalizeExpectationItem(item, { key: `payoff_queue_${index + 1}`, label: '待回收期待', type: 'payoff_debt' })),
  ].filter(Boolean))

  return {
    chapter_promise: compactBriefText(chapterTarget.reader_promise || readerRetentionBrief?.payoff_promise || contextPackage?.writing_bible?.promise || project?.synopsis),
    carry_over: carryOver.slice(0, 12),
    must_deliver: mustDeliver.slice(0, 12),
    keep_alive: keepAlive.slice(0, 12),
    must_not_break: [
      '已承诺的爽点、悬念和情绪回报不能整章只铺设定不兑现',
      '可以保留 keep_alive 中的长期疑问，但必须在正文中维持其存在感，不得遗忘或矛盾改写',
      '章末追读必须落到最后一幕的未解问题、升级威胁或新信息上',
    ],
  }
}

