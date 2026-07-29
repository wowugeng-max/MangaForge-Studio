import type { Express } from 'express'
import type { EditorRoutesContext } from './builders'
import {
  registerNovelEditorAnnotationRoutes,
} from './register-annotations'
import {
  registerNovelEditorRevisionRoutes,
} from './register-revision'
import {
  registerNovelEditorQualityRoutes,
} from './register-quality'
import { createEditorRevisionWorker } from './revision-worker'

export function registerNovelEditorRoutes(app: Express, ctx: EditorRoutesContext) {
  const editorRevisionWorker = createEditorRevisionWorker(ctx)
  registerNovelEditorAnnotationRoutes(app, ctx)
  registerNovelEditorRevisionRoutes(app, { ...ctx, editorRevisionWorker })
  registerNovelEditorQualityRoutes(app, ctx)
}
