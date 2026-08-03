import { describe, expect, test } from 'bun:test'
import { countProseChars } from '../../novel-writing/word-target'
import type { ChapterTaskExecution } from '../generation-source/types'
import { createProsePolishMethods } from './prose-polish-methods'

const wordTarget = { mode: 'standard', label: '标准章', target: 4200, min: 3780, max: 4620, rangeText: '3780-4620 字' }
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
]

function buildParas(nParas: number): string[] {
  const paras: string[] = []
  for (let i = 0; i < nParas; i += 1) {
    const a = sentencePool[i % sentencePool.length]
    const b = sentencePool[(i * 3 + 1) % sentencePool.length]
    paras.push(a + b)
  }
  return paras
}

// ~24 paragraphs, ~700+ chars: enough body for the polish gates to be meaningful.
const chapterText = buildParas(24).join('\n\n')

/** Candidate cut to ~87% of the original: over the local 0.85 floor, under the humanize 0.9 lock. */
function buildShortCandidate(source: string): string {
  const paras = source.split('\n\n')
  const target = Math.floor(countProseChars(source) * 0.87)
  const kept: string[] = []
  for (const para of paras) {
    kept.push(para)
    if (countProseChars(kept.join('\n\n')) >= target) break
  }
  return kept.join('\n\n')
}

/** Candidate padded to ~115% of the original: trips the humanize +10% length lock. */
function buildLongCandidate(source: string): string {
  const padding = buildParas(24).slice(0, 8).join('\n\n')
  let candidate = source
  while (countProseChars(candidate) < Math.ceil(countProseChars(source) * 1.15)) {
    candidate = `${candidate}\n\n${padding}`
  }
  return candidate
}

function makeMethods(fakeResult: any) {
  let calls = 0
  const methods = createProsePolishMethods({
    executeAgent: async () => {
      calls += 1
      return fakeResult
    },
    getStageModelId: () => undefined,
    getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
  })
  return { methods, getCalls: () => calls }
}

function makeRoutingMethods(resultForStage: (stage: string) => any) {
  const calls: Array<{ stage: string; contract: string; agentId: string; project: any; context: any; options: any }> = []
  let fallbackCalls = 0
  const chapterTaskExecution = {
    executeAgent: async (stage: string, contract: string, agentId: string, callProject: any, context: any, options: any) => {
      calls.push({ stage, contract, agentId, project: callProject, context, options })
      return resultForStage(stage)
    },
  } as unknown as ChapterTaskExecution
  const methods = createProsePolishMethods({
    executeAgent: async () => {
      fallbackCalls += 1
      throw new Error('legacy fallback must not run')
    },
    getStageModelId: () => { throw new Error('task path must not resolve a stage model') },
    getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
  })
  return { methods, chapterTaskExecution, calls, getFallbackCalls: () => fallbackCalls }
}

describe('runCommercialEditorRewrite edited flag', () => {
  const contextPackage = { chapter_target: { word_target: wordTarget } }

  test('reports edited=false when the humanize gate rejects the rewrite and falls back to the original', async () => {
    const rewritten = buildShortCandidate(chapterText)
    const ratio = countProseChars(rewritten) / countProseChars(chapterText)
    // Fixture sanity: over the local 0.85 floor, under the humanize 0.9 lock.
    expect(ratio).toBeGreaterThanOrEqual(0.85)
    expect(ratio).toBeLessThan(0.9)

    const { methods } = makeMethods({
      parsed: { chapter_text: rewritten, editor_report: { passed: true } },
      finish_reason: 'stop',
    })
    const result = await methods.runCommercialEditorRewrite('ws', project, contextPackage, chapterText, undefined, {})

    expect(result.final_text).toBe(chapterText)
    expect(result.edited).toBe(false)
  })

  test('still reports edited=true when the rewrite is accepted end to end', async () => {
    // Same paragraph skeleton, one sentence swapped: passes length lock and fingerprint continuity.
    const paras = chapterText.split('\n\n')
    paras[10] = '他把手电在掌心里颠了一下，光柱扫过配电箱的门缝。桌上的搪瓷缸子还剩半杯凉茶，水面浮着一层薄薄的灰。'
    const rewritten = paras.join('\n\n')
    expect(rewritten).not.toBe(chapterText)

    const { methods } = makeMethods({
      parsed: { chapter_text: rewritten, editor_report: { passed: true } },
      finish_reason: 'stop',
    })
    const result = await methods.runCommercialEditorRewrite('ws', project, contextPackage, chapterText, undefined, {})

    expect(result.final_text).toBe(rewritten)
    expect(result.edited).toBe(true)
  })
})

describe('runMemePolish polished flag', () => {
  const contextPackage = {
    chapter_target: {
      word_target: wordTarget,
      meme_strategy: { intensity: '低', meme_bank: ['稳住'] },
    },
  }

  test('reports polished=false when the humanize gate rejects the polish and falls back to the original', async () => {
    const polished = buildLongCandidate(chapterText)
    expect(countProseChars(polished)).toBeGreaterThan(Math.ceil(countProseChars(chapterText) * 1.1))

    const { methods } = makeMethods({
      parsed: { chapter_text: polished, meme_polish_report: { changed_plot: false } },
      finish_reason: 'stop',
    })
    const result = await methods.runMemePolish('ws', project, contextPackage, chapterText, undefined, {})

    expect(result.final_text).toBe(chapterText)
    expect(result.polished).toBe(false)
  })
})

describe('chapter task stage routing for prose polish', () => {
  const contextPackage = {
    chapter_target: {
      word_target: wordTarget,
      meme_strategy: { intensity: '低', meme_bank: ['稳住'] },
    },
  }

  test('routes editor, meme, and readability calls with their exact stage contracts', async () => {
    const { methods, chapterTaskExecution, calls, getFallbackCalls } = makeRoutingMethods(stage => {
      if (stage === 'readability_review') {
        return { parsed: { readability_score: 88, passed: true }, modelName: 'fixed-task-model' }
      }
      const report = stage === 'commercial_editor_rewrite'
        ? { editor_report: { passed: true } }
        : { meme_polish_report: { changed_plot: false } }
      return { parsed: { chapter_text: chapterText, ...report }, finish_reason: 'stop', modelName: 'fixed-task-model' }
    })
    const options = {
      chapterTaskExecution,
      abortSignal: AbortSignal.timeout(5000),
      llmTimeoutMs: 23456,
    }

    await methods.runCommercialEditorRewrite('ws', project, contextPackage, chapterText, undefined, options)
    await methods.runMemePolish('ws', project, contextPackage, chapterText, undefined, options)
    await methods.runReadabilityReview('ws', project, contextPackage, chapterText, undefined, options)

    expect(calls.map(({ stage, contract, agentId }) => ({ stage, contract, agentId }))).toEqual([
      { stage: 'commercial_editor_rewrite', contract: 'editor_rewrite_prose', agentId: 'prose-agent' },
      { stage: 'meme_polish', contract: 'meme_polish_prose', agentId: 'prose-agent' },
      { stage: 'readability_review', contract: 'readability_json', agentId: 'review-agent' },
    ])
    expect(calls.every(call => call.project === project)).toBe(true)
    expect(calls.every(call => Boolean(call.context.task))).toBe(true)
    expect(calls.every(call => call.options.activeWorkspace === 'ws')).toBe(true)
    expect(calls.every(call => call.options.timeoutMs === 23456)).toBe(true)
    expect(calls.every(call => call.options.signal === options.abortSignal)).toBe(true)
    expect(getFallbackCalls()).toBe(0)
  })

  test('propagates task execution rejection without attempting legacy fallback', async () => {
    const rejection = new Error('task execution rejected')
    const { methods, chapterTaskExecution, getFallbackCalls } = makeRoutingMethods(() => Promise.reject(rejection))

    await expect(methods.runReadabilityReview('ws', project, contextPackage, chapterText, undefined, {
      chapterTaskExecution,
    })).rejects.toBe(rejection)
    expect(getFallbackCalls()).toBe(0)
  })
})
