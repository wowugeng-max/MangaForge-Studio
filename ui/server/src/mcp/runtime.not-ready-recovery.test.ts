import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { McpGenerationDeadline } from './deadline'
import { McpError, mcpFailureEvidence } from './errors'
import { createMcpKey } from './key-store'
import { createMcpRuntime } from './runtime'
import { BUDA_MCP_SERVER_TEMPLATE, writeMcpServers } from './server-store'

const workspaces: string[] = []
afterEach(async () => Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true }))))

function serverNotInitializedError() {
  return new McpError('MCP_TOOL_ERROR', 'safe public error', {
    failure_evidence: {
      kind: 'jsonrpc_http_rejection',
      http_status: 400,
      jsonrpc_code: -32000,
      response_id: null,
      reason: 'server_not_initialized',
    },
  })
}

describe('MCP runtime not-ready recovery', () => {
  test('replaces a stale transport before replaying an exact pre-dispatch mutation', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-runtime-not-ready-replacement-'))
    workspaces.push(workspace)
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      id: 'not-ready-replacement-server',
      display_name: 'Not Ready Replacement Provider',
      adapter_id: 'not-ready-replacement-provider',
      poll_initial_ms: 1,
      poll_max_ms: 1,
    }
    await writeMcpServers(workspace, [server])
    const key = await createMcpKey(workspace, {
      mcp_server_id: server.id,
      key: 'sk_runtime_not_ready_replacement',
    })
    const events: string[] = []
    let firstMutationCalls = 0
    const firstClient = {
      diagnostics: () => ({ state: 'Ready' }),
      async listTools() {
        events.push('first-probe')
        throw serverNotInitializedError()
      },
      async callTool() {
        events.push('first-mutation')
        firstMutationCalls += 1
        if (firstMutationCalls === 1) throw serverNotInitializedError()
        return { content: ['stale-replay'] }
      },
    }
    const secondClient = {
      diagnostics: () => ({ state: 'Ready' }),
      async listTools() {
        events.push('second-probe')
        return [{ name: 'mutation' }]
      },
      async callTool() {
        events.push('second-mutation')
        return { content: ['created'] }
      },
    }
    let current = firstClient
    const invalidated: Array<typeof firstClient | typeof secondClient> = []
    const runtime = createMcpRuntime(() => workspace, {
      manager: {
        get: async () => current,
        invalidate: async () => {},
        async invalidateIfCurrent(_workspace, _serverId, _keyId, client) {
          invalidated.push(client as typeof firstClient | typeof secondClient)
          if (current === client) current = secondClient
        },
        invalidateServer: async () => {},
        closeAll: async () => {},
      } as any,
      adapterFactory: () => ({
        id: 'not-ready-replacement-provider',
        stabilityPolicy: {
          operationReadinessMode: 'reactive',
          requiredConsecutiveSuccesses: 1,
          warmupWindowMs: 2,
          classify(error, operation) {
            if (mcpFailureEvidence(error)?.reason === 'server_not_initialized') {
              return 'not_ready_pre_dispatch'
            }
            return operation === 'mutation' ? 'ambiguous_write_failure' : 'terminal_failure'
          },
          async probe(client, options) {
            await client.listTools({ ...options, refreshTools: true })
          },
        },
        async listAgents() { return [] },
      }) as any,
    })
    const resolved = await runtime.getAdapterForKey(key.id, server.id)
    const deadline = new McpGenerationDeadline(1_000)

    try {
      await expect(resolved.stability.runMutation(
        resolved.adapter.stabilityPolicy,
        {
          deadline,
          phase: 'session_create',
          pollInitialMs: 1,
          pollMaxMs: 1,
          toolTimeoutMs: 100,
        },
        () => resolved.client.callTool('mutation', {}, { operation: 'mutation' }),
      )).resolves.toEqual({ content: ['created'] })
      expect(events[0]).toBe('first-mutation')
      expect(events.filter(event => event === 'first-mutation')).toHaveLength(1)
      expect(events.filter(event => event === 'first-probe').length).toBeGreaterThanOrEqual(1)
      const secondProbeIndex = events.indexOf('second-probe')
      const secondMutationIndex = events.indexOf('second-mutation')
      expect(secondProbeIndex).toBeGreaterThan(0)
      expect(secondMutationIndex).toBeGreaterThan(secondProbeIndex)
      expect(events.lastIndexOf('first-probe')).toBeLessThan(secondProbeIndex)
      expect(invalidated).toEqual([firstClient])
    } finally {
      deadline.close()
    }
  })
})
