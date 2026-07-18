import { describe, expect, test } from 'bun:test'
import { buildStoryStatePrompt } from './story-state-prompt'

describe('story state prompt builder', () => {
  test('asks for durable story-state deltas, daily context, discovered assets, and verified scene receipts', () => {
    const prompt = buildStoryStatePrompt(
      { title: '镜州旧案' },
      {
        chapter_target: {
          chapter_no: 8,
          title: '暗门回声',
        },
        scene_breakdown: [
          {
            scene_no: 1,
            scene_card_receipts: [
              {
                key: 'state_delta',
                delivered: true,
                evidence: '李玄把半枚旧印按进门缝。',
              },
            ],
          },
        ],
      },
      '李玄把半枚旧印按进门缝。暗门内传来回声。',
    )

    expect(prompt).toContain('故事状态机增量')
    expect(prompt).toContain('scene_card_receipts')
    expect(prompt).toContain('state_delta.timeline/current_time/active_locations 要尽量带 source_excerpt 或 evidence')
    expect(prompt).toContain('daily_context_snapshot 只保存追踪/上下文.md 的进度元信息')
    expect(prompt).toContain('discovered_assets')
    expect(prompt).toContain('ip_scene_candidates')
    expect(prompt).toContain('李玄把半枚旧印按进门缝')
  })

  test('story state prompt requires established_events with source_excerpt', () => {
    const prompt = buildStoryStatePrompt({ id: 1, title: '怪谈世界' }, { chapter_no: 1 }, '林战开了不该开的门。')
    expect(prompt).toContain('established_events')
    expect(prompt).toContain('source_excerpt')
    expect(prompt).toMatch(/死亡|规则触发|不可改写|正史/)
  })
})

