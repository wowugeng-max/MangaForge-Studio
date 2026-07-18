import type {
  FuturePlanningCoverage,
  PlanningActionKey,
  PlanningBattleDeskLane,
  PlanningCreationPipelineStage,
  PlanningHealthIssue,
  PlanningRhythmSignal,
  PlanningSerialReleaseDesk,
  PlanningWorkspaceModel,
} from './planning-workspace-model'
import {
  aggregateDeliveryRiskCounts,
  arrayValue,
  boundedScore,
  chapterHasProse,
  chapterWordCount,
  latestReviewPayload,
  latestReviewPayloadAny,
  listLength,
  milestoneStatus,
  numericCount,
  parseJsonValue,
  planningActionLabel,
  reviewChapterNo,
  reviewTime,
  text,
} from './planning-workspace-builder'

type AnyRecord = Record<string, any>

import {
  openDeliveryRiskRepairTaskCount,
} from './planning-workspace-builder-desks-shared'

function resolveSerializationPolicy(project?: AnyRecord | null) {
  const policy = project?.reference_config?.serialization_policy || project?.serialization_policy || {}
  const dailyTargetChapters = Math.max(1, Math.round(Number(policy?.daily_chapters ?? policy?.dailyChapters ?? policy?.daily_target_chapters ?? policy?.dailyTargetChapters ?? 2) || 2))
  const minBufferDays = Math.max(1, Math.round(Number(policy?.min_buffer_days ?? policy?.minBufferDays ?? policy?.buffer_days ?? policy?.bufferDays ?? 7) || 7))
  const lastPublishedChapter = Math.max(0, Math.round(Number(policy?.last_published_chapter ?? policy?.lastPublishedChapter ?? policy?.published_until ?? policy?.publishedUntil ?? 0) || 0))
  return {
    dailyTargetChapters,
    minBufferDays,
    lastPublishedChapter,
  }
}

function chapterIsPlannedForRelease(chapter: AnyRecord) {
  return Boolean(
    text(chapter?.title) &&
    text(chapter?.chapter_goal || chapter?.chapterTask || chapter?.task) &&
    text(chapter?.conflict || chapter?.raw_payload?.conflict) &&
    text(chapter?.ending_hook || chapter?.endingHook || chapter?.hook) &&
    text(chapter?.raw_payload?.mainline_progress || chapter?.mainline_progress)
  )
}

const SERIAL_DELIVERY_REVIEW_DEFS: Array<{ type: string; payloadKey: string; tag: string }> = [
  { type: 'chapter_core_drift', payloadKey: 'core_drift', tag: '核心偏移' },
  { type: 'reader_retention_sync', payloadKey: 'reader_retention_sync', tag: '追读风险' },
  { type: 'reader_payoff_sync', payloadKey: 'reader_payoff_sync', tag: '回报欠账' },
  { type: 'reader_expectation_sync', payloadKey: 'reader_expectation_sync', tag: '期待欠账' },
  { type: 'storyline_sync', payloadKey: 'storyline_sync', tag: '剧情线风险' },
  { type: 'story_unit_sync', payloadKey: 'story_unit_sync', tag: '剧情单元风险' },
  { type: 'story_drive_sync', payloadKey: 'story_drive_sync', tag: '故事力风险' },
  { type: 'character_arc_sync', payloadKey: 'character_arc_sync', tag: '人物弧光风险' },
  { type: 'innovation_sync', payloadKey: 'innovation_sync', tag: '创新缺口' },
  { type: 'signature_scene_sync', payloadKey: 'signature_scene_sync', tag: '强场面风险' },
  { type: 'chapter_attraction_review', payloadKey: 'chapter_attraction_review', tag: '吸引力风险' },
  { type: 'chapter_benchmark_sync', payloadKey: 'chapter_benchmark_sync', tag: '标杆章风险' },
  { type: 'style_sample_sync', payloadKey: 'style_sample_sync', tag: '风格风险' },
  { type: 'readability_review', payloadKey: 'readability_review', tag: '可读性风险' },
  { type: 'volume_beat_sync', payloadKey: 'volume_beat_sync', tag: '爆点风险' },
  { type: 'runway_sync', payloadKey: 'runway_sync', tag: '航线风险' },
]

function serialReviewHasRisk(review: AnyRecord, report: AnyRecord) {
  const status = text(report?.status || review?.status).toLowerCase()
  if (['warn', 'warning', 'blocked', 'block', 'failed', 'fail', 'needs_repair', 'needs_attention'].includes(status)) return true
  const numericSignals = [
    report?.missed_count,
    report?.missedCount,
    report?.debt_count,
    report?.debtCount,
    report?.risk_count,
    report?.riskCount,
    report?.critical_count,
    report?.criticalCount,
    report?.high_count,
    report?.highCount,
  ].map(value => Number(value))
  if (numericSignals.some(value => Number.isFinite(value) && value > 0)) return true
  return [
    report?.missed,
    report?.debts,
    report?.risks,
    report?.drift_risks,
    report?.forbidden_touched,
    report?.unplanned,
    report?.immersion_risks,
    report?.meme_sense?.immersion_risks,
  ].some(value => Array.isArray(value) && value.length > 0)
}

function buildSerialDeliveryRiskMap(reviews: AnyRecord[]) {
  const risksByChapter = new Map<number, string[]>()
  const latestByChapterAndType = new Map<string, { review: AnyRecord; payload: AnyRecord; report: AnyRecord; def: typeof SERIAL_DELIVERY_REVIEW_DEFS[number] }>()
  reviews.forEach(review => {
    const def = SERIAL_DELIVERY_REVIEW_DEFS.find(item => item.type === text(review?.review_type))
    if (!def) return
    const payload = parseJsonValue(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
    const report = payload?.[def.payloadKey] || payload?.result?.[def.payloadKey] || payload?.result || payload
    const chapterNo = reviewChapterNo(review, payload)
    if (!chapterNo) return
    const key = `${chapterNo}:${def.type}`
    const current = latestByChapterAndType.get(key)
    if (!current || reviewTime(review) >= reviewTime(current.review)) {
      latestByChapterAndType.set(key, { review, payload, report, def })
    }
  })
  latestByChapterAndType.forEach(({ review, report, def, payload }) => {
    if (!serialReviewHasRisk(review, report)) return
    const chapterNo = reviewChapterNo(review, payload)
    if (!chapterNo) return
    risksByChapter.set(chapterNo, Array.from(new Set([...(risksByChapter.get(chapterNo) || []), def.tag])))
  })
  return risksByChapter
}

function serialReleaseStatusLabel(status: PlanningSerialReleaseDesk['status']) {
  if (status === 'ready') return '发布节奏健康'
  if (status === 'blocked') return '发布窗口阻塞'
  if (status === 'needs_buffer') return '存稿不足'
  return '后续规划不足'
}

export function buildSerialReleaseDeskModel(args: {
  selectedProject?: AnyRecord | null
  chapters: AnyRecord[]
  reviews: AnyRecord[]
}): PlanningSerialReleaseDesk {
  const policy = resolveSerializationPolicy(args.selectedProject)
  const sortedChapters = args.chapters.slice().sort((a, b) => Number(a?.chapter_no || 0) - Number(b?.chapter_no || 0))
  const riskMap = buildSerialDeliveryRiskMap(args.reviews)
  const maxKnownChapterNo = sortedChapters.reduce((max, chapter) => Math.max(max, Number(chapter?.chapter_no || 0)), policy.lastPublishedChapter)
  const byNo = new Map<number, AnyRecord>()
  sortedChapters.forEach(chapter => {
    const chapterNo = Number(chapter?.chapter_no || 0)
    if (chapterNo) byNo.set(chapterNo, chapter)
  })

  const classifyChapter = (chapterNo: number): PlanningSerialReleaseDesk['releaseWindow'][number]['status'] => {
    if (chapterNo <= policy.lastPublishedChapter) return 'published'
    const chapter = byNo.get(chapterNo)
    if (!chapter) return 'planned'
    const hasProse = chapterHasProse(chapter)
    const riskTags = riskMap.get(chapterNo) || []
    if (hasProse && riskTags.length > 0) return 'needs_revision'
    if (hasProse) return 'publishable'
    if (chapterIsPlannedForRelease(chapter)) return 'drafting'
    return 'planned'
  }
  const titleForChapter = (chapterNo: number) => text(byNo.get(chapterNo)?.title, `第${chapterNo}章`)
  const wordCountForChapter = (chapterNo: number) => chapterWordCount(byNo.get(chapterNo) || {})
  const publishableChapters = sortedChapters.filter(chapter => {
    const chapterNo = Number(chapter?.chapter_no || 0)
    return chapterNo > policy.lastPublishedChapter && chapterHasProse(chapter) && !(riskMap.get(chapterNo) || []).length
  }).length
  const bufferDays = Math.floor(publishableChapters / policy.dailyTargetChapters)
  const releaseWindowChapterNos = Array.from({ length: Math.max(1, policy.dailyTargetChapters) }).map((_, index) => policy.lastPublishedChapter + index + 1)
  const releaseWindow = releaseWindowChapterNos.map(chapterNo => ({
    chapterNo,
    title: titleForChapter(chapterNo),
    wordCount: wordCountForChapter(chapterNo),
    status: classifyChapter(chapterNo),
    riskTags: riskMap.get(chapterNo) || [],
  }))
  const riskChapters = sortedChapters
    .map(chapter => {
      const chapterNo = Number(chapter?.chapter_no || 0)
      return {
        chapterNo,
        title: text(chapter?.title, `第${chapterNo}章`),
        riskTags: riskMap.get(chapterNo) || [],
      }
    })
    .filter(chapter => chapter.chapterNo > policy.lastPublishedChapter && chapter.riskTags.length > 0)
    .sort((a, b) => a.chapterNo - b.chapterNo)

  const status: PlanningSerialReleaseDesk['status'] = releaseWindow.some(chapter => chapter.status === 'needs_revision')
    ? 'blocked'
    : bufferDays < policy.minBufferDays
      ? 'needs_buffer'
      : sortedChapters.filter(chapter => Number(chapter?.chapter_no || 0) > policy.lastPublishedChapter && chapterIsPlannedForRelease(chapter)).length < policy.dailyTargetChapters * 3
        ? 'needs_planning'
        : 'ready'
  const pipelineKeys: PlanningSerialReleaseDesk['pipeline'][number]['key'][] = ['published', 'publishable', 'needs_revision', 'drafting', 'planned']
  const statusCounts = new Map<PlanningSerialReleaseDesk['pipeline'][number]['key'], number>()
  for (let chapterNo = 1; chapterNo <= Math.max(maxKnownChapterNo, policy.lastPublishedChapter + policy.dailyTargetChapters); chapterNo += 1) {
    const statusKey = classifyChapter(chapterNo)
    statusCounts.set(statusKey, (statusCounts.get(statusKey) || 0) + 1)
  }
  const pipelineMeta: Record<PlanningSerialReleaseDesk['pipeline'][number]['key'], { label: string; actionKey: PlanningActionKey }> = {
    published: { label: '已发布', actionKey: 'enter_chapter_writing' },
    publishable: { label: '可发布存稿', actionKey: 'enter_chapter_writing' },
    needs_revision: { label: '待修订', actionKey: 'open_quality_revision' },
    drafting: { label: '待生成正文', actionKey: 'enter_chapter_writing' },
    planned: { label: '待补计划', actionKey: 'update_rolling_plan' },
  }
  const pipeline = pipelineKeys.map(key => {
    const count = statusCounts.get(key) || 0
    const statusColor: PlanningSerialReleaseDesk['pipeline'][number]['status'] = key === 'needs_revision' && count > 0
      ? 'block'
      : (key === 'drafting' || key === 'planned') && count > 0
        ? 'warn'
        : 'ok'
    return {
      key,
      label: pipelineMeta[key].label,
      count,
      detail: key === 'publishable'
        ? `可支撑约 ${bufferDays} 天更新。`
        : key === 'needs_revision'
          ? count > 0 ? `${count} 章有发布前风险。` : '没有发布前修订阻塞。'
          : key === 'drafting'
            ? `${count} 章已有计划但未生成正文。`
            : key === 'planned'
              ? `${count} 章仍需补齐计划或正文。`
              : `已发布到第 ${policy.lastPublishedChapter} 章。`,
      status: statusColor,
      actionKey: pipelineMeta[key].actionKey,
    }
  })

  const score = status === 'ready'
    ? 92
    : status === 'blocked'
      ? 48
      : status === 'needs_buffer'
        ? boundedScore((bufferDays / Math.max(1, policy.minBufferDays)) * 78, 55)
        : 62
  const primaryAction = status === 'blocked'
    ? {
        key: 'open_quality_revision' as PlanningActionKey,
        label: '修复发布窗口',
        reason: `发布窗口内第 ${releaseWindow.filter(chapter => chapter.status === 'needs_revision').map(chapter => chapter.chapterNo).join('、')} 章存在质检风险，先修订再发。`,
      }
    : status === 'needs_buffer'
      ? {
          key: 'enter_chapter_writing' as PlanningActionKey,
          label: '补存稿',
          reason: `当前可发布 ${publishableChapters} 章，约 ${bufferDays} 天，低于最低 ${policy.minBufferDays} 天存稿。`,
        }
      : status === 'needs_planning'
        ? {
            key: 'update_rolling_plan' as PlanningActionKey,
            label: '补后续规划',
            reason: '后续可连续生产的章节计划偏少，先补滚动规划再扩大连写。',
          }
        : {
            key: 'enter_chapter_writing' as PlanningActionKey,
            label: '继续连写',
            reason: `当前存稿 ${bufferDays} 天，发布窗口无阻塞，可以继续补下一批章节。`,
          }
  const nextActions = status === 'blocked'
    ? ['先处理发布窗口内的质检风险，再恢复发稿节奏。']
    : status === 'needs_buffer'
      ? [`补存稿：至少再完成 ${Math.max(1, policy.minBufferDays * policy.dailyTargetChapters - publishableChapters)} 章，恢复 ${policy.minBufferDays} 天安全垫。`]
      : status === 'needs_planning'
        ? ['补齐后续章节计划，确保至少三天内的章节都有目标、冲突、钩子和主线推进。']
        : ['保持日更节奏，继续把可发布存稿维持在安全线以上。']

  return {
    status,
    score,
    label: serialReleaseStatusLabel(status),
    summary: status === 'blocked'
      ? `发布窗口有 ${releaseWindow.filter(chapter => chapter.status === 'needs_revision').length} 章存在风险，暂不建议直接发布。`
      : status === 'needs_buffer'
        ? `当前可发布 ${publishableChapters} 章，约 ${bufferDays} 天，低于 ${policy.minBufferDays} 天安全线。`
        : status === 'needs_planning'
          ? '存稿数量达标，但后续可执行计划偏薄，需要先补滚动规划。'
          : `日更 ${policy.dailyTargetChapters} 章，当前可发布 ${publishableChapters} 章，存稿 ${bufferDays} 天。`,
    dailyTargetChapters: policy.dailyTargetChapters,
    minBufferDays: policy.minBufferDays,
    lastPublishedChapter: policy.lastPublishedChapter,
    publishableChapters,
    bufferDays,
    primaryAction,
    pipeline,
    releaseWindow,
    riskChapters,
    nextActions,
  }
}

