import { describe, expect, test } from 'bun:test'
import { countProseChars } from '../../novel-writing/word-target'
import { createProseWordTargetMethods } from './prose-word-target-methods'

const wordTarget = { mode: 'standard', label: '标准章', target: 4200, min: 3780, max: 4620, rangeText: '3780-4620 字' }
const contextPackage = { chapter_target: { word_target: wordTarget } }
const project = { id: 1, name: '测试书', reference_config: {} }

const sentencePool = [
  '走廊尽头的灯管闪了两下，才亮起来。',
  '他把登记本合上，指腹在封皮的裂口上蹭了一下。',
  '值班室的窗户没关严，风从缝里挤进来，吹得交接单哗啦作响。',
  '楼道里有人拖着步子走过，脚步声在第三级台阶上停了一停。',
  '桌上的搪瓷缸子还剩半杯凉茶，水面浮着一层薄薄的灰。',
  '他把钥匙串塞回口袋，铁环硌着大腿，隔着布料也硌得慌。',
  '监控屏幕的雪花点跳了一下，又恢复成灰蒙蒙的一片。',
  '门卫室的挂历停在上个月，没人记得去撕。',
  '他伸手去够抽屉最里面的手电，指尖先碰到一包受潮的火柴。',
  '暖气片敲了三声，不知道是楼上还是楼下传来的。',
  '登记本的最后一页折了个角，他捏着那个角，捏了很久。',
  '雨点先是零星几滴，砸在铁皮棚顶上，声音很闷。',
  '他把外套的拉链拉到下巴，又拉回胸口，来回两次。',
  '配电箱的门没锁，虚掩着，里面的老鼠早就搬走了。',
  '他数了一遍今晚的巡查点，数到第七个的时候停住了。',
]

function makeParas(nParas: number, dialogueEvery = 0): string[] {
  const paras: string[] = []
  for (let i = 0; i < nParas; i += 1) {
    if (dialogueEvery > 0 && i > 0 && i % dialogueEvery === 0) {
      paras.push('“今晚谁替你？”')
    } else {
      const a = sentencePool[i % sentencePool.length]
      const b = sentencePool[(i * 7 + 3) % sentencePool.length]
      const c = sentencePool[(i * 11 + 5) % sentencePool.length]
      paras.push(a + b + c)
    }
  }
  return paras
}

function buildText(targetChars: number, dialogueEvery = 0): string {
  let n = 8
  let text = makeParas(n, dialogueEvery).join('\n\n')
  while (countProseChars(text) < targetChars) {
    n += 1
    text = makeParas(n, dialogueEvery).join('\n\n')
  }
  return text
}

function makeMethods(fakeExec: (call: number) => any) {
  let calls = 0
  const methods = createProseWordTargetMethods({
    executeAgent: async () => {
      calls += 1
      return fakeExec(calls)
    },
    formatAdmissionError: (error: any) => String(error?.message || error).slice(0, 200),
    getStageModelId: () => undefined,
    getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
    trustedWordTargetContractionBudgets: new WeakSet<object>(),
  })
  return { methods, getCalls: () => calls }
}

describe('ensureProseMeetsWordTarget dialogue-forced expansion', () => {
  // In hard range [3780, 4620], dialogue paragraph ratio far below 0.12 → dialogue-forced expansion.
  const baseText = buildText(4300, 25)

  test('base fixture is in hard range and dialogue-poor', () => {
    const chars = countProseChars(baseText)
    expect(chars).toBeGreaterThanOrEqual(wordTarget.min)
    expect(chars).toBeLessThanOrEqual(wordTarget.max)
  })

  // Finding 35: dialogue-only trigger with every candidate rejected must return the real
  // evaluation of the returned text, not a synthesized too_short/word_target_short warning.
  test('returns real evaluation without synthetic word_target_short when all dialogue-expansion candidates are rejected', async () => {
    const { methods, getCalls } = makeMethods(() => ({ parsed: {}, finish_reason: 'stop' }))
    const result = await methods.ensureProseMeetsWordTarget('ws', project, contextPackage, baseText, undefined, {})

    expect(getCalls()).toBeGreaterThan(0)
    expect(result.final_text).toBe(baseText)
    expect(result.expanded).toBe(false)
    // Returned text is in hard range: evaluation must say so.
    expect(result.final_evaluation.passed).toBe(true)
    expect(result.final_evaluation.too_short).toBeFalsy()
    expect(result.final_evaluation.deficit || 0).toBe(0)
    // Dialogue debt is reported as its own field, not as a contradictory shortfall warning.
    expect(result.final_evaluation.dialogue_expand_required).toBe(true)
    expect(result.word_target_warning).toBeUndefined()
  })

  // Finding 33: expansion loop must stop once current text reaches/exceeds the hard ceiling,
  // and candidate selection must prefer in-hard-range text over merely longer text.
  test('stops expanding at the hard ceiling and keeps the in-range original over longer overshoot candidates', async () => {
    const candidateSizes = [4800, 5000, 5300]
    const { methods, getCalls } = makeMethods((call) => ({
      parsed: { chapter_text: buildText(candidateSizes[call - 1] || 5300, 25) },
      finish_reason: 'stop',
    }))
    const result = await methods.ensureProseMeetsWordTarget('ws', project, contextPackage, baseText, undefined, {})

    // Original text was already inside the hard range: never trade it for an over-max candidate.
    expect(countProseChars(result.final_text)).toBeLessThanOrEqual(wordTarget.max)
    expect(result.final_text).toBe(baseText)
    expect(result.expanded).toBe(false)
    expect(result.word_target_warning).toBeUndefined()
    // Once an accepted candidate pushed current text past the hard max, the loop must stop.
    expect(getCalls()).toBeLessThanOrEqual(2)
  })

  test('hard-short drafts still expand to an in-range candidate', async () => {
    const shortDraft = buildText(3000, 5)
    const expanded = buildText(4200, 5)
    const { methods, getCalls } = makeMethods(() => ({
      parsed: { chapter_text: expanded },
      finish_reason: 'stop',
    }))
    const result = await methods.ensureProseMeetsWordTarget('ws', project, contextPackage, shortDraft, undefined, {})

    expect(getCalls()).toBe(1)
    expect(result.expanded).toBe(true)
    expect(result.final_evaluation.passed).toBe(true)
    expect(countProseChars(result.final_text)).toBeGreaterThanOrEqual(wordTarget.min)
    expect(countProseChars(result.final_text)).toBeLessThanOrEqual(wordTarget.max)
  })

  test('hard-short draft with all candidates rejected still reports the real shortfall warning', async () => {
    const shortDraft = buildText(3000, 5)
    const { methods } = makeMethods(() => ({ parsed: {}, finish_reason: 'stop' }))
    const result = await methods.ensureProseMeetsWordTarget('ws', project, contextPackage, shortDraft, undefined, {})

    expect(result.final_text).toBe(shortDraft)
    expect(result.final_evaluation.too_short).toBe(true)
    expect(result.final_evaluation.passed).toBe(false)
    expect(result.word_target_warning?.code).toBe('word_target_short')
  })
})
