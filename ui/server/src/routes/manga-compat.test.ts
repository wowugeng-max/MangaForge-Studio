import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-manga-compat-'))
  workspaces.push(workspace)
  return workspace
}

async function mkdtemp(pathPrefix: string) {
  const { mkdtemp } = await import('fs/promises')
  return mkdtemp(pathPrefix)
}

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const app = {
    get: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`GET ${path}`, handler)
      return app
    },
    post: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`POST ${path}`, handler)
      return app
    },
  }
  return { app, handlers }
}

async function call(handler: any, req: any = {}) {
  const res: any = {
    statusCode: 200,
    body: null,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value
      return this
    },
    json(body: any) {
      this.body = body
      return this
    },
    send(body: any) {
      this.body = body
      return this
    },
  }
  await handler({ params: {}, query: {}, body: {}, ...req }, res)
  return res
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('StudioHome manga compatibility routes', () => {
  test('registers the /api/manga routes used by StudioHome', async () => {
    const { registerMangaCompatRoutes } = await import('./manga-compat')
    const { app, handlers } = createRouteHarness()
    registerMangaCompatRoutes(app as any, () => '/tmp/workspace', () => {})

    expect(handlers.has('GET /api/manga/status')).toBe(true)
    expect(handlers.has('GET /api/manga/workspaces')).toBe(true)
    expect(handlers.has('POST /api/manga/workspace')).toBe(true)
    expect(handlers.has('POST /api/manga/init')).toBe(true)
    expect(handlers.has('POST /api/manga/plot')).toBe(true)
    expect(handlers.has('POST /api/manga/storyboard')).toBe(true)
    expect(handlers.has('POST /api/manga/promptpack')).toBe(true)
    expect(handlers.has('POST /api/manga/export')).toBe(true)
    expect(handlers.has('GET /api/manga/file')).toBe(true)
    expect(handlers.has('GET /api/manga/download')).toBe(true)
    expect(handlers.has('GET /api/manga/bundle')).toBe(true)
  })

  test('returns StudioHome status from the current story project files', async () => {
    const workspace = await tempWorkspace()
    const episodesDir = join(workspace, '.story-project', 'episodes')
    await mkdir(episodesDir, { recursive: true })
    await writeFile(join(episodesDir, 'ep-1.script.md'), '# script')
    await writeFile(join(episodesDir, 'ep-1.storyboard.json'), '{}')
    await writeFile(join(episodesDir, 'ep-1.prompts.json'), '{}')
    await writeFile(join(episodesDir, 'ep-1.export.json'), '{}')
    await writeFile(join(episodesDir, 'ep-1.export.md'), '# export')
    await writeFile(join(episodesDir, 'ep-1.export.csv'), 'shot')
    await writeFile(join(episodesDir, 'ep-1.export.zip'), 'zip')

    const { registerMangaCompatRoutes } = await import('./manga-compat')
    const { app, handlers } = createRouteHarness()
    registerMangaCompatRoutes(app as any, () => workspace, () => {})

    const response = await call(handlers.get('GET /api/manga/status'))

    expect(response.statusCode).toBe(200)
    expect(response.body.workspace).toBe(workspace)
    expect(response.body.episodes).toEqual(['ep-1'])
    expect(response.body.storyFiles).toContain(join(episodesDir, 'ep-1.storyboard.json'))
    expect(response.body.episodeStatus).toEqual([{
      episodeId: 'ep-1',
      plot: true,
      storyboard: true,
      promptpack: true,
      exportJson: true,
      exportMd: true,
      exportCsv: true,
      exportZip: true,
      releaseReady: true,
    }])
  })

  test('dispatches StudioHome pipeline actions through existing pipeline functions', async () => {
    const calls: Array<{ step: string; workspace: string; payload?: any }> = []
    const { registerMangaCompatRoutes } = await import('./manga-compat')
    const { app, handlers } = createRouteHarness()
    registerMangaCompatRoutes(app as any, () => '/tmp/workspace', () => {}, {
      runInit: async workspace => {
        calls.push({ step: 'init', workspace })
        return { initialized: true }
      },
      runPlot: async (workspace, payload) => {
        calls.push({ step: 'plot', workspace, payload })
        return { plotted: true }
      },
      runStoryboard: async (workspace, payload) => {
        calls.push({ step: 'storyboard', workspace, payload })
        return { storyboard: true }
      },
      runPromptPack: async (workspace, payload) => {
        calls.push({ step: 'promptpack', workspace, payload })
        return { prompts: true }
      },
      runExport: async (workspace, payload) => {
        calls.push({ step: 'export', workspace, payload })
        return { exported: true }
      },
    })

    const plot = await call(handlers.get('POST /api/manga/plot'), { body: { episodeId: 'ep-1' } })
    const storyboard = await call(handlers.get('POST /api/manga/storyboard'), { body: { episodeId: 'ep-1' } })

    expect(plot.body.result).toEqual({ plotted: true })
    expect(typeof plot.body.durationMs).toBe('number')
    expect(storyboard.body.result).toEqual({ storyboard: true })
    expect(calls).toEqual([
      { step: 'plot', workspace: '/tmp/workspace', payload: { episodeId: 'ep-1' } },
      { step: 'storyboard', workspace: '/tmp/workspace', payload: { episodeId: 'ep-1' } },
    ])
  })

  test('previews workspace files for the legacy StudioHome file panel', async () => {
    const workspace = await tempWorkspace()
    const episodesDir = join(workspace, '.story-project', 'episodes')
    const scriptPath = join(episodesDir, 'ep-1.script.md')
    await mkdir(episodesDir, { recursive: true })
    await writeFile(scriptPath, '# Episode 1\n\nHello preview.')

    const { registerMangaCompatRoutes } = await import('./manga-compat')
    const { app, handlers } = createRouteHarness()
    registerMangaCompatRoutes(app as any, () => workspace, () => {})

    const response = await call(handlers.get('GET /api/manga/file'), { query: { path: scriptPath } })

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      path: scriptPath,
      content: '# Episode 1\n\nHello preview.',
    })
  })

  test('blocks legacy file preview paths outside the active workspace', async () => {
    const workspace = await tempWorkspace()
    const outsidePath = join(tmpdir(), 'mangaforge-outside-file.md')
    await writeFile(outsidePath, 'outside')

    const { registerMangaCompatRoutes } = await import('./manga-compat')
    const { app, handlers } = createRouteHarness()
    registerMangaCompatRoutes(app as any, () => workspace, () => {})

    const response = await call(handlers.get('GET /api/manga/file'), { query: { path: outsidePath } })

    expect(response.statusCode).toBe(403)
    expect(response.body.error).toContain('outside workspace')
  })

  test('downloads workspace files with attachment headers', async () => {
    const workspace = await tempWorkspace()
    const episodesDir = join(workspace, '.story-project', 'episodes')
    const exportPath = join(episodesDir, 'ep-1.export.csv')
    await mkdir(episodesDir, { recursive: true })
    await writeFile(exportPath, 'shot,prompt\n1,hello\n')

    const { registerMangaCompatRoutes } = await import('./manga-compat')
    const { app, handlers } = createRouteHarness()
    registerMangaCompatRoutes(app as any, () => workspace, () => {})

    const response = await call(handlers.get('GET /api/manga/download'), { query: { path: exportPath } })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-disposition']).toBe('attachment; filename="ep-1.export.csv"')
    expect(response.headers['content-type']).toBe('text/csv; charset=utf-8')
    expect(String(response.body)).toBe('shot,prompt\n1,hello\n')
  })

  test('downloads episode export bundle from story project episodes', async () => {
    const workspace = await tempWorkspace()
    const episodesDir = join(workspace, '.story-project', 'episodes')
    await mkdir(episodesDir, { recursive: true })
    await writeFile(join(episodesDir, 'ep-1.export.zip'), 'zip bytes')

    const { registerMangaCompatRoutes } = await import('./manga-compat')
    const { app, handlers } = createRouteHarness()
    registerMangaCompatRoutes(app as any, () => workspace, () => {})

    const response = await call(handlers.get('GET /api/manga/bundle'), { query: { episodeId: 'ep-1' } })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-disposition']).toBe('attachment; filename="ep-1.export.zip"')
    expect(response.headers['content-type']).toBe('application/zip')
    expect(String(response.body)).toBe('zip bytes')
  })
})
