import type { Express } from 'express'
import { listNovelReviews } from '../novel'
import { listKnowledge } from '../knowledge-base'
import { asArray, parseJsonLikePayload } from './novel-route-utils'

type ReferenceRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  buildReferenceCoverageReport: (project: any) => Promise<any>
}

export function registerNovelReferenceRoutes(app: Express, ctx: ReferenceRoutesContext) {
  app.get('/api/novel/projects/:id/writing-assets', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const categories = [
        'reference_profile',
        'volume_architecture',
        'chapter_beat_template',
        'character_function_matrix',
        'payoff_model',
        'resource_economy_model',
        'style_profile',
        'prose_syntax_profile',
        'dialogue_mechanism',
      ]
      const referenceTitles = asArray(project.reference_config?.references).map((item: any) => String(item.project_title || '').trim()).filter(Boolean)
      const entries = []
      for (const category of categories) {
        const categoryEntries = referenceTitles.length
          ? (await Promise.all(referenceTitles.map((title: string) => listKnowledge(category, { project_title: title }).catch(() => [])))).flat()
          : await listKnowledge(category).catch(() => [])
        entries.push({ category, entries: categoryEntries.slice(0, 20) })
      }
      res.json({ ok: true, reference_titles: referenceTitles, assets: entries })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/reference-coverage', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, coverage: await ctx.buildReferenceCoverageReport(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/reference-fusion', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const references = asArray(project.reference_config?.references)
      const reports = await listNovelReviews(activeWorkspace, project.id)
      const latestReports = reports.filter(item => item.review_type === 'reference_report').slice(0, 8).map(item => parseJsonLikePayload(item.payload) || {})
      const rows = await Promise.all(references.map(async (ref: any) => {
        const title = String(ref.project_title || '').trim()
        const categories = await Promise.all(['chapter_beat_template', 'style_profile', 'payoff_model', 'character_function_matrix', 'prose_syntax_profile', 'dialogue_mechanism'].map(async category => ({
          category,
          count: (await listKnowledge(category, { project_title: title }).catch(() => [])).length,
        })))
        return {
          project_title: title,
          weight: Number(ref.weight || 0.7),
          use_for: asArray(ref.use_for),
          dimensions: asArray(ref.dimensions),
          avoid: asArray(ref.avoid),
          categories,
          learn: {
            rhythm: categories.find(item => item.category === 'chapter_beat_template')?.count || 0,
            style: (categories.find(item => item.category === 'style_profile')?.count || 0) + (categories.find(item => item.category === 'prose_syntax_profile')?.count || 0),
            payoff: categories.find(item => item.category === 'payoff_model')?.count || 0,
            character_function: categories.find(item => item.category === 'character_function_matrix')?.count || 0,
          },
        }
      }))
      const dimensionOwners: Record<string, string[]> = {}
      for (const ref of rows) {
        for (const dim of ref.dimensions.length ? ref.dimensions : ['未指定']) {
          dimensionOwners[dim] = [...(dimensionOwners[dim] || []), ref.project_title]
        }
      }
      const conflicts = Object.entries(dimensionOwners)
        .filter(([, owners]) => owners.length > 1)
        .map(([dimension, owners]) => ({ dimension, owners, suggestion: '为同一维度设置主参考，其他参考降权或只用于补充。' }))
      const latestCopyHits = latestReports.flatMap(report => asArray(report?.copy_guard?.hits)).slice(0, 20)
      res.json({
        ok: true,
        references: rows,
        fusion: {
          total_weight: rows.reduce((sum, row) => sum + Number(row.weight || 0), 0),
          active_dimensions: Object.keys(dimensionOwners),
          conflicts,
          latest_copy_hits: latestCopyHits,
          recommendations: [
            conflicts.length ? '存在多个参考作品争夺同一维度，建议明确主参考和补充参考。' : '',
            latestCopyHits.length ? '最近存在照搬命中，建议提高禁止项或降低对应参考权重。' : '',
            rows.some(row => row.learn.rhythm === 0) ? '部分参考缺章节节拍模板，正文仿写时可能只学到设定而学不到节奏。' : '',
          ].filter(Boolean),
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
