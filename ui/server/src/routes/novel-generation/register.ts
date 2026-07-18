import type { Express } from 'express'
import type { GenerationRoutesContext } from './builders'
import { registerNovelGenerationChapterGroupRoutes } from './register-chapter-groups'
import { registerNovelGenerationChapterPipelineRoutes } from './register-chapter-pipeline'

export function registerNovelGenerationRoutes(app: Express, ctx: GenerationRoutesContext) {
  registerNovelGenerationChapterGroupRoutes(app, ctx)
  registerNovelGenerationChapterPipelineRoutes(app, ctx)
}
