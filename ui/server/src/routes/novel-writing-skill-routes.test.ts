import { afterEach, describe, expect, test } from 'bun:test'
import JSZip from 'jszip'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { invalidateInstalledWritingSkillPackCache } from '../novel-writing/writing-skills/installed-store'
import { registerNovelWritingSkillRoutes } from './novel-writing-skill-routes'

const workspaces: string[] = []

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

function routeHarness() {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'put', 'post', 'delete']) {
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
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler(req, res)
  return res
}

const SHA = '0123456789abcdef0123456789abcdef01234567'

async function packArchive() {
  const zip = new JSZip()
  zip.file('My-Style-Pack-main/SKILL.md', '---\nname: 我的文风包\ndescription: 换文风\n---\n# My Style\n只改语气。')
  zip.file('My-Style-Pack-main/references/a.md', '参考甲')
  return zip.generateAsync({ type: 'uint8array' })
}

function githubFetch(archive: Uint8Array) {
  return async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/commits/HEAD')) {
      return new Response(JSON.stringify({ sha: SHA }), { status: 200 })
    }
    if (url === `https://codeload.github.com/acme/My-Style-Pack/zip/${SHA}`) return new Response(archive)
    return new Response('{}', { status: 404 })
  }
}

describe('novel writing skill routes', () => {
  test('catalog lists builtins first, then installed by installed_at; install and delete round-trip', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-routes-'))
    workspaces.push(workspace)
    invalidateInstalledWritingSkillPackCache()
    const { app, handlers } = routeHarness()
    registerNovelWritingSkillRoutes(app, {
      getWorkspace: () => workspace,
      fetchImpl: githubFetch(await packArchive()),
    })

    const empty = await callRoute(handlers.get('GET /api/novel/writing-skills/catalog'), {})
    expect(empty.statusCode).toBe(200)
    expect(empty.body.ok).toBe(true)
    expect(empty.body.skills.map((skill: any) => skill.id)).toEqual([
      'fiction-humanizer-zh',
      'remove-ai-flavor',
      'humanizer-zh',
    ])
    expect(empty.body.skills[0]).toMatchObject({ builtin: true, supports_mode: true })
    expect(empty.body.skills[2]).toMatchObject({ builtin: true, supports_mode: false })

    const installed = await callRoute(handlers.get('POST /api/novel/writing-skills/install'), {
      body: { url: 'https://github.com/acme/My-Style-Pack' },
    })
    expect(installed.statusCode).toBe(200)
    expect(installed.body.ok).toBe(true)
    expect(installed.body.skill).toMatchObject({
      id: 'my-style-pack',
      label: '我的文风包',
      builtin: false,
      supports_mode: false,
      revision: SHA,
      source_url: 'https://github.com/acme/My-Style-Pack',
    })

    const catalog = await callRoute(handlers.get('GET /api/novel/writing-skills/catalog'), {})
    expect(catalog.body.skills.map((skill: any) => skill.id)).toEqual([
      'fiction-humanizer-zh',
      'remove-ai-flavor',
      'humanizer-zh',
      'my-style-pack',
    ])

    const removed = await callRoute(handlers.get('DELETE /api/novel/writing-skills/:id'), {
      params: { id: 'my-style-pack' },
    })
    expect(removed.statusCode).toBe(200)
    expect(removed.body).toEqual({ ok: true })
    const after = await callRoute(handlers.get('GET /api/novel/writing-skills/catalog'), {})
    expect(after.body.skills).toHaveLength(3)
  })

  test('install maps error codes: INVALID_URL 400, DOWNLOAD_FAILED 502', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-routes-'))
    workspaces.push(workspace)
    invalidateInstalledWritingSkillPackCache()
    const { app, handlers } = routeHarness()
    registerNovelWritingSkillRoutes(app, {
      getWorkspace: () => workspace,
      fetchImpl: async () => new Response('{}', { status: 500 }),
    })
    const install = handlers.get('POST /api/novel/writing-skills/install')

    const invalid = await callRoute(install, { body: { url: 'https://gitlab.com/acme/demo' } })
    expect(invalid.statusCode).toBe(400)
    expect(invalid.body.error_code).toBe('INVALID_URL')

    const conflict = await callRoute(install, { body: { url: 'https://github.com/acme/fiction-humanizer-zh' } })
    expect(conflict.statusCode).toBe(400)
    expect(conflict.body.error_code).toBe('ID_CONFLICT_BUILTIN')

    const download = await callRoute(install, { body: { url: 'https://github.com/acme/My-Style-Pack' } })
    expect(download.statusCode).toBe(502)
    expect(download.body.error_code).toBe('DOWNLOAD_FAILED')
  })

  test('delete refuses builtins with 400 and missing packs with 404', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'wsk-routes-'))
    workspaces.push(workspace)
    invalidateInstalledWritingSkillPackCache()
    const { app, handlers } = routeHarness()
    registerNovelWritingSkillRoutes(app, { getWorkspace: () => workspace })
    const remove = handlers.get('DELETE /api/novel/writing-skills/:id')

    const builtin = await callRoute(remove, { params: { id: 'humanizer-zh' } })
    expect(builtin.statusCode).toBe(400)
    expect(builtin.body.error_code).toBe('BUILTIN_NOT_REMOVABLE')

    const missing = await callRoute(remove, { params: { id: 'never-here' } })
    expect(missing.statusCode).toBe(404)
    expect(missing.body.error_code).toBe('NOT_INSTALLED')
  })
})
