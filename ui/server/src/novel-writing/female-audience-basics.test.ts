import { describe, expect, test } from 'bun:test'
import {
  buildFemaleAudienceDeterministicCheck,
  countFemaleAudienceSignals,
  femaleAudienceArray,
  femaleAudiencePriority,
  normalizeFemaleAbuseDosageCheck,
  normalizeFemaleCopyPromiseCheck,
  normalizeFemaleCorePrinciplesCheck,
  normalizeFemaleLongformGenreCheck,
  normalizeFemalePlatformFitCheck,
  normalizeFemaleQualityCheck,
  normalizeFemaleReaderNeedCheck,
  normalizeFemaleRomanceAxisCheck,
} from './female-audience-basics'

describe('female audience basic sync checks', () => {
  test('normalizes female-audience values and counts proxy signals', () => {
    expect(femaleAudienceArray(['安全感早给', '  女主主动选择  '])).toEqual(['安全感早给', '女主主动选择'])

    expect(countFemaleAudienceSignals('女主拿到退路和同盟，亲自做决定，主情绪从委屈转向反击。', [
      /退路|同盟/,
      /亲自|自己做决定/,
      /主情绪|委屈|反击/,
    ])).toBe(3)
  })

  test('confirms core principles when safety empathy agency and emotion are visible', () => {
    const check = normalizeFemaleCorePrinciplesCheck(
      ['安全感、代入感、女主主动性、主情绪'],
      '她终于看见退路和同盟，处境被轻视却亲自拒绝，女主自己做决定，主情绪从委屈转成反击。',
    )

    expect(check?.key).toBe('core_principles')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toContain('安全感/代入/主动性/主情绪信号可见')
  })

  test('warns when protagonist agency is handed to male lead', () => {
    const check = normalizeFemaleCorePrinciplesCheck(
      ['女主主动选择'],
      '关键选择都由男主安排，男主出面解决所有问题，女主被安排着赢。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.score).toBeLessThanOrEqual(22)
    expect(check?.evidence).toContain('女主主动性断裂')
  })

  test('confirms reader needs and copy promise through proxy chains', () => {
    const readerNeed = normalizeFemaleReaderNeedCheck(
      ['被认可、被珍视、被尊重'],
      '她的边界被看见，谈判结果让她被认可，也被尊重，不再只是被轻视的那个人。',
    )
    const copyPromise = normalizeFemaleCopyPromiseCheck(
      ['状态、困境、行动、成功'],
      '状态是合同被压价，困境是客户被抢；她亲自谈判并拒绝旧条件，最后签回订单，事业翻盘成功。',
    )

    expect(readerNeed?.delivered).toBe(true)
    expect(readerNeed?.evidence).toContain('被认可/珍视/尊重信号可见')
    expect(copyPromise?.delivered).toBe(true)
    expect(copyPromise?.evidence).toContain('状态-困境-行动-成功链路可见')
  })

  test('confirms longform and platform fit when serial growth and fast payoffs are visible', () => {
    const longform = normalizeFemaleLongformGenreCheck(
      ['成长、事业、关系、伏笔、下一章'],
      '本章接住长篇主线阶段，事业进展和成长节点改变关系，旧案伏笔留下线索，章尾抛出下一章新问题。',
    )
    const platform = normalizeFemalePlatformFitCheck(
      ['番茄女生安全感早给，快节奏快回报'],
      '番茄女生和女性读者要安全感早给，本章节奏更快、快回报清楚，货板一致。',
    )

    expect(longform?.delivered).toBe(true)
    expect(longform?.evidence).toContain('长篇成长/伏笔/下一章信号可见')
    expect(platform?.delivered).toBe(true)
    expect(platform?.key).toBe('platform_fit_rules')
    expect(platform?.evidence.length).toBeGreaterThan(0)
  })

  test('confirms romance axis when affection steps on heroine growth node', () => {
    const check = normalizeFemaleRomanceAxisCheck(
      ['感情线踩在事业成长节点'],
      '感情线没有抢走事业线：她完成事业进展和成长节点后，男主递来一杯热茶，暧昧升温正好踩在节点上。',
    )

    expect(check?.key).toBe('romance_axis_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toContain('感情升级踩在成长/事业节点')
  })

  test('warns when romance axis and abuse dosage break safety', () => {
    const romance = normalizeFemaleRomanceAxisCheck(
      ['感情线踩在事业成长节点'],
      '感情线脱离成长线，男主出面解决所有事业问题。',
    )
    const abuse = normalizeFemaleAbuseDosageCheck(
      ['受委屈后给反转、糖和安全感'],
      '她一直被虐，没有反转或糖，也没有安全感。',
    )

    expect(romance?.delivered).toBe(false)
    expect(romance?.evidence).toContain('感情线脱离成长线')
    expect(abuse?.delivered).toBe(false)
    expect(abuse?.score).toBeLessThanOrEqual(18)
    expect(abuse?.evidence).toContain('连续只虐或无安全感')
  })

  test('warns when book promise and prose delivery mismatch', () => {
    const check = normalizeFemaleQualityCheck(
      ['货板一致'],
      '书名简介说她事业翻盘，正文却只写她被迫等待，货不对板。',
    )

    expect(check?.key).toBe('quality_checks')
    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('货板不一致')
  })

  test('builds deterministic warning for hard female-audience failures', () => {
    const check = buildFemaleAudienceDeterministicCheck(
      '女主一直被虐，没有退路，也没有安全感；关键选择都由男主安排，感情线脱离成长线，连续只虐，没有反转或糖，书名简介说她翻盘正文却货不对板。',
    )

    expect(check?.key).toBe('female_audience_forbidden')
    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toEqual(expect.arrayContaining(['安全感断裂', '女主被安排着赢', '感情线脱离成长线', '连续只虐', '货板不一致']))
  })

  test('prioritizes female-audience repairs', () => {
    expect(femaleAudiencePriority([
      { key: 'core_principles' },
      { key: 'female_audience_forbidden' },
    ])).toBe('优先清女频硬伤')

    expect(femaleAudiencePriority([
      { key: 'platform_fit_rules' },
      { key: 'quality_checks' },
    ])).toBe('优先补平台适配')
  })
})
