import { describe, expect, test } from 'bun:test'
import {
  hasToxicAiSkipMarker,
  scanToxicAiPatterns,
  summarizeToxicAiDebt,
} from './toxic-ai-pattern-scans'
import { evaluateToxicAiDebtGate } from './toxic-ai-debt-gate'

describe('toxic ai pattern scans', () => {
  test('detects reverse-not-is and trailer ending', () => {
    const text = [
      '他不是在害怕，而是在筹划一场更大的反击。',
      '门外风声更紧了。',
      '他不知道的是，更大的风暴已经靠近。',
    ].join('\n')
    const findings = scanToxicAiPatterns(text)
    expect(findings.some(item => item.key === 'reverse_not_is')).toBe(true)
    expect(findings.some(item => item.key === 'trailer_ending')).toBe(true)
  })

  test('skip marker clears debt', () => {
    const text = '他不是在逃，而是在诱敌。\n<!-- 去味:跳过 -->'
    expect(hasToxicAiSkipMarker(text)).toBe(true)
    expect(summarizeToxicAiDebt(text).blocking_count).toBe(0)
  })

  test('debt gate blocks next chapter when previous has toxic debt', () => {
    const gate = evaluateToxicAiDebtGate({
      targetChapterNo: 3,
      chapters: [
        {
          chapter_no: 2,
          chapter_text: '她温柔地开口，却带着杀意。这一切背后，更大的风暴即将来临。',
        },
      ],
    })
    expect(gate.blocked).toBe(true)
    expect(gate.previous_chapter_no).toBe(2)
    expect(gate.reasons[0]).toContain('毒句式')
  })
})
