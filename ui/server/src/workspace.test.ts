import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  WORKSPACE_SWITCH_RESTART_REQUIRED,
  createActiveWorkspaceState,
  getDefaultWorkspace,
  loadActiveWorkspaceSync,
} from './workspace'
import { registerWorkspaceRoutes } from './routes/workspace'

let dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))
  dirs = []
})

async function tempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'mangaforge-workspace-sync-'))
  dirs.push(dir)
  return dir
}

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const app = {
    get: (path: string, handler: any) => {
      handlers.set(`GET ${path}`, handler)
      return app
    },
    post: (path: string, handler: any) => {
      handlers.set(`POST ${path}`, handler)
      return app
    },
  }
  return { app, handlers }
}

async function callRoute(handler: any, req: any = {}) {
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
  await handler({ body: {}, query: {}, params: {}, ...req }, res)
  return res
}

describe('loadActiveWorkspaceSync', () => {
  test('falls back to the default workspace when the config file does not exist', async () => {
    const dir = await tempDir()
    const configPath = join(dir, 'missing.json')
    expect(loadActiveWorkspaceSync(configPath)).toBe(getDefaultWorkspace())
  })

  test('returns the configured active workspace when the config file is valid and the path exists', async () => {
    const dir = await tempDir()
    const workspace = join(dir, 'my-workspace')
    await mkdir(workspace, { recursive: true })
    const configPath = join(dir, 'config.json')
    await writeFile(configPath, JSON.stringify({ activeWorkspace: workspace }), 'utf8')
    expect(loadActiveWorkspaceSync(configPath)).toBe(workspace)
  })

  test('falls back to the default workspace when the config JSON is corrupt', async () => {
    const dir = await tempDir()
    const configPath = join(dir, 'config.json')
    await writeFile(configPath, '{ not valid json', 'utf8')
    expect(loadActiveWorkspaceSync(configPath)).toBe(getDefaultWorkspace())
  })

  test('falls back to the default workspace when activeWorkspace is missing from the config', async () => {
    const dir = await tempDir()
    const configPath = join(dir, 'config.json')
    await writeFile(configPath, JSON.stringify({}), 'utf8')
    expect(loadActiveWorkspaceSync(configPath)).toBe(getDefaultWorkspace())
  })

  test('falls back to the default workspace when the configured path does not exist', async () => {
    const dir = await tempDir()
    const configPath = join(dir, 'config.json')
    await writeFile(configPath, JSON.stringify({ activeWorkspace: join(dir, 'ghost') }), 'utf8')
    expect(loadActiveWorkspaceSync(configPath)).toBe(getDefaultWorkspace())
  })
})

describe('active workspace lifecycle state', () => {
  test('rejects a different workspace after revision recovery binds and preserves the active workspace', () => {
    const state = createActiveWorkspaceState('/tmp/workspace-a')
    state.bindRevisionWorkspace('/tmp/workspace-a')

    expect(() => state.setWorkspace('/tmp/workspace-b')).toThrow(/restart/i)
    try {
      state.setWorkspace('/tmp/workspace-b')
    } catch (error) {
      expect(error).toMatchObject({
        code: WORKSPACE_SWITCH_RESTART_REQUIRED,
        statusCode: 409,
      })
    }
    expect(state.getWorkspace()).toBe('/tmp/workspace-a')
  })

  test('allows a same-workspace no-op after revision recovery binds', () => {
    const state = createActiveWorkspaceState('/tmp/workspace-a')
    state.bindRevisionWorkspace('/tmp/workspace-a')

    expect(() => state.setWorkspace('/tmp/workspace-a')).not.toThrow()
    expect(state.getWorkspace()).toBe('/tmp/workspace-a')
  })
})

describe('workspace switch route lifecycle guard', () => {
  test('returns 409 before setup or persistence when revision recovery is bound to another workspace', async () => {
    const state = createActiveWorkspaceState('/tmp/workspace-a')
    state.bindRevisionWorkspace('/tmp/workspace-a')
    let ensureCalls = 0
    let saveCalls = 0
    const { app, handlers } = createRouteHarness()
    registerWorkspaceRoutes(
      app,
      state.getWorkspace,
      state.setWorkspace,
      {
        ensureWorkspaceStructure: async () => { ensureCalls += 1 },
        saveActiveWorkspace: async () => { saveCalls += 1 },
      },
    )

    const response = await callRoute(handlers.get('POST /api/workspace/switch'), {
      body: { workspace: '/tmp/workspace-b' },
    })

    expect(response.statusCode).toBe(409)
    expect(response.body).toMatchObject({
      error_code: WORKSPACE_SWITCH_RESTART_REQUIRED,
    })
    expect(state.getWorkspace()).toBe('/tmp/workspace-a')
    expect(ensureCalls).toBe(0)
    expect(saveCalls).toBe(0)
  })
})
