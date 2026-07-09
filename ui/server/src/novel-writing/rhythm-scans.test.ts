import { describe, expect, test } from 'bun:test'
import {
  scanRepeatedReactionRisks,
  scanRepeatedSubjectRisks,
  scanTripleParallelRisks,
  scanUniformRhythmRisks,
} from './rhythm-scans'

describe('rhythm scan utilities', () => {
  test('detects repeated subject sentence starts as mechanical Gate B prose', () => {
    const checks = scanRepeatedSubjectRisks([
      '第9章 名单之后',
      '',
      '李辰抬起头。李辰看见黑板上的名字。李辰伸手按住学生证。李辰没有说话。',
      '广播在窗外响了一声。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({
      gate: 'B',
      status: 'warn',
      sentence_start: 1,
    })
    expect(checks[0].pattern).toContain('主语重复')
    expect(checks[0].fix).toContain('动作开句')
  })

  test('detects triple parallel phrasing and explicit three-clause templates', () => {
    const compactParallel = scanTripleParallelRisks([
      '第9章 名单之后',
      '',
      '他看见了黑板上的名字，听见了广播里的杂音，闻到了门缝里的铁锈味。',
      '张智把学生证按回桌面。',
    ].join('\n'))
    const explicitParallel = scanTripleParallelRisks([
      '第9章 名单之后',
      '',
      '有的人低头改名，有的人把学生证塞进口袋，有的人转身往楼梯跑。',
    ].join('\n'))

    expect(compactParallel).toHaveLength(1)
    expect(compactParallel[0].pattern).toContain('三连排比')
    expect(compactParallel[0].fix).toContain('最有力的一条')
    expect(explicitParallel).toHaveLength(1)
    expect(explicitParallel[0].evidence).toContain('有的人低头改名')
  })

  test('detects repeated reactions while ignoring the title line', () => {
    const checks = scanRepeatedReactionRisks([
      '第10章 留校名单',
      '',
      '李辰沉默了几秒，把名单推回桌面。',
      '张智看着广播灯，也沉默了下来。',
      '门外的人影贴住玻璃，李辰再次沉默。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({
      gate: 'C',
      status: 'warn',
      count: 3,
    })
    expect(checks[0].pattern).toContain('重复反应')
    expect(checks[0].fix).toContain('选择')
  })

  test('detects flat short-sentence rhythm as Gate D pacing risk', () => {
    const checks = scanUniformRhythmRisks([
      '第11章 值夜名单',
      '',
      '李辰走到门前。张智看向窗外。广播响了一声。门外影子停住。名单落在桌上。灯光闪了一下。两人没有开口。走廊恢复安静。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].gate).toBe('D')
    expect(checks[0].pattern).toContain('节奏均匀')
    expect(checks[0].evidence).toContain('李辰走到门前')
    expect(checks[0].fix).toContain('长短句')
  })
})
