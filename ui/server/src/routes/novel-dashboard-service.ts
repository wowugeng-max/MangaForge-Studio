import { getStoryState, getVolumePlan, parseJsonLikePayload } from './novel-route-utils'

export function createNovelDashboardService() {
  const buildProductionDashboard = (project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[], runs: any[]) => {
    const written = chapters.filter(ch => ch.chapter_text)
    const proseQuality = reviews.filter(item => item.review_type === 'prose_quality').map(item => {
      const payload = parseJsonLikePayload(item.payload) || {}
      return Number(payload.self_check?.review?.score || 0)
    }).filter(score => Number.isFinite(score) && score > 0)
    const state = getStoryState(project)
    const volumeCount = outlines.filter(item => item.outline_type === 'volume').length
    const latestPipeline = runs.find(item => item.run_type === 'chapter_generation_pipeline') || null
    const latestFailures = runs.filter(item => ['failed', 'warn'].includes(item.status)).slice(0, 8)
    const reviewsByChapter = reviews.reduce((acc: Record<number, any[]>, item: any) => {
      const payload = parseJsonLikePayload(item.payload) || {}
      const chapterId = Number(payload.chapter_id || payload.report?.chapter_id || 0)
      if (!chapterId) return acc
      acc[chapterId] = [...(acc[chapterId] || []), item]
      return acc
    }, {})
    const chapter_trends = chapters
      .sort((a, b) => a.chapter_no - b.chapter_no)
      .map(chapter => {
        const chapterReviews = reviewsByChapter[chapter.id] || []
        const qualityReview = chapterReviews.find(item => item.review_type === 'prose_quality')
        const similarityReview = chapterReviews.find(item => item.review_type === 'similarity_report')
        const qualityPayload = parseJsonLikePayload(qualityReview?.payload) || {}
        const similarityPayload = parseJsonLikePayload(similarityReview?.payload) || {}
        return {
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          word_count: String(chapter.chapter_text || '').replace(/\s/g, '').length,
          quality_score: Number(qualityPayload.self_check?.review?.score || 0) || null,
          similarity_risk: Number(similarityPayload.report?.overall_risk_score || 0) || null,
          revision_count: runs.filter(run => String(run.output_ref || '').includes(`"chapter_id":${chapter.id}`) || String(run.step_name || '').includes(`chapter-${chapter.chapter_no}`)).length,
          has_text: Boolean(chapter.chapter_text),
        }
      })
    const volume_controls = getVolumePlan(outlines).map((volume, index) => {
      const nextVolume = getVolumePlan(outlines)[index + 1]
      const from = Number((volume.raw_payload || {}).start_chapter || 0) || 1
      const to = Number((volume.raw_payload || {}).end_chapter || 0) || (nextVolume ? Number((nextVolume.raw_payload || {}).start_chapter || 0) - 1 : chapters.length)
      const scopedChapters = chapters.filter(ch => ch.chapter_no >= from && ch.chapter_no <= Math.max(from, to))
      return {
        ...volume,
        start_chapter: from,
        end_chapter: Math.max(from, to),
        chapter_count: scopedChapters.length,
        written_count: scopedChapters.filter(ch => ch.chapter_text).length,
        progress: scopedChapters.length ? Math.round((scopedChapters.filter(ch => ch.chapter_text).length / scopedChapters.length) * 100) : 0,
      }
    })
    return {
      project_id: project.id,
      title: project.title,
      chapter_total: chapters.length,
      written_chapters: written.length,
      unwritten_chapters: chapters.length - written.length,
      word_count: chapters.reduce((sum, ch) => sum + String(ch.chapter_text || '').replace(/\s/g, '').length, 0),
      volume_count: volumeCount,
      character_count: characters.length,
      average_quality_score: proseQuality.length ? Math.round(proseQuality.reduce((sum, score) => sum + score, 0) / proseQuality.length) : null,
      story_state_updated_to: state.last_updated_chapter || null,
      mainline_progress: state.mainline_progress || '',
      latest_pipeline: latestPipeline,
      latest_failures: latestFailures,
      chapter_trends,
      volume_controls,
      recommendations: [
        chapters.length === 0 ? '先使用原创孵化器或大纲生成建立章节结构。' : '',
        written.length < Math.min(5, chapters.length) ? '优先完成前 5 章正文，用于校准文风和状态机。' : '',
        volumeCount === 0 ? '补充分卷/阶段目标，避免长篇只按单章推进。' : '',
        proseQuality.length && Math.min(...proseQuality) < 78 ? '存在低分章节，建议进入正文质检按报告修订。' : '',
        !project.reference_config?.writing_bible ? '建议保存写作圣经，稳定长期生成上下文。' : '',
      ].filter(Boolean),
    }
  }

  const buildProductionMetrics = (chapters: any[], reviews: any[], runs: any[]) => {
    const usageItems = runs.map(run => parseJsonLikePayload(run.output_ref) || {}).map(payload => payload.usage || payload.result?.usage || payload)
    const tokenTotal = usageItems.reduce((sum, usage) => sum + Number(usage?.total_tokens || usage?.totalTokens || usage?.tokens || 0), 0)
    const durationTotal = runs.reduce((sum, run) => sum + Number(run.duration_ms || 0), 0)
    const stageStats = runs.reduce((acc: Record<string, any>, run) => {
      const key = run.run_type || 'unknown'
      acc[key] = acc[key] || { total: 0, failed: 0, success: 0, duration_ms: 0 }
      acc[key].total += 1
      acc[key].failed += ['failed', 'error'].includes(run.status) ? 1 : 0
      acc[key].success += ['success', 'ok', 'completed'].includes(run.status) ? 1 : 0
      acc[key].duration_ms += Number(run.duration_ms || 0)
      return acc
    }, {})
    const modelStats = runs.reduce((acc: Record<string, any>, run) => {
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const candidates = [
        payload.modelName,
        payload.model_name,
        payload.result?.modelName,
        payload.self_check?.review?.modelName,
        payload.chapters?.find?.((item: any) => item?.modelName)?.modelName,
      ].filter(Boolean)
      const key = String(candidates[0] || 'unknown')
      acc[key] = acc[key] || { total: 0, success: 0, failed: 0, avg_duration_ms: 0, duration_ms: 0 }
      acc[key].total += 1
      acc[key].success += ['success', 'ok', 'completed'].includes(run.status) ? 1 : 0
      acc[key].failed += ['failed', 'error'].includes(run.status) ? 1 : 0
      acc[key].duration_ms += Number(run.duration_ms || 0)
      acc[key].avg_duration_ms = Math.round(acc[key].duration_ms / Math.max(1, acc[key].total))
      return acc
    }, {})
    const qualityScores = reviews
      .filter(item => ['prose_quality', 'editor_report', 'book_review'].includes(item.review_type))
      .map(item => {
        const payload = parseJsonLikePayload(item.payload) || {}
        return Number(payload.self_check?.review?.score || payload.report?.overall_score || 0)
      })
      .filter(score => score > 0)
    const safetyBlocks = runs.filter(run => String(run.error_message || '').includes('仿写安全') || String(run.output_ref || '').includes('REFERENCE_SAFETY_BLOCKED')).length
    const fallbackCount = runs.filter(run => run.status === 'fallback' || String(run.output_ref || '').includes('fallback')).length
    const generatedWords = chapters.reduce((sum, chapter) => sum + String(chapter.chapter_text || '').replace(/\s/g, '').length, 0)
    return {
      chapter_count: chapters.length,
      written_chapter_count: chapters.filter(chapter => chapter.chapter_text).length,
      generated_words: generatedWords,
      total_runs: runs.length,
      total_tokens: tokenTotal,
      estimated_cost_units: Math.round(tokenTotal / 1000),
      total_duration_ms: durationTotal,
      avg_run_duration_ms: runs.length ? Math.round(durationTotal / runs.length) : 0,
      avg_quality_score: qualityScores.length ? Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length) : null,
      failure_rate: runs.length ? Math.round((runs.filter(run => ['failed', 'error'].includes(run.status)).length / runs.length) * 100) : 0,
      fallback_count: fallbackCount,
      safety_block_count: safetyBlocks,
      stage_stats: stageStats,
      model_stats: modelStats,
      model_recommendations: Object.entries(modelStats).map(([model, stats]: [string, any]) => ({
        model,
        success_rate: stats.total ? Math.round((stats.success / stats.total) * 100) : 0,
        avg_duration_ms: stats.avg_duration_ms,
        recommendation: stats.failed > stats.success ? '失败多于成功，建议降级为备用模型或缩短上下文。' : stats.avg_duration_ms > 120000 ? '平均耗时偏长，建议仅用于大纲/最终修订。' : '可继续用于当前阶段。',
      })),
      throughput: {
        words_per_minute: durationTotal > 0 ? Math.round(generatedWords / (durationTotal / 60000)) : 0,
        chapters_per_hour: durationTotal > 0 ? Number((chapters.filter(chapter => chapter.chapter_text).length / (durationTotal / 3600000)).toFixed(2)) : 0,
      },
    }
  }

  return { buildProductionDashboard, buildProductionMetrics }
}

export type NovelDashboardService = ReturnType<typeof createNovelDashboardService>
