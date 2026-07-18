import type {
  AnyRecord,
  AutoCreationBatchGuardrailStatus,
  AutoCreationDirectorAction,
  AutoCreationBatchGuardrailSignal,
  AutoCreationBatchBriefRecovery,
  AutoCreationNextBatchBrief,
} from './types'
import {
  arrayValue,
  firstText,
  opsAction,
  text,
} from './helpers-basics'

import {
  chapterRangeLabel,
} from './helpers-next-batch-brief-basics'

export function emptyNextBatchBriefRecovery(): AutoCreationBatchBriefRecovery {
  return {
    visible: false,
    title: '',
    summary: '',
    restoredChapterCount: 0,
    evidence: [],
    action: opsAction('start_safe_batch_generation', '开始安全连写', '当前批次尚未恢复到多章连写。', true),
  }
}

export function buildNextBatchBriefRecoveryEvidence(args: {
  status: AutoCreationBatchGuardrailStatus
  safeChapterCount: number
  nextBatchBrief: AutoCreationNextBatchBrief
  batchBriefSignal: AutoCreationBatchGuardrailSignal
  evidence?: string[]
}) {
  if (args.status !== 'ready' || args.safeChapterCount < 2 || args.batchBriefSignal.status !== 'ok') {
    return []
  }
  return [
    '批次任务书完整',
    `安全批次 ${args.safeChapterCount} 章`,
    args.nextBatchBrief.chapterRangeLabel,
    args.nextBatchBrief.readerPayoffPlan ? '读者回报已明确' : '',
    args.nextBatchBrief.mainlineFocus ? '主线焦点已明确' : '',
    ...arrayValue(args.evidence),
  ].filter(Boolean)
}

export function buildRecoveryEvidenceReleaseSummary(args: {
  status: AutoCreationBatchGuardrailStatus
  safeChapterCount: number
  allowedChapterNos: number[]
  nextBatchBrief: AutoCreationNextBatchBrief
  recoveryEvidenceProductionGate?: AnyRecord | null
  recoveryEvidenceSourceRiskProfile?: AnyRecord | null
}) {
  const gate = args.recoveryEvidenceProductionGate || null
  const profile = args.recoveryEvidenceSourceRiskProfile || null
  if (args.status !== 'ready') return null
  const strengthenedRepairSources = arrayValue(profile?.sources)
    .filter(source => {
      const releaseFailureCount = Number(source?.release_failure_count || source?.releaseFailureCount || 0)
      const closure = source?.deep_repair_effect?.strengthened_repair_closure
        || source?.deepRepairEffect?.strengthenedRepairClosure
        || null
      return releaseFailureCount >= 2 && text(closure?.status) === 'converged'
    })
    .map(source => {
      const closure = source?.deep_repair_effect?.strengthened_repair_closure
        || source?.deepRepairEffect?.strengthenedRepairClosure
        || null
      return {
        source: text(source?.source || source?.sourceMode),
        label: text(source?.label || source?.sourceLabel || source?.source, '恢复依据来源'),
        status: 'converged',
        status_label: text(closure?.label, '强化深修已收敛'),
        latest_repair_run_id: closure?.latest_repair_run_id ?? closure?.latestRepairRunId ?? null,
        latest_repair_at: text(closure?.latest_repair_at || closure?.latestRepairAt),
      }
    })
    .filter(source => source.source)
  if (text(gate?.status) !== 'ok' && !strengthenedRepairSources.length) return null
  const clearedSources = text(gate?.status) === 'ok' ? arrayValue(gate?.sources)
    .filter(source => text(source?.status) === 'cleared')
    .map(source => ({
      source: text(source?.source || source?.sourceMode),
      label: text(source?.label || source?.sourceLabel || source?.source, '恢复依据来源'),
      status: 'cleared',
      status_label: text(source?.status_label || source?.statusLabel, '生产阻断已解除'),
      task_count: Number(source?.task_count || source?.taskCount || 0),
      chapter_nos: arrayValue(source?.chapter_nos || source?.chapterNos),
      source_task_indices: arrayValue(source?.source_task_indices || source?.sourceTaskIndices),
    }))
    : []
  if (!clearedSources.length && !strengthenedRepairSources.length) return null
  const evidence = [
    clearedSources.length ? '恢复依据治理队列已闭环' : '',
    ...clearedSources.map(source => `${source.label}：生产阻断已解除`),
    ...strengthenedRepairSources.map(source => `${source.label}：${source.status_label}`),
  ].filter(Boolean)
  return {
    status: 'released',
    source: clearedSources.length ? 'recovery_evidence_governance_queue' : 'recovery_evidence_source_risk_profile',
    summary: clearedSources.length
      ? `恢复依据治理队列已闭环，可恢复 ${Math.max(2, args.safeChapterCount)} 章安全连写。`
      : `恢复依据画像强化深修已收敛，可恢复 ${Math.max(2, args.safeChapterCount)} 章安全连写。`,
    safe_chapter_count: args.safeChapterCount,
    allowed_chapter_nos: args.allowedChapterNos,
    next_batch_label: args.nextBatchBrief.chapterRangeLabel,
    cleared_source_count: clearedSources.length,
    cleared_sources: clearedSources,
    strengthened_repair_source_count: strengthenedRepairSources.length,
    strengthened_repair_sources: strengthenedRepairSources,
    evidence,
  }
}

export function buildNextBatchBriefRecovery(args: {
  status: AutoCreationBatchGuardrailStatus
  safeChapterCount: number
  nextBatchBrief: AutoCreationNextBatchBrief
  batchBriefSignal: AutoCreationBatchGuardrailSignal
  recommendedAction: AutoCreationDirectorAction
  evidence?: string[]
}): AutoCreationBatchBriefRecovery {
  if (args.status !== 'ready' || args.safeChapterCount < 2 || args.batchBriefSignal.status !== 'ok') {
    return emptyNextBatchBriefRecovery()
  }
  return {
    visible: true,
    title: '已恢复多章安全连写',
    summary: `${args.nextBatchBrief.chapterRangeLabel || `未来 ${args.safeChapterCount} 章`} 的批次目标、读者回报、主线推进和章末钩子已具备，可按护栏进入小批量生产。`,
    restoredChapterCount: args.safeChapterCount,
    evidence: buildNextBatchBriefRecoveryEvidence(args),
    action: args.recommendedAction,
  }
}

export function buildLongformMemoryAnchor(storyState: AnyRecord) {
  const state = storyState || {}
  const global = state.global || state
  const characterStates = arrayValue(state.characters)
    .map((item: any) => {
      const name = firstText(item?.name, item?.character_name, item?.title)
      if (!name) return ''
      const status = firstText(item?.status, item?.state, item?.current_state, item?.arc_state)
      const location = firstText(item?.location, item?.current_location)
      return [name, status, location ? `@${location}` : ''].filter(Boolean).join('：').replace('：@', '@')
    })
    .filter(Boolean)
    .slice(0, 8)
  const openQuestions = [
    ...arrayValue(global?.open_questions),
    ...arrayValue(state?.open_questions),
  ].map((item: any) => firstText(item?.text, item?.summary, item?.description, item)).filter(Boolean)
  const payoffDebts = [
    ...arrayValue(global?.payoff_queue),
    ...arrayValue(global?.payoff_debts),
    ...arrayValue(state?.payoff_queue),
    ...arrayValue(state?.payoff_debts),
  ].map((item: any) => firstText(item?.text, item?.summary, item?.description, item)).filter(Boolean)
  const anchor = {
    last_updated_chapter: Number(state.last_updated_chapter || global.last_updated_chapter || 0) || null,
    core_promise: firstText(global.core_promise, global.reader_promise, global.promise, state.core_promise, state.reader_promise),
    current_volume_goal: firstText(global.current_volume_goal, global.volume_goal, state.current_volume_goal, state.volume_goal),
    current_mainline: firstText(global.current_mainline, global.mainline, state.current_mainline, state.mainline),
    character_states: characterStates,
    open_questions: Array.from(new Set(openQuestions)).slice(0, 8),
    payoff_debts: Array.from(new Set(payoffDebts)).slice(0, 8),
  }
  const hasAnchor = Boolean(
    anchor.last_updated_chapter
    || anchor.core_promise
    || anchor.current_volume_goal
    || anchor.current_mainline
    || anchor.character_states.length
    || anchor.open_questions.length
    || anchor.payoff_debts.length,
  )
  return hasAnchor ? anchor : null
}

