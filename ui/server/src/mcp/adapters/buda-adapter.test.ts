import { describe, expect, test } from 'bun:test'
import { BudaAdapter, buildBudaExecutionEnvelope, extractBudaProse, normalizeBudaAgentList } from './buda-adapter'
import * as budaAdapterModule from './buda-adapter'
import { BUDA_MCP_SERVER_TEMPLATE } from '../server-store'
import { McpGenerationDeadline } from '../deadline'
import { McpError } from '../errors'

const toolNames = [
  'apiClaw.listApiAgents',
  'apiClaw.createApiAgent',
  'apiClaw.listApiAgentDriveFiles',
  'apiClaw.upsertApiAgentDriveFile',
  'apiClaw.apiAgentDriveText',
  'apiClaw.createApiAgentSession',
  'apiClaw.getApiAgentSession',
  'apiClaw.postApiAgentSessionMessage',
  'apiClaw.cancelApiAgentSessionRun',
]

function structured(data: Record<string, unknown>) {
  return { content: [], structuredContent: data }
}

function createFakeClient(statuses: string[] = ['completed']) {
  const calls: Array<{ name: string; args: any; options: any }> = []
  const listToolOptions: any[] = []
  const remote = new Map<string, string>()
  let statusIndex = 0
  let runSequence = 0
  let activeRunId = ''
  const completedRuns = new Set<string>()
  const assistantHistory: Array<{ role: 'assistant'; content: string }> = []
  return {
    calls,
    listToolOptions,
    client: {
      async listTools(options: any) {
        listToolOptions.push(options)
        return toolNames.map(name => ({ name, inputSchema: { type: 'object' } }))
      },
      async callTool(name: string, args: any, options: any) {
        calls.push({ name, args, options })
        if (name.endsWith('listApiAgents')) return structured({ apiAgents: [{ id: 'agent-1', name: '正文 Agent', spaceId: 'space-1' }], total: 1 })
        if (name.endsWith('createApiAgent')) return structured({ agent: { id: 'agent-2', name: args.name, spaceId: args.spaceId } })
        if (name.endsWith('listApiAgentDriveFiles')) return structured({ files: [...remote.keys()].map(path => ({ path, type: 'file' })) })
        if (name.endsWith('upsertApiAgentDriveFile')) { remote.set(args.path, args.content); return structured({ ok: true }) }
        if (name.endsWith('apiAgentDriveText')) return structured({ content: remote.get(args.filePath) || '' })
        if (name.endsWith('createApiAgentSession')) return structured({ session: { id: 'session-1', status: 'pending' }, run: { started: false } })
        if (name.endsWith('postApiAgentSessionMessage')) {
          activeRunId = `run-${++runSequence}`
          return structured({ session: { id: 'session-1' }, run: { id: activeRunId, started: true } })
        }
        if (name.endsWith('getApiAgentSession')) {
          const status = statuses[Math.min(statusIndex++, statuses.length - 1)]!
          if (status === 'completed' && activeRunId && !completedRuns.has(activeRunId)) {
            completedRuns.add(activeRunId)
            assistantHistory.push({ role: 'assistant', content: '这是完整的本章正文。' })
          }
          return structured({
            session: { id: 'session-1', status },
            run: { ...(activeRunId ? { id: activeRunId } : {}), status },
            messages: status === 'completed'
              ? activeRunId ? [...assistantHistory] : [{ role: 'assistant', content: '这是完整的本章正文。' }]
              : [],
          })
        }
        if (name.endsWith('cancelApiAgentSessionRun')) return structured({ ok: true, cancelled: true })
        throw new Error(`unexpected tool ${name}`)
      },
    },
  }
}

function generationInput(overrides: Record<string, unknown> = {}) {
  const callerSignal = overrides.signal as AbortSignal | undefined
  const deadline = overrides.deadline || new McpGenerationDeadline(60_000, callerSignal, {
    now: Date.now,
    setTimeout: () => 1,
    clearTimeout: () => {},
  })
  return {
    activeWorkspace: '/workspace/a',
    server: { ...BUDA_MCP_SERVER_TEMPLATE, poll_initial_ms: 1, poll_max_ms: 2 },
    keyId: 3,
    agentId: 'agent-1',
    requestId: 'request-12',
    project: { id: 8, title: '长篇测试' },
    chapter: { id: 22, chapter_no: 12, title: '雨夜' },
    chapterNo: 12,
    paragraphTask: '完整段落任务：前因、当前目标、后果与输出合同。',
    promptDiagnostics: { prompt_chars: 28 },
    drive: { writingBible: '# 圣经', storyState: {}, continuity: '连续性', recentChapters: '第11章摘要' },
    deadline,
    ...overrides,
  } as any
}

function chapterTaskInput(overrides: Record<string, unknown> = {}) {
  return {
    ...generationInput(),
    taskId: 'task-12',
    ...overrides,
  } as any
}

async function openChapterTask(adapter: BudaAdapter, input: any = chapterTaskInput()) {
  expect(typeof (adapter as any).openChapterTask).toBe('function')
  return (adapter as any).openChapterTask(input)
}

function stageInput(
  requestId: string,
  stage: string,
  responseContract: string,
  prompt = `${stage} prompt`,
) {
  return { requestId, stage, responseContract, prompt } as any
}

function expectBudaOperations(calls: Array<{ name: string; options: any }>) {
  for (const call of calls) {
    const readSafe = call.name.endsWith('listApiAgents')
      || call.name.endsWith('listApiAgentDriveFiles')
      || call.name.endsWith('apiAgentDriveText')
      || call.name.endsWith('getApiAgentSession')
    expect(call.options.operation).toBe(readSafe ? 'read_safe' : 'mutation')
  }
}

describe('BudaAdapter', () => {
  test('opens one reusable Chapter Task Session and runs ordered stages in it', async () => {
    const fake = createFakeClient()
    const stageOutputs = ['质量审查结果', '修订正文', '故事状态同步结果']
    let activeStage = -1
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('postApiAgentSessionMessage')) activeStage += 1
      if (name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        return structured({
          session: { id: 'session-1', status: 'completed' },
          run: { status: 'completed' },
          messages: [{ role: 'assistant', content: stageOutputs[activeStage] }],
        })
      }
      return original(name, args, options)
    }
    const task = await openChapterTask(new BudaAdapter(fake.client as any))

    const results = await Promise.all([
      task.runStage(stageInput('request-quality', 'quality_review', 'quality_review_json')),
      task.runStage(stageInput('request-revision', 'revision', 'revision_prose')),
      task.runStage(stageInput('request-state', 'story_state_sync', 'story_state_json')),
    ])
    await task.close()

    expect(results.map((result: any) => result.content)).toEqual(stageOutputs)
    expect(results.every((result: any) => result.session_id === 'session-1' && result.status === 'completed')).toBe(true)
    expect(fake.calls.filter(call => call.name.endsWith('createApiAgentSession'))).toHaveLength(1)
    const posts = fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))
    expect(posts).toHaveLength(3)
    expect(posts.map(call => call.args.message.match(/request_id: ([^\n]+)/)?.[1])).toEqual([
      'request-quality',
      'request-revision',
      'request-state',
    ])
    expect(posts.map(call => call.args.message.match(/stage: ([^\n]+)/)?.[1])).toEqual([
      'quality_review',
      'revision',
      'story_state_sync',
    ])
  })

  for (const model of ['claude-sonnet', ''] as const) {
    test(`${model ? 'routes an explicit model' : 'omits Auto model'} on Session creation and every stage`, async () => {
      const fake = createFakeClient()
      const task = await openChapterTask(new BudaAdapter(fake.client as any), chapterTaskInput({ model }))

      expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(0)
      const create = fake.calls.find(call => call.name.endsWith('createApiAgentSession'))!
      expect(create.args.startRun).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(create.args, 'model')).toBe(Boolean(model))
      if (model) expect(create.args.model).toBe(model)

      await task.runStage(stageInput('request-a', 'draft', 'draft_prose'))
      await task.runStage(stageInput('request-b', 'revision', 'revision_prose'))
      const posts = fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))
      expect(posts).toHaveLength(2)
      for (const post of posts) {
        expect(post.args.startRun).toBe(true)
        expect(Object.prototype.hasOwnProperty.call(post.args, 'model')).toBe(Boolean(model))
        if (model) expect(post.args.model).toBe(model)
      }
      await task.close()
    })
  }

  test('serializes concurrent stages and close waits for the queued tail', async () => {
    const fake = createFakeClient()
    let releaseFirst!: () => void
    let firstGetStarted!: () => void
    const firstGet = new Promise<void>(resolve => { firstGetStarted = resolve })
    const gate = new Promise<void>(resolve => { releaseFirst = resolve })
    let getCount = 0
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        getCount += 1
        if (getCount === 1) {
          firstGetStarted()
          await gate
        }
        return structured({
          session: { id: 'session-1', status: 'completed' },
          messages: [{ role: 'assistant', content: `stage-${getCount}` }],
        })
      }
      return original(name, args, options)
    }
    const task = await openChapterTask(new BudaAdapter(fake.client as any))
    const first = task.runStage(stageInput('request-1', 'quality_review', 'quality_review_json'))
    const second = task.runStage(stageInput('request-2', 'revision', 'revision_prose'))
    let closeResolved = false
    const closing = Promise.all([task.close(), task.close()]).then(() => { closeResolved = true })

    await firstGet
    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(1)
    expect(closeResolved).toBe(false)
    releaseFirst()

    await expect(first).resolves.toMatchObject({ content: 'stage-1' })
    await expect(second).resolves.toMatchObject({ content: 'stage-2' })
    await closing
    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))
      .map(call => call.args.message.match(/request_id: ([^\n]+)/)?.[1]))
      .toEqual(['request-1', 'request-2'])
    expect(closeResolved).toBe(true)
  })

  test('polls the current run status before a reused Session status', async () => {
    const fake = createFakeClient()
    let gets = 0
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        gets += 1
        return structured({
          session: { id: 'session-1', status: 'completed' },
          run: { status: gets === 1 ? 'in_progress' : 'completed' },
          messages: gets === 1
            ? [{ role: 'assistant', content: 'previous stage output' }]
            : [
                { role: 'assistant', content: 'previous stage output' },
                { role: 'assistant', content: 'current stage output' },
              ],
        })
      }
      return original(name, args, options)
    }
    const task = await openChapterTask(new BudaAdapter(fake.client as any))

    await expect(task.runStage(stageInput('request-current-run', 'revision', 'revision_prose')))
      .resolves.toMatchObject({ content: 'current stage output' })
    expect(gets).toBe(2)
    await task.close()
  })

  test('does not accept a previous stage terminal output after a new stage post', async () => {
    const fake = createFakeClient()
    let posts = 0
    let secondStageGets = 0
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('postApiAgentSessionMessage')) posts += 1
      if (name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        if (posts === 1) {
          return structured({
            session: { id: 'session-1', status: 'completed' },
            run: { status: 'completed' },
            messages: [{ role: 'assistant', content: 'stage A output' }],
          })
        }
        secondStageGets += 1
        return structured(secondStageGets === 1 ? {
          session: { id: 'session-1', status: 'completed' },
          run: { status: 'completed' },
          messages: [{ role: 'assistant', content: 'stage A output' }],
        } : {
          session: { id: 'session-1', status: 'completed' },
          run: { status: 'completed' },
          messages: [
            { role: 'assistant', content: 'stage A output' },
            { role: 'assistant', content: 'stage B output' },
          ],
        })
      }
      return original(name, args, options)
    }
    const task = await openChapterTask(new BudaAdapter(fake.client as any))

    await expect(task.runStage(stageInput('request-a', 'draft', 'draft_prose')))
      .resolves.toMatchObject({ content: 'stage A output' })
    await expect(task.runStage(stageInput('request-b', 'revision', 'revision_prose')))
      .resolves.toMatchObject({ content: 'stage B output' })
    expect(secondStageGets).toBe(2)
    await task.close()
  })

  test('accepts identical assistant content only after the message sequence advances', async () => {
    const fake = createFakeClient()
    let posts = 0
    let secondStageGets = 0
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('postApiAgentSessionMessage')) {
        posts += 1
        fake.calls.push({ name, args, options })
        return structured({ session: { id: 'session-1' }, run: { started: true } })
      }
      if (name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        const previous = [{ role: 'assistant', content: 'same output' }]
        if (posts === 1) {
          return structured({
            session: { id: 'session-1', status: 'completed' },
            run: { status: 'completed' },
            messages: previous,
          })
        }
        secondStageGets += 1
        return structured({
          session: { id: 'session-1', status: 'completed' },
          run: { status: 'completed' },
          messages: secondStageGets === 1
            ? previous
            : [...previous, { role: 'assistant', content: 'same output' }],
        })
      }
      return original(name, args, options)
    }
    const task = await openChapterTask(new BudaAdapter(fake.client as any))

    await expect(task.runStage(stageInput('request-a', 'draft', 'draft_prose')))
      .resolves.toMatchObject({ content: 'same output' })
    await expect(task.runStage(stageInput('request-b', 'revision', 'revision_prose')))
      .resolves.toMatchObject({ content: 'same output' })
    expect(secondStageGets).toBe(2)
    await task.close()
  })

  test('fails closed when polling never advances beyond the previous assistant snapshot', async () => {
    const controller = new AbortController()
    const fake = createFakeClient()
    const deadline = new McpGenerationDeadline(60_000, controller.signal, {
      now: Date.now,
      setTimeout: () => 1,
      clearTimeout: () => {},
    })
    const input = chapterTaskInput({ deadline, signal: controller.signal })
    let posts = 0
    let secondStageGets = 0
    let releaseStalePoll!: () => void
    let stalePollBlocked!: () => void
    const stalePoll = new Promise<void>(resolve => { stalePollBlocked = resolve })
    const stalePollGate = new Promise<void>(resolve => { releaseStalePoll = resolve })
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('postApiAgentSessionMessage')) {
        posts += 1
        fake.calls.push({ name, args, options })
        return structured({ session: { id: 'session-1' }, run: { started: true } })
      }
      if (name.endsWith('cancelApiAgentSessionRun')) {
        fake.calls.push({ name, args, options })
        return structured({ ok: true, cancelled: false })
      }
      if (name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        if (posts === 2) {
          secondStageGets += 1
          if (secondStageGets === 2) {
            stalePollBlocked()
            await stalePollGate
          }
        }
        return structured({
          session: { id: 'session-1', status: 'completed' },
          run: { status: 'completed' },
          messages: [{ role: 'assistant', content: 'stage A output' }],
        })
      }
      return original(name, args, options)
    }
    const task = await openChapterTask(new BudaAdapter(fake.client as any), input)
    await task.runStage(stageInput('request-a', 'draft', 'draft_prose'))

    const staleStage = task.runStage(stageInput('request-b', 'revision', 'revision_prose'))
    await stalePoll
    controller.abort()
    releaseStalePoll()
    const staleError = await staleStage.catch((error: unknown) => error) as any

    expect(staleError).toMatchObject({
      code: 'MCP_CANCELLED',
      details: {
        remote_cancel_confirmed: false,
        receipt_status: 'remote_cancel_unknown',
      },
    })
    const poisoned = await task.runStage(stageInput('request-c', 'story_state_sync', 'story_state_json'))
      .catch((error: unknown) => error)
    expect(poisoned).toBe(staleError)
    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(2)
    await task.close()
  })

  test('does not confirm an ambiguous later send from a stale previous terminal snapshot', async () => {
    const fake = createFakeClient()
    let posts = 0
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('postApiAgentSessionMessage')) {
        posts += 1
        if (posts > 1) {
          fake.calls.push({ name, args, options })
          throw new McpError('MCP_CONNECTION_LOST', 'accepted remotely, response lost')
        }
      }
      if (name.endsWith('cancelApiAgentSessionRun')) {
        fake.calls.push({ name, args, options })
        return structured({ ok: true, cancelled: false })
      }
      if (name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        return structured({
          session: { id: 'session-1', status: 'completed' },
          run: { status: 'completed' },
          messages: [{ role: 'assistant', content: 'stage A output' }],
        })
      }
      return original(name, args, options)
    }
    const task = await openChapterTask(new BudaAdapter(fake.client as any))
    await task.runStage(stageInput('request-a', 'draft', 'draft_prose'))

    const ambiguous = await task.runStage(stageInput('request-b', 'revision', 'revision_prose'))
      .catch((error: unknown) => error) as any
    expect(ambiguous).toMatchObject({
      code: 'MCP_SEND_UNKNOWN',
      details: {
        remote_cancel_confirmed: false,
        receipt_status: 'send_unknown',
      },
    })
    const poisoned = await task.runStage(stageInput('request-c', 'story_state_sync', 'story_state_json'))
      .catch((error: unknown) => error)
    expect(poisoned).toBe(ambiguous)
    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(2)
    await task.close()
  })

  test('advances the stage tail after a confirmed terminal failure', async () => {
    const fake = createFakeClient()
    let getCount = 0
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        getCount += 1
        const status = getCount === 1 ? 'failed' : 'completed'
        return structured({
          session: { id: 'session-1', status },
          messages: status === 'completed' ? [{ role: 'assistant', content: 'recovered stage' }] : [],
        })
      }
      return original(name, args, options)
    }
    const task = await openChapterTask(new BudaAdapter(fake.client as any))

    await expect(task.runStage(stageInput('request-fail', 'quality_review', 'quality_review_json')))
      .rejects.toMatchObject({ code: 'MCP_SESSION_FAILED', details: { remote_cancel_confirmed: true } })
    await expect(task.runStage(stageInput('request-next', 'revision', 'revision_prose')))
      .resolves.toMatchObject({ content: 'recovered stage' })
    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(2)
    await task.close()
  })

  test('poisons the Session after uncertain remote cleanup and never sends later stages', async () => {
    const fake = createFakeClient(['in_progress'])
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('postApiAgentSessionMessage')) {
        fake.calls.push({ name, args, options })
        throw new McpError('MCP_CONNECTION_LOST', 'connection lost after send')
      }
      if (name.endsWith('cancelApiAgentSessionRun')) {
        fake.calls.push({ name, args, options })
        return structured({ ok: true, cancelled: false })
      }
      return original(name, args, options)
    }
    const task = await openChapterTask(new BudaAdapter(fake.client as any))

    const firstError = await task.runStage(stageInput('request-unknown', 'draft', 'draft_prose')).catch((error: unknown) => error)
    expect(firstError).toMatchObject({
      code: 'MCP_SEND_UNKNOWN',
      details: { remote_cancel_confirmed: false, receipt_status: 'send_unknown' },
    })
    const nextError = await task.runStage(stageInput('request-never-send', 'revision', 'revision_prose')).catch((error: unknown) => error)
    expect(nextError).toBe(firstError)
    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(1)
    await task.close()
  })

  test('poisons the Session when independent cleanup setup fails', async () => {
    const fake = createFakeClient()
    const input = chapterTaskInput()
    ;(input.deadline as any).createCleanupDeadline = () => { throw new Error('cleanup setup failed') }
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        throw new Error('stage polling failed')
      }
      return original(name, args, options)
    }
    const task = await openChapterTask(new BudaAdapter(fake.client as any), input)

    const firstError = await task.runStage(stageInput('request-cleanup-fail', 'draft', 'draft_prose'))
      .catch((error: unknown) => error) as any
    expect(firstError).toMatchObject({
      details: { remote_cancel_confirmed: false, receipt_status: 'remote_cancel_unknown' },
    })
    const nextError = await task.runStage(stageInput('request-never-send', 'revision', 'revision_prose'))
      .catch((error: unknown) => error)
    expect(nextError).toBe(firstError)
    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(1)
    await task.close()
  })

  test('generateProse delegates one draft stage and always closes its task Session', async () => {
    const fake = createFakeClient()
    const adapter = new BudaAdapter(fake.client as any)
    const stages: any[] = []
    let closes = 0
    ;(adapter as any).openChapterTask = async () => ({
      sessionId: 'session-wrapper',
      snapshotHash: 'snapshot-wrapper',
      runStage: async (input: any) => {
        stages.push(input)
        return { content: 'wrapper 正文', session_id: 'session-wrapper', snapshot_hash: 'snapshot-wrapper', status: 'completed' }
      },
      close: async () => { closes += 1 },
    })

    const result = await adapter.generateProse(generationInput())
    expect(stages).toEqual([expect.objectContaining({
      requestId: 'request-12',
      stage: 'draft',
      responseContract: 'draft_prose',
      prompt: '完整段落任务：前因、当前目标、后果与输出合同。',
    })])
    expect(result).toMatchObject({
      session_id: 'session-wrapper',
      snapshot_hash: 'snapshot-wrapper',
      prose_chapters: [{ chapter_no: 12, chapter_text: 'wrapper 正文' }],
      raw: { request_id: 'request-12', session_status: 'completed' },
    })
    expect(closes).toBe(1)

    ;(adapter as any).openChapterTask = async () => ({
      sessionId: 'session-wrapper',
      snapshotHash: 'snapshot-wrapper',
      runStage: async () => { throw new Error('stage failed') },
      close: async () => { closes += 1 },
    })
    await expect(adapter.generateProse(generationInput())).rejects.toThrow('stage failed')
    expect(closes).toBe(2)
  })

  test('generateProse preserves a stage failure over a simultaneous close failure', async () => {
    const fake = createFakeClient()
    const adapter = new BudaAdapter(fake.client as any)
    const stageError = new McpError('MCP_SESSION_FAILED', 'primary stage failure')
    const closeError = new Error('secondary close failure')
    ;(adapter as any).openChapterTask = async () => ({
      sessionId: 'session-wrapper',
      snapshotHash: 'snapshot-wrapper',
      runStage: async () => { throw stageError },
      close: async () => { throw closeError },
    })

    await expect(adapter.generateProse(generationInput())).rejects.toBe(stageError)

    ;(adapter as any).openChapterTask = async () => ({
      sessionId: 'session-wrapper',
      snapshotHash: 'snapshot-wrapper',
      runStage: async () => ({
        content: 'successful stage',
        session_id: 'session-wrapper',
        snapshot_hash: 'snapshot-wrapper',
        status: 'completed',
      }),
      close: async () => { throw closeError },
    })
    await expect(adapter.generateProse(generationInput())).rejects.toBe(closeError)
  })

  test('inspects a Session with one read-safe getSession call and only trusts exact terminal states', async () => {
    const cases = [
      ['completed', 'completed', true],
      ['failed', 'failed', true],
      ['cancelled', 'cancelled', true],
      ['waiting_for_input', 'waiting_for_input', false],
      ['pending', 'pending', false],
      ['in_progress', 'in_progress', false],
      ['Completed', 'unknown', false],
      [' completed ', 'unknown', false],
      ['unexpected remote prose', 'unknown', false],
    ] as const

    for (const [status, publicStatus, terminal] of cases) {
      const fake = createFakeClient([status])
      const adapter = new BudaAdapter(fake.client as any)
      const signal = new AbortController().signal

      expect(await adapter.inspectSession(
        { agentId: 'agent-1', sessionId: 'session-1' },
        { signal, timeoutMs: 4321 },
      )).toEqual({ status: publicStatus, terminal })

      const getSessionCalls = fake.calls.filter(call => call.name.endsWith('getApiAgentSession'))
      expect(getSessionCalls).toHaveLength(1)
      expect(getSessionCalls[0]).toMatchObject({
        args: { agentId: 'agent-1', sessionId: 'session-1' },
        options: { signal, timeoutMs: 4321, operation: 'read_safe' },
      })
      expect(fake.calls.filter(call => call.options.operation === 'mutation')).toHaveLength(0)
    }
  })

  test('does not execute remote Proxy traps while inspecting Session status', async () => {
    const fake = createFakeClient()
    let traps = 0
    const remote = new Proxy({ session: { status: 'completed' } }, {
      get() { traps += 1; return { status: 'completed' } },
      getOwnPropertyDescriptor() { traps += 1; return undefined },
    })
    fake.client.callTool = async (name: string, args: any, options: any) => {
      fake.calls.push({ name, args, options })
      if (name.endsWith('getApiAgentSession')) return { content: [], structuredContent: remote }
      throw new Error(`unexpected tool ${name}`)
    }

    await expect(new BudaAdapter(fake.client as any).inspectSession({
      agentId: 'agent-1',
      sessionId: 'session-1',
    })).resolves.toEqual({ status: 'unknown', terminal: false })
    expect(traps).toBe(0)
  })

  test('does not execute a remote Session id getter during open', async () => {
    const fake = createFakeClient()
    let getters = 0
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('createApiAgentSession')) {
        fake.calls.push({ name, args, options })
        const created: any = {}
        Object.defineProperty(created, 'session', {
          enumerable: true,
          get() { getters += 1; return { id: 'session-from-getter' } },
        })
        return structured(created)
      }
      return original(name, args, options)
    }

    await expect(openChapterTask(new BudaAdapter(fake.client as any)))
      .rejects.toMatchObject({ code: 'MCP_SESSION_FAILED' })
    expect(getters).toBe(0)
    expect(fake.calls.filter(call => call.name.endsWith('cancelApiAgentSessionRun'))).toHaveLength(0)
  })

  test('honors an independent task signal during capability discovery', async () => {
    const caller = new AbortController()
    const fake = createFakeClient()
    const originalListTools = fake.client.listTools
    fake.client.listTools = async (options: any) => {
      caller.abort()
      return originalListTools(options)
    }

    await expect(openChapterTask(
      new BudaAdapter(fake.client as any),
      chapterTaskInput({ signal: caller.signal }),
    )).rejects.toMatchObject({ code: 'MCP_CANCELLED' })
    expect(fake.calls).toHaveLength(0)
  })

  test('lists existing Agents and preserves only bounded summary fields', async () => {
    const fake = createFakeClient()
    const adapter = new BudaAdapter(fake.client as any)
    expect(await adapter.listAgents()).toEqual([{ id: 'agent-1', name: '正文 Agent', raw: { spaceId: 'space-1' } }])
    expect(fake.listToolOptions).toEqual([{}])
    expect(fake.calls.find(call => call.name.endsWith('listApiAgents'))?.options.operation).toBe('read_safe')
    expectBudaOperations(fake.calls)
  })

  test('classifies Agent creation as a mutation', async () => {
    const fake = createFakeClient()
    const adapter = new BudaAdapter(fake.client as any)

    expect(await adapter.createAgent({ name: '新 Agent', spaceId: 'space-1' })).toEqual({ id: 'agent-2', name: '新 Agent' })
    expect(fake.calls.find(call => call.name.endsWith('createApiAgent'))?.options.operation).toBe('mutation')
    expectBudaOperations(fake.calls)
  })

  for (const operation of ['list', 'create'] as const) {
    test(`rejects an oversized textual Agent ${operation} result before JSON parsing`, async () => {
      const fake = createFakeClient()
      fake.client.callTool = async (name: string, args: any, options: any) => {
        fake.calls.push({ name, args, options })
        const data = operation === 'list'
          ? { apiAgents: [{ id: 'agent-large', name: 'n'.repeat(300_000) }] }
          : { agent: { id: 'agent-large', name: 'n'.repeat(300_000) } }
        return { content: [{ type: 'text', text: JSON.stringify(data) }] }
      }
      const adapter = new BudaAdapter(fake.client as any)

      const result = operation === 'list'
        ? adapter.listAgents()
        : adapter.createAgent({ name: 'Agent', spaceId: 'space-1' })

      await expect(result).rejects.toMatchObject({
        code: 'MCP_TOOL_ERROR',
        details: { reason: 'agent_result_too_large' },
      })
    })
  }

  test('sends the complete paragraph task after Drive sync and extracts final assistant prose', async () => {
    const fake = createFakeClient(['pending', 'in_progress', 'completed'])
    const adapter = new BudaAdapter(fake.client as any)
    const progress: string[] = []
    const output = await adapter.generateProse(generationInput({ onProgress: (event: any) => progress.push(event.stage) }))

    const messageCall = fake.calls.find(call => call.name.endsWith('postApiAgentSessionMessage'))
    expect(messageCall?.args.message).toContain('完整段落任务：前因、当前目标、后果与输出合同。')
    expect(messageCall?.args.message).toContain('stage: draft')
    expect(messageCall?.args.message).toContain('response_contract: draft_prose')
    expect(output).toEqual(expect.objectContaining({
      source: 'mcp',
      adapter_id: 'buda',
      agent_id: 'agent-1',
      session_id: 'session-1',
      completed: true,
      prose_chapters: [{ chapter_no: 12, chapter_text: '这是完整的本章正文。' }],
    }))
    expect(progress).toEqual(expect.arrayContaining(['mcp_capabilities', 'mcp_drive_sync', 'mcp_session_create', 'mcp_session_wait', 'mcp_extract']))
    expectBudaOperations(fake.calls)
  })

  test('routes one explicit model to Session creation and message send while Auto omits it', async () => {
    const explicit = createFakeClient()
    await new BudaAdapter(explicit.client as any).generateProse(generationInput({ model: 'model-x' }))

    expect(explicit.calls.find(call => call.name.endsWith('createApiAgentSession'))?.args.model).toBe('model-x')
    expect(explicit.calls.find(call => call.name.endsWith('postApiAgentSessionMessage'))?.args.model).toBe('model-x')

    const automatic = createFakeClient()
    await new BudaAdapter(automatic.client as any).generateProse(generationInput({ model: '' }))

    expect(automatic.calls.find(call => call.name.endsWith('createApiAgentSession'))?.args).not.toHaveProperty('model')
    expect(automatic.calls.find(call => call.name.endsWith('postApiAgentSessionMessage'))?.args).not.toHaveProperty('model')
  })

  test('awaits the durable session-created receipt immediately before sending the prose task', async () => {
    const fake = createFakeClient()
    const events: string[] = []
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('postApiAgentSessionMessage')) events.push('send')
      return original(name, args, options)
    }
    const adapter = new BudaAdapter(fake.client as any)

    await adapter.generateProse(generationInput({
      onProgress: async (event: any) => {
        if (event.stage !== 'session_created') return
        expect(event).toMatchObject({
          status: 'running',
          session_id: 'session-1',
          snapshot_hash: expect.any(String),
        })
        await Promise.resolve()
        events.push('receipt')
      },
    }))

    expect(events).toEqual(['receipt', 'send'])
  })

  test('does not send a prose task when the durable session-created receipt fails', async () => {
    const fake = createFakeClient()
    const adapter = new BudaAdapter(fake.client as any)

    await expect(adapter.generateProse(generationInput({
      onProgress: async (event: any) => {
        if (event.stage === 'session_created') throw new Error('receipt write failed')
      },
    }))).rejects.toThrow('receipt write failed')

    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(0)
    expect(fake.calls.filter(call => call.name.endsWith('cancelApiAgentSessionRun'))).toHaveLength(1)
    expect(fake.calls.filter(call => call.name.endsWith('getApiAgentSession'))).toHaveLength(0)
  })

  test('preserves a session receipt failure when caller cancellation arrives later', async () => {
    const caller = new AbortController()
    const storeError = new McpError('MCP_STORE_IO_FAILED', 'session receipt write failed')
    const fake = createFakeClient()
    const adapter = new BudaAdapter(fake.client as any)

    const caught = await adapter.generateProse(generationInput({
      signal: caller.signal,
      onProgress: async (event: any) => {
        if (event.stage !== 'session_created') return
        queueMicrotask(() => caller.abort())
        await Promise.resolve()
        throw storeError
      },
    })).catch(error => error)

    expect(caught).toMatchObject({
      code: 'MCP_STORE_IO_FAILED',
      details: { session_id: 'session-1', remote_cancel_confirmed: true },
    })
    expect(caller.signal.aborted).toBe(true)
    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(0)
  })

  test('rejects a completed final response when the clock reaches the exact deadline before its timer fires', async () => {
    let now = 0
    const deadline = new McpGenerationDeadline(100, undefined, {
      now: () => now,
      setTimeout: () => 1,
      clearTimeout: () => {},
    })
    const fake = createFakeClient(['completed'])
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      const result = await original(name, args, options)
      if (name.endsWith('getApiAgentSession')) now = 100
      return result
    }
    const adapter = new BudaAdapter(fake.client as any)

    await expect(adapter.generateProse(generationInput({ deadline })))
      .rejects.toMatchObject({ code: 'MCP_GENERATION_TIMEOUT' })
  })

  for (const terminalStatus of ['completed', 'failed', 'cancelled']) {
    test(`trusts an exact-deadline ${terminalStatus} response even when independent cleanup fails`, async () => {
      let now = 0
      const deadline = new McpGenerationDeadline(100, undefined, {
        now: () => now,
        setTimeout: () => 1,
        clearTimeout: () => {},
      })
      const fake = createFakeClient([terminalStatus])
      const original = fake.client.callTool
      fake.client.callTool = async (name: string, args: any, options: any) => {
        if (name.endsWith('cancelApiAgentSessionRun')) {
          fake.calls.push({ name, args, options })
          throw new Error('cleanup cancel failed')
        }
        if (name.endsWith('getApiAgentSession') && options.signal !== deadline.signal) {
          fake.calls.push({ name, args, options })
          throw new Error('cleanup read failed')
        }
        const result = await original(name, args, options)
        if (name.endsWith('getApiAgentSession')) now = 100
        return result
      }

      const caught = await new BudaAdapter(fake.client as any)
        .generateProse(generationInput({ deadline }))
        .catch(error => error)

      expect(caught).toMatchObject({
        code: 'MCP_GENERATION_TIMEOUT',
        details: { session_id: 'session-1', remote_cancel_confirmed: true },
      })
      expect(caught.details).not.toHaveProperty('receipt_status')
    })
  }

  test('receipts a Session created at the exact deadline before rejecting without send', async () => {
    let now = 0
    const deadline = new McpGenerationDeadline(100, undefined, {
      now: () => now,
      setTimeout: () => 1,
      clearTimeout: () => {},
    })
    const fake = createFakeClient()
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      const result = await original(name, args, options)
      if (name.endsWith('createApiAgentSession')) now = 100
      return result
    }
    const receipts: string[] = []
    const adapter = new BudaAdapter(fake.client as any)

    await expect(adapter.generateProse(generationInput({
      deadline,
      onProgress: async (event: any) => {
        if (event.stage === 'session_created') receipts.push(event.session_id)
      },
    }))).rejects.toMatchObject({ code: 'MCP_GENERATION_TIMEOUT' })

    expect(receipts).toEqual(['session-1'])
    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(0)
    expect(fake.calls.filter(call => call.name.endsWith('cancelApiAgentSessionRun'))).toHaveLength(1)
  })

  test('uses one deadline signal and shrinking per-call timeouts across discovery, Drive, Session, and polling', async () => {
    let now = 0
    const deadline = new McpGenerationDeadline(10_000, undefined, {
      now: () => now,
      setTimeout: () => 1,
      clearTimeout: () => {},
    })
    const fake = createFakeClient()
    const observedOptions: any[] = []
    const originalListTools = fake.client.listTools
    fake.client.listTools = async (options: any) => {
      observedOptions.push({ signal: options.signal, timeoutMs: options.timeoutMs })
      const result = await originalListTools(options)
      now += 100
      return result
    }
    const originalCallTool = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      observedOptions.push({ signal: options.signal, timeoutMs: options.timeoutMs })
      const result = await originalCallTool(name, args, options)
      now += 100
      return result
    }
    const adapter = new BudaAdapter(fake.client as any)

    await adapter.generateProse(generationInput({
      deadline,
      server: { ...BUDA_MCP_SERVER_TEMPLATE, tool_timeout_ms: 60_000 },
    }))

    expect(observedOptions.every(item => item.signal === deadline.signal)).toBe(true)
    expect(observedOptions.every(item => item.timeoutMs > 0 && item.timeoutMs <= 10_000)).toBe(true)
    expect(Math.min(...observedOptions.map(item => item.timeoutMs)))
      .toBeLessThan(Math.max(...observedOptions.map(item => item.timeoutMs)))
  })

  test('maps waiting_for_input and failed terminal states without fallback', async () => {
    const waiting = createFakeClient(['waiting_for_input'])
    await expect(new BudaAdapter(waiting.client as any).generateProse(generationInput()))
      .rejects.toMatchObject({ code: 'MCP_INPUT_REQUIRED' })
    expectBudaOperations(waiting.calls)
    const failed = createFakeClient(['failed'])
    await expect(new BudaAdapter(failed.client as any).generateProse(generationInput()))
      .rejects.toMatchObject({ code: 'MCP_SESSION_FAILED' })
    expectBudaOperations(failed.calls)
  })

  for (const terminal of [
    { status: 'failed', code: 'MCP_SESSION_FAILED' },
    { status: 'cancelled', code: 'MCP_CANCELLED' },
  ]) {
    test(`preserves observed ${terminal.status} terminal evidence when independent cleanup fails`, async () => {
      const fake = createFakeClient([terminal.status])
      const input = generationInput()
      const original = fake.client.callTool
      fake.client.callTool = async (name: string, args: any, options: any) => {
        if (name.endsWith('cancelApiAgentSessionRun')) {
          fake.calls.push({ name, args, options })
          throw new Error('cleanup cancel failed')
        }
        if (name.endsWith('getApiAgentSession') && options.signal !== input.deadline.signal) {
          fake.calls.push({ name, args, options })
          throw new Error('cleanup read failed')
        }
        return original(name, args, options)
      }

      await expect(new BudaAdapter(fake.client as any).generateProse(input)).rejects.toMatchObject({
        code: terminal.code,
        details: { session_id: 'session-1', remote_cancel_confirmed: true },
      })
    })
  }

  test('preserves observed completed evidence when prose extraction fails and cleanup fails', async () => {
    const fake = createFakeClient(['completed'])
    const input = generationInput()
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('cancelApiAgentSessionRun')) {
        fake.calls.push({ name, args, options })
        throw new Error('cleanup cancel failed')
      }
      if (name.endsWith('getApiAgentSession') && options.signal !== input.deadline.signal) {
        fake.calls.push({ name, args, options })
        throw new Error('cleanup read failed')
      }
      const result = await original(name, args, options)
      if (name.endsWith('getApiAgentSession')) return structured({ session: { id: 'session-1', status: 'completed' }, messages: [] })
      return result
    }

    await expect(new BudaAdapter(fake.client as any).generateProse(input)).rejects.toMatchObject({
      code: 'MCP_EMPTY_PROSE',
      details: { session_id: 'session-1', remote_cancel_confirmed: true },
    })
  })

  test('preserves observed completed evidence when later progress fails and cleanup fails', async () => {
    const progressError = new McpError('MCP_STORE_IO_FAILED', 'progress write failed')
    const fake = createFakeClient(['completed'])
    const input = generationInput({
      onProgress: (event: any) => {
        if (event.stage === 'mcp_session_wait' && event.status === 'success') throw progressError
      },
    })
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('cancelApiAgentSessionRun')) {
        fake.calls.push({ name, args, options })
        throw new Error('cleanup cancel failed')
      }
      if (name.endsWith('getApiAgentSession') && options.signal !== input.deadline.signal) {
        fake.calls.push({ name, args, options })
        throw new Error('cleanup read failed')
      }
      return original(name, args, options)
    }

    await expect(new BudaAdapter(fake.client as any).generateProse(input)).rejects.toMatchObject({
      code: 'MCP_STORE_IO_FAILED',
      details: { session_id: 'session-1', remote_cancel_confirmed: true },
    })
  })

  test('does not treat waiting_for_input as trusted terminal evidence', async () => {
    const fake = createFakeClient(['waiting_for_input'])
    const input = generationInput()
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('cancelApiAgentSessionRun') || (name.endsWith('getApiAgentSession') && options.signal !== input.deadline.signal)) {
        fake.calls.push({ name, args, options })
        throw new Error('cleanup unavailable')
      }
      return original(name, args, options)
    }

    await expect(new BudaAdapter(fake.client as any).generateProse(input)).rejects.toMatchObject({
      code: 'MCP_INPUT_REQUIRED',
      details: { remote_cancel_confirmed: false, receipt_status: 'remote_cancel_unknown' },
    })
  })

  test('confirms caller cancellation with an independent cleanup signal', async () => {
    const controller = new AbortController()
    const fake = createFakeClient(['in_progress'])
    let resolvePollingStarted!: () => void
    const pollingStarted = new Promise<void>(resolve => { resolvePollingStarted = resolve })
    let primaryPollSeen = false
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('getApiAgentSession') && !primaryPollSeen) {
        primaryPollSeen = true
        resolvePollingStarted()
      }
      return original(name, args, options)
    }
    const adapter = new BudaAdapter(fake.client as any)
    const generation = adapter.generateProse(generationInput({ signal: controller.signal }))
    await pollingStarted
    controller.abort()
    await expect(generation).rejects.toMatchObject({
      code: 'MCP_CANCELLED',
      details: { session_id: 'session-1', remote_cancel_confirmed: true },
    })
    const cancel = fake.calls.find(call => call.name.endsWith('cancelApiAgentSessionRun'))
    expect(cancel?.options.operation).toBe('mutation')
    expect(cancel?.options.signal).not.toBe(controller.signal)
    expect(cancel?.options.signal.aborted).toBe(false)
    expectBudaOperations(fake.calls)
  })

  test('marks an ambiguous send unknown without replay when cleanup cannot confirm termination', async () => {
    const fake = createFakeClient(['in_progress'])
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('postApiAgentSessionMessage')) {
        fake.calls.push({ name, args, options })
        throw new McpError('MCP_CONNECTION_LOST', 'connection lost after send')
      }
      if (name.endsWith('cancelApiAgentSessionRun')) {
        fake.calls.push({ name, args, options })
        return structured({ ok: true, cancelled: false })
      }
      return original(name, args, options)
    }
    const adapter = new BudaAdapter(fake.client as any)

    await expect(adapter.generateProse(generationInput())).rejects.toMatchObject({
      code: 'MCP_SEND_UNKNOWN',
      details: {
        session_id: 'session-1',
        remote_cancel_confirmed: false,
        receipt_status: 'send_unknown',
      },
    })

    expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(1)
    expect(fake.calls.filter(call => call.name.endsWith('cancelApiAgentSessionRun'))).toHaveLength(1)
    expect(fake.calls.filter(call => call.name.endsWith('getApiAgentSession'))).toHaveLength(1)
    expectBudaOperations(fake.calls)
  })

  test('preserves an ordinary post-Session failure and marks remote cancellation unknown', async () => {
    const storeError = new McpError('MCP_STORE_IO_FAILED', 'receipt persistence failed')
    const fake = createFakeClient(['in_progress'])
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('cancelApiAgentSessionRun')) {
        fake.calls.push({ name, args, options })
        return structured({ ok: true })
      }
      return original(name, args, options)
    }

    await expect(new BudaAdapter(fake.client as any).generateProse(generationInput({
      onProgress: (event: any) => {
        if (event.stage === 'session_created') throw storeError
      },
    }))).rejects.toMatchObject({
      code: 'MCP_STORE_IO_FAILED',
      details: {
        session_id: 'session-1',
        remote_cancel_confirmed: false,
        receipt_status: 'remote_cancel_unknown',
      },
    })
    expect(fake.calls.filter(call => call.name.endsWith('cancelApiAgentSessionRun'))).toHaveLength(1)
    expect(fake.calls.filter(call => call.name.endsWith('getApiAgentSession'))).toHaveLength(1)
  })

  for (const throwable of [
    'primitive failure',
    Object.freeze(new Error('frozen failure')),
    Object.defineProperty(new Error('getter failure'), 'details', {
      enumerable: true,
      get() { throw new Error('details getter exploded') },
    }),
  ]) {
    test(`attaches authoritative cleanup details without mutating ${typeof throwable === 'string' ? 'a primitive' : throwable.message}`, async () => {
      const fake = createFakeClient(['in_progress'])
      const input = generationInput()
      const original = fake.client.callTool
      fake.client.callTool = async (name: string, args: any, options: any) => {
        if (name.endsWith('getApiAgentSession') && options.signal === input.deadline.signal) throw throwable
        if (name.endsWith('cancelApiAgentSessionRun') || name.endsWith('getApiAgentSession')) {
          fake.calls.push({ name, args, options })
          throw new Error('cleanup failed')
        }
        return original(name, args, options)
      }

      const caught = await new BudaAdapter(fake.client as any).generateProse(input).catch(error => error)

      expect(caught).toBeInstanceOf(Error)
      expect(Object.prototype.hasOwnProperty.call(caught, 'details')).toBe(true)
      expect(Object.prototype.propertyIsEnumerable.call(caught, 'details')).toBe(true)
      expect(caught.details).toMatchObject({
        session_id: 'session-1',
        remote_cancel_confirmed: false,
        receipt_status: 'remote_cancel_unknown',
      })
      expect(caught).not.toBe(throwable)
    })
  }

  test('does not copy untrusted throwable details into the cleanup wrapper', async () => {
    const unsafe = new McpError('MCP_TOOL_ERROR', 'remote failure', {
      token: 'untrusted-secret-metadata',
      nested: { prompt: 'untrusted-prompt' },
    })
    const fake = createFakeClient(['in_progress'])
    const input = generationInput()
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('getApiAgentSession') && options.signal === input.deadline.signal) throw unsafe
      if (name.endsWith('cancelApiAgentSessionRun') || name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        throw new Error('cleanup failed')
      }
      return original(name, args, options)
    }

    const caught = await new BudaAdapter(fake.client as any).generateProse(input).catch(error => error)

    expect(caught).toBeInstanceOf(McpError)
    expect(caught).not.toBe(unsafe)
    expect(caught.details).toEqual({
      session_id: 'session-1',
      remote_cancel_confirmed: false,
      receipt_status: 'remote_cancel_unknown',
    })
    expect(JSON.stringify(caught)).not.toContain('untrusted-secret-metadata')
    expect(JSON.stringify(caught)).not.toContain('untrusted-prompt')
  })

  test('closes the independent cleanup deadline after early confirmation', async () => {
    const fake = createFakeClient(['failed'])
    const input = generationInput()
    let cleanupClosed = 0
    ;(input.deadline as any).createCleanupDeadline = () => ({
      signal: new AbortController().signal,
      close: () => { cleanupClosed += 1 },
    })

    await expect(new BudaAdapter(fake.client as any).generateProse(input))
      .rejects.toMatchObject({ code: 'MCP_SESSION_FAILED' })
    expect(cleanupClosed).toBe(1)
  })

  test('accepts only exact terminal status from the single cleanup read', async () => {
    const controller = new AbortController()
    const fake = createFakeClient(['in_progress', 'cancelled'])
    const input = generationInput({ signal: controller.signal })
    const original = fake.client.callTool
    let primaryGetSeen = false
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('cancelApiAgentSessionRun')) {
        fake.calls.push({ name, args, options })
        return structured({ ok: true, cancelled: false })
      }
      const result = await original(name, args, options)
      if (name.endsWith('getApiAgentSession') && !primaryGetSeen) {
        primaryGetSeen = true
        controller.abort()
      }
      return result
    }
    const generation = new BudaAdapter(fake.client as any).generateProse(input)

    await expect(generation).rejects.toMatchObject({
      code: 'MCP_CANCELLED',
      details: { remote_cancel_confirmed: true },
    })
    const cleanupSignal = fake.calls.find(call => call.name.endsWith('cancelApiAgentSessionRun'))?.options.signal
    expect(cleanupSignal).toBeDefined()
    expect(fake.calls.filter(call => call.name.endsWith('getApiAgentSession') && call.options.signal === cleanupSignal))
      .toHaveLength(1)
  })

  test('bounds cleanup with its own signal without replacing an earlier typed failure', async () => {
    const storeError = new McpError('MCP_STORE_IO_FAILED', 'receipt persistence failed')
    const cleanupController = new AbortController()
    const baseDeadline = new McpGenerationDeadline(60_000)
    const deadline = Object.create(baseDeadline)
    deadline.createCleanupDeadline = (timeoutMs: number) => {
      expect(timeoutMs).toBe(5_000)
      queueMicrotask(() => cleanupController.abort())
      return { signal: cleanupController.signal, close: () => {} }
    }
    const fake = createFakeClient()
    const original = fake.client.callTool
    fake.client.callTool = async (name: string, args: any, options: any) => {
      if (name.endsWith('cancelApiAgentSessionRun') || name.endsWith('getApiAgentSession')) {
        fake.calls.push({ name, args, options })
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(options.signal.reason || new Error('cleanup timeout')), { once: true })
        })
      }
      return original(name, args, options)
    }

    await expect(new BudaAdapter(fake.client as any).generateProse(generationInput({
      deadline,
      onProgress: (event: any) => {
        if (event.stage === 'session_created') throw storeError
      },
    }))).rejects.toMatchObject({
      code: 'MCP_STORE_IO_FAILED',
      details: { remote_cancel_confirmed: false, receipt_status: 'remote_cancel_unknown' },
    })
    expect(fake.calls.filter(call => call.name.endsWith('cancelApiAgentSessionRun'))).toHaveLength(1)
    expect(fake.calls.filter(call => call.name.endsWith('getApiAgentSession'))).toHaveLength(0)
    baseDeadline.close()
  })

  test('does not clean up or mark an ordinary failure before Session creation', async () => {
    const fake = createFakeClient()
    fake.client.listTools = async () => { throw new McpError('MCP_CAPABILITY_MISSING', 'missing tools') }

    await expect(new BudaAdapter(fake.client as any).generateProse(generationInput()))
      .rejects.toMatchObject({ code: 'MCP_CAPABILITY_MISSING' })
    expect(fake.calls.filter(call => call.name.endsWith('cancelApiAgentSessionRun'))).toHaveLength(0)
    expect(fake.calls.filter(call => call.name.endsWith('getApiAgentSession'))).toHaveLength(0)
  })
})

describe('Buda result normalization', () => {
  test('builds the exact current-stage envelope without changing the prompt', () => {
    expect(typeof (budaAdapterModule as any).buildBudaStageEnvelope).toBe('function')
    const prompt = '只修订这一段，不得提前同步状态。'
    expect((budaAdapterModule as any).buildBudaStageEnvelope({
      requestId: 'request-stage',
      stage: 'revision',
      responseContract: 'revision_prose',
      prompt,
    })).toBe([
      '【MangaForge 章节任务阶段】',
      'request_id: request-stage',
      'stage: revision',
      'response_contract: revision_prose',
      '只执行当前 stage。不得自行开始下一阶段，不得用 Agent 旧记忆覆盖本次提示。',
      '严格按 response_contract 返回，不要附加流程说明。',
      '',
      prompt,
    ].join('\n'))
  })

  test('extracts the last non-empty assistant stage content with safe own-data fallbacks', () => {
    expect(typeof (budaAdapterModule as any).extractBudaStageContent).toBe('function')
    const extract = (budaAdapterModule as any).extractBudaStageContent
    expect(extract({
      messages: [
        { role: 'assistant', content: 'first' },
        { role: 'user', content: 'ignore' },
        { role: 'assistant', content: '   ' },
        { role: 'assistant', content: ' final stage output ' },
      ],
      content: 'fallback',
    })).toBe('final stage output')
    expect(extract({ content: ' content fallback ' })).toBe('content fallback')
    expect(extract({ text: ' text fallback ' })).toBe('text fallback')
    expect(extract({
      messages: [
        ...Array.from({ length: 40 }, () => ({ role: 'user', content: 'context' })),
        { role: 'assistant', content: 'latest bounded output' },
      ],
    })).toBe('latest bounded output')
    expect(extract({
      messages: [
        { role: 'assistant', content: 'earlier but still last assistant' },
        ...Array.from({ length: 40 }, () => ({ role: 'user', content: 'later context' })),
      ],
    })).toBe('earlier but still last assistant')
    expect(() => extract({ messages: [] })).toThrow(expect.objectContaining({ code: 'MCP_TOOL_ERROR' }))
  })

  test('does not execute Proxy traps or accessors while extracting stage content', () => {
    expect(typeof (budaAdapterModule as any).extractBudaStageContent).toBe('function')
    const extract = (budaAdapterModule as any).extractBudaStageContent
    let traps = 0
    const proxy = new Proxy({ messages: [] }, {
      get() { traps += 1; return 'secret' },
      getOwnPropertyDescriptor() { traps += 1; return undefined },
    })
    expect(() => extract(proxy)).toThrow(expect.objectContaining({ code: 'MCP_TOOL_ERROR' }))
    expect(traps).toBe(0)

    const revoked = Proxy.revocable([], {})
    revoked.revoke()
    expect(extract({ messages: revoked.proxy, text: 'revoked fallback' })).toBe('revoked fallback')

    let getters = 0
    const unsafe: any = { text: 'safe fallback' }
    Object.defineProperty(unsafe, 'messages', {
      enumerable: true,
      get() { getters += 1; return [{ role: 'assistant', content: 'secret' }] },
    })
    expect(extract(unsafe)).toBe('safe fallback')
    expect(getters).toBe(0)
  })

  test('rejects oversized assistant and fallback stage content without exposing it', () => {
    expect(typeof (budaAdapterModule as any).extractBudaStageContent).toBe('function')
    const extract = (budaAdapterModule as any).extractBudaStageContent
    const oversized = 'stage-secret-'.repeat(30_000)
    for (const data of [
      { messages: [{ role: 'assistant', content: oversized }] },
      { text: oversized },
      { messages: Array.from({ length: 257 }, () => ({ role: 'user', content: 'bounded' })) },
    ]) {
      const caught = (() => {
        try { extract(data) } catch (error) { return error }
      })() as any
      expect(caught).toMatchObject({
        code: 'MCP_TOOL_ERROR',
        details: { reason: 'stage_result_too_large' },
      })
      expect(JSON.stringify(caught)).not.toContain('stage-secret-')
    }
  })

  test('caps structured Agent lists before normalizing later entries', () => {
    let beyondLimitCalls = 0
    const apiAgents: any[] = Array.from({ length: 100 }, (_, index) => ({
      id: `agent-${index}`,
      name: `Agent ${index}`,
    }))
    Object.defineProperty(apiAgents, '100', {
      enumerable: true,
      get() { beyondLimitCalls += 1; return { id: 'agent-100', name: 'Agent 100' } },
    })
    apiAgents.length = 180

    expect(normalizeBudaAgentList({ apiAgents })).toHaveLength(100)
    expect(beyondLimitCalls).toBe(0)
  })

  test('rejects Proxy Agent arrays and values without executing traps', () => {
    let arrayTraps = 0
    const proxiedArray = new Proxy([{ id: 'agent-1', name: 'Agent 1' }], {
      get() { arrayTraps += 1; return 1 },
      getOwnPropertyDescriptor() { arrayTraps += 1; return undefined },
    })
    expect(normalizeBudaAgentList({ apiAgents: proxiedArray })).toEqual([])
    expect(arrayTraps).toBe(0)

    let agentTraps = 0
    const proxiedAgent = new Proxy({ id: 'agent-1', name: 'Agent 1' }, {
      get() { agentTraps += 1; return 'trap-value' },
      getOwnPropertyDescriptor() { agentTraps += 1; return undefined },
    })
    expect(normalizeBudaAgentList({ apiAgents: [proxiedAgent] })).toEqual([])
    expect(agentTraps).toBe(0)
  })

  test('does not invoke Agent accessors or object coercion while normalizing fields', () => {
    let getterCalls = 0
    let toStringCalls = 0
    const coercible = { toString() { toStringCalls += 1; return 'coerced' } }
    const agent: any = { id: coercible, name: 'safe-name' }
    Object.defineProperty(agent, 'description', {
      enumerable: true,
      get() { getterCalls += 1; return 'getter-description' },
    })

    expect(normalizeBudaAgentList({ apiAgents: [agent] })).toEqual([])
    expect(getterCalls).toBe(0)
    expect(toStringCalls).toBe(0)
  })

  test('keeps compatibility with the agents list shape', () => {
    expect(normalizeBudaAgentList({ agents: [{ id: 'agent-1', name: 'Agent 1' }] }))
      .toEqual([{ id: 'agent-1', name: 'Agent 1' }])
  })

  test('keeps compatibility with the items list shape', () => {
    expect(normalizeBudaAgentList({ items: [{ agentId: 'agent-2', title: 'Agent 2' }] }))
      .toEqual([{ id: 'agent-2', name: 'Agent 2' }])
  })

  test('keeps compatibility with a raw Agent array', () => {
    expect(normalizeBudaAgentList([{ id: 'agent-3', name: 'Agent 3' }]))
      .toEqual([{ id: 'agent-3', name: 'Agent 3' }])
  })

  test('prefers a structured chapter payload over text content', () => {
    expect(extractBudaProse({
      prose_chapters: [{ chapter_no: 4, title: '标题', chapter_text: '结构化正文' }],
      messages: [{ role: 'assistant', content: '后备正文' }],
    }, 4)).toEqual([{ chapter_no: 4, title: '标题', chapter_text: '结构化正文' }])
  })

  test('builds an authority envelope without changing the paragraph task', () => {
    const paragraphTask = '必须逐字保留的任务正文'
    const envelope = buildBudaExecutionEnvelope({ requestId: 'r1', chapterNo: 2, chapterTitle: '雨', paragraphTask })
    expect(envelope.endsWith(paragraphTask)).toBe(true)
  })
})
