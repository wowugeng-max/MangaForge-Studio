import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildSettingAgentPrompt,
  normalizeSettingAgentPayload,
} from './novel-setting-routes'

describe('setting agent workflow', () => {
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
    }, 7)

    expect(entities.map(item => item.entity_type)).toEqual(expect.arrayContaining(['ability', 'realm', 'item', 'faction', 'boss', 'rule', 'location', 'foreshadowing']))
    expect(entities.every(item => item.project_id === 7)).toBe(true)
    expect(entities.find(item => item.name === '钢铁之躯')?.constraints_json).toMatchObject({ cost: '消耗日光储备', limit: '规则压制时削弱' })
    expect(entities.find(item => item.name === '规则崇拜教团')?.constraints_json).toMatchObject({ agenda: '扩大污染范围' })
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
})
