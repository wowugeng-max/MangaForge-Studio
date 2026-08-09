import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { SkillManifest } from '../skills/types'
import { SkillCompilerError } from '../skills/compiler'
import { createSkillRegistry } from '../skills/registry'

type Handler = (req: any, res: any) => unknown

function createRouteHarness() {
  const handlers = new Map<string, Handler>()
  const app = {
    get(path: string, handler: Handler) { handlers.set(`GET ${path}`, handler); return app },
    post(path: string, handler: Handler) { handlers.set(`POST ${path}`, handler); return app },
    put(path: string, handler: Handler) { handlers.set(`PUT ${path}`, handler); return app },
  }
  return { app, handlers }
}

async function call(handler: Handler, request: Record<string, unknown> = {}) {
  const response: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this },
    json(body: unknown) { this.body = body; return this },
  }
  await handler({ params: {}, query: {}, body: {}, ...request }, response)
  return response
}

function manifest(overrides: Partial<SkillManifest> = {}): SkillManifest {
  return {
    packId: 'h3',
    directoryName: 'prompt-skill',
    name: 'prompt-skill',
    description: 'A visual prompt compiler',
    whenToUse: 'Use for image prompts',
    arguments: [{ name: 'style', description: 'Style', default: 'cinematic' }],
    argumentHint: '[style]',
    userInvocable: true,
    triggerWords: ['prompt'],
    mediaModes: ['image_to_video'],
    compatibility: 'prompt_ready',
    compatibilityReason: undefined,
    revision: 'abc123',
    sourceUrl: 'https://github.com/example/h3',
    rootDir: '/private/secret/root',
    body: 'secret body must not be returned',
    references: ['guide.md'],
    displayName: 'Prompt Skill',
    shortDescription: 'Prompt helper',
    ...overrides,
  }
}

let workspaces: string[] = []

const WORKFLOW_FIXTURE_REVISION = 'c'.repeat(40)

async function installWorkflowOnlyFixturePack(workspace: string) {
  const root = join(workspace, '.mangaforge', 'skill-packs', 'MiniMax-H3', WORKFLOW_FIXTURE_REVISION)
  const skillRoot = join(root, 'skills', 'brand-promo-video-generator')
  await mkdir(skillRoot, { recursive: true })
  await writeFile(join(root, 'pack.json'), JSON.stringify({
    id: 'MiniMax-H3',
    sourceUrl: 'https://github.com/MiniMax-AI/MiniMax-H3',
    owner: 'MiniMax-AI',
    repo: 'MiniMax-H3',
    revision: WORKFLOW_FIXTURE_REVISION,
    installedAt: '2026-08-09T00:00:00.000Z',
    status: 'installed',
  }))
  await writeFile(join(skillRoot, 'SKILL.md'), `---
name: brand-promo-video-generator
description: Generate a polished brand promotional video through a staged Hub workflow.
allowed-tools:
  - webfetch
  - hub_generate_video
  - hub_video_edit
  - task
---
# Brand Promo Video Generator

Run a multi-stage workflow with tools: verify brand facts, plan shots, generate video, edit, and review delivery.
`)
}

afterEach(async () => {
  await Promise.all(workspaces.map(path => rm(path, { recursive: true, force: true })))
  workspaces = []
})

describe('canvas skill routes', () => {
  test('keeps workflow-only Hub Skills visible with a reason but excludes them from ready-only video results', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-skills-route-'))
    workspaces.push(workspace)
    await installWorkflowOnlyFixturePack(workspace)
    const { registerSkillRoutes } = await import('./skills')
    const { app, handlers } = createRouteHarness()
    registerSkillRoutes(app as any, () => workspace, {
      getRegistry: async () => createSkillRegistry(workspace),
      readSkillSettings: async () => ({ skill_compiler_model_id: null }),
    })

    const ordinary = await call(handlers.get('GET /api/skills')!, { query: { mode: 'text_to_video' } })
    const readyOnly = await call(handlers.get('GET /api/skills')!, { query: { mode: 'text_to_video', ready_only: 'true' } })
    const workflow = ordinary.body.skills.find((item: any) => item.name === 'brand-promo-video-generator')

    expect(ordinary.statusCode).toBe(200)
    expect(workflow).toMatchObject({
      packId: 'MiniMax-H3',
      compatibility: 'workflow_only',
      compatibilityReason: 'declares external tools',
      reason: 'declares external tools',
      mediaModes: ['text_to_video'],
    })
    expect(readyOnly.statusCode).toBe(200)
    expect(readyOnly.body.skills.some((item: any) => item.name === 'brand-promo-video-generator')).toBe(false)
  })

  test('lists safe Skill summaries and applies mode/ready_only filters', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-skills-route-'))
    workspaces.push(workspace)
    await import('./skills').then(({ registerSkillRoutes }) => {
      const { app, handlers } = createRouteHarness()
      const ready = manifest()
      const partial = manifest({ name: 'partial', compatibility: 'prompt_partial', mediaModes: ['text_to_image'] })
      registerSkillRoutes(app as any, () => workspace, {
        getRegistry: async () => ({ list: async () => [ready, partial], invalidate() {} }),
        getPacks: async () => [{ id: 'h3', sourceUrl: ready.sourceUrl, revision: ready.revision, status: 'installed', installedAt: '2026-01-01T00:00:00.000Z' }],
        readSkillSettings: async () => ({ skill_compiler_model_id: null }),
      })
      return call(handlers.get('GET /api/skills')!, { query: { mode: 'image_to_video', ready_only: 'true' } })
        .then(response => {
          expect(response.statusCode).toBe(200)
          expect(response.body.skills).toHaveLength(1)
          expect(response.body.skills[0]).toMatchObject({ packId: 'h3', name: 'prompt-skill', revision: 'abc123', whenToUse: 'Use for image prompts' })
          expect(response.body.skills[0].body).toBeUndefined()
          expect(response.body.skills[0].rootDir).toBeUndefined()
          expect(response.body.packs[0]).toMatchObject({ id: 'h3', revision: 'abc123' })
          expect(response.body.settings).toEqual({ skill_compiler_model_id: null })
        })
    })
  })

  test('does not expose local filesystem paths in Skill or Pack summaries', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-skills-route-'))
    workspaces.push(workspace)
    const { registerSkillRoutes } = await import('./skills')
    const { app, handlers } = createRouteHarness()
    const localSkill = manifest({ packId: 'local', sourceUrl: `file://${workspace}/.mangaforge/skills` })
    registerSkillRoutes(app as any, () => workspace, {
      getRegistry: async () => ({ list: async () => [localSkill], invalidate() {} }),
      getPacks: async () => [{ id: 'local', sourceUrl: `file://${workspace}/outside`, revision: 'local-hash', installedAt: '2026-01-01T00:00:00.000Z', status: 'installed' }],
      readSkillSettings: async () => ({ skill_compiler_model_id: null }),
    })
    const response = await call(handlers.get('GET /api/skills')!, { query: {} })
    expect(response.statusCode).toBe(200)
    expect(response.body.skills[0].sourceUrl).toBe('local://')
    expect(response.body.packs[0].sourceUrl).toBe('local://')
    expect(JSON.stringify(response.body)).not.toContain(workspace)
  })

  test('installs a GitHub Pack, invalidates the registry, and returns discovered summaries', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-skills-route-'))
    workspaces.push(workspace)
    let invalidated = 0
    const installed = { id: 'h3', sourceUrl: 'https://github.com/example/h3', revision: 'a'.repeat(40), installedAt: '2026-01-01T00:00:00.000Z', status: 'installed' as const, path: workspace }
    const { registerSkillRoutes } = await import('./skills')
    const { app, handlers } = createRouteHarness()
    registerSkillRoutes(app as any, () => workspace, {
      getRegistry: async () => ({ list: async () => [manifest({ revision: installed.revision })], invalidate() { invalidated += 1 } }),
      installGitHubSkillPack: async () => installed,
    })
    const response = await call(handlers.get('POST /api/skills/packs')!, { body: { url: installed.sourceUrl } })
    expect(response.statusCode).toBe(201)
    expect(invalidated).toBe(1)
    expect(response.body.record).toMatchObject({ id: 'h3', revision: installed.revision })
    expect(response.body.skills[0]).toMatchObject({ packId: 'h3', name: 'prompt-skill' })
    expect(response.body.skills[0].body).toBeUndefined()
  })

  test('rejects non-allow-listed local paths and malformed GitHub URLs', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-skills-route-'))
    workspaces.push(workspace)
    const { registerSkillRoutes } = await import('./skills')
    const { app, handlers } = createRouteHarness()
    registerSkillRoutes(app as any, () => workspace, { getRegistry: async () => ({ list: async () => [], invalidate() {} }) })
    const local = await call(handlers.get('POST /api/skills/packs')!, { body: { local_path: '/tmp/unsafe' } })
    expect(local.statusCode).toBe(400)
    const malformed = await call(handlers.get('POST /api/skills/packs')!, { body: { url: 'http://github.com/example/h3' } })
    expect(malformed.statusCode).toBe(400)
  })

  test('compiles a preview and exposes cache metadata', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-skills-route-'))
    workspaces.push(workspace)
    const compileCalls: any[] = []
    const { registerSkillRoutes } = await import('./skills')
    const { app, handlers } = createRouteHarness()
    registerSkillRoutes(app as any, () => workspace, {
      getRegistry: async () => ({ list: async () => [], invalidate() {} }),
      compilePromptSkill: async input => {
        compileCalls.push(input)
        return { result: { skill_name: 'prompt-skill', skill_version: 'abc123', mode: input.mode, prompt: 'compiled', negative_prompt: '', parameters: {}, references_used: [], warnings: [] }, inputHash: 'hash-1', cached: false, compilerModelId: 4, skill: manifest() }
      },
    })
    const response = await call(handlers.get('POST /api/skills/compile-preview')!, {
      body: { skill_name: 'prompt-skill', pack_id: 'h3', raw_prompt: 'make a shot', mode: 'image_to_video', incoming_assets: [{ type: 'prompt', content: 'hero' }], arguments: { style: 'anime' }, compiler_model_id: 4 },
    })
    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({ cache_key: 'hash-1', cached: false, result: { prompt: 'compiled' } })
    expect(compileCalls[0]).toMatchObject({ skillName: 'prompt-skill', packId: 'h3', rawPrompt: 'make a shot', mode: 'image_to_video', compilerModelId: 4, activeWorkspace: workspace })
    expect(compileCalls[0].incomingAssets).toEqual([{ type: 'prompt', content: 'hero' }])
  })

  test('restricts incoming asset URLs and bounds asset text', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-skills-route-'))
    workspaces.push(workspace)
    const { registerSkillRoutes } = await import('./skills')
    const { app, handlers } = createRouteHarness()
    let calls = 0
    registerSkillRoutes(app as any, () => workspace, {
      getRegistry: async () => ({ list: async () => [], invalidate() {} }),
      compilePromptSkill: async () => {
        calls += 1
        return { result: { skill_name: 'prompt-skill', skill_version: 'abc123', mode: 'vision', prompt: 'compiled', negative_prompt: '', parameters: {}, references_used: [], warnings: [] }, inputHash: 'hash-asset', cached: false, compilerModelId: 4, skill: manifest({ mediaModes: ['vision'] }) }
      },
    })

    const fileUrl = await call(handlers.get('POST /api/skills/compile-preview')!, {
      body: { skillName: 'prompt-skill', prompt: 'x', mode: 'vision', compilerModelId: 4, assets: [{ type: 'image', url: 'file:///etc/passwd' }] },
    })
    expect(fileUrl.statusCode).toBe(400)
    expect(fileUrl.body.error_code).toBe('SKILL_REQUEST_INVALID')

    const httpUrl = await call(handlers.get('POST /api/skills/compile-preview')!, {
      body: { skillName: 'prompt-skill', prompt: 'x', mode: 'vision', compilerModelId: 4, assets: [{ type: 'image', url: 'http://127.0.0.1:8080/private' }] },
    })
    expect(httpUrl.statusCode).toBe(400)

    const allowed = await call(handlers.get('POST /api/skills/compile-preview')!, {
      body: { skillName: 'prompt-skill', prompt: 'x', mode: 'vision', compilerModelId: 4, assets: [{ type: 'image', url: '/api/assets/media/reference.png' }] },
    })
    expect(allowed.statusCode).toBe(200)
    expect(calls).toBe(1)

    const oversized = await call(handlers.get('POST /api/skills/compile-preview')!, {
      body: { skillName: 'prompt-skill', prompt: 'x', mode: 'vision', compilerModelId: 4, assets: [{ type: 'prompt', content: 'x'.repeat(256 * 1024 + 1) }] },
    })
    expect(oversized.statusCode).toBe(400)
    expect(calls).toBe(1)
  })

  test('maps missing compiler model to a conflict and typed compiler failures to 422', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-skills-route-'))
    workspaces.push(workspace)
    const { registerSkillRoutes } = await import('./skills')
    const { app, handlers } = createRouteHarness()
    registerSkillRoutes(app as any, () => workspace, {
      getRegistry: async () => ({ list: async () => [], invalidate() {} }),
      compilePromptSkill: async () => { throw new SkillCompilerError('SKILL_COMPILER_MODEL_REQUIRED', 'model required') },
    })
    const response = await call(handlers.get('POST /api/skills/compile-preview')!, { body: { skillName: 'prompt-skill', prompt: 'x', mode: 'image_to_video' } })
    expect(response.statusCode).toBe(409)
    expect(response.body).toMatchObject({ error_code: 'SKILL_COMPILER_MODEL_REQUIRED' })

    registerSkillRoutes(app as any, () => workspace, {
      getRegistry: async () => ({ list: async () => [], invalidate() {} }),
      compilePromptSkill: async () => { throw new SkillCompilerError('SKILL_RESULT_INVALID', 'bad result') },
    })
    const invalid = await call(handlers.get('POST /api/skills/compile-preview')!, { body: { skillName: 'prompt-skill', prompt: 'x', mode: 'image_to_video', compilerModelId: 4 } })
    expect(invalid.statusCode).toBe(422)
    expect(invalid.body.error_code).toBe('SKILL_RESULT_INVALID')
  })

  test('reads and writes the only supported workspace Skill setting', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-skills-route-'))
    workspaces.push(workspace)
    let setting: { skill_compiler_model_id: number | null } = { skill_compiler_model_id: null }
    const { registerSkillRoutes } = await import('./skills')
    const { app, handlers } = createRouteHarness()
    registerSkillRoutes(app as any, () => workspace, {
      getRegistry: async () => ({ list: async () => [], invalidate() {} }),
      readSkillSettings: async () => setting,
      writeSkillSettings: async (_workspace, modelId) => (setting = { skill_compiler_model_id: modelId }),
    })
    const before = await call(handlers.get('GET /api/skills/settings')!)
    expect(before.body).toEqual({ skill_compiler_model_id: null })
    const updated = await call(handlers.get('PUT /api/skills/settings')!, { body: { skillCompilerModelId: 8 } })
    expect(updated.statusCode).toBe(200)
    expect(updated.body).toEqual({ skill_compiler_model_id: 8 })
    const invalid = await call(handlers.get('PUT /api/skills/settings')!, { body: { skill_compiler_model_id: '8' } })
    expect(invalid.statusCode).toBe(400)
  })
})
