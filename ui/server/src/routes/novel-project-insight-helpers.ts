import type { Express } from 'express'
import {
  appendNovelRun,
  createNovelReview,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  updateNovelRun,
} from '../novel'
import { asArray, compactText, parseJsonLikePayload } from './novel-route-utils'

type ProjectInsightRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getStoryState: (project: any) => any
  buildProductionDashboard: (project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[], runs: any[]) => any
  buildProductionMetrics: (chapters: any[], reviews: any[], runs: any[]) => any
  buildCommercialReadiness: (project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[], runs: any[]) => any
}

function outlineChapterNo(outline: any) {
  const rawNo = Number(outline.raw_payload?.chapter_no || outline.raw_payload?.future100?.chapter_no || 0)
  if (rawNo) return rawNo
  const match = String(outline.title || '').match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

function futureSkeletonScore(outline: any) {
  const future = outline?.raw_payload?.future100 || {}
  return [
    future.title || outline?.title ? 14 : 0,
    String(future.chapter_goal || outline?.summary || '').replace(/\s/g, '').length >= 18 ? 28 : 0,
    future.conflict || asArray(outline?.conflict_points)[0] ? 24 : 0,
    future.payoff || asArray(outline?.turning_points)[0] ? 18 : 0,
    future.ending_hook || outline?.hook ? 16 : 0,
  ].reduce((sum, value) => sum + value, 0)
}

export function buildLongformProductionTrends(chapters: any[], outlines: any[], reviews: any[], runs: any[]) {
  const chapterByNo = new Map(chapters.map(chapter => [Number(chapter.chapter_no || 0), chapter]))
  const skeletonOutlines = outlines
    .filter(outline => String(outline.outline_type || '') === 'chapter' && (outline.raw_payload?.source === 'future_100_skeleton' || outline.raw_payload?.future100))
    .map(outline => ({ outline, chapter_no: outlineChapterNo(outline), skeleton_score: futureSkeletonScore(outline) }))
    .filter(item => item.chapter_no > 0)
    .sort((a, b) => a.chapter_no - b.chapter_no)
  const skeletonByNo = new Map(skeletonOutlines.map(item => [item.chapter_no, item]))

  const reviewByChapter = new Map<number, any[]>()
  for (const review of reviews) {
    const payload = parseJsonLikePayload(review.payload) || {}
    const chapterId = Number(payload.chapter_id || payload.report?.chapter_id || payload.context_package?.chapter?.id || 0)
    if (!chapterId) continue
    reviewByChapter.set(chapterId, [...(reviewByChapter.get(chapterId) || []), { review, payload }])
  }

  const runChapterSignals = new Map<number, any[]>()
  const failureSignals = new Map<number, string[]>()
  for (const run of runs) {
    const payload = parseJsonLikePayload(run.output_ref) || {}
    for (const row of asArray(payload.chapters)) {
      const chapterNo = Number(row.chapter_no || 0)
      if (!chapterNo) continue
      runChapterSignals.set(chapterNo, [...(runChapterSignals.get(chapterNo) || []), { run, row }])
      if (row.status === 'failed' || row.error) {
        failureSignals.set(chapterNo, [...(failureSignals.get(chapterNo) || []), compactText(row.error || payload.last_error?.error || run.error_message || '章节任务失败', 160)])
      }
    }
    const match = String(run.step_name || '').match(/chapter-(\d+)/)
    if (['failed', 'error'].includes(run.status) && match) {
      const chapterNo = Number(match[1])
      failureSignals.set(chapterNo, [...(failureSignals.get(chapterNo) || []), compactText(run.error_message || payload.error || '运行失败', 160)])
    }
  }

  const chapterNos = Array.from(new Set([
    ...chapters.map(chapter => Number(chapter.chapter_no || 0)).filter(Boolean),
    ...skeletonOutlines.map(item => item.chapter_no),
  ])).sort((a, b) => a - b)

  const rows = chapterNos.map(chapterNo => {
    const chapter = chapterByNo.get(chapterNo)
    const skeleton = skeletonByNo.get(chapterNo)
    const chapterReviews = chapter ? reviewByChapter.get(Number(chapter.id)) || [] : []
    const latestQuality = chapterReviews.filter(item => item.review.review_type === 'prose_quality').sort((a, b) => String(b.review.created_at || '').localeCompare(String(a.review.created_at || '')))[0]
    const latestEditor = chapterReviews.filter(item => item.review.review_type === 'editor_report').sort((a, b) => String(b.review.created_at || '').localeCompare(String(a.review.created_at || '')))[0]
    const latestSimilarity = chapterReviews.filter(item => item.review.review_type === 'similarity_report').sort((a, b) => String(b.review.created_at || '').localeCompare(String(a.review.created_at || '')))[0]
    const signals = runChapterSignals.get(chapterNo) || []
    const materialScores = signals.map(item => Number(item.row.material_score || 0)).filter(score => score > 0)
    const skeletonScores = [
      skeleton?.skeleton_score,
      ...signals.map(item => Number(item.row.skeleton_score || 0)),
    ].filter(score => Number(score) > 0)
    const qualityScore = Number(latestQuality?.payload?.self_check?.review?.score || latestEditor?.payload?.report?.overall_score || 0) || null
    const similarityRisk = Number(latestSimilarity?.payload?.report?.overall_risk_score || 0) || null
    const failures = Array.from(new Set(failureSignals.get(chapterNo) || [])).slice(0, 3)
    const readiness = Math.round((
      (skeletonScores.length ? Math.max(...skeletonScores) : 0)
      + (materialScores.length ? Math.max(...materialScores) : 0)
      + (qualityScore || (chapter?.chapter_text ? 70 : 0))
    ) / 3)
    return {
      chapter_no: chapterNo,
      chapter_id: chapter?.id || null,
      outline_id: skeleton?.outline?.id || chapter?.outline_id || null,
      title: chapter?.title || skeleton?.outline?.title || '',
      has_text: Boolean(chapter?.chapter_text),
      word_count: String(chapter?.chapter_text || '').replace(/\s/g, '').length,
      skeleton_score: skeletonScores.length ? Math.max(...skeletonScores) : null,
      material_score: materialScores.length ? Math.max(...materialScores) : null,
      quality_score: qualityScore,
      similarity_risk: similarityRisk,
      failure_count: failures.length,
      failures,
      readiness,
      status: failures.length ? 'failed_attention' : qualityScore && qualityScore < 78 ? 'quality_attention' : readiness >= 75 ? 'stable' : readiness >= 55 ? 'needs_material' : 'not_ready',
    }
  })
  const avg = (values: any[]) => {
    const nums = values.map(Number).filter(value => Number.isFinite(value) && value > 0)
    return nums.length ? Math.round(nums.reduce((sum, value) => sum + value, 0) / nums.length) : null
  }
  const failedRows = rows.filter(row => row.failure_count > 0)
  const weakRows = rows.filter(row => row.status !== 'stable').slice(0, 30)
  return {
    created_at: new Date().toISOString(),
    summary: {
      chapter_count: rows.length,
      skeleton_count: skeletonOutlines.length,
      written_count: rows.filter(row => row.has_text).length,
      failed_chapter_count: failedRows.length,
      avg_skeleton_score: avg(rows.map(row => row.skeleton_score)),
      avg_material_score: avg(rows.map(row => row.material_score)),
      avg_quality_score: avg(rows.map(row => row.quality_score)),
      avg_readiness: avg(rows.map(row => row.readiness)),
    },
    rows,
    weak_rows: weakRows,
    failure_reasons: Array.from(new Set(rows.flatMap(row => row.failures))).slice(0, 20),
    recommendations: [
      skeletonOutlines.length < 80 ? '未来100章骨架覆盖不足，先补齐骨架再批量生产。' : '',
      rows.some(row => row.skeleton_score && row.skeleton_score < 70) ? '存在低骨架分章节，优先补目标、冲突、回报和钩子。' : '',
      rows.some(row => row.material_score && row.material_score < 65) ? '存在材料分不足章节，先补上下文和场景卡。' : '',
      rows.some(row => row.quality_score && row.quality_score < 78) ? '存在低质量分章节，进入质检修订链路。' : '',
      failedRows.length ? '存在失败章节，先处理失败原因再扩大批量生产。' : '',
    ].filter(Boolean),
  }
}

export function buildLongformProductionRepairTasks(trends: any, limit = 60) {
  const tasks: any[] = []
  const rows = Array.isArray(trends?.weak_rows) ? trends.weak_rows : []
  for (const row of rows) {
    const chapterLabel = row.chapter_no ? `第${row.chapter_no}章《${row.title || '未命名'}》` : row.title || '未命名章节'
    if (Number(row.failure_count || 0) > 0) {
      tasks.push({
        task_type: 'resolve_failure',
        issue_type: 'production_failure',
        severity: 'high',
        chapter_id: row.chapter_id || null,
        outline_id: row.outline_id || null,
        chapter_no: row.chapter_no,
        title: `${chapterLabel} 生产失败处理`,
        message: (row.failures || []).join('；') || '章节生产链路存在失败记录。',
        action: '先查看失败原因，补齐上下文/模型配置/安全检查后再重试章节群。',
        acceptance_criteria: ['失败原因已消除', '章节可重新进入章节群生产', '任务中心不再出现同类失败'],
        metrics: { readiness: row.readiness, failures: row.failures },
      })
    }
    if (!row.skeleton_score || Number(row.skeleton_score) < 70) {
      tasks.push({
        task_type: 'repair_skeleton',
        issue_type: 'weak_future_skeleton',
        severity: Number(row.skeleton_score || 0) < 55 ? 'high' : 'medium',
        chapter_id: row.chapter_id || null,
        outline_id: row.outline_id || null,
        chapter_no: row.chapter_no,
        title: `${chapterLabel} 补强骨架`,
        message: `未来骨架分 ${row.skeleton_score ?? 0}，章节目标、冲突、回报或章末钩子不足。`,
        action: '补齐章节目标、核心冲突、爽点回报和章末钩子，再应用到未来100章骨架。',
        acceptance_criteria: ['章节目标清晰可执行', '冲突压力可支撑正文推进', '章末钩子能自然牵引下一章'],
        metrics: { skeleton_score: row.skeleton_score, readiness: row.readiness },
      })
    }
    if (!row.material_score || Number(row.material_score) < 65 || ['needs_material', 'not_ready'].includes(String(row.status || ''))) {
      tasks.push({
        task_type: 'repair_materials',
        issue_type: 'weak_generation_materials',
        severity: Number(row.material_score || 0) < 45 || !row.has_text ? 'high' : 'medium',
        chapter_id: row.chapter_id || null,
        outline_id: row.outline_id || null,
        chapter_no: row.chapter_no,
        title: `${chapterLabel} 补生产材料`,
        message: `材料分 ${row.material_score ?? 0}，上下文、场景卡或参考资产不足。`,
        action: '补齐章节上下文、场景卡、人物状态和必要参考后，再进入章节群生成。',
        acceptance_criteria: ['上下文预检无阻塞项', '场景卡能覆盖主要动作链', '人物状态与上一章连续'],
        metrics: { material_score: row.material_score, readiness: row.readiness },
      })
    }
    if (row.quality_score && Number(row.quality_score) < 78) {
      tasks.push({
        task_type: 'repair_quality',
        issue_type: 'weak_chapter_quality',
        severity: Number(row.quality_score) < 65 ? 'high' : 'medium',
        chapter_id: row.chapter_id || null,
        outline_id: row.outline_id || null,
        chapter_no: row.chapter_no,
        title: `${chapterLabel} 重质检修订`,
        message: `章节质量分 ${row.quality_score}，需要进入编辑报告与修订链路。`,
        action: '生成编辑报告，按问题清单修订节奏、冲突推进和章末钩子。',
        acceptance_criteria: ['质量分回到78以上', '核心冲突推进明确', '读者回报与章末钩子完整'],
        metrics: { quality_score: row.quality_score, readiness: row.readiness },
      })
    }
    if (row.similarity_risk && Number(row.similarity_risk) >= 45) {
      tasks.push({
        task_type: 'repair_similarity',
        issue_type: 'similarity_risk',
        severity: Number(row.similarity_risk) >= 65 ? 'high' : 'medium',
        chapter_id: row.chapter_id || null,
        outline_id: row.outline_id || null,
        chapter_no: row.chapter_no,
        title: `${chapterLabel} 降相似风险`,
        message: `相似风险 ${row.similarity_risk}，需要替换表达路径或情节组合。`,
        action: '重新设计场景动作链、信息揭示顺序和关键表达，避免参考痕迹。',
        acceptance_criteria: ['相似风险降至安全阈值内', '关键桥段不再依赖参考文本表达', '原创设定与角色动机更明确'],
        metrics: { similarity_risk: row.similarity_risk, readiness: row.readiness },
      })
    }
  }
  return tasks.slice(0, Math.max(1, Math.min(120, Number(limit || 60))))
}

function uniqueCompactTexts(values: any[], limit = 160) {
  return Array.from(new Set(values.map(value => compactText(value, limit)).filter(Boolean)))
}

function recoveryEvidenceReviewOf(task: any) {
  return task?.recovery_evidence_review || task?.recoveryEvidenceReview || {}
}

function recoveryEvidenceFromFailedItems(review: any) {
  return asArray(review?.failed_items || review?.failedItems)
    .map((item: any) => item?.evidence || item?.text || item?.message || item)
}

function recoveryRiskLabelsFromFailedItems(review: any) {
  return uniqueCompactTexts(asArray(review?.failed_items || review?.failedItems)
    .flatMap((item: any) => [
      ...asArray(item?.risk_labels),
      ...asArray(item?.riskLabels),
    ]), 120)
}

function recoveryEvidenceSourceMeta(task: any) {
  const source = String(task?.source || '')
  const annotationSource = String(task?.annotation_source || task?.annotationSource || '')
  const annotationCategory = String(task?.annotation_category || task?.annotationCategory || '')
  if (annotationSource === 'governance_recheck_sync' || (source === 'review_annotation_risk' && annotationCategory === 'recovery_evidence')) {
    return { source: 'single_chapter_governance_recheck', label: '单章治理复查' }
  }
  if (source === 'auto_creation_safe_batch_risk' || task?.segment) {
    return { source: 'safe_batch_recovery_recheck', label: '批次恢复复查' }
  }
  return { source: 'recovery_evidence_recheck', label: '恢复依据复查' }
}

function recoveryEvidenceClosureForAudit(tasks: any[], remainingTouchedRisks: any[]) {
  const recoveryTasks = tasks.filter((task: any) => String(task?.issue_type || task?.issueType || '') === 'recovery_evidence_mismatch')
  if (!recoveryTasks.length) {
    return {
      status: 'empty',
      total: 0,
      resolved: 0,
      sources: [],
      single_chapter_count: 0,
      batch_count: 0,
      failed_evidence: [],
      repaired_evidence: [],
      watch_items: [],
      tasks: [],
    }
  }

  const weakByNo = new Map(remainingTouchedRisks.map((row: any) => [Number(row?.chapter_no || 0), row]))
  const taskRows = recoveryTasks.map((task: any, taskIndex: number) => {
    const sourceMeta = recoveryEvidenceSourceMeta(task)
    const review = recoveryEvidenceReviewOf(task)
    const failedEvidence = uniqueCompactTexts([
      ...recoveryEvidenceFromFailedItems(review),
      ...asArray(review?.failed_evidence),
      ...asArray(review?.failedEvidence),
    ])
    const repairedEvidence = uniqueCompactTexts([
      ...asArray(review?.repaired_evidence),
      ...asArray(review?.repairedEvidence),
      ...asArray(review?.post_repair_evidence),
      ...asArray(review?.postRepairEvidence),
      ...asArray(review?.closure_evidence),
      ...asArray(review?.closureEvidence),
    ])
    const riskLabels = recoveryRiskLabelsFromFailedItems(review)
    const chapterNo = Number(task?.chapter_no || task?.chapterNo || 0)
    const weakRow = chapterNo ? weakByNo.get(chapterNo) : null
    const explicitWatchItems = [
      ...asArray(review?.watch_items),
      ...asArray(review?.watchItems),
      ...asArray(task?.watch_items),
      ...asArray(task?.watchItems),
    ]
    const watchItems = uniqueCompactTexts([
      ...explicitWatchItems,
      ...riskLabels.map(label => `后续继续观察：${label}`),
      weakRow ? `第${weakRow.chapter_no}章仍需关注：${weakRow.status || '薄弱'}，质检 ${weakRow.quality_score ?? '-'}，准备度 ${weakRow.readiness ?? '-'}` : '',
      !isResolvedRepairTaskStatus(task?.task_status || task?.status) ? task?.message || task?.action : '',
    ], 200)
    return {
      chapter_id: Number(task?.chapter_id || task?.chapterId || 0) || null,
      chapter_no: chapterNo || null,
      task_index: taskIndex,
      task_status: task?.task_status || task?.status || 'open',
      source: sourceMeta.source,
      source_label: sourceMeta.label,
      title: task?.title || task?.message || '',
      status: review?.status || '',
      summary: compactText(review?.summary || task?.message || '', 200),
      failed_evidence: failedEvidence,
      repaired_evidence: repairedEvidence,
      watch_items: watchItems,
      risk_labels: riskLabels,
    }
  })
  const unresolved = taskRows.filter(row => !['resolved', 'closed', 'done', 'completed'].includes(String(row.task_status || '')))
  const residual = taskRows.filter(row => String(row.status || '') === 'warn' && row.failed_evidence.length > 0)

  return {
    status: unresolved.length || residual.length ? 'needs_followup' : 'closed',
    total: recoveryTasks.length,
    resolved: taskRows.filter(row => ['resolved', 'closed', 'done', 'completed'].includes(String(row.task_status || ''))).length,
    sources: uniqueCompactTexts(taskRows.map(row => row.source), 120),
    single_chapter_count: taskRows.filter(row => row.source === 'single_chapter_governance_recheck').length,
    batch_count: taskRows.filter(row => row.source === 'safe_batch_recovery_recheck').length,
    failed_evidence: uniqueCompactTexts(taskRows.flatMap(row => row.failed_evidence)),
    repaired_evidence: uniqueCompactTexts(taskRows.flatMap(row => row.repaired_evidence)),
    watch_items: uniqueCompactTexts(taskRows.flatMap(row => row.watch_items), 200),
    tasks: taskRows,
  }
}

function governanceRecheckMemoryForAudit(recoveryEvidenceClosure: any, run: any) {
  const total = Number(recoveryEvidenceClosure?.total || 0)
  const resolved = Number(recoveryEvidenceClosure?.resolved || 0)
  const status = total <= 0
    ? 'empty'
    : String(recoveryEvidenceClosure?.status || '') === 'closed'
      ? 'closed'
      : 'needs_followup'
  const failedEvidence = uniqueCompactTexts([
    ...asArray(recoveryEvidenceClosure?.failed_evidence),
    ...asArray(recoveryEvidenceClosure?.failedEvidence),
  ])
  const repairedEvidence = uniqueCompactTexts([
    ...asArray(recoveryEvidenceClosure?.repaired_evidence),
    ...asArray(recoveryEvidenceClosure?.repairedEvidence),
  ])
  const watchItems = uniqueCompactTexts([
    ...asArray(recoveryEvidenceClosure?.watch_items),
    ...asArray(recoveryEvidenceClosure?.watchItems),
  ], 200)
  const sourceModes = uniqueCompactTexts([
    ...asArray(recoveryEvidenceClosure?.sources),
    ...asArray(recoveryEvidenceClosure?.sourceModes),
  ], 120)
  const hasSingleChapterRecheck = sourceModes.includes('single_chapter_governance_recheck')
  const hasBatchRecheck = sourceModes.includes('safe_batch_recovery_recheck')
  const closedSummary = hasSingleChapterRecheck && hasBatchRecheck
    ? `恢复依据闭环 ${resolved}/${total}，单章治理复查与批次验收结果已写入次日生产记忆。`
    : hasSingleChapterRecheck
      ? `恢复依据闭环 ${resolved}/${total}，单章治理复查结果已写入次日生产记忆。`
      : `恢复依据闭环 ${resolved}/${total}，本轮批次验收结果已写入次日生产记忆。`
  const followupSummary = hasSingleChapterRecheck && !hasBatchRecheck
    ? `恢复依据审计 ${resolved}/${total}，仍需处理单章治理复查失效依据或观察项后再扩大生产。`
    : `恢复依据审计 ${resolved}/${total}，仍需处理失效依据或观察项后再扩大生产。`
  return {
    source_run_id: run?.id || null,
    status,
    label: status === 'closed' ? '治理复查已记录' : status === 'needs_followup' ? '治理复查待处理' : '治理复查',
    summary: status === 'closed' ? closedSummary : status === 'needs_followup' ? followupSummary : '本轮没有可沉淀的恢复依据复查记忆。',
    evidence: repairedEvidence,
    failed_evidence: status === 'closed' ? [] : failedEvidence,
    watch_items: watchItems,
    source_modes: sourceModes,
    storyline_decision_task_count: 0,
  }
}

function isResolvedRepairTaskStatus(status: any) {
  return ['resolved', 'closed', 'done', 'completed'].includes(String(status || ''))
}

export function buildLongformRepairAuditSummary(run: any, trends: any) {
  const payload = parseJsonLikePayload(run.output_ref) || {}
  const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
  const baseline = payload.report?.summary || {}
  const current = trends.summary || {}
  const taskTypeLabel: Record<string, string> = {
    repair_skeleton: '补骨架',
    repair_materials: '补材料',
    repair_quality: '重质检',
    repair_similarity: '降相似风险',
    resolve_failure: '处理失败',
  }
  const countBy = (items: any[], key: string) => items.reduce((acc: Record<string, number>, item: any) => {
    const value = String(item[key] || 'open')
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
  const metricDelta = (key: string) => {
    const before = baseline[key]
    const after = current[key]
    return {
      before: before ?? null,
      after: after ?? null,
      delta: Number.isFinite(Number(before)) && Number.isFinite(Number(after)) ? Number(after) - Number(before) : null,
    }
  }
  const touchedChapters = Array.from(new Set(tasks.map((task: any) => Number(task.chapter_no || 0)).filter(Boolean))).sort((a: number, b: number) => a - b)
  const unresolved = tasks.filter((task: any) => task.task_status !== 'resolved')
  const currentWeakByNo = new Map((trends.weak_rows || []).map((row: any) => [Number(row.chapter_no || 0), row]))
  const remainingTouchedRisks = touchedChapters
    .map(chapterNo => currentWeakByNo.get(chapterNo))
    .filter(Boolean)
    .slice(0, 30)
  const statusCounts = countBy(tasks.map((task: any) => ({ ...task, task_status: task.task_status || 'open' })), 'task_status')
  const typeCounts = countBy(tasks, 'task_type')
  const recoveryEvidenceClosure = recoveryEvidenceClosureForAudit(tasks, remainingTouchedRisks)
  const governanceRecheckMemory = governanceRecheckMemoryForAudit(recoveryEvidenceClosure, run)
  return {
    created_at: new Date().toISOString(),
    source_run_id: run.id,
    status: tasks.length && Number(statusCounts.resolved || 0) === tasks.length ? 'closed' : unresolved.length ? 'needs_followup' : 'empty',
    task_summary: {
      total: tasks.length,
      resolved: Number(statusCounts.resolved || 0),
      needs_review: Number(statusCounts.needs_review || 0),
      in_progress: Number(statusCounts.in_progress || 0),
      open: Number(statusCounts.open || 0),
      by_type: Object.fromEntries(Object.entries(typeCounts).map(([key, value]) => [taskTypeLabel[key] || key, value])),
      touched_chapter_count: touchedChapters.length,
      touched_chapters: touchedChapters.slice(0, 80),
    },
    metric_deltas: {
      avg_skeleton_score: metricDelta('avg_skeleton_score'),
      avg_material_score: metricDelta('avg_material_score'),
      avg_quality_score: metricDelta('avg_quality_score'),
      avg_readiness: metricDelta('avg_readiness'),
      failed_chapter_count: metricDelta('failed_chapter_count'),
      weak_row_count: {
        before: payload.report?.weak_count ?? null,
        after: Array.isArray(trends.weak_rows) ? trends.weak_rows.length : null,
        delta: Number.isFinite(Number(payload.report?.weak_count)) ? (trends.weak_rows || []).length - Number(payload.report.weak_count) : null,
      },
    },
    recovery_evidence_closure: recoveryEvidenceClosure,
    governance_recheck_memory: governanceRecheckMemory,
    remaining_risks: {
      unresolved_tasks: unresolved.slice(0, 30).map((task: any) => ({
        task_type: task.task_type,
        task_status: task.task_status || 'open',
        chapter_no: task.chapter_no,
        title: task.title,
        message: task.message,
      })),
      weak_touched_chapters: remainingTouchedRisks.map((row: any) => ({
        chapter_no: row.chapter_no,
        title: row.title,
        status: row.status,
        readiness: row.readiness,
        skeleton_score: row.skeleton_score,
        material_score: row.material_score,
        quality_score: row.quality_score,
      })),
      current_recommendations: trends.recommendations || [],
    },
    conclusion: [
      tasks.length ? `本轮共处理 ${tasks.length} 项长线生产修复任务，已确认 ${Number(statusCounts.resolved || 0)} 项。` : '本轮没有生成修复任务。',
      recoveryEvidenceClosure.total ? `恢复依据闭环 ${recoveryEvidenceClosure.resolved}/${recoveryEvidenceClosure.total}，${recoveryEvidenceClosure.status === 'closed' ? `失效依据已补成可复盘证据。${asArray(recoveryEvidenceClosure.sources).includes('single_chapter_governance_recheck') ? '单章治理复查已沉淀。' : ''}` : '仍需继续复检失效依据。'}` : '',
      remainingTouchedRisks.length ? `仍有 ${remainingTouchedRisks.length} 个已触达章节处于薄弱状态，需要继续复查。` : '已触达章节暂无明显薄弱风险。',
      unresolved.length ? `还有 ${unresolved.length} 项任务未关闭。` : '本轮任务已全部关闭。',
    ].filter(Boolean),
  }
}

export function buildLatestLongformGovernanceSummary(runs: any[], reviews: any[], trends: any) {
  const repairRuns = runs
    .filter(run => run.run_type === 'longform_production_repair')
    .map(run => ({ run, payload: parseJsonLikePayload(run.output_ref) || {} }))
    .sort((a, b) => String(b.run.created_at || '').localeCompare(String(a.run.created_at || '')))
  const auditReviews = reviews
    .filter(review => review.review_type === 'longform_production_repair_audit')
    .map(review => ({ review, payload: parseJsonLikePayload(review.payload) || {} }))
    .sort((a, b) => String(b.review.created_at || '').localeCompare(String(a.review.created_at || '')))
  const latestRun = repairRuns[0] || null
  const latestAudit = latestRun?.payload?.audit_summary || auditReviews[0]?.payload?.audit || null
  const tasks = Array.isArray(latestRun?.payload?.tasks) ? latestRun.payload.tasks : []
  const unresolvedTasks = tasks.filter((task: any) => task.task_status !== 'resolved')
  const needsReviewTasks = tasks.filter((task: any) => task.task_status === 'needs_review')
  return {
    created_at: new Date().toISOString(),
    latest_repair_run: latestRun ? {
      id: latestRun.run.id,
      status: latestRun.run.status,
      step_name: latestRun.run.step_name,
      created_at: latestRun.run.created_at,
      task_count: tasks.length,
      resolved_count: tasks.filter((task: any) => task.task_status === 'resolved').length,
      needs_review_count: needsReviewTasks.length,
      open_count: unresolvedTasks.length,
    } : null,
    latest_audit: latestAudit,
    current_trends: {
      summary: trends.summary,
      weak_count: Array.isArray(trends.weak_rows) ? trends.weak_rows.length : 0,
      weak_rows: (trends.weak_rows || []).slice(0, 12),
      failure_reasons: trends.failure_reasons || [],
      recommendations: trends.recommendations || [],
    },
    risk_summary: {
      unresolved_task_count: unresolvedTasks.length,
      needs_review_count: needsReviewTasks.length,
      unresolved_tasks: unresolvedTasks.slice(0, 20).map((task: any) => ({
        task_type: task.task_type,
        task_status: task.task_status || 'open',
        chapter_no: task.chapter_no,
        title: task.title,
        message: task.message,
      })),
    },
    next_actions: [
      !latestRun ? '还没有长线生产修复队列，先生成长线生产趋势报表和修复任务。' : '',
      needsReviewTasks.length ? `有 ${needsReviewTasks.length} 项长线修复任务等待复查确认。` : '',
      unresolvedTasks.length && !needsReviewTasks.length ? `有 ${unresolvedTasks.length} 项长线修复任务未关闭。` : '',
      trends.recommendations?.[0] || '',
      latestAudit ? '已有闭环审计摘要，可在任务中心回看本轮治理效果。' : latestRun ? '建议生成闭环审计摘要，记录本轮治理效果。' : '',
    ].filter(Boolean),
  }
}

