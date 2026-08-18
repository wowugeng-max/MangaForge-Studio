import type { Express } from 'express'
import { executeNovelAgent } from '../llm'
import { installOhStoryCoreSuite } from '../novel-writing/oh-story-core/install'
import { loadOhStoryCoreSuite } from '../novel-writing/oh-story-core/store'

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
  executeAgent?: (...args: any[]) => Promise<any>
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

function resolveDeps(deps: OhStoryCoreRoutesDeps) {
  const getWorkspace = deps.getWorkspace
  const loadSuite = deps.loadSuite || loadOhStoryCoreSuite
  const installSuite = deps.installSuite || (async (workspace: string) => {
    await installOhStoryCoreSuite(workspace)
    return loadOhStoryCoreSuite(workspace)
  })
  return { getWorkspace, loadSuite, installSuite }
}

function goneOhStoryCoreAction(_req: any, res: any) {
  return res.status(410).json({
    ok: false,
    code: 'ROUTE_REMOVED',
    error: '请改用 POST /api/kernel/jobs',
  })
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

  app.post('/api/novel/oh-story/core/review', goneOhStoryCoreAction)
  app.post('/api/novel/oh-story/core/deslop', goneOhStoryCoreAction)
  app.post('/api/novel/oh-story/core/apply', goneOhStoryCoreAction)
}
