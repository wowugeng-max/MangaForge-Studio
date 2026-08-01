import { describe, expect, test } from 'bun:test'
import { buildStoryStatePrompt } from '../novel-writing/story-state-prompt'
import * as testSupport from './novel-writing-service.test-support'

describe('novel writing service test-support task classification', () => {
  test('does not route humanize or quality prompts containing state_delta as Story State', () => {
    const classify = (testSupport as any).classifyProsePipelineTask
    const embeddedContract = '\n【合成生成合同】{"state_delta":{"open_questions":[]}}'

    expect(classify?.('prose-agent', `任务：对高风险正文窗口做减负结构重写。${embeddedContract}`)).toBe('humanize')
    expect(classify?.('review-agent', `任务：独立审查小说正文。${embeddedContract}`)).toBe('quality_review')
    expect(classify?.('prose-agent', `任务：执行第 1 轮正文定向修订，返回完整章节正文。${embeddedContract}`)).toBe('quality_revision')
  })

  test('routes the canonical Story State prompt independently of embedded contract fields', () => {
    const classify = (testSupport as any).classifyProsePipelineTask
    const storyStatePrompt = buildStoryStatePrompt(
      { title: 'SYNTHETIC_PROJECT' },
      { chapter_target: { chapter_no: 10 } },
      'SYNTHETIC_CHAPTER_SENTINEL',
    )

    expect(classify?.('review-agent', storyStatePrompt)).toBe('story_state')
  })
})
