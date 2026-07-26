import { describe, expect, test } from 'bun:test'
import {
  buildDeAiPolishMasterPersona,
  buildSeniorWebnovelAuthorPersona,
  resolveWebnovelGenreLabel,
} from './webnovel-author-personas'
import { buildProsePrompt } from '../llm/prompts-prose'
import { buildFocusedProseRevisionPrompt } from './prose-quality-loop-prompts'
import { buildMemePolishPrompt } from './prose-prompt-builders'

describe('webnovel author personas', () => {
  test('resolves genre labels from project fields', () => {
    expect(resolveWebnovelGenreLabel({ genre: '都市悬疑' })).toBe('都市')
    expect(resolveWebnovelGenreLabel({ genre: '修仙长生' })).toBe('仙侠')
    expect(resolveWebnovelGenreLabel({ style_tags: ['玄幻', '升级'] })).toBe('玄幻')
  })

  test('draft persona includes senior author and detector goal', () => {
    const text = buildSeniorWebnovelAuthorPersona({ genre: '都市' })
    expect(text).toContain('资深网文作者')
    expect(text).toContain('专攻都市')
    expect(text).toContain('朱雀')
    expect(text).toContain('20%')
  })

  test('revise persona is de-AI polish master', () => {
    const text = buildDeAiPolishMasterPersona({ genre: '仙侠' })
    expect(text).toContain('去AI润色大师')
    expect(text).toContain('仙侠')
    expect(text).toContain('保持原意')
  })

  test('wired into draft / revise / meme polish prompts', () => {
    const draft = buildProsePrompt(
      { title: '测试书', genre: '都市悬疑' } as any,
      { chapter_no: 1, title: '第一章' },
      {},
    )
    expect(draft).toContain('资深网文作者')
    expect(draft).toContain('都市')

    const revise = buildFocusedProseRevisionPrompt({
      coreContract: {},
      chapterText: '他推开门。',
      blockingFindings: [],
      round: 1,
      project: { genre: '都市' },
    } as any)
    expect(revise).toContain('去AI润色大师')

    const meme = buildMemePolishPrompt(
      { title: '测试书', genre: '仙侠' },
      { chapter_target: { chapter_no: 1, title: '试写' } },
      '他拔剑。',
    )
    expect(meme).toContain('去AI润色大师')
    expect(meme).toContain('仙侠')
  })
})
