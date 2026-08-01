import { describe, expect, test } from 'bun:test'
import { R76_ZHUQUE_STACK_VERSION } from '../../novel-writing/r76-zhuque-stack'
import {
  collectFinalOpeningContinuityFailures,
  runPostDraftHumanizeAndOpeningHandoff,
} from './generate-chapter-post-draft-finalize'

describe('post-draft humanize and opening-handoff finalization', () => {
  test('runs humanize before sanitize and opening-handoff repair while preserving option aliases', async () => {
    const initialText = '林序把手机手电筒压低，照在三张折叠纸条最下端。他先检查编号。'
    const previousChapter = {
      chapter_text: '林序把三张纸塞进口袋。\n\n脚步声在门外停了。\n',
      ending_hook: '脚步声在门外停了',
    }
    const contextPackage = { continuity: { previous_chapter: previousChapter } }
    const stages: Array<{ stage: string; payload: any }> = []
    let humanizeCall: any[] = []

    const result = await runPostDraftHumanizeAndOpeningHandoff({
      activeWorkspace: '/tmp/novel',
      project: { id: 7 },
      contextPackage,
      characters: [{ name: '林序', role_type: 'protagonist' }],
      finalText: initialText,
      preferredModelId: 217,
      llmControlOptions: { abortSignal: 'signal', llmTimeoutMs: 1234 },
      options: {
        skip_humanize_postprocess: true,
        enableHumanizePostprocess: false,
        skipMidMonologueDensify: true,
      },
      isZhuqueFast: false,
      runHumanizePostProcess: async (...args: any[]) => {
        humanizeCall = args
        return { final_text: initialText, report: { accepted: true } }
      },
      onStage: async (stage: string, payload: any) => {
        stages.push({ stage, payload })
      },
    })

    expect(humanizeCall.slice(0, 5)).toEqual([
      '/tmp/novel',
      { id: 7 },
      contextPackage,
      initialText,
      217,
    ])
    expect(humanizeCall[5]).toMatchObject({
      abortSignal: 'signal',
      llmTimeoutMs: 1234,
      skip_humanize_postprocess: true,
      skipHumanizePostprocess: true,
      enable_humanize_postprocess: false,
      enableHumanizePostprocess: false,
      r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
    })
    expect(result.humanizePostprocess).toEqual({
      accepted: true,
      r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
    })
    expect(collectFinalOpeningContinuityFailures(result.finalText, contextPackage)).toEqual([])
    expect(result.finalText).toMatch(/门外|脚步|门把/)
    expect(stages.map(item => item.stage)).toEqual([
      'humanize_postprocess',
      'humanize_postprocess',
      'opening_handoff_bridge',
    ])
    expect(stages[0]?.payload).toMatchObject({ status: 'running' })
    expect(stages[1]?.payload).toMatchObject({ status: 'success' })
    expect(stages[2]?.payload).toMatchObject({ status: 'success' })
  })

  test('keeps the incoming prose and records a bounded failure when humanize throws', async () => {
    const initialText = '林序把门带上，沿着走廊继续往前。'
    const stages: Array<{ stage: string; payload: any }> = []

    const result = await runPostDraftHumanizeAndOpeningHandoff({
      activeWorkspace: '/tmp/novel',
      project: { id: 7 },
      contextPackage: {},
      characters: [],
      finalText: initialText,
      preferredModelId: undefined,
      llmControlOptions: {},
      options: { skip_mid_monologue_densify: true },
      isZhuqueFast: false,
      runHumanizePostProcess: async () => {
        throw new Error(`humanize unavailable ${'x'.repeat(300)}`)
      },
      onStage: async (stage: string, payload: any) => {
        stages.push({ stage, payload })
      },
    })

    expect(result.finalText).toContain(initialText)
    expect(result.humanizePostprocess).toMatchObject({
      version: 'humanize_postprocess_v3',
      enabled: true,
      accepted: false,
      skipped: false,
      reason: 'humanize_postprocess_failed',
      r76_zhuque_stack: R76_ZHUQUE_STACK_VERSION,
    })
    expect(result.humanizePostprocess.error.length).toBe(240)
    expect(collectFinalOpeningContinuityFailures(result.finalText, {})).toEqual([])
    expect(stages.map(item => [item.stage, item.payload.status])).toEqual([
      ['humanize_postprocess', 'running'],
      ['humanize_postprocess', 'failed'],
    ])
  })
})
