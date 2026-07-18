import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'fs/promises'
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

describe('novel workspace chapter query views', () => {
  test('keeps the default full contract, exposes a compact workspace projection, and returns the exact full row from detail', async () => {
    const workspace = await tempDir('mangaforge-novel-chapter-view-')
    const { createNovelChapter, createNovelProject, listNovelChapters } = await import('../novel')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const project = await createNovelProject(workspace, { title: '章节摘要体积回归' })
    const otherProject = await createNovelProject(workspace, { title: '其他项目' })
    const prose = '雨夜压住巷口。\n\n林澈抬手扣住门环，门后的人先开了口。'
    const largeSceneText = '动作、冲突、反馈与承接证据。'.repeat(120)
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 11,
      title: '门后的回声',
      chapter_goal: '接住上一章的地下通道悬念',
      chapter_summary: '林澈追到门后确认接头人身份',
      conflict: '接头人不肯交出证据',
      ending_hook: '门缝里滚出染血的铜牌',
      chapter_text: prose,
      scene_breakdown: Array.from({ length: 36 }, (_, index) => ({ scene_no: index + 1, detail: largeSceneText })),
      scene_list: Array.from({ length: 36 }, (_, index) => ({ scene_no: index + 1, detail: largeSceneText })),
      continuity_notes: Array.from({ length: 20 }, () => largeSceneText),
      raw_payload: { diagnostic_archive: largeSceneText.repeat(10) },
      status: 'draft',
    })

    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)
    const list = handlers.get('GET /api/novel/projects/:id/chapters')
    const detail = handlers.get('GET /api/novel/chapters/:chapterId')

    const defaultResponse = await callRoute(list, { params: { id: String(project.id) }, query: {} })
    const fullRows = await listNovelChapters(workspace, project.id)
    expect(defaultResponse.statusCode).toBe(200)
    expect(defaultResponse.body).toEqual(fullRows)

    const workspaceResponse = await callRoute(list, { params: { id: String(project.id) }, query: { view: 'workspace' } })
    expect(workspaceResponse.statusCode).toBe(200)
    expect(workspaceResponse.body).toHaveLength(1)
    expect(workspaceResponse.body[0]).toMatchObject({
      id: fullRows[0].id,
      project_id: project.id,
      chapter_no: 11,
      title: '门后的回声',
      has_prose: true,
      has_scene_plan: true,
      word_count: prose.replace(/\s/g, '').length,
    })
    expect(workspaceResponse.body[0]).not.toHaveProperty('chapter_text')
    expect(workspaceResponse.body[0]).not.toHaveProperty('scene_breakdown')
    expect(workspaceResponse.body[0]).not.toHaveProperty('scene_list')
    expect(workspaceResponse.body[0]).not.toHaveProperty('continuity_notes')
    expect(workspaceResponse.body[0]).not.toHaveProperty('items_in_play')
    expect(workspaceResponse.body[0]).not.toHaveProperty('foreshadowing')
    expect(workspaceResponse.body[0]).not.toHaveProperty('raw_payload')
    expect(JSON.stringify(workspaceResponse.body).length).toBeLessThan(JSON.stringify(defaultResponse.body).length * 0.1)

    const detailResponse = await callRoute(detail, { params: { chapterId: String(fullRows[0].id) }, query: { project_id: String(project.id) } })
    expect(detailResponse.statusCode).toBe(200)
    expect(detailResponse.body).toEqual(fullRows[0])

    const missingProjectResponse = await callRoute(detail, { params: { chapterId: String(fullRows[0].id) }, query: {} })
    expect(missingProjectResponse.statusCode).toBe(400)
    expect(missingProjectResponse.body).toMatchObject({ error_code: 'PROJECT_ID_REQUIRED' })

    const crossProjectResponse = await callRoute(detail, { params: { chapterId: String(fullRows[0].id) }, query: { project_id: String(otherProject.id) } })
    expect(crossProjectResponse.statusCode).toBe(404)
    expect(crossProjectResponse.body).toEqual({ error: 'chapter not found' })

    const invalidResponse = await callRoute(list, { params: { id: String(project.id) }, query: { view: 'workspace; DROP TABLE chapters' } })
    expect(invalidResponse.statusCode).toBe(400)
    expect(invalidResponse.body).toMatchObject({ error_code: 'INVALID_VIEW' })
    expect(await listNovelChapters(workspace, project.id)).toEqual(fullRows)
  })
})

describe('project seed local scaffold outlines', () => {
  test('detects generic fallback chapter titles as local scaffold', async () => {
    const { projectSeedOutlinesLookLikeLocalScaffold, projectSeedNeedsOutlineExpansion } = await import('./novel-core-routes')
    const scaffoldSeed = {
      synopsis: '有一句话故事',
      logline: '主角要破局',
      chapter_outlines: [
        { chapter_no: 1, title: '异常入局', summary: '江哲在日常位置撞见第一条异常规则' },
        { chapter_no: 2, title: '旧法失准', summary: '试图按旧经验处理危机' },
        { chapter_no: 3, title: '初次验证', summary: '完成第一次小规模验证' },
        { chapter_no: 4, title: '药铺夜问', summary: '安全地点在夜里变成审问场' },
        { chapter_no: 5, title: '伏藏试验', summary: '主动设计低风险试验' },
        { chapter_no: 6, title: '小镇追索', summary: '第一批追索者进入小镇' },
        { chapter_no: 7, title: '禁忌代价', summary: '使用规则会留下代价' },
        { chapter_no: 8, title: '残篇显影', summary: '核心物品第一次显形' },
      ],
      volume_outlines: [{ title: '开局规则验证', summary: '验证核心规则' }],
    }
    expect(projectSeedOutlinesLookLikeLocalScaffold(scaffoldSeed)).toBe(true)
    expect(projectSeedNeedsOutlineExpansion(scaffoldSeed)).toBe(true)
  })

  test('keeps unique story outlines out of scaffold detection', async () => {
    const { projectSeedOutlinesLookLikeLocalScaffold, projectSeedNeedsOutlineExpansion } = await import('./novel-core-routes')
    const uniqueSeed = {
      synopsis: '夜市规则超市',
      chapter_outlines: Array.from({ length: 10 }, (_, i) => ({
        chapter_no: i + 1,
        title: `夜市第${i + 1}笔交易`,
        summary: `江哲用第${i + 1}条摊位规则换一条活人线索，并支付对应代价。`,
        chapter_goal: `完成第${i + 1}次规则交易闭环`,
      })),
      volume_outlines: [{ title: '夜市立规', goal: '建立交易线' }],
    }
    expect(projectSeedOutlinesLookLikeLocalScaffold(uniqueSeed)).toBe(false)
    expect(projectSeedNeedsOutlineExpansion(uniqueSeed)).toBe(false)
  })
})

describe('project seed first30 model outlines', () => {
  test('first30 outline prompt forbids local template chapter titles and requires model-only chapters', async () => {
    const { buildProjectSeedFirst30OutlinePrompt } = await import('./novel-core-routes')
    const prompt = buildProjectSeedFirst30OutlinePrompt({
      title: '夜市诡闻',
      logline: '摊主用规则漏洞卖活路',
      synopsis: '江哲在夜市用交易规则对抗怪谈副本',
      protagonist: { name: '江哲', goal: '守住摊位与活人' },
      chapter_outlines: [{ chapter_no: 1, title: '异常入局', source: 'local_scaffold', scaffold: true }],
    }, '规则怪谈夜市', '夜市诡闻', 'long')
    expect(prompt).toContain('chapter_outlines')
    expect(prompt).toContain('禁止通用模板章名')
    expect(prompt).toContain('异常入局')
    expect(prompt).toContain('只为当前小说项目生成')
    expect(prompt).not.toContain('source": "local_scaffold"')
  })
})

describe('novel project seed prompt a', () => {
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

  test('asks seed generation to output oh-story creation contracts', async () => {
    const { buildProjectSeedPrompt } = await import('./novel-core-routes')

    const prompt = buildProjectSeedPrompt('双主角规则怪谈', '规则测试', 'epic')

    expect(prompt).toContain('target_reader_contract')
    expect(prompt).toContain('genre_positioning_contract')
    expect(prompt).toContain('mainline_definition_contract')
    expect(prompt).toContain('story_power_contract')
    expect(prompt).toContain('character_design_contract')
    expect(prompt).toContain('core_contract_radar')
    expect(prompt).toContain('reader_retention_contract')
    expect(prompt).toContain('longform_structure_contract')
    expect(prompt).toContain('写给谁看')
    expect(prompt).toContain('读者想看什么')
    expect(prompt).toContain('本章给什么')
    expect(prompt).toContain('拉长板而非补短板')
    expect(prompt).toContain('主线不等于升级')
    expect(prompt).toContain('主线是一件事')
    expect(prompt).toContain('升级是主角达成目标的行动')
    expect(prompt).toContain('故事五维')
    expect(prompt).toContain('有动作才是故事')
    expect(prompt).toContain('有始有终')
    expect(prompt).toContain('因果反馈')
    expect(prompt).toContain('三层标签')
    expect(prompt).toContain('强/中/弱关联')
    expect(prompt).toContain('角色卡')
    expect(prompt).toContain('金手指绑架人设')
    expect(prompt).toContain('当初吸引读者的卖点还在吗')
    expect(prompt).toContain('前300字')
    expect(prompt).toContain('一级/二级/三级')
    expect(prompt).toContain('五级大纲')
    expect(prompt).toContain('每卷目的')
    expect(prompt).toContain('顶层势力')
    expect(prompt).toContain('强主线')
    expect(prompt).toContain('弱主线')
    expect(prompt).toContain('明线')
    expect(prompt).toContain('暗线')
  })

  test('project seed prompt requires layered supporting and antagonist character pools', async () => {
    const { buildProjectSeedPrompt } = await import('./novel-core-routes')

    const prompt = buildProjectSeedPrompt('都市高武，底层学生靠碎片化金手指升级打怪挣钱', '拳证星河', 'epic')

    expect(prompt).toContain('primary_supporting')
    expect(prompt).toContain('secondary_supporting')
    expect(prompt).toContain('cameo_supporting')
    expect(prompt).toContain('antagonist_primary')
    expect(prompt).toContain('antagonist_arc')
    expect(prompt).toContain('antagonist_minor')
    expect(prompt).toContain('faction_agent')
    expect(prompt).toContain('antagonist_logic')
    expect(prompt).toContain('relationship_to_protagonist')
    expect(prompt).toContain('first_appearance_chapter')
  })

  test('project seed recovery prompt keeps layered character pool requirements', async () => {
    const { buildProjectSeedRecoveryPrompt } = await import('./novel-core-routes')

    const prompt = buildProjectSeedRecoveryPrompt(
      { title: '拳证星河', characters: [{ name: '周凛', role_type: 'protagonist' }] },
      { missing_fields: ['characters'] },
      '都市高武，底层学生靠碎片化金手指升级打怪挣钱',
      '拳证星河',
      'long',
    )

    expect(prompt).toContain('角色池分层')
    expect(prompt).toContain('primary_supporting')
    expect(prompt).toContain('antagonist_minor')
    expect(prompt).toContain('faction_agent')
  })

  test('injects oh-story genre catalog guidance into seed generation', async () => {
    const { buildProjectSeedPrompt } = await import('./novel-core-routes')

    const guaitanPrompt = buildProjectSeedPrompt('玩家被抽入规则副本，靠双主角互补通关', '规则测试', 'epic')
    const xianxiaPrompt = buildProjectSeedPrompt('废材剑修在仙侠宗门从低谷崛起', '剑烛大荒', 'long')

    expect(guaitanPrompt).toContain('genre_catalog_contract')
    expect(guaitanPrompt).toContain('oh_story_genre_catalog_v1')
    expect(guaitanPrompt).toContain('规则怪谈')
    expect(guaitanPrompt).toContain('玩家被抽入规则副本')
    expect(guaitanPrompt).toContain('背景故事→规则包装→通关线+dead end')
    expect(guaitanPrompt).toContain('别人死→主角装/破局→揭露→升华')
    expect(guaitanPrompt).toContain('智斗和金手指负责包合理外衣')
    expect(guaitanPrompt).toContain('每2000字至少一个悬念/反转/信息差钩子')

    expect(xianxiaPrompt).toContain('仙侠/玄幻')
    expect(xianxiaPrompt).toContain('力量体系清晰')
    expect(xianxiaPrompt).toContain('金手指独特有限制')
    expect(xianxiaPrompt).toContain('战斗有策略非纯数值')
    expect(xianxiaPrompt).toContain('地图逐层展开')
  })

  test('injects oh-story genre core mechanics into seed generation', async () => {
    const { buildProjectSeedPrompt } = await import('./novel-core-routes')

    const prompt = buildProjectSeedPrompt('都市高武，底层学生靠碎片化金手指升级打怪挣钱', '拳证星河', 'epic')

    expect(prompt).toContain('genre_core_mechanics_contract')
    expect(prompt).toContain('oh_story_genre_core_mechanics_v1')
    expect(prompt).toContain('主题(立意)→题材核心(吸引力)→核心情绪(体验链条)')
    expect(prompt).toContain('每章至少有期待点或爽点之一')
    expect(prompt).toContain('微创新不超3个')
    expect(prompt).toContain('纵向+横向+交叉')
    expect(prompt).toContain('金手指类型与世界观压迫特征对应')
    expect(prompt).toContain('常规升级流')
    expect(prompt).toContain('碎片化/解锁型')
    expect(prompt).toContain('后一个爽点在影响力/层级/收获/认知至少一个维度上超过前一个')
  })

  test('injects oh-story plot special topics into seed generation', async () => {
    const { buildProjectSeedPrompt } = await import('./novel-core-routes')

    const prompt = buildProjectSeedPrompt('都市高武，底层学生靠抽卡系统升级打怪挣钱，三万字上架高潮打全国联考', '拳证星河', 'epic')

    expect(prompt).toContain('plot_special_topics_contract')
    expect(prompt).toContain('oh_story_plot_special_topics_v1')
    expect(prompt).toContain('金手指拆分成面板/不倒退/重复提升')
    expect(prompt).toContain('条件-反馈模型')
    expect(prompt).toContain('所有目标必须和钱挂钩')
    expect(prompt).toContain('高中->大学，武馆->天下第一武道会')
    expect(prompt).toContain('题材边界')
    expect(prompt).toContain('同平台、同题材、同类型')
    expect(prompt).toContain('三万字内无关卡点的装逼打脸一个字不要写')
  })

  test('routes remaining oh-story genre catalog frameworks into creation contracts', async () => {
    const { buildOhStoryGenreCatalogContract } = await import('./novel-genre-catalog')

    const cases = [
      ['丈夫出轨转移财产，妻子觉醒独立', '小三/婚恋', '发现过程要有悬念'],
      ['极品亲戚欺压老实人，熟人社会里恶有恶报', '世情', '靠细节不靠大事件'],
      ['女主被虐至死，男主死后追悔莫及', '死人文学', '核心是来不及'],
      ['霸总特殊相遇后极致宠溺，闺蜜震惊', '霸总/甜宠', '甜的密度决定粘性'],
      ['独特金手指聊天群脑洞文，靠创意设定做核心卖点', '脑洞文', '核心梗决定赛道'],
      ['凡人流修仙，主角无天赋靠谨慎算计生存', '凡人流', '利弊权衡是核心模式'],
      ['穿越到架空历史节点，利用现代知识改变命运', '历史/架空历史', '现代认知信息差=最大金手指'],
      ['同人流派，在已知世界加入新变量并改写名场面', '同人流派', '已知世界 + 新变量 + 名场面改写'],
      ['长生流主角看沧海桑田和代际传承', '长生流', '凡俗时期最好看'],
      ['无限流每个游戏副本二十章自成故事', '无限流', '20-30章一个副本'],
      ['西幻骑士文，从铁匠学徒靠骑士晋升体系崛起', '西幻/骑士文', '骑士自带晋升属性'],
      ['新媒体文，第一情绪对是不爽到装逼解气', '新媒体文', '一切为情绪服务'],
      ['搞笑文主角玩梗但必须符合逻辑', '搞笑文', '搞笑必须符合逻辑'],
      ['悬疑故事靠铺垫和氛围推进真相', '悬疑', '信息释放节奏要控好'],
      ['后悔流，不写退婚老套外衣，后悔对象换成事业选择', '后悔流', '后悔对象可从爱情转为事业选择'],
    ] as const

    for (const [idea, framework, expected] of cases) {
      const contract = buildOhStoryGenreCatalogContract(idea)
      const serialized = JSON.stringify(contract)
      expect(contract.matched_framework).toBe(framework)
      expect(serialized).toContain(expected)
      expect(contract.quality_checks.join('｜')).toContain('每2000字至少一个悬念/反转/信息差钩子')
    }
  })

  test('preserves model generated creation contracts while recovering project seeds', async () => {
    const { buildRecoverableProjectSeed } = await import('./novel-core-routes')

    const recovered = buildRecoverableProjectSeed({
      title: '灰域双生',
      genre: '都市规则怪谈',
      synopsis: '双主角进入灰域规则副本。',
      logline: '一个负责打到怪物露出规则，一个负责拆出胜利条件。',
      worldbuilding: { world_summary: '灰域污染现实地点。' },
      protagonist: { name: '林野', goal: '打穿灰域' },
      commercial_positioning: {
        platform: '番茄',
        reader_promise: '每章都有规则发现、代价压力和反制爽点。',
        selling_points: ['莽夫破局', '规则分析'],
        risks: ['不能写成纯打怪'],
      },
      writing_bible: {
        target_reader_contract: { reader_profile: '番茄男频规则怪谈读者' },
        genre_positioning_contract: { genre_tags: ['都市规则怪谈'] },
        core_contract_radar: { must_serve: ['规则发现'] },
        reader_retention_contract: { opening_hook_rule: '前300字承接上一章压力' },
      },
      volume_outlines: [{ title: '第一卷', summary: '员工餐厅副本' }],
      chapter_outlines: [{ chapter_no: 1, title: '午夜入职', summary: '读到第一份规则' }],
    }, '双主角规则怪谈', '灰域双生', 'epic')

    expect(recovered.seed.commercial_positioning.platform).toBe('番茄')
    expect(recovered.seed.commercial_positioning.reader_promise).toContain('每章都有规则发现')
    expect(recovered.seed.commercial_positioning.risks.join('｜')).toContain('不能写成纯打怪')
    expect(recovered.seed.writing_bible.target_reader_contract.reader_profile).toContain('番茄男频')
    expect(recovered.seed.writing_bible.genre_positioning_contract.genre_tags.join('｜')).toContain('都市规则怪谈')
    expect(recovered.seed.writing_bible.core_contract_radar.must_serve.join('｜')).toContain('规则发现')
    expect(recovered.seed.writing_bible.reader_retention_contract.opening_hook_rule).toContain('前300字')
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
    // 分卷/前30章细纲必须由模型生成，本地恢复草稿不再注入模板章纲。
    expect(recovered.seed.volume_outlines || []).toEqual([])
    expect(recovered.seed.chapter_outlines || []).toEqual([])
    expect(recovered.seed.seed_diagnostics.status).toBe('needs_model_expansion')
    expect(recovered.seed.seed_diagnostics.retained_fragments.join('\n')).toContain('蛾虫')
    expect(recovered.seed.seed_diagnostics.missing_fields).toContain('main_conflict')
  })

  test('does not inject local scaffold chapter outlines into recoverable seeds', async () => {
    const { buildRecoverableProjectSeed, stripLocalScaffoldOutlines, projectSeedOutlinesLookLikeLocalScaffold } = await import('./novel-core-routes')
    const recovered = buildRecoverableProjectSeed(
      {
        title: '剑烛大荒',
        genre: '玄幻',
        chapter_outlines: [
          { chapter_no: 1, title: '异常入局', summary: '江哲在日常位置撞见第一条异常规则', source: 'local_scaffold', scaffold: true },
          { chapter_no: 2, title: '药铺夜问', summary: '安全地点在夜里变成审问场', source: 'local_scaffold', scaffold: true },
        ],
        volume_outlines: [
          { title: '开局规则验证', summary: '验证核心规则', source: 'local_scaffold', scaffold: true },
        ],
      },
      '丁松言在边陲药铺发现蛾虫药性与《山海经》记载不一致，楚天行追索残篇，大荒规则开始反噬。',
      '剑烛大荒',
      'epic',
      { content: '已有线索：丁松言、蛾虫、山海经、边陲药铺、楚天行、残篇。' },
    )

    expect(recovered.seed.chapter_outlines || []).toEqual([])
    expect(recovered.seed.volume_outlines || []).toEqual([])
    const stripped = stripLocalScaffoldOutlines({
      chapter_outlines: [
        { chapter_no: 1, title: '异常入局', summary: '江哲在日常位置撞见第一条异常规则' },
        { chapter_no: 2, title: '夜市第一笔交易', summary: '江哲用摊位规则换一条活路' },
      ],
    })
    expect(stripped.chapter_outlines).toHaveLength(1)
    expect(stripped.chapter_outlines[0].title).toBe('夜市第一笔交易')
    expect(projectSeedOutlinesLookLikeLocalScaffold({
      chapter_outlines: Array.from({ length: 8 }, (_, i) => ({ chapter_no: i + 1, title: '异常入局', summary: '日常位置撞见异常规则' })),
    })).toBe(true)
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

    // 伏笔改由模型生成；repair 不再注入本地固定伏笔模板。
    expect(repaired.foreshadowing_plan || []).toEqual([])
    expect(repaired.author_confirmations.length).toBeGreaterThanOrEqual(3)
    expect(repaired.author_confirmations[0].answer).toContain('丁松言')
    expect(repaired.open_questions).toEqual([])
    expect(repaired.seed_diagnostics.generated_fields || []).not.toContain('foreshadowing_plan')
    expect(repaired.seed_diagnostics.generated_fields).toContain('author_confirmations')
  })

  test('adds ready project creation director after repairing a complete project seed', async () => {
    const { repairProjectSeedGaps } = await import('./novel-core-routes')

    const repaired = repairProjectSeedGaps(completeProjectSeed(), '星火令边境学院升级文。')

    expect(repaired.oh_story_director.stage).toBe('project_creation')
    expect(repaired.oh_story_director.readiness).toBe('ready')
    expect(repaired.oh_story_director.primary_action.key).toBe('enter_workspace')
    expect(repaired.oh_story_director.primary_action.mode).toBeTruthy()
    expect(repaired.ohStoryDirector).toEqual(repaired.oh_story_director)
  })

  test('asks for user confirmation when repaired project seed still lacks main conflict', async () => {
    const { repairProjectSeedGaps } = await import('./novel-core-routes')
    const seed = completeProjectSeed({ main_conflict: '' })

    const repaired = repairProjectSeedGaps(seed, '星火令边境学院升级文。')

    expect(repaired.oh_story_director.readiness).toBe('needs_user_confirmation')
    expect(repaired.oh_story_director.primary_action.key).toBe('ask_user_confirmation')
    expect(repaired.oh_story_director.required_repairs.map((item: any) => item.key)).toContain('main_conflict')
  })

  test('recomputes project seed director after auto-create fills the requested title', async () => {
    const workspace = await tempDir('mangaforge-novel-auto-create-director-title-')
    const { registerNovelCoreRoutes } = await import('./novel-core-routes')
    const { app, handlers } = createRouteHarness()
    registerNovelCoreRoutes(app as any, () => workspace)
    const autoCreate = handlers.get('POST /api/novel/projects/auto-create')
    expect(autoCreate).toBeTruthy()

    const seed = completeProjectSeed({ title: '' })
    const response = await callRoute(autoCreate, {
      body: {
        title: '星火令',
        idea: '星火令边境学院升级文。',
        length_target: 'medium',
        seed,
      },
    })

    expect(response.statusCode).toBe(200)
    const projectSeed = response.body.project.reference_config.project_seed
    expect(projectSeed.title).toBe('星火令')
    expect(projectSeed.oh_story_director.required_repairs.map((item: any) => item.key)).not.toContain('title')
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

  test('recovers project seeds with circular raw payloads', async () => {
    const { buildRecoverableProjectSeed } = await import('./novel-core-routes')
    const rawPayload: any = {
      title: '循环种子',
      synopsis: '陆珩捡到能记录灾厄回声的旧铜铃。',
      protagonist: { name: '陆珩', goal: '查清铜铃来源' },
      worldbuilding: { world_summary: '灾厄回声会把旧案投射到现实。' },
    }
    rawPayload.self = rawPayload

    const recovered = buildRecoverableProjectSeed({
      title: '循环种子',
      raw_payload: rawPayload,
    }, '陆珩靠旧铜铃调查灾厄回声。', '循环种子')

    expect(recovered.seed.title).toBe('循环种子')
    expect(recovered.seed.protagonist.name).toBe('陆珩')
    expect(recovered.seed.raw_payload.self).toBe('[Circular]')
  })

})
