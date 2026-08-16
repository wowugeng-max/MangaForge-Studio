import type { Express } from 'express'
import { readFileSync } from 'node:fs'
import { createAndRunKernelJob } from '../kernel/jobs/run-job'
import { getKernelJobDetail } from '../kernel/jobs/repo'
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
  createKernelJob?: typeof createAndRunKernelJob
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

const CONTRACT_BY_ACTION: Record<OhStoryCoreAction, string> = {
  review: 'oh-story-core.story-review.full',
  deslop: 'oh-story-core.story-deslop.file',
  apply: 'oh-story-core.story-apply.surgical',
}

const TERMINAL_ERROR_HTTP: Record<string, { status: number; message?: string }> = {
  OH_STORY_APPLY_NO_REVIEW: { status: 409, message: '先对本稿重新审稿' },
  OH_STORY_APPLY_STALE_REVIEW: { status: 409, message: '先对本稿重新审稿' },
  OH_STORY_APPLY_REWROTE_TOO_MUCH: { status: 409, message: '这次改动太大，像整章重写。请再试一次' },
  SOLO_FALLBACK: { status: 409 },
  REVIEWERS_MISSING: { status: 409 },
  SKILL_NOT_FOUND: { status: 409 },
  CHAPTER_FILE_MISSING: { status: 500 },
  OUTPUT_MISSING: { status: 500 },
  ENGINE_FAILED: { status: 500 },
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
      if (!chapter) return res.status(404).json({ error: 'chapter not found', code: 'CHAPTER_NOT_FOUND' })
      const requestedModelId = Number(req.body?.model_id || 0) || undefined
      const modelId = getStageModelId(project, action === 'review' ? 'review' : 'revise', requestedModelId)
      const createJob = deps.createKernelJob || createAndRunKernelJob
      const created = await createJob(workspace, {
        project_id: projectId, subject_type: 'chapter', subject_id: chapterId,
        contract_ids: [CONTRACT_BY_ACTION[action]], model_id: Number(modelId || 0),
      })
      if (!created.ok) return res.status(created.status).json({ error: created.message, code: created.code })
      await created.done
      const detail = getKernelJobDetail(workspace, created.jobId)!
      if (detail.job.status === 'committed') {
        if (action === 'review') {
          const commit = detail.commits.find((c: any) => c.domain_table === 'reviews')
          const artifact = detail.artifacts.find((a: any) => a.artifact_kind === 'review_report')
          let reportText = ''
          try { reportText = readFileSync(String(artifact?.vault_path || ''), 'utf8') } catch { /* 报告读取失败不阻塞回包 */ }
          return res.json({ ok: true, changed: false, review_id: Number(commit?.domain_row_id || 0), report_text: reportText, kernel_job_id: created.jobId })
        }
        const updated = await resolved.getChapter(workspace, chapterId, projectId)
        return res.json({ ok: true, changed: true, chapter_text: String(updated?.chapter_text || ''), kernel_job_id: created.jobId })
      }
      const code = detail.job.error_code || detail.candidates.find(c => c.error_code)?.error_code || 'ENGINE_FAILED'
      const mapped = TERMINAL_ERROR_HTTP[code] || { status: 500 }
      return res.status(mapped.status).json({ error: mapped.message || `内核任务失败：${code}`, code, kernel_job_id: created.jobId })
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) })
    }
  }

  app.post('/api/novel/oh-story/core/review', handleAction('review'))
  app.post('/api/novel/oh-story/core/deslop', handleAction('deslop'))
  app.post('/api/novel/oh-story/core/apply', handleAction('apply'))
}
