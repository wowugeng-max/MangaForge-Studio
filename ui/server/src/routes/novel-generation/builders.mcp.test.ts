import { describe, expect, test } from 'bun:test'
import {
  buildStandaloneProseServiceOptions,
  standaloneProseServiceErrorStatus,
  standaloneProseServiceStageLabel,
} from './builders'

describe('MCP standalone prose route helpers', () => {
  test('preserves an explicit temporary model override as a distinct option', () => {
    expect(buildStandaloneProseServiceOptions(
      { generation_source_override: 'model' },
      { modelId: 217, autoRepairQualityGate: false, onStage: async () => {}, abortSignal: new AbortController().signal },
    )).toMatchObject({ generation_source_override: 'model', model_id: 217 })
  })

  test('labels MCP stages and maps stable MCP errors to useful HTTP statuses', () => {
    expect(standaloneProseServiceStageLabel('mcp_connect')).toBe('连接 MCP 服务')
    expect(standaloneProseServiceStageLabel('mcp_drive_sync')).toBe('同步 Agent Drive')
    expect(standaloneProseServiceStageLabel('mcp_session_wait')).toBe('等待远端 Agent')
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_BINDING_INVALID' })).toBe(412)
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_AGENT_BUSY' })).toBe(409)
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_GENERATION_TIMEOUT' })).toBe(504)
  })
})
