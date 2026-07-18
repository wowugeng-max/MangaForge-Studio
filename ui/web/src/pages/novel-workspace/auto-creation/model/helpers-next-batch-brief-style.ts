import type {
  AnyRecord,
  AutoCreationBatchGuardrailSignal,
  AutoCreationNextBatchBrief,
} from './types'
import {
  arrayValue,
  firstText,
  text,
} from './helpers-basics'
import {
  parsePayload,
  numberValue,
  isResolvedTaskStatus,
  signal,
  compactChapterNoEvidence,
} from './helpers-main'

import {
  styleSampleKeysFromStrategy,
} from './helpers-next-batch-brief-basics'

export function styleSampleEffectivenessRows(effectiveness: AnyRecord | null | undefined) {
  if (!effectiveness) return []
  if (Array.isArray(effectiveness?.samples)) return effectiveness.samples
  if (Array.isArray(effectiveness?.items)) return effectiveness.items
  return arrayValue(effectiveness)
}

export function styleSampleEffectivenessRisky(row: AnyRecord) {
  const riskLabel = text(row?.risk_label, text(row?.riskLabel))
  const usageCount = numberValue(row?.usage_count ?? row?.usageCount) ?? 0
  const hitRate = numberValue(row?.hit_rate ?? row?.hitRate) ?? 100
  const missedCount = numberValue(row?.missed_count ?? row?.missedCount) ?? 0
  const copyRiskCount = numberValue(row?.copy_risk_count ?? row?.copyRiskCount) ?? 0
  return /需复盘|风险|低命中|照搬/.test(riskLabel)
    || missedCount > 0
    || copyRiskCount > 0
    || (usageCount > 0 && hitRate < 80)
}

export function styleSampleEffectivenessRiskReason(row: AnyRecord) {
  const riskLabel = text(row?.risk_label, text(row?.riskLabel))
  const hitRate = numberValue(row?.hit_rate ?? row?.hitRate)
  const missedCount = numberValue(row?.missed_count ?? row?.missedCount)
  const copyRiskCount = numberValue(row?.copy_risk_count ?? row?.copyRiskCount)
  return [
    riskLabel,
    hitRate !== null ? `命中率 ${hitRate}%` : '',
    missedCount ? `缺口 ${missedCount}` : '',
    copyRiskCount ? `照搬风险 ${copyRiskCount}` : '',
  ].filter(Boolean).join('，') || '样章效果回收提示需复盘'
}

export function buildStyleSampleBatchPreflight(
  nextBatchBrief: AutoCreationNextBatchBrief,
  effectiveness: AnyRecord | null | undefined,
) {
  const riskyRows = styleSampleEffectivenessRows(effectiveness)
    .filter(styleSampleEffectivenessRisky)
  const riskyByKey = new Map(riskyRows
    .map((row: AnyRecord) => [text(row?.sample_key, text(row?.sampleKey)), row])
    .filter(([key]) => Boolean(key)))
  const selections = nextBatchBrief.chapters.flatMap(chapter => {
    const keys = chapter.styleSampleKeys?.length
      ? chapter.styleSampleKeys
      : styleSampleKeysFromStrategy(chapter.styleSampleStrategy)
    return keys
      .filter(key => riskyByKey.has(key))
      .map(key => ({
        chapter_no: chapter.chapterNo,
        chapter_title: chapter.title,
        sample_key: key,
        reason: styleSampleEffectivenessRiskReason(riskyByKey.get(key) || {}),
        effectiveness: riskyByKey.get(key) || {},
      }))
  })
  const riskySampleKeys = Array.from(new Set(selections.map(item => item.sample_key))).filter(Boolean)
  const affectedChapterNos = Array.from(new Set(selections.map(item => Number(item.chapter_no || 0)).filter(Boolean))).sort((a, b) => a - b)
  const recommendedRepairAction = {
    action: 'replace',
    label: '换样章并重审任务书',
    requires_task_book_reconfirm: true,
  }
  const repairTasks = selections.map(item => ({
    task_type: 'repair_task_book',
    issue_type: 'style_sample_task_book_rebuild',
    severity: Number(item.effectiveness?.copy_risk_count || item.effectiveness?.copyRiskCount || 0) > 0 ? 'high' : 'medium',
    title: `第${item.chapter_no}章换样章并重审任务书`,
    message: `第${item.chapter_no}章《${item.chapter_title || '未命名'}》任务书仍选择风险样章「${item.sample_key}」：${item.reason}。`,
    action: recommendedRepairAction.label,
    acceptance_criteria: [
      '任务书已换用表现稳定或更匹配本章场景的风格样章',
      '换样章后任务书确认状态已清除，并由作者重新确认',
      '重新生成正文前不再选择低命中或照搬风险样章',
    ],
    task_status: 'open',
    source: 'style_sample_batch_preflight',
    chapter_no: item.chapter_no,
    sample_key: item.sample_key,
    sample_effectiveness: item.effectiveness,
    recommended_repair_action: recommendedRepairAction,
  }))
  const status = selections.length ? 'warn' : 'ok'
  return {
    visible: nextBatchBrief.visible || riskyRows.length > 0,
    status,
    risk_count: selections.length,
    summary: selections.length
      ? `下一批任务书${affectedChapterNos.map(chapterNo => `第${chapterNo}章`).join('、')}仍选择需复盘样章：${riskySampleKeys.join('、')}。先换样章并重审任务书，再扩大安全连写。`
      : riskyRows.length
        ? '下一批任务书没有继续选择需复盘样章。'
        : '样章效果回收没有待复盘风险，下一批可按任务书样章策略继续。',
    risky_sample_keys: riskySampleKeys,
    affected_chapter_nos: affectedChapterNos,
    selected_samples: selections,
    recommended_repair_action: recommendedRepairAction,
    repair_tasks: repairTasks,
  }
}

export function buildStyleSampleTaskBookRecheckPlan(args: {
  items: AnyRecord[]
  styleSampleBatchPreflight?: AnyRecord | null
}) {
  const styleItems = arrayValue(args.items)
    .filter(item => {
      const task = item?.task || item
      return text(task?.issue_type) === 'style_sample_task_book_rebuild'
        && text(task?.task_status) === 'needs_review'
    })
  const preflight = args.styleSampleBatchPreflight || null
  if (!preflight) {
    return {
      status: 'needs_preflight',
      resolvedItems: [],
      blockedItems: styleItems,
      summary: '请先刷新自动创作总控台，取得最新风格样章预检后再批量关闭样章任务书。',
      riskyChapterNos: [],
    }
  }

  const selectedSamples = arrayValue(preflight.selected_samples || preflight.selectedSamples)
  const affectedChapterNos = Array.from(new Set([
    ...arrayValue(preflight.affected_chapter_nos || preflight.affectedChapterNos)
      .map(item => Number(item))
      .filter(chapterNo => Number.isFinite(chapterNo) && chapterNo > 0),
    ...selectedSamples
      .map(item => Number(item?.chapter_no || item?.chapterNo || 0))
      .filter(chapterNo => Number.isFinite(chapterNo) && chapterNo > 0),
  ])).sort((a, b) => a - b)
  const riskActive = text(preflight.status) === 'warn'
    || Number(preflight.risk_count || preflight.riskCount || 0) > 0
    || selectedSamples.length > 0

  if (!riskActive || affectedChapterNos.length === 0) {
    return {
      status: styleItems.length ? 'all_clear' : 'empty',
      resolvedItems: styleItems,
      blockedItems: [],
      summary: `样章任务书复检通过 ${styleItems.length} 项，下一批任务书已避开风险样章。`,
      riskyChapterNos: [],
    }
  }

  const riskyChapterSet = new Set(affectedChapterNos)
  const resolvedItems = styleItems.filter(item => {
    const task = item?.task || item
    const chapterNo = Number(task?.chapter_no || task?.chapterNo || 0)
    return Number.isFinite(chapterNo) && chapterNo > 0 && !riskyChapterSet.has(chapterNo)
  })
  const blockedItems = styleItems.filter(item => !resolvedItems.includes(item))
  return {
    status: resolvedItems.length > 0 ? 'partial' : 'blocked',
    resolvedItems,
    blockedItems,
    summary: `样章任务书复检通过 ${resolvedItems.length} 项，仍需重审 ${blockedItems.length} 项。`,
    riskyChapterNos: affectedChapterNos,
  }
}

export function buildStyleSampleTaskBookRecoveryEvidence(runRecords: AnyRecord[]) {
  const resolvedTasks = runRecords.flatMap(run => {
    if (text(run?.run_type) !== 'longform_production_repair') return []
    const input = parsePayload(run?.input_ref, { owner: run, kind: 'run', field: 'input_ref' }) || {}
    const output = parsePayload(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {}
    const source = firstText(input?.source, output?.report?.source)
    if (source !== 'style_sample_batch_preflight') return []
    return [
      ...arrayValue(output?.tasks),
      ...arrayValue(output?.repairTasks),
    ].filter(task => text(task?.issue_type ?? task?.issueType) === 'style_sample_task_book_rebuild'
      && isResolvedTaskStatus(task?.task_status ?? task?.status))
  })
  if (!resolvedTasks.length) return []
  const chapterNos = Array.from(new Set(resolvedTasks
    .map(task => Number(task?.chapter_no ?? task?.chapterNo ?? 0))
    .filter(chapterNo => Number.isFinite(chapterNo) && chapterNo > 0)))
    .sort((a, b) => a - b)
  return [
    `样章任务书复检通过 ${resolvedTasks.length} 项`,
    chapterNos.length ? `${compactChapterNoEvidence(chapterNos)}样章已重审` : '',
  ].filter(Boolean)
}

export function buildStyleSampleBatchPreflightSignal(preflight: AnyRecord): AutoCreationBatchGuardrailSignal {
  if (preflight.status === 'warn') {
    return signal('风格样章预检', 'warn', preflight.summary)
  }
  return signal('风格样章预检', 'ok', preflight.summary || '下一批任务书没有选择风险样章。')
}

