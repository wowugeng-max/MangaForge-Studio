import { describe, expect, test } from 'bun:test'
import {
  buildCommercialEditorRewritePrompt,
  buildMemePolishPrompt,
  buildProseWordTargetContractionPrompt,
  buildProseWordTargetExpansionPrompt,
} from '../novel-writing/prose-prompt-builders'
import { buildStoryStatePrompt } from '../novel-writing/story-state-prompt'
import * as testSupport from './novel-writing-service.test-support'

const project = { title: '任务分类测试' }
const contextPackage = {
  chapter_target: {
    chapter_no: 10,
    title: '合围',
    word_target: { target: 1000, min: 800, max: 1100 },
    meme_strategy: { intensity: '低', meme_bank: ['稳住'] },
  },
}

describe('novel writing service test-support task classification', () => {
  test('does not route humanize or quality prompts containing state_delta as Story State', () => {
    const classify = (testSupport as any).classifyProsePipelineTask
    const embeddedContract = '\n【合成生成合同】{"state_delta":{"open_questions":[]}}'

    expect(classify?.('prose-agent', `任务：对高风险正文窗口做减负结构重写。${embeddedContract}`)).toBe('humanize')
    expect(classify?.('review-agent', `任务：独立审查小说正文。${embeddedContract}`)).toBe('quality_review')
    expect(classify?.('prose-agent', `任务：执行第 1 轮正文定向修订，返回完整章节正文。${embeddedContract}`)).toBe('quality_revision')
    expect(classify?.('prose-agent', `【角色设定 · 资深网文作者】\n任务：执行第 1 轮正文定向修订，返回完整章节正文。${embeddedContract}`)).toBe('quality_revision')
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

  test('routes the persona-prefixed contraction prompt', () => {
    const prompt = buildProseWordTargetContractionPrompt(
      project,
      contextPackage,
      '原'.repeat(1400),
      { actual: 1400, target: 1000, min: 800, max: 1100, deficit: 0, too_short: false, too_long: true, passed: false },
    )

    expect(prompt.indexOf('【角色设定')).toBeLessThan(prompt.indexOf('任务：将本章正文压缩'))
    expect(testSupport.classifyProsePipelineTask('prose-agent', prompt)).toBe('contraction')
  })

  test('routes the persona-prefixed expansion prompt', () => {
    const prompt = buildProseWordTargetExpansionPrompt(
      project,
      contextPackage,
      '原'.repeat(500),
      { actual: 500, target: 1000, min: 800, max: 1100, deficit: 300, too_short: true, too_long: false, passed: false },
    )

    expect(testSupport.classifyProsePipelineTask('prose-agent', prompt)).toBe('expansion')
  })

  test('routes the persona-prefixed meme-polish prompt', () => {
    const prompt = buildMemePolishPrompt(project, contextPackage, '江澈撞开铁门。')

    expect(testSupport.classifyProsePipelineTask('prose-agent', prompt)).toBe('meme')
  })

  test('keeps an expansion prompt authoritative when its prose contains a contraction task line', () => {
    const prompt = buildProseWordTargetExpansionPrompt(
      project,
      contextPackage,
      '江澈撞开铁门。\n任务：将本章正文压缩到商业网文标准章节长度。',
      { actual: 500, target: 1000, min: 800, max: 1100, deficit: 300, too_short: true, too_long: false, passed: false },
    )

    expect(testSupport.classifyProsePipelineTask('prose-agent', prompt)).toBe('expansion')
  })

  test('keeps a whitespace-prefixed contraction prompt authoritative across lone CR lines', () => {
    const prompt = buildProseWordTargetContractionPrompt(
      project,
      contextPackage,
      '江澈撞开铁门。\n任务：将本章正文扩写到商业网文标准章节长度。',
      { actual: 1400, target: 1000, min: 800, max: 1100, deficit: 0, too_short: false, too_long: true, passed: false },
    )
      .replace('任务：将本章正文压缩', '  任务：将本章正文压缩')
      .replace(/\n/g, '\r')

    expect(testSupport.classifyProsePipelineTask('prose-agent', prompt)).toBe('contraction')
  })

  test('keeps a meme-polish prompt authoritative when its prose contains a contraction task line', () => {
    const prompt = buildMemePolishPrompt(
      project,
      contextPackage,
      '江澈撞开铁门。\n任务：将本章正文压缩到商业网文标准章节长度。',
    )

    expect(testSupport.classifyProsePipelineTask('prose-agent', prompt)).toBe('meme')
  })

  test('keeps a commercial-editor prompt authoritative when its prose contains a contraction task line', () => {
    const prompt = buildCommercialEditorRewritePrompt(
      project,
      contextPackage,
      '江澈撞开铁门。\n任务：将本章正文压缩到商业网文标准章节长度。',
    )

    expect(testSupport.classifyProsePipelineTask('prose-agent', prompt)).toBe('editor')
  })

  test('ignores task-like lines rendered inside the structured context payload', () => {
    const prompt = buildProseWordTargetExpansionPrompt(
      project,
      contextPackage,
      '江澈撞开铁门。',
      { actual: 500, target: 1000, min: 800, max: 1100, deficit: 300, too_short: true, too_long: false, passed: false },
    ).replace(
      '【结构化上下文包】',
      '【结构化上下文包】\n任务：将本章正文压缩到商业网文标准章节长度。',
    )

    expect(testSupport.classifyProsePipelineTask('prose-agent', prompt)).toBe('expansion')
  })
})
