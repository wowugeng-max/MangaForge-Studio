import { describe, expect, test } from 'bun:test'
import {
  R76_ZHUQUE_STACK_VERSION,
  R76_ZHUQUE_STACK_BASELINE,
  buildR76HumanizeDefaultOptions,
  buildR76PromptDirectives,
  applyR76PreStoreSanitize,
  describeR76ZhuqueStack,
} from './r76-zhuque-stack'
import { buildModelFamilyStrategy, formatModelFamilyStrategyPrompt } from './model-family-strategy'

describe('R76 Zhuque stack — main pipeline defaults', () => {
  test('locks version and baseline high-water', () => {
    expect(R76_ZHUQUE_STACK_VERSION).toBe('r76-stable-v1.12')
    expect(R76_ZHUQUE_STACK_BASELINE.round).toBe('r76')
    expect(R76_ZHUQUE_STACK_BASELINE.human_pct).toBe(72.59)
    expect(R76_ZHUQUE_STACK_BASELINE.suspected_pct).toBe(27.41)
  })

  test('describeR76ZhuqueStack defaults forbid R77 heavy opening, prefer light opening', () => {
    const desc = describeR76ZhuqueStack()
    expect(desc.defaults.humanize_mode).toBe('risk_segment')
    expect(desc.defaults.pass_b).toBe(false)
    expect(desc.defaults.full_pass_a).toBe(false)
    expect(desc.defaults.aggressive_opening_process).toBe(false)
    expect(desc.defaults.light_opening).toBe(true)
    expect(desc.layers.some((x) => x.includes('R78') && x.includes('not R77'))).toBe(true)
  })

  test('buildR76HumanizeDefaultOptions returns production defaults', () => {
    const opts = buildR76HumanizeDefaultOptions()
    expect(opts.enable_humanize_postprocess).toBe(true)
    expect(opts.enableHumanizePostprocess).toBe(true)
    expect(opts.humanize_mode).toBe('risk_segment')
    expect(opts.humanizeMode).toBe('risk_segment')
    expect(opts.enable_humanize_pass_b).toBe(false)
    expect(opts.full_pass_a).toBe(false)
    expect(opts.r76_zhuque_stack).toBe(R76_ZHUQUE_STACK_VERSION)
    expect(opts.max_risk_windows).toBe(3)
    expect(opts.risk_rewrite_rounds).toBe(1)
  })

  test('caller overrides can still skip humanize or opt into pass B', () => {
    const opts = buildR76HumanizeDefaultOptions({
      skip_humanize_postprocess: true,
      enable_humanize_pass_b: true,
    })
    expect(opts.skip_humanize_postprocess).toBe(true)
    expect(opts.enable_humanize_pass_b).toBe(true)
    expect(opts.humanize_mode).toBe('risk_segment')
    expect(opts.r76_zhuque_stack).toBe(R76_ZHUQUE_STACK_VERSION)
  })

  test('buildR76PromptDirectives tags stack and includes resistance contract lines', () => {
    const dirs = buildR76PromptDirectives()
    const joined = dirs.join('\n')
    expect(joined).toContain(R76_ZHUQUE_STACK_VERSION)
    expect(joined).toMatch(/R76|朱雀|人味|指纹|绿/)
    expect(joined).toMatch(/双功能|切开|boundary|未完成决策/)
  })

  test('model-family strategy prompt injects R76 stack directives for all families', () => {
    const gemini = buildModelFamilyStrategy({ model_name: 'gemini-3.6-flash', provider_id: 'gemini' })
    const prompt = formatModelFamilyStrategyPrompt(gemini).join('\n')
    expect(prompt).toContain(R76_ZHUQUE_STACK_VERSION)
    expect(prompt).toContain('【R76栈·锁定默认')
  })


  test('buildR76PromptDirectives includes empirical multi-island geometry (v1.12)', () => {
    const joined = buildR76PromptDirectives().join('\n')
    expect(joined).toContain('多绿岛')
    expect(joined).toContain('39.75')
    expect(joined).toContain('多绿岛')
    expect(joined).toMatch(/绿岛两类轮换|对白段占比/)
    expect(joined).toMatch(/禁 stamp 模板化|他停了一拍/)
  })


  test('applyR76PreStoreSanitize can skip mid-monologue densify', () => {
    const pad = Array.from({ length: 16 }, (_, i) => `开篇${i}，他先把门关上。`).join('\n\n')
    const mid = Array.from({ length: 20 }, (_, i) => `他想着第${i}个可能，把线索在脑子里过了一遍，没有跟人说话，只是继续核对地址和名单。`).join('\n\n')
    const raw = [pad, mid, '他把门带上。'].join('\n\n')
    const withDensify = applyR76PreStoreSanitize(raw)
    const noDensify = applyR76PreStoreSanitize(raw, { skip_mid_monologue_densify: true })
    const pauseSkip = noDensify.split('他停了一拍').length - 1
    const pauseOn = withDensify.split('他停了一拍').length - 1
    expect(pauseSkip).toBeLessThanOrEqual(3)
    expect(pauseSkip).toBeLessThanOrEqual(pauseOn)
    expect(noDensify.length).toBeGreaterThan(100)
  })

  test('applyR76PreStoreSanitize hard-caps hostile micro-beat stamps', () => {
    const pad = Array.from({ length: 18 }, (_, i) => `他继续往前走第${i + 1}步，走廊灯还亮着。`).join('\n\n')
    const stamps = Array.from({ length: 12 }, () => '他停了一拍。').join('\n\n')
    const more = Array.from({ length: 8 }, () => '他没吭声。').join('\n\n')
    const raw = [pad, stamps, more, '他把门带上，没再回头。'].join('\n\n')
    const cleaned = applyR76PreStoreSanitize(raw)
    const pause = cleaned.split('他停了一拍').length - 1
    const quiet = cleaned.split('他没吭声').length - 1
    expect(pause).toBeLessThanOrEqual(3)
    expect(quiet).toBeLessThanOrEqual(3)
  })

  test('applyR76PreStoreSanitize strips vital colon cascade (R76 path)', () => {
    const pad = Array.from({ length: 20 }, (_, i) => `他走了第${i + 1}步，鞋底蹭过地砖，没急着进门。`).join('\n\n')
    const report = [
      '他先把手压上去。',
      '心率：零。',
      '血氧：没读到。',
      '血压：无。',
      '他盯着那个数字看了一会儿。',
    ].join('\n\n')
    const raw = [pad, report, pad].join('\n\n')
    const cleaned = applyR76PreStoreSanitize(raw)
    expect(cleaned).not.toMatch(/^心率：/m)
    expect(cleaned).not.toMatch(/^血氧：/m)
    expect(cleaned).not.toMatch(/^血压：/m)
  })

  test('applyR76PreStoreSanitize ensures dual-zone dialogue-pause windows on smooth text', () => {
    const smooth = Array.from({ length: 18 }, (_, i) => `他继续检查第${i + 1}处，把结果压进夹子，没有对白摩擦。`).join('\n\n')
    const cleaned = applyR76PreStoreSanitize(smooth)
    expect(cleaned.length).toBeGreaterThan(smooth.length)
    expect(cleaned).toMatch(/[“"]/)
  })

  test('applyR76PreStoreSanitize strips semi-science stock lines', () => {
    const sample = [
      '他摸了摸颈侧。',
      '按理说这种从外头抬进来的躯体，四肢早就该凉透。',
      '一个人只要心跳停止，体温就会按照环境温度快速下降。',
      '他抬头看向门口。',
    ].join('\n\n')
    const cleaned = applyR76PreStoreSanitize(sample)
    expect(cleaned.includes('按理说')).toBe(false)
    expect(cleaned.includes('一个人只要')).toBe(false)
  })

  test('applyR76PreStoreSanitize repairs rare near-miss protagonist name slips', () => {
    const raw = [
      '林序把纸条按实。',
      '林晓没抬头。',
      '林序继续往前走，鞋底蹭过地砖。',
      '走廊灯闪了一下，林序没停。',
    ].join('\n\n')
    const cleaned = applyR76PreStoreSanitize(raw, {
      characters: [{ name: '林序', role_type: 'protagonist' }],
    })
    expect(cleaned).toContain('林序')
    expect(cleaned).not.toContain('林晓')
  })

})
