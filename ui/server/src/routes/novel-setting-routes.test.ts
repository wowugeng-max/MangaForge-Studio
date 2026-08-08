import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  applySettingRelationshipRepairPatches,
  applyDiscoveredAssetsToProject,
  buildPendingStateUpdates,
  buildSettingAgentPrompt,
  buildSettingRelationshipRepairPrompt,
  normalizeSettingConsistencyStateUpdatesPayload,
  normalizeSettingAgentPayload,
  normalizeSettingRelationshipRepairPayload,
  normalizeSettingUsagePayload,
  registerNovelSettingRoutes,
  SETTING_TYPES,
} from './novel-setting-routes'
import {
  createNovelChapter,
  createNovelProject,
  createNovelSettingEntity,
  getNovelProject,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelSettingEntities,
} from '../novel'
import { ChapterSourceLeaseRegistry } from '../novel-writing-service/generation-source/chapter-source-lease'
import { createChapterAuthorityFence } from '../novel-writing-service/generation-source/create-generation-source'

function settingRouteHarness() {
  const handlers = new Map<string, any>()
  const app = {
    get: (path: string, handler: any) => { handlers.set(`GET ${path}`, handler); return app },
    post: (path: string, handler: any) => { handlers.set(`POST ${path}`, handler); return app },
    put: (path: string, handler: any) => { handlers.set(`PUT ${path}`, handler); return app },
    delete: (path: string, handler: any) => { handlers.set(`DELETE ${path}`, handler); return app },
  }
  return { app, handlers }
}

async function callSettingRoute(handler: any, req: any) {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler(req, res)
  return res
}

function settingDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(resolvePromise => { resolve = resolvePromise })
  return { promise, resolve }
}


function settingHelpersSource() {
  const dir = import.meta.dir
  const files = readdirSync(dir)
    .filter((name) => name === 'novel-setting-helpers.ts' || (name.startsWith('novel-setting-helpers-') && name.endsWith('.ts') && !name.endsWith('.test.ts')))
    .sort()
  return files.map((name) => readFileSync(join(dir, name), 'utf8')).join('\n')
}

describe('setting agent workflow', () => {
  test('exposes storyline setting entity types', () => {
    expect(SETTING_TYPES).toEqual(expect.arrayContaining([
      'mainline',
      'subplot',
      'character_arc',
      'relationship_arc',
      'faction_arc',
      'foreshadowing_arc',
    ]))
  })

  test('asks a dedicated setting agent to build longform setting systems', () => {
    const prompt = buildSettingAgentPrompt(
      { title: '超人的规则怪谈世界', length_target: 'epic' },
      [{ world_summary: '规则怪谈副本污染现实。', rules: ['违反规则会付出代价'] }],
      [{ name: '李辰', abilities: [{ name: '钢铁之躯', cost: '消耗日光储备' }] }],
      [{ outline_type: 'chapter', title: '第1章 双魂降临', summary: '进入死亡公寓。' }],
    )

    expect(prompt).toContain('setting-agent')
    expect(prompt).toContain('能力体系')
    expect(prompt).toContain('境界/等级体系')
    expect(prompt).toContain('物品体系')
    expect(prompt).toContain('势力体系')
    expect(prompt).toContain('Boss/反派阶梯')
    expect(prompt).toContain('剧情线工坊')
    expect(prompt).toContain('主线')
    expect(prompt).toContain('支线')
    expect(prompt).toContain('角色线')
    expect(prompt).toContain('感情/关系线')
    expect(prompt).toContain('势力线')
    expect(prompt).toContain('伏笔线')
    expect(prompt).toContain('storylines')
    expect(prompt).toContain('mainlines')
    expect(prompt).toContain('subplots')
    expect(prompt).toContain('character_arcs')
    expect(prompt).toContain('settings')
  })

  test('normalizes setting-agent systems into setting entities', () => {
    const entities = normalizeSettingAgentPayload({
      ability_system: {
        abilities: [
          { name: '钢铁之躯', summary: '身体强度超越常人', cost: '消耗日光储备', limit: '规则压制时削弱', owner: '李辰' },
        ],
      },
      realm_system: {
        realms: [
          { name: '新人试炼者', summary: '刚进入规则副本的阶段', advancement_condition: '活过三个副本' },
        ],
      },
      item_system: {
        items: [
          { name: '公寓守则册', summary: '记录死亡公寓表层规则', owner_rule: '不得带出公寓' },
        ],
      },
      faction_system: {
        factions: [
          { name: '规则崇拜教团', summary: '供奉规则之源的地下组织', agenda: '扩大污染范围' },
        ],
      },
      boss_ladder: {
        bosses: [
          { name: '公寓管理员', summary: '卷一守关者', action_logic: '诱导玩家违反规则' },
        ],
      },
      rules: [{ name: '第零条规则', summary: '不可直视广播源头', consequence: '被规则标记' }],
      locations: [{ name: '死亡公寓', summary: '新人副本起点' }],
      foreshadowing: [{ name: '编织者低语', summary: '外神伏笔', payoff_chapter: 250 }],
      storylines: [{ entity_type: 'mainline', name: '打破规则牢笼', summary: '双主角逐步破解规则世界来源', priority: 1, start_chapter_no: 1, expected_payoff: '脱离无限副本' }],
      mainlines: [{ name: '规则之源调查', summary: '从副本异常追到外神编织者', advance_rule: '每卷必须获得一块真相拼图', forbidden_reveal: '不可提前揭露编织者真名' }],
      subplots: [{ name: '林晓求生支线', summary: '林晓从幸存者成长为队友', next_advance_chapter: 12 }],
      character_arcs: [{ name: '李辰蛮力到克制', summary: '从硬冲规则到学会配合张智', related_characters: ['李辰'] }],
      relationship_arcs: [{ name: '双主角信任线', summary: '李辰和张智建立战斗默契', payoff_status: 'building' }],
      faction_arcs: [{ name: '规则崇拜教团渗透', summary: '教团在各副本留下标记', related_factions: ['规则崇拜教团'] }],
      foreshadowing_arcs: [{ name: '第零条规则回收线', summary: '表层规则背后的隐藏条款', payoff_chapter: 45 }],
    }, 7)

    expect(entities.map(item => item.entity_type)).toEqual(expect.arrayContaining([
      'ability',
      'realm',
      'item',
      'faction',
      'boss',
      'rule',
      'location',
      'foreshadowing',
      'mainline',
      'subplot',
      'character_arc',
      'relationship_arc',
      'faction_arc',
      'foreshadowing_arc',
    ]))
    expect(entities.every(item => item.project_id === 7)).toBe(true)
    expect(entities.find(item => item.name === '钢铁之躯')?.constraints_json).toMatchObject({ cost: '消耗日光储备', limit: '规则压制时削弱' })
    expect(entities.find(item => item.name === '规则崇拜教团')?.constraints_json).toMatchObject({ agenda: '扩大污染范围' })
    expect(entities.find(item => item.name === '规则之源调查')?.constraints_json).toMatchObject({ advance_rule: '每卷必须获得一块真相拼图', forbidden_reveal: '不可提前揭露编织者真名' })
    expect(entities.find(item => item.name === '林晓求生支线')?.state_json).toMatchObject({ next_advance_chapter: 12 })
    expect(entities.find(item => item.name === '打破规则牢笼')?.payload_json).toMatchObject({ priority: 1, expected_payoff: '脱离无限副本' })
  })

  test('normalizes camelCase setting-agent systems into setting entities', () => {
    const entities = normalizeSettingAgentPayload({
      abilitySystem: {
        abilities: [
          { abilityName: '食兽感应', summary: '能感知妖兽弱点', cost: '消耗气血', owner: '丁松言' },
        ],
      },
      bossLadder: {
        bosses: [
          { bossName: '青帝遗影', summary: '远古残影压迫主线', actionLogic: '诱导主角吞噬禁兽' },
        ],
      },
      foreshadowingPlan: [
        { name: '青铜断齿', summary: '后续揭开食兽源头', payoffChapter: 80 },
      ],
      characterArcs: [
        { name: '丁松言食兽代价线', summary: '力量越强越接近兽化', relatedCharacters: ['丁松言'], nextAdvanceChapter: 8 },
      ],
      storylines: [
        { entityType: 'mainline', name: '食兽重构之路', summary: '主角重构武学体系', startChapterNo: 1, expectedPayoff: '建立新修行路' },
      ],
    }, 9)

    expect(entities.map(item => item.entity_type)).toEqual(expect.arrayContaining([
      'ability',
      'boss',
      'foreshadowing',
      'character_arc',
      'mainline',
    ]))
    expect(entities.find(item => item.name === '食兽感应')?.constraints_json).toMatchObject({ cost: '消耗气血' })
    expect(entities.find(item => item.name === '食兽感应')?.state_json).toMatchObject({ owner: '丁松言' })
    expect(entities.find(item => item.name === '青帝遗影')?.constraints_json).toMatchObject({ action_logic: '诱导主角吞噬禁兽' })
    expect(entities.find(item => item.name === '青铜断齿')?.state_json).toMatchObject({ payoff_chapter: 80 })
    expect(entities.find(item => item.name === '丁松言食兽代价线')?.state_json).toMatchObject({ next_advance_chapter: 8 })
    expect(entities.find(item => item.name === '丁松言食兽代价线')?.payload_json).toMatchObject({ related_characters: ['丁松言'] })
    expect(entities.find(item => item.name === '食兽重构之路')?.payload_json).toMatchObject({ start_chapter_no: 1, expected_payoff: '建立新修行路' })
  })

  test('uses setting-agent in the project setting incubation route', () => {
    const source = [readFileSync(join(import.meta.dir, 'novel-setting-routes.ts'), 'utf8'), settingHelpersSource()].join('\n')
    const routeStart = source.indexOf("app.post('/api/novel/projects/:id/settings/incubate-from-project'")
    const routeEnd = source.indexOf("app.post('/api/novel/chapters/:chapterId/settings-consistency-check'", routeStart)
    const routeBlock = source.slice(routeStart, routeEnd)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(routeBlock).toContain("executeNovelAgent('setting-agent'")
    expect(routeBlock).toContain('buildSettingAgentPrompt(')
    expect(routeBlock).toContain('normalizeSettingAgentPayload(')
  })

  test('exposes storyline incubation and chapter suggestion routes', () => {
    const source = [readFileSync(join(import.meta.dir, 'novel-setting-routes.ts'), 'utf8'), settingHelpersSource()].join('\n')

    expect(source).toContain("app.post('/api/novel/projects/:id/storylines/incubate'")
    expect(source).toContain("app.post('/api/novel/chapters/:chapterId/storylines/suggest'")
    expect(source).toContain('STORYLINE_TYPES')
    expect(source).toContain('advance')
    expect(source).toContain('payoff')
    expect(source).toContain('pause')
  })

  test('exposes a relationship graph route for setting assets', () => {
    const source = [readFileSync(join(import.meta.dir, 'novel-setting-routes.ts'), 'utf8'), settingHelpersSource()].join('\n')

    expect(source).toContain("app.get('/api/novel/projects/:id/settings/relationship-graph'")
    expect(source).toContain('buildSettingRelationshipGraph')
    expect(source).toContain('listNovelChapterSettingUsage')
    expect(source).toContain('listNovelCharacters')
    expect(source).toContain('listNovelChapters')
  })

  test('asks the setting agent for reviewable relationship repair patches', () => {
    const prompt = buildSettingRelationshipRepairPrompt(
      { title: '剑蚀大荒', length_target: 'epic' },
      [
        { id: 1, entity_type: 'boss', name: '青帝遗影', summary: '远古残影。' },
        { id: 2, entity_type: 'mainline', name: '食兽重构之路', summary: '主角重构武学体系。' },
        { id: 3, entity_type: 'character', name: '丁松言', summary: '主角。' },
      ],
      [
        { type: 'isolated_key_asset', entity_id: 1, entity_name: '青帝遗影', message: '还没有和其他核心资产建立关系' },
      ],
      { summary: { isolated_key_asset_count: 1 } },
    )

    expect(prompt).toContain('relationship repair')
    expect(prompt).toContain('只输出 JSON')
    expect(prompt).toContain('patches')
    expect(prompt).toContain('related_entity_ids')
    expect(prompt).toContain('state_owner')
    expect(prompt).toContain('payload_related_characters')
    expect(prompt).toContain('青帝遗影')
  })

  test('normalizes model relationship repair output into safe patch objects', () => {
    const settings = [
      { id: 1, entity_type: 'boss', name: '青帝遗影' },
      { id: 2, entity_type: 'mainline', name: '食兽重构之路' },
      { id: 3, entity_type: 'character', name: '丁松言' },
      { id: 4, entity_type: 'ability', name: '食兽感应' },
    ]

    const patches = normalizeSettingRelationshipRepairPayload({
      patches: [
        { source_id: 1, target_id: 2, patch_type: 'related_entity_ids', relation_type: 'mainline_pressure', reason: '青帝遗影是主线威胁源', confidence: 0.9 },
        { source_id: 4, target_id: 3, patch_type: 'state_owner', reason: '能力属于主角', confidence: 0.88 },
        { source_id: 2, target_id: 3, patch_type: 'payload_related_characters', reason: '主线围绕主角推进', confidence: 0.86 },
        { source_id: 999, target_id: 3, patch_type: 'related_entity_ids', reason: '不存在资产' },
        { source_id: 1, target_id: 1, patch_type: 'related_entity_ids', reason: '不能自连' },
      ],
    }, settings)

    expect(patches).toEqual([
      expect.objectContaining({ source_id: 1, target_id: 2, patch_type: 'related_entity_ids', source_name: '青帝遗影', target_name: '食兽重构之路', confidence: 0.9 }),
      expect.objectContaining({ source_id: 4, target_id: 3, patch_type: 'state_owner', source_name: '食兽感应', target_name: '丁松言', confidence: 0.88 }),
      expect.objectContaining({ source_id: 2, target_id: 3, patch_type: 'payload_related_characters', source_name: '食兽重构之路', target_name: '丁松言', confidence: 0.86 }),
    ])
  })

  test('rejects relationship repair patches that violate source and target type rules', () => {
    const settings = [
      { id: 1, entity_type: 'ability', name: '食兽感应' },
      { id: 2, entity_type: 'mainline', name: '食兽重构之路' },
      { id: 3, entity_type: 'character', name: '丁松言' },
      { id: 4, entity_type: 'realm', name: '初入食兽' },
      { id: 5, entity_type: 'faction', name: '青帝残庭' },
      { id: 6, entity_type: 'foreshadowing', name: '青铜断齿' },
    ]

    const patches = normalizeSettingRelationshipRepairPayload({
      patches: [
        { source_id: 1, target_id: 2, patch_type: 'state_owner', reason: '能力不能归属于主线' },
        { source_id: 2, target_id: 1, patch_type: 'state_abilities', reason: '主线不能挂能力状态' },
        { source_id: 3, target_id: 4, patch_type: 'state_realm', reason: '主角进入境界', confidence: 0.89 },
        { source_id: 3, target_id: 5, patch_type: 'state_faction', reason: '主角被势力接纳', confidence: 0.85 },
        { source_id: 2, target_id: 3, patch_type: 'payload_related_characters', reason: '主线围绕主角推进', confidence: 0.87 },
        { source_id: 2, target_id: 6, patch_type: 'payload_related_foreshadowing', reason: '主线埋下断齿伏笔', confidence: 0.83 },
        { source_id: 3, target_id: 6, patch_type: 'payload_related_foreshadowing', reason: '角色不是剧情线容器' },
      ],
    }, settings)

    expect(patches).toEqual([
      expect.objectContaining({ source_id: 3, target_id: 4, patch_type: 'state_realm' }),
      expect.objectContaining({ source_id: 3, target_id: 5, patch_type: 'state_faction' }),
      expect.objectContaining({ source_id: 2, target_id: 3, patch_type: 'payload_related_characters' }),
      expect.objectContaining({ source_id: 2, target_id: 6, patch_type: 'payload_related_foreshadowing' }),
    ])
  })

  test('accepts camelCase relationship repair payloads from model output', () => {
    const settings = [
      { id: 1, entity_type: 'boss', name: '青帝遗影' },
      { id: 2, entity_type: 'mainline', name: '食兽重构之路' },
      { id: 3, entity_type: 'character', name: '丁松言' },
    ]

    const patches = normalizeSettingRelationshipRepairPayload({
      relationshipPatches: [
        {
          sourceId: 1,
          targetId: 2,
          patchType: 'related_entity_ids',
          relationType: 'mainline_pressure',
          reason: '青帝遗影是主线威胁源',
          confidence: 0.91,
        },
        {
          entityId: 2,
          relatedName: '丁松言',
          patchType: 'payload_related_characters',
          relationType: 'protagonist_arc',
          rationale: '主线必须围绕主角推进',
          confidence: 0.87,
        },
      ],
    }, settings)

    expect(patches).toEqual([
      expect.objectContaining({ source_id: 1, target_id: 2, patch_type: 'related_entity_ids', relation_type: 'mainline_pressure', confidence: 0.91 }),
      expect.objectContaining({ source_id: 2, target_id: 3, patch_type: 'payload_related_characters', relation_type: 'protagonist_arc', reason: '主线必须围绕主角推进', confidence: 0.87 }),
    ])
  })

  test('applies relationship repair patches to fields consumed by the graph builder', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-relationship-repair-'))
    const project = await createNovelProject(workspace, { title: '剑蚀大荒', length_target: 'epic' })
    const boss = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'boss', name: '青帝遗影' } as any)
    const mainline = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'mainline', name: '食兽重构之路', payload_json: {} } as any)
    const protagonist = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'character', name: '丁松言', state_json: {} } as any)
    const ability = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'ability', name: '食兽感应', state_json: {} } as any)

    const result = await applySettingRelationshipRepairPatches(workspace, project.id, [
      { source_id: boss.id, target_id: mainline.id, patch_type: 'related_entity_ids', reason: '主线威胁源', confidence: 0.9 },
      { source_id: ability.id, target_id: protagonist.id, patch_type: 'state_owner', reason: '能力属于主角', confidence: 0.88 },
      { source_id: mainline.id, target_id: protagonist.id, patch_type: 'payload_related_characters', reason: '主线围绕主角推进', confidence: 0.86 },
    ])

    const settings = await listNovelSettingEntities(workspace, project.id)
    const updatedBoss = settings.find(item => item.id === boss.id)
    const updatedAbility = settings.find(item => item.id === ability.id)
    const updatedMainline = settings.find(item => item.id === mainline.id)

    expect(result.applied).toHaveLength(3)
    expect(updatedBoss?.related_entity_ids).toContain(mainline.id)
    expect(updatedAbility?.state_json).toMatchObject({ owner: '丁松言' })
    expect(updatedMainline?.payload_json?.related_characters).toContain('丁松言')
  })

  test('exposes relationship repair suggest and apply endpoints', () => {
    const source = [readFileSync(join(import.meta.dir, 'novel-setting-routes.ts'), 'utf8'), settingHelpersSource()].join('\n')

    expect(source).toContain("app.post('/api/novel/projects/:id/settings/relationship-repair/suggest'")
    expect(source).toContain("app.post('/api/novel/projects/:id/settings/relationship-repair/apply'")
    expect(source).toContain('buildSettingRelationshipRepairPrompt')
    expect(source).toContain('normalizeSettingRelationshipRepairPayload')
    expect(source).toContain('applySettingRelationshipRepairPatches')
  })

  test('accepts camelCase setting consistency state updates from review output', () => {
    const stateUpdates = normalizeSettingConsistencyStateUpdatesPayload({
      requiredStateUpdates: [
        {
          entityId: 5,
          actualStateChange: { owner: '丁松言', status: '暴露' },
          reason: '正文已经让主角获得食兽感应',
        },
      ],
    })
    const pending = buildPendingStateUpdates(
      stateUpdates,
      [{ id: 5, entity_type: 'ability', name: '食兽感应', summary: '感知妖兽弱点', state_json: { status: '隐藏' } }],
      [{ id: 9, entity_id: 5 }],
      { id: 11, chapter_no: 3 },
    )

    expect(pending).toEqual([
      expect.objectContaining({
        entity_id: 5,
        name: '食兽感应',
        usage_id: 9,
        actual_state_change: { owner: '丁松言', status: '暴露' },
        next_state: expect.objectContaining({ owner: '丁松言', status: '暴露', last_checked_chapter_no: 3 }),
        reason: '正文已经让主角获得食兽感应',
      }),
    ])
  })

  test('normalizes camelCase setting and storyline usage suggestions from model output', () => {
    expect(normalizeSettingUsagePayload({
      settingUsage: [
        {
          entityId: 8,
          usageType: 'required',
          revealLevel: 'partial',
          expectedStateChange: { owner: '丁松言' },
          actualStateChange: { status: '已使用' },
        },
      ],
    })).toEqual([
      expect.objectContaining({
        entity_id: 8,
        usage_type: 'required',
        required: true,
        allowed: true,
        forbidden: false,
        reveal_level: 'partial',
        expected_state_change: { owner: '丁松言' },
        actual_state_change: { status: '已使用' },
      }),
    ])

    expect(normalizeSettingUsagePayload({
      storylineUsage: [
        {
          storylineId: 13,
          usageType: 'advance',
          revealLevel: 'hint',
          expectedStateChange: { current_state: '进入第二阶段' },
        },
      ],
    })).toEqual([
      expect.objectContaining({
        entity_id: 13,
        usage_type: 'advance',
        required: true,
        allowed: true,
        reveal_level: 'hint',
        expected_state_change: { current_state: '进入第二阶段' },
      }),
    ])
  })
})

describe('setting model route authority fence', () => {
  test('legacy no-header model suggestion holds the shared lease and rejects a duplicate before provider re-entry', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-setting-suggest-fence-'))
    try {
      const project = await createNovelProject(workspace, { title: '设定调用围栏' })
      const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章' })
      const setting = await createNovelSettingEntity(workspace, {
        project_id: project.id,
        entity_type: 'rule',
        name: '夜禁规则',
        summary: '钟响后不得开门',
      } as any)
      const leases = new ChapterSourceLeaseRegistry()
      const providerStarted = settingDeferred<void>()
      const providerResponse = settingDeferred<any>()
      let providerCalls = 0
      const { app, handlers } = settingRouteHarness()
      registerNovelSettingRoutes(app as any, {
        getWorkspace: () => workspace,
        getProject: getNovelProject,
        withChapterAuthorityFence: createChapterAuthorityFence({ chapterSourceLeases: leases, readProject: getNovelProject }),
        executeNovelAgent: async () => {
          providerCalls += 1
          providerStarted.resolve()
          return providerResponse.promise
        },
        buildChapterContextPackage: async () => ({}),
      } as any)
      const handler = handlers.get('POST /api/novel/chapters/:chapterId/settings-usage/suggest')
      const request = {
        params: { chapterId: String(chapter.id) },
        query: {},
        headers: {},
        body: { project_id: project.id, model_id: 19, use_model: true, apply: true },
      }
      const first = callSettingRoute(handler, request)
      const started = await Promise.race([
        providerStarted.promise.then(() => true),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 40)),
      ])
      if (!started) {
        await first.catch(() => undefined)
        expect(started).toBe(true)
        return
      }

      expect(leases.isActive(workspace, project.id)).toBe(true)
      const duplicate = await callSettingRoute(handler, request)
      expect(duplicate.statusCode).toBe(409)
      expect(duplicate.body).toMatchObject({ error_code: 'GENERATION_SOURCE_BUSY' })
      expect(providerCalls).toBe(1)

      providerResponse.resolve({
        output: JSON.stringify({
          usage: [{ entity_id: setting.id, usage_type: 'required', required: true, allowed: true, forbidden: false, reveal_level: 'hint' }],
        }),
      })
      const completed = await first
      expect(completed.statusCode).toBe(200)
      expect(await listNovelChapterSettingUsage(workspace, project.id, chapter.id)).toHaveLength(1)
      expect(leases.isActive(workspace, project.id)).toBe(false)
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('both model setting routes reject stale and malformed headers before provider or writes', async () => {
    const routes = [
      {
        key: 'POST /api/novel/projects/:id/settings/incubate-from-project',
        params: (projectId: number) => ({ id: String(projectId) }),
        body: (projectId: number) => ({ project_id: projectId, model_id: 19, use_model: true }),
      },
      {
        key: 'POST /api/novel/chapters/:chapterId/settings-usage/suggest',
        params: (_projectId: number, chapterId: number) => ({ chapterId: String(chapterId) }),
        body: (projectId: number) => ({ project_id: projectId, model_id: 19, use_model: true, apply: true }),
      },
    ]
    for (const header of [`sha256:${'f'.repeat(64)}`, `sha256:${'A'.repeat(64)}`]) {
      for (const route of routes) {
        const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-setting-header-fence-'))
        try {
          const project = await createNovelProject(workspace, { title: '设定路由指纹围栏' })
          const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章' })
          await createNovelSettingEntity(workspace, {
            project_id: project.id,
            entity_type: 'rule',
            name: '原有规则',
            summary: '不可越界',
          } as any)
          const beforeSettings = await listNovelSettingEntities(workspace, project.id)
          let providerCalls = 0
          const leases = new ChapterSourceLeaseRegistry()
          const { app, handlers } = settingRouteHarness()
          registerNovelSettingRoutes(app as any, {
            getWorkspace: () => workspace,
            getProject: getNovelProject,
            withChapterAuthorityFence: createChapterAuthorityFence({ chapterSourceLeases: leases, readProject: getNovelProject }),
            executeNovelAgent: async () => { providerCalls += 1; return { output: '{}' } },
            buildChapterContextPackage: async () => ({}),
          } as any)
          let response: any
          try {
            response = await callSettingRoute(handlers.get(route.key), {
              params: route.params(project.id, chapter.id),
              query: {},
              headers: { 'x-chapter-generation-source-fingerprint': header },
              body: route.body(project.id),
            })
          } catch {
            response = { statusCode: 500, body: null }
          }

          expect(response.statusCode).toBe(409)
          expect(response.body).toMatchObject({ error_code: 'GENERATION_SOURCE_CHANGED' })
          expect(providerCalls).toBe(0)
          expect(await listNovelSettingEntities(workspace, project.id)).toEqual(beforeSettings)
          expect(await listNovelChapterSettingUsage(workspace, project.id, chapter.id)).toHaveLength(0)
        } finally {
          await rm(workspace, { recursive: true, force: true })
        }
      }
    }
  })
})

describe('asset route error handling', () => {
  const ASSET_ROUTE_KEYS = [
    'GET /api/novel/projects/:id/assets/overview',
    'GET /api/novel/projects/:id/assets/character-status',
    'GET /api/novel/projects/:id/assets/relations',
    'GET /api/novel/projects/:id/assets/gap-audit',
    'GET /api/novel/projects/:id/assets/intake-queue',
    'POST /api/novel/projects/:id/assets/intake-queue/apply',
    'GET /api/novel/chapters/:chapterId/assets/pack',
    'POST /api/novel/projects/:id/assets/backfill-from-prose',
    'GET /api/novel/projects/:id/assets/story-relations',
    'GET /api/novel/projects/:id/assets/foreshadow-lifecycle',
    'GET /api/novel/projects/:id/assets/chapter-brief',
    'POST /api/novel/projects/:id/assets/story-relations/materialize',
    'POST /api/novel/projects/:id/assets/fill-gaps',
  ]

  function createRouteHarness() {
    const handlers = new Map<string, any>()
    const register = (method: string, path: string, handler: any) => {
      handlers.set(`${method.toUpperCase()} ${path}`, handler)
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

  test('all 13 asset routes answer 500 json instead of rejecting when a dependency throws', async () => {
    const { app, handlers } = createRouteHarness()
    registerNovelSettingRoutes(app as any, {
      getWorkspace: () => '/tmp/mangaforge-nonexistent-workspace',
      getProject: async () => {
        throw new Error('db exploded')
      },
      buildChapterContextPackage: async () => ({}),
    })

    for (const key of ASSET_ROUTE_KEYS) {
      const handler = handlers.get(key)
      expect(handler).toBeTruthy()
      const res = await callRoute(handler, { params: { id: '1', chapterId: '1' }, query: {}, body: {} })
      expect(`${key} -> ${res.statusCode}`).toBe(`${key} -> 500`)
      expect(String(res.body?.error || '')).toContain('db exploded')
    }
  })
})

describe('discovered asset intake route', () => {
  test('applies selected discovered assets as character cards and setting entities', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-asset-intake-'))
    const project = await createNovelProject(workspace, { title: '镜州风雷', length_target: 'epic' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 3, title: '夜入王府' })
    await createNovelSettingEntity(workspace, {
      project_id: project.id,
      entity_type: 'item',
      name: '旧钥匙',
      summary: '已存在物品',
    } as any)

    const result = await applyDiscoveredAssetsToProject(workspace, project.id, chapter, [
      { entity_type: 'character', name: '周远', summary: '新来的宿舍管理员', state_json: { location: '宿舍楼' } },
      { entity_type: 'item', name: '黑色钥匙', summary: '能打开禁闭室', constraints_json: { owner_rule: '不得离身' } },
      { entity_type: 'item', name: '旧钥匙', summary: '重复物品' },
    ])

    const characters = await listNovelCharacters(workspace, project.id)
    const settings = await listNovelSettingEntities(workspace, project.id)

    expect(result.created_characters.map((item: any) => item.name)).toContain('周远')
    expect(result.created_settings.map((item: any) => item.name)).toEqual(expect.arrayContaining(['周远', '黑色钥匙']))
    expect(result.skipped_existing.map((item: any) => item.name)).toContain('旧钥匙')
    expect(characters.map(item => item.name)).toContain('周远')
    expect(settings.find(item => item.entity_type === 'character' && item.name === '周远')?.related_character_ids).toContain(characters[0].id)
    expect(settings.find(item => item.entity_type === 'item' && item.name === '黑色钥匙')?.constraints_json).toMatchObject({ owner_rule: '不得离身' })
  })

  test('disposes discovered assets by rename, merge, or one-off cameo without polluting canon', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-asset-disposition-'))
    const project = await createNovelProject(workspace, { title: '镜州风雷', length_target: 'epic' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 9, title: '旧城雨夜' })
    const existing = await createNovelSettingEntity(workspace, {
      project_id: project.id,
      entity_type: 'faction',
      name: '镜州王府',
      summary: '旧城最大势力。',
      payload_json: { source: 'manual_seed' },
    } as any)

    const result = await applyDiscoveredAssetsToProject(workspace, project.id, chapter, [
      { entity_type: 'item', name: '黑伞', disposition: 'rename', target_name: '无骨黑伞', summary: '能遮住照妖镜视线', evidence: '黑伞一合，镜光断了。' },
      { entity_type: 'faction', name: '王府暗卫', disposition: 'merge', merge_target_id: existing.id, evidence: '暗卫只听王府令牌。', summary: '王府暗线力量' },
      { entity_type: 'location', name: '雨棚小巷', disposition: 'cameo', evidence: '追逐只经过一次。', summary: '一次性追逐地点' },
    ])

    const settings = await listNovelSettingEntities(workspace, project.id)
    const merged = settings.find(item => item.id === existing.id)

    expect(result.created_settings.map((item: any) => item.name)).toContain('无骨黑伞')
    expect(result.created_settings.map((item: any) => item.name)).not.toContain('黑伞')
    expect(result.merged_assets).toEqual([
      expect.objectContaining({ source_name: '王府暗卫', target_id: existing.id, target_name: '镜州王府' }),
    ])
    expect(result.cameo_assets).toEqual([
      expect.objectContaining({ name: '雨棚小巷', entity_type: 'location' }),
    ])
    expect(settings.map(item => item.name)).not.toContain('王府暗卫')
    expect(settings.map(item => item.name)).not.toContain('雨棚小巷')
    expect(merged?.payload_json?.merged_discovered_assets?.[0]).toMatchObject({
      name: '王府暗卫',
      source_chapter_no: 9,
      evidence: '暗卫只听王府令牌。',
    })
  })

  test('exposes discovered assets apply endpoint', () => {
    const source = [readFileSync(join(import.meta.dir, 'novel-setting-routes.ts'), 'utf8'), settingHelpersSource()].join('\n')

    expect(source).toContain("app.post('/api/novel/chapters/:chapterId/discovered-assets/apply'")
    expect(source).toContain('applyDiscoveredAssetsToProject(')
  })

  test('uses safe json for setting prompts that include runtime chapter context', () => {
    const source = [readFileSync(join(import.meta.dir, 'novel-setting-routes.ts'), 'utf8'), settingHelpersSource()].join('\n')

    expect(source).not.toContain('JSON.stringify(chapter.raw_payload || {})')
    expect(source).not.toContain('JSON.stringify({ setting_context: contextPackage.setting_context, settings, usage }, null, 2).slice(0, 9000)')
  })
})
