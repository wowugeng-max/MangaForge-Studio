import { describe, expect, test } from 'bun:test'
import {
  buildStandaloneProseServiceErrorPayload,
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

  test('scrubs reflected MCP credentials from bounded standalone HTTP and SSE error payloads', () => {
    const reflectedKey = 'sk_test_builder_reflection'
    const reflectedHeader = 'synthetic-builder-header-value'
    const residualText = '受保护的终止残余正文。'.repeat(40)
    const pipeline = [{ stage: 'mcp_session_wait', status: 'failed', agent_id: 'agent-1' }]
    const configSnapshot = { generation_source: 'mcp', server_id: 'buda', key_id: 17 }
    const payload = buildStandaloneProseServiceErrorPayload({
      code: 'MCP_SESSION_FAILED',
      message: [
        `Authorization: Bearer ${reflectedKey}`,
        'Cookie: first=synthetic-builder-cookie-one; second=synthetic-builder-cookie-two; third=synthetic-builder-cookie-three',
        'Safe: keep-builder-line',
      ].join('\n'),
      admission_status: 'blocked_invalid',
      details: {
        authorization: reflectedHeader,
        receipt: {
          error: 'Cookie: session=synthetic-builder-cookie',
          nested: `Authorization=${reflectedHeader}`,
          adapter_id: 'buda',
        },
        chapter_text: residualText,
      },
    }, pipeline, configSnapshot, { chapter_id: 91, chapter_no: 12 })

    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain(reflectedKey)
    expect(serialized).not.toContain(reflectedHeader)
    expect(serialized).not.toContain('synthetic-builder-cookie')
    expect(payload.error).toContain('Safe: keep-builder-line')
    expect(payload).toMatchObject({
      error_code: 'MCP_SESSION_FAILED',
      admission_status: 'blocked_invalid',
      chapter_id: 91,
      chapter_no: 12,
      chapter_text: residualText,
      finalText: residualText,
      details: {
        chapter_text: residualText,
        receipt: { adapter_id: 'buda' },
      },
      pipeline,
      config_snapshot: configSnapshot,
    })
  })
})
