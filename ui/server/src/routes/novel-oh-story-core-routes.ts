import type { Express } from 'express'
import { executeNovelAgent } from '../llm'
import { createNovelReview, getNovelChapter, listNovelReviewsByType, updateNovelChapter } from '../novel'
import { installOhStoryCoreSuite } from '../novel-writing/oh-story-core/install'
import { latestOhStoryReviewForChapter } from '../novel-writing/oh-story-core/review-match'
import { runOhStoryCoreAction, type OhStoryCoreAction } from '../novel-writing/oh-story-core/runner'
import { loadOhStoryCoreSuite } from '../novel-writing/oh-story-core/store'
import { getStageModelId } from './novel-production/model-policy'

export type OhStoryCoreSuiteView = {
  revision: string
  skills?: Record<string, unknown> | string[]
}

export type OhStoryCoreRoutesDeps = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getChapter?: (workspace: string, chapterId: number, projectId: number) => Promise<any>
  loadSuite?: (workspace: string) => OhStoryCoreSuiteView | null
  installSuite?: (workspace: string) => Promise<{ revision?: string } | void | null>
  runAction?: (input: {
    workspace: string
    project: any
    chapter: any
    action: OhStoryCoreAction
    modelId?: number
  }) => Promise<any>
  executeAgent?: (...args: any[]) => Promise<any>
  saveReview?: (row: Record<string, any>) => Promise<any>
  updateChapterText?: (row: Record<string, any>) => Promise<any>
  findLatestOhStoryReview?: (input: {
    workspace: string
    projectId: number
    chapterId: number
  }) => Promise<any | null>
}

export function readOhStoryCoreAgentResult(result: any): { content: string } {
  if (result?.error) {
    throw Object.assign(new Error(String(result.error)), { code: 'OH_STORY_CORE_EMPTY_OUTPUT' })
  }
  const content = String(result?.content ?? result?.text ?? '').trim()
  if (!content) {
    throw Object.assign(new Error('oh-story core returned empty output'), { code: 'OH_STORY_CORE_EMPTY_OUTPUT' })
  }
  return { content }
}

export async function executeOhStoryCoreAgent(
  _stage: string,
  _responseContract: string,
  agentId: string,
  project: any,
  context: Record<string, any>,
  options?: Record<string, any>,
) {
  const result = await executeNovelAgent(agentId, project, context, options)
  return readOhStoryCoreAgentResult(result)
}

function skillIds(skills: OhStoryCoreSuiteView['skills']): string[] {
  if (Array.isArray(skills)) return skills.map(String)
  return Object.keys(skills || {})
}

function errorCode(error: any): string {
  return typeof error?.code === 'string' ? error.code : ''
}

function resolveDeps(deps: OhStoryCoreRoutesDeps) {
  const getWorkspace = deps.getWorkspace
  const getProject = deps.getProject
  const getChapter = deps.getChapter || getNovelChapter
  const loadSuite = deps.loadSuite || loadOhStoryCoreSuite
  const installSuite = deps.installSuite || (async (workspace: string) => {
    await installOhStoryCoreSuite(workspace)
    return loadOhStoryCoreSuite(workspace)
  })
  const findLatestOhStoryReview = deps.findLatestOhStoryReview || (async ({ workspace, projectId, chapterId }) => {
    const reviews = await listNovelReviewsByType(workspace, projectId, 'oh_story_review')
    return latestOhStoryReviewForChapter(reviews, chapterId)
  })
  const runAction = deps.runAction || ((input) => runOhStoryCoreAction({
    ...input,
    executeAgent: deps.executeAgent || executeOhStoryCoreAgent,
    findLatestOhStoryReview,
    saveReview: deps.saveReview || ((row) => createNovelReview(input.workspace, {
      ...row,
      payload: typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload ?? {}),
    })),
    updateChapterText: deps.updateChapterText || ((row) => updateNovelChapter(
      input.workspace,
      Number(row.chapter_id || row.id),
      { chapter_text: String(row.chapter_text || '') },
      { versionSource: String(row.source || 'oh_story_deslop') },
    )),
  }))
  return { getWorkspace, getProject, getChapter, loadSuite, installSuite, runAction }
}

export function registerOhStoryCoreRoutes(app: Express, deps: OhStoryCoreRoutesDeps) {
  const resolved = resolveDeps(deps)

  app.get('/api/novel/oh-story/core', (_req, res) => {
    try {
      const suite = resolved.loadSuite(resolved.getWorkspace())
      if (!suite) return res.json({ ok: true, installed: false })
      res.json({
        ok: true,
        installed: true,
        revision: suite.revision,
        skills: skillIds(suite.skills),
      })
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) })
    }
  })

  app.post('/api/novel/oh-story/core/install', async (_req, res) => {
    try {
      const workspace = resolved.getWorkspace()
      const installed = await resolved.installSuite(workspace)
      const revision = (installed && typeof installed === 'object' && installed.revision)
        ? installed.revision
        : resolved.loadSuite(workspace)?.revision
      res.json({ ok: true, revision })
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) })
    }
  })

  const handleAction = (action: OhStoryCoreAction) => async (req: any, res: any) => {
    try {
      const workspace = resolved.getWorkspace()
      const projectId = Number(req.body?.project_id || 0)
      const chapterId = Number(req.body?.chapter_id || 0)
      const project = await resolved.getProject(workspace, projectId)
      const chapter = await resolved.getChapter(workspace, chapterId, projectId)
      if (!chapter) {
        return res.status(404).json({ error: 'chapter not found', code: 'CHAPTER_NOT_FOUND' })
      }
      const requestedModelId = Number(req.body?.model_id || 0) || undefined
      const modelId = getStageModelId(project, action === 'review' ? 'review' : 'revise', requestedModelId)
      const result = await resolved.runAction({ workspace, project, chapter, action, modelId })
      res.json({ ok: true, ...result })
    } catch (error: any) {
      const code = errorCode(error)
      if (code === 'OH_STORY_CORE_NOT_INSTALLED') {
        return res.status(404).json({ error: String(error?.message || error), code })
      }
      if (code === 'CHAPTER_NOT_FOUND') {
        return res.status(404).json({ error: String(error?.message || error), code })
      }
      if (code === 'OH_STORY_APPLY_NO_REVIEW' || code === 'OH_STORY_APPLY_STALE_REVIEW') {
        return res.status(409).json({ error: '先对本稿重新审稿', code })
      }
      if (code === 'OH_STORY_APPLY_REWROTE_TOO_MUCH') {
        return res.status(409).json({ error: '这次改动太大，像整章重写。请再试一次', code })
      }
      if (code === 'OH_STORY_CORE_EMPTY_OUTPUT' || code === 'OH_STORY_CORE_NOT_PROSE') {
        return res.status(500).json({ error: '这次没有改出正文', code })
      }
      res.status(500).json({ error: String(error?.message || error), ...(code ? { code } : {}) })
    }
  }

  app.post('/api/novel/oh-story/core/review', handleAction('review'))
  app.post('/api/novel/oh-story/core/deslop', handleAction('deslop'))
  app.post('/api/novel/oh-story/core/apply', handleAction('apply'))
}
