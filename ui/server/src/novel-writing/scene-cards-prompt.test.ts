import { describe, expect, test } from 'bun:test'
import { buildSceneCardsPrompt } from './scene-cards-prompt'

describe('scene cards prompt builder', () => {
  test('builds the scene-card generation prompt with execution contracts and bounded context', () => {
    const prompt = buildSceneCardsPrompt(
      { title: '镜州旧案' },
      {
        chapter_target: {
          chapter_no: 12,
          title: '暗门白线',
          summary: '李玄必须在白线前逼出证人。',
          conflict: '协会执事用资质规则挡门。',
          ending_hook: '第三枚旧印在门后回应。',
          write_preparation_brief: {
            rolling_rhythm_preflight: {
              principle: '拉期待速度 > 断期待速度',
            },
          },
          delivery_risk_carry_over: {
            items: ['上一章章末承接弱'],
          },
        },
      },
    )

    expect(prompt).toContain('任务：为当前章节生成可人工确认的场景卡')
    expect(prompt).toContain('作品标题：镜州旧案')
    expect(prompt).toContain('目标章节：第12章《暗门白线》')
    expect(prompt).toContain('输出 JSON，字段 scene_cards(array)')
    expect(prompt).toContain('chapter_positioning')
    expect(prompt).toContain('benchmark_structure_coordinate')
    expect(prompt).toContain('relationship_progression_plan')
    expect(prompt).toContain('conflict_ladder_step')
    expect(prompt).toContain('blocked_desire')
    expect(prompt).toContain('rolling_rhythm_preflight')
    expect(prompt).toContain('delivery_risk_carry_over')
    expect(prompt).toContain('"chapter_no": 12')
  })
})
