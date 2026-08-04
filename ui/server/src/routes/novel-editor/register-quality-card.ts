import type { Express } from 'express'
import type { EditorRoutesContext } from './builders'
import {
  buildChapterQualityCard,
  loadChapterBundle,
} from './builders'

export function registerNovelEditorQualityCardRoute(app: Express, ctx: EditorRoutesContext) {
  app.get('/api/novel/chapters/:chapterId/quality-card', async (req, res) => {
    try {
      const loaded = await loadChapterBundle(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const { activeWorkspace, chapter, chapters, worldbuilding, characters, outlines, reviews } = loaded
      const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, loaded.project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      return res.json({
        ok: true,
        quality_card: buildChapterQualityCard(chapter, contextPackage, reviews),
        context_package: contextPackage,
      })
    } catch (error) {
      return res.status(500).json({ error: String(error) })
    }
  })
}
