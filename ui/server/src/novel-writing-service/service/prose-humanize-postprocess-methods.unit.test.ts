import { describe, expect, test } from 'vitest'
import { createProseHumanizePostprocessMethods } from './prose-humanize-postprocess-methods'
import { countProseChars } from '../../novel-writing/word-target'
import { sanitizeDetectorHostileStock } from '../../novel-writing/human-webnovel-resistance'
import { sanitizeRemoveAiFlavorShells } from '../../novel-writing/humanize-postprocess'
import type { ChapterTaskExecution } from '../generation-source/types'

function extractWindowText(task: string): string {
  const at = task.indexOf('【原文窗口】')
  return at >= 0 ? task.slice(at + '【原文窗口】'.length).trim() : ''
}

function makeMethods(onWindow: (windowText: string, call: number) => string) {
  let call = 0
  return createProseHumanizePostprocessMethods({
    executeAgent: async (_agent: any, _project: any, payload: any) => {
      call += 1
      return { text: onWindow(extractWindowText(String(payload?.task || '')), call) }
    },
    getStageModelId: () => undefined,
    getStageTemperature: (_project: any, _stage: any, fallback: number) => fallback,
  })
}

function extractHumanizeInput(task: string): string {
  for (const marker of ['【原文窗口】', '【原文片段】']) {
    const at = task.indexOf(marker)
    if (at >= 0) return task.slice(at + marker.length).trim()
  }
  return ''
}

function makeRoutingMethods(onInput: (inputText: string, call: number) => string) {
  const calls: Array<{ stage: string; contract: string; agentId: string; project: any; context: any; options: any }> = []
  let fallbackCalls = 0
  const chapterTaskExecution = {
    executeAgent: async (stage: string, contract: string, agentId: string, project: any, context: any, options: any) => {
      calls.push({ stage, contract, agentId, project, context, options })
      return {
        text: onInput(extractHumanizeInput(String(context?.task || '')), calls.length),
        finish_reason: 'stop',
      }
    },
  } as unknown as ChapterTaskExecution
  const methods = createProseHumanizePostprocessMethods({
    executeAgent: async () => {
      fallbackCalls += 1
      throw new Error('legacy fallback must not run')
    },
    getStageModelId: () => { throw new Error('task path must not resolve a stage model') },
    getStageTemperature: (_project: any, _stage: any, fallback: number) => fallback,
  })
  return { methods, chapterTaskExecution, calls, getFallbackCalls: () => fallbackCalls }
}

function sanitizeBaseline(text: string): string {
  return sanitizeDetectorHostileStock(sanitizeRemoveAiFlavorShells(text))
}

const BASE_OPTIONS = {
  enable_humanize_postprocess: true,
  skip_dialogue_pause_ensure: true,
}

/** Packaging-heavy chapter: paragraphs 2-4 merge into one high-risk rewrite window. */
const PACKAGING_PARAS = [
  '“先别动。”她把杯子放在台面上，指腹蹭到一点灰，先不往系统里写。',
  '他嫌麻烦，把抽屉钥匙塞回口袋，锁芯发涩，拧了两下才动。',
  '门缝正在以不可逆的速度收窄，防夹感应器的感应灯闪烁得更加剧烈，十厘米，十五厘米。',
  '黑洞洞的空间里，仿佛有什么顺着风口倒灌进来，石灰味混杂着冷气冲进轿厢。',
  '名单纸上写着“未完结，顺延下一位”，精确到分钟的时间，以及一个体温读数。',
  '“交班表你签了没？”对面的人没接话，先把文件夹合上，纸边硌了一下手指。',
  '他把责任往回推了半句，又改口，先把班交了再说，袖口沾了点油污。',
]
const PACKAGING_SOURCE = PACKAGING_PARAS.join('\n\n')

/** Smooth he-chain chapter: human-deficit promotion creates a mid rewrite window. */
const SMOOTH_PARAS = [
  '他把巡检表夹在腋下，沿着走廊往配电间走，鞋底沾了点水渍。',
  '他在第三个阀门前停下，抄起手电看了看压力表的读数，数字稳在正常刻度。',
  '他把读数记在表格里，又核对了一遍设备编号，笔尖顿了一下。',
  '他拧紧阀门，把扳手放回工具包，拉链有点卡，拽了两下才合上。',
  '他在配电间门口停了一下，确认了门锁，然后转身往回走。',
  '他路过值班室窗口，看见里面的灯还亮着，桌上放着半杯凉茶。',
  '他把巡检表交回值班室，在签名栏写下自己的名字，笔画压得很重。',
  '他走出楼道时，天已经开始暗下来，路灯一盏一盏亮起。',
]
const SMOOTH_SOURCE = SMOOTH_PARAS.join('\n\n')

/** Human-positive friction pad (dialogue + pause + private noise); sliced per scenario. */
const FRICTION_PAD = '“这一单先记我头上？”他顿了两秒没接话，指腹在纸边蹭出一道毛刺，先不往系统里写，回头再补，免得又要背锅，多一事不如少一事，先把班交了，回头有人问起再说，反正单子在他手里。'

describe('prose humanize postprocess methods (risk_segment service path)', () => {
  test('#22 window compressed to one paragraph deletes surplus originals in final text', async () => {
    // LLM compresses the 3-paragraph packaging window into a single paragraph (prompt S2: delete packaging).
    const rewritten = '他伸手挡了一下门，门弹回去半寸，他趁势把平车拽出来，没去看那张纸。“先别管这个。”他顿了一下，先把人推进抢救间，钥匙在口袋里硌着手指，他嫌烦，没掏。'
    const { runHumanizePostProcess } = makeMethods(() => rewritten)
    const res = await runHumanizePostProcess('/tmp/ws', {}, {}, PACKAGING_SOURCE, undefined, { ...BASE_OPTIONS })

    const windowStage = res.report.stages.find((s) => s.stage === 'risk_window_round_1')
    expect(windowStage?.accepted).toBe(true)
    // Accepted rewrite must land once...
    expect(res.final_text).toContain('他伸手挡了一下门')
    // ...and the compressed-away packaging paragraphs must not be resurrected
    // (their sanitized remnants carried these fragments before the fix).
    expect(res.final_text).not.toContain('顺着风口倒灌')
    expect(res.final_text).not.toContain('体温读数')
    // Untouched low-risk paragraphs stay intact.
    expect(res.final_text).toContain('交班表你签了没')
    expect(res.final_text).toContain('袖口沾了点油污')
  })

  test('#36 humanize gate honors intended 0.55 tolerance for risk-segment growth', async () => {
    // Single human-positive window grows the chapter by ~40% — inside the intended
    // 0.55 tolerance but outside assessHumanizeLengthLock's silent 0.35 clamp.
    const { runHumanizePostProcess } = makeMethods((windowText) => `${windowText}\n\n${FRICTION_PAD.slice(0, 72)}`)
    const res = await runHumanizePostProcess('/tmp/ws', {}, {}, SMOOTH_SOURCE, undefined, { ...BASE_OPTIONS })

    const windowStage = res.report.stages.find((s) => s.stage === 'risk_window_round_1')
    expect(windowStage?.accepted).toBe(true)
    const growth = (countProseChars(res.final_text) - countProseChars(SMOOTH_SOURCE)) / countProseChars(SMOOTH_SOURCE)
    expect(growth).toBeGreaterThan(0.35)
    expect(growth).toBeLessThanOrEqual(0.55)
    expect(res.final_text).toContain(FRICTION_PAD.slice(0, 10))
    expect(res.report.stages.some((s) => s.stage === 'humanize_gate_reject')).toBe(false)
    expect(res.report.reject_reason).toBeUndefined()
  })

  test('#36 humanize gate rejection reverts to pre-rewrite baseline, not the rejected text', async () => {
    // Two rounds pile up ~+100% growth — beyond even the intended 0.55 tolerance,
    // so the gate must reject AND the rejection must actually revert the rewrite.
    const { runHumanizePostProcess } = makeMethods((windowText) => `${windowText}\n\n${FRICTION_PAD.slice(0, 72)}`)
    const res = await runHumanizePostProcess('/tmp/ws', {}, {}, SMOOTH_SOURCE, undefined, {
      ...BASE_OPTIONS,
      risk_rewrite_rounds: 2,
    })

    expect(res.report.stages.some((s) => s.stage === 'humanize_gate_reject')).toBe(true)
    // The rejected over-grown candidate must not leak into the final text.
    expect(res.final_text).not.toContain(FRICTION_PAD.slice(0, 10))
    // Fallback is the deterministic pre-LLM baseline (sanitize only).
    expect(res.final_text).toBe(sanitizeBaseline(SMOOTH_SOURCE))
  })

  test('#37 accepted rewrite with coincidentally equal char count is not treated as no-op', async () => {
    const baseline = sanitizeBaseline(SMOOTH_SOURCE)
    // Deterministic shells change this source (forced !== source), so the buggy
    // char-count no-op branch would overwrite the final text with sanitize(source).
    expect(baseline).not.toBe(SMOOTH_SOURCE)
    const rewriteBase = '他嫌烦，先不往表上写，笔尖在纸边压出一道毛刺，指腹蹭了蹭，回头再补两句，免得月底又说不清楚。'
    const { runHumanizePostProcess } = makeMethods((windowText, call) => {
      if (call > 1) return windowText
      // Engineer the window rewrite so the final chapter char count equals the
      // source char count exactly while the content clearly differs.
      const target = countProseChars(windowText) - (countProseChars(baseline) - countProseChars(SMOOTH_SOURCE))
      return rewriteBase.slice(0, target)
    })
    const res = await runHumanizePostProcess('/tmp/ws', {}, {}, SMOOTH_SOURCE, undefined, {
      ...BASE_OPTIONS,
      max_risk_windows: 1,
    })

    const windowStage = res.report.stages.find((s) => s.stage === 'risk_window_round_1')
    expect(windowStage?.accepted).toBe(true)
    // Char counts collide by construction, but the content differs → not a no-op.
    expect(countProseChars(res.final_text)).toBe(countProseChars(SMOOTH_SOURCE))
    expect(res.final_text).not.toBe(SMOOTH_SOURCE)
    expect(res.final_text).toContain(rewriteBase.slice(0, 6))
    expect(res.report.stages.some((s) => s.stage === 'force_packaging_strip_on_noop')).toBe(false)
  })
})

describe('chapter task stage routing for humanize postprocess', () => {
  test('routes a risk-segment rewrite through the humanize prose contract', async () => {
    const rewritten = '他伸手挡住门，门弹回半寸。“先救人。”他把平车拽出来，钥匙硌在口袋里，没再看名单。'
    const { methods, chapterTaskExecution, calls, getFallbackCalls } = makeRoutingMethods(() => rewritten)

    await methods.runHumanizePostProcess('/tmp/ws', {}, {}, PACKAGING_SOURCE, undefined, {
      ...BASE_OPTIONS,
      chapterTaskExecution,
      abortSignal: AbortSignal.timeout(5000),
      llmTimeoutMs: 34567,
    })

    expect(calls.length).toBeGreaterThan(0)
    expect(calls.every(call => call.stage === 'humanize')).toBe(true)
    expect(calls.every(call => call.contract === 'humanize_prose')).toBe(true)
    expect(calls.every(call => call.agentId === 'prose-agent')).toBe(true)
    expect(calls.every(call => call.options.modelId === undefined)).toBe(true)
    expect(calls.every(call => call.options.timeoutMs === 34567)).toBe(true)
    expect(getFallbackCalls()).toBe(0)
  })

  test('routes every full-pass chunk through the same task execution', async () => {
    const chunkedSource = Array.from({ length: 90 }, (_, index) => (
      `江澈把巡检表翻到第${index + 1}页，指腹压住纸角，先核对阀门编号，再把读数写进对应栏位。`
    )).join('\n\n')
    expect(countProseChars(chunkedSource)).toBeGreaterThan(1900)
    const { methods, chapterTaskExecution, calls, getFallbackCalls } = makeRoutingMethods(inputText => inputText)

    await methods.runHumanizePostProcess('/tmp/ws', {}, {}, chunkedSource, undefined, {
      ...BASE_OPTIONS,
      chapterTaskExecution,
      full_pass_a: true,
    })

    expect(calls.length).toBeGreaterThan(1)
    expect(calls.every(call => call.stage === 'humanize' && call.contract === 'humanize_prose')).toBe(true)
    expect(getFallbackCalls()).toBe(0)
  })

  test('keeps repeated risk-rewrite rounds on the humanize task execution', async () => {
    const { methods, chapterTaskExecution, calls, getFallbackCalls } = makeRoutingMethods(inputText => `${inputText}\n\n${FRICTION_PAD.slice(0, 72)}`)

    await methods.runHumanizePostProcess('/tmp/ws', {}, {}, SMOOTH_SOURCE, undefined, {
      ...BASE_OPTIONS,
      chapterTaskExecution,
      risk_rewrite_rounds: 2,
    })

    expect(calls.length).toBeGreaterThanOrEqual(2)
    expect(calls.every(call => call.stage === 'humanize' && call.contract === 'humanize_prose')).toBe(true)
    expect(getFallbackCalls()).toBe(0)
  })
})
