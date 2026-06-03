import { describe, expect, test } from 'bun:test'
import { mkdtemp } from 'fs/promises'
import { readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  applyDiscoveredAssetsToProject,
  buildSettingAgentPrompt,
  normalizeSettingAgentPayload,
  SETTING_TYPES,
} from './novel-setting-routes'
import {
  createNovelChapter,
  createNovelProject,
  createNovelSettingEntity,
  listNovelCharacters,
  listNovelSettingEntities,
} from '../novel'

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

  test('uses setting-agent in the project setting incubation route', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-setting-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/projects/:id/settings/incubate-from-project'")
    const routeEnd = source.indexOf("app.post('/api/novel/chapters/:chapterId/settings-consistency-check'", routeStart)
    const routeBlock = source.slice(routeStart, routeEnd)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(routeBlock).toContain("executeNovelAgent('setting-agent'")
    expect(routeBlock).toContain('buildSettingAgentPrompt(')
    expect(routeBlock).toContain('normalizeSettingAgentPayload(')
  })

  test('exposes storyline incubation and chapter suggestion routes', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-setting-routes.ts'), 'utf8')

    expect(source).toContain("app.post('/api/novel/projects/:id/storylines/incubate'")
    expect(source).toContain("app.post('/api/novel/chapters/:chapterId/storylines/suggest'")
    expect(source).toContain('STORYLINE_TYPES')
    expect(source).toContain('advance')
    expect(source).toContain('payoff')
    expect(source).toContain('pause')
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

  test('exposes discovered assets apply endpoint', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-setting-routes.ts'), 'utf8')

    expect(source).toContain("app.post('/api/novel/chapters/:chapterId/discovered-assets/apply'")
    expect(source).toContain('applyDiscoveredAssetsToProject(')
  })
})
