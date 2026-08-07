import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createNovelChapter, createNovelProject, listNovelChapters } from '../novel'
import { chapterGenerationSourceFingerprint } from '../novel-writing-service/generation-source/source-config'
import { registerNovelChapterContextRoutes } from './novel-chapter-context-routes'

function mcpProjectFixture() {
  return {
    id: 5,
    title: '通用 MCP 材料测试',
    reference_config: {
      chapter_generation_source: {
        version: 'chapter_generation_source_v1',
        active: 'mcp',
        model: {},
        mcp: {
          server_id: 'generic-mcp-server',
          key_id: 7,
          adapter_id: 'generic-adapter',
          agent_id: 'generic-agent',
          model: '',
        },
      },
    },
  }
}

function readyContextFixture() {
  return {
    preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
    chapter_target: {
      chapter_no: 1,
      title: '第一章',
      goal: '找出灰塔的校时规律',
      summary: '主角进入灰塔。',
      conflict: '灰塔正在吞掉时间。',
      ending_hook: '塔钟开始倒转。',
      scene_cards: [{ goal: '进入灰塔' }, { goal: '发现异常' }, { goal: '逃离停摆' }],
    },
    story_state: { characters: [{ name: '林砚' }] },
    writing_bible: { promise: '时间谜案' },
  }
}

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const register = (method: string, path: string, handler: any) => {
    handlers.set(`${method} ${path}`, handler)
  }
  return {
    app: {
      get: (path: string, handler: any) => register('GET', path, handler),
      post: (path: string, handler: any) => register('POST', path, handler),
      put: (path: string, handler: any) => register('PUT', path, handler),
    },
    handlers,
  }
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

describe('novel chapter context repair', () => {
  test('builds a usable fallback character when model repair returns no character cards', async () => {
    const routes = await import('./novel-chapter-context-routes')
    const buildFallbackGeneratedCharacters = (routes as any).buildFallbackGeneratedCharacters

    expect(typeof buildFallbackGeneratedCharacters).toBe('function')

    const characters = buildFallbackGeneratedCharacters(
      { title: '九婴焚世', genre: '玄幻', synopsis: '丁松言进入一个以山海异兽为武学源头的大荒世界。' },
      {
        chapter_no: 1,
        title: '异象初临',
        chapter_goal: '让主角完成穿越后的环境重构认知。',
        chapter_summary: '丁松言穿越至丁家旁系弟子身上，首次确认世界规则。',
        conflict: '现实世界秩序与原身记忆冲突。',
        ending_hook: '门外传来不属于人的低语。',
      },
      { story_state: { global: {} } },
    )

    expect(characters.length).toBeGreaterThan(0)
    expect(characters[0].name).toBe('丁松言')
    expect(characters[0].role_type).toBe('protagonist')
    expect(characters[0].current_state).toMatchObject({
      location: '第1章《异象初临》开场',
      last_seen_chapter: 1,
    })
  })

  test('confirm returns the persisted pre-draft brief and persisted confirmation truth', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-pre-draft-confirm-'))
    try {
      const project = await createNovelProject(workspace, { title: '写前确认真值测试' })
      const chapter = await createNovelChapter(workspace, {
        project_id: project.id,
        chapter_no: 1,
        title: '第一章',
      })
      const oversizedContracts = Object.fromEntries(
        Array.from({ length: 44 }, (_, index) => [
          `extended_${index}_contract`,
          { rules: `第 ${index + 1} 份合同必须保留摘要。`.repeat(200) },
        ]),
      )
      const { app, handlers } = createRouteHarness()
      registerNovelChapterContextRoutes(app as any, {
        getWorkspace: () => workspace,
        getProject: async () => project,
        buildChapterContextPackage: async () => ({
          preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
          chapter_target: { chapter_no: 1, title: '第一章' },
        }),
        repairChapterMaterials: async () => {
          throw new Error('model project must not dispatch MCP material repair')
        },
      })
      const confirm = handlers.get('POST /api/novel/chapters/:chapterId/pre-draft-brief/confirm')

      const response = await callRoute(confirm, {
        params: { chapterId: String(chapter.id) },
        query: {},
        body: {
          project_id: project.id,
          brief: {
            ...oversizedContracts,
            confirmation_source: 'manual_author_confirmation',
          },
        },
      })
      const [storedChapter] = await listNovelChapters(workspace, project.id)
      const storedBrief = storedChapter.raw_payload.pre_draft_brief

      expect(response.statusCode).toBe(200)
      expect(response.body.brief).toEqual(storedBrief)
      expect(response.body.confirmed).toBe(Boolean(storedBrief.confirmed_at))
      expect(storedBrief.confirmed_at).toBeTruthy()
      expect(storedBrief.confirmation_source).toBe('manual_author_confirmation')
      expect(storedBrief.updated_at).toBeTruthy()
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })

  test('dispatches an MCP project without model_id before loading any model material path', async () => {
    const repairCalls: any[] = []
    let modelContextCalls = 0
    const resultContext = readyContextFixture()
    const { app, handlers } = createRouteHarness()
    registerNovelChapterContextRoutes(app as any, {
      getWorkspace: () => 'workspace',
      getProject: async () => mcpProjectFixture(),
      buildChapterContextPackage: async () => {
        modelContextCalls += 1
        throw new Error('MCP route must not load model material context')
      },
      repairChapterMaterials: async input => {
        repairCalls.push(input)
        return {
          ok: true,
          skipped: false,
          source: 'mcp',
          applied: [{ type: 'worldbuilding_created' }],
          context_package: resultContext,
          preflight: resultContext.preflight,
        }
      },
    })

    const response = await callRoute(
      handlers.get('POST /api/novel/chapters/:chapterId/auto-repair-context'),
      {
        params: { chapterId: '9' },
        query: {},
        body: {
          project_id: 5,
          generation_source_override: 'model',
          source: 'model',
        },
      },
    )

    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({
      ok: true,
      skipped: false,
      source: 'mcp',
      preflight: { ready: true, strict_ready: true },
      context_package: resultContext,
      material_score: { can_generate: true },
    })
    expect(repairCalls).toEqual([{
      activeWorkspace: 'workspace',
      projectId: 5,
      chapterId: 9,
      expectedAuthorityFingerprint: chapterGenerationSourceFingerprint(
        mcpProjectFixture().reference_config.chapter_generation_source as any,
      ),
      repairKeys: undefined,
    }])
    expect(modelContextCalls).toBe(0)
  })

  test('normalizes only array repair_keys with trim dedupe and bounded input', async () => {
    const repairCalls: any[] = []
    const { app, handlers } = createRouteHarness()
    registerNovelChapterContextRoutes(app as any, {
      getWorkspace: () => 'workspace',
      getProject: async () => mcpProjectFixture(),
      buildChapterContextPackage: async () => readyContextFixture(),
      repairChapterMaterials: async input => {
        repairCalls.push(input)
        return { ok: true, skipped: true, source: 'mcp', context_package: readyContextFixture(), preflight: readyContextFixture().preflight }
      },
    })
    const handler = handlers.get('POST /api/novel/chapters/:chapterId/auto-repair-context')

    const boundedKeys = [
      ' characters ',
      'characters',
      '',
      ' worldbuilding ',
      ` ${'x'.repeat(240)} `,
      ...Array.from({ length: 80 }, (_, index) => `repair_key_${index}`),
    ]
    const arrayResponse = await callRoute(handler, {
      params: { chapterId: '9' },
      query: {},
      body: { project_id: 5, repair_keys: boundedKeys },
    })
    const nonArrayResponse = await callRoute(handler, {
      params: { chapterId: '9' },
      query: {},
      body: { project_id: 5, repair_keys: 'characters' },
    })

    expect(arrayResponse.statusCode).toBe(200)
    expect(nonArrayResponse.statusCode).toBe(200)
    expect(repairCalls[0].repairKeys.slice(0, 2)).toEqual(['characters', 'worldbuilding'])
    expect(repairCalls[0].repairKeys.length).toBeLessThanOrEqual(64)
    expect(repairCalls[0].repairKeys.every((key: string) => key.length <= 160)).toBe(true)
    expect(repairCalls[1].repairKeys).toBeUndefined()
  })

  test('reads repair_keys only from plain arrays and own string data elements', async () => {
    const repairCalls: any[] = []
    let accessorCalls = 0
    let objectConversions = 0
    let proxyTrapCalls = 0
    const { app, handlers } = createRouteHarness()
    registerNovelChapterContextRoutes(app as any, {
      getWorkspace: () => 'workspace',
      getProject: async () => mcpProjectFixture(),
      buildChapterContextPackage: async () => readyContextFixture(),
      repairChapterMaterials: async input => {
        repairCalls.push(input)
        return { ok: true, skipped: true, source: 'mcp', context_package: readyContextFixture(), preflight: readyContextFixture().preflight }
      },
    })
    const handler = handlers.get('POST /api/novel/chapters/:chapterId/auto-repair-context')

    const hostileElements: any[] = [' characters ', 'ignored accessor', {
      toString() {
        objectConversions += 1
        return 'worldbuilding'
      },
    }]
    Object.defineProperty(hostileElements, '1', {
      configurable: true,
      enumerable: true,
      get() {
        accessorCalls += 1
        throw new Error('repair_keys element getter must not run')
      },
    })
    const proxiedArray = new Proxy(['characters'], {
      get() {
        proxyTrapCalls += 1
        throw new Error('repair_keys proxy trap must not run')
      },
      getOwnPropertyDescriptor() {
        proxyTrapCalls += 1
        throw new Error('repair_keys proxy descriptor trap must not run')
      },
    })
    const revoked = Proxy.revocable(['characters'], {})
    revoked.revoke()
    const accessorBody: any = { project_id: 5 }
    Object.defineProperty(accessorBody, 'repair_keys', {
      configurable: true,
      enumerable: true,
      get() {
        accessorCalls += 1
        throw new Error('repair_keys body getter must not run')
      },
    })

    const responses = []
    for (const body of [
      { project_id: 5, repair_keys: hostileElements },
      { project_id: 5, repair_keys: proxiedArray },
      { project_id: 5, repair_keys: revoked.proxy },
      accessorBody,
    ]) {
      responses.push(await callRoute(handler, { params: { chapterId: '9' }, query: {}, body }))
    }

    expect(responses.map(response => response.statusCode)).toEqual([200, 200, 200, 200])
    expect(repairCalls.map(call => call.repairKeys)).toEqual([
      ['characters'],
      undefined,
      undefined,
      undefined,
    ])
    expect(accessorCalls).toBe(0)
    expect(objectConversions).toBe(0)
    expect(proxyTrapCalls).toBe(0)
  })

  test('preserves the existing model no-model fallback and never dispatches MCP repair', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-model-material-route-'))
    let repairCalls = 0
    try {
      const project = await createNovelProject(workspace, {
        title: '模型路径兼容测试',
        synopsis: '林砚进入吞掉时间的灰塔。',
      })
      const chapter = await createNovelChapter(workspace, {
        project_id: project.id,
        chapter_no: 1,
        title: '第一章',
        chapter_goal: '进入灰塔',
        chapter_summary: '林砚发现塔钟异常。',
        conflict: '时间正在消失。',
        ending_hook: '塔钟倒转。',
      })
      const contextPackage = {
        ...readyContextFixture(),
        preflight: {
          ready: false,
          strict_ready: false,
          checks: [
            { key: 'characters', ok: false },
            { key: 'no_repeat', ok: false },
          ],
          warnings: [],
          blockers: ['characters'],
        },
      }
      const { app, handlers } = createRouteHarness()
      registerNovelChapterContextRoutes(app as any, {
        getWorkspace: () => workspace,
        getProject: async () => project,
        buildChapterContextPackage: async () => contextPackage,
        repairChapterMaterials: async () => {
          repairCalls += 1
          throw new Error('model project must not dispatch MCP material repair')
        },
      })

      const response = await callRoute(
        handlers.get('POST /api/novel/chapters/:chapterId/auto-repair-context'),
        { params: { chapterId: String(chapter.id) }, query: {}, body: { project_id: project.id } },
      )

      expect(response.statusCode).toBe(200)
      expect(response.body).toMatchObject({ ok: true, warnings: [] })
      expect(response.body.payload.repair_summary).toStartWith('未指定模型，仅执行本地可推断补齐。')
      expect(response.body.applied.map((item: any) => item.type)).toContain('character_created')
      expect(repairCalls).toBe(0)
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })

  test('keeps the model prompt, provider call, fallback and response statements frozen', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-chapter-context-routes.ts'), 'utf8')
    expect(source).toContain('const chapterGenerationSource = resolveChapterGenerationSource(project)')
    expect(source).toContain("if (chapterGenerationSource.active === 'mcp')")
    expect(source).toContain('expectedAuthorityFingerprint: chapterGenerationSourceFingerprint(chapterGenerationSource)')
    expect(source).toContain("const modelId = req.body?.model_id ? String(req.body.model_id) : ''")
    expect(source).toContain("executeNovelAgent('outline-agent', project, { task: prompt }, {")
    expect(source).toContain("responseMode: 'stream',\n            skipMemory: true,")
    expect(source).toContain('forbidden_repeats: fallbackForbiddenRepeats(project, chapter, contextPackage)')
    expect(source).toContain("repair_summary: modelId ? '当前缺口无需调用模型，仅执行本地可推断补齐。' : '未指定模型，仅执行本地可推断补齐。'")
    expect(source).toContain("warnings: repairError ? [`上下文补齐模型调用失败，已降级处理并允许继续生成：${repairError.slice(0, 240)}`] : []")
  })

  test('projects known MCP errors without remote details or secrets', async () => {
    const secret = 'do-not-expose-remote-secret'
    const { app, handlers } = createRouteHarness()
    registerNovelChapterContextRoutes(app as any, {
      getWorkspace: () => 'workspace',
      getProject: async () => mcpProjectFixture(),
      buildChapterContextPackage: async () => readyContextFixture(),
      repairChapterMaterials: async () => {
        throw Object.assign(new Error(`remote rejected: ${secret}`), {
          code: 'MCP_SESSION_FAILED',
          error_code: 'MCP_SESSION_FAILED',
          details: { remote_body: secret, authorization: secret },
        })
      },
    })

    const response = await callRoute(
      handlers.get('POST /api/novel/chapters/:chapterId/auto-repair-context'),
      { params: { chapterId: '9' }, query: {}, body: { project_id: 5 } },
    )

    expect(response.statusCode).toBe(502)
    expect(response.body).toEqual({
      error: 'MCP 材料补齐失败',
      error_code: 'MCP_SESSION_FAILED',
    })
    expect(JSON.stringify(response.body)).not.toContain(secret)
  })

  test('preserves committed refresh truth while requiring a state reload', async () => {
    const { app, handlers } = createRouteHarness()
    registerNovelChapterContextRoutes(app as any, {
      getWorkspace: () => 'workspace',
      getProject: async () => mcpProjectFixture(),
      buildChapterContextPackage: async () => readyContextFixture(),
      repairChapterMaterials: async () => {
        throw Object.assign(new Error('raw refresh failure'), {
          code: 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED',
          error_code: 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED',
          committed: true,
          task_id: 'chapter-task:material-repair-9',
          remote_body: 'must-not-leak',
        })
      },
    })

    const response = await callRoute(
      handlers.get('POST /api/novel/chapters/:chapterId/auto-repair-context'),
      { params: { chapterId: '9' }, query: {}, body: { project_id: 5 } },
    )

    expect(response.statusCode).toBe(500)
    expect(response.body).toEqual({
      error: '材料补齐已提交，请重新读取项目状态',
      error_code: 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED',
      committed: true,
      task_id: 'chapter-task:material-repair-9',
    })
    expect(JSON.stringify(response.body)).not.toContain('raw refresh failure')
    expect(JSON.stringify(response.body)).not.toContain('must-not-leak')
  })

  test('preserves committed refresh truth from a real refresh-and-close AggregateError', async () => {
    const secret = 'close-error-secret-must-not-leak'
    const committedRefresh = Object.assign(new Error('raw committed refresh error'), {
      code: 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED',
      error_code: 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED',
      committed: true,
      task_id: 'chapter-task:material-repair-aggregate-9',
      details: { remote_body: 'refresh-secret-must-not-leak' },
    })
    const closeFailure = Object.assign(new Error(secret), {
      code: 'MCP_SESSION_FAILED',
      details: { remote_body: secret },
    })
    const { app, handlers } = createRouteHarness()
    registerNovelChapterContextRoutes(app as any, {
      getWorkspace: () => 'workspace',
      getProject: async () => mcpProjectFixture(),
      buildChapterContextPackage: async () => readyContextFixture(),
      repairChapterMaterials: async () => {
        throw new AggregateError(
          [committedRefresh, closeFailure],
          `committed refresh and close failed: ${secret}`,
        )
      },
    })

    const response = await callRoute(
      handlers.get('POST /api/novel/chapters/:chapterId/auto-repair-context'),
      { params: { chapterId: '9' }, query: {}, body: { project_id: 5 } },
    )

    expect(response.statusCode).toBe(500)
    expect(response.body).toEqual({
      error: '材料补齐已提交，请重新读取项目状态',
      error_code: 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED',
      committed: true,
      task_id: 'chapter-task:material-repair-aggregate-9',
    })
    expect(JSON.stringify(response.body)).not.toContain(secret)
    expect(JSON.stringify(response.body)).not.toContain('refresh-secret-must-not-leak')
  })

  test('does not invoke hostile AggregateError accessors or Proxy traps', async () => {
    let accessorCalls = 0
    let proxyTrapCalls = 0
    let rejection: unknown = new Error('unset')
    const { app, handlers } = createRouteHarness()
    registerNovelChapterContextRoutes(app as any, {
      getWorkspace: () => 'workspace',
      getProject: async () => mcpProjectFixture(),
      buildChapterContextPackage: async () => readyContextFixture(),
      repairChapterMaterials: async () => { throw rejection },
    })
    const handler = handlers.get('POST /api/novel/chapters/:chapterId/auto-repair-context')

    const accessorAggregate = new AggregateError([], 'aggregate accessor secret')
    Object.defineProperty(accessorAggregate, 'errors', {
      configurable: true,
      get() {
        accessorCalls += 1
        throw new Error('aggregate errors getter must not run')
      },
    })
    rejection = accessorAggregate
    const accessorResponse = await callRoute(handler, {
      params: { chapterId: '9' }, query: {}, body: { project_id: 5 },
    })

    const accessorChild = new Error('child accessor secret')
    Object.defineProperty(accessorChild, 'code', {
      configurable: true,
      get() {
        accessorCalls += 1
        return 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED'
      },
    })
    Object.assign(accessorChild, {
      committed: true,
      task_id: 'chapter-task:must-not-project-accessor',
    })
    const proxiedRefresh = new Proxy(Object.assign(new Error('proxy child secret'), {
      code: 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED',
      committed: true,
      task_id: 'chapter-task:must-not-project-proxy',
    }), {
      get() {
        proxyTrapCalls += 1
        throw new Error('aggregate child proxy get trap must not run')
      },
      getOwnPropertyDescriptor() {
        proxyTrapCalls += 1
        throw new Error('aggregate child proxy descriptor trap must not run')
      },
    })
    const hostileChildren: any[] = [accessorChild, proxiedRefresh, 'ignored accessor']
    Object.defineProperty(hostileChildren, '2', {
      configurable: true,
      enumerable: true,
      get() {
        accessorCalls += 1
        throw new Error('aggregate child array accessor must not run')
      },
    })
    const hostileChildrenAggregate = new AggregateError([], 'aggregate children secret')
    Object.defineProperty(hostileChildrenAggregate, 'errors', {
      configurable: true,
      value: hostileChildren,
    })
    rejection = hostileChildrenAggregate
    const childrenResponse = await callRoute(handler, {
      params: { chapterId: '9' }, query: {}, body: { project_id: 5 },
    })

    const proxiedAggregate = new Proxy(new AggregateError([
      Object.assign(new Error('hidden committed refresh'), {
        code: 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED',
        committed: true,
        task_id: 'chapter-task:must-not-project-top-proxy',
      }),
    ]), {
      get() {
        proxyTrapCalls += 1
        throw new Error('aggregate proxy get trap must not run')
      },
      getOwnPropertyDescriptor() {
        proxyTrapCalls += 1
        throw new Error('aggregate proxy descriptor trap must not run')
      },
    })
    rejection = proxiedAggregate
    const proxyResponse = await callRoute(handler, {
      params: { chapterId: '9' }, query: {}, body: { project_id: 5 },
    })

    expect([accessorResponse, childrenResponse, proxyResponse].map(response => ({
      statusCode: response.statusCode,
      body: response.body,
    }))).toEqual([
      { statusCode: 500, body: { error: '材料补齐失败' } },
      { statusCode: 500, body: { error: '材料补齐失败' } },
      { statusCode: 500, body: { error: '材料补齐失败' } },
    ])
    expect(accessorCalls).toBe(0)
    expect(proxyTrapCalls).toBe(0)
  })

  test('treats inherited-object property names as unknown error codes', async () => {
    let code = 'constructor'
    const { app, handlers } = createRouteHarness()
    registerNovelChapterContextRoutes(app as any, {
      getWorkspace: () => 'workspace',
      getProject: async () => mcpProjectFixture(),
      buildChapterContextPackage: async () => readyContextFixture(),
      repairChapterMaterials: async () => {
        throw Object.assign(new Error(`unknown code secret: ${code}`), { code })
      },
    })
    const handler = handlers.get('POST /api/novel/chapters/:chapterId/auto-repair-context')

    for (const hostileCode of ['constructor', '__proto__', 'prototype', 'toString']) {
      code = hostileCode
      const response = await callRoute(handler, {
        params: { chapterId: '9' }, query: {}, body: { project_id: 5 },
      })
      expect(typeof response.statusCode).toBe('number')
      expect(response.statusCode).toBe(500)
      expect(response.body).toEqual({ error: '材料补齐失败' })
      expect(JSON.stringify(response.body)).not.toContain(hostileCode)
    }
  })

  test('keeps unknown failures at a bounded generic 500 response', async () => {
    const { app, handlers } = createRouteHarness()
    registerNovelChapterContextRoutes(app as any, {
      getWorkspace: () => 'workspace',
      getProject: async () => mcpProjectFixture(),
      buildChapterContextPackage: async () => readyContextFixture(),
      repairChapterMaterials: async () => {
        throw new Error('unknown remote body must not leak')
      },
    })

    const response = await callRoute(
      handlers.get('POST /api/novel/chapters/:chapterId/auto-repair-context'),
      { params: { chapterId: '9' }, query: {}, body: { project_id: 5 } },
    )

    expect(response.statusCode).toBe(500)
    expect(response.body).toEqual({ error: '材料补齐失败' })
  })

  test('fails safely when the project source cannot be resolved', async () => {
    let repairCalls = 0
    const invalidProject = mcpProjectFixture()
    invalidProject.reference_config.chapter_generation_source.mcp.agent_id = ''
    const { app, handlers } = createRouteHarness()
    registerNovelChapterContextRoutes(app as any, {
      getWorkspace: () => 'workspace',
      getProject: async () => invalidProject,
      buildChapterContextPackage: async () => readyContextFixture(),
      repairChapterMaterials: async () => {
        repairCalls += 1
        throw new Error('must not run')
      },
    })

    const response = await callRoute(
      handlers.get('POST /api/novel/chapters/:chapterId/auto-repair-context'),
      { params: { chapterId: '9' }, query: {}, body: { project_id: 5 } },
    )

    expect(response.statusCode).toBe(400)
    expect(response.body).toEqual({
      error: 'MCP 来源配置无效',
      error_code: 'MCP_BINDING_INVALID',
    })
    expect(repairCalls).toBe(0)
  })

  test('wires the writing material repair service into the chapter context routes', () => {
    const source = readFileSync(join(import.meta.dir, 'novel.ts'), 'utf8')
    expect(source).toContain('repairChapterMaterials: writingService.repairChapterMaterials')
  })
})
