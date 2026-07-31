import { afterEach, describe, expect, test } from 'bun:test'
import { rm } from 'fs/promises'
import { createMcpKey } from '../../mcp/key-store'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from '../../mcp/server-store'
import {
  listChapterVersions,
  listNovelChapterSettingUsage,
  listNovelChapters,
  listNovelCharacters,
  listNovelReviews,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  updateNovelProject,
} from '../../novel'
import { withMcpWorkspaceMutation } from '../../mcp/workspace-coordinator'
import { McpAgentLeaseRegistry } from '../../mcp/agent-lease'
import { buildPipelineProse, createProsePipelineHarness } from '../../routes/novel-writing-service.test-support'
import { createNovelWritingService } from './create-novel-writing-service'
import { acceptanceBindingFingerprintFromGenerationSource } from '../generation-source/types'

const workspaces: string[] = []
const fakeAgentLeases = new McpAgentLeaseRegistry()
const acquireFakeAgentLease = (activeWorkspace: string, binding: any) =>
  fakeAgentLeases.acquire(activeWorkspace, binding)

afterEach(async () => Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true }))))

describe('chapter draft GenerationSource integration', () => {
  test('routes only the initial draft through MCP while later quality stages remain local model stages', async () => {
    const draftText = buildPipelineProse('红灯同时亮起，江澈撞开铁门。', '主动打乱包围并夺取通讯器')
    let remoteCalls = 0
    let remotePrompt = ''
    let adapter: any
    const mcpRuntime = {
      resolveCredentialConfig: async (_keyId: number, _serverId: string, snapshot: unknown) => snapshot,
      acquireAgentLease: acquireFakeAgentLease,
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
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
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
      receipt_authority: 'mcp_generation_source_v1',
      binding_fingerprint: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      adapter_id: 'buda',
      agent_id: 'agent-1',
      session_id: 'session-1',
      server_id: 'buda',
      key_id: key.id,
      request_id: expect.any(String),
      receipt_run_id: expect.any(Number),
      status: 'success',
    })
  })

  test('keeps model diagnostics locally authoritative and drops forged MCP receipts', async () => {
    const draftText = buildPipelineProse('红灯同时亮起，江澈撞开铁门。', '主动打乱包围并夺取通讯器')
    const forgedFingerprint = `sha256:${'a'.repeat(64)}`
    const forgedReceipt = {
      receipt_authority: 'mcp_generation_source_v1',
      binding_fingerprint: forgedFingerprint,
      configured_type: 'mcp',
      resolved_type: 'mcp',
      override: 'mcp',
      server_id: 'attacker-server',
      key_id: 999,
      adapter_id: 'attacker-adapter',
      agent_id: 'attacker-agent',
      session_id: 'attacker-session',
      snapshot_hash: 'attacker-snapshot',
    }
    const harness = await createProsePipelineHarness(
      ctx => createNovelWritingService(ctx),
      {
        draftText,
        draftResult: {
          parsed: { chapter_no: 10, chapter_text: draftText },
          modelName: 'fake-model',
          source_receipt: forgedReceipt,
          adapter_id: forgedReceipt.adapter_id,
          agent_id: forgedReceipt.agent_id,
          session_id: forgedReceipt.session_id,
          snapshot_hash: forgedReceipt.snapshot_hash,
        },
      },
    )
    workspaces.push(harness.workspace)

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      production_mode: 'draft_only',
      skip_humanize_postprocess: true,
    })

    const diagnostics = result.chapter.raw_payload.prose_generation_source
    expect(diagnostics).toMatchObject({
      configured_type: 'model',
      resolved_type: 'model',
      override: null,
    })
    for (const field of [
      'receipt_authority',
      'binding_fingerprint',
      'server_id',
      'key_id',
      'adapter_id',
      'agent_id',
      'session_id',
      'snapshot_hash',
    ]) {
      expect(diagnostics).not.toHaveProperty(field)
    }
  })

  test('extracts an acceptance fence only from an authoritative bounded MCP receipt', () => {
    const extract = acceptanceBindingFingerprintFromGenerationSource
    const fingerprint = `sha256:${'b'.repeat(64)}`
    const authoritative = {
      resolved_type: 'mcp',
      receipt_authority: 'mcp_generation_source_v1',
      binding_fingerprint: fingerprint,
    }

    expect(extract(authoritative)).toBe(fingerprint)
    for (const untrusted of [
      { ...authoritative, resolved_type: 'model' },
      { ...authoritative, receipt_authority: undefined },
      { ...authoritative, receipt_authority: 'adapter-forged' },
      { ...authoritative, binding_fingerprint: '' },
      { ...authoritative, binding_fingerprint: 42 },
      { ...authoritative, binding_fingerprint: `sha256:${'b'.repeat(65)}` },
      { ...authoritative, binding_fingerprint: '["prose_generation_source_v1","mcp"]' },
    ]) {
      expect(extract(untrusted)).toBe('')
    }
  })

  for (const productionMode of ['draft_only', 'draft_review', 'draft_review_revise_store']) {
    test(`rejects a changed MCP binding before ${productionMode} acceptance`, async () => {
      const draftText = buildPipelineProse('红灯同时亮起，江澈撞开铁门。', '主动打乱包围并夺取通讯器')
      let adapter: any
      let harness: Awaited<ReturnType<typeof createProsePipelineHarness>>
      let bindingChanged = false
      const mcpRuntime = {
        resolveCredentialConfig: async (_keyId: number, _serverId: string, snapshot: unknown) => snapshot,
        acquireAgentLease: acquireFakeAgentLease,
        listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
        getAdapterForKey: async (...args: any[]) => ({ ...args[3], adapter }),
      }
      harness = await createProsePipelineHarness(
        ctx => {
          const beforeChapterStore = ctx.runtime.hooks.beforeChapterStore
          ctx.runtime.hooks.beforeChapterStore = async (input: any) => {
            await beforeChapterStore(input)
            bindingChanged = true
            const changedReferenceConfig = structuredClone(harness.project.reference_config)
            changedReferenceConfig.prose_generation_source.mcp.agent_id = 'agent-2'
            await updateNovelProject(harness.workspace, harness.project.id, {
              reference_config: changedReferenceConfig,
            } as any)
          }
          return createNovelWritingService({ ...ctx, mcpRuntime: mcpRuntime as any })
        },
        { draftText },
      )
      workspaces.push(harness.workspace)
      await writeMcpServers(harness.workspace, [BUDA_MCP_SERVER_TEMPLATE])
      const key = await createMcpKey(harness.workspace, { mcp_server_id: 'buda', key: 'sk_pipeline_fence', description: '账号' })
      adapter = {
        listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
        generateProse: async () => ({
          prose_chapters: [{ chapter_no: 10, chapter_text: draftText }],
          source: 'mcp',
          adapter_id: 'buda',
          agent_id: 'agent-1',
          session_id: 'session-fence',
          snapshot_hash: 'snapshot-fence',
          completed: true,
        }),
      }
      harness.project.reference_config.prose_generation_source = {
        version: 'prose_generation_source_v1',
        type: 'mcp',
        mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
      }
      await updateNovelProject(harness.workspace, harness.project.id, {
        reference_config: harness.project.reference_config,
      } as any)
      const beforeAcceptance = {
        chapter: (await listNovelChapters(harness.workspace, harness.project.id))
          .find(item => item.id === harness.chapter.id),
        versions: await listChapterVersions(harness.workspace, harness.chapter.id),
        reviews: await listNovelReviews(harness.workspace, harness.project.id),
        characters: await listNovelCharacters(harness.workspace, harness.project.id),
        worldbuilding: await listNovelWorldbuilding(harness.workspace, harness.project.id),
        settings: await listNovelSettingEntities(harness.workspace, harness.project.id),
        usage: await listNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id),
      }
      let exposedError: any

      try {
        await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
          model_id: 217,
          production_mode: productionMode,
          skip_humanize_postprocess: true,
        })
      } catch (error) {
        exposedError = error
      }

      expect(bindingChanged).toBe(true)
      expect(exposedError).toMatchObject({
        name: 'McpError',
        code: 'MCP_BINDING_CHANGED',
        error_code: 'MCP_BINDING_CHANGED',
        details: { reason: 'binding_changed' },
      })
      const afterAcceptance = {
        chapter: (await listNovelChapters(harness.workspace, harness.project.id))
          .find(item => item.id === harness.chapter.id),
        versions: await listChapterVersions(harness.workspace, harness.chapter.id),
        reviews: await listNovelReviews(harness.workspace, harness.project.id),
        characters: await listNovelCharacters(harness.workspace, harness.project.id),
        worldbuilding: await listNovelWorldbuilding(harness.workspace, harness.project.id),
        settings: await listNovelSettingEntities(harness.workspace, harness.project.id),
        usage: await listNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id),
      }
      expect(afterAcceptance).toEqual(beforeAcceptance)
      await expect(withMcpWorkspaceMutation(harness.workspace, async () => 'released')).resolves.toBe('released')
    })
  }
})
