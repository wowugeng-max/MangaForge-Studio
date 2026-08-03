import { describe, expect, test } from 'bun:test'
import {
  buildStandaloneProseServiceErrorPayload,
  buildStandaloneProseServiceOptions,
  standaloneProseServiceErrorStatus,
  standaloneProseServiceStageLabel,
} from './builders'

describe('MCP standalone prose route helpers', () => {
  test('does not carry a temporary generation-source override into automatic production', () => {
    const options = buildStandaloneProseServiceOptions(
      { generation_source_override: 'model' },
      { modelId: 217, autoRepairQualityGate: false, onStage: async () => {}, abortSignal: new AbortController().signal },
    )

    expect(options).toMatchObject({ model_id: 217 })
    expect(options).not.toHaveProperty('generation_source_override')
  })

  test('labels MCP stages and maps stable MCP errors to useful HTTP statuses', () => {
    expect(standaloneProseServiceStageLabel('mcp_connect')).toBe('连接 MCP 服务')
    expect(standaloneProseServiceStageLabel('mcp_drive_sync')).toBe('同步 Agent Drive')
    expect(standaloneProseServiceStageLabel('mcp_session_wait')).toBe('等待远端 Agent')
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_BINDING_INVALID' })).toBe(412)
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_BINDING_CHANGED' })).toBe(409)
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_AGENT_BUSY' })).toBe(409)
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_AGENT_QUARANTINED' })).toBe(409)
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_SEND_UNKNOWN' })).toBe(502)
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_GENERATION_TIMEOUT' })).toBe(504)
  })

  test('preserves only an authoritative bounded MCP receipt status from service errors', () => {
    const secret = 'sk_' + 'test_receipt_payload_secret'
    const sessionProse = '不应出现在错误载荷中的远端 Session 正文。'.repeat(30)
    const fromDetails = buildStandaloneProseServiceErrorPayload({
      code: 'MCP_SEND_UNKNOWN',
      message: `发送状态未知 Authorization: Bearer ${secret}`,
      details: {
        receipt_status: 'send_unknown',
        session_id: 'private-session-id',
        messages: [{ role: 'assistant', content: sessionProse }],
        authorization: secret,
      },
    }, [{ stage: 'mcp_session_create', status: 'failed' }], { generation_source: 'mcp' })
    const fromTopLevel = buildStandaloneProseServiceErrorPayload({
      code: 'MCP_CANCELLED',
      message: '生成已取消',
      receipt_status: 'remote_cancel_unknown',
      details: { receipt_status: 'not_public', prompt: 'private prompt' },
    }, [], { generation_source: 'mcp' })
    const invalid = buildStandaloneProseServiceErrorPayload({
      code: 'MCP_SESSION_FAILED',
      message: '失败',
      details: { receipt_status: 'completed', messages: [sessionProse] },
    }, [], { generation_source: 'mcp' })

    expect(fromDetails.receipt_status).toBe('send_unknown')
    expect(fromTopLevel.receipt_status).toBe('remote_cancel_unknown')
    expect(invalid).not.toHaveProperty('receipt_status')
    for (const payload of [fromDetails, fromTopLevel, invalid]) {
      expect(payload).not.toHaveProperty('details')
      expect(JSON.stringify(payload)).not.toContain(sessionProse)
      expect(JSON.stringify(payload)).not.toContain(secret)
      expect(JSON.stringify(payload)).not.toContain('private-session-id')
      expect(JSON.stringify(payload)).not.toContain('private prompt')
    }
  })

  test('reconstructs a bounded prose-free pipeline from an explicit field allowlist', () => {
    const prose = '不应进入错误 pipeline 的正文内容。'.repeat(300)
    const prompt = '不应进入错误 pipeline 的完整提示词。'.repeat(300)
    const session = 'session-private-credential-shaped-identifier'
    const nestedSecret = 'sk_' + 'test_pipeline_nested_secret'
    const pipeline = Array.from({ length: 80 }, (_, index) => ({
      stage: index === 0 ? 'mcp_session_wait' : `stage_${index}_${'x'.repeat(500)}`,
      status: index === 0 ? 'failed' : `status_${prose}`,
      elapsed_ms: index === 0 ? 321 : Number.POSITIVE_INFINITY,
      percent: index === 0 ? 45 : 999_999,
      word_count: index === 0 ? 2_400 : -999,
      score: index === 0 ? 72.5 : Number.NaN,
      round: index === 0 ? 2 : 999_999,
      accepted: index === 0,
      source: index === 0 ? 'mcp' : prose,
      detail: prose,
      error: `remote reflected ${nestedSecret}`,
      reason: prose,
      message: prose,
      agent_id: 'agent-private',
      session_id: session,
      request_id: 'request-private',
      snapshot_hash: 'sha256:private',
      prompt,
      text: prose,
      nested: { authorization: nestedSecret, prompt, messages: [{ content: prose }] },
    }))

    const payload = buildStandaloneProseServiceErrorPayload(
      { code: 'MCP_SESSION_FAILED', message: '远端生成失败' },
      pipeline,
      { generation_source: 'mcp' },
    )
    const serialized = JSON.stringify(payload.pipeline)
    const allowedKeys = new Set([
      'stage', 'status', 'elapsed_ms', 'percent', 'word_count',
      'score', 'round', 'accepted', 'source',
    ])

    expect(payload.pipeline).toHaveLength(32)
    expect(payload.pipeline[0]).toEqual({
      stage: 'mcp_session_wait', status: 'failed', elapsed_ms: 321, percent: 45,
      word_count: 2_400, score: 72.5, round: 2, accepted: true,
    })
    expect(serialized.length).toBeLessThanOrEqual(16_384)
    for (const stage of payload.pipeline) {
      expect(Object.keys(stage).every(key => allowedKeys.has(key))).toBe(true)
      expect(Object.values(stage).every(value => value === null || typeof value !== 'object')).toBe(true)
      for (const value of Object.values(stage)) {
        if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true)
        if (typeof value === 'string') {
          expect(value.length).toBeLessThanOrEqual(64)
          expect(value).toMatch(/^[a-z0-9][a-z0-9_-]*$/)
        }
      }
      if (stage.percent !== undefined) expect(stage.percent >= 0 && stage.percent <= 100).toBe(true)
      if (stage.elapsed_ms !== undefined) expect(stage.elapsed_ms >= 0 && stage.elapsed_ms <= 86_400_000).toBe(true)
      if (stage.word_count !== undefined) expect(stage.word_count >= 0 && stage.word_count <= 10_000_000).toBe(true)
      if (stage.score !== undefined) expect(stage.score >= 0 && stage.score <= 100).toBe(true)
      if (stage.round !== undefined) expect(stage.round >= 0 && stage.round <= 1_000).toBe(true)
    }
    for (const forbidden of [prose, prompt, session, nestedSecret, 'agent-private', 'request-private', 'sha256:private']) {
      expect(serialized).not.toContain(forbidden)
    }
  })

  test('counts only accepted pipeline stages toward the bounded stage quota', () => {
    const invalid = Array.from({ length: 40 }, (_, index) => ({
      stage: `private-stage-${index}`,
      status: `private-status-${index}`,
      detail: 'must not survive',
    }))
    const valid = Array.from({ length: 40 }, (_, index) => ({
      stage: 'mcp_session_wait',
      status: 'running',
      round: index,
    }))

    const payload = buildStandaloneProseServiceErrorPayload(
      { code: 'MCP_SESSION_FAILED', message: '远端生成失败' },
      [...invalid, ...valid],
      { generation_source: 'mcp' },
    )
    const serialized = JSON.stringify(payload.pipeline)

    expect(payload.pipeline).toHaveLength(32)
    expect(payload.pipeline).toEqual(valid.slice(0, 32))
    expect(payload.pipeline).not.toContainEqual({})
    expect(serialized.length).toBeLessThanOrEqual(16_384)
  })

  test('maps only known internal stage keys and drops arbitrary ID slugs and source values', () => {
    const payload = buildStandaloneProseServiceErrorPayload(
      { code: 'MCP_SESSION_FAILED', message: '远端生成失败' },
      [
        {
          key: 'review',
          stage: 'session-private-id',
          status: 'failed',
          source: 'request-private-id',
        },
        { stage: 'mcp_session_wait', status: 'running', source: 'mcp' },
        {
          key: 'session-private-id',
          stage: 'request-private-id',
          status: 'failed',
          source: 'model',
        },
      ],
      { generation_source: 'mcp' },
    )

    expect(payload.pipeline).toEqual([
      { stage: 'review', status: 'failed' },
      { stage: 'mcp_session_wait', status: 'running' },
      { status: 'failed' },
    ])
    expect(JSON.stringify(payload.pipeline)).not.toContain('session-private-id')
    expect(JSON.stringify(payload.pipeline)).not.toContain('request-private-id')
    expect(payload.pipeline.every((stage: any) => !Object.hasOwn(stage, 'source'))).toBe(true)
  })

  test('scrubs reflected MCP credentials from bounded standalone HTTP and SSE error payloads', () => {
    const reflectedKey = 'sk_' + 'test_builder_reflection'
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
      pipeline: [{ stage: 'mcp_session_wait', status: 'failed' }],
      config_snapshot: configSnapshot,
    })
  })

  test('preserves the exact eligible details.chapterText residual alias without restoring unrelated secrets', () => {
    const residualLiteral = 'sk_' + 'test_eligible_residual_alias_literal'
    const residualText = `${'仅 blocked-invalid 恢复可保留的残余正文。'.repeat(24)} ${residualLiteral}`
    const unrelatedSecret = 'sk_' + 'test_unrelated_builder_metadata'
    const payload = buildStandaloneProseServiceErrorPayload({
      code: 'MCP_SESSION_FAILED',
      message: `Authorization: Bearer ${unrelatedSecret}`,
      admission_status: 'blocked_invalid',
      details: {
        chapterText: residualText,
        unrelated: `Cookie: session=synthetic-unrelated-builder-cookie`,
        nested: { authorization: unrelatedSecret, safe: 'keep-nested' },
        safe: 'keep-details',
      },
    }, [{ stage: 'mcp_extract', status: 'failed' }], { generation_source: 'mcp' }, {
      chapter_id: 92,
      chapter_no: 13,
    })

    expect(payload.chapter_text).toBe(residualText)
    expect(payload.finalText).toBe(residualText)
    expect(payload.details.chapter_text).toBe(residualText)
    expect(payload.details.safe).toBe('keep-details')
    expect(payload.details.nested.safe).toBe('keep-nested')
    const metadataOnly = {
      ...payload,
      chapter_text: '[PROSE]',
      finalText: '[PROSE]',
      details: {
        ...payload.details,
        chapter_text: '[PROSE]',
        chapterText: '[PROSE]',
      },
    }
    expect(JSON.stringify(metadataOnly)).not.toContain(unrelatedSecret)
    expect(JSON.stringify(metadataOnly)).not.toContain('synthetic-unrelated-builder-cookie')
    expect(payload.details.chapterText).toBe(residualText)
  })
})
