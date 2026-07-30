import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  createNovelProject,
  getNovelProject,
  mutateNovelProjectReferenceConfig,
} from '../novel'
import { registerNovelProjectConfigRoutes } from './novel-project-config-routes'

const workspaces: string[] = []

function routeHarness() {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'put', 'post']) {
    app[method] = (path: string, handler: any) => {
      handlers.set(`${method.toUpperCase()} ${path}`, handler)
      return app
    }
  }
  return { app, handlers }
}

async function callRoute(handler: any, req: any) {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: any) {
      this.body = body
      return this
    },
  }
  await handler(req, res)
  return res
}

function context(workspace: string) {
  return {
    getWorkspace: () => workspace,
    getProject: (_workspace: string, id: number) => getNovelProject(_workspace, id),
    getApprovalPolicy: () => ({}),
    getProductionBudget: () => ({}),
    getProductionBudgetDecision: () => ({}),
    getQualityGate: () => ({}),
    getAgentPromptConfig: () => ({}),
    buildAgentConfigSnapshot: () => ({}),
  }
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('editor revision project config routes', () => {
  test('returns 600 seconds for a legacy project with no setting', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'revision-config-route-'))
    workspaces.push(workspace)
    const project = await createNovelProject(workspace, { title: 'legacy', reference_config: {} })
    const { app, handlers } = routeHarness()
    registerNovelProjectConfigRoutes(app, context(workspace) as any)

    const response = await callRoute(
      handlers.get('GET /api/novel/projects/:id/editor-revision-config'),
      { params: { id: String(project.id) } },
    )

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      ok: true,
      config: { timeout_seconds: 600, story_state_max_tokens: 9000 },
    })
  })

  test('clamps and merges timeout without overwriting sibling reference config', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'revision-config-route-'))
    workspaces.push(workspace)
    const project = await createNovelProject(workspace, {
      title: 'merge-safe',
      reference_config: {
        references: [{ project_title: '参考书' }],
        story_state: { current_time: 'night' },
      },
    })
    const { app, handlers } = routeHarness()
    registerNovelProjectConfigRoutes(app, context(workspace) as any)

    const response = await callRoute(
      handlers.get('PUT /api/novel/projects/:id/editor-revision-config'),
      { params: { id: String(project.id) }, body: { config: { timeout_seconds: 900 } } },
    )
    const stored = await getNovelProject(workspace, project.id)

    expect(response.statusCode).toBe(200)
    expect(response.body.config).toEqual({ timeout_seconds: 600, story_state_max_tokens: 9000 })
    expect(stored?.reference_config).toMatchObject({
      references: [{ project_title: '参考书' }],
      story_state: { current_time: 'night' },
      editor_revision: { timeout_seconds: 600, story_state_max_tokens: 9000 },
    })
  })

  test('updates only the story state budget without replacing existing reference config', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'revision-config-route-'))
    workspaces.push(workspace)
    const project = await createNovelProject(workspace, {
      title: 'story-state-only',
      reference_config: {
        story_state: { current_time: 'night' },
        editor_revision: { timeout_seconds: 420, custom: 'keep' },
      },
    })
    const { app, handlers } = routeHarness()
    registerNovelProjectConfigRoutes(app, context(workspace) as any)

    const response = await callRoute(
      handlers.get('PUT /api/novel/projects/:id/editor-revision-config'),
      { params: { id: String(project.id) }, body: { config: { story_state_max_tokens: 262144 } } },
    )
    const stored = await getNovelProject(workspace, project.id)

    expect(response.statusCode).toBe(200)
    expect(response.body.config).toEqual({ timeout_seconds: 420, story_state_max_tokens: 262144 })
    expect(stored?.reference_config).toMatchObject({
      story_state: { current_time: 'night' },
      editor_revision: {
        timeout_seconds: 420,
        story_state_max_tokens: 262144,
        custom: 'keep',
      },
    })
  })

  test('preserves a concurrent reference config update after the route reads the project', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'revision-config-route-'))
    workspaces.push(workspace)
    const project = await createNovelProject(workspace, {
      title: 'concurrent-merge',
      reference_config: { story_state: { current_time: 'night' } },
    })
    const { app, handlers } = routeHarness()
    const routeContext = context(workspace)
    routeContext.getProject = async (_workspace: string, id: number) => {
      const stale = await getNovelProject(_workspace, id)
      await mutateNovelProjectReferenceConfig(_workspace, {
        projectId: id,
        operation: 'test concurrent config update',
        mutate: current => ({
          referenceConfig: { ...current, concurrent_sibling: { preserved: true } },
          result: null,
        }),
      })
      return stale
    }
    registerNovelProjectConfigRoutes(app, routeContext as any)

    const response = await callRoute(
      handlers.get('PUT /api/novel/projects/:id/editor-revision-config'),
      { params: { id: String(project.id) }, body: { config: { timeout_seconds: 420 } } },
    )
    const stored = await getNovelProject(workspace, project.id)

    expect(response.statusCode).toBe(200)
    expect(stored?.reference_config).toMatchObject({
      story_state: { current_time: 'night' },
      concurrent_sibling: { preserved: true },
      editor_revision: { timeout_seconds: 420 },
    })
  })

  test('accepts legacy timeout-only, budget-only, and combined requests', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'revision-config-route-'))
    workspaces.push(workspace)
    const project = await createNovelProject(workspace, { title: 'compatible', reference_config: {} })
    const { app, handlers } = routeHarness()
    registerNovelProjectConfigRoutes(app, context(workspace) as any)
    const put = handlers.get('PUT /api/novel/projects/:id/editor-revision-config')

    const timeoutOnly = await callRoute(put, {
      params: { id: String(project.id) }, body: { timeout_seconds: 420 },
    })
    const budgetOnly = await callRoute(put, {
      params: { id: String(project.id) }, body: { story_state_max_tokens: 12000 },
    })
    const combined = await callRoute(put, {
      params: { id: String(project.id) },
      body: { config: { timeout_seconds: 300, story_state_max_tokens: 15000 } },
    })

    expect(timeoutOnly.body.config).toEqual({ timeout_seconds: 420, story_state_max_tokens: 9000 })
    expect(budgetOnly.body.config).toEqual({ timeout_seconds: 420, story_state_max_tokens: 12000 })
    expect(combined.body.config).toEqual({ timeout_seconds: 300, story_state_max_tokens: 15000 })
  })

  test('rejects invalid present settings and returns 404 for a missing project', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'revision-config-route-'))
    workspaces.push(workspace)
    const project = await createNovelProject(workspace, { title: 'validation', reference_config: {} })
    const { app, handlers } = routeHarness()
    registerNovelProjectConfigRoutes(app, context(workspace) as any)
    const put = handlers.get('PUT /api/novel/projects/:id/editor-revision-config')

    const invalidTimeout = await callRoute(put, {
      params: { id: String(project.id) },
      body: { config: { timeout_seconds: '600' } },
    })
    const invalidBudget = await callRoute(put, {
      params: { id: String(project.id) },
      body: { config: { story_state_max_tokens: '9000' } },
    })
    const nonFinite = await callRoute(put, {
      params: { id: String(project.id) },
      body: { config: { story_state_max_tokens: Number.POSITIVE_INFINITY } },
    })
    const empty = await callRoute(put, {
      params: { id: String(project.id) }, body: { config: {} },
    })
    const missing = await callRoute(put, {
      params: { id: '999999' },
      body: { config: { timeout_seconds: 600 } },
    })

    expect(invalidTimeout.statusCode).toBe(400)
    expect(invalidBudget.statusCode).toBe(400)
    expect(nonFinite.statusCode).toBe(400)
    expect(empty).toMatchObject({
      statusCode: 400,
      body: { error: 'at least one editor revision setting is required' },
    })
    expect(missing.statusCode).toBe(404)
  })
})
