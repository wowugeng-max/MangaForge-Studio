import { afterEach, describe, expect, test } from 'bun:test'
import { access, mkdtemp, readFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'


async function coreBuildersSource() {
  const dir = join(import.meta.dir, 'novel-core')
  const files = ['builders.ts', 'builders-seed-helpers.ts', 'builders-seed-outline-model.ts', 'builders-seed-normalize.ts', 'builders-seed-outline.ts', 'builders-seed-recovery.ts', 'builders-seed-materialize.ts', 'builders-seed-materialize-helpers.ts', 'builders-seed-materialize-run.ts', 'builders-seed-fill-gaps.ts', 'builders-seed.ts', 'register.ts']
  return (await Promise.all(files.map(async name => await readFile(join(dir, name), 'utf8')))).join('\n')
}

let workspaces: string[] = []

async function tempDir(prefix: string) {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  workspaces.push(dir)
  return dir
}

async function pathExists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const mcpProseGenerationSource = {
  version: 'prose_generation_source_v1',
  type: 'mcp',
  mcp: { server_id: 'buda', key_id: 1, adapter_id: 'buda', agent_id: 'agent-1' },
}

const retainedChapterGenerationSource = {
  version: 'chapter_generation_source_v1',
  active: 'model',
  model: { model_id: 217 },
  mcp: { ...mcpProseGenerationSource.mcp, model: '' },
}

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const register = (method: string, path: string, handler: any) => {
    handlers.set(`${method.toUpperCase()} ${path}`, handler)
    if (!handlers.has(path)) handlers.set(path, handler)
    return app
  }
  const app = {
    get: (path: string, handler: any) => register('GET', path, handler),
    post: (path: string, handler: any) => register('POST', path, handler),
    put: (path: string, handler: any) => register('PUT', path, handler),
    delete: (path: string, handler: any) => register('DELETE', path, handler),
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
  await handler(req, res)
  return res
}

async function callDeleteProject(handler: any, projectId: number) {
  return callRoute(handler, { params: { id: String(projectId) } })
}

function completeProjectSeed(overrides: Record<string, any> = {}) {
  return {
    title: '星火令',
    genre: '边境学院',
    synopsis: '少年带着失效星火令进入边境学院，发现星火令能改写势力手牌。',
    logline: '失效令牌成为改写边境秩序的唯一钥匙。',
    main_conflict: '林澈要查清星火令来源，边境三方势力要夺令灭口。',
    protagonist: { name: '林澈', goal: '查明父亲失踪真相' },
    worldbuilding: {
      world_summary: '边境学院由军府、商盟、旧神教共同控制。',
      rules: ['星火令只能改写一次阵营手牌'],
    },
    writing_bible: {
      target_reader_contract: { reader_profile: '男频升级爽文读者' },
      story_power_contract: { quality_checks: ['目标阻碍动作反馈期待'] },
      character_design_contract: { character_pool_tiers: ['protagonist', 'primary_supporting'] },
      longform_structure_contract: { structure_mode: '二级结构' },
    },
    chapter_outlines: [
      { chapter_no: 1, title: '失效令牌', summary: '林澈被迫入局', conflict: '军府扣人', ending_hook: '星火令亮起' },
      { chapter_no: 2, title: '边境入学', summary: '林澈进入学院', conflict: '商盟试探', ending_hook: '旧神教现身' },
      { chapter_no: 3, title: '手牌改写', summary: '林澈验证令牌规则', conflict: '三方夺令', ending_hook: '父亲旧案翻出' },
    ],
    character_pool: {
      protagonist: [{ name: '林澈' }],
      primary_supporting: [{ name: '许照夜' }, { name: '唐眉' }, { name: '周砚' }],
      antagonist_primary: [{ name: '沈归墟', antagonist_logic: { desire: '夺回旧神令权' } }],
    },
    ...overrides,
  }
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('prose generation source mutation guard', () => {
  test('rejects prose generation source writes through every generic project route', async () => {
    const workspace = await tempDir('mangaforge-novel-source-guard-')
    const {
      createNovelProject,
      getNovelProject,
      listNovelProjects,
      mutateNovelProjectReferenceConfig,
    } = await import('../novel')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const project = await createNovelProject(workspace, {
      title: '专用绑定保护项目',
      reference_config: {},
    })
    await mutateNovelProjectReferenceConfig(workspace, {
      projectId: project.id,
      operation: 'test-empty-reference-config',
      mutate: () => ({ referenceConfig: {}, result: null }),
    })
    expect((await getNovelProject(workspace, project.id))?.reference_config).toEqual({})
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)

    const createResponse = await callRoute(handlers.get('POST /api/novel/projects'), {
      body: {
        title: '不应创建的绕过项目',
        reference_config: { prose_generation_source: mcpProseGenerationSource },
      },
    })
    expect(createResponse.statusCode).toBe(400)
    expect(createResponse.body.error_code).toBe('MCP_BINDING_INVALID')
    const projectsAfterRejectedCreate = await listNovelProjects(workspace)
    expect(projectsAfterRejectedCreate).toHaveLength(1)
    expect(projectsAfterRejectedCreate[0].id).toBe(project.id)
    expect(projectsAfterRejectedCreate.map(item => item.title)).not.toContain('不应创建的绕过项目')

    const updateResponse = await callRoute(handlers.get('PUT /api/novel/projects/:id'), {
      params: { id: String(project.id) },
      body: { reference_config: { prose_generation_source: mcpProseGenerationSource } },
    })
    expect(updateResponse.statusCode).toBe(400)
    expect(updateResponse.body.error_code).toBe('MCP_BINDING_INVALID')
    expect((await getNovelProject(workspace, project.id))?.reference_config).toEqual({})

    const referenceConfigResponse = await callRoute(handlers.get('PUT /api/novel/projects/:id/reference-config'), {
      params: { id: String(project.id) },
      body: { prose_generation_source: mcpProseGenerationSource },
    })
    expect(referenceConfigResponse.statusCode).toBe(400)
    expect(referenceConfigResponse.body.error_code).toBe('MCP_BINDING_INVALID')
    expect((await getNovelProject(workspace, project.id))?.reference_config).toEqual({})
  })

  test('rejects prose generation source on create before creating the workspace', async () => {
    const parent = await tempDir('mangaforge-novel-source-guard-parent-')
    const workspace = join(parent, 'missing-workspace')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)
    expect(await pathExists(workspace)).toBe(false)

    const response = await callRoute(handlers.get('POST /api/novel/projects'), {
      body: {
        title: '不应初始化 workspace 的项目',
        reference_config: { prose_generation_source: mcpProseGenerationSource },
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.body.error_code).toBe('MCP_BINDING_INVALID')
    expect(await pathExists(workspace)).toBe(false)
  })

  test('rejects either own dedicated source through every generic route and reports the field', async () => {
    const workspace = await tempDir('mangaforge-novel-dedicated-source-guard-')
    const { createNovelProject, getNovelProject, listNovelProjects } = await import('../novel')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const project = await createNovelProject(workspace, {
      title: '新旧专用字段保护项目',
      reference_config: {},
    })
    const originalReferenceConfig = structuredClone(project.reference_config)
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)

    for (const [field, source] of [
      ['prose_generation_source', mcpProseGenerationSource],
      ['chapter_generation_source', retainedChapterGenerationSource],
    ] as const) {
      const createResponse = await callRoute(handlers.get('POST /api/novel/projects'), {
        body: {
          title: `不应创建-${field}`,
          reference_config: { [field]: source },
        },
      })
      expect(createResponse).toMatchObject({
        statusCode: 400,
        body: { error_code: 'MCP_BINDING_INVALID', field },
      })

      const updateResponse = await callRoute(handlers.get('PUT /api/novel/projects/:id'), {
        params: { id: String(project.id) },
        body: { reference_config: { [field]: source } },
      })
      expect(updateResponse).toMatchObject({
        statusCode: 400,
        body: { error_code: 'MCP_BINDING_INVALID', field },
      })

      const referenceConfigResponse = await callRoute(handlers.get('PUT /api/novel/projects/:id/reference-config'), {
        params: { id: String(project.id) },
        body: { [field]: source },
      })
      expect(referenceConfigResponse).toMatchObject({
        statusCode: 400,
        body: { error_code: 'MCP_BINDING_INVALID', field },
      })
    }

    expect((await getNovelProject(workspace, project.id))?.reference_config).toEqual(originalReferenceConfig)
    expect((await listNovelProjects(workspace)).map(item => item.title)).toEqual(['新旧专用字段保护项目'])
  })

  test('ignores inherited dedicated fields without invoking their getters', async () => {
    const workspace = await tempDir('mangaforge-novel-inherited-source-guard-')
    const { createNovelProject } = await import('../novel')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const project = await createNovelProject(workspace, { title: '继承字段保护项目', reference_config: {} })
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)
    let getterReads = 0
    const referenceConfig = (notes: string) => Object.assign(
      Object.create(Object.defineProperties({}, {
        prose_generation_source: {
          get() {
            getterReads += 1
            throw new Error('inherited prose source must not be read')
          },
        },
        chapter_generation_source: {
          get() {
            getterReads += 1
            throw new Error('inherited chapter source must not be read')
          },
        },
      })),
      { notes },
    )

    const createResponse = await callRoute(handlers.get('POST /api/novel/projects'), {
      body: { title: '允许继承字段的创建', reference_config: referenceConfig('创建') },
    })
    expect(createResponse.statusCode).toBe(200)

    const updateResponse = await callRoute(handlers.get('PUT /api/novel/projects/:id'), {
      params: { id: String(project.id) },
      body: { reference_config: referenceConfig('项目更新') },
    })
    expect(updateResponse.statusCode).toBe(200)

    const referenceConfigResponse = await callRoute(handlers.get('PUT /api/novel/projects/:id/reference-config'), {
      params: { id: String(project.id) },
      body: referenceConfig('配置更新'),
    })
    expect(referenceConfigResponse.statusCode).toBe(200)
    expect(getterReads).toBe(0)
  })

  test('snapshots changing request getters once before every generic write', async () => {
    const workspace = await tempDir('mangaforge-novel-source-single-read-')
    const { createNovelProject, getNovelProject } = await import('../novel')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const existing = await createNovelProject(workspace, { title: '单次读取项目', reference_config: {} })
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)

    const changingBody = (title: string, notes: string) => {
      let titleReads = 0
      let referenceConfigReads = 0
      let notesReads = 0
      const safeConfig = {
        get notes() {
          notesReads += 1
          return notes
        },
      }
      return {
        body: {
          get title() {
            titleReads += 1
            return title
          },
          get reference_config() {
            referenceConfigReads += 1
            return referenceConfigReads === 1
              ? safeConfig
              : { chapter_generation_source: retainedChapterGenerationSource }
          },
        },
        reads: () => ({ titleReads, referenceConfigReads, notesReads }),
      }
    }

    const createInput = changingBody('单次读取创建', '创建快照')
    const createResponse = await callRoute(handlers.get('POST /api/novel/projects'), {
      body: createInput.body,
    })
    expect(createResponse.statusCode).toBe(200)
    expect(createInput.reads()).toEqual({ titleReads: 1, referenceConfigReads: 1, notesReads: 1 })
    expect(createResponse.body.reference_config.notes).toBe('创建快照')
    expect(Object.prototype.hasOwnProperty.call(createResponse.body.reference_config, 'chapter_generation_source')).toBe(false)

    const updateInput = changingBody('单次读取更新', '项目更新快照')
    const updateResponse = await callRoute(handlers.get('PUT /api/novel/projects/:id'), {
      params: { id: String(existing.id) },
      body: updateInput.body,
    })
    expect(updateResponse.statusCode).toBe(200)
    expect(updateInput.reads()).toEqual({ titleReads: 1, referenceConfigReads: 1, notesReads: 1 })
    expect(updateResponse.body.reference_config.notes).toBe('项目更新快照')
    expect(Object.prototype.hasOwnProperty.call(updateResponse.body.reference_config, 'chapter_generation_source')).toBe(false)

    let requestBodyReads = 0
    let referenceNotesReads = 0
    const safeReferenceConfig = {
      get notes() {
        referenceNotesReads += 1
        return '配置更新快照'
      },
    }
    const referenceConfigResponse = await callRoute(handlers.get('PUT /api/novel/projects/:id/reference-config'), {
      params: { id: String(existing.id) },
      get body() {
        requestBodyReads += 1
        return requestBodyReads === 1
          ? safeReferenceConfig
          : { chapter_generation_source: retainedChapterGenerationSource }
      },
    })
    expect(referenceConfigResponse.statusCode).toBe(200)
    expect({ requestBodyReads, referenceNotesReads }).toEqual({ requestBodyReads: 1, referenceNotesReads: 1 })
    expect(referenceConfigResponse.body.notes).toBe('配置更新快照')
    expect(Object.prototype.hasOwnProperty.call(referenceConfigResponse.body, 'chapter_generation_source')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(
      (await getNovelProject(workspace, existing.id))?.reference_config,
      'chapter_generation_source',
    )).toBe(false)
  })

  test('rejects Proxy request inputs with a controlled error before any write', async () => {
    const parent = await tempDir('mangaforge-novel-source-proxy-parent-')
    const missingWorkspace = join(parent, 'missing-workspace')
    const { createNovelProject, getNovelProject, listNovelProjects } = await import('../novel')
    const { McpError } = await import('../mcp/errors')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const trapMessage = 'synthetic private proxy trap detail'
    let trapCalls = 0
    const trappedProxy = () => new Proxy({}, {
      get() {
        trapCalls += 1
        throw new Error(trapMessage)
      },
      ownKeys() {
        trapCalls += 1
        throw new Error(trapMessage)
      },
      getOwnPropertyDescriptor() {
        trapCalls += 1
        throw new Error(trapMessage)
      },
    })

    const createHarness = createRouteHarness()
    registerNovelCoreRoutes(createHarness.app as any, () => missingWorkspace)
    for (const body of [
      trappedProxy(),
      { title: '不应创建', reference_config: trappedProxy() },
      {
        get title() {
          throw new McpError('MCP_BINDING_INVALID', trapMessage, { reason: 'synthetic_untrusted_reason' })
        },
      },
    ]) {
      const response = await callRoute(createHarness.handlers.get('POST /api/novel/projects'), { body })
      expect(response.statusCode).toBe(400)
      expect(response.body.error_code).toBe('MCP_BINDING_INVALID')
      expect(JSON.stringify(response.body)).not.toContain(trapMessage)
      expect(await pathExists(missingWorkspace)).toBe(false)
    }

    const workspace = await tempDir('mangaforge-novel-source-proxy-write-')
    const project = await createNovelProject(workspace, { title: 'Proxy 拦截项目', reference_config: {} })
    const before = structuredClone(await getNovelProject(workspace, project.id))
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)

    const updateResponse = await callRoute(handlers.get('PUT /api/novel/projects/:id'), {
      params: { id: String(project.id) },
      body: trappedProxy(),
    })
    expect(updateResponse.statusCode).toBe(400)
    expect(updateResponse.body.error_code).toBe('MCP_BINDING_INVALID')
    expect(JSON.stringify(updateResponse.body)).not.toContain(trapMessage)

    const referenceConfigResponse = await callRoute(handlers.get('PUT /api/novel/projects/:id/reference-config'), {
      params: { id: String(project.id) },
      body: trappedProxy(),
    })
    expect(referenceConfigResponse.statusCode).toBe(400)
    expect(referenceConfigResponse.body.error_code).toBe('MCP_BINDING_INVALID')
    expect(JSON.stringify(referenceConfigResponse.body)).not.toContain(trapMessage)
    expect(trapCalls).toBe(0)
    expect(await getNovelProject(workspace, project.id)).toEqual(before)
    expect(await listNovelProjects(workspace)).toHaveLength(1)
  })

  test('rejects own dedicated accessors without executing them', async () => {
    const parent = await tempDir('mangaforge-novel-source-accessor-parent-')
    const workspace = join(parent, 'missing-workspace')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)
    let getterReads = 0
    const referenceConfig = { notes: '不应写入' }
    Object.defineProperty(referenceConfig, 'chapter_generation_source', {
      enumerable: true,
      get() {
        getterReads += 1
        throw new Error('dedicated source accessor must not run')
      },
    })

    const response = await callRoute(handlers.get('POST /api/novel/projects'), {
      body: { title: '不应创建', reference_config: referenceConfig },
    })

    expect(response).toMatchObject({
      statusCode: 400,
      body: { error_code: 'MCP_BINDING_INVALID', field: 'chapter_generation_source' },
    })
    expect(getterReads).toBe(0)
    expect(await pathExists(workspace)).toBe(false)
  })

  test('preserves existing dedicated generation sources when generic project update omits them', async () => {
    const workspace = await tempDir('mangaforge-novel-source-project-update-')
    const { createNovelProject, getNovelProject, mutateNovelProjectReferenceConfig } = await import('../novel')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const project = await createNovelProject(workspace, { title: '保留绑定的项目' })
    await mutateNovelProjectReferenceConfig(workspace, {
      projectId: project.id,
      operation: 'test-existing-prose-generation-source',
      mutate: current => ({
        referenceConfig: {
          ...current,
          prose_generation_source: mcpProseGenerationSource,
          chapter_generation_source: retainedChapterGenerationSource,
        },
        result: null,
      }),
    })
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)

    const response = await callRoute(handlers.get('PUT /api/novel/projects/:id'), {
      params: { id: String(project.id) },
      body: {
        title: '通用项目更新后的标题',
        reference_config: { notes: '通用项目更新保存的备注' },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.title).toBe('通用项目更新后的标题')
    expect(response.body.reference_config.notes).toBe('通用项目更新保存的备注')
    expect(response.body.reference_config.prose_generation_source).toEqual(mcpProseGenerationSource)
    expect(response.body.reference_config.chapter_generation_source).toEqual(retainedChapterGenerationSource)
    expect((await getNovelProject(workspace, project.id))?.reference_config?.prose_generation_source)
      .toEqual(mcpProseGenerationSource)
    expect((await getNovelProject(workspace, project.id))?.reference_config?.chapter_generation_source)
      .toEqual(retainedChapterGenerationSource)
  })

  test('preserves existing dedicated generation sources when reference config update omits them', async () => {
    const workspace = await tempDir('mangaforge-novel-source-config-update-')
    const { createNovelProject, getNovelProject, mutateNovelProjectReferenceConfig } = await import('../novel')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const project = await createNovelProject(workspace, { title: '保留 reference config 绑定的项目' })
    await mutateNovelProjectReferenceConfig(workspace, {
      projectId: project.id,
      operation: 'test-existing-prose-generation-source',
      mutate: current => ({
        referenceConfig: {
          ...current,
          prose_generation_source: mcpProseGenerationSource,
          chapter_generation_source: retainedChapterGenerationSource,
        },
        result: null,
      }),
    })
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)

    const response = await callRoute(handlers.get('PUT /api/novel/projects/:id/reference-config'), {
      params: { id: String(project.id) },
      body: { notes: 'reference config 更新保存的备注' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.notes).toBe('reference config 更新保存的备注')
    expect(response.body.prose_generation_source).toEqual(mcpProseGenerationSource)
    expect(response.body.chapter_generation_source).toEqual(retainedChapterGenerationSource)
    expect((await getNovelProject(workspace, project.id))?.reference_config?.prose_generation_source)
      .toEqual(mcpProseGenerationSource)
    expect((await getNovelProject(workspace, project.id))?.reference_config?.chapter_generation_source)
      .toEqual(retainedChapterGenerationSource)
  })
})

describe('novel core project deletion', () => {
  test('purges memory palace data when deleting a novel project', async () => {
    const workspace = await tempDir('mangaforge-novel-route-')
    process.env.MEMPALACE_DIR = await tempDir('mangaforge-memory-route-')
    const { createNovelProject } = await import('../novel')
    const { listMemories, storeMemory } = await import('../memory-service')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')

    const project = await createNovelProject(workspace, { title: '待删除项目' })
    const memoryText = `待删除项目的世界观记忆-${Date.now()}`
    await storeMemory(project.id, memoryText, 'world', ['test'])
    expect((await listMemories(project.id)).some(memory => memory.content === memoryText)).toBe(true)

    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)
    const handler = handlers.get('/api/novel/projects/:id')
    if (!handler) throw new Error('delete project route not registered')

    const response = await callDeleteProject(handler, project.id)

    expect(response.statusCode).toBe(200)
    expect(await listMemories(project.id)).toHaveLength(0)
  })
})

describe('project seed outline extraction and volume prompt', () => {
  test('extractOutlineFieldsFromModelPayload recovers arrays from messy payloads', async () => {
    const { extractOutlineFieldsFromModelPayload } = await import('./novel-core-routes')
    const extracted = extractOutlineFieldsFromModelPayload({
      content: JSON.stringify({
        volume_outlines: [{ title: '夜市开张', goal: '立规矩', summary: '江哲守摊' }],
        chapter_outlines: [
          { chapter_no: 1, title: '第一单诡货', summary: '怪谈入摊' },
          { chapter_no: 2, title: '假秤见血', summary: '规则反噬' },
        ],
        foreshadowing_plan: [{ name: '秤砣里的旧名', plant_at: '第2章', payoff_at: '第18章' }],
      }),
    })
    expect(extracted.volume_outlines.length).toBe(1)
    expect(extracted.chapter_outlines.length).toBe(2)
    expect(extracted.foreshadowing_plan.length).toBe(1)
  })

  test('volume-only prompt asks only for volume_outlines', async () => {
    const { buildProjectSeedVolumeOutlineOnlyPrompt } = await import('./novel-core-routes')
    const prompt = buildProjectSeedVolumeOutlineOnlyPrompt({
      title: '夜市诡闻',
      logline: '摊主用规则漏洞卖活路',
      synopsis: '江哲在夜市对抗怪谈',
      protagonist: { name: '江哲' },
    }, '规则怪谈夜市', '夜市诡闻', 'medium')
    expect(prompt).toContain('volume_outlines')
    expect(prompt).toContain('不要输出 chapter_outlines')
    expect(prompt).toContain('开局规则验证')
  })

  test('stripLocalScaffoldOutlines keeps model-marked volumes and chapters', async () => {
    const { stripLocalScaffoldOutlines } = await import('./novel-core-routes')
    const stripped = stripLocalScaffoldOutlines({
      volume_outlines: [
        { title: '夜市开张', goal: '立规矩', summary: '江哲守摊', source: 'model', scaffold: false },
        { title: '开局规则验证', goal: '模板', summary: '模板', source: 'local_scaffold', scaffold: true },
      ],
      chapter_outlines: [
        { chapter_no: 1, title: '第一单诡货', summary: '怪谈入摊', source: 'model', scaffold: false },
        { chapter_no: 2, title: '异常入局', summary: '本地兜底模板', source: 'local_scaffold', scaffold: true },
      ],
    })
    expect(stripped.volume_outlines).toHaveLength(1)
    expect(stripped.volume_outlines[0].title).toBe('夜市开张')
    expect(stripped.chapter_outlines).toHaveLength(1)
    expect(stripped.chapter_outlines[0].title).toBe('第一单诡货')
  })
})



describe('project seed progress stage events', () => {
  test('buildProjectSeedStageEvent sequence for first30 passes is ordered', async () => {
    const { buildProjectSeedStageEvent } = await import('./novel-project-seed-progress')
    const events = [
      buildProjectSeedStageEvent({ stage: 'outlines', status: 'running', progress: 0.35, detail: 'pass_a' }),
      buildProjectSeedStageEvent({ stage: 'outlines', status: 'running', progress: 0.55, detail: 'pass_a2' }),
      buildProjectSeedStageEvent({ stage: 'volumes', status: 'completed', progress: 0.65, outline_volume_count: 3 }),
      buildProjectSeedStageEvent({ stage: 'foreshadowing', status: 'completed', progress: 0.8, outline_foreshadowing_count: 6 }),
    ]
    expect(events.map(e => e.ui_step)).toEqual([1, 1, 1, 2])
    expect(events.at(-1)?.stage).toBe('foreshadowing')
  })
})
describe('novel project seed prompt b', () => {
  test('extracts real characters and outlines from model text before using recovery templates', async () => {
    const { buildRecoverableProjectSeed } = await import('./novel-core-routes')
    const modelText = `
      "protagonist": {
        "name": "丁松言",
        "identity": "现代地球穿越者，原为民俗学研究生，精通《山海经》及上古神话体系，穿越到异世成为边陲小镇药铺学徒",
        "goal": "验证异兽食性并破解大荒规则"
      },
      "antagonist": {
        "name": "楚天行（首席反派，后期揭示为多重身份）",
        "identity": "大荒宗门首席",
        "goal": "夺取山海经残篇"
      },
      "volume_outlines": [
        {"title": "边陲药铺与蛾虫秘传", "summary": "丁松言在药铺发现山海经食性规则可以改变修炼路线。"},
        {"title": "楚天行入局", "summary": "楚天行追索残篇，逼迫丁松言暴露第一批秘密。"}
      ],
      "chapter_outlines": [
        {"chapter_no": 1, "title": "蛾虫入药", "summary": "丁松言发现蛾虫药性与山海经记载不一致。"},
        {"chapter_no": 2, "title": "药铺夜问", "summary": "丁松言第一次用民俗学知识解释异兽禁忌。"},
        {"chapter_no": 3, "title": "楚天行来镇", "summary": "楚天行抵达边陲小镇，试探丁松言。"}
      ]
    `

    const recovered = buildRecoverableProjectSeed(
      { title: '剑烛大荒', genre: '玄幻' },
      '这个世界的秘传《山海经》怎么和我上辈子看得不太一样？',
      '剑烛大荒',
      'epic',
      { content: modelText },
    )

    expect(recovered.seed.protagonist.name).toBe('丁松言')
    expect(recovered.seed.antagonist.name).toBe('楚天行（首席反派，后期揭示为多重身份）')
    expect(recovered.seed.logline).toContain('丁松言')
    expect(recovered.seed.logline).not.toContain('主角凭借')
    expect(recovered.seed.characters.map((item: any) => item.name)).toContain('丁松言')
    expect(recovered.seed.characters.map((item: any) => item.name)).toContain('楚天行（首席反派，后期揭示为多重身份）')
    expect(recovered.seed.volume_outlines.map((item: any) => item.title)).toEqual([
      '边陲药铺与蛾虫秘传',
      '楚天行入局',
    ])
    expect(recovered.seed.chapter_outlines.slice(0, 3).map((item: any) => item.title)).toEqual([
      '蛾虫入药',
      '药铺夜问',
      '楚天行来镇',
    ])
  })

  test('builds a seed recovery prompt that expands existing value instead of switching models', async () => {
    const { buildProjectSeedRecoveryPrompt, buildRecoverableProjectSeed } = await import('./novel-core-routes')
    const recovered = buildRecoverableProjectSeed(
      { title: '剑烛大荒', genre: '仙侠' },
      '丁松在大荒遗迹里按异兽食性修炼。',
      '剑烛大荒',
      'epic',
      { content: '已有线索：丁松、异兽食性、山海经、大荒遗迹。' },
    )

    const prompt = buildProjectSeedRecoveryPrompt(recovered.seed, recovered.diagnostics, '丁松在大荒遗迹里按异兽食性修炼。', '剑烛大荒', 'epic')

    expect(prompt).toContain('不要要求作者更换模型')
    expect(prompt).toContain('保留已有有效信息')
    expect(prompt).toContain('缺口清单')
    expect(prompt).toContain('300万字以上')
    expect(prompt).toContain('丁松')
    expect(prompt).toContain('异兽食性')
  })

  test('seed routes run thin-output recovery before returning a hard seed error', async () => {
    const source = await coreBuildersSource()
    const deriveStart = source.indexOf("app.post('/api/novel/project-seed/derive'")
    const finalizeStart = source.indexOf("app.post('/api/novel/project-seed/finalize'", deriveStart)
    const autoCreateStart = source.indexOf("app.post('/api/novel/projects/auto-create'", finalizeStart)
    const deleteStart = source.indexOf("app.delete('/api/novel/projects/:id'", autoCreateStart)
    const deriveBlock = source.slice(deriveStart, finalizeStart)
    const finalizeBlock = source.slice(finalizeStart, autoCreateStart)
    const autoCreateBlock = source.slice(autoCreateStart, deleteStart)

    expect(deriveBlock).toContain('expandThinProjectSeedWithModel')
    expect(deriveBlock).toContain('seed_diagnostics')
    expect(finalizeBlock).toContain('expandThinProjectSeedWithModel')
    expect(finalizeBlock).toContain('seed_diagnostics')
    expect(autoCreateBlock).toContain('expandThinProjectSeedWithModel')
    expect(autoCreateBlock).toContain('seed_diagnostics')
  })

  test('finalize route can create a project atomically when requested', async () => {
    const source = await coreBuildersSource()
    const finalizeStart = source.indexOf("app.post('/api/novel/project-seed/finalize'")
    const autoCreateStart = source.indexOf("app.post('/api/novel/projects/auto-create'", finalizeStart)
    const finalizeBlock = source.slice(finalizeStart, autoCreateStart)

    expect(finalizeBlock).toContain('create_project')
    expect(finalizeBlock).toContain('createProjectFromSeed')
    expect(finalizeBlock).toContain('project_id')
    expect(finalizeBlock).toContain('seed_materialization')
  })

  test('finalize route allows explicit author confirmation to create a review-needed seed', async () => {
    const source = await coreBuildersSource()
    const finalizeStart = source.indexOf("app.post('/api/novel/project-seed/finalize'")
    const autoCreateStart = source.indexOf("app.post('/api/novel/projects/auto-create'", finalizeStart)
    const finalizeBlock = source.slice(finalizeStart, autoCreateStart)

    expect(finalizeBlock).toContain('author_confirmed')
    expect(finalizeBlock).toContain('confirmed_by_author')
    expect(finalizeBlock).toContain('!authorConfirmed')
  })

  test('fill-gaps route is registered and uses safe merge helpers', async () => {
    const source = await coreBuildersSource()
    expect(source).toContain("/api/novel/project-seed/fill-gaps")
    expect(source).toContain('fillProjectSeedGapsWithModel')
    expect(source).toContain('mergeSeedPreferRicher')
    expect(source).toContain('listProjectSeedGapTargets')
    expect(source).toContain('opening_strategy_contract')
  })

  test('derive-stream route writes stage and result SSE frames', async () => {
    const source = await coreBuildersSource()
    expect(source).toContain("/api/novel/project-seed/derive-stream")
    expect(source).toContain('text/event-stream')
    expect(source).toContain("type: 'result'")
    expect(source).toContain(': mangaforge-project-seed-heartbeat')
    expect(source).toContain('sseData')
    expect(source).toContain("type: 'error'")
    expect(source).toContain('safeReportProjectSeedProgress')

    const deriveStreamStart = source.indexOf("app.post('/api/novel/project-seed/derive-stream'")
    const finalizeStart = source.indexOf("app.post('/api/novel/project-seed/finalize'", deriveStreamStart)
    expect(deriveStreamStart).toBeGreaterThan(-1)
    expect(finalizeStart).toBeGreaterThan(deriveStreamStart)
    const streamBlock = source.slice(deriveStreamStart, finalizeStart)
    expect(streamBlock).toContain('deriveProjectSeedWithModel')
    expect(streamBlock).toContain('expandThinProjectSeedWithModel')
    expect(streamBlock).toContain('ensureProjectSeedModelOutlines')
    expect(streamBlock).toContain('onProgress')
    expect(streamBlock).toContain("stage: 'assemble'")
    expect(streamBlock).toContain('Cache-Control')
    expect(streamBlock).toContain('no-cache, no-transform')
  })

  test('materializes seed chapters even when raw payload contains an empty chapter array', async () => {
    const workspace = await tempDir('mangaforge-novel-materialize-chapters-')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const { listNovelChapters } = await import('../novel')
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)
    const createProject = handlers.get('POST /api/novel/projects')
    expect(createProject).toBeTruthy()

    const chapterOutlines = Array.from({ length: 30 }, (_, index) => ({
      chapter_no: index + 1,
      title: `第${index + 1}章`,
      summary: `第${index + 1}章推进丁松言的异兽规则线索。`,
      conflict: '规则代价升级',
      ending_hook: '留下下一章钩子',
    }))
    const seed = {
      title: '剑烛大荒',
      genre: '仙侠',
      synopsis: '丁松言用山海经知识破解大荒异兽规则。',
      logline: '山海经异文成为改写大荒的钥匙。',
      protagonist: { name: '丁松言', goal: '破解大荒规则' },
      worldbuilding: { world_summary: '大荒异兽规则构成修炼秩序。' },
      volume_outlines: [{ title: '第一卷：九婴焚世', summary: '丁松言建立第一阶段规则优势。' }],
      chapter_outlines: chapterOutlines,
      raw_payload: {
        title: '剑烛大荒',
        volume_outlines: [],
        chapter_outlines: [],
      },
    }

    const response = await callRoute(createProject, {
      body: {
        title: '剑烛大荒',
        genre: '仙侠',
        length_target: 'epic',
        synopsis: seed.synopsis,
        reference_config: { project_seed: seed },
        auto_materialize_seed: true,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.seed_materialization.chapters).toBe(30)
    expect(response.body.reference_config.writing_bible.promise).toContain('山海经异文')
    expect(response.body.reference_config.writing_bible.reader_promise).toContain('山海经异文')
    expect(response.body.reference_config.writing_bible.protagonist_drive).toContain('破解大荒规则')
    expect(response.body.reference_config.writing_bible.core_conflict).toContain('异兽规则')
    expect(response.body.reference_config.writing_bible.current_volume_goal).toContain('九婴焚世')
    expect(response.body.reference_config.writing_bible.innovation_hook).toContain('山海经')
    expect(response.body.reference_config.writing_bible.first30_plan).toContain('前30章')
    expect(response.body.reference_config.writing_bible.longform_capacity).toContain('epic')
    expect(response.body.reference_config.writing_bible.mainline.hook).toBeTruthy()
    const chapters = await listNovelChapters(workspace, response.body.id)
    expect(chapters).toHaveLength(30)
    expect(chapters[0].title).toBe('第1章')
  })

  test('materializes oh-story creation contracts into the writing bible', async () => {
    const workspace = await tempDir('mangaforge-novel-materialize-creation-contracts-')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)
    const createProject = handlers.get('POST /api/novel/projects')
    expect(createProject).toBeTruthy()

    const seed = {
      title: '灰域双生',
      genre: '都市规则怪谈',
      sub_genres: ['双主角', '无限流'],
      length_target: 'epic',
      target_audience: '18-30 岁番茄男频读者，喜欢规则破解、强反差搭档和持续追更钩子。',
      synopsis: '莽夫林野和规则分析师沈砚被卷入灰域副本，用武力试错和规则推演反制怪谈。',
      logline: '一个负责把怪物打到暴露规则，一个负责把规则拆成胜利条件。',
      main_conflict: '灰域规则不断升级，双主角必须在代价失控前找出副本漏洞。',
      commercial_tags: ['规则破解爽点', '双主角互补', '副本升级'],
      commercial_positioning: {
        platform: '番茄',
        reader_promise: '每章都有规则发现、代价压力和一次可感知反制。',
        selling_points: ['莽夫破局制造反差', '规则分析带来智斗爽感'],
        risks: ['不能写成纯打怪', '不能让规则分析停留在解释'],
      },
      protagonist: { name: '林野', goal: '打穿灰域副本并救出妹妹', motivation: '把不可控规则变成可打破的秩序' },
      worldbuilding: {
        world_summary: '灰域会把现实地点污染成带规则的副本。',
        rules: ['违反规则会支付记忆或身体代价', '副本漏洞必须由行动触发'],
      },
      volume_outlines: [{ title: '第一卷：午夜员工餐厅', summary: '建立双主角互补和灰域规则升级压力。' }],
      chapter_outlines: [{ chapter_no: 1, title: '午夜入职', summary: '两人第一次读到员工餐厅规则。' }],
    }

    const response = await callRoute(createProject, {
      body: {
        title: seed.title,
        genre: seed.genre,
        length_target: seed.length_target,
        target_audience: seed.target_audience,
        synopsis: seed.synopsis,
        reference_config: { project_seed: seed },
        auto_materialize_seed: true,
      },
    })

    expect(response.statusCode).toBe(200)
    const bible = response.body.reference_config.writing_bible
    expect(bible.target_reader_contract.source).toBe('oh_story_creation_contract_v1')
    expect(bible.target_reader_contract.reader_profile).toContain('18-30')
    expect(bible.target_reader_contract.reader_desires.join('｜')).toContain('规则破解爽点')
    expect(bible.target_reader_contract.chapter_value_test.join('｜')).toContain('写给谁看')
    expect(bible.genre_positioning_contract.source).toBe('oh_story_creation_contract_v1')
    expect(bible.genre_positioning_contract.genre_tags.join('｜')).toContain('都市规则怪谈')
    expect(bible.genre_positioning_contract.platform).toBe('番茄')
    expect(bible.genre_positioning_contract.selling_points.join('｜')).toContain('莽夫破局')
    expect(bible.genre_positioning_contract.genre_catalog_contract.source).toBe('oh_story_genre_catalog_v1')
    expect(bible.genre_positioning_contract.genre_catalog_contract.matched_framework).toBe('规则怪谈')
    expect(bible.genre_positioning_contract.genre_catalog_contract.structure_beats.join('｜')).toContain('背景故事')
    expect(bible.genre_positioning_contract.genre_catalog_contract.quality_checks.join('｜')).toContain('每2000字至少一个悬念/反转/信息差钩子')
    expect(bible.genre_positioning_contract.genre_core_mechanics_contract.source).toBe('oh_story_genre_core_mechanics_v1')
    expect(bible.genre_positioning_contract.genre_core_mechanics_contract.core_hook_layers.join('｜')).toContain('主题(立意)')
    expect(bible.genre_positioning_contract.genre_core_mechanics_contract.chapter_loop_rules.join('｜')).toContain('每章至少有期待点或爽点之一')
    expect(bible.genre_positioning_contract.genre_core_mechanics_contract.micro_innovation_rules.join('｜')).toContain('微创新不超3个')
    expect(bible.genre_positioning_contract.genre_core_mechanics_contract.conflict_network_rules.join('｜')).toContain('纵向+横向+交叉')
    expect(bible.genre_positioning_contract.genre_core_mechanics_contract.goldfinger_worldview_fit.worldview_type).toBeTruthy()
    expect(bible.genre_positioning_contract.genre_core_mechanics_contract.threshold_escalation_rules.join('｜')).toContain('后一个爽点')
    expect(bible.mainline_definition_contract.source).toBe('oh_story_plot_core_mainline_definition_v1')
    expect(bible.mainline_definition_contract.definition_rules.join('｜')).toContain('主线不等于升级')
    expect(bible.mainline_definition_contract.definition_rules.join('｜')).toContain('主线是一件事')
    expect(bible.mainline_definition_contract.action_rules.join('｜')).toContain('升级是主角达成目标的行动')
    expect(bible.mainline_definition_contract.quality_checks.join('｜')).toContain('不是一个元素')
    expect(bible.story_power_contract.source).toBe('oh_story_plot_core_story_power_v1')
    expect(bible.story_power_contract.story_power_dimensions.join('｜')).toContain('故事五维')
    expect(bible.story_power_contract.action_rules.join('｜')).toContain('有动作才是故事')
    expect(bible.story_power_contract.beginning_end_rules.join('｜')).toContain('有始有终')
    expect(bible.story_power_contract.causal_feedback_rules.join('｜')).toContain('因果反馈')
    expect(bible.character_design_contract.source).toBe('oh_story_character_design_methods_v1')
    expect(bible.character_design_contract.layered_tag_rules.join('｜')).toContain('三层标签')
    expect(bible.character_design_contract.association_rules.join('｜')).toContain('强/中/弱关联')
    expect(bible.character_design_contract.role_card_schema.join('｜')).toContain('角色定位')
    expect(bible.character_design_contract.supporting_role_rules.join('｜')).toContain('配角功能')
    expect(bible.character_design_contract.antagonist_design_rules.join('｜')).toContain('反派也有梦想')
    expect(bible.character_design_contract.protagonist_alignment_rules.join('｜')).toContain('金手指绑架人设')
    expect(bible.character_design_contract.immersion_safety_rules.join('｜')).toContain('靠山过度')
    expect(bible.plot_special_topics_contract.source).toBe('oh_story_plot_special_topics_v1')
    expect(bible.plot_special_topics_contract.goldfinger_design_rules.join('｜')).toContain('面板')
    expect(bible.plot_special_topics_contract.genre_boundary_rules.join('｜')).toContain('题材边界')
    expect(bible.plot_special_topics_contract.market_benchmark_rules.join('｜')).toContain('同平台、同题材、同类型')
    expect(bible.plot_special_topics_contract.faction_hand_rules.join('｜')).toContain('按实力高低排序各阵营角色')
    expect(bible.core_contract_radar.source).toBe('oh_story_creation_contract_v1')
    expect(bible.core_contract_radar.must_serve.join('｜')).toContain('每章都有规则发现')
    expect(bible.core_contract_radar.no_drift.join('｜')).toContain('不能写成纯打怪')
    expect(bible.reader_retention_contract.source).toBe('oh_story_creation_contract_v1')
    expect(bible.reader_retention_contract.opening_hook_rule).toContain('前300字')
    expect(bible.reader_retention_contract.ending_hook_rule).toContain('下一章')
    expect(bible.longform_structure_contract.source).toBe('oh_story_outline_structure_theory_v1')
    expect(bible.longform_structure_contract.structure_level_rules.join('｜')).toContain('一级/二级/三级')
    expect(bible.longform_structure_contract.five_act_causal_chain_rules.join('｜')).toContain('五幕式')
    expect(bible.longform_structure_contract.outline_expansion_rules.join('｜')).toContain('下一级服务上一级')
    expect(bible.longform_structure_contract.volume_framework_rules.join('｜')).toContain('每卷目的')
    expect(bible.longform_structure_contract.map_transition_rules.join('｜')).toContain('顶层势力')
    expect(bible.longform_structure_contract.line_layout_rules.join('｜')).toContain('支线')
    expect(bible.longform_structure_contract.architecture_choice_rules.join('｜')).toContain('强主线')
    expect(bible.longform_structure_contract.architecture_choice_rules.join('｜')).toContain('弱主线')
    expect(bible.longform_structure_contract.sixth_act_afterglow_rules.join('｜')).toContain('明线')
    expect(bible.longform_structure_contract.sixth_act_afterglow_rules.join('｜')).toContain('暗线')
    expect(bible.commercial_positioning.reader_promise).toContain('每章都有规则发现')
    expect(bible.commercial_positioning.selling_points.join('｜')).toContain('规则分析')
    expect(response.body.reference_config.commercial_positioning.platform).toBe('番茄')
    expect(response.body.reference_config.commercial_positioning.reader_promise).toContain('每章都有规则发现')
    expect(response.body.reference_config.commercial_positioning.selling_points.join('｜')).toContain('规则分析')
    expect(response.body.reference_config.commercial_positioning.risks.join('｜')).toContain('不能写成纯打怪')
  })

  test('normalizes grouped layered seed roles into deduplicated materialized characters', async () => {
    const { buildMaterializedSeedCharactersForTest } = await import('./novel-core-routes')

    const characters = buildMaterializedSeedCharactersForTest({
      protagonist: { name: '周凛', goal: '保住妹妹手术费' },
      character_pool: {
        primary_supporting: [{ name: '林澈', goal: '查清黑钱来源', relationship_to_protagonist: '互相利用' }],
        antagonist_minor: [{ name: '赵衡', antagonist_logic: { belief: '资源只配给强者' } }],
        faction_agent: [{ name: '巡考员甲', narrative_function: '执行联考规则压迫' }],
      },
      characters: [{ name: '林澈', role_type: 'primary_supporting', motivation: '避免被家族牺牲' }],
    })

    expect(characters.map((item: any) => item.name)).toEqual(['林澈', '赵衡', '巡考员甲', '周凛'])
    expect(characters.find((item: any) => item.name === '林澈')).toMatchObject({
      role_type: 'primary_supporting',
      tier: 'primary_supporting',
      relationship_to_protagonist: '互相利用',
      motivation: '避免被家族牺牲',
    })
    expect(characters.find((item: any) => item.name === '赵衡')?.raw_role_group || '').toBe('antagonist_minor')
  })

  test('materializes seed projects with prose-ready story state and scene cards', async () => {
    const workspace = await tempDir('mangaforge-novel-materialize-prose-ready-')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const { listNovelChapters } = await import('../novel')
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)
    const createProject = handlers.get('POST /api/novel/projects')
    expect(createProject).toBeTruthy()

    const seed = {
      title: '雾灯归航',
      genre: '都市奇幻',
      synopsis: '失忆修灯人陆珩在雾港修复能照出谎言的灯塔。',
      logline: '每修好一盏灯，就照出一个被城市藏起来的谎言。',
      protagonist: { name: '陆珩', goal: '找回失去的海雾记忆', current_state: { location: '雾港旧码头', pressure: '灯塔即将熄灭' } },
      characters: [
        { name: '陆珩', role_type: 'protagonist', motivation: '找回失去的海雾记忆', goal: '修复灯塔', conflict: '每次点灯都会失去一段新记忆', current_state: { location: '雾港旧码头', pressure: '灯塔即将熄灭' } },
        { name: '沈照', role_type: 'ally', motivation: '保护雾港居民', goal: '查清灯塔失控原因', conflict: '她知道陆珩遗忘的真相', current_state: { location: '巡夜署', pressure: '不能说出禁忌真相' } },
      ],
      worldbuilding: { world_summary: '雾港的灯能照出谎言，也会吞掉点灯人的记忆。' },
      chapter_outlines: [
        {
          chapter_no: 1,
          title: '旧码头的灯',
          chapter_goal: '陆珩发现第一盏雾灯失控。',
          chapter_summary: '陆珩回到旧码头修灯，灯光照出船主撒谎，雾里出现他遗忘的名字。',
          conflict: '修灯会让陆珩继续失忆，但不修灯全港会陷入雾灾。',
          ending_hook: '灯芯里浮出沈照藏起来的半枚巡夜徽章。',
        },
      ],
    }

    const response = await callRoute(createProject, {
      body: {
        title: seed.title,
        genre: seed.genre,
        length_target: 'medium',
        synopsis: seed.synopsis,
        reference_config: { project_seed: seed },
        auto_materialize_seed: true,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body.reference_config.project_seed.oh_story_director.stage).toBe('project_creation')
    const storyState = response.body.reference_config.story_state
    expect(storyState.characters.map((character: any) => character.name)).toEqual(['陆珩', '沈照'])
    expect(storyState.characters[0].current_state.pressure).toContain('灯塔')
    expect(storyState.source).toBe('project_seed_materialization')

    const chapters = await listNovelChapters(workspace, response.body.id)
    expect(chapters[0].scene_breakdown.length).toBeGreaterThanOrEqual(2)
    expect(chapters[0].scene_breakdown[0].purpose).toContain('陆珩发现第一盏雾灯失控')
    expect(chapters[0].scene_breakdown.at(-1)?.ending_hook_seed).toContain('沈照')
    expect(chapters[0].raw_payload.scene_cards_source).toBe('project_seed_materialization')
  })

  test('materialization keeps structural chapter beats out of chapter titles', async () => {
    const workspace = await tempDir('mangaforge-novel-materialize-structural-title-')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const { listNovelChapters } = await import('../novel')
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)
    const createProject = handlers.get('POST /api/novel/projects')
    expect(createProject).toBeTruthy()

    const seed = {
      title: '剑烛大荒',
      genre: '仙侠',
      synopsis: '丁松言用山海经知识破解大荒异兽规则。',
      logline: '山海经异文成为改写大荒的钥匙。',
      protagonist: { name: '丁松言', goal: '破解大荒规则' },
      worldbuilding: { world_summary: '大荒异兽规则构成修炼秩序。' },
      volume_outlines: [{ title: '第一卷：九婴焚世', summary: '丁松言建立第一阶段规则优势。' }],
      chapter_outlines: [
        { chapter_no: 1, title: '伏笔回收', summary: '丁松言回收蛾虫药性线索，证明山海经异文可破局。', conflict: '回收线索会暴露知识来源。', ending_hook: '楚天行确认残篇在丁松言身上。' },
        { chapter_no: 2, title: '更大地图', summary: '丁松言获得进入大荒深处的资格和债务。', conflict: '资格不是奖励，而是更危险身份。', ending_hook: '荒门后的第一条禁忌盯上他。' },
      ],
    }

    const response = await callRoute(createProject, {
      body: {
        title: '剑烛大荒',
        genre: '仙侠',
        length_target: 'epic',
        synopsis: seed.synopsis,
        reference_config: { project_seed: seed },
        auto_materialize_seed: true,
      },
    })

    expect(response.statusCode).toBe(200)
    const chapters = await listNovelChapters(workspace, response.body.id)
    expect(chapters.map(chapter => chapter.title)).toEqual(['蛾虫入药', '旧经生疑'])
    expect(chapters[0].raw_payload.story_function).toBe('伏笔回收')
    expect(chapters[1].raw_payload.story_function).toBe('更大地图')
  })

  test('project seed draft routes save list and delete reusable deep draft seeds', async () => {
    const workspace = await tempDir('mangaforge-novel-seed-drafts-')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)

    const createDraft = handlers.get('POST /api/novel/project-seed/drafts')
    const listDrafts = handlers.get('GET /api/novel/project-seed/drafts')
    const deleteDraft = handlers.get('DELETE /api/novel/project-seed/drafts/:id')
    expect(createDraft).toBeTruthy()
    expect(listDrafts).toBeTruthy()
    expect(deleteDraft).toBeTruthy()

    const seed = {
      title: '剑烛大荒',
      genre: '玄幻',
      chapter_outlines: [{ chapter_no: 1, title: '蛾虫入药', summary: '丁松言发现药性异常。' }],
    }
    const created = await callRoute(createDraft, {
      body: {
        title: '剑烛大荒首轮草稿',
        idea: '丁松言在药铺发现山海经异兽秘传。',
        seed,
        review_model: { basics: { title: '剑烛大荒' } },
        diagnostics: { status: 'needs_model_expansion' },
        model_id: 7,
      },
    })
    expect(created.statusCode).toBe(200)
    expect(created.body.draft.id).toBeGreaterThan(0)
    expect(created.body.draft.seed.chapter_outlines[0].title).toBe('蛾虫入药')

    const listed = await callRoute(listDrafts)
    expect(listed.statusCode).toBe(200)
    expect(listed.body.drafts).toHaveLength(1)
    expect(listed.body.drafts[0].title).toBe('剑烛大荒首轮草稿')
    expect(listed.body.drafts[0].seed.title).toBe('剑烛大荒')
    expect(listed.body.drafts[0].review_model.basics.title).toBe('剑烛大荒')

    const deleted = await callRoute(deleteDraft, { params: { id: String(created.body.draft.id) } })
    expect(deleted.statusCode).toBe(200)
    expect(deleted.body.ok).toBe(true)

    const afterDelete = await callRoute(listDrafts)
    expect(afterDelete.body.drafts).toHaveLength(0)
  })
})
