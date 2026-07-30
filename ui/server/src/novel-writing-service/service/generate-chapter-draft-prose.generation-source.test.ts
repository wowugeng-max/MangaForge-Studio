import { afterEach, describe, expect, test } from 'bun:test'
import { rm } from 'fs/promises'
import { createMcpKey } from '../../mcp/key-store'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from '../../mcp/server-store'
import { updateNovelProject } from '../../novel'
import { buildPipelineProse, createProsePipelineHarness } from '../../routes/novel-writing-service.test-support'
import { createNovelWritingService } from './create-novel-writing-service'

const workspaces: string[] = []
afterEach(async () => Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true }))))

describe('chapter draft GenerationSource integration', () => {
  test('routes only the initial draft through MCP while later quality stages remain local model stages', async () => {
    const draftText = buildPipelineProse('红灯同时亮起，江澈撞开铁门。', '主动打乱包围并夺取通讯器')
    let remoteCalls = 0
    let remotePrompt = ''
    let adapter: any
    const mcpRuntime = {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      getAdapterForKey: async () => ({ server: BUDA_MCP_SERVER_TEMPLATE, key: { id: 1 }, adapter }),
    }
    const harness = await createProsePipelineHarness(
      ctx => createNovelWritingService({ ...ctx, mcpRuntime: mcpRuntime as any }),
      { draftText },
    )
    workspaces.push(harness.workspace)
    await writeMcpServers(harness.workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(harness.workspace, { mcp_server_id: 'buda', key: 'sk_pipeline', description: '账号' })
    ;(mcpRuntime.getAdapterForKey as any) = async () => ({ server: BUDA_MCP_SERVER_TEMPLATE, key, adapter })
    adapter = {
      generateProse: async (input: any) => {
        remoteCalls += 1
        remotePrompt = input.paragraphTask
        return {
          prose_chapters: [{ chapter_no: 10, chapter_text: draftText }],
          source: 'mcp', adapter_id: 'buda', agent_id: 'agent-1', session_id: 'session-1', snapshot_hash: 'snapshot-1', completed: true,
          raw: { request_id: input.requestId, session_status: 'completed' },
        }
      },
    }
    harness.project.reference_config.prose_generation_source = {
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
    }
    await updateNovelProject(harness.workspace, harness.project.id, { reference_config: harness.project.reference_config } as any)

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      production_mode: 'draft_only',
      skip_humanize_postprocess: true,
    })

    expect(result).toBeTruthy()
    expect(remoteCalls).toBe(1)
    expect(remotePrompt.length).toBeGreaterThan(100)
    expect(harness.modelCalls.draft).toBe(0)
    expect(harness.modelCalls.review).toBeGreaterThan(0)
    expect(result.chapter.raw_payload.prose_generation_source).toMatchObject({
      configured_type: 'mcp',
      resolved_type: 'mcp',
      adapter_id: 'buda',
      agent_id: 'agent-1',
      session_id: 'session-1',
    })
  })
})
