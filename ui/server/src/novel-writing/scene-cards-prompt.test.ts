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

  test('uses a cleaned scene-causality context and requires the first card to bridge the previous handoff', () => {
    const prompt = buildSceneCardsPrompt(
      { title: '夜行旧册' },
      {
        chapter_target: {
          chapter_no: 11,
          title: '铁链声',
          previous_handoff: '暗金绢册发热，老陈听见地下更深处传来铁链拖地声。',
          delivery_risk_receipts: [{ remaining_risk: 'sync 未回执' }],
          scene_cards: [{
            scene_no: 1,
            title: '旧卡',
            prose_craft_checks_sync: { missed: true, next_actions: ['repair'] },
          }],
        },
      },
    )
    const contextBlock = prompt
      .split('【结构化上下文包】\n')[1]
      .split('\n\n输出 JSON')[0]

    expect(prompt).toContain('第一张场景卡')
    expect(prompt).toContain('transition_from_previous')
    expect(contextBlock).toContain('暗金绢册发热')
    expect(contextBlock).not.toContain('delivery_risk_receipts')
    expect(contextBlock).not.toContain('prose_craft_checks_sync')
    expect(contextBlock).not.toContain('remaining_risk')
    expect(contextBlock).not.toContain('next_actions')
  })
})
