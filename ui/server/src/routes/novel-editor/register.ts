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
import { createEditorRevisionWorker, type EditorRevisionWorker } from './revision-worker'

export type NovelEditorRoutesLifecycle = {
  start(workspace: string): Promise<void>
  stop(): Promise<void>
  editorRevisionWorker: EditorRevisionWorker
}

export function registerNovelEditorRoutes(
  app: Express,
  ctx: EditorRoutesContext,
): NovelEditorRoutesLifecycle {
  const editorRevisionWorker = createEditorRevisionWorker(ctx)
  registerNovelEditorAnnotationRoutes(app, ctx)
  registerNovelEditorRevisionRoutes(app, { ...ctx, editorRevisionWorker })
  registerNovelEditorQualityRoutes(app, ctx)
  return {
    start: (workspace: string) => editorRevisionWorker.start(workspace),
    stop: () => editorRevisionWorker.stop(),
    editorRevisionWorker,
  }
}
