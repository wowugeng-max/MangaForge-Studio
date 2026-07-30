import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createMcpKey } from '../../mcp/key-store'
import { McpError } from '../../mcp/errors'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from '../../mcp/server-store'
import { createNovelProject, listNovelRuns } from '../../novel'
import { createGenerationSourceResolver } from './create-generation-source'
import { McpGenerationSource } from './mcp-generation-source'
import { ModelGenerationSource } from './model-generation-source'

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
      return { parsed: { prose_chapters: [{ chapter_no: 12, chapter_text: '模型正文' }] }, modelName: 'model-a' }
    })
    const request = sourceRequest()
    const result = await source.generateProse(request)

    expect(captured[2].paragraphTask).toBe(request.paragraphTask)
    expect(captured[3]).toMatchObject({ activeWorkspace: '/workspace/a', modelId: '217', skipMemoryStore: true })
    expect(result).toMatchObject({ source: 'model', modelName: 'model-a' })
  })
})

describe('McpGenerationSource', () => {
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
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      getAdapterForKey: async () => ({ server: BUDA_MCP_SERVER_TEMPLATE, key: { id: key.id }, adapter }),
    }
    const source = new McpGenerationSource(runtime as any)
    const paragraphTask = '完整段落任务：前因、当前冲突、后果与输出合同。'
    const result = await source.generateProse(sourceRequest({ activeWorkspace: workspace, project, paragraphTask }))

    expect(captured.paragraphTask).toBe(paragraphTask)
    expect(captured.drive).toMatchObject({ writingBible: expect.stringContaining('克制'), storyState: { place: '北城' } })
    expect(result).toMatchObject({
      source: 'mcp',
      session_id: 'session-1',
      snapshot_hash: 'snapshot-1',
      source_receipt: {
        request_id: 'request-12',
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
    expect(receipts[0]?.input_ref).not.toContain(paragraphTask)
    expect(receipts[0]?.output_ref).not.toContain('MCP 正文')
    expect(JSON.stringify((result as any).source_receipt)).not.toContain(paragraphTask)
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
      listAgents: async () => [],
      getAdapterForKey: async () => { throw new Error('must not resolve an invalid binding') },
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
  })

  test('scrubs selected credentials from progress, exposed errors, and durable failed receipts', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-generation-source-scrub-'))
    workspaces.push(workspace)
    const selectedKey = 'sk_test_generation_reflection'
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
})
