import type { Express } from 'express'
import {
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
} from '../novel'
import { parseJsonLikePayload } from './novel-route-utils'

type ProjectInsightRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getStoryState: (project: any) => any
  buildProductionDashboard: (project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[], runs: any[]) => any
  buildProductionMetrics: (chapters: any[], reviews: any[], runs: any[]) => any
  buildCommercialReadiness: (project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[], runs: any[]) => any
}

export function registerNovelProjectInsightRoutes(app: Express, ctx: ProjectInsightRoutesContext) {
  app.get('/api/novel/projects/:id/production-dashboard', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      res.json({ ok: true, dashboard: ctx.buildProductionDashboard(project, chapters, outlines, characters, reviews, runs) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/production-metrics', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      res.json({ ok: true, metrics: ctx.buildProductionMetrics(chapters, reviews, runs) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/commercial-readiness', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      res.json({ ok: true, readiness: ctx.buildCommercialReadiness(project, chapters, outlines, characters, reviews, runs) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/continuity-audit', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, characters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const sorted = [...chapters].sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
      const state = ctx.getStoryState(project)
      const issues: any[] = []
      const titleMap = new Map<string, any[]>()
      for (const chapter of sorted) {
        const title = String(chapter.title || '').trim()
        if (title) titleMap.set(title, [...(titleMap.get(title) || []), chapter])
        if (chapter.chapter_no > 1) {
          const prev = sorted.filter(item => Number(item.chapter_no || 0) < Number(chapter.chapter_no || 0)).slice(-1)[0]
          if (chapter.chapter_text && !prev?.chapter_text && !prev?.ending_hook) {
            issues.push({ type: 'timeline_gap', severity: 'high', chapter_no: chapter.chapter_no, title: chapter.title, message: '当前章已有正文，但上一章缺正文和结尾钩子。', action: '补齐上一章正文或结尾钩子后再继续生成。' })
          }
          if (!chapter.continuity_notes?.length && chapter.chapter_text) {
            issues.push({ type: 'continuity_note_missing', severity: 'medium', chapter_no: chapter.chapter_no, title: chapter.title, message: '章节正文已存在，但缺连续性备注。', action: '补充本章结束后的角色、道具、伏笔和时间线变化。' })
          }
        }
        if (chapter.chapter_text && !chapter.ending_hook) {
          issues.push({ type: 'missing_hook', severity: 'medium', chapter_no: chapter.chapter_no, title: chapter.title, message: '章节缺章末钩子。', action: '补充下一章驱动力。' })
        }
      }
      for (const [title, rows] of titleMap.entries()) {
        if (rows.length > 1) {
          issues.push({ type: 'duplicate_title', severity: 'low', chapter_no: rows[0].chapter_no, title, message: `重复章节标题：${rows.map(item => `第${item.chapter_no}章`).join('、')}`, action: '确认是否为占位标题，避免目录混淆。' })
        }
      }
      const writtenMax = Math.max(0, ...sorted.filter(chapter => chapter.chapter_text).map(chapter => Number(chapter.chapter_no || 0)))
      if (writtenMax && Number(state.last_updated_chapter || 0) < writtenMax) {
        issues.push({ type: 'story_state_stale', severity: 'high', chapter_no: writtenMax, title: '', message: `故事状态机只更新到第${state.last_updated_chapter || 0}章，落后正文至第${writtenMax}章。`, action: '运行状态机更新或人工校正故事状态。' })
      }
      const characterNames = new Set(characters.map(char => String(char.name || '').trim()).filter(Boolean))
      const positions = state.character_positions || {}
      for (const name of Object.keys(positions)) {
        if (characterNames.size && !characterNames.has(name)) {
          issues.push({ type: 'unknown_character_state', severity: 'low', chapter_no: 0, title: '', message: `状态机包含未建角色卡：${name}`, action: '创建角色卡或清理状态机冗余角色。' })
        }
      }
      const repeated = Array.isArray(state.recent_repeated_information) ? state.recent_repeated_information : []
      for (const item of repeated.slice(0, 8)) {
        issues.push({ type: 'repeated_information', severity: 'medium', chapter_no: 0, title: '', message: `近期重复信息：${String(item)}`, action: '后续章节避免再次解释该信息，改为推进新信息。' })
      }
      const stateReviews = reviews.filter(item => item.review_type === 'story_state').slice(-10).map(item => parseJsonLikePayload(item.payload) || {})
      const unresolved = state.unresolved_conflicts || state.open_questions || []
      for (const item of (Array.isArray(unresolved) ? unresolved : Object.values(unresolved)).slice(0, 10)) {
        issues.push({ type: 'open_thread', severity: 'medium', chapter_no: 0, title: '', message: `未关闭线索/问题：${String(item)}`, action: '在滚动规划里安排回收或延期。' })
      }
      const severityWeight: Record<string, number> = { high: 12, medium: 6, low: 2 }
      const riskScore = Math.min(100, issues.reduce((sum, item) => sum + (severityWeight[item.severity] || 4), 0))
      res.json({
        ok: true,
        audit: {
          project_id: project.id,
          score: Math.max(0, 100 - riskScore),
          risk_score: riskScore,
          issue_count: issues.length,
          high_count: issues.filter(item => item.severity === 'high').length,
          medium_count: issues.filter(item => item.severity === 'medium').length,
          low_count: issues.filter(item => item.severity === 'low').length,
          issues,
          state_review_samples: stateReviews.length,
          recommendations: [
            issues.some(item => item.type === 'story_state_stale') ? '优先更新故事状态机，避免角色位置、道具归属和伏笔漂移。' : '',
            issues.some(item => item.type === 'timeline_gap') ? '先修补章节间空洞，再批量生成后续章节。' : '',
            issues.some(item => item.type === 'missing_hook') ? '补齐已写章节的章末钩子，提高续写上下文稳定性。' : '',
            repeated.length ? '清理近期重复信息，减少水文和反复解释。' : '',
          ].filter(Boolean),
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
