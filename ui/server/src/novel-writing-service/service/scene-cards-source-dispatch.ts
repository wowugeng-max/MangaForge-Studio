import {
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  chapterGenerationSourceFingerprint,
  resolveChapterGenerationSource,
} from '../generation-source/source-config'
import type {
  BeginChapterTaskInput,
  ChapterTaskExecution,
} from '../generation-source/types'
import {
  normalizeSceneCardsPayload,
} from '../post-delivery/scene-cards'

export type SceneCardsBySourceOptions = {
  expectedAuthorityFingerprint?: string
  abortSignal?: AbortSignal
  signal?: AbortSignal
  [key: string]: any
}

export type SceneCardsSourceDispatchDependencies = {
  beginChapterTask: (input: BeginChapterTaskInput) => Promise<ChapterTaskExecution>
  buildSceneCardsPrompt: (project: any, contextPackage: any) => string
  generateSceneCardsForChapter: (
    activeWorkspace: string,
    project: any,
    contextPackage: any,
    modelId?: number,
    options?: any,
  ) => Promise<{ result: any; sceneCards: any[] }>
}

function ownFailureText(error: unknown, field: string) {
  if (!error || (typeof error !== 'object' && typeof error !== 'function')) return ''
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, field)
    return descriptor && 'value' in descriptor && typeof descriptor.value === 'string'
      ? descriptor.value
      : ''
  } catch {
    return ''
  }
}

function sceneCardsCancelled(error: unknown, signal?: AbortSignal) {
  if (signal?.reason !== undefined && error === signal.reason) return true
  const code = ownFailureText(error, 'code') || ownFailureText(error, 'error_code')
  const name = ownFailureText(error, 'name')
  return ['REQUEST_CANCELED', 'MCP_CANCELLED', 'ABORT_ERR'].includes(code) || name === 'AbortError'
}

export function createSceneCardsSourceDispatch(deps: SceneCardsSourceDispatchDependencies) {
  const generateSceneCardsViaMcp = async (
    activeWorkspace: string,
    project: any,
    chapter: any,
    contextPackage: any,
    options: SceneCardsBySourceOptions = {},
  ) => {
    const signal = options.abortSignal || options.signal
    const expectedAuthorityFingerprint = options.expectedAuthorityFingerprint
      || chapterGenerationSourceFingerprint(resolveChapterGenerationSource(project))
    const execution = await deps.beginChapterTask({
      activeWorkspace,
      project,
      chapter,
      contextPackage,
      expectedAuthorityFingerprint,
      options: { scene_cards: true },
      signal,
    })
    let stageResult: any
    let failed = false
    let primaryFailure: unknown
    try {
      stageResult = await execution.executeAgent(
        'scene_cards',
        'scene_cards_json',
        'outline-agent',
        project,
        {
          task: deps.buildSceneCardsPrompt(project, contextPackage),
          authoritativeTask: true,
        },
        { activeWorkspace, signal },
      )
    } catch (error) {
      failed = true
      primaryFailure = error
    }
    if (failed) {
      try {
        await execution.close({
          status: sceneCardsCancelled(primaryFailure, signal) ? 'cancelled' : 'failed',
          error: primaryFailure,
        })
      } catch (closeError) {
        throw new AggregateError(
          [primaryFailure, closeError],
          'MCP scene cards stage and task close both failed',
        )
      }
      throw primaryFailure
    }
    const sceneCards = normalizeSceneCardsPayload(getNovelPayload(stageResult), contextPackage)
    await execution.close({ status: 'success' })
    return { result: stageResult, sceneCards }
  }

  const generateSceneCardsBySource = async (
    activeWorkspace: string,
    project: any,
    chapter: any,
    contextPackage: any,
    modelId?: number,
    options: SceneCardsBySourceOptions = {},
  ) => {
    if (resolveChapterGenerationSource(project).active === 'mcp') {
      return generateSceneCardsViaMcp(activeWorkspace, project, chapter, contextPackage, options)
    }
    return deps.generateSceneCardsForChapter(activeWorkspace, project, contextPackage, modelId, options)
  }

  return {
    generateSceneCardsBySource,
    generateSceneCardsViaMcp,
  }
}

export type SceneCardsSourceDispatch = ReturnType<typeof createSceneCardsSourceDispatch>
