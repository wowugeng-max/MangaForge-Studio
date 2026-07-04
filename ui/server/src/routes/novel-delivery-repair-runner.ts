import {
  appendNovelRun,
  createNovelReview,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
  updateNovelRun,
} from '../novel'
import { exportWordCount } from './novel-delivery-export-renderer'
import { buildNovelExportPayload, getExportRange } from './novel-delivery-export-payload'
import {
  buildDeliveryReleaseAudit,
  buildReleaseRepairTasks,
  getDeliveryReleasePolicy,
} from './novel-delivery-release-audit'
import { clampScore, parseJsonLikePayload, safeJsonStringify } from './novel-route-utils'

type ReleaseRepairRunnerContext = {
  buildChapterContextPackage: (workspace: string, project: any, chapter: any, chapters: any[], worldbuilding: any[], characters: any[], outlines: any[], reviews: any[]) => Promise<any>
  buildReferenceUsageReport: (workspace: string, project: any, taskType: string, generatedText?: string) => Promise<any>
  buildStructuralSimilarityReport: (chapter: any, referenceReport: any) => any
}

function releaseJson(value: any) {
  return safeJsonStringify(value, undefined, 0)
}

function releaseChapterGroupStages() {
  return [
    { key: 'context', label: '章节目标确认/续写上下文包', status: 'pending' },
    { key: 'scene_cards', label: '场景卡生成/人工确认', status: 'pending' },
    { key: 'migration_plan', label: '参考迁移计划', status: 'pending' },
    { key: 'draft', label: '段落级正文生成', status: 'pending' },
    { key: 'review', label: '章节级自检', status: 'pending' },
    { key: 'revise', label: '二次修订', status: 'pending' },
    { key: 'safety', label: '仿写安全阈值', status: 'pending' },
    { key: 'store', label: '入库版本', status: 'pending' },
    { key: 'story_state', label: '记忆状态机更新', status: 'pending' },
  ]
}

function buildDeterministicReleaseQuality(chapter: any, contextPackage: any) {
  const text = String(chapter.chapter_text || '')
  const wordCount = exportWordCount(text)
  const sceneCount = Array.isArray(chapter.scene_breakdown) ? chapter.scene_breakdown.length : 0
  const preflight = contextPackage?.preflight || {}
  const warnings = Array.isArray(preflight.warnings) ? preflight.warnings : []
  const checks = Array.isArray(preflight.checks) ? preflight.checks : []
  const checkOk = (key: string) => checks.find((item: any) => item.key === key)?.ok === true
  const issues = [
    !text.trim() ? { severity: 'high', description: '缺少章节正文' } : null,
    text.includes('【占位正文】') ? { severity: 'high', description: '正文仍包含占位标记' } : null,
    !chapter.ending_hook ? { severity: 'medium', description: '缺少章末钩子' } : null,
    !Array.isArray(chapter.continuity_notes) || chapter.continuity_notes.length === 0 ? { severity: 'medium', description: '缺少连续性备注' } : null,
    wordCount < 800 && text.trim() ? { severity: 'medium', description: '正文篇幅偏短，可能不是完整章节' } : null,
    ...warnings.slice(0, 6).map((warning: string) => ({ severity: 'low', description: warning })),
  ].filter(Boolean)
  const score = clampScore(
    (text.trim() ? 42 : 0)
    + (wordCount >= 1800 ? 18 : wordCount >= 800 ? 10 : 0)
    + (chapter.chapter_goal || chapter.chapter_summary ? 10 : 0)
    + (chapter.conflict ? 8 : 0)
    + (chapter.ending_hook ? 8 : 0)
    + (sceneCount ? 7 : 0)
    + (Array.isArray(chapter.continuity_notes) && chapter.continuity_notes.length ? 7 : 0)
    + (checkOk('previous_continuity') ? 5 : 0)
    - (text.includes('【占位正文】') ? 30 : 0)
  )
  return {
    score,
    passed: score >= 78 && !issues.some((issue: any) => issue.severity === 'high'),
    word_count: wordCount,
    issues,
    dimensions: {
      text_complete: Boolean(text.trim()) && !text.includes('【占位正文】'),
      chapter_goal: Boolean(chapter.chapter_goal || chapter.chapter_summary),
      conflict: Boolean(chapter.conflict),
      ending_hook: Boolean(chapter.ending_hook),
      scene_count: sceneCount,
      continuity_note_count: Array.isArray(chapter.continuity_notes) ? chapter.continuity_notes.length : 0,
    },
  }
}

export async function executeReleaseBatchRun(activeWorkspace: string, project: any, run: any, ctx: ReleaseRepairRunnerContext, options: any = {}) {
  const payload = parseJsonLikePayload(run.output_ref) || {}
  const targetChapterNos = Array.isArray(payload.target_chapter_nos) ? payload.target_chapter_nos.map((item: any) => Number(item)).filter(Boolean) : []
  const maxItems = Math.max(1, Math.min(100, Number(options.max_items || targetChapterNos.length || 50)))
  const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
    listNovelChapters(activeWorkspace, project.id),
    listNovelWorldbuilding(activeWorkspace, project.id),
    listNovelCharacters(activeWorkspace, project.id),
    listNovelOutlines(activeWorkspace, project.id),
    listNovelReviews(activeWorkspace, project.id),
  ])
  const targets = chapters
    .filter(chapter => targetChapterNos.includes(Number(chapter.chapter_no || 0)))
    .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .slice(0, maxItems)
  const startedAt = Date.now()
  await updateNovelRun(activeWorkspace, run.id, {
    status: 'running',
    output_ref: releaseJson({ ...payload, phase: '发布批量任务执行中', started_at: new Date().toISOString(), processed: 0 }),
  })
  const results: any[] = []
  for (const chapter of targets) {
    try {
      if (run.run_type === 'release_quality_batch') {
        const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
        const review = buildDeterministicReleaseQuality(chapter, contextPackage)
        const saved = await createNovelReview(activeWorkspace, {
          project_id: project.id,
          review_type: 'prose_quality',
          status: review.passed ? 'ok' : 'warn',
          summary: `发布前质检评分 ${review.score}`,
          issues: review.issues.map((issue: any) => `${issue.severity}｜${issue.description}`),
          payload: releaseJson({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, context_package: contextPackage, self_check: { review }, source: 'release_quality_batch', run_id: run.id }),
        })
        results.push({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, status: 'success', score: review.score, review_id: saved.id })
      } else if (run.run_type === 'release_similarity_batch') {
        const referenceReport = await ctx.buildReferenceUsageReport(activeWorkspace, project, '发布前相似度检测', chapter.chapter_text || '')
        const quality = referenceReport.quality_assessment || {}
        const structuralRisk = clampScore(100 - Number(quality.originality_score || 100))
        const structuralReport = ctx.buildStructuralSimilarityReport(chapter, referenceReport)
        const combinedStructuralRisk = clampScore((structuralRisk * 0.45) + (Number(structuralReport.overall_structural_risk || 0) * 0.55))
        const copyHitCount = Array.isArray(referenceReport.copy_guard?.hits) ? referenceReport.copy_guard.hits.length : 0
        const report = {
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          overall_risk_score: clampScore((copyHitCount * 12) + combinedStructuralRisk * 0.55),
          term_hits: referenceReport.copy_guard?.hits || [],
          copy_safety_score: quality.copy_safety_score,
          originality_score: quality.originality_score,
          structural_similarity_risk: combinedStructuralRisk,
          structural_report: structuralReport,
          decision: Number(quality.copy_safety_score || 100) < 75 || combinedStructuralRisk > 45 ? 'needs_rewrite' : 'pass',
          suggestions: [
            ...(referenceReport.copy_guard?.hits?.length ? ['替换疑似复用专名和证据词。'] : []),
            combinedStructuralRisk > 45 ? '调整场景目标、障碍来源、信息揭示顺序和角色选择。' : '',
            ...((structuralReport.suggestions || []) as any[]),
          ].filter(Boolean),
        }
        const saved = await createNovelReview(activeWorkspace, {
          project_id: project.id,
          review_type: 'similarity_report',
          status: report.decision === 'pass' ? 'ok' : 'warn',
          summary: `发布前相似度风险 ${report.overall_risk_score}`,
          issues: report.suggestions,
          payload: JSON.stringify({ report, reference_report: referenceReport, source: 'release_similarity_batch', run_id: run.id }),
        })
        results.push({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, status: 'success', risk: report.overall_risk_score, review_id: saved.id })
      }
    } catch (error: any) {
      results.push({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, status: 'failed', error: String(error?.message || error) })
    }
    await updateNovelRun(activeWorkspace, run.id, {
      status: 'running',
      output_ref: releaseJson({ ...payload, phase: `已处理 ${results.length}/${targets.length}`, target_chapter_nos: targetChapterNos, results, processed: results.length }),
      duration_ms: Date.now() - startedAt,
    })
  }
  const failed = results.filter(item => item.status === 'failed')
  const updated = await updateNovelRun(activeWorkspace, run.id, {
    status: failed.length ? 'failed' : 'success',
    output_ref: releaseJson({
      ...payload,
      phase: failed.length ? '发布批量任务存在失败项' : '发布批量任务执行完成',
      target_chapter_nos: targetChapterNos,
      results,
      processed: results.length,
      success: results.length - failed.length,
      failed: failed.length,
      completed_at: new Date().toISOString(),
    }),
    duration_ms: Date.now() - startedAt,
    error_message: failed.map(item => `第${item.chapter_no}章：${item.error}`).join('\n'),
  })
  return { run: updated, results, failed }
}

export async function createReleaseRepairQueueRun(activeWorkspace: string, project: any, chapters: any[], outlines: any[], reviews: any[], body: any = {}) {
  const payload = buildNovelExportPayload(project, chapters, outlines, getExportRange(body || {}))
  const releaseAudit = buildDeliveryReleaseAudit(project, payload, chapters, reviews)
  const repairTasks = buildReleaseRepairTasks(releaseAudit)
  const relatedRuns: any[] = []
  const runnableRuns: any[] = []
  const chapterByNo = new Map(chapters.map(chapter => [Number(chapter.chapter_no), chapter]))
  const rewriteTask = repairTasks.find(task => task.type === 'rewrite_chapters')
  if (rewriteTask?.chapter_nos?.length) {
    const selected = rewriteTask.chapter_nos
      .map((chapterNo: number) => chapterByNo.get(Number(chapterNo)))
      .filter(Boolean)
      .sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    const firstNo = selected[0]?.chapter_no || 0
    const lastNo = selected[selected.length - 1]?.chapter_no || firstNo
    const groupOutput = {
      chapter_ids: selected.map((chapter: any) => chapter.id),
      chapters: selected.map((chapter: any) => ({
        id: chapter.id,
        chapter_no: chapter.chapter_no,
        title: chapter.title,
        status: 'pending',
        release_repair_reason: '发布审核修复队列',
        scenes: Array.isArray(chapter.scene_breakdown) ? chapter.scene_breakdown : [],
        stages: releaseChapterGroupStages(),
      })),
      current_index: 0,
      mode: 'release_repair',
      production_mode: body.production_mode || 'draft_review_revise_store',
      policy: {
        stop_on_failure: true,
        require_scene_confirmation: false,
        quality_threshold: getDeliveryReleasePolicy(project).min_quality_score,
        production_mode: body.production_mode || 'draft_review_revise_store',
        regenerate: true,
      },
      release_repair_queue: true,
      source_audit_hash: releaseAudit.manifest.text_hash,
    }
    const groupRun = await appendNovelRun(activeWorkspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      step_name: `release-repair-chapter-${firstNo}-${lastNo}`,
      status: 'ready',
      input_ref: JSON.stringify({ source: 'release_repair_queue', ...body }),
      output_ref: JSON.stringify(groupOutput),
    })
    relatedRuns.push({ run_id: groupRun.id, run_type: groupRun.run_type, action: 'rewrite_chapters', execute_endpoint: `/api/novel/projects/${project.id}/chapter-groups/${groupRun.id}/execute` })
  }
  const qualityTask = repairTasks.find(task => task.type === 'quality_reports')
  if (qualityTask?.chapter_nos?.length) {
    const qualityRun = await appendNovelRun(activeWorkspace, {
      project_id: project.id,
      run_type: 'release_quality_batch',
      step_name: `release-quality-${qualityTask.count}`,
      status: 'queued',
      input_ref: JSON.stringify({ source: 'release_repair_queue', model_id: body.model_id || null, range: payload.range }),
      output_ref: JSON.stringify({ task: qualityTask, phase: '等待批量质检执行', target_chapter_nos: qualityTask.chapter_nos, suggested_endpoint: `/api/novel/projects/${project.id}/benchmark` }),
    })
    runnableRuns.push(qualityRun)
    relatedRuns.push({ run_id: qualityRun.id, run_type: qualityRun.run_type, action: 'quality_reports', suggested_endpoint: `/api/novel/projects/${project.id}/benchmark` })
  }
  const similarityTask = repairTasks.find(task => task.type === 'similarity_reports')
  if (similarityTask?.chapter_nos?.length) {
    const similarityRun = await appendNovelRun(activeWorkspace, {
      project_id: project.id,
      run_type: 'release_similarity_batch',
      step_name: `release-similarity-${similarityTask.count}`,
      status: 'queued',
      input_ref: JSON.stringify({ source: 'release_repair_queue', model_id: body.model_id || null, range: payload.range }),
      output_ref: JSON.stringify({ task: similarityTask, phase: '等待批量相似度检测执行', target_chapter_nos: similarityTask.chapter_nos, suggested_endpoint_template: `/api/novel/chapters/:chapterId/similarity-report` }),
    })
    runnableRuns.push(similarityRun)
    relatedRuns.push({ run_id: similarityRun.id, run_type: similarityRun.run_type, action: 'similarity_reports', suggested_endpoint_template: `/api/novel/chapters/:chapterId/similarity-report` })
  }
  const queueRun = await appendNovelRun(activeWorkspace, {
    project_id: project.id,
    run_type: 'release_repair_queue',
    step_name: `release-repair-${new Date().toISOString().slice(0, 10)}`,
    status: relatedRuns.length ? 'ready' : 'success',
    input_ref: JSON.stringify({ range: payload.range, source_audit_hash: releaseAudit.manifest.text_hash }),
    output_ref: JSON.stringify({
      phase: relatedRuns.length ? '已生成发布修复子任务' : '没有需要排队的修复项',
      release_audit: {
        status: releaseAudit.status,
        score: releaseAudit.score,
        can_release: releaseAudit.can_release,
        blocker_count: releaseAudit.blockers.length,
        warning_count: releaseAudit.warnings.length,
      },
      tasks: repairTasks,
      related_runs: relatedRuns,
      progress: relatedRuns.length ? 5 : 100,
      created_at: new Date().toISOString(),
    }),
  })
  await createNovelReview(activeWorkspace, {
    project_id: project.id,
    review_type: 'release_repair_queue',
    status: relatedRuns.length ? 'queued' : 'ok',
    summary: `发布修复队列：${repairTasks.length} 类任务，${relatedRuns.length} 个子任务`,
    issues: repairTasks.map(task => `${task.title}：${task.count || 1}`),
    payload: JSON.stringify({ run_id: queueRun.id, tasks: repairTasks, related_runs: relatedRuns, release_audit: releaseAudit }),
  })
  return { queueRun, repairTasks, relatedRuns, runnableRuns, releaseAudit, payload }
}
