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

  test('adds ready project creation director after repairing a complete project seed', async () => {
    const { repairProjectSeedGaps } = await import('./novel-core-routes')

    const repaired = repairProjectSeedGaps(completeProjectSeed(), '星火令边境学院升级文。')

    expect(repaired.oh_story_director.stage).toBe('project_creation')
    expect(repaired.oh_story_director.readiness).toBe('ready')
    expect(repaired.oh_story_director.primary_action.key).toBe('enter_workspace')
    expect(repaired.oh_story_director.primary_action.mode).toBeTruthy()
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
