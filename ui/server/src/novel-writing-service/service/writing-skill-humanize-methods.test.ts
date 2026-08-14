import { describe, expect, test } from 'bun:test'
import { createWritingSkillHumanizeMethods } from './writing-skill-humanize-methods'

const SOURCE = `${'林序把门带上，沿着走廊继续往前。纸条边角硌着手指。'.repeat(120)}`
const PASS_A = `${SOURCE}灯管又响了一下。`
const PASS_B = `${PASS_A}他没有回头。`

function makeMethods(onTask: (task: string) => string | Promise<string>) {
  const calls: string[] = []
  const methods = createWritingSkillHumanizeMethods({
    executeAgent: async (_agent: any, _project: any, payload: any) => {
      const task = String(payload?.task || '')
      calls.push(task)
      return { text: await onTask(task) }
    },
    getStageModelId: () => undefined,
    getStageTemperature: (_project: any, _stage: any, fallback: number) => fallback,
  })
  return { methods, calls }
}

const standardTarget = {
  chapter_target: {
    word_target: { mode: 'standard', target: 4200, min: 3780, max: 4620 },
  },
}

describe('writing skill humanize methods', () => {
  test('skips the LLM when every skill is off', async () => {
    const { methods, calls } = makeMethods(() => 'should not run')
    const result = await methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      { reference_config: { writing_skills: { enabled: {
        'fiction-humanizer-zh': false,
        'remove-ai-flavor': false,
        'humanizer-zh': false,
      } } } },
      standardTarget,
      SOURCE,
    )
    expect(calls).toEqual([])
    expect(result.final_text).toBe(SOURCE)
    expect(result.report).toMatchObject({
      version: 'writing_skill_humanize_v2',
      skipped: true,
      accepted: true,
      changed: false,
      enabled_ids: [],
      passes: [],
    })
  })

  test('runs enabled skills in order with full vendor prompts', async () => {
    const { methods, calls } = makeMethods(task => {
      if (task.includes('fiction-humanizer-zh')) return PASS_A
      if (task.includes('remove-ai-flavor')) return PASS_B
      throw new Error(`unexpected skill prompt: ${task.slice(0, 80)}`)
    })
    const result = await methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      { genre: '规则怪谈', reference_config: { writing_skills: { fiction_humanizer_mode: 'rewrite' } } },
      standardTarget,
      SOURCE,
    )
    expect(calls).toHaveLength(2)
    expect(calls[0]).toContain('# 中文小说去 AI 味')
    expect(calls[0]).toContain('档位：重写')
    expect(calls[0]).toContain('【参考 · genre-notes.md】')
    const preamble = calls[0]?.split('【SKILL.md】')[0] ?? ''
    expect(preamble).not.toContain('轻改：保留原段落顺序')
    expect(calls[1]).toContain('# Remove AI Flavor')
    expect(calls[1]).toContain(PASS_A)
    expect(calls[1]).not.toContain('# 中文小说去 AI 味')
    expect(result.final_text).toBe(PASS_B)
    expect(result.report).toMatchObject({
      version: 'writing_skill_humanize_v2',
      accepted: true,
      changed: true,
      fiction_humanizer_mode: 'rewrite',
      enabled_ids: ['fiction-humanizer-zh', 'remove-ai-flavor'],
    })
    expect(result.report.passes).toEqual([
      expect.objectContaining({ id: 'fiction-humanizer-zh', mode: 'rewrite', accepted: true, chunk_count: 1 }),
      expect.objectContaining({ id: 'remove-ai-flavor', accepted: true, chunk_count: 1 }),
    ])
  })

  test('awaits skill progress before executing the skill LLM pass', async () => {
    const order: string[] = []
    let releaseProgress!: () => void
    const progressGate = new Promise<void>((resolve) => {
      releaseProgress = resolve
    })
    const { methods } = makeMethods(() => {
      order.push('execute')
      return PASS_A
    })

    const run = methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      { reference_config: { writing_skills: { enabled: {
        'fiction-humanizer-zh': true,
        'remove-ai-flavor': false,
        'humanizer-zh': false,
      } } } },
      standardTarget,
      SOURCE,
      undefined,
      {
        onSkillProgress: async () => {
          order.push('progress-start')
          await progressGate
          order.push('progress-end')
        },
      },
    )

    await Promise.resolve()
    const beforeRelease = [...order]
    releaseProgress()
    await run

    expect(beforeRelease).toEqual(['progress-start'])
    expect(order).toEqual(['progress-start', 'progress-end', 'execute'])
  })

  test('reports the 1-based pass index and enabled total to onSkillProgress in order', async () => {
    const progressCalls: Array<[string, any]> = []
    const { methods } = makeMethods(task => {
      if (task.includes('fiction-humanizer-zh')) return PASS_A
      if (task.includes('remove-ai-flavor')) return PASS_B
      throw new Error(`unexpected skill prompt: ${task.slice(0, 80)}`)
    })
    await methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      { reference_config: { writing_skills: { enabled: { 'humanizer-zh': false } } } },
      standardTarget,
      SOURCE,
      undefined,
      {
        onSkillProgress: async (skillId: string, progress: any) => {
          progressCalls.push([skillId, progress])
        },
      },
    )
    expect(progressCalls).toEqual([
      ['fiction-humanizer-zh', { index: 1, total: 2 }],
      ['remove-ai-flavor', { index: 2, total: 2 }],
    ])
  })

  test('keeps the previous pass when the middle skill throws and continues', async () => {
    const { methods, calls } = makeMethods(task => {
      if (task.includes('fiction-humanizer-zh')) return PASS_A
      if (task.includes('remove-ai-flavor')) throw new Error('provider down')
      return `${PASS_A}维基轮不应运行`
    })
    const result = await methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      { reference_config: { writing_skills: { enabled: { 'humanizer-zh': false } } } },
      standardTarget,
      SOURCE,
    )
    expect(calls).toHaveLength(2)
    expect(result.final_text).toBe(PASS_A)
    expect(result.report.accepted).toBe(true)
    expect(result.report.changed).toBe(true)
    expect(result.report.passes[0].accepted).toBe(true)
    expect(result.report.passes[1].accepted).toBe(false)
  })

  test('redacts credentials and bounds the recorded reason when a skill throws', async () => {
    const secretMessage = `provider rejected request\nAuthorization: Bearer secret-token-value\n${'x'.repeat(450)}`
    const { methods, calls } = makeMethods(task => {
      if (task.includes('fiction-humanizer-zh')) return PASS_A
      if (task.includes('remove-ai-flavor')) throw new Error(secretMessage)
      return `${PASS_A}维基轮不应运行`
    })
    const result = await methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      { reference_config: { writing_skills: { enabled: { 'humanizer-zh': false } } } },
      standardTarget,
      SOURCE,
    )
    expect(calls).toHaveLength(2)
    expect(result.final_text).toBe(PASS_A)
    const failedPass = result.report.passes[1]
    expect(failedPass.accepted).toBe(false)
    expect(String(failedPass.reason)).not.toContain('secret-token-value')
    expect(String(failedPass.reason).length).toBeLessThanOrEqual(240)
    expect(String(failedPass.reason)).toContain('provider rejected request')
  })

  test('rethrows cancellation without chapter task execution', async () => {
    const cancellation = Object.assign(new Error('request canceled'), { code: 'REQUEST_CANCELED' })
    const { methods } = makeMethods(task => {
      if (task.includes('fiction-humanizer-zh')) return PASS_A
      throw cancellation
    })
    const run = methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      { reference_config: { writing_skills: { enabled: { 'humanizer-zh': false } } } },
      standardTarget,
      SOURCE,
    )
    await expect(run).rejects.toBe(cancellation)
  })

  test('uses the project writing skill model for every skill pass and records it in the report', async () => {
    const modelIds: Array<string | undefined> = []
    const stageCalls: any[] = []
    const methods = createWritingSkillHumanizeMethods({
      executeAgent: async (_agent: any, _project: any, payload: any, options: any) => {
        modelIds.push(options?.modelId)
        const task = String(payload?.task || '')
        return { text: task.includes('remove-ai-flavor') ? PASS_B : PASS_A }
      },
      getStageModelId: (...args: any[]) => {
        stageCalls.push(args)
        return 42
      },
      getStageTemperature: (_project: any, _stage: any, fallback: number) => fallback,
    })
    const result = await methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      { reference_config: { writing_skills: { model_id: 317 } } },
      standardTarget,
      SOURCE,
    )
    expect(modelIds).toEqual(['317', '317'])
    expect(stageCalls).toEqual([])
    expect(result.report.model_id).toBe(317)
  })

  test('passes the skill model through a model-source execution and records it in the report', async () => {
    const executionModelIds: Array<string | undefined> = []
    const execution = {
      source: 'model' as const,
      executeAgent: async (
        _stage: any,
        _contract: any,
        _agentId: any,
        _project: any,
        context: any,
        options: any,
      ) => {
        executionModelIds.push(options?.modelId)
        const task = String(context?.task || '')
        return { text: task.includes('remove-ai-flavor') ? PASS_B : PASS_A }
      },
    }
    const methods = createWritingSkillHumanizeMethods({
      executeAgent: async () => {
        throw new Error('fallback executeAgent should not run under a chapter task execution')
      },
      getStageModelId: () => 42,
      getStageTemperature: (_project: any, _stage: any, fallback: number) => fallback,
    })
    const result = await methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      { reference_config: { writing_skills: { model_id: 317 } } },
      standardTarget,
      SOURCE,
      undefined,
      { chapterTaskExecution: execution },
    )
    expect(executionModelIds).toEqual(['317', '317'])
    expect(result.report.model_id).toBe(317)
  })

  test('leaves the model to the remote binding and omits model_id under an mcp execution', async () => {
    const executionModelIds: Array<string | undefined> = []
    const execution = {
      source: 'mcp' as const,
      executeAgent: async (
        _stage: any,
        _contract: any,
        _agentId: any,
        _project: any,
        context: any,
        options: any,
      ) => {
        executionModelIds.push(options?.modelId)
        const task = String(context?.task || '')
        return { text: task.includes('remove-ai-flavor') ? PASS_B : PASS_A }
      },
    }
    const methods = createWritingSkillHumanizeMethods({
      executeAgent: async () => {
        throw new Error('fallback executeAgent should not run under a chapter task execution')
      },
      getStageModelId: () => 42,
      getStageTemperature: (_project: any, _stage: any, fallback: number) => fallback,
    })
    const result = await methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      { reference_config: { writing_skills: { model_id: 317 } } },
      standardTarget,
      SOURCE,
      undefined,
      { chapterTaskExecution: execution },
    )
    expect(executionModelIds).toEqual([undefined, undefined])
    expect(result.report.model_id).toBeUndefined()
    expect('model_id' in result.report).toBe(false)
  })

  test('falls back to the revise-stage model when no skill model is configured', async () => {
    const modelIds: Array<string | undefined> = []
    const methods = createWritingSkillHumanizeMethods({
      executeAgent: async (_agent: any, _project: any, payload: any, options: any) => {
        modelIds.push(options?.modelId)
        const task = String(payload?.task || '')
        return { text: task.includes('remove-ai-flavor') ? PASS_B : PASS_A }
      },
      getStageModelId: (_project: any, stage: string, modelId?: number) => (
        stage === 'revise' ? modelId ?? 42 : undefined
      ),
      getStageTemperature: (_project: any, _stage: any, fallback: number) => fallback,
    })
    const result = await methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      { reference_config: { writing_skills: {} } },
      standardTarget,
      SOURCE,
    )
    expect(modelIds).toEqual(['42', '42'])
    expect(result.report.model_id).toBeUndefined()
  })

  test('does not roll back an accepted rewrite when fingerprint fails', async () => {
    const { methods } = makeMethods(() => PASS_A)
    const result = await methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      {},
      standardTarget,
      SOURCE,
      undefined,
      {
        writing_skills: { enabled: { 'remove-ai-flavor': false, 'humanizer-zh': false } },
        fingerprintSelect: () => ({ accepted: false, reason: 'fingerprint_continuity_failed', text: SOURCE }),
      },
    )
    expect(result.final_text).toBe(PASS_A)
    expect(result.report.accepted).toBe(true)
    expect(result.report.changed).toBe(true)
    expect(result.report.warnings).toEqual(['fingerprint_continuity_failed'])
  })
})
