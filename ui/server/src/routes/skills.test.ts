import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { SkillManifest } from '../skills/types'
import { createPromptCompiler, SkillCompilerError } from '../skills/compiler'
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

async function installLockedPromptSkillRevision(workspace: string, revision: string) {
  const root = join(workspace, '.mangaforge', 'skill-packs', 'locked-pack', revision)
  const skillRoot = join(root, 'skills', 'locked-skill')
  await mkdir(skillRoot, { recursive: true })
  await writeFile(join(root, 'pack.json'), JSON.stringify({
    id: 'locked-pack',
    sourceUrl: 'https://github.com/example/locked-pack',
    revision,
    installedAt: '2026-08-09T00:00:00.000Z',
    status: 'installed',
  }))
  await writeFile(join(skillRoot, 'SKILL.md'), `---
name: locked-skill
description: Compile a locked image prompt revision.
media_modes: [text_to_image]
---
Return only a compiled visual prompt for an image. Revision ${revision}.
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

  test('pins duplicate installed revisions through preview compilation while unpinned requests stay ambiguous', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-skills-route-'))
    workspaces.push(workspace)
    await installLockedPromptSkillRevision(workspace, 'rev-a')
    await installLockedPromptSkillRevision(workspace, 'rev-b')
    const registry = createSkillRegistry(workspace)
    const registryQueries: any[] = []
    const compileInputs: any[] = []
    let resolvedRevision = ''
    let compilerExecutions = 0
    const compiler = createPromptCompiler({
      registry: {
        resolve: async (query: any) => {
          registryQueries.push(query)
          const resolved = await registry.resolve(query)
          resolvedRevision = resolved.revision
          return resolved
        },
      } as any,
      readModels: async () => [{ id: 7, model_name: 'compiler', provider: 'fixture', display_name: 'Compiler', capabilities: { chat: true } } as any],
      executeWithRuntimeModel: async () => {
        compilerExecutions += 1
        return { content: JSON.stringify({
          skill_name: 'locked-skill',
          skill_version: resolvedRevision,
          mode: 'text_to_image',
          prompt: `compiled ${resolvedRevision}`,
          negative_prompt: '',
          parameters: {},
          references_used: [],
          warnings: [],
        }) }
      },
    })
    const { registerSkillRoutes } = await import('./skills')
    const { app, handlers } = createRouteHarness()
    registerSkillRoutes(app as any, () => workspace, {
      getRegistry: async () => registry,
      compilePromptSkill: async input => {
        compileInputs.push(input)
        return compiler(input)
      },
    })
    const baseBody = {
      skill_name: 'locked-skill',
      pack_id: 'locked-pack',
      raw_prompt: 'same editable prompt',
      mode: 'text_to_image',
      compiler_model_id: 7,
    }

    const revB = await call(handlers.get('POST /api/skills/compile-preview')!, { body: { ...baseBody, skill_revision: 'rev-b' } })
    const revA = await call(handlers.get('POST /api/skills/compile-preview')!, { body: { ...baseBody, skillRevision: 'rev-a' } })
    const ambiguous = await call(handlers.get('POST /api/skills/compile-preview')!, { body: baseBody })

    expect(revB.statusCode).toBe(200)
    expect(revB.body.result).toMatchObject({ skill_name: 'locked-skill', skill_version: 'rev-b', prompt: 'compiled rev-b' })
    expect(revA.statusCode).toBe(200)
    expect(revA.body.result).toMatchObject({ skill_name: 'locked-skill', skill_version: 'rev-a', prompt: 'compiled rev-a' })
    expect(revA.body.cache_key).not.toBe(revB.body.cache_key)
    expect(ambiguous.statusCode).toBe(409)
    expect(ambiguous.body).toMatchObject({ error_code: 'SKILL_AMBIGUOUS' })
    expect(compileInputs.map(input => input.revision)).toEqual(['rev-b', 'rev-a', undefined])
    expect(registryQueries.map(query => query.revision)).toEqual(['rev-b', 'rev-a', undefined])
    expect(compilerExecutions).toBe(2)
  })

  test('rejects malformed preview revision aliases before compilation', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-skills-route-'))
    workspaces.push(workspace)
    const { registerSkillRoutes } = await import('./skills')
    const { app, handlers } = createRouteHarness()
    let compileCalls = 0
    registerSkillRoutes(app as any, () => workspace, {
      compilePromptSkill: async input => {
        compileCalls += 1
        return { result: { skill_name: 'prompt-skill', skill_version: 'abc123', mode: input.mode, prompt: 'compiled', negative_prompt: '', parameters: {}, references_used: [], warnings: [] }, inputHash: 'hash-1', cached: false, compilerModelId: 4, skill: manifest() }
      },
    })
    const baseBody = { skill_name: 'prompt-skill', raw_prompt: 'make a shot', mode: 'image_to_video', compiler_model_id: 4 }

    for (const revisionFields of [{ skill_revision: 7 }, { skillRevision: { arbitrary: true } }, { skill_revision: '   ' }]) {
      const response = await call(handlers.get('POST /api/skills/compile-preview')!, { body: { ...baseBody, ...revisionFields } })
      expect(response.statusCode).toBe(400)
      expect(response.body).toMatchObject({ error_code: 'SKILL_REQUEST_INVALID' })
    }
    expect(compileCalls).toBe(0)
  })

  test('preserves ordered reference metadata through preview compilation while legacy assets keep defaults', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-skills-route-'))
    workspaces.push(workspace)
    const compileInputs: any[] = []
    const executeCalls: any[] = []
    const h3Skill = manifest({
      directoryName: 'h3-prompt-writing',
      name: 'h3-prompt-writing',
      mediaModes: ['image_to_video'],
      rootDir: workspace,
      references: [],
    })
    const compiler = createPromptCompiler({
      registry: { resolve: async () => h3Skill } as any,
      readModels: async () => [{
        id: 4,
        model_name: 'fixture-compiler',
        provider: 'fixture',
        display_name: 'Fixture Compiler',
        capabilities: { chat: true, vision: true },
      } as any],
      executeWithRuntimeModel: async (_workspace, request) => {
        executeCalls.push(request)
        return {
          content: JSON.stringify({
            skill_name: h3Skill.name,
            skill_version: h3Skill.revision,
            mode: 'FL2VA',
            prompt: 'compiled',
            negative_prompt: '',
            parameters: {},
            references_used: [],
            warnings: [],
          }),
        }
      },
    })
    const { registerSkillRoutes } = await import('./skills')
    const { app, handlers } = createRouteHarness()
    registerSkillRoutes(app as any, () => workspace, {
      compilePromptSkill: async input => {
        compileInputs.push(input)
        return compiler(input)
      },
    })
    const sharedUrl = '/api/assets/media/shared-reference.png'

    const response = await call(handlers.get('POST /api/skills/compile-preview')!, {
      body: {
        skill_name: h3Skill.name,
        prompt: 'move cleanly from the opening frame to the closing frame',
        mode: 'image_to_video',
        compiler_model_id: 4,
        assets: [
          {
            type: 'image',
            url: sharedUrl,
            source_asset_ids: [101],
            reference_index: 1,
            reference_id: 'hero-first',
            reference_role: 'first_frame',
            ignored_transport_key: 'do-not-forward',
          },
          {
            type: 'image',
            url: sharedUrl,
            source_asset_ids: [102],
            reference_index: 2,
            reference_id: 'hero-last',
            reference_role: 'last_frame',
            ignored_transport_key: 'do-not-forward',
          },
        ],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.result.reference_mode_hint).toBe('FL2VA')
    expect(response.body.result.reference_bindings).toEqual([
      { type: 'image', url: sharedUrl, source_asset_ids: [101], reference_index: 1, reference_id: 'hero-first', reference_role: 'first_frame' },
      { type: 'image', url: sharedUrl, source_asset_ids: [102], reference_index: 2, reference_id: 'hero-last', reference_role: 'last_frame' },
    ])
    expect(compileInputs[0].incomingAssets).toEqual([
      { type: 'image', url: sharedUrl, source_asset_ids: [101], reference_index: 1, reference_id: 'hero-first', reference_role: 'first_frame' },
      { type: 'image', url: sharedUrl, source_asset_ids: [102], reference_index: 2, reference_id: 'hero-last', reference_role: 'last_frame' },
    ])

    const legacy = await call(handlers.get('POST /api/skills/compile-preview')!, {
      body: {
        skill_name: h3Skill.name,
        prompt: 'legacy multi-reference request',
        mode: 'image_to_video',
        compiler_model_id: 4,
        assets: [
          { type: 'image', url: sharedUrl, source_asset_ids: [201] },
          { type: 'image', url: sharedUrl, source_asset_ids: [202] },
        ],
      },
    })

    expect(legacy.statusCode).toBe(200)
    expect(legacy.body.result.reference_mode_hint).toBe('Ref2VA')
    expect(legacy.body.result.reference_bindings).toEqual([
      { type: 'image', url: sharedUrl, source_asset_ids: [201], reference_index: 1, reference_id: 'reference-1', reference_role: 'general' },
      { type: 'image', url: sharedUrl, source_asset_ids: [202], reference_index: 2, reference_id: 'reference-2', reference_role: 'general' },
    ])

    const invalid = await call(handlers.get('POST /api/skills/compile-preview')!, {
      body: {
        skill_name: h3Skill.name,
        prompt: 'invalid role request',
        mode: 'image_to_video',
        compiler_model_id: 4,
        assets: [{ type: 'image', url: sharedUrl, reference_role: 'not-a-canvas-role' }],
      },
    })
    const excessive = await call(handlers.get('POST /api/skills/compile-preview')!, {
      body: {
        skill_name: h3Skill.name,
        prompt: 'too many references',
        mode: 'image_to_video',
        compiler_model_id: 4,
        assets: Array.from({ length: 10 }, (_, index) => ({
          type: 'image',
          url: sharedUrl,
          reference_id: `reference-${index + 1}`,
        })),
      },
    })
    expect([invalid.statusCode, excessive.statusCode]).toEqual([422, 422])
    expect(invalid.body).toMatchObject({
      error_code: 'REFERENCE_ROLE_INVALID',
      detail: 'Reference 1 has an invalid reference role',
    })
    expect(excessive.body).toMatchObject({
      error_code: 'REFERENCE_LIMIT_EXCEEDED',
      detail: 'Canvas references may contain at most 9 images',
    })
    expect(executeCalls).toHaveLength(2)
  })

  test('routes reserved audio and video references through shared validation before model execution', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-skills-route-'))
    workspaces.push(workspace)
    const compileInputs: any[] = []
    const modelExecutions: any[] = []
    const compiler = createPromptCompiler({
      registry: { resolve: async () => manifest() } as any,
      readModels: async () => [{
        id: 4,
        model_name: 'fixture-compiler',
        provider: 'fixture',
        display_name: 'Fixture Compiler',
        capabilities: { chat: true, vision: true },
      } as any],
      executeWithRuntimeModel: async (...args) => {
        modelExecutions.push(args)
        throw new Error('reserved media must fail before compiler model execution')
      },
    })
    const { registerSkillRoutes } = await import('./skills')
    const { app, handlers } = createRouteHarness()
    registerSkillRoutes(app as any, () => workspace, {
      compilePromptSkill: async input => {
        compileInputs.push(input)
        return compiler(input)
      },
    })

    const cases = [
      { payloadKey: 'incoming_assets', type: 'audio', url: 'https://example.com/reference.wav' },
      { payloadKey: 'incoming_assets', type: 'video', url: 'https://example.com/reference.mp4' },
      { payloadKey: 'assets', type: 'audio', url: '/api/assets/media/reference.wav' },
      { payloadKey: 'assets', type: 'video', url: '/api/files/reference.mp4' },
    ] as const
    const expectedAssets: any[] = []
    const responses: Array<{ response: any; type: 'audio' | 'video' }> = []

    for (const [index, reservedCase] of cases.entries()) {
      const asset = {
        type: reservedCase.type,
        url: reservedCase.url,
        source_asset_ids: [index + 101],
        reference_index: index + 11,
        reference_id: `reserved-${reservedCase.payloadKey}-${reservedCase.type}`,
        reference_role: index % 2 === 0 ? 'scene' : 'style',
        ignored_transport_key: 'do-not-forward',
      }
      expectedAssets.push({
        type: asset.type,
        url: asset.url,
        source_asset_ids: asset.source_asset_ids,
        reference_index: asset.reference_index,
        reference_id: asset.reference_id,
        reference_role: asset.reference_role,
      })
      const response = await call(handlers.get('POST /api/skills/compile-preview')!, {
        body: {
          skill_name: 'prompt-skill',
          prompt: `compile ${reservedCase.type} reference`,
          mode: 'image_to_video',
          compiler_model_id: 4,
          [reservedCase.payloadKey]: [asset],
        },
      })
      responses.push({ response, type: reservedCase.type })
    }

    expect(responses.map(({ response }) => response.statusCode)).toEqual([422, 422, 422, 422])
    for (const { response, type } of responses) {
      expect(response.body).toMatchObject({
        error_code: 'REFERENCE_MEDIA_UNSUPPORTED',
        detail: `Reference media type ${type} is not executable yet`,
      })
    }

    expect(compileInputs.map(input => input.incomingAssets[0])).toEqual(expectedAssets)
    expect(modelExecutions).toHaveLength(0)
  })

  test('keeps unknown preview reference types as malformed requests', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-skills-route-'))
    workspaces.push(workspace)
    const { registerSkillRoutes } = await import('./skills')
    const { app, handlers } = createRouteHarness()
    let compilerCalls = 0
    registerSkillRoutes(app as any, () => workspace, {
      compilePromptSkill: async input => {
        compilerCalls += 1
        return { result: { skill_name: 'prompt-skill', skill_version: 'abc123', mode: input.mode, prompt: 'unexpected', negative_prompt: '', parameters: {}, references_used: [], warnings: [] }, inputHash: 'unexpected', cached: false, compilerModelId: 4, skill: manifest() }
      },
    })

    const response = await call(handlers.get('POST /api/skills/compile-preview')!, {
      body: {
        skill_name: 'prompt-skill',
        prompt: 'compile unknown reference',
        mode: 'image_to_video',
        compiler_model_id: 4,
        incoming_assets: [{ type: 'document', url: 'https://example.com/reference.pdf' }],
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.body).toMatchObject({ error_code: 'SKILL_REQUEST_INVALID' })
    expect(response.body.detail).toContain('assets[0].type')
    expect(compilerCalls).toBe(0)
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

    registerSkillRoutes(app as any, () => workspace, {
      getRegistry: async () => ({ list: async () => [], invalidate() {} }),
      compilePromptSkill: async () => {
        throw Object.assign(new Error('reference runtime failure'), { code: 'REFERENCE_RUNTIME_FAILURE' })
      },
    })
    const internal = await call(handlers.get('POST /api/skills/compile-preview')!, { body: { skillName: 'prompt-skill', prompt: 'x', mode: 'image_to_video', compilerModelId: 4 } })
    expect(internal.statusCode).toBe(500)
    expect(internal.body).toMatchObject({ error_code: 'REFERENCE_RUNTIME_FAILURE', detail: 'reference runtime failure' })
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
