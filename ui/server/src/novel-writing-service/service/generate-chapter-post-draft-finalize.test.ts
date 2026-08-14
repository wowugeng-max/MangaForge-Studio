import { describe, expect, test } from 'bun:test'
import { R76_ZHUQUE_STACK_VERSION } from '../../novel-writing/r76-zhuque-stack'
import {
  collectFinalOpeningContinuityFailures,
  runPostDraftHumanizeAndOpeningHandoff,
} from './generate-chapter-post-draft-finalize'
import type { ChapterTaskExecution } from '../generation-source/types'

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

  test('propagates humanize task rejection by identity instead of recording a bounded failure', async () => {
    const rejection = new Error('humanize task rejected')

    await expect(runPostDraftHumanizeAndOpeningHandoff({
      activeWorkspace: '/tmp/novel',
      project: { id: 7 },
      contextPackage: {},
      characters: [],
      finalText: '林序把门带上，沿着走廊继续往前。',
      preferredModelId: undefined,
      llmControlOptions: { chapterTaskExecution: {} as ChapterTaskExecution },
      options: { skip_mid_monologue_densify: true },
      isZhuqueFast: false,
      runHumanizePostProcess: async () => { throw rejection },
      onStage: async () => {},
    })).rejects.toBe(rejection)
  })

  test('normalizes a cyclic terminal humanize report before the stage callback', async () => {
    const credential = 'dXNlcjpwYXNzd29yZA=='
    const report: any = {
      accepted: false,
      reason: `Authorization: Basic ${credential}`,
      raw: { provider_response: credential },
    }
    report.self = report
    const terminalReports: any[] = []

    await runPostDraftHumanizeAndOpeningHandoff({
      activeWorkspace: '/tmp/novel',
      project: { id: 7 },
      contextPackage: {},
      characters: [],
      finalText: '林序把门带上，沿着走廊继续往前。',
      preferredModelId: undefined,
      llmControlOptions: {},
      options: { skip_mid_monologue_densify: true },
      isZhuqueFast: false,
      runHumanizePostProcess: async (workspace: string, project: any, context: any, sourceText: string) => ({
        final_text: sourceText,
        report,
      }),
      onStage: async (stage: string, payload: any) => {
        if (stage === 'humanize_postprocess' && payload?.status !== 'running') terminalReports.push(payload.report)
      },
    })

    expect(terminalReports).toHaveLength(1)
    expect(() => JSON.stringify(terminalReports[0])).not.toThrow()
    expect(JSON.stringify(terminalReports[0]).includes(credential)).toBe(false)
    expect(terminalReports[0]).not.toHaveProperty('raw')
    expect(terminalReports[0]).not.toHaveProperty('self')
  })

  test('runs the writing-skill pass after humanize and uses the rewritten prose', async () => {
    const initialText = '林序把门带上，沿着走廊继续往前。'
    const humanized = `${initialText}他没有回头。`
    const skilled = `${humanized}口袋里的纸边硌了一下。`
    const stages: Array<{ stage: string; payload: any }> = []
    let skillInput = ''

    const result = await runPostDraftHumanizeAndOpeningHandoff({
      activeWorkspace: '/tmp/novel',
      project: { id: 7 },
      contextPackage: {},
      characters: [],
      finalText: initialText,
      preferredModelId: 217,
      llmControlOptions: {},
      options: { skip_mid_monologue_densify: true },
      isZhuqueFast: false,
      runHumanizePostProcess: async (_ws: string, _project: any, _ctx: any, sourceText: string) => ({
        final_text: humanized,
        report: { accepted: true },
      }),
      runWritingSkillHumanizePass: async (
        _ws: string,
        _project: any,
        _ctx: any,
        sourceText: string,
        _model: any,
        skillOptions: any,
      ) => {
        skillInput = sourceText
        await skillOptions?.onSkillProgress?.('fiction-humanizer-zh', { index: 2, total: 3 })
        return {
          final_text: skilled,
          report: {
            version: 'writing_skill_humanize_v2',
            accepted: true,
            changed: true,
            skipped: false,
            enabled_ids: ['fiction-humanizer-zh'],
            passes: [{ id: 'fiction-humanizer-zh', accepted: true }],
          },
        }
      },
      onStage: async (stage: string, payload: any) => {
        stages.push({ stage, payload })
      },
    })

    expect(skillInput).toBe(humanized)
    expect(result.finalText).toContain('纸边硌了一下')
    expect(result.writingSkillHumanize).toMatchObject({ accepted: true, skipped: false })
    expect(stages.map(item => [item.stage, item.payload.status])).toEqual([
      ['humanize_postprocess', 'running'],
      ['humanize_postprocess', 'success'],
      ['writing_skill_humanize', 'running'],
      ['writing_skill_humanize', 'running'],
      ['writing_skill_humanize', 'success'],
    ])
    expect(stages.some(item => (
      item.stage === 'writing_skill_humanize'
      && item.payload.status === 'running'
      && item.payload.skill_id === 'fiction-humanizer-zh'
      && item.payload.label === '写作skill · 小说去AI味（2/3）'
      && item.payload.skill_index === 2
      && item.payload.skill_total === 3
    ))).toBe(true)
  })

  test('keeps humanized prose when the writing-skill pass throws', async () => {
    const humanized = '林序把门带上，沿着走廊继续往前。他没有回头。'
    const stages: Array<{ stage: string; payload: any }> = []

    const result = await runPostDraftHumanizeAndOpeningHandoff({
      activeWorkspace: '/tmp/novel',
      project: { id: 7 },
      contextPackage: {},
      characters: [],
      finalText: '林序把门带上。',
      preferredModelId: undefined,
      llmControlOptions: {},
      options: { skip_mid_monologue_densify: true },
      isZhuqueFast: false,
      runHumanizePostProcess: async () => ({
        final_text: humanized,
        report: { accepted: true },
      }),
      runWritingSkillHumanizePass: async () => {
        throw new Error(`skill unavailable ${'x'.repeat(300)}`)
      },
      onStage: async (stage: string, payload: any) => {
        stages.push({ stage, payload })
      },
    })

    expect(result.finalText).toContain(humanized)
    expect(result.writingSkillHumanize).toMatchObject({
      version: 'writing_skill_humanize_v2',
      accepted: false,
      changed: false,
      skipped: false,
      warnings: [],
      passes: [],
      reason: 'writing_skill_humanize_failed',
    })
    expect(String(result.writingSkillHumanize?.error || '')).toHaveLength(240)
    expect(stages.filter(item => item.stage === 'writing_skill_humanize').map(item => item.payload.status)).toEqual([
      'running',
      'failed',
    ])
  })
})
