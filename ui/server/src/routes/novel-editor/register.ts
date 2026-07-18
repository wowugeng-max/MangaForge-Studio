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

export function registerNovelEditorRoutes(app: Express, ctx: EditorRoutesContext) {
  registerNovelEditorAnnotationRoutes(app, ctx)
  registerNovelEditorRevisionRoutes(app, ctx)
  registerNovelEditorQualityRoutes(app, ctx)
}
