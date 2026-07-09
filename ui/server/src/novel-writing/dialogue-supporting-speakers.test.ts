import { describe, expect, test } from 'bun:test'
import {
  dialogueNamedSpeakers,
  normalizeDialogueSupportingSpeakerLimitCheck,
} from './dialogue-supporting-speakers'

describe('dialogue supporting speaker limit utilities', () => {
  test('extracts unique named speakers from colon-style dialogue lines', () => {
    const speakers = dialogueNamedSpeakers([
      '李玄：“够了。”',
      '周薄森：“你若真要当众翻旧账，就先说清楚。”',
      '林青禾：“封口是今晨开的。”',
      '周薄森：“你别拿封条泼脏水。”',
      '旁白没有对白。',
    ].join('\n'))

    expect(speakers).toEqual(['李玄', '周薄森', '林青禾'])
  })

  test('allows up to three supporting speakers after excluding protagonist aliases', () => {
    const check = normalizeDialogueSupportingSpeakerLimitCheck(
      ['同一场景最多保留 3 个配角发言。'],
      {
        chapter_target: {
          protagonist_name: '李玄',
          protagonistName: '李玄',
        },
      },
      [
        '李玄：“够了。”',
        '周薄森：“李玄，你若真要当众翻旧账，就先说清楚。”',
        '林青禾：“封口是今晨开的。”',
        '钱越：“我只看见一盏灯。”',
        '李玄：“说漏了。”',
      ].join('\n'),
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence.join('；')).toContain('同场配角发言 3 个')
  })

  test('warns and suggests compression when more than three supporting speakers talk', () => {
    const check = normalizeDialogueSupportingSpeakerLimitCheck(
      ['同一场景最多保留 3 个配角发言。'],
      { chapter_target: { protagonist_name: '李玄' } },
      [
        '李玄：“够了。”',
        '周薄森：“李玄，你若真要当众翻旧账，就先说清楚。”',
        '林青禾：“封口是今晨开的。”',
        '钱越：“我只看见一盏灯。”',
        '赵执事：“我能证明他进过后院。”',
        '宋管事：“我也听见了更夫报时。”',
        '李玄：“说漏了。”',
      ].join('\n'),
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.label).toBe('配角台词人数')
    expect(check?.evidence.join('；')).toContain('同场配角发言 5 个')
    expect(check?.missed_items).toContain('压缩或合并 赵执事 的台词')
    expect(check?.missed_items).toContain('压缩或合并 宋管事 的台词')
    expect(check?.repair_instruction).toContain('同一场景最多保留 3 个配角发言')
  })
})
