import { afterEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createMcpKey, updateMcpKey } from '../../mcp/key-store'
import { McpError } from '../../mcp/errors'
import { McpGenerationDeadline } from '../../mcp/deadline'
import { BudaAdapter } from '../../mcp/adapters/buda-adapter'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from '../../mcp/server-store'
import { createNovelProject, listNovelRuns } from '../../novel'
import { createGenerationSourceResolver } from './create-generation-source'
import { McpGenerationSource } from './mcp-generation-source'
import { ModelGenerationSource } from './model-generation-source'
import { proseGenerationSourceFingerprint } from './source-config'
import { acceptanceBindingFingerprintFromGenerationSource } from './types'

const workspaces: string[] = []
afterEach(async () => Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true }))))

function sourceRequest(overrides: Record<string, unknown> = {}) {
  return {
    requestId: 'request-12',
    activeWorkspace: '/workspace/a',
    project: { id: 8, title: '长篇测试', reference_config: {} },
    chapter: { id: 22, chapter_no: 12, title: '雨夜' },
    chapterNo: 12,
    paragraphTask: '完整段落任务，不得删减。',
    promptDiagnostics: { prompt_chars: 12 },
    contextPackage: { writing_bible: { voice: '克制' }, story_state: { global: { place: '北城' } }, continuity: { previous_chapter: { chapter_no: 11 } } },
    modelContext: { worldbuilding: [], characters: [], prevChapters: [] },
    modelId: 217,
    maxTokens: 8000,
    temperature: 0.7,
    ...overrides,
  } as any
}

describe('GenerationSource resolver', () => {
  test('defaults to model and does not let ordinary model_id bypass an MCP binding', () => {
    const model = { generateProse: async () => ({ source: 'model' }) } as any
    const mcp = { generateProse: async () => ({ source: 'mcp' }) } as any
    const resolver = createGenerationSourceResolver({ modelSource: model, mcpSource: mcp })
    const mcpProject = {
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1' },
        },
      },
    }

    expect(resolver.resolve({ reference_config: {} }, {})).toMatchObject({ source: model, configured_type: 'model' })
    expect(resolver.resolve(mcpProject, { model_id: 217 })).toMatchObject({ source: mcp, configured_type: 'mcp', override: null })
    expect(resolver.resolve(mcpProject, { generation_source_override: 'model', model_id: 217 })).toMatchObject({
      source: model,
      configured_type: 'mcp',
      override: 'model',
    })
  })
})

describe('ModelGenerationSource', () => {
  test('delegates to the existing model prose generator without changing the full task', async () => {
    let captured: any[] = []
    const source = new ModelGenerationSource(async (...args: any[]) => {
      captured = args
      return {
        parsed: { prose_chapters: [{ chapter_no: 12, chapter_text: '模型正文' }] },
        modelName: 'model-a',
        source_receipt: {
          receipt_authority: 'mcp_generation_source_v1',
          binding_fingerprint: `sha256:${'a'.repeat(64)}`,
          server_id: 'attacker-controlled',
        },
      }
    })
    const request = sourceRequest()
    const result = await source.generateProse(request)

    expect(captured[2].paragraphTask).toBe(request.paragraphTask)
    expect(captured[3]).toMatchObject({ activeWorkspace: '/workspace/a', modelId: '217', skipMemoryStore: true })
    expect(result).toMatchObject({ source: 'model', modelName: 'model-a' })
    expect(result).not.toHaveProperty('source_receipt')
  })
})

describe('McpGenerationSource', () => {
  test('persists a bounded session-created receipt before allowing the Adapter to send', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-session-receipt-'))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'sk_session_receipt', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: 'Session receipt',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    const events: string[] = []
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        await input.onProgress({
          stage: 'session_created',
          status: 'running',
          session_id: 'session-1',
          snapshot_hash: 'snapshot-1',
        })
        const [receipt] = (await listNovelRuns(workspace, project.id))
          .filter(run => run.run_type === 'mcp_generate_prose')
        const output = JSON.parse(receipt!.output_ref!)
        expect(receipt).toMatchObject({ status: 'session_created' })
        expect(output).toMatchObject({
          status: 'session_created',
          request_id: 'request-12',
          receipt_run_id: receipt!.id,
          session_id: 'session-1',
          snapshot_hash: 'snapshot-1',
        })
        expect(receipt!.output_ref).not.toContain('sk_session_receipt')
        expect(receipt!.output_ref).not.toContain(input.paragraphTask)
        events.push('receipt')
        events.push('send')
        return {
          prose_chapters: [{ chapter_no: 12, chapter_text: 'MCP 正文' }],
          source: 'mcp', adapter_id: 'buda', agent_id: 'agent-1', session_id: 'session-1', snapshot_hash: 'snapshot-1', completed: true,
          raw: { request_id: 'request-12', session_status: 'completed' },
        }
      },
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => { throw new Error('must use pinned adapter') },
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any)

    await source.generateProse(sourceRequest({ activeWorkspace: workspace, project }))

    expect(events).toEqual(['receipt', 'send'])
  })

  test('prevents send when the session-created durable receipt cannot be updated', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-session-receipt-failure-'))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'sk_session_failure', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: 'Session receipt failure',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    const events: string[] = []
    const caller = new AbortController()
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        const db = new Database(join(workspace, 'novel.sqlite'))
        db.run("DELETE FROM runs WHERE run_type = 'mcp_generate_prose'")
        db.close()
        try {
          await input.onProgress({
            stage: 'session_created',
            status: 'running',
            session_id: 'session-1',
            snapshot_hash: 'snapshot-1',
          })
        } catch (error) {
          queueMicrotask(() => caller.abort())
          await Promise.resolve()
          throw error
        }
        events.push('send')
        throw new Error('send should not be reached')
      },
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => { throw new Error('must use pinned adapter') },
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any)

    await expect(source.generateProse(sourceRequest({
      activeWorkspace: workspace,
      project,
      signal: caller.signal,
    }))).rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })

    expect(events).toEqual([])
    expect(caller.signal.aborted).toBe(true)
  })

  test('starts the total deadline before remote connection and tool discovery', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-discovery-deadline-'))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE, generation_timeout_ms: 100 }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'sk_discovery_timeout', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: 'Discovery timeout',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    let now = 0
    let expire = () => {}
    const toolCalls: string[] = []
    const adapter = new BudaAdapter({
      listTools: async (options: any) => {
        const signal: AbortSignal | undefined = options?.signal
        if (!signal) throw new Error('deadline signal missing before tool discovery')
        queueMicrotask(expire)
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        })
      },
      callTool: async (name: string) => {
        toolCalls.push(name)
        return { content: [] }
      },
    } as any)
    const runtime = {
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => { throw new Error('unreachable') },
      getAdapterForKey: async (_keyId: number, _serverId: string, options: any) => {
        if (!options?.signal) throw new Error('deadline signal missing before connection discovery')
        return { server, key, adapter }
      },
    }
    const source = new McpGenerationSource(runtime as any, {
      createDeadline: (totalMs: number, signal?: AbortSignal) => new McpGenerationDeadline(totalMs, signal, {
        now: () => now,
        setTimeout: callback => { expire = () => { now = totalMs; callback() }; return 1 },
        clearTimeout: () => {},
      }),
    } as any)

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_GENERATION_TIMEOUT' })

    expect(toolCalls).toEqual([])
  })

  test('preserves caller cancellation as distinct from total timeout at the public boundary', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-caller-cancel-'))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'sk_caller_cancel', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: 'Caller cancel',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    const caller = new AbortController()
    caller.abort()
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => [],
      getAdapterForKey: async () => { throw new Error('remote discovery must not start') },
    } as any)

    await expect(source.generateProse(sourceRequest({
      activeWorkspace: workspace,
      project,
      signal: caller.signal,
    }))).rejects.toMatchObject({ code: 'MCP_CANCELLED' })
  })

  test('does not commit success when the Adapter returns at the exact total deadline', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-final-deadline-'))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE, generation_timeout_ms: 100 }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'sk_final_deadline', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: 'Final deadline',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    let now = 0
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async () => {
        now = 100
        return {
          prose_chapters: [{ chapter_no: 12, chapter_text: 'late prose' }],
          source: 'mcp', adapter_id: 'buda', agent_id: 'agent-1', session_id: 'session-1', snapshot_hash: 'snapshot-1', completed: true,
          raw: { request_id: 'request-12', session_status: 'completed' },
        }
      },
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => [],
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any, {
      createDeadline: (totalMs: number, signal?: AbortSignal) => new McpGenerationDeadline(totalMs, signal, {
        now: () => now,
        setTimeout: () => 1,
        clearTimeout: () => {},
      }),
    })

    await expect(source.generateProse(sourceRequest({ activeWorkspace: workspace, project })))
      .rejects.toMatchObject({ code: 'MCP_GENERATION_TIMEOUT' })

    const [receipt] = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipt).toMatchObject({ status: 'failed' })
  })

  test('passes one shrinking deadline through adapter discovery and binding validation', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-shared-deadline-'))
    workspaces.push(workspace)
    const server = { ...BUDA_MCP_SERVER_TEMPLATE, startup_timeout_ms: 5_000, tool_timeout_ms: 100_000, generation_timeout_ms: 100_000 }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'sk_shared_deadline', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: 'Shared deadline',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    let now = 50_000
    let deadline!: McpGenerationDeadline
    const observed: Array<{ signal: AbortSignal, timeoutMs: number }> = []
    const adapter = {
      listAgents: async (options: any) => {
        observed.push({ signal: options.signal, timeoutMs: options.timeoutMs })
        now += 1_000
        return [{ id: 'agent-1', name: '正文 Agent' }]
      },
      generateProse: async (input: any) => {
        observed.push({ signal: input.deadline.signal, timeoutMs: input.deadline.timeoutMs(server.tool_timeout_ms) })
        return {
          prose_chapters: [{ chapter_no: 12, chapter_text: 'MCP 正文' }],
          source: 'mcp', adapter_id: 'buda', agent_id: 'agent-1', session_id: 'session-1', snapshot_hash: 'snapshot-1', completed: true,
          raw: { request_id: 'request-12', session_status: 'completed' },
        }
      },
    }
    const runtime = {
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => { throw new Error('must use pinned adapter') },
      getAdapterForKey: async (_keyId: number, _serverId: string, options: any) => {
        observed.push({ signal: options.signal, timeoutMs: options.timeoutMs })
        now += 1_000
        return { server, key, adapter }
      },
    }
    const source = new McpGenerationSource(runtime as any, {
      createDeadline: (totalMs: number, signal?: AbortSignal) => {
        deadline = new McpGenerationDeadline(totalMs, signal, {
          now: () => now,
          setTimeout: () => 1,
          clearTimeout: () => {},
        })
        return deadline
      },
    } as any)

    await source.generateProse(sourceRequest({ activeWorkspace: workspace, project }))

    expect(observed.every(options => options.signal === deadline.signal)).toBe(true)
    expect(observed.map(options => options.timeoutMs)).toEqual([5_000, 99_000, 98_000])
  })

  test('sends the exact compiled task, stores bounded receipt provenance, and never calls a model', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_source', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: '长篇测试',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
        },
      },
    })
    let captured: any = null
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        captured = input
        await input.onProgress?.({ stage: 'mcp_drive_sync', status: 'success', snapshot_hash: 'snapshot-1' })
        await input.onProgress?.({ stage: 'mcp_session_create', status: 'success', session_id: 'session-1' })
        return {
          prose_chapters: [{ chapter_no: 12, chapter_text: 'MCP 正文' }],
          source: 'mcp', adapter_id: 'buda', agent_id: 'agent-1', session_id: 'session-1', snapshot_hash: 'snapshot-1', completed: true,
          raw: { request_id: 'request-12', session_status: 'completed' },
        }
      },
    }
    const runtime = {
      resolveCredentialConfig: async () => ({ server: BUDA_MCP_SERVER_TEMPLATE, key }),
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      getAdapterForKey: async () => ({ server: BUDA_MCP_SERVER_TEMPLATE, key: { id: key.id }, adapter }),
    }
    const source = new McpGenerationSource(runtime as any)
    const paragraphTask = '完整段落任务：前因、当前冲突、后果与输出合同。'
    const result = await source.generateProse(sourceRequest({ activeWorkspace: workspace, project, paragraphTask }))
    const expectedFingerprint = proseGenerationSourceFingerprint(
      project.reference_config!.prose_generation_source as any,
    )

    expect(captured.paragraphTask).toBe(paragraphTask)
    expect(captured.drive).toMatchObject({ writingBible: expect.stringContaining('克制'), storyState: { place: '北城' } })
    expect(result).toMatchObject({
      source: 'mcp',
      session_id: 'session-1',
      snapshot_hash: 'snapshot-1',
      source_receipt: {
        receipt_authority: 'mcp_generation_source_v1',
        request_id: 'request-12',
        server_id: 'buda',
        key_id: key.id,
        adapter_id: 'buda',
        agent_id: 'agent-1',
        binding_fingerprint: expectedFingerprint,
        status: 'success',
      },
    })
    const receipts = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipts).toHaveLength(1)
    expect(receipts[0]).toMatchObject({ status: 'success' })
    expect(receipts[0]?.input_ref).not.toContain(paragraphTask)
    expect(receipts[0]?.output_ref).not.toContain('MCP 正文')
    expect(JSON.parse(receipts[0]!.output_ref!)).toMatchObject({
      binding_fingerprint: expectedFingerprint,
      status: 'success',
    })
    const receiptJson = JSON.stringify((result as any).source_receipt)
    expect(receiptJson).not.toContain('sk_source')
    expect(receiptJson).not.toContain(paragraphTask)
    expect(receiptJson).not.toContain('MCP 正文')
  })

  test('preserves the authoritative fingerprint while scrubbing short Key and Header substrings', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-short-secret-'))
    workspaces.push(workspace)
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': 'sha' },
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'a', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: '短凭据指纹测试',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-1' },
        },
      },
    })
    const expectedFingerprint = proseGenerationSourceFingerprint(
      project.reference_config!.prose_generation_source as any,
    )
    let runningFingerprint = ''
    const progress: any[] = []
    const adapter = {
      listAgents: async () => {
        const [runningReceipt] = (await listNovelRuns(workspace, project.id))
          .filter(run => run.run_type === 'mcp_generate_prose')
        runningFingerprint = JSON.parse(runningReceipt!.output_ref!).binding_fingerprint
        return [{ id: 'agent-1', name: '正文 Agent' }]
      },
      generateProse: async (input: any) => {
        await input.onProgress?.({
          stage: 'mcp_session_wait',
          status: 'running',
          session_id: 'session-a',
          detail: { key_echo: 'a', header_echo: 'sha' },
        })
        return {
          prose_chapters: [{ chapter_no: 12, chapter_text: '短凭据正文原样保留。' }],
          source: 'mcp',
          adapter_id: server.adapter_id,
          agent_id: 'agent-1',
          session_id: 'session-a',
          snapshot_hash: 'snapshot-sha-a',
          binding_fingerprint: `sha256:${'f'.repeat(64)}`,
          raw: { key_echo: 'a', header_echo: 'sha' },
          completed: true,
        }
      },
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => { throw new Error('Agent validation must use the pinned adapter') },
      getAdapterForKey: async (...args: any[]) => ({ ...args[3], adapter }),
    } as any)

    const result = await source.generateProse(sourceRequest({
      activeWorkspace: workspace,
      project,
      requestId: 'request-a',
      onProgress: (event: any) => { progress.push(event) },
    }))

    const [receipt] = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    const storedOutput = JSON.parse(receipt!.output_ref!)
    const returnedReceipt = (result as any).source_receipt
    for (const fingerprint of [runningFingerprint, storedOutput.binding_fingerprint, returnedReceipt.binding_fingerprint]) {
      expect(fingerprint).toBe(expectedFingerprint)
      expect(fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/)
    }
    expect(acceptanceBindingFingerprintFromGenerationSource({
      resolved_type: 'mcp',
      ...returnedReceipt,
    })).toBe(expectedFingerprint)
    expect(returnedReceipt).toMatchObject({
      server_id: 'bud[REDACTED]',
      adapter_id: 'bud[REDACTED]',
      agent_id: '[REDACTED]gent-1',
      request_id: 'request-[REDACTED]',
      session_id: 'session-[REDACTED]',
      snapshot_hash: 'sn[REDACTED]pshot-[REDACTED]-[REDACTED]',
    })
    expect((result as any).raw).toEqual({ key_echo: '[REDACTED]', header_echo: '[REDACTED]' })
    expect(progress.find(event => event.session_id)).toMatchObject({
      session_id: 'session-[REDACTED]',
      detail: { key_echo: '[REDACTED]', header_echo: '[REDACTED]' },
    })
  })

  test('preserves the authoritative fingerprint in failed receipts with short secrets', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-short-secret-failure-'))
    workspaces.push(workspace)
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': 'sha' },
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, { mcp_server_id: server.id, key: 'a', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: '短凭据失败指纹测试',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: server.id, key_id: key.id, adapter_id: server.adapter_id, agent_id: 'agent-a' },
        },
      },
    })
    const expectedFingerprint = proseGenerationSourceFingerprint(
      project.reference_config!.prose_generation_source as any,
    )
    const progress: any[] = []
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => { throw new Error('Agent validation must use the pinned adapter') },
      getAdapterForKey: async (...args: any[]) => ({
        ...args[3],
        adapter: { listAgents: async () => [] },
      }),
    } as any)

    await expect(source.generateProse(sourceRequest({
      activeWorkspace: workspace,
      project,
      onProgress: (event: any) => { progress.push(event) },
    }))).rejects.toMatchObject({ code: 'MCP_BINDING_INVALID' })

    const [receipt] = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    const storedOutput = JSON.parse(receipt!.output_ref!)
    expect(storedOutput).toMatchObject({
      receipt_authority: 'mcp_generation_source_v1',
      binding_fingerprint: expectedFingerprint,
      agent_id: '[REDACTED]gent-[REDACTED]',
    })
    expect(storedOutput.binding_fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(acceptanceBindingFingerprintFromGenerationSource({
      resolved_type: 'mcp',
      ...storedOutput,
    })).toBe(expectedFingerprint)
    expect(receipt?.error_message).not.toContain('agent-a')
    expect(progress.find(event => event.status === 'failed')?.detail).not.toContain('agent-a')
  })

  test('preserves the MCP error and stores a bounded failed receipt when live validation fails', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-failure-'))
    workspaces.push(workspace)
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_failure', description: '账号' })
    const project = await createNovelProject(workspace, {
      title: '失败测试',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'missing-agent' },
        },
      },
    })
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server: BUDA_MCP_SERVER_TEMPLATE, key }),
      listAgents: async () => [],
      getAdapterForKey: async (...args: any[]) => ({
        ...args[3],
        adapter: { listAgents: async () => [] },
      }),
    } as any)

    await expect(source.generateProse(sourceRequest({
      activeWorkspace: workspace,
      project,
      onProgress: () => undefined,
    }))).rejects.toMatchObject({ code: 'MCP_BINDING_INVALID' })

    const receipts = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipts).toHaveLength(1)
    expect(receipts[0]).toMatchObject({ status: 'failed' })
    expect(receipts[0]?.output_ref).not.toContain('完整段落任务')
    expect(JSON.parse(receipts[0]!.output_ref!)).toMatchObject({
      binding_fingerprint: proseGenerationSourceFingerprint(
        project.reference_config!.prose_generation_source as any,
      ),
      status: 'failed',
    })
  })

  test('scrubs stored credentials before an Agent-validation failure can persist colliding binding identifiers', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-pre-scrub-'))
    workspaces.push(workspace)
    const selectedHeader = 'synthetic-generation-header-value'
    const selectedKey = 'credential-value-before-remote-validation'
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': selectedHeader },
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, {
      mcp_server_id: server.id,
      key: selectedKey,
      description: '账号',
    })
    const project = await createNovelProject(workspace, {
      title: '早期校验凭据碰撞',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: {
            server_id: server.id,
            key_id: key.id,
            adapter_id: server.adapter_id,
            agent_id: selectedHeader,
          },
        },
      },
    })
    let adapterResolved = false
    let runningDurable = ''
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => { throw new Error('Agent validation must use the pinned adapter') },
      getAdapterForKey: async (...args: any[]) => {
        adapterResolved = true
        return {
          ...args[3],
          adapter: {
            listAgents: async () => {
              const [runningReceipt] = (await listNovelRuns(workspace, project.id))
                .filter(run => run.run_type === 'mcp_generate_prose')
              expect(runningReceipt).toMatchObject({ status: 'running' })
              runningDurable = JSON.stringify({
                input_ref: runningReceipt?.input_ref,
                output_ref: runningReceipt?.output_ref,
              })
              return []
            },
          },
        }
      },
    } as any)
    const progress: any[] = []
    let exposedError: any

    try {
      await source.generateProse(sourceRequest({
        activeWorkspace: workspace,
        project,
        onProgress: (event: any) => { progress.push(event) },
      }))
    } catch (error) {
      exposedError = error
    }

    expect(adapterResolved).toBe(true)
    const [receipt] = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipt).toMatchObject({ status: 'failed' })
    const durable = JSON.stringify({ output_ref: receipt?.output_ref, error_message: receipt?.error_message })
    const exposed = JSON.stringify({ message: exposedError?.message, details: exposedError?.details })
    const failedProgress = JSON.stringify(progress.find(event => event.stage === 'mcp_connect' && event.status === 'failed'))
    for (const secret of [selectedHeader, selectedKey]) {
      expect(runningDurable).not.toContain(secret)
      expect(durable).not.toContain(secret)
      expect(exposed).not.toContain(secret)
      expect(failedProgress).not.toContain(secret)
    }
    const storedOutput = JSON.parse(receipt!.output_ref!)
    expect(storedOutput.binding_fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(storedOutput.binding_fingerprint).not.toContain(selectedHeader)
    expect(JSON.parse(JSON.parse(runningDurable).output_ref).binding_fingerprint)
      .toMatch(/^sha256:[0-9a-f]{64}$/)
  })

  test('pins the scrubbed credential snapshot across Agent validation when the stored key rotates', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-rotation-'))
    workspaces.push(workspace)
    const initialKey = 'credential-before-agent-validation'
    const rotatedKey = 'credential-after-agent-validation'
    const server = { ...BUDA_MCP_SERVER_TEMPLATE }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, {
      mcp_server_id: server.id,
      key: initialKey,
      description: '账号',
    })
    const project = await createNovelProject(workspace, {
      title: '凭据轮换快照',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: {
            server_id: server.id,
            key_id: key.id,
            adapter_id: server.adapter_id,
            agent_id: 'agent-1',
          },
        },
      },
    })
    let unpinnedListAgentsCalls = 0
    let pinnedCredential: any
    const source = new McpGenerationSource({
      resolveCredentialConfig: async (...args: any[]) => {
        await updateMcpKey(workspace, key.id, { key: rotatedKey })
        return args[2] || { server, key: { ...key, key: rotatedKey } }
      },
      listAgents: async () => {
        unpinnedListAgentsCalls += 1
        await updateMcpKey(workspace, key.id, { key: rotatedKey })
        throw new McpError('MCP_RUNTIME_ERROR', `remote reflected ${rotatedKey}`, { echo: rotatedKey })
      },
      getAdapterForKey: async (...args: any[]) => {
        pinnedCredential = args[3]
        const reflected = String(pinnedCredential?.key?.key || initialKey)
        return {
          server: pinnedCredential?.server || server,
          key: pinnedCredential?.key || key,
          adapter: {
            listAgents: async () => {
              throw new McpError('MCP_RUNTIME_ERROR', `remote reflected ${reflected}`, { echo: reflected })
            },
          },
        }
      },
    } as any)
    let exposedError: any

    try {
      await source.generateProse(sourceRequest({ activeWorkspace: workspace, project }))
    } catch (error) {
      exposedError = error
    }

    const [receipt] = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipt).toMatchObject({ status: 'failed' })
    const durable = JSON.stringify({ output_ref: receipt?.output_ref, error_message: receipt?.error_message })
    const exposed = JSON.stringify({ message: exposedError?.message, details: exposedError?.details })
    for (const secret of [initialKey, rotatedKey]) {
      expect(durable).not.toContain(secret)
      expect(exposed).not.toContain(secret)
    }
    expect(unpinnedListAgentsCalls).toBe(0)
    expect(pinnedCredential).toMatchObject({
      server: { id: server.id },
      key: { id: key.id, key: initialKey },
    })
  })

  test('bounds scrubbed receipt identifiers after successful credential resolution', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-bounded-'))
    workspaces.push(workspace)
    const selectedHeader = 'synthetic-bounded-header-value'
    const selectedKey = 'credential-value-for-bounded-success'
    const serverId = `server-${'s'.repeat(320)}`
    const agentId = `agent-${'a'.repeat(320)}`
    const sessionId = `session-${'x'.repeat(640)}`
    const snapshotHash = `snapshot-${'y'.repeat(640)}`
    const paragraphTask = 'bounded receipt prompt must remain hash-only'
    const proseText = 'bounded receipt prose must never be durable'
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      id: serverId,
      display_name: 'Bounded Test Server',
      custom_headers: { 'X-Space': selectedHeader },
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, {
      mcp_server_id: server.id,
      key: selectedKey,
      description: '账号',
    })
    const project = await createNovelProject(workspace, {
      title: '有界成功回执',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: {
            server_id: server.id,
            key_id: key.id,
            adapter_id: server.adapter_id,
            agent_id: agentId,
          },
        },
      },
    })
    const adapter = {
      listAgents: async () => [{ id: agentId, name: 'Long Agent' }],
      generateProse: async () => ({
        prose_chapters: [{ chapter_no: 12, chapter_text: proseText }],
        source: 'mcp',
        adapter_id: server.adapter_id,
        agent_id: agentId,
        session_id: sessionId,
        snapshot_hash: snapshotHash,
        completed: true,
      }),
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => [{ id: agentId, name: 'Long Agent' }],
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any)

    const result = await source.generateProse(sourceRequest({
      activeWorkspace: workspace,
      project,
      paragraphTask,
    }))

    const [receipt] = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    const storedOutput = JSON.parse(receipt!.output_ref!)
    const returnedReceipt = (result as any).source_receipt
    for (const field of ['server_id', 'adapter_id', 'agent_id', 'session_id', 'snapshot_hash', 'binding_fingerprint']) {
      expect(String(storedOutput[field] || '').length).toBeLessThanOrEqual(160)
      expect(String(returnedReceipt[field] || '').length).toBeLessThanOrEqual(160)
    }
    const durable = JSON.stringify({ input_ref: receipt?.input_ref, output_ref: receipt?.output_ref, error_message: receipt?.error_message })
    for (const forbidden of [selectedHeader, selectedKey, paragraphTask, proseText]) {
      expect(durable).not.toContain(forbidden)
    }
  })

  test('scrubs selected credentials from progress, exposed errors, and durable failed receipts', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-scrub-'))
    workspaces.push(workspace)
    const selectedKey = 'sk_' + 'test_generation_reflection'
    const selectedHeader = 'synthetic-generation-header-value'
    const selectedCookie = 'session=synthetic-generation-cookie'
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': selectedHeader, Cookie: selectedCookie },
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: selectedKey,
      description: '账号',
    })
    const project = await createNovelProject(workspace, {
      title: '反射失败测试',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
        },
      },
    })
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async (input: any) => {
        await input.onProgress?.({
          stage: 'mcp_session_wait',
          status: 'failed',
          session_id: 'session-safe-1',
          snapshot_hash: 'snapshot-safe-1',
          detail: {
            message: `Authorization: Bearer ${selectedKey}`,
            nested: [`X-Space=${selectedHeader}`, `Cookie: ${selectedCookie}`],
            agent_id: 'agent-1',
          },
        })
        throw new McpError(
          'MCP_SESSION_FAILED',
          `upstream reflected ${selectedKey} and ${selectedHeader}`,
          {
            authorization: `Bearer ${selectedKey}`,
            nested: { message: selectedHeader, cookie: selectedCookie },
            adapter_id: 'buda',
            agent_id: 'agent-1',
          },
        )
      },
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any)
    const progress: any[] = []
    const paragraphTask = 'synthetic prose prompt that must only be represented by its hash'
    let exposedError: any

    try {
      await source.generateProse(sourceRequest({
        activeWorkspace: workspace,
        project,
        paragraphTask,
        onProgress: (event: any) => { progress.push(event) },
      }))
    } catch (error) {
      exposedError = error
    }

    expect(exposedError).toMatchObject({
      code: 'MCP_SESSION_FAILED',
      error_code: 'MCP_SESSION_FAILED',
      details: { adapter_id: 'buda', agent_id: 'agent-1' },
    })
    expect(JSON.stringify({ message: exposedError?.message, details: exposedError?.details })).not.toContain(selectedKey)
    expect(JSON.stringify({ message: exposedError?.message, details: exposedError?.details })).not.toContain(selectedHeader)
    expect(JSON.stringify({ message: exposedError?.message, details: exposedError?.details })).not.toContain('synthetic-generation-cookie')

    const reflectedProgress = progress.find(event => event.stage === 'mcp_session_wait')
    expect(reflectedProgress).toMatchObject({
      session_id: 'session-safe-1',
      snapshot_hash: 'snapshot-safe-1',
      detail: { agent_id: 'agent-1' },
    })
    expect(JSON.stringify(reflectedProgress)).not.toContain(selectedKey)
    expect(JSON.stringify(reflectedProgress)).not.toContain(selectedHeader)
    expect(JSON.stringify(reflectedProgress)).not.toContain('synthetic-generation-cookie')

    const receipts = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipts).toHaveLength(1)
    expect(receipts[0]).toMatchObject({ status: 'failed' })
    const durable = JSON.stringify({ output_ref: receipts[0]?.output_ref, error_message: receipts[0]?.error_message })
    expect(durable).not.toContain(selectedKey)
    expect(durable).not.toContain(selectedHeader)
    expect(durable).not.toContain('synthetic-generation-cookie')
    expect(durable).not.toContain(paragraphTask)
    expect(JSON.parse(receipts[0]!.output_ref!)).toMatchObject({
      server_id: 'buda',
      key_id: key.id,
      adapter_id: 'buda',
      agent_id: 'agent-1',
      session_id: 'session-safe-1',
      snapshot_hash: 'snapshot-safe-1',
      status: 'failed',
      error_code: 'MCP_SESSION_FAILED',
    })
  })

  test('preserves successful prose exactly while scrubbing every returned and durable metadata field', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-success-metadata-'))
    workspaces.push(workspace)
    const selectedKey = 'sk_' + 'test_success_metadata_reflection'
    const selectedHeader = 'synthetic-success-metadata-header'
    const selectedCookie = 'session=synthetic-success-metadata-cookie'
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': selectedHeader, Cookie: selectedCookie },
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: selectedKey,
      description: '账号',
    })
    const project = await createNovelProject(workspace, {
      title: '成功元数据反射测试',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
        },
      },
    })
    const proseText = `正文中的字面量必须原样保留：${selectedKey} / ${selectedHeader} / ${selectedCookie}`
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async () => ({
        prose_chapters: [{ chapter_no: 12, title: '原样正文', chapter_text: proseText }],
        source: 'mcp',
        adapter_id: 'buda',
        agent_id: 'agent-1',
        session_id: `session-${selectedKey}`,
        snapshot_hash: `snapshot-${selectedHeader}`,
        completed: true,
        raw: {
          request_id: 'request-12',
          session_status: 'completed',
          reflected_cookie: selectedCookie,
          safe: 'raw-safe',
        },
        usage: {
          output_tokens: 321,
          nested: { reflected_key: selectedKey, safe: 'usage-safe' },
        },
        extra_metadata: { reflected_header: selectedHeader, status: 'complete' },
      }),
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any)

    const result = await source.generateProse(sourceRequest({ activeWorkspace: workspace, project }))

    expect(result.prose_chapters).toEqual([{ chapter_no: 12, title: '原样正文', chapter_text: proseText }])
    const { prose_chapters: _proseChapters, ...returnedMetadata } = result
    const serializedMetadata = JSON.stringify(returnedMetadata)
    expect(serializedMetadata).not.toContain(selectedKey)
    expect(serializedMetadata).not.toContain(selectedHeader)
    expect(serializedMetadata).not.toContain('synthetic-success-metadata-cookie')
    expect(returnedMetadata).toMatchObject({
      source: 'mcp',
      adapter_id: 'buda',
      agent_id: 'agent-1',
      completed: true,
      raw: { request_id: 'request-12', session_status: 'completed', safe: 'raw-safe' },
      usage: { output_tokens: 321, nested: { safe: 'usage-safe' } },
      extra_metadata: { status: 'complete' },
      source_receipt: {
        server_id: 'buda',
        key_id: key.id,
        adapter_id: 'buda',
        agent_id: 'agent-1',
        status: 'success',
      },
    })

    const receipts = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipts).toHaveLength(1)
    expect(receipts[0]).toMatchObject({ status: 'success' })
    expect(receipts[0]?.output_ref).not.toContain(selectedKey)
    expect(receipts[0]?.output_ref).not.toContain(selectedHeader)
    expect(receipts[0]?.output_ref).not.toContain('synthetic-success-metadata-cookie')
    expect(receipts[0]?.output_ref).not.toContain(proseText)
  })

  test('preserves scrubbed enumerable non-MCP error metadata and protected blocked-invalid residual prose', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-error-metadata-'))
    workspaces.push(workspace)
    const selectedKey = 'sk_' + 'test_error_metadata_reflection'
    const selectedHeader = 'synthetic-error-metadata-header'
    const selectedCookie = 'session=synthetic-error-metadata-cookie'
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': selectedHeader, Cookie: selectedCookie },
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: selectedKey,
      description: '账号',
    })
    const project = await createNovelProject(workspace, {
      title: '错误元数据反射测试',
      reference_config: {
        prose_generation_source: {
          version: 'prose_generation_source_v1',
          type: 'mcp',
          mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
        },
      },
    })
    const residualText = `${'受保护的 blocked-invalid 残余正文必须逐字保留。'.repeat(20)} ${selectedKey} ${selectedHeader}`
    const adapter = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      generateProse: async () => {
        const failure: any = new Error(`adapter reflected ${selectedKey} and ${selectedHeader}`)
        failure.name = 'AdapterBlockedError'
        failure.code = 'MCP_SESSION_FAILED'
        failure.error_code = 'MCP_SESSION_FAILED'
        failure.admission_status = 'blocked_invalid'
        failure.retry_after_ms = 750
        failure.status = 'failed'
        failure.chapter_id = 22
        failure.chapter_no = 12
        failure.provenance = { server_id: 'buda', agent_id: 'agent-1', reflected: selectedHeader }
        failure.chapter_text = residualText
        failure.finalText = residualText
        failure.details = {
          chapter_text: residualText,
          cookie: selectedCookie,
          safe: 'details-safe',
          nested: { reflected_key: selectedKey, status: 'failed' },
        }
        Object.defineProperty(failure, 'stack', { value: `stack reflected ${selectedKey}`, enumerable: true })
        throw failure
      },
    }
    const source = new McpGenerationSource({
      resolveCredentialConfig: async () => ({ server, key }),
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      getAdapterForKey: async () => ({ server, key, adapter }),
    } as any)
    let exposedError: any

    try {
      await source.generateProse(sourceRequest({ activeWorkspace: workspace, project }))
    } catch (error) {
      exposedError = error
    }

    expect(exposedError).toMatchObject({
      name: 'AdapterBlockedError',
      code: 'MCP_SESSION_FAILED',
      error_code: 'MCP_SESSION_FAILED',
      admission_status: 'blocked_invalid',
      retry_after_ms: 750,
      status: 'failed',
      chapter_id: 22,
      chapter_no: 12,
      provenance: { server_id: 'buda', agent_id: 'agent-1' },
      details: { safe: 'details-safe', nested: { status: 'failed' } },
    })
    expect(exposedError.chapter_text).toBe(residualText)
    expect(exposedError.finalText).toBe(residualText)
    expect(exposedError.details.chapter_text).toBe(residualText)
    expect(Object.prototype.propertyIsEnumerable.call(exposedError, 'stack')).toBe(false)
    const { chapter_text: _chapterText, finalText: _finalText, details, ...metadata } = exposedError
    const { chapter_text: _detailsChapterText, ...detailsMetadata } = details
    const serializedMetadata = JSON.stringify({
      ...metadata,
      message: exposedError.message,
      details: detailsMetadata,
    })
    expect(serializedMetadata).not.toContain(selectedKey)
    expect(serializedMetadata).not.toContain(selectedHeader)
    expect(serializedMetadata).not.toContain('synthetic-error-metadata-cookie')

    const receipts = (await listNovelRuns(workspace, project.id)).filter(run => run.run_type === 'mcp_generate_prose')
    expect(receipts).toHaveLength(1)
    const durable = JSON.stringify({ output_ref: receipts[0]?.output_ref, error_message: receipts[0]?.error_message })
    expect(durable).not.toContain(selectedKey)
    expect(durable).not.toContain(selectedHeader)
    expect(durable).not.toContain('synthetic-error-metadata-cookie')
    expect(durable).not.toContain(residualText)
  })
})
