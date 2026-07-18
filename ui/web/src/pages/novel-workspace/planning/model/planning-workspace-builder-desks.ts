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

function openDeliveryRiskRepairTaskCount(productionTasks?: AnyRecord | null) {
  const runs = Array.isArray(productionTasks?.tasks)
    ? productionTasks.tasks
    : Array.isArray(productionTasks?.active)
      ? productionTasks.active
      : []
  return runs.reduce((sum: number, run: AnyRecord) => {
    const payload = run?.payload || parseJsonValue(run?.output_ref, { owner: run, kind: 'run', field: 'output_ref' }) || {}
    const tasks = Array.isArray(payload?.tasks) ? payload.tasks : []
    return sum + tasks.filter((task: AnyRecord) => {
      const status = text(task?.task_status || task?.status, 'pending')
      return text(task?.source) === 'review_annotation_risk' && !['resolved', 'completed', 'canceled', 'cancelled'].includes(status)
    }).length
  }, 0)
}

function activeProductionTaskSummary(productionTasks?: AnyRecord | null) {
  const activeRuns = Array.isArray(productionTasks?.active) ? productionTasks.active : []
  const summary = productionTasks?.summary || {}
  const activeFromSummary = Number(summary?.active)
  const running = numericCount(summary?.running, activeRuns.filter((run: AnyRecord) => text(run?.status) === 'running').length)
  const paused = numericCount(summary?.paused, activeRuns.filter((run: AnyRecord) => text(run?.status) === 'paused').length)
  const needsApproval = numericCount(summary?.needs_approval, activeRuns.filter((run: AnyRecord) => text(run?.status) === 'needs_approval').length)
  const active = Math.max(
    Number.isFinite(activeFromSummary) && activeFromSummary > 0 ? Math.round(activeFromSummary) : 0,
    activeRuns.length,
    running + paused + needsApproval,
  )
  const labels = [
    running > 0 ? `运行中 ${running}` : '',
    paused > 0 ? `暂停 ${paused}` : '',
    needsApproval > 0 ? `待确认 ${needsApproval}` : '',
  ].filter(Boolean)
  return {
    active,
    running,
    paused,
    needsApproval,
    detail: labels.length > 0 ? labels.join('，') : '队列中',
  }
}

function laneStatusFromRhythm(status: PlanningRhythmSignal['status'] | undefined): PlanningBattleDeskLane['status'] {
  if (status === 'block') return 'block'
  if (status === 'warn') return 'warn'
  return 'ok'
}

function laneStatusFromPlanning(status: 'ready' | 'needs_attention' | 'blocked' | 'missing' | 'needs_repair' | 'stale' | undefined): PlanningBattleDeskLane['status'] {
  if (status === 'blocked' || status === 'missing') return 'block'
  if (status === 'needs_attention' || status === 'needs_repair' || status === 'stale') return 'warn'
  return 'ok'
}

export function buildGovernanceHubModel(args: {
  reviews: AnyRecord[]
  healthIssues: PlanningHealthIssue[]
  first30Retention: PlanningWorkspaceModel['first30Retention']
  readerTrialRoom: PlanningWorkspaceModel['readerTrialRoom']
  storylineBoard: PlanningWorkspaceModel['storylineBoard']
  longformRhythm: PlanningWorkspaceModel['longformRhythm']
  future10Coverage: FuturePlanningCoverage
  future100Coverage: FuturePlanningCoverage
  productionTasks?: AnyRecord | null
}): PlanningWorkspaceModel['governanceHub'] {
  const assetIntake = latestReviewPayloadAny(args.reviews, 'asset_intake', 'asset_intake')
  const deliveryRiskCounts = aggregateDeliveryRiskCounts(args.reviews)
  const qualityRiskCount = deliveryRiskCounts.total
  const qualityRiskLabels = deliveryRiskCounts.labels
  const existingDeliveryRiskTaskCount = openDeliveryRiskRepairTaskCount(args.productionTasks)
  const activeTasks = activeProductionTaskSummary(args.productionTasks)

  const discoveredAssets = Array.isArray(assetIntake?.discovered_assets) ? assetIntake.discovered_assets : []
  const appliedAssetNames = new Set(
    Array.isArray(assetIntake?.applied_asset_names)
      ? assetIntake.applied_asset_names.map((item: any) => text(item)).filter(Boolean)
      : [],
  )
  const pendingAssets = discoveredAssets.filter((item: AnyRecord) => !appliedAssetNames.has(text(item?.name)))
  const longformIssueCount = args.healthIssues.length
    + args.longformRhythm.signals.filter(signal => signal.status !== 'ok').length
    + (args.future10Coverage.ready ? 0 : 1)
    + (args.future100Coverage.ready ? 0 : 1)
  const hasHardPlanningBlock = args.healthIssues.some(issue => issue.key === 'missing_reader_promise' || issue.key === 'missing_volume_goal')

  const checkpoints: PlanningWorkspaceModel['governanceHub']['checkpoints'] = [
    {
      key: 'delivery_risk',
      label: '交稿风险',
      status: existingDeliveryRiskTaskCount > 0 || qualityRiskCount > 0 ? 'warn' : 'ok',
      count: Math.max(qualityRiskCount, existingDeliveryRiskTaskCount),
      detail: existingDeliveryRiskTaskCount > 0
        ? `已有 ${existingDeliveryRiskTaskCount} 个交稿风险修复任务待处理，先进入任务中心逐项修订和复检。`
        : qualityRiskCount > 0
        ? `还有 ${qualityRiskCount} 项${qualityRiskLabels.join('、') || '交稿'}风险待修。`
        : '最近交稿风险可控。',
      actionKey: existingDeliveryRiskTaskCount > 0 ? 'open_task_center' : qualityRiskCount > 0 ? 'create_delivery_risk_repair' : 'enter_chapter_writing',
    },
    {
      key: 'first30_retention',
      label: '前30章留存',
      status: args.first30Retention.status === 'ready' ? 'ok' : args.first30Retention.status === 'blocked' ? 'block' : 'warn',
      count: args.first30Retention.risks.length || (args.first30Retention.status === 'ready' ? 0 : 1),
      detail: args.first30Retention.summary,
      actionKey: args.first30Retention.actionKey,
    },
    {
      key: 'reader_trial',
      label: '读者试读',
      status: args.readerTrialRoom.status === 'ready' ? 'ok' : args.readerTrialRoom.status === 'blocked' ? 'block' : 'warn',
      count: args.readerTrialRoom.dropPoints.length || (args.readerTrialRoom.status === 'ready' ? 0 : 1),
      detail: args.readerTrialRoom.summary,
      actionKey: args.readerTrialRoom.actionKey,
    },
    {
      key: 'storyline',
      label: '剧情线',
      status: args.storylineBoard.status === 'ready' ? 'ok' : args.storylineBoard.status === 'missing' ? 'block' : 'warn',
      count: args.storylineBoard.overdueCount + args.storylineBoard.debtCount + args.storylineBoard.retentionRiskCount + deliveryRiskCounts.storylineRiskCount,
      detail: args.storylineBoard.summary,
      actionKey: args.storylineBoard.status === 'ready' ? 'enter_chapter_writing' : 'open_story_assets',
    },
    {
      key: 'asset_intake',
      label: '新资产',
      status: pendingAssets.length > 0 ? 'warn' : 'ok',
      count: pendingAssets.length,
      detail: pendingAssets.length > 0 ? `${pendingAssets.length} 个新资产待确认，避免正文临时资产游离在设定池之外。` : '没有待确认的新人物、物品、能力、势力、地点或伏笔。',
      actionKey: pendingAssets.length > 0 ? 'open_story_assets' : 'enter_chapter_writing',
    },
    {
      key: 'longform_material',
      label: '长线材料',
      status: hasHardPlanningBlock ? 'block' : longformIssueCount > 0 ? 'warn' : 'ok',
      count: longformIssueCount,
      detail: args.longformRhythm.summary,
      actionKey: longformIssueCount > 0 ? 'update_rolling_plan' : 'enter_chapter_writing',
    },
  ]

  const firstRisk = checkpoints.find(item => item.status !== 'ok')
  const primaryCheckpoint = checkpoints.find(item => item.key === 'delivery_risk' && item.status !== 'ok')
    || checkpoints.find(item => item.key === 'first30_retention' && item.status === 'block')
    || firstRisk
  const status: PlanningWorkspaceModel['governanceHub']['status'] = checkpoints.some(item => item.status === 'block')
    ? 'blocked'
    : checkpoints.some(item => item.status === 'warn')
      ? 'needs_action'
      : 'ready'
  const labels: Record<PlanningActionKey, string> = {
    update_rolling_plan: '更新滚动规划',
    complete_volume_plan: '补齐当前卷规划',
    enter_story_planning: '进入故事规划',
    enter_chapter_writing: '进入当前章写作',
    open_outline_tree: '查看完整大纲',
    future100_audit: '检查未来100章',
    future100_generate: '生成未来100章',
    longform_pressure: '运行长线压力测试',
    longform_creation_diagnosis: '运行创作诊断',
    topic_validation: '验证原创选题',
    reference_diagnosis: '诊断参考知识',
    open_story_assets: '打开资料设定',
    update_story_state: '校正故事状态',
    open_quality_revision: '进入质检修订',
    run_first30_retention: '运行前30章诊断',
    create_first30_repair: '生成留存修复任务',
    run_reader_trial_review: '运行读者试读复盘',
    create_reader_trial_repair: '生成试读修复任务',
    create_delivery_risk_repair: '生成风险修复任务',
    record_storyline_diff_decision: '记录剧情线决策',
    create_storyline_decision_tasks: '生成剧情线决策任务',
    open_task_center: '打开任务中心',
  }
  const activeTaskReason = activeTasks.active > 0
    ? `还有 ${activeTasks.active} 个后台任务正在运行或待处理（${activeTasks.detail}）。先进入任务中心查看进度、恢复失败任务或等待当前任务结束。`
    : ''
  const primaryKey = activeTasks.active > 0 ? 'open_task_center' : primaryCheckpoint?.actionKey || 'enter_chapter_writing'

  return {
    status,
    summary: activeTasks.active > 0
      ? `${activeTasks.active} 个后台任务正在运行或待处理，先回任务中心保持流水线状态清晰。`
      : status === 'ready'
        ? '核心、留存、剧情线、资产和长线材料都处于可继续创作状态。'
        : `${checkpoints.filter(item => item.status !== 'ok').length} 类连载治理项需要处理：${checkpoints.filter(item => item.status !== 'ok').map(item => item.label).join('、')}。`,
    primaryAction: {
      key: primaryKey,
      label: labels[primaryKey],
      reason: activeTaskReason || primaryCheckpoint?.detail || (existingDeliveryRiskTaskCount > 0 ? `已有 ${existingDeliveryRiskTaskCount} 个交稿风险修复任务待处理。` : '当前可以进入章节写作。'),
    },
    checkpoints,
  }
}

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

function rhythmStatusFromSignals(signals: PlanningRhythmSignal[]): PlanningWorkspaceModel['longformRhythm']['status'] {
  if (signals.some(signal => signal.status === 'block')) return 'blocked'
  if (signals.some(signal => signal.status === 'warn')) return 'needs_attention'
  return 'ready'
}

export function buildLongformRhythmModel(args: {
  reviews: AnyRecord[]
  writtenWords: number
  currentVolumeGoal: string
  future100Coverage: FuturePlanningCoverage
  healthIssues: PlanningHealthIssue[]
  first30Retention: PlanningWorkspaceModel['first30Retention']
  storylineBoard: PlanningWorkspaceModel['storylineBoard']
  volumeBeatBudget: PlanningWorkspaceModel['volumeBeatBudget']
}): PlanningWorkspaceModel['longformRhythm'] {
  const coreDrift = latestReviewPayload(args.reviews, 'chapter_core_drift', 'core_drift')
  const payoffSync = latestReviewPayload(args.reviews, 'reader_payoff_sync', 'reader_payoff_sync')
  const deliveryRiskCounts = aggregateDeliveryRiskCounts(args.reviews)
  const coreRiskCount = deliveryRiskCounts.coreRiskCount
  const coreStatus: PlanningRhythmSignal['status'] = args.healthIssues.some(issue => issue.key === 'missing_reader_promise')
    ? 'block'
    : text(coreDrift?.status).toLowerCase() === 'warn' || coreRiskCount > 0
      ? 'warn'
      : 'ok'
  const future100Ratio = args.future100Coverage.required > 0
    ? args.future100Coverage.planned / args.future100Coverage.required
    : 1
  const volumeStatus: PlanningRhythmSignal['status'] = !args.currentVolumeGoal || args.volumeBeatBudget.status === 'blocked'
    ? 'block'
    : future100Ratio < 0.3 || args.volumeBeatBudget.status === 'needs_attention'
      ? 'warn'
      : 'ok'
  const payoffDebt = deliveryRiskCounts.payoffDebtCount
  const payoffStatus: PlanningRhythmSignal['status'] = payoffDebt > 0 || text(payoffSync?.status).toLowerCase() === 'warn' ? 'warn' : 'ok'
  const fatigueRisk = args.first30Retention.status !== 'ready'
    || args.storylineBoard.overdueCount > 0
    || args.storylineBoard.debtCount > 0
    || args.storylineBoard.retentionRiskCount > 0
  const fatigueStatus: PlanningRhythmSignal['status'] = fatigueRisk ? 'warn' : 'ok'
  const bandIndex = Math.max(1, Math.floor(Math.max(0, args.writtenWords) / 100000) + 1)

  const signals: PlanningRhythmSignal[] = [
    {
      key: 'core',
      label: '核心守恒',
      status: coreStatus,
      score: coreStatus === 'block' ? 45 : coreStatus === 'warn' ? Math.min(68, boundedScore(coreDrift?.score, 68)) : boundedScore(coreDrift?.score, 88),
      detail: coreStatus === 'block'
        ? '长篇核心承诺缺失，不能进入连续生产。'
        : coreStatus === 'warn'
          ? `核心偏移 ${coreRiskCount || 1}`
          : '核心承诺、卷目标和章节服务关系稳定。',
      actionKey: coreStatus === 'ok' ? 'open_outline_tree' : 'open_story_assets',
    },
    {
      key: 'volume',
      label: '卷级推进',
      status: volumeStatus,
      score: volumeStatus === 'block' ? 45 : volumeStatus === 'warn' ? Math.min(args.volumeBeatBudget.score, Math.max(55, Math.round(future100Ratio * 100))) : 86,
      detail: volumeStatus === 'block'
        ? '当前章节没有明确卷目标。'
        : args.volumeBeatBudget.status === 'needs_attention'
          ? args.volumeBeatBudget.summary
        : volumeStatus === 'warn'
          ? `未来100章规划 ${args.future100Coverage.label}，不适合长时间自动连写。`
          : `当前卷目标明确，未来100章规划 ${args.future100Coverage.label}。`,
      actionKey: volumeStatus === 'ok' ? 'open_outline_tree' : 'update_rolling_plan',
    },
    {
      key: 'payoff',
      label: '回报兑现',
      status: payoffStatus,
      score: boundedScore(payoffSync?.score, payoffStatus === 'warn' ? 64 : 86),
      detail: payoffStatus === 'warn'
        ? text(payoffSync?.label, `回报欠账 ${payoffDebt}`)
        : '章节承诺、场景回报和待回收期待处于可控状态。',
      actionKey: payoffStatus === 'ok' ? 'enter_chapter_writing' : 'open_quality_revision',
    },
    {
      key: 'fatigue',
      label: '疲劳风险',
      status: fatigueStatus,
      score: fatigueStatus === 'warn' ? Math.max(50, Math.min(78, Number(args.first30Retention.score || 72))) : 86,
      detail: fatigueStatus === 'warn'
        ? `剧情线债务 ${args.storylineBoard.debtCount}，逾期 ${args.storylineBoard.overdueCount}，前30章状态 ${args.first30Retention.status}。`
        : '留存曲线、剧情线推进和回收压力没有明显疲劳信号。',
      actionKey: fatigueStatus === 'warn' ? 'run_first30_retention' : 'enter_chapter_writing',
    },
  ]
  const status = rhythmStatusFromSignals(signals)
  const score = Math.max(0, Math.min(100, Math.round(signals.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, signals.length))))
  const riskySignals = signals.filter(signal => signal.status !== 'ok')

  return {
    status,
    score,
    label: status === 'ready' ? `节奏健康 ${score}` : status === 'blocked' ? `节奏阻塞 ${score}` : `节奏风险 ${score}`,
    summary: status === 'ready'
      ? '长篇节奏稳定，可以继续推进当前章。'
      : `长篇节奏存在 ${riskySignals.length} 项风险：${riskySignals.map(signal => signal.label).join('、')}。`,
    currentBandLabel: `第${bandIndex}个10万字`,
    signals,
    nextActions: status === 'ready'
      ? ['保持卷目标、回报兑现和剧情线回收的节奏闭环。']
      : ['先处理核心偏移、回报欠账和剧情线债务，再连续生成下一批章节。'],
  }
}

export function buildLongformBattleDeskModel(args: {
  reviews: AnyRecord[]
  longformSpineGuard: PlanningWorkspaceModel['longformSpineGuard']
  millionWordMilestones: PlanningWorkspaceModel['millionWordMilestones']
  longformRhythm: PlanningWorkspaceModel['longformRhythm']
  first30Retention: PlanningWorkspaceModel['first30Retention']
  readerTrustLedger: PlanningWorkspaceModel['readerTrustLedger']
  readerTrialRoom: PlanningWorkspaceModel['readerTrialRoom']
  storylineBoard: PlanningWorkspaceModel['storylineBoard']
  volumeBeatBudget: PlanningWorkspaceModel['volumeBeatBudget']
  innovationRadar: PlanningWorkspaceModel['innovationRadar']
  storyUnitWorkshop: PlanningWorkspaceModel['storyUnitWorkshop']
  future10Coverage: FuturePlanningCoverage
  future100Coverage: FuturePlanningCoverage
}): PlanningWorkspaceModel['longformBattleDesk'] {
  const coreSignal = args.longformRhythm.signals.find(signal => signal.key === 'core')
  const coreDrift = latestReviewPayloadAny(args.reviews, 'chapter_core_drift', 'core_drift')
  const storylineSync = latestReviewPayloadAny(args.reviews, 'storyline_sync', 'storyline_sync')
  const deliveryRiskCounts = aggregateDeliveryRiskCounts(args.reviews)
  const coreRiskCount = deliveryRiskCounts.coreRiskCount
  const spineBlocked = args.longformSpineGuard.status === 'blocked'
  const spineNeedsAttention = args.longformSpineGuard.status !== 'ready'
  const storylineMissedCount = Math.max(listLength(storylineSync?.missed), deliveryRiskCounts.storylineRiskCount)
  const storylineForbiddenCount = listLength(storylineSync?.forbidden_touched)
  const readerPullStatus: PlanningBattleDeskLane['status'] = args.first30Retention.status === 'blocked'
    ? 'block'
    : args.first30Retention.status !== 'ready' || args.readerTrustLedger.status === 'needs_attention' || args.readerTrialRoom.status === 'blocked'
      ? 'warn'
      : 'ok'
  const milestoneStatus: PlanningBattleDeskLane['status'] = args.millionWordMilestones.status === 'blocked'
    ? 'block'
    : args.millionWordMilestones.status === 'needs_attention'
      ? 'warn'
      : 'ok'
  const productionFuelStatus: PlanningBattleDeskLane['status'] = milestoneStatus === 'block' || !args.future10Coverage.ready || !args.future100Coverage.ready || args.storyUnitWorkshop.status !== 'ready'
    ? milestoneStatus === 'block' || args.storyUnitWorkshop.status === 'blocked' ? 'block' : 'warn'
    : 'ok'
  const futureScore = Math.round(((args.future10Coverage.ready ? 100 : args.future10Coverage.planned * 10) + (args.future100Coverage.required > 0 ? (args.future100Coverage.planned / args.future100Coverage.required) * 100 : 100)) / 2)

  const lanes: PlanningBattleDeskLane[] = [
    {
      key: 'story_core',
      label: '核心守恒',
      status: spineBlocked ? 'block' : spineNeedsAttention ? 'warn' : coreRiskCount > 0 ? 'warn' : laneStatusFromRhythm(coreSignal?.status),
      score: spineNeedsAttention ? args.longformSpineGuard.score : boundedScore(coreDrift?.score, coreSignal?.score || args.longformRhythm.score),
      detail: spineNeedsAttention
        ? `全书主轴缺 ${args.longformSpineGuard.missingAxes.join('、') || '可选护栏'}，不能放大自动连写。`
        : coreRiskCount > 0
          ? `核心偏移 ${coreRiskCount}`
          : coreSignal?.detail || '核心承诺稳定。',
      actionKey: spineNeedsAttention ? args.longformSpineGuard.actionKey : coreRiskCount > 0 ? 'open_quality_revision' : coreSignal?.actionKey || 'open_story_assets',
    },
    {
      key: 'reader_pull',
      label: '读者拉力',
      status: readerPullStatus,
      score: boundedScore(args.first30Retention.score ?? args.readerTrustLedger.score ?? args.readerTrialRoom.score, readerPullStatus === 'ok' ? 86 : 68),
      detail: args.first30Retention.status !== 'ready'
        ? `前30章：${args.first30Retention.summary}`
        : args.readerTrustLedger.status === 'needs_attention'
          ? args.readerTrustLedger.summary
          : args.readerTrialRoom.status === 'blocked'
            ? args.readerTrialRoom.summary
            : '前30章、追读信任和试读拉力可继续支撑当前章。',
      actionKey: args.first30Retention.status !== 'ready'
        ? args.first30Retention.actionKey
        : args.readerTrustLedger.status === 'needs_attention'
          ? args.readerTrustLedger.actionKey
          : args.readerTrialRoom.status !== 'ready' && args.readerTrialRoom.status !== 'missing'
            ? args.readerTrialRoom.actionKey
            : 'enter_chapter_writing',
    },
    {
      key: 'storyline',
      label: '剧情线调度',
      status: args.storylineBoard.status === 'missing' ? 'block' : args.storylineBoard.status === 'needs_attention' || storylineMissedCount > 0 || storylineForbiddenCount > 0 ? 'warn' : 'ok',
      score: storylineMissedCount > 0 || storylineForbiddenCount > 0 ? 62 : args.storylineBoard.status === 'ready' ? 86 : 70,
      detail: storylineMissedCount > 0 || storylineForbiddenCount > 0
        ? `剧情线漏推 ${storylineMissedCount}，禁揭风险 ${storylineForbiddenCount}。`
        : args.storylineBoard.summary,
      actionKey: args.storylineBoard.status === 'ready' && storylineMissedCount === 0 && storylineForbiddenCount === 0 ? 'enter_chapter_writing' : 'open_story_assets',
    },
    {
      key: 'volume_beat',
      label: '卷级爆点',
      status: laneStatusFromPlanning(args.volumeBeatBudget.status),
      score: args.volumeBeatBudget.score,
      detail: args.volumeBeatBudget.summary,
      actionKey: args.volumeBeatBudget.status === 'ready' ? 'enter_chapter_writing' : 'complete_volume_plan',
    },
    {
      key: 'innovation_ip',
      label: '创新/IP场面',
      status: args.innovationRadar.status === 'missing' ? 'warn' : args.innovationRadar.status === 'needs_attention' ? 'warn' : 'ok',
      score: boundedScore(args.innovationRadar.score, args.innovationRadar.status === 'ready' ? 86 : 66),
      detail: args.innovationRadar.missedCount > 0 ? `创新缺口 ${args.innovationRadar.missedCount}：${args.innovationRadar.summary}` : args.innovationRadar.summary,
      actionKey: args.innovationRadar.status === 'ready' ? 'enter_chapter_writing' : args.innovationRadar.actionKey,
    },
    {
      key: 'production_fuel',
      label: '生产燃料',
      status: productionFuelStatus,
      score: boundedScore(Math.min(futureScore, args.storyUnitWorkshop.score, args.millionWordMilestones.score), productionFuelStatus === 'ok' ? 86 : 65),
      detail: milestoneStatus !== 'ok'
        ? `百万字里程碑：${args.millionWordMilestones.summary}`
        : `未来10章 ${args.future10Coverage.label}，未来100章 ${args.future100Coverage.label}，剧情单元：${args.storyUnitWorkshop.label}。`,
      actionKey: milestoneStatus !== 'ok'
        ? args.millionWordMilestones.actionKey
        : !args.future100Coverage.ready ? 'future100_generate' : !args.future10Coverage.ready || args.storyUnitWorkshop.status !== 'ready' ? 'update_rolling_plan' : 'enter_chapter_writing',
    },
  ]
  const status: PlanningWorkspaceModel['longformBattleDesk']['status'] = lanes.some(lane => lane.status === 'block')
    ? 'blocked'
    : lanes.some(lane => lane.status === 'warn')
      ? 'needs_action'
      : 'ready'
  const score = Math.max(0, Math.min(100, Math.round(lanes.reduce((sum, lane) => sum + lane.score, 0) / Math.max(1, lanes.length))))
  const priorityOrder: PlanningBattleDeskLane['key'][] = ['story_core', 'reader_pull', 'storyline', 'volume_beat', 'innovation_ip', 'production_fuel']
  const primaryLane = priorityOrder
    .map(key => lanes.find(lane => lane.key === key))
    .find((lane): lane is PlanningBattleDeskLane => Boolean(lane && lane.status !== 'ok')) || lanes[0]
  const riskChips = lanes.flatMap(lane => {
    if (lane.status === 'ok') return []
    if (lane.key === 'story_core') return ['核心偏移']
    if (lane.key === 'reader_pull') return ['前30章留存']
    if (lane.key === 'storyline') return storylineMissedCount > 0 ? ['剧情线漏推'] : ['剧情线调度']
    if (lane.key === 'volume_beat') return ['卷级爆点']
    if (lane.key === 'innovation_ip') return ['创新缺口']
    return ['生产燃料']
  })

  return {
    status,
    score,
    label: status === 'ready' ? `长篇作战 ${score}` : status === 'blocked' ? `长篇作战阻塞 ${score}` : `长篇作战待治理 ${score}`,
    summary: status === 'ready'
      ? '核心、留存、剧情线、卷级爆点、创新场面和生产燃料都能支撑继续写作。'
      : `先处理 ${primaryLane.label}：${primaryLane.detail}`,
    primaryAction: {
      key: primaryLane.actionKey,
      label: planningActionLabel(primaryLane.actionKey),
      reason: primaryLane.detail,
    },
    lanes,
    riskChips: Array.from(new Set(riskChips)).slice(0, 6),
  }
}

function pipelineStatusFromPlanning(status: string): PlanningCreationPipelineStage['status'] {
  if (['blocked', 'missing', 'block'].includes(status)) return 'block'
  if (['needs_attention', 'needs_action', 'needs_repair', 'needs_buffer', 'needs_planning', 'stale', 'warn', 'drifting'].includes(status)) return 'warn'
  return 'ok'
}

export function buildCreationPipelineModel(args: {
  longformSpineGuard: PlanningWorkspaceModel['longformSpineGuard']
  millionWordMilestones: PlanningWorkspaceModel['millionWordMilestones']
  future10Coverage: FuturePlanningCoverage
  future100Coverage: FuturePlanningCoverage
  storylineBoard: PlanningWorkspaceModel['storylineBoard']
  characterArcBoard: PlanningWorkspaceModel['characterArcBoard']
  activeChapter: AnyRecord
  currentVolumeGoal: string
  governanceHub: PlanningWorkspaceModel['governanceHub']
  serialReleaseDesk: PlanningWorkspaceModel['serialReleaseDesk']
}): PlanningWorkspaceModel['creationPipeline'] {
  const activeChapterPlanned = Boolean(
    text(args.activeChapter?.chapter_goal || args.activeChapter?.chapterTask || args.activeChapter?.task) &&
    text(args.activeChapter?.conflict || args.activeChapter?.raw_payload?.conflict) &&
    text(args.activeChapter?.ending_hook || args.activeChapter?.endingHook || args.activeChapter?.hook) &&
    args.currentVolumeGoal
  )
  const longformPlanBlocked = args.millionWordMilestones.status === 'blocked'
  const longformPlanWarn = !args.future10Coverage.ready
    || !args.future100Coverage.ready
    || args.millionWordMilestones.status !== 'ready'
  const longformPlanAction: PlanningActionKey = args.millionWordMilestones.status !== 'ready'
    ? args.millionWordMilestones.actionKey
    : !args.future10Coverage.ready
      ? 'update_rolling_plan'
      : !args.future100Coverage.ready
        ? 'future100_generate'
        : 'complete_volume_plan'
  const assetBlocked = args.storylineBoard.status === 'missing' || args.characterArcBoard.status === 'missing'
  const assetWarn = args.storylineBoard.status !== 'ready' || args.characterArcBoard.status !== 'ready'
  const chapterLaunchStatus: PlanningCreationPipelineStage['status'] = activeChapterPlanned ? 'ok' : 'warn'
  const stages: PlanningCreationPipelineStage[] = [
    {
      key: 'book_core',
      label: '全书核心',
      status: pipelineStatusFromPlanning(args.longformSpineGuard.status),
      active: false,
      score: args.longformSpineGuard.score,
      detail: args.longformSpineGuard.summary,
      actionKey: args.longformSpineGuard.actionKey,
    },
    {
      key: 'longform_plan',
      label: '长线规划',
      status: longformPlanBlocked ? 'block' : longformPlanWarn ? 'warn' : 'ok',
      active: false,
      score: Math.min(
        args.millionWordMilestones.score,
        Math.round(((args.future10Coverage.planned / Math.max(1, args.future10Coverage.required)) * 100 + (args.future100Coverage.planned / Math.max(1, args.future100Coverage.required)) * 100) / 2),
      ),
      detail: longformPlanWarn
        ? `未来10章 ${args.future10Coverage.label}，未来100章 ${args.future100Coverage.label}，里程碑：${args.millionWordMilestones.label}。`
        : '未来章节、百万字里程碑和当前卷规划可支撑继续开写。',
      actionKey: longformPlanAction,
    },
    {
      key: 'story_assets',
      label: '设定资产',
      status: assetBlocked ? 'block' : assetWarn ? 'warn' : 'ok',
      active: false,
      score: assetBlocked ? 50 : assetWarn ? 72 : 88,
      detail: assetWarn
        ? `${args.storylineBoard.summary} ${args.characterArcBoard.summary}`
        : '剧情线、角色线和关系线已进入可调度状态。',
      actionKey: assetWarn ? 'open_story_assets' : 'enter_chapter_writing',
    },
    {
      key: 'chapter_launch',
      label: '章节开写',
      status: chapterLaunchStatus,
      active: false,
      score: activeChapterPlanned ? 88 : 66,
      detail: activeChapterPlanned
        ? '当前章已有目标、冲突、章末钩子和卷目标承接，可进入开写任务书。'
        : '当前章缺少目标、冲突、章末钩子或卷目标承接，建议先补章节计划。',
      actionKey: activeChapterPlanned ? 'enter_chapter_writing' : 'update_rolling_plan',
    },
    {
      key: 'delivery_acceptance',
      label: '交稿验收',
      status: pipelineStatusFromPlanning(args.governanceHub.status),
      active: false,
      score: args.governanceHub.status === 'ready' ? 88 : args.governanceHub.status === 'blocked' ? 55 : 72,
      detail: args.governanceHub.summary,
      actionKey: args.governanceHub.primaryAction.key,
    },
    {
      key: 'serial_release',
      label: '连载发布',
      status: pipelineStatusFromPlanning(args.serialReleaseDesk.status),
      active: false,
      score: args.serialReleaseDesk.score,
      detail: args.serialReleaseDesk.summary,
      actionKey: args.serialReleaseDesk.primaryAction.key,
    },
  ]
  const current = stages.find(stage => stage.status !== 'ok') || stages.find(stage => stage.key === 'chapter_launch') || stages[0]
  const normalizedStages = stages.map(stage => ({ ...stage, active: stage.key === current.key }))
  const riskCount = normalizedStages.filter(stage => stage.status !== 'ok').length
  return {
    currentStageKey: current.key,
    summary: riskCount > 0
      ? `当前建议先处理「${current.label}」：${current.detail}`
      : '全书核心、长线规划、设定资产、章节开写、交稿验收和连载发布均处于可推进状态。',
    riskCount,
    primaryAction: {
      key: current.actionKey,
      label: planningActionLabel(current.actionKey),
      reason: current.detail,
    },
    stages: normalizedStages,
  }
}

