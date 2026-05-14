import type { Express } from 'express'
import {
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
  updateNovelChapter,
} from '../novel'

type ChapterContextRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  buildChapterContextPackage: (
    workspace: string,
    project: any,
    chapter: any,
    chapters: any[],
    worldbuilding: any[],
    characters: any[],
    outlines: any[],
    reviews: any[],
  ) => Promise<any>
}

async function loadChapterContext(ctx: ChapterContextRoutesContext, projectId: number, chapterId: number) {
  const activeWorkspace = ctx.getWorkspace()
  const project = await ctx.getProject(activeWorkspace, projectId)
  if (!project) return { activeWorkspace, status: 404, error: 'project not found' }

  const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
    listNovelChapters(activeWorkspace, projectId),
    listNovelWorldbuilding(activeWorkspace, projectId),
    listNovelCharacters(activeWorkspace, projectId),
    listNovelOutlines(activeWorkspace, projectId),
    listNovelReviews(activeWorkspace, projectId),
  ])
  const chapter = chapters.find(item => item.id === chapterId)
  if (!chapter) return { activeWorkspace, project, status: 404, error: 'chapter not found' }

  const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
  return { activeWorkspace, project, chapter, contextPackage }
}

export function buildMaterialScore(contextPackage: any) {
  const preflight = contextPackage?.preflight || {}
  const checks = Array.isArray(preflight.checks) ? preflight.checks : []
  const chapter = contextPackage?.chapter_target || {}
  const storyState = contextPackage?.story_state || {}
  const writingBible = contextPackage?.writing_bible || {}
  const reference = contextPackage?.reference || null
  const referenceCheck = checks.find((item: any) => item?.key === 'reference_knowledge')
  const usesReference = Boolean(referenceCheck && !referenceCheck.ok) || Number(reference?.injected_entry_count || 0) > 0
  const hasSceneCards = Array.isArray(chapter.scene_cards) && chapter.scene_cards.length > 0
  const hasPrevious = Boolean(contextPackage?.continuity?.previous_chapter)
  const categories = [
    {
      key: 'detail_outline',
      label: '章节细纲',
      score: [chapter.goal, chapter.summary, chapter.conflict, chapter.ending_hook].filter(Boolean).length * 25,
      required: true,
      fix: '补齐章节目标、摘要、冲突和结尾钩子。',
    },
    {
      key: 'scene_cards',
      label: '场景卡',
      score: hasSceneCards ? Math.min(100, chapter.scene_cards.length * 25) : 0,
      required: true,
      fix: '先生成或人工确认 2-6 个场景卡。',
    },
    {
      key: 'continuity',
      label: '续写衔接',
      score: hasPrevious || Number(chapter.chapter_no || 1) <= 1 ? 100 : 35,
      required: false,
      fix: '补齐上一章结尾钩子或上一章正文。',
    },
    {
      key: 'character_state',
      label: '角色状态',
      score: Array.isArray(storyState.characters) && storyState.characters.length > 0 ? 100 : 30,
      required: true,
      fix: '补齐角色卡或状态机角色信息。',
    },
    {
      key: 'writing_bible',
      label: '写作圣经',
      score: writingBible?.promise || writingBible?.style_lock ? 100 : 35,
      required: false,
      fix: '保存写作圣经，锁定读者承诺、文风和禁止项。',
    },
    ...(usesReference ? [{
      key: 'reference',
      label: '参考知识',
      score: Math.min(100, Number(reference?.injected_entry_count || 0) * 12),
      required: false,
      fix: '参考写作时先补齐参考知识画像；原创项目可忽略。',
    }] : []),
  ].map(item => ({
    ...item,
    score: Math.max(0, Math.min(100, Math.round(Number(item.score || 0)))),
  }))
  const checkScore = checks.length ? Math.round((checks.filter((item: any) => item.ok).length / checks.length) * 100) : 100
  const weightedScore = Math.round(categories.reduce((sum, item) => sum + item.score, 0) / Math.max(1, categories.length) * 0.7 + checkScore * 0.3)
  const blockers = categories.filter(item => item.required && item.score < 60)
  return {
    score: weightedScore,
    level: weightedScore >= 85 ? 'ready' : weightedScore >= 65 ? 'usable' : 'blocked',
    can_generate: preflight.ready && blockers.length === 0,
    check_score: checkScore,
    categories,
    blockers,
    recommendations: [
      ...blockers.map(item => item.fix),
      ...categories.filter(item => !item.required && item.score < 60).map(item => item.fix),
      ...(Array.isArray(preflight.warnings) ? preflight.warnings : []),
    ].filter(Boolean).slice(0, 8),
  }
}

function buildMaterialRepairPlan(rows: any[]) {
  const buckets = [
    { key: 'detail_outline', label: '补章节细纲', chapters: [] as any[], action: '补齐章节目标、摘要、冲突、结尾钩子。' },
    { key: 'scene_cards', label: '生成场景卡', chapters: [] as any[], action: '为章节生成或确认 2-6 个场景卡。' },
    { key: 'character_state', label: '补角色状态', chapters: [] as any[], action: '补齐角色 current_state 或先校正故事状态机。' },
    { key: 'continuity', label: '补前章衔接', chapters: [] as any[], action: '补齐上一章正文、上一章结尾钩子或续写摘要。' },
    { key: 'writing_bible', label: '补写作圣经', chapters: [] as any[], action: '保存读者承诺、文风锁定、禁止项和安全策略。' },
    { key: 'reference', label: '补参考知识', chapters: [] as any[], action: '补齐参考作品画像、参考预览或关闭参考模式。' },
  ]
  const bucketMap = new Map(buckets.map(bucket => [bucket.key, bucket]))
  for (const row of rows) {
    const categories = Array.isArray(row.material_score?.categories) ? row.material_score.categories : []
    const weakCategories = categories.filter((item: any) => Number(item.score || 0) < 60)
    for (const category of weakCategories) {
      const bucket = bucketMap.get(category.key)
      if (!bucket) continue
      bucket.chapters.push({
        chapter_id: row.chapter_id,
        chapter_no: row.chapter_no,
        title: row.title,
        score: row.score,
        category_score: category.score,
        recommendation: category.fix,
      })
    }
  }
  const orderedBuckets = buckets
    .map(bucket => ({
      ...bucket,
      chapters: bucket.chapters.sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0)).slice(0, 30),
      count: bucket.chapters.length,
    }))
    .filter(bucket => bucket.count > 0)
  return {
    buckets: orderedBuckets,
    next_actions: orderedBuckets.slice(0, 5).map(bucket => `${bucket.label}：${bucket.count} 章。${bucket.action}`),
    ready_chapter_ids: rows.filter(row => row.can_generate).map(row => row.chapter_id),
    blocked_chapter_ids: rows.filter(row => !row.can_generate).map(row => row.chapter_id),
  }
}

export function registerNovelChapterContextRoutes(app: Express, ctx: ChapterContextRoutesContext) {
  app.get('/api/novel/chapters/:chapterId/preflight', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      res.json({ ok: loaded.contextPackage.preflight.ready, context_package: loaded.contextPackage, preflight: loaded.contextPackage.preflight })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/generation-diagnostics', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const preflight = loaded.contextPackage.preflight
      const readinessScore = Math.round((preflight.checks.filter((item: any) => item.ok).length / Math.max(1, preflight.checks.length)) * 100)
      const materialScore = buildMaterialScore(loaded.contextPackage)
      res.json({
        ok: preflight.ready,
        readiness_score: readinessScore,
        material_score: materialScore,
        preflight,
        context_package: loaded.contextPackage,
        writing_bible: loaded.contextPackage.writing_bible,
        story_state: loaded.contextPackage.story_state,
        recommendations: materialScore.recommendations.length
          ? materialScore.recommendations
          : preflight.checks.filter((item: any) => !item.ok).map((item: any) => item.fix || `${item.label}不足`),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/material-score', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      res.json({ ok: true, material_score: buildMaterialScore(loaded.contextPackage), preflight: loaded.contextPackage.preflight })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/chapter-material-matrix', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const limit = Math.max(1, Math.min(300, Number(req.query.limit || 120)))
      const unwrittenOnly = String(req.query.unwritten_only || '') === '1'
      const scopedChapters = chapters
        .filter(chapter => !unwrittenOnly || !chapter.chapter_text)
        .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
        .slice(0, limit)
      const rows = []
      for (const chapter of scopedChapters) {
        const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
        const materialScore = buildMaterialScore(contextPackage)
        rows.push({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          status: chapter.status || '',
          word_count: String(chapter.chapter_text || '').replace(/\s/g, '').length,
          has_text: Boolean(chapter.chapter_text),
          material_score: materialScore,
          score: materialScore.score,
          level: materialScore.level,
          can_generate: materialScore.can_generate,
          blockers: materialScore.blockers,
          recommendations: materialScore.recommendations,
        })
      }
      const blocked = rows.filter(row => !row.can_generate)
      res.json({
        ok: true,
        rows,
        summary: {
          total: rows.length,
          ready: rows.filter(row => row.can_generate).length,
          blocked: blocked.length,
          average_score: rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.score || 0), 0) / rows.length) : 0,
          low_score: rows.filter(row => Number(row.score || 0) < 65).length,
        },
        weakest: [...rows].sort((a, b) => Number(a.score || 0) - Number(b.score || 0)).slice(0, 12),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/material-repair-plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const limit = Math.max(1, Math.min(300, Number(req.query.limit || 120)))
      const startNo = Math.max(1, Number(req.query.start_chapter || 1))
      const unwrittenOnly = String(req.query.unwritten_only ?? '1') !== '0'
      const scopedChapters = chapters
        .filter(chapter => Number(chapter.chapter_no || 0) >= startNo)
        .filter(chapter => !unwrittenOnly || !chapter.chapter_text)
        .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
        .slice(0, limit)
      const rows = []
      for (const chapter of scopedChapters) {
        const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
        const materialScore = buildMaterialScore(contextPackage)
        rows.push({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          has_text: Boolean(chapter.chapter_text),
          score: materialScore.score,
          can_generate: materialScore.can_generate,
          material_score: materialScore,
        })
      }
      const plan = buildMaterialRepairPlan(rows)
      res.json({
        ok: true,
        rows,
        plan,
        summary: {
          scanned: rows.length,
          ready: plan.ready_chapter_ids.length,
          blocked: plan.blocked_chapter_ids.length,
          average_score: rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.score || 0), 0) / rows.length) : 0,
          bucket_count: plan.buckets.length,
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/context-package', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      res.json({ ok: true, context_package: loaded.contextPackage, override: loaded.chapter.raw_payload?.context_package_override || null })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/chapters/:chapterId/context-package', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const chapter = (await listNovelChapters(activeWorkspace, projectId)).find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const override = req.body?.override || req.body?.context_package_override || {}
      const updated = await updateNovelChapter(activeWorkspace, chapterId, {
        raw_payload: {
          ...(chapter.raw_payload || {}),
          context_package_override: override,
          context_package_override_updated_at: new Date().toISOString(),
        },
      } as any, { createVersion: false })
      res.json({ ok: true, chapter: updated, override })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
