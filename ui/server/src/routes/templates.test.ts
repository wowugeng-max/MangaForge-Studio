import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { readFile, rm, writeFile } from 'fs/promises'
import { getTemplateStorePath } from '../workspace'
import { writeTemplates } from '../templates-store'

const templatePath = getTemplateStorePath()
let originalTemplateFile: string | null = null

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
    put: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`PUT ${path}`, handler)
      return app
    },
    delete: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`DELETE ${path}`, handler)
      return app
    },
  }
  return { app, handlers }
}

async function call(handler: any, req: any = {}) {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null,
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
    send(body?: any) {
      this.body = body ?? null
      return this
    },
  }
  await handler({ params: {}, query: {}, body: {}, ...req }, res)
  return res
}

beforeEach(async () => {
  try {
    originalTemplateFile = await readFile(templatePath, 'utf8')
  } catch {
    originalTemplateFile = null
  }
})

afterEach(async () => {
  if (originalTemplateFile === null) {
    await rm(templatePath, { force: true })
    return
  }
  await writeFile(templatePath, originalTemplateFile, 'utf8')
})

describe('manga template routes', () => {
  test('registers template delete, export, and import routes', async () => {
    const { registerTemplateRoutes } = await import('./templates')
    const { app, handlers } = createRouteHarness()
    registerTemplateRoutes(app as any)

    expect(handlers.has('DELETE /manga/templates/:name')).toBe(true)
    expect(handlers.has('GET /manga/templates/export')).toBe(true)
    expect(handlers.has('POST /manga/templates/import')).toBe(true)
  })

  test('registers /api/manga template aliases used by StudioHome', async () => {
    const { registerTemplateRoutes } = await import('./templates')
    const { app, handlers } = createRouteHarness()
    registerTemplateRoutes(app as any)

    expect(handlers.has('GET /api/manga/templates')).toBe(true)
    expect(handlers.has('POST /api/manga/templates')).toBe(true)
    expect(handlers.has('PUT /api/manga/templates')).toBe(true)
    expect(handlers.has('DELETE /api/manga/templates/:name')).toBe(true)
    expect(handlers.has('GET /api/manga/templates/export')).toBe(true)
    expect(handlers.has('POST /api/manga/templates/import')).toBe(true)
  })

  test('deletes a saved template by name', async () => {
    await writeTemplates([
      { name: 'kept', episodeId: 'ep-1', title: 'Keep', premise: 'Keep premise', panelTarget: 8, stylePreset: 'style', consistencyLevel: 'high', beatFramework: 'three-act' },
      { name: 'remove-me', episodeId: 'ep-2', title: 'Remove', premise: 'Remove premise', panelTarget: 12, stylePreset: 'style', consistencyLevel: 'medium', beatFramework: 'five-act' },
    ])

    const { registerTemplateRoutes } = await import('./templates')
    const { app, handlers } = createRouteHarness()
    registerTemplateRoutes(app as any)

    const response = await call(handlers.get('DELETE /manga/templates/:name'), {
      params: { name: 'remove-me' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.ok).toBe(true)
    expect(response.body.templates.map((item: any) => item.name)).toEqual(['kept'])
  })

  test('exports and imports templates in the JSON shape expected by StudioHome', async () => {
    await writeTemplates([
      { name: 'old', episodeId: 'ep-old', title: 'Old', premise: 'Old premise', panelTarget: 6, stylePreset: 'old-style', consistencyLevel: 'low', beatFramework: 'three-act' },
    ])

    const { registerTemplateRoutes } = await import('./templates')
    const { app, handlers } = createRouteHarness()
    registerTemplateRoutes(app as any)

    const importedTemplate = { name: 'fresh', episodeId: 'ep-9', title: 'Fresh', premise: 'Fresh premise', panelTarget: 10, stylePreset: 'fresh-style', consistencyLevel: 'high', beatFramework: 'five-act' }
    const imported = await call(handlers.get('POST /manga/templates/import'), {
      body: { templates: [importedTemplate] },
    })

    expect(imported.statusCode).toBe(200)
    expect(imported.body).toMatchObject({ ok: true, imported: 1 })
    expect(imported.body.templates.map((item: any) => item.name)).toEqual(['fresh', 'old'])

    const exported = await call(handlers.get('GET /manga/templates/export'))
    expect(exported.headers['content-type']).toBe('application/json; charset=utf-8')
    expect(exported.headers['content-disposition']).toContain('mangaforge-templates.json')
    expect(JSON.parse(exported.body)).toEqual({
      templates: [
        importedTemplate,
        { name: 'old', episodeId: 'ep-old', title: 'Old', premise: 'Old premise', panelTarget: 6, stylePreset: 'old-style', consistencyLevel: 'low', beatFramework: 'three-act' },
      ],
    })
  })
})
