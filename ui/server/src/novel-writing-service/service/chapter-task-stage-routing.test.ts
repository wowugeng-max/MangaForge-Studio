import { describe, expect, test } from 'bun:test'
import {
  executeChapterStage,
  type ChapterTaskExecution,
} from '../generation-source/types'
import { ChapterSourceLeaseRegistry } from '../generation-source/chapter-source-lease'
import { createNovelWritingService } from './create-novel-writing-service'
import { runQualityLoopPhase } from './generate-chapter-quality-prestore-loop'
import { createProseSelfReviewRunner } from './prose-self-review-run'
import { prepareStoryStateUpdate } from './story-state-machine-prepare'
import { createStructuredReviewFillMethods } from './structured-review-fill-methods'

type StageCall = {
  stage: string
  contract: string
  agentId: string
  project: any
  context: any
  options: any
}

function makeExecutionSpy(resultForCall: (call: StageCall) => any) {
  const calls: StageCall[] = []
  let fallbackCalls = 0
  const execution = {
    executeAgent: async (stage: string, contract: string, agentId: string, project: any, context: any, options: any) => {
      const call = { stage, contract, agentId, project, context, options }
      calls.push(call)
      return resultForCall(call)
    },
  } as unknown as ChapterTaskExecution
  const fallback = async () => {
    fallbackCalls += 1
    throw new Error('legacy fallback must not run')
  }
  return { execution, calls, fallback, getFallbackCalls: () => fallbackCalls }
}

const project = { id: 5, title: '统一来源测试', reference_config: {} }
const qualitySentencePool = [
  '走廊尽头的灯管闪了两下，才亮起来。',
  '他把登记本合上，指腹在封皮的裂口上蹭了一下。',
  '值班室的窗户没关严，风从缝里挤进来，吹得交接单哗啦作响。',
  '楼道里有人拖着步子走过，脚步声在第三级台阶上停了一停。',
  '桌上的搪瓷缸子还剩半杯凉茶，水面浮着一层薄薄的灰。',
  '他把钥匙串塞回口袋，铁环硌着大腿，隔着布料也硌得慌。',
  '监控屏幕的雪花点跳了一下，又恢复成灰蒙蒙的一片。',
  '门卫室的挂历停在上个月，没人记得去撕。',
]
const chapterText = Array.from({ length: 90 }, (_, index) => index % 4 === 0
  ? `“第${index + 1}次巡查谁替你？”他没接话，先把钥匙按在桌边。`
  : `${qualitySentencePool[index % qualitySentencePool.length]}${qualitySentencePool[(index * 3 + 1) % qualitySentencePool.length]}他在第${index + 1}格停笔。`
).join('\n\n')
const contextPackage = { chapter_target: { word_target: { target: 4200, min: 3780, max: 4620 } } }
const sixDimensions = {
  continuity: 7,
  core_promise_agency: 7,
  conflict_causality: 7,
  payoff_hook: 7,
  prose_style: 7,
  fact_setting_safety: 8,
}
const rejectTaskStageModelResolution = () => { throw new Error('task path must not resolve a stage model') }

function qualityLoopArgs(
  chapterTaskExecution: ChapterTaskExecution,
  executeAgent: (...args: any[]) => any,
  optionOverrides: Record<string, any> = {},
) {
  return {
    options: { chapterTaskExecution, max_quality_revision_rounds: 1, ...optionOverrides },
    project,
    chapter: { id: 9, chapter_no: 1 },
    projectId: project.id,
    activeWorkspace: 'ws',
    preferredModelId: 557,
    llmControlOptions: {},
    qualityRepairTimeoutMs: 56789,
    qualityThreshold: 78,
    isDraftOnly: false,
    isDraftReviewOnly: false,
    generationContract: { chapter: { chapter_no: 1 } },
    contextPackage,
    wordTarget: contextPackage.chapter_target.word_target,
    wordTargetCompatibility: null,
    wordTargetExpansionPatches: [],
    finalText: chapterText,
    finalSceneBreakdown: [],
    finalContinuityNotes: [],
    ohStoryDeliveryReceipts: {},
    qualityWarningCandidates: [],
    editorRewrite: null,
    memePolish: null,
    readabilityReview: null,
    draftPromptDiagnostics: {},
    productionMode: 'full',
    configSnapshot: {},
    qualityGateProject: project,
    executeAgent,
    getStageModelId: rejectTaskStageModelResolution,
    runReadabilityReview: async () => null,
    throwIfChapterGenerationAborted: () => {},
    onStage: async () => {},
  }
}

function revisionFailureFixture(
  source: 'model' | 'mcp',
  revisionFailure: Error,
) {
  const fixture = makeExecutionSpy(call => {
    if (call.stage === 'quality_repair') return Promise.reject(revisionFailure)
    return {
      parsed: {
        score: 70,
        score_scale: '0-100',
        publishable: true,
        dimensions: sixDimensions,
        findings: [{
          key: 'locatable_causality',
          severity: 'S2',
          dimension: 'conflict_causality',
          evidence: '交接单拍在台上',
          required_change: '让交接动作产生新的现场后果',
          acceptance_test: '动作与结果形成因果链',
        }],
      },
      modelName: 'fixed-task-model',
    }
  })
  Object.defineProperty(fixture.execution, 'source', {
    configurable: true,
    enumerable: true,
    value: source,
  })
  return fixture
}

describe('chapter task routing for review and state leaves', () => {
  test('routes self review and self revision to their exact task stages', async () => {
    const { execution, calls, fallback, getFallbackCalls } = makeExecutionSpy(call => {
      if (call.stage === 'quality_review') {
        return {
          parsed: {
            score: 60,
            passed: false,
            needs_revision: true,
            issues: [{ severity: 'S2', message: '补足主动动作' }],
          },
          modelName: 'fixed-task-model',
        }
      }
      return {
        parsed: { prose_chapters: [{ chapter_text: chapterText.replace('登记本', '交接簿') }] },
        finish_reason: 'stop',
        modelName: 'fixed-task-model',
      }
    })
    const runner = createProseSelfReviewRunner({
      executeAgent: fallback,
      getStageModelId: rejectTaskStageModelResolution,
      getStageTemperature: (_project: any, _stage: string, fallbackValue: number) => fallbackValue,
      fillMissingStructuredReviewChecks: async () => null,
    })

    await runner('ws', project, contextPackage, chapterText, undefined, {
      chapterTaskExecution: execution,
      fill_missing_structured_checks: false,
      abortSignal: AbortSignal.timeout(5000),
      llmTimeoutMs: 45678,
    })

    expect(calls.map(({ stage, contract, agentId }) => ({ stage, contract, agentId }))).toEqual([
      { stage: 'quality_review', contract: 'quality_review_json', agentId: 'review-agent' },
      { stage: 'quality_repair', contract: 'revision_prose', agentId: 'prose-agent' },
    ])
    expect(calls.every(call => call.project === project && Boolean(call.context.task))).toBe(true)
    expect(calls.every(call => call.options.activeWorkspace === 'ws')).toBe(true)
    expect(calls.every(call => call.options.signal instanceof AbortSignal)).toBe(true)
    expect(getFallbackCalls()).toBe(0)
  })

  test('propagates self-revision task rejection by identity', async () => {
    const rejection = new Error('task self revision rejected')
    const { execution, fallback, getFallbackCalls } = makeExecutionSpy(call => {
      if (call.stage === 'quality_repair') return Promise.reject(rejection)
      return {
        parsed: { score: 60, passed: false, needs_revision: true, issues: [{ severity: 'S2', message: '补足主动动作' }] },
        modelName: 'fixed-task-model',
      }
    })
    const runner = createProseSelfReviewRunner({
      executeAgent: fallback,
      getStageModelId: rejectTaskStageModelResolution,
      getStageTemperature: (_project: any, _stage: string, fallbackValue: number) => fallbackValue,
      fillMissingStructuredReviewChecks: async () => null,
    })

    await expect(runner('ws', project, contextPackage, chapterText, undefined, {
      chapterTaskExecution: execution,
      fill_missing_structured_checks: false,
    })).rejects.toBe(rejection)
    expect(getFallbackCalls()).toBe(0)
  })

  test('routes structured review fill to its dedicated JSON contract', async () => {
    const { execution, calls, fallback, getFallbackCalls } = makeExecutionSpy(() => ({
      parsed: { platform_checks: [{ key: 'platform_ok', status: 'pass' }] },
      modelName: 'fixed-task-model',
    }))
    const methods = createStructuredReviewFillMethods({
      executeAgent: fallback,
      getStageModelId: rejectTaskStageModelResolution,
      getStageTemperature: (_project: any, _stage: string, fallbackValue: number) => fallbackValue,
    })

    await methods.fillMissingStructuredReviewChecks('ws', project, contextPackage, chapterText, {
      platform_checks: [{ key: 'missing_platform_checks', label: '缺少平台自检', evidence: '模型没有输出' }],
    }, undefined, { chapterTaskExecution: execution })

    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      stage: 'structured_review_fill',
      contract: 'structured_review_json',
      agentId: 'review-agent',
      project,
      options: { activeWorkspace: 'ws', skipMemory: true },
    })
    expect(calls[0].context.task).toBeTruthy()
    expect(getFallbackCalls()).toBe(0)
  })

  test('routes quality review, one revision, and later recheck through one execution', async () => {
    const pad = (index: number) => `走廊灯管吱吱响，地砖缝里积着灰，他数到第${index}步时鞋底还在发黏，手套边也湿了一截，墙角有没拧紧的水龙头滴答响。`
    const friction: Record<number, string> = {
      14: '老黄一把推开抢救室门，把交接单拍在台上。',
      15: '“林医生，签字！赶紧签，外面还压着两趟出车。”',
      16: '林序站稳在推车旁，挡住了去路。',
      17: '“异常体温，不能直接出死亡证明。”',
      18: '“你凭什么不签？耽误下一个救援，责任算谁的？”',
      19: '老黄脏靴子在地面上踩出一个泥印。',
      20: '林序把体温枪屏幕朝向老黄：“三十六度五。”',
      21: '“签字，或者叫值班院长过来。”',
      22: '老黄用力往回一扯，纸页撕开一道口子。',
      23: '林序手臂横在推车扶手上，直接把担架车顶在原地。',
      24: '“行，我找你们科主任！”',
      25: '分诊台广播突然刺耳地响起来，老黄骂着拉着空车先走了。',
    }
    const initialText = Array.from({ length: 48 }, (_, index) => friction[index] || pad(index)).join('\n\n')
    const revisedText = initialText.replace('交接单', '值班单')
    const { execution, calls, fallback, getFallbackCalls } = makeExecutionSpy(call => {
      if (call.stage === 'quality_repair') {
        return {
          parsed: { prose_chapters: [{ chapter_text: revisedText }] },
          finish_reason: 'stop',
          modelName: 'fixed-task-model',
        }
      }
      if (call.stage === 'quality_recheck') {
        return {
          parsed: { score: 90, score_scale: '0-100', publishable: true, dimensions: sixDimensions, findings: [] },
          modelName: 'fixed-task-model',
        }
      }
      return {
        parsed: {
          score: 70,
          score_scale: '0-100',
          dimensions: sixDimensions,
          findings: [{
            key: 'locatable_causality',
            severity: 'S2',
            dimension: 'conflict_causality',
            evidence: '交接单拍在台上',
            required_change: '让交接动作产生新的现场后果',
            acceptance_test: '动作与结果形成因果链',
          }],
        },
        modelName: 'fixed-task-model',
      }
    })

    const args = qualityLoopArgs(execution, fallback)
    args.finalText = initialText
    args.contextPackage = { chapter_target: { word_target: { target: 2200, min: 1800, max: 2800 } } }
    args.wordTarget = args.contextPackage.chapter_target.word_target
    const result = await runQualityLoopPhase(args)

    expect(result.qualityLoop.rounds[0].selection.accepted).toBe(true)
    expect(calls.map(({ stage, contract, agentId }) => ({ stage, contract, agentId }))).toEqual([
      { stage: 'quality_review', contract: 'quality_review_json', agentId: 'review-agent' },
      { stage: 'quality_repair', contract: 'revision_prose', agentId: 'prose-agent' },
      { stage: 'quality_recheck', contract: 'quality_review_json', agentId: 'review-agent' },
    ])
    expect(calls.every(call => call.options.activeWorkspace === 'ws')).toBe(true)
    expect(calls.every(call => call.options.timeoutMs === 56789)).toBe(true)
    expect(getFallbackCalls()).toBe(0)
  })

  test('propagates quality task rejection by identity instead of degrading to a legacy warning', async () => {
    const rejection = new Error('task quality review rejected')
    const { execution, fallback, getFallbackCalls } = makeExecutionSpy(() => Promise.reject(rejection))

    await expect(runQualityLoopPhase(qualityLoopArgs(execution, fallback, {
      max_quality_revision_rounds: 0,
    }))).rejects.toBe(rejection)
    expect(getFallbackCalls()).toBe(0)
  })

  for (const { label, source, failure } of [
    {
      label: 'resolved API error envelope',
      source: 'model' as const,
      failure: Object.assign(new Error('PRIVATE_RESOLVED_API_ENVELOPE'), {
        code: 'CHAPTER_STAGE_ERROR_RESULT',
        error_code: 'CHAPTER_STAGE_ERROR_RESULT',
      }),
    },
    {
      label: 'thrown API provider error',
      source: 'model' as const,
      failure: new Error('PRIVATE_THROWN_API_PROVIDER_ERROR'),
    },
    {
      label: 'thrown MCP provider error',
      source: 'mcp' as const,
      failure: new Error('PRIVATE_THROWN_MCP_PROVIDER_ERROR'),
    },
  ]) {
    test(`keeps prior prose for an optional ${label} on the same source`, async () => {
      const { execution, calls, fallback, getFallbackCalls } = revisionFailureFixture(source, failure)
      const result = await runQualityLoopPhase(qualityLoopArgs(execution, fallback))

      expect(execution.source).toBe(source)
      expect(result.finalText).toBe(chapterText)
      expect(result.qualityLoop.quality_warning).toMatchObject({
        code: 'quality_revision_unavailable',
        source: 'review',
      })
      expect(result.qualityLoop.rounds).toContainEqual(expect.objectContaining({
        selection: expect.objectContaining({
          accepted: false,
          reason: 'quality_revision_unavailable',
          text: chapterText,
        }),
      }))
      expect(calls.map(call => call.stage)).toEqual(['quality_review', 'quality_repair'])
      expect(getFallbackCalls()).toBe(0)
      expect(JSON.stringify(result)).not.toContain(failure.message)
    })
  }

  test('propagates source integrity and required acceptance revision failures by identity', async () => {
    const failures = [
      Object.assign(new Error('source changed'), { code: 'GENERATION_SOURCE_CHANGED' }),
      Object.assign(new Error('MCP binding changed'), { code: 'MCP_BINDING_CHANGED' }),
      Object.assign(new Error('invalid stage structure'), { code: 'CHAPTER_STAGE_RESULT_INVALID' }),
      Object.assign(new Error('required acceptance failure'), { admission_status: 'blocked_invalid' }),
      Object.assign(new Error('required complete revision'), { code: 'PROSE_REVISION_TRUNCATED' }),
    ]

    for (const failure of failures) {
      const source = String((failure as any).code || '').startsWith('MCP_') ? 'mcp' : 'model'
      const { execution, fallback, getFallbackCalls } = revisionFailureFixture(source, failure)

      await expect(runQualityLoopPhase(qualityLoopArgs(execution, fallback))).rejects.toBe(failure)
      expect(getFallbackCalls()).toBe(0)
    }
  })

  test('propagates story-state task rejection without falling back', async () => {
    const rejection = new Error('task story-state rejected')
    const { execution, calls, fallback, getFallbackCalls } = makeExecutionSpy(() => Promise.reject(rejection))

    await expect(prepareStoryStateUpdate(
      'ws',
      project,
      { id: 9, chapter_no: 1 },
      contextPackage,
      chapterText,
      undefined,
      { chapterTaskExecution: execution } as any,
      {
        executeAgent: fallback,
        getStageModelId: rejectTaskStageModelResolution,
        getStageTemperature: (_project: any, _stage: string, fallbackValue: number) => fallbackValue,
      },
    )).rejects.toBe(rejection)

    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      stage: 'story_state_sync',
      contract: 'story_state_json',
      agentId: 'review-agent',
      project,
      options: { activeWorkspace: 'ws', skipMemory: true },
    })
    expect(getFallbackCalls()).toBe(0)
  })
})

describe('chapter task service capability', () => {
  test('exposes beginChapterTask without starting a task from any leaf method', async () => {
    const chapterSourceLeases = new ChapterSourceLeaseRegistry()
    const configuredProject = {
      id: 5,
      title: '统一来源测试',
      reference_config: {
        chapter_generation_source: {
          version: 'chapter_generation_source_v1',
          active: 'model',
          model: { model_id: 217 },
        },
      },
    }
    const service = createNovelWritingService({
      getProject: async () => configuredProject,
      production: {
        getStageModelId: () => 217,
        getStageTemperature: (_project: any, _stage: string, fallbackValue: number) => fallbackValue,
      } as any,
      reference: {} as any,
      runtime: {
        generateChapterProse: async () => ({ parsed: { chapter_text: '正文' } }),
        executeAgent: async () => ({ parsed: {} }),
      },
      chapterSourceLeases,
    })

    expect(typeof service.beginChapterTask).toBe('function')
    const execution = await service.beginChapterTask({
      activeWorkspace: '/tmp/mangaforge-task-routing',
      project: configuredProject,
      chapter: { id: 9, project_id: 5, chapter_no: 1 },
      contextPackage,
      requestedModelId: 217,
      options: {},
    })
    expect(execution).toMatchObject({ source: 'model', modelId: 217 })
    await execution.close({ status: 'cancelled' })
    expect(chapterSourceLeases.isActive('/tmp/mangaforge-task-routing', configuredProject.id)).toBe(false)
  })
})

describe('chapter stage helper async contract', () => {
  test('returns a Promise even when the legacy fallback is synchronous', async () => {
    const pending: Promise<string> = executeChapterStage<string>({
      fallback: () => 'legacy result',
      stage: 'quality_review',
      responseContract: 'quality_review_json',
      agentId: 'review-agent',
      project: {},
      context: {},
    })

    expect(pending).toBeInstanceOf(Promise)
    await expect(pending).resolves.toBe('legacy result')
  })
})
