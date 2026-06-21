import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

let workspaces: string[] = []

async function tempDir(prefix: string) {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  workspaces.push(dir)
  return dir
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

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
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

describe('novel project seed prompt', () => {
  test('uses the selected length target to shape incubation decisions', async () => {
    const { buildProjectSeedPrompt } = await import('./novel-core-routes')

    const shortPrompt = buildProjectSeedPrompt('双主角规则怪谈', '规则测试', 'short')
    const epicPrompt = buildProjectSeedPrompt('双主角规则怪谈', '规则测试', 'epic')

    expect(shortPrompt).toContain('用户指定篇幅：short')
    expect(shortPrompt).toContain('不要强行扩展为多卷长篇')
    expect(epicPrompt).toContain('用户指定篇幅：epic')
    expect(epicPrompt).toContain('300万字以上')
    expect(epicPrompt).toContain('长期追读')
  })

  test('rejects sparse seeds that would render an empty deep draft review', async () => {
    const { hasUsableProjectSeed } = await import('./novel-core-routes')

    expect(hasUsableProjectSeed({
      title: '怪谈副本里，一个莽夫一个脑子',
      genre: '都市',
      length_target: 'epic',
    })).toBe(false)

    expect(hasUsableProjectSeed({
      title: '怪谈副本里，一个莽夫一个脑子',
      genre: '都市',
      synopsis: '双主角穿越原创规则怪谈世界，一个负责武力战斗和搞笑，一个负责破解规则。',
      worldbuilding: { world_summary: '灰域会把现实地点污染成怪谈副本。' },
      protagonist: { name: '林野', identity: '武力担当', goal: '打穿副本' },
      volume_outlines: [{ title: '午夜员工餐厅', summary: '建立双主角搭档模式' }],
      chapter_outlines: [{ chapter_no: 1, title: '午夜入职', summary: '读到第一份规则' }],
    })).toBe(true)
  })

  test('turns a thin but useful model return into a recoverable deep draft seed', async () => {
    const { buildRecoverableProjectSeed, hasUsableProjectSeed } = await import('./novel-core-routes')
    const idea = [
      '蛾虫，食之擅伏蜇藏，含沙射人。',
      '这个世界的秘传山海经怎么和我上辈子看得不太一样？',
      '丁松靠辨认异兽食性与禁忌，在大荒遗迹里修炼。'
    ].join('\n')

    const recovered = buildRecoverableProjectSeed(
      { title: '剑烛大荒', genre: '仙侠', raw_payload: { note: '模型只吐出异兽、山海经、丁松三个线索。' } },
      idea,
      '剑烛大荒',
      'epic',
      { content: '丁松发现蛾虫可伏藏，食之可避天敌，山海经秘传因此牵出大荒遗迹。' },
    )

    expect(hasUsableProjectSeed(recovered.seed)).toBe(true)
    expect(recovered.seed.title).toBe('剑烛大荒')
    expect(recovered.seed.length_target).toBe('epic')
    expect(recovered.seed.synopsis).toContain('丁松')
    expect(recovered.seed.worldbuilding.world_summary).toContain('山海经')
    expect(recovered.seed.protagonist.goal).toContain('大荒')
    expect(recovered.seed.volume_outlines.length).toBeGreaterThanOrEqual(5)
    expect(recovered.seed.chapter_outlines.length).toBeGreaterThanOrEqual(10)
    expect(recovered.seed.seed_diagnostics.status).toBe('needs_model_expansion')
    expect(recovered.seed.seed_diagnostics.retained_fragments.join('\n')).toContain('蛾虫')
    expect(recovered.seed.seed_diagnostics.missing_fields).toContain('main_conflict')
  })

  test('builds varied local fallback chapters instead of repeated pressure templates', async () => {
    const { buildRecoverableProjectSeed } = await import('./novel-core-routes')
    const recovered = buildRecoverableProjectSeed(
      { title: '剑烛大荒', genre: '玄幻' },
      '丁松言在边陲药铺发现蛾虫药性与《山海经》记载不一致，楚天行追索残篇，大荒规则开始反噬。',
      '剑烛大荒',
      'epic',
      { content: '已有线索：丁松言、蛾虫、山海经、边陲药铺、楚天行、残篇。' },
    )

    const chapterTitles = recovered.seed.chapter_outlines.slice(0, 30).map((item: any) => String(item.title || ''))
    const chapterSummaries = recovered.seed.chapter_outlines.slice(0, 30).map((item: any) => String(item.summary || item.chapter_goal || ''))
    const volumeTitles = recovered.seed.volume_outlines.map((item: any) => String(item.title || ''))
    const structuralLabels = ['逼问真相', '反向设局', '伏笔回收', '镇外大火', '首卷决战', '更大地图', '大荒开门']

    expect(chapterTitles.some(title => /第\d+章压力升级/.test(title))).toBe(false)
    expect(chapterTitles.filter(title => structuralLabels.includes(title))).toEqual([])
    expect(recovered.seed.chapter_outlines[25].story_function).toBe('伏笔回收')
    expect(chapterSummaries.some(summary => /在已有线索基础上推进规则验证、人物关系和阶段冲突/.test(summary))).toBe(false)
    expect(new Set(chapterSummaries).size).toBeGreaterThanOrEqual(12)
    expect(volumeTitles.some(title => /第\d+阶段长线扩容/.test(title))).toBe(false)
    expect(new Set(volumeTitles).size).toBe(volumeTitles.length)
  })

  test('repairs zero foreshadowing and turns confirmation gaps into usable seed assets', async () => {
    const { repairProjectSeedGaps } = await import('./novel-core-routes')
    const seed = {
      title: '剑烛大荒',
      genre: '仙侠',
      length_target: 'epic',
      synopsis: '丁松言从边陲药铺发现山海经异兽食性与此世规则不一致，并被楚天行追索残篇。',
      logline: '丁松言用山海经知识破解大荒异兽规则。',
      protagonist: { name: '丁松言', identity: '边陲药铺学徒', goal: '破解大荒规则并守住自己的知识来源' },
      antagonist: { name: '楚天行', identity: '大荒宗门首席', goal: '夺取山海经残篇' },
      worldbuilding: { world_summary: '大荒异兽食性、禁忌和残篇共同构成修炼规则。', power_system: '辨认异兽食性并承担禁忌代价。' },
      volume_outlines: [
        { title: '药铺异兽案', summary: '丁松言在边陲药铺识破蛾虫药性。' },
        { title: '山海残篇', summary: '楚天行追索残篇，逼丁松言暴露知识来源。' },
      ],
      chapter_outlines: Array.from({ length: 30 }, (_, index) => ({
        chapter_no: index + 1,
        title: `第${index + 1}章`,
        summary: index === 0 ? '丁松言发现蛾虫药性异常。' : `第${index + 1}章推进异兽规则和楚天行压力。`,
        ending_hook: `第${index + 1}章钩子`,
      })),
      foreshadowing_plan: [],
      open_questions: [
        '请确认丁松言的最终欲望、道德底线和不可退让目标。',
        '请确认核心规则的代价、禁忌和长期扩容边界。',
        '请确认第一卷读者最期待的爽点回报是什么。',
      ],
    }

    const repaired = repairProjectSeedGaps(seed, '丁松言靠山海经异兽食性在大荒升级。')

    expect(repaired.foreshadowing_plan.length).toBeGreaterThanOrEqual(8)
    expect(repaired.foreshadowing_plan[0].plant_at).toContain('第1章')
    expect(repaired.foreshadowing_plan[0].payoff_at).toBeTruthy()
    expect(repaired.foreshadowing_plan[0].description).toContain('丁松言')
    expect(repaired.author_confirmations.length).toBeGreaterThanOrEqual(3)
    expect(repaired.author_confirmations[0].answer).toContain('丁松言')
    expect(repaired.open_questions).toEqual([])
    expect(repaired.seed_diagnostics.generated_fields).toContain('foreshadowing_plan')
    expect(repaired.seed_diagnostics.generated_fields).toContain('author_confirmations')
  })

  test('preserves real protagonist antagonist and nested outlines during thin seed recovery', async () => {
    const { buildRecoverableProjectSeed } = await import('./novel-core-routes')
    const recovered = buildRecoverableProjectSeed(
      {
        title: '剑烛大荒',
        genre: '仙侠',
        synopsis: '丁松言穿越大荒边陲，从药铺学徒身份发现山海经异兽秘传与现实记忆存在偏差。',
        protagonist: {
          name: '丁松言',
          identity: '现代地球穿越者，原为民俗学研究生，精通《山海经》及上古神话体系，穿越到异世成为边陲小镇药铺学徒',
          goal: '验证山海经异兽食性，找到回到故乡或掌控大荒规则的方法',
        },
        antagonist: {
          name: '楚天行（首席反派，后期揭示为多重身份）',
          identity: '大荒宗门首席，暗中追索山海经残篇',
          goal: '夺取丁松言掌握的异兽知识',
        },
        master_outline: {
          volume_outlines: [
            { title: '药铺异兽案', summary: '丁松言从边陲药铺识破蛾虫药性，牵出第一批大荒势力。' },
            { title: '山海残篇', summary: '楚天行入局，逼迫丁松言公开或隐藏山海经知识。' },
          ],
          chapter_outlines: [
            { chapter_no: 1, title: '蛾虫入药', summary: '丁松言发现药铺里的蛾虫与记忆中的山海经不一致。' },
            { chapter_no: 2, title: '楚天行来镇', summary: '楚天行第一次露面，试探丁松言的异兽知识。' },
          ],
        },
      },
      '怎么凭借独特线索闯入剑烛大荒，把看似零散的世界规则变成持续升级的生存与修炼优势。',
      '剑烛大荒',
      'epic',
      { content: '怎么在已有线索基础上推进至仙山？' },
    )

    expect(recovered.seed.protagonist.name).toBe('丁松言')
    expect(recovered.seed.antagonist.name).toBe('楚天行（首席反派，后期揭示为多重身份）')
    expect(recovered.seed.logline).toContain('丁松言')
    expect(recovered.seed.logline).not.toContain('怎么凭借')
    expect(recovered.seed.characters.map((item: any) => item.name)).toContain('丁松言')
    expect(recovered.seed.characters.map((item: any) => item.name)).toContain('楚天行（首席反派，后期揭示为多重身份）')
    expect(recovered.seed.characters.map((item: any) => item.name)).not.toContain('怎么')
    expect(recovered.seed.volume_outlines[0].title).toBe('药铺异兽案')
    expect(recovered.seed.chapter_outlines[0].title).toBe('蛾虫入药')
  })

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
    const source = await readFile(join(import.meta.dir, 'novel-core-routes.ts'), 'utf8')
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
    const source = await readFile(join(import.meta.dir, 'novel-core-routes.ts'), 'utf8')
    const finalizeStart = source.indexOf("app.post('/api/novel/project-seed/finalize'")
    const autoCreateStart = source.indexOf("app.post('/api/novel/projects/auto-create'", finalizeStart)
    const finalizeBlock = source.slice(finalizeStart, autoCreateStart)

    expect(finalizeBlock).toContain('create_project')
    expect(finalizeBlock).toContain('createProjectFromSeed')
    expect(finalizeBlock).toContain('project_id')
    expect(finalizeBlock).toContain('seed_materialization')
  })

  test('finalize route allows explicit author confirmation to create a review-needed seed', async () => {
    const source = await readFile(join(import.meta.dir, 'novel-core-routes.ts'), 'utf8')
    const finalizeStart = source.indexOf("app.post('/api/novel/project-seed/finalize'")
    const autoCreateStart = source.indexOf("app.post('/api/novel/projects/auto-create'", finalizeStart)
    const finalizeBlock = source.slice(finalizeStart, autoCreateStart)

    expect(finalizeBlock).toContain('author_confirmed')
    expect(finalizeBlock).toContain('confirmed_by_author')
    expect(finalizeBlock).toContain('!authorConfirmed')
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
