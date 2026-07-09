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
