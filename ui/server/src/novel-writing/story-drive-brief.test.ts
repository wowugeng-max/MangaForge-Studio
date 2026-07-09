import { describe, expect, test } from 'bun:test'
import { normalizeStoryDriveBrief } from './story-drive-brief'

describe('story drive brief helpers', () => {
  test('normalizes explicit story-drive fields before chapter target fallback', () => {
    const brief = normalizeStoryDriveBrief({
      storyDriveBrief: {
        protagonistChoice: '林青禾当众要求复核账册。',
        choiceCost: '她会暴露隐藏工具箱的检测痕迹。',
        stateChange: '巡夜弟子改口担保她继续查。',
        obstacle: '执事封锁旧仓入口。',
        causalNextStep: '缺页账册指向下一名候选阵师。',
        requiredActions: ['把复核选择写成现场行动。', '把缺页账册留到章末。'],
      },
      chapterTarget: {
        protagonistChoice: '目标 fallback 不应覆盖 brief。',
      },
    })

    expect(brief).toEqual({
      protagonist_choice: '林青禾当众要求复核账册。',
      choice_cost: '她会暴露隐藏工具箱的检测痕迹。',
      state_change: '巡夜弟子改口担保她继续查。',
      obstacle: '执事封锁旧仓入口。',
      causal_next_step: '缺页账册指向下一名候选阵师。',
      required_actions: ['把复核选择写成现场行动。', '把缺页账册留到章末。'],
    })
  })

  test('falls back to chapter target and scene-card execution fields', () => {
    const brief = normalizeStoryDriveBrief({
      chapter_target: {
        main_character_choice: '她选择先救人再查账。',
        stakes: '错过复核时限。',
        chapter_state_change: '掌院允许她带走旧件。',
      },
    }, [
      {
        pressure: '执事逼她立刻交出旧件。',
        exit_hook: '旧件里响起第二道阵鸣。',
      },
    ])

    expect(brief?.protagonist_choice).toBe('她选择先救人再查账。')
    expect(brief?.choice_cost).toBe('错过复核时限。')
    expect(brief?.state_change).toBe('掌院允许她带走旧件。')
    expect(brief?.obstacle).toBe('执事逼她立刻交出旧件。')
    expect(brief?.causal_next_step).toBe('旧件里响起第二道阵鸣。')
    expect(brief?.required_actions).toEqual(['把主角主动选择、明确阻碍、选择代价、状态变化和下一步因果写成可见事件。'])
  })

  test('returns null when no story-drive content exists', () => {
    expect(normalizeStoryDriveBrief({ storyDriveBrief: {} }, [])).toBeNull()
  })
})
