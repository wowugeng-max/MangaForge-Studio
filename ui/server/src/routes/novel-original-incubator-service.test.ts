import { describe, expect, test } from 'bun:test'
import { createNovelOriginalIncubatorService } from './novel-original-incubator-service'

describe('original incubator setting assets', () => {
  test('requires deep incubation to output structured setting entities', () => {
    const service = createNovelOriginalIncubatorService()
    const prompt = service.buildOriginalIncubatorPrompt(
      { title: '超人的规则怪谈世界', length_target: 'epic', genre: '规则怪谈' },
      { idea: '双主角闯规则副本', chapter_count: 30 },
    )

    expect(prompt).toContain('setting_entities')
    expect(prompt).toContain('ability')
    expect(prompt).toContain('realm')
    expect(prompt).toContain('item')
    expect(prompt).toContain('faction')
    expect(prompt).toContain('boss')
  })

  test('normalizes setting entities from incubator payload', () => {
    const service = createNovelOriginalIncubatorService()
    const payload = service.normalizeIncubatorPayload({
      worldbuilding: { world_summary: '规则污染现实。' },
      setting_entities: [
        { entity_type: 'ability', name: '钢铁之躯', summary: '超人级肉身', constraints_json: { cost: '日光储备' } },
        { entity_type: 'faction', name: '规则崇拜教团', summary: '地下组织' },
      ],
      chapters: [{ chapter_no: 1, title: '双魂降临' }],
    }, 30)

    expect(payload.setting_entities).toHaveLength(2)
    expect(payload.setting_entities[0].entity_type).toBe('ability')
    expect(payload.setting_entities[1].name).toBe('规则崇拜教团')
  })
})
