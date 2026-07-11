import { describe, expect, test } from 'bun:test'
import {
  scanBannedWordLeaks,
  scanContextSensitiveWordDensityRisks,
  scanWeakAdverbDensityRisks,
} from './deslop-scans'

describe('deslop scan utilities', () => {
  test('detects banned patterns, level-one words, and bookish replacements', () => {
    const hits = scanBannedWordLeaks([
      '他不是冷漠，而是绝望。',
      '她缓缓抬头，眼中闪过一丝迟疑。',
      '旧阵被彻底瓦解，众人无可奈何。',
    ].join('\n'))

    expect(hits.map((item: any) => item.pattern)).toEqual(expect.arrayContaining([
      '不是A，而是B',
      '缓缓',
      '眼中闪过一丝',
      '一丝',
      '书面腔口语化',
    ]))
    expect(hits.find((item: any) => item.pattern === '不是A，而是B')?.status).toBe('fail')
    expect(hits.find((item: any) => item.pattern === '不是A，而是B')?.matched_text).toBe('不是冷漠，而是绝望')
    expect(hits.find((item: any) => item.pattern === '缓缓')?.matched_text).toBe('缓缓')
    expect(hits.find((item: any) => item.pattern === '书面腔口语化' && item.fix.includes('瓦解'))?.matched_text).toBe('瓦解')
    expect(hits.map((item: any) => item.fix).join('｜')).toContain('更口语和现场')
  })

  test('detects cross-line and three-part not-is banned patterns', () => {
    const crossLine = scanBannedWordLeaks([
      '他不是害怕，',
      '而是想拖住门外的人。',
    ].join('\n'))
    const threePart = scanBannedWordLeaks([
      '他不是退让，',
      '也不是服输，',
      '而是在等铃声停下。',
    ].join('\n'))

    expect(crossLine.map((item: any) => item.pattern)).toContain('不是A，而是B')
    expect(crossLine[0].evidence).toContain('\n')
    expect(threePart.map((item: any) => item.pattern)).toContain('不是A，不是B，而是C')
    expect(threePart.find((item: any) => item.pattern === '不是A，不是B，而是C')?.evidence.split('\n')).toHaveLength(3)
  })

  test('does not flag compact either-or and question particles as not-is comparison', () => {
    const hits = scanBannedWordLeaks([
      '不是就这么算了吗？',
    ].join('\n'))

    expect(hits.map((item: any) => item.pattern)).not.toContain('不是A，而是B')
  })

  test('matches 如同 as a comparison term instead of across 不如 and 同意', () => {
    const falsePositive = scanBannedWordLeaks('他觉得不如同意这个提议。')
    const comparison = scanBannedWordLeaks('铁门倒下，如同一堵墙砸进水里。')

    expect(falsePositive.map((item: any) => item.pattern)).not.toContain('如同')
    expect(comparison.find((item: any) => item.pattern === '如同')).toMatchObject({
      status: 'warn',
      evidence: '铁门倒下，如同一堵墙砸进水里。',
      matched_text: '如同',
    })
  })

  test('exposes semantic summary text without its regex boundary separator', () => {
    const summary = scanBannedWordLeaks('门开了。这一刻，他终于明白真相。')
      .find((item: any) => item.pattern === '总结句式')
    const punctuationMatches = [
      scanBannedWordLeaks('门开了。——风撞上窗户。'),
      scanBannedWordLeaks('水滴...落在地上。'),
    ].flatMap(items => items)
      .filter((item: any) => item.pattern === '禁用标点')
      .map((item: any) => item.matched_text)

    expect(summary).toMatchObject({
      matched_text: '这一刻，他终于明白真相',
      status: 'warn',
    })
    expect(summary?.matched_text).not.toMatch(/^[\s。！？!?；;，,]/)
    expect(punctuationMatches).toEqual(expect.arrayContaining(['——', '...']))
  })

  test('detects weak adverb density after excluding title line', () => {
    const hits = scanWeakAdverbDensityRisks([
      '第14章 第三个证人',
      '她微微抬头，轻轻按住账册，缓缓把指尖收回，淡淡说了一句。',
      '门外的铃声停了。',
    ].join('\n'))

    expect(hits).toHaveLength(1)
    expect(hits[0].pattern).toContain('弱化副词密度')
    expect(hits[0].evidence).toContain('微微 1')
  })

  test('detects context-sensitive word density but ignores sparse usage', () => {
    const hits = scanContextSensitiveWordDensityRisks([
      '第14章 第三个证人',
      '突然，灯灭了。好像有人站在门外。名单瞬间多出一行。',
      '突然，铜铃又响了一次。',
    ].join('\n'))
    const safeHits = scanContextSensitiveWordDensityRisks([
      '第14章 第三个证人',
      '灯突然灭了，所有人都停在原地。',
      '门外没有第二声。',
      '账册被推到桌边。',
      '证人低头签了字。',
      '广播没有再响。',
    ].join('\n'))

    expect(hits).toHaveLength(1)
    expect(hits[0].pattern).toContain('语境敏感词密度')
    expect(safeHits).toHaveLength(0)
  })
})
