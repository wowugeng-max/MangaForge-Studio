import { describe, expect, test } from 'bun:test'
import {
  bindingFingerprint,
  buildSourcePayload,
  buildTemporaryModelOverride,
  canSaveGenerationSource,
  filterKeysForServer,
  isCompleteMcpSource,
  sourceFormFromConfig,
} from './mcpGenerationSourceModel'

describe('project MCP generation source model', () => {
  test('builds explicit model and complete MCP source payloads', () => {
    expect(buildSourcePayload({ type: 'model' })).toEqual({
      source: { version: 'prose_generation_source_v1', type: 'model' },
    })
    expect(buildSourcePayload({ type: 'mcp', serverId: 'buda', keyId: 3, adapterId: 'buda', agentId: 'agent_1' })).toEqual({
      source: {
        version: 'prose_generation_source_v1',
        type: 'mcp',
        mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent_1' },
      },
    })
  })

  test('requires a complete tested binding before MCP save', () => {
    const form = { type: 'mcp' as const, serverId: 'buda', keyId: 3, adapterId: 'buda', agentId: 'agent_1' }
    expect(isCompleteMcpSource(form)).toBe(true)
    expect(canSaveGenerationSource(form, '')).toBe(false)
    expect(canSaveGenerationSource(form, bindingFingerprint(form))).toBe(true)
    expect(isCompleteMcpSource({ ...form, agentId: '' })).toBe(false)
    expect(() => buildSourcePayload({ ...form, agentId: '' })).toThrow('MCP binding is incomplete')
  })

  test('filters active public Keys by the selected Server', () => {
    const keys = [
      { id: 1, mcp_server_id: 'buda', is_active: true },
      { id: 2, mcp_server_id: 'buda', is_active: false },
      { id: 3, mcp_server_id: 'other', is_active: true },
    ] as any
    expect(filterKeysForServer(keys, 'buda').map(item => item.id)).toEqual([1])
  })

  test('hydrates saved bindings and exposes the explicit temporary model override', () => {
    expect(sourceFormFromConfig({
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: 8, adapter_id: 'buda', agent_id: 'agent-x' },
    })).toEqual({ type: 'mcp', serverId: 'buda', keyId: 8, adapterId: 'buda', agentId: 'agent-x' })
    expect(sourceFormFromConfig(undefined)).toEqual({ type: 'model', serverId: '', keyId: 0, adapterId: '', agentId: '' })
    expect(buildTemporaryModelOverride()).toEqual({ generation_source_override: 'model' })
  })
})
