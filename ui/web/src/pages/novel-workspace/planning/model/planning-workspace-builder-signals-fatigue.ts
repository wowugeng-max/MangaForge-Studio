import type {
  PlanningStoryUnit,
  PlanningStoryUnitSignal,
  PlanningWorkspaceModel,
  PlanningActionKey
} from './planning-workspace-model'
import {
  aggregateDeliveryRiskCounts,
  arrayValue,
  boundedScore,
  chapterHasProse,
  chapterRange,
  firstNonEmpty,
  isStage,
  isTurn,
  latestReviewPayloadAny,
  listLength,
  numericCount,
  parseJsonValue,
  text,
  reviewHasPayload,
  itemTextList,
} from './planning-workspace-builder'

type AnyRecord = Record<string, any>

import { innovationItemsByKey } from './planning-workspace-builder-signals-reader'

export function chapterPayload(chapter: AnyRecord) {
  return parseJsonValue(chapter?.raw_payload, { owner: chapter, kind: 'chapter', field: 'raw_payload' }) || {}
}

export function fatigueFingerprint(value: string) {
  return text(value)
    .toLowerCase()
    .replace(/[“”"'\s，。！？!?,.、：:；;（）()[\]{}《》<>]/g, '')
}

export function dominantFatigueValue(values: string[]) {
  const counts = new Map<string, { display: string; count: number }>()
  values.forEach(value => {
    const key = fatigueFingerprint(value)
    if (!key) return
    const current = counts.get(key)
    if (current) current.count += 1
    else counts.set(key, { display: value, count: 1 })
  })
  const rows = Array.from(counts.values()).sort((a, b) => b.count - a.count || a.display.localeCompare(b.display, 'zh-CN'))
  return {
    rows,
    top: rows[0] || { display: '', count: 0 },
    uniqueCount: rows.length,
  }
}

export function buildFatigueVarietySignal(args: {
  key: PlanningWorkspaceModel['recentFatigueRadar']['signals'][number]['key']
  label: string
  noun: string
  values: string[]
  chapterCount: number
}): PlanningWorkspaceModel['recentFatigueRadar']['signals'][number] {
  const total = args.values.length
  if (args.chapterCount < 4) {
    return {
      key: args.key,
      label: args.label,
      status: 'ok',
      score: 86,
      count: 0,
      detail: `近10章样本不足四章，暂不判断${args.noun}疲劳。`,
      actionKey: 'enter_chapter_writing',
    }
  }
  if (total < 4) {
    return {
      key: args.key,
      label: args.label,
      status: 'warn',
      score: 70,
      count: args.chapterCount - total,
      detail: `近10章缺少足够的${args.noun}记录，批量连写前需要补齐章节规划。`,
      actionKey: 'update_rolling_plan',
    }
  }

  const { top, uniqueCount } = dominantFatigueValue(args.values)
  const repeatRatio = top.count / Math.max(1, total)
  const lowVariety = uniqueCount <= Math.max(2, Math.ceil(total * 0.25))
  const repeated = repeatRatio >= 0.5
  const status = lowVariety || repeated ? 'warn' : 'ok'
  const score = status === 'warn'
    ? boundedScore(96 - repeatRatio * 46 - (lowVariety ? 10 : 0), 68)
    : boundedScore(88 + Math.min(10, uniqueCount), 88)

  return {
    key: args.key,
    label: args.label,
    status,
    score,
    count: status === 'warn' ? top.count : 0,
    detail: status === 'warn'
      ? `近${total}章「${top.display}」出现 ${top.count} 次，${args.noun}变化不足。`
      : `近${total}章有 ${uniqueCount} 种${args.noun}，暂无明显重复。`,
    actionKey: status === 'warn' ? 'update_rolling_plan' : 'enter_chapter_writing',
  }
}

export function buildSceneFreshnessSignal(
  recentChapters: AnyRecord[],
  reviews: AnyRecord[],
): PlanningWorkspaceModel['recentFatigueRadar']['signals'][number] {
  const innovation = latestReviewPayloadAny(reviews, 'innovation_sync', 'innovation_sync')
  const plannedScenes = innovationItemsByKey(arrayValue(innovation?.planned), /ip_adaptation|IP化|场面|visual|hook/)
  const missedScenes = innovationItemsByKey(arrayValue(innovation?.missed), /ip_adaptation|IP化|场面|visual|hook/)
  if (missedScenes.length > 0) {
    return {
      key: 'scene_freshness',
      label: '场面新鲜度',
      status: 'warn',
      score: 62,
      count: missedScenes.length,
      detail: itemTextList(missedScenes, 2) || 'IP化场面或标志性画面没有兑现，最近章节容易显得同质。',
      actionKey: 'open_quality_revision',
    }
  }

  const ipSceneCoverage = buildIpSceneIntakeCoverage(recentChapters, reviews)
  if (ipSceneCoverage.total >= 4 && ipSceneCoverage.coveredCount > 0) {
    const requiredCount = Math.max(2, Math.ceil(ipSceneCoverage.total * 0.3))
    const status = ipSceneCoverage.coveredCount < requiredCount ? 'warn' : 'ok'
    return {
      key: 'scene_freshness',
      label: '场面新鲜度',
      status,
      score: status === 'warn'
        ? boundedScore(90 - (ipSceneCoverage.missingCount / Math.max(1, ipSceneCoverage.total)) * 34, 60)
        : boundedScore(82 + ipSceneCoverage.coveredCount * 3, 86),
      count: status === 'warn' ? ipSceneCoverage.missingCount : 0,
      detail: status === 'warn'
        ? `IP场面覆盖 ${ipSceneCoverage.coveredCount}/${ipSceneCoverage.total}，强场面空窗偏长。${ipSceneCoverage.examples.length ? `已沉淀：${ipSceneCoverage.examples.slice(0, 2).join('；')}` : '下一批需要补可视化冲突。'}`
        : `IP场面覆盖 ${ipSceneCoverage.coveredCount}/${ipSceneCoverage.total}，近期已有标志性强场面：${ipSceneCoverage.examples.slice(0, 2).join('；')}`,
      actionKey: status === 'warn' ? 'update_rolling_plan' : 'enter_chapter_writing',
    }
  }

  const sceneValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(
        payload?.ip_adaptation_hook,
        payload?.short_drama_scene,
        payload?.visual_hook,
        payload?.scene,
        payload?.location,
      )
    })
    .filter(Boolean)
  if (sceneValues.length >= 4) {
    return buildFatigueVarietySignal({
      key: 'scene_freshness',
      label: '场面新鲜度',
      noun: '可视化场面',
      values: sceneValues,
      chapterCount: recentChapters.length,
    })
  }

  return {
    key: 'scene_freshness',
    label: '场面新鲜度',
    status: plannedScenes.length > 0 ? 'ok' : 'warn',
    score: plannedScenes.length > 0 ? 84 : 72,
    count: plannedScenes.length > 0 ? 0 : 1,
    detail: plannedScenes.length > 0
      ? itemTextList(plannedScenes, 2) || '近期章节已有可视化场面规划。'
      : '近10章缺少稳定的场面/IP化记录，建议给下一批章节补标志性场景。',
    actionKey: plannedScenes.length > 0 ? 'enter_chapter_writing' : 'update_rolling_plan',
  }
}

export function buildIpSceneIntakeCoverage(recentChapters: AnyRecord[], reviews: AnyRecord[]) {
  const chapterNos = recentChapters
    .map(chapter => Number(chapter?.chapter_no || 0))
    .filter(chapterNo => chapterNo > 0)
  const chapterNoSet = new Set(chapterNos)
  const coveredNos = new Set<number>()
  const examples: string[] = []

  for (const review of reviews) {
    if (text(review?.review_type) !== 'ip_scene_intake') continue
    const payload = parseJsonValue(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
    const root = payload?.ip_scene_intake || payload?.result?.ip_scene_intake || payload?.result || payload
    const chapterNo = Number(root?.chapter_no || root?.chapterNo || payload?.chapter_no || payload?.chapterNo || review?.chapter_no || 0)
    if (!chapterNoSet.has(chapterNo)) continue
    const candidates = arrayValue(root?.ip_scene_candidates || root?.ipSceneCandidates || payload?.ip_scene_candidates)
    if (candidates.length <= 0) continue
    coveredNos.add(chapterNo)
    for (const candidate of candidates.slice(0, 2)) {
      const label = firstNonEmpty(
        candidate?.title,
        candidate?.name,
        candidate?.visual_hook,
        candidate?.visualHook,
        candidate?.adaptation_value,
      )
      if (label && !examples.includes(label)) examples.push(label)
    }
  }

  return {
    total: chapterNos.length,
    coveredCount: coveredNos.size,
    missingCount: Math.max(0, chapterNos.length - coveredNos.size),
    examples,
  }
}

export function buildRecentFatigueRadarModel(args: {
  chapters: AnyRecord[]
  activeChapterNo: number
  reviews: AnyRecord[]
}): PlanningWorkspaceModel['recentFatigueRadar'] {
  const start = Math.max(1, Number(args.activeChapterNo || 1) - 6)
  const end = start + 9
  const recentChapters = args.chapters.filter(chapter => {
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo >= start && chapterNo <= end
  })
  const conflictValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(chapter?.conflict, payload?.conflict, payload?.core_conflict)
    })
    .filter(Boolean)
  const payoffValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(
        payload?.payoff,
        payload?.reader_payoff,
        payload?.reader_reward,
        chapter?.payoff,
        chapter?.reader_payoff,
      )
    })
    .filter(Boolean)
  const hookValues = recentChapters
    .map(chapter => {
      const payload = chapterPayload(chapter)
      return firstNonEmpty(chapter?.ending_hook, chapter?.endingHook, chapter?.hook, payload?.ending_hook, payload?.hook)
    })
    .filter(Boolean)
  const signals: PlanningWorkspaceModel['recentFatigueRadar']['signals'] = [
    buildFatigueVarietySignal({
      key: 'conflict_variety',
      label: '冲突变化',
      noun: '冲突来源',
      values: conflictValues,
      chapterCount: recentChapters.length,
    }),
    buildFatigueVarietySignal({
      key: 'payoff_variety',
      label: '回报变化',
      noun: '回报形态',
      values: payoffValues,
      chapterCount: recentChapters.length,
    }),
    buildFatigueVarietySignal({
      key: 'hook_variety',
      label: '钩子变化',
      noun: '章末问题',
      values: hookValues,
      chapterCount: recentChapters.length,
    }),
    buildSceneFreshnessSignal(recentChapters, args.reviews),
  ]
  const warningSignals = signals.filter(signal => signal.status === 'warn')
  const score = boundedScore(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length), 82)
  const status: PlanningWorkspaceModel['recentFatigueRadar']['status'] = warningSignals.length > 0 ? 'needs_attention' : 'ready'

  return {
    status,
    score,
    label: status === 'ready' ? `疲劳稳定 ${score}` : `疲劳风险 ${score}`,
    summary: status === 'ready'
      ? '近10章冲突来源、回报形态、章末钩子和可视化场面没有明显同质化。'
      : `近10章存在 ${warningSignals.length} 类同质化风险：${warningSignals.map(signal => signal.label).join('、')}。`,
    chapterRangeLabel: `第${start}-${end}章`,
    actionKey: status === 'ready' ? 'enter_chapter_writing' : 'update_rolling_plan',
    signals,
    nextActions: status === 'ready'
      ? ['保持冲突来源、回报形态、章末问题和可视化场面的轮换。']
      : ['下一批章节要更换压迫来源、回报形态、章末问题或可视化场面，避免十章连续同质化。'],
  }
}

