import { describe, expect, test } from 'vitest'
import {
  HUMANIZE_DUAL_PASS_VERSION,
  assessHumanizeLengthLock,
  buildHumanizeDualPassPromptBlock,
  buildHumanizeDualPassPromptDirectives,
  buildHumanizeRevisionStrategyAddon,
  scanAcademicPaddingHits,
  selectHumanizeSafeProse,
  stripHumanizeChatWrapper,
} from './humanize-dual-pass'
import { buildHumanWebnovelResistancePromptDirectives } from './human-webnovel-resistance'
import { buildRevisionStrategyBrief } from '../novel-writing-service/revision/revision-strategy'
import { buildProseRevisionPrompt } from '../novel-writing-service/service/prose-self-review-prompts'
import { buildFocusedProseRevisionPrompt } from './prose-quality-loop-prompts'

describe('humanize dual pass (baibai/Bypass novel-native)', () => {
  test('exposes Pass A structure + Pass B texture + hard contract', () => {
    const dirs = buildHumanizeDualPassPromptDirectives({ pass: 'AB' })
    const joined = dirs.join('\n')
    expect(joined).toContain(HUMANIZE_DUAL_PASS_VERSION)
    expect(joined).toContain('Pass A')
    expect(joined).toContain('Pass B')
    expect(joined).toContain('结构重写')
    expect(joined).toContain('±10%')
    expect(joined).toContain('禁止论文腔')
    expect(joined).toContain('禁止论文腔')
  })

  test('resistance prompt directives include dual-pass system contract', () => {
    const joined = buildHumanWebnovelResistancePromptDirectives().join('\n')
    expect(joined).toContain('Humanize')
    expect(joined).toContain('Pass A')
    expect(joined).toContain('Pass B')
  })

  test('revision prompts carry dual-pass block', () => {
    const prompt = buildProseRevisionPrompt(
      { title: '测试书', genre: '都市' },
      { chapter_target: { word_target: { min: 1000, max: 2000 } } },
      '他推开门。\n\n“先别动。”\n\n手套上还沾着水。',
      { deslop_gate_diagnostics: { primary_strategy: 'de_ai' }, findings: [{ key: 'hw_test', status: 'fail' }] },
    )
    expect(prompt).toContain('Humanize')
    expect(prompt).toContain('Pass A')
    expect(prompt).toContain('humanize_dual_pass')

    const focused = buildFocusedProseRevisionPrompt({
      coreContract: {},
      chapterText: '他推开门。',
      blockingFindings: [{ key: 'hw_opening_probe_cascade', severity: 'S1' } as any],
      round: 1,
      project: { genre: '都市' },
    })
    expect(focused).toContain('Pass B')
    expect(focused).toContain('结构重写')
  })

  test('revision strategy brief includes humanize directives', () => {
    const brief = buildRevisionStrategyBrief({
      deslop_checks: [{ key: 'ai_template', status: 'fail', label: 'AI腔', strategy: 'de_ai', fix: '去AI' }],
    })
    const text = JSON.stringify(brief)
    expect(text).toContain('Pass A')
    expect(Array.isArray(brief.directives)).toBe(true)
    expect(brief.directives.some((d: string) => /Pass A|结构重写/.test(String(d)))).toBe(true)
  })

  test('length lock and wrapper strip and academic padding guard', () => {
    const before = '他推开门。\n\n“先别动。”\n\n手套上还沾着水，他本想甩锅，却先把纸角按住。'
    const ok = before.replace('按住。', '按住了。')
    const tooShort = '他推开门。'
    const padded = before + '开展相关的验证工作得以实现极大程度上的提升。'
    const wrapped = `好的，修改后如下：\n${ok}\n希望对你有帮助。`

    expect(stripHumanizeChatWrapper(wrapped)).toContain('他推开门')
    expect(stripHumanizeChatWrapper(wrapped)).not.toContain('希望对你有帮助')
    expect(assessHumanizeLengthLock(before, ok).ok).toBe(true)
    expect(assessHumanizeLengthLock(before, tooShort).ok).toBe(false)

    const safe = selectHumanizeSafeProse(before, wrapped)
    expect(safe.accepted).toBe(true)
    expect(safe.text).not.toContain('好的')

    const rejectAcademic = selectHumanizeSafeProse(before, padded)
    expect(rejectAcademic.accepted).toBe(false)
    expect(scanAcademicPaddingHits(padded).length).toBeGreaterThan(0)
  })

  test('strategy addon defaults pass AB for de_ai signals', () => {
    const addon = buildHumanizeRevisionStrategyAddon({ primary_strategy: 'de_ai', hw_findings: 1 })
    expect(addon.pass).toBe('AB')
    expect(addon.directives.length).toBeGreaterThan(3)
  })

  test('prompt block is non-empty stable string', () => {
    const block = buildHumanizeDualPassPromptBlock({ pass: 'A' })
    expect(block.includes('Pass A')).toBe(true)
    expect(block.includes('Pass B')).toBe(false)
  })
})
