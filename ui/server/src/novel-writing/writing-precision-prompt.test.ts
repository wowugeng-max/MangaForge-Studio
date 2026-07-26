import { describe, expect, test } from 'bun:test'
import {
  buildWritingPrecisionPlan,
  formatSceneCardPrecisionPrompt,
  formatWritingPrecisionPrompt,
} from './writing-precision-prompt'

describe('writing precision prompt', () => {
  test('builds operational generation constraints instead of gate-only language', () => {
    const plan = buildWritingPrecisionPlan({
      contextPackage: {
        chapter_target: {
          chapter_no: 5,
          goal: '击破电梯怪谈，救出被困住户',
          conflict: '无脸电梯压迫',
          ending_hook: '电梯停在负一层',
          must_advance: ['击破电梯怪谈', '救出被困住户'],
          word_target: { target: 4200, min: 3780, max: 4620, label: '标准章', rangeText: '3780-4620 字', mode: 'standard' },
          scene_cards: [
            { scene_no: 1, title: '进电梯' },
            { scene_no: 2, title: '对峙' },
            { scene_no: 3, title: '脱出' },
          ],
        },
        future_chapters: [{
          chapter_no: 6,
          chapter_goal: '物业下发清理通知',
        }],
      },
    })

    expect(plan.scene_word_budgets).toHaveLength(3)
    expect(plan.scene_word_budgets.reduce((sum, item) => sum + item.target, 0)).toBe(4200)
    expect(plan.outline_word_budget.points.length).toBeGreaterThan(0)

    const prosePrompt = formatWritingPrecisionPrompt(plan).join('\n')
    expect(prosePrompt).toContain('一次写准')
    expect(prosePrompt).toContain('场景字数分配')
    expect(prosePrompt).toContain('一句一段')
    expect(prosePrompt).toContain('好例')
    expect(prosePrompt).toContain('去AI味')
    expect(prosePrompt).toContain('文字情绪')
    expect(prosePrompt).toContain('贴合本章剧情')
    expect(prosePrompt).toContain('从本章')
    expect(prosePrompt).toContain('场内交付')
    expect(prosePrompt).toContain('角色视角合同')
    expect(prosePrompt).toContain('decision_in_scene')
    expect(prosePrompt).not.toContain('入库失败')

    const scenePrompt = formatSceneCardPrecisionPrompt(plan).join('\n')
    expect(scenePrompt).toContain('word_budget')
    expect(scenePrompt).toContain('forbidden_future_settle')
    expect(scenePrompt).toContain('emotion_in_situation')
    expect(scenePrompt).toContain('emotion_tell')
    expect(scenePrompt).toContain('pov_lens')
  })

  test('embeds model family strategy block for gemini and gpt', () => {
    const geminiPlan = buildWritingPrecisionPlan({
      contextPackage: {
        chapter_target: {
          chapter_no: 5,
          goal: '击破电梯怪谈',
          must_advance: ['击破电梯怪谈'],
          word_target: { target: 4200, min: 3780, max: 4620, label: '标准章', rangeText: '3780-4620 字', mode: 'standard' },
          scene_cards: [
            { scene_no: 1, title: '进电梯' },
            { scene_no: 2, title: '对峙' },
            { scene_no: 3, title: '脱出' },
          ],
        },
        runtime_model: { model_name: 'gemini-3.5-flash', provider_id: 'gemini' },
      },
    })
    expect(geminiPlan.model_family_strategy.family).toBe('gemini')
    expect(geminiPlan.model_family_strategy.write_mode).toBe('scene_chunk_stitch')
    const geminiPrompt = formatWritingPrecisionPrompt(geminiPlan).join('\n')
    expect(geminiPrompt).toContain('模型家族策略')
    expect(geminiPrompt).toContain('分场景')
    expect(geminiPrompt).toContain('scene_chunk_stitch')
    expect(geminiPrompt).toContain('文字情绪必须在场')
    expect(geminiPrompt).toContain('本章剧情')

    const gptPlan = buildWritingPrecisionPlan({
      contextPackage: {
        chapter_target: {
          chapter_no: 5,
          goal: '击破电梯怪谈',
          word_target: { target: 4200, min: 3780, max: 4620, label: '标准章', rangeText: '3780-4620 字', mode: 'standard' },
          scene_cards: [{ scene_no: 1, title: '进电梯' }],
        },
      },
      modelRuntime: { model_name: 'gpt-5.4', provider_id: 'openai' },
    })
    const gptPrompt = formatWritingPrecisionPrompt(gptPlan).join('\n')
    expect(gptPrompt).toContain('GPT')
    expect(gptPrompt).toContain('full_chapter')
  })
})
