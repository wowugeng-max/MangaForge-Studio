import { describe, expect, test } from 'bun:test'
import {
  buildStandaloneProseServiceErrorPayload,
  buildStandaloneProseServiceOptions,
  compactStandaloneProseProgressStage,
  standaloneProseServiceErrorStatus,
  standaloneProseServiceStageLabel,
} from './builders'
import * as generationBuilders from './builders'
import { createNovelProductionService } from '../novel-production-service'
import { classifyGenerationFailure as classifyGenerationFailurePolicy } from '../novel-production/generation-failure-policy'

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
    expect(standaloneProseServiceStageLabel('mcp_transport_stabilizing')).toBe('稳定 MCP 连接')
    expect(standaloneProseServiceStageLabel('mcp_drive_sync')).toBe('同步 Agent Drive')
    expect(standaloneProseServiceStageLabel('mcp_session_create')).toBe('创建阶段 Session')
    expect(standaloneProseServiceStageLabel('mcp_session_wait')).toBe('等待阶段 Agent')
    expect(standaloneProseServiceStageLabel('mcp_extract')).toBe('提取阶段结果')
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_BINDING_INVALID' })).toBe(412)
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_BINDING_CHANGED' })).toBe(409)
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_AGENT_BUSY' })).toBe(409)
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_AGENT_QUARANTINED' })).toBe(409)
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_SEND_UNKNOWN' })).toBe(502)
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_SERVER_NOT_READY' })).toBe(503)
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_DRIVE_SYNC_FAILED' })).toBe(502)
    expect(standaloneProseServiceErrorStatus({ code: 'MCP_GENERATION_TIMEOUT' })).toBe(504)
  })

  test('classifies structured MCP recovery failures before misleading message text', () => {
    const classify = createNovelProductionService().classifyGenerationFailure

    expect(classify({
      code: 'MCP_SERVER_NOT_READY',
      message: 'upload file failed; JSON 解析失败',
    })).toEqual({
      type: 'mcp_server_not_ready',
      actions: ['保留已完成阶段', '等待 MCP 服务稳定后从当前阶段继续'],
    })
    expect(classify({
      code: 'MCP_DRIVE_SYNC_FAILED',
      message: 'upload current user input file failed',
    })).toEqual({
      type: 'mcp_drive_sync_failed',
      actions: ['检查 MCP Drive 权限和内容对账', '修复后从当前阶段继续'],
    })
  })

  test('exports the production failure classifier without a production-service wrapper', () => {
    const classify = Reflect.get(generationBuilders, 'classifyGenerationFailure')

    expect(typeof classify).toBe('function')
    expect(classify).toBe(classifyGenerationFailurePolicy)
    expect(createNovelProductionService().classifyGenerationFailure).toBe(classify)
  })

  test('never recommends a model fallback for other structured MCP failures', () => {
    const plan = createNovelProductionService().classifyGenerationFailure({
      code: 'MCP_SESSION_FAILED',
      message: 'upload file failed; 请切换模型重试',
    })

    expect(plan).toEqual({
      type: 'mcp_generation_failed',
      actions: ['保留已完成阶段', '确认 MCP 服务状态后从当前阶段继续'],
    })
    expect(JSON.stringify(plan)).not.toContain('切换模型')
    expect(JSON.stringify(plan)).not.toContain('模型 API')
    expect(JSON.stringify(plan)).not.toContain('回退')
  })

  test('publishes only bounded recovery metadata from MCP progress events', () => {
    const sessionId = 'complete-private-session-id'
    const prompt = 'private prompt and chapter content'
    const remoteBody = 'Server not initialized remote response body'
    const progress = compactStandaloneProseProgressStage({
      key: 'mcp_transport_stabilizing',
      stage: 'mcp_transport_stabilizing',
      label: 'untrusted label',
      status: 'running',
      detail: 'phase=session_create; recovery_round=7',
      elapsed_ms: 321,
      session_id: sessionId,
      snapshot_hash: 'private-snapshot-hash',
      prompt,
      content: 'private chapter prose',
      headers: { authorization: 'private header' },
      remote_response: { body: remoteBody },
    })

    expect(progress).toEqual({
      key: 'mcp_transport_stabilizing',
      stage: 'mcp_transport_stabilizing',
      label: '稳定 MCP 连接',
      status: 'running',
      phase: 'session_create',
      recovery_count: 7,
      elapsed_ms: 321,
    })
    const serialized = JSON.stringify(progress)
    for (const forbidden of [sessionId, prompt, remoteBody, 'private chapter prose', 'private header', 'private-snapshot-hash']) {
      expect(serialized).not.toContain(forbidden)
    }
  })

  test('does not publish arbitrary MCP stage slugs as remote identifiers', () => {
    const remoteStage = `mcp_${'complete-private-session-identifier'.repeat(4)}`
    const progress = compactStandaloneProseProgressStage({
      key: remoteStage,
      stage: remoteStage,
      label: remoteStage,
      status: 'running',
      session_id: 'complete-private-session-identifier',
    })

    expect(progress).toEqual({ label: 'MCP 阶段', status: 'running' })
    expect(JSON.stringify(progress)).not.toContain(remoteStage)
    expect(JSON.stringify(progress)).not.toContain('complete-private-session-identifier')
  })

  test('drops MCP identity and remote payload fields even when a stage key is rewritten', () => {
    const progress = compactStandaloneProseProgressStage({
      key: 'quality_pipeline',
      stage: 'quality_pipeline',
      label: '进入质检',
      status: 'running',
      session_id: 'complete-private-session-id',
      snapshot_hash: 'private-snapshot-hash',
      content: 'private chapter content',
      detail: 'private remote body',
      headers: { authorization: 'private header' },
      remote_response: { body: 'private remote body' },
    })

    const serialized = JSON.stringify(progress)
    for (const forbidden of [
      'complete-private-session-id', 'private-snapshot-hash', 'private chapter content',
      'private header', 'private remote body',
    ]) {
      expect(serialized).not.toContain(forbidden)
    }
  })

  test('uses authoritative MCP task context to strictly project every progress stage', () => {
    const customHeader = 'x-drive-proof-private-value'
    const remoteBody = 'private remote response body'
    const progress = compactStandaloneProseProgressStage({
      key: 'quality_pipeline',
      stage: 'quality_pipeline',
      label: 'untrusted label',
      status: 'running',
      phase: 'session_create',
      recovery_count: 8,
      elapsed_ms: 456,
      detail: remoteBody,
      nested: {
        session_id: 'complete-private-session-id',
        snapshot_hash: 'private-snapshot-hash',
        headers: { 'X-Drive-Proof': customHeader },
        body: remoteBody,
      },
    }, { mcpTask: true, stageKey: 'quality_pipeline' })

    expect(progress).toEqual({
      key: 'quality_pipeline',
      label: '进入 MangaForge 质检',
      status: 'running',
      phase: 'session_create',
      recovery_count: 8,
      elapsed_ms: 456,
    })
    const serialized = JSON.stringify(progress)
    for (const forbidden of [customHeader, remoteBody, 'complete-private-session-id', 'private-snapshot-hash']) {
      expect(serialized).not.toContain(forbidden)
    }
  })

  test('publishes a bounded authoritative stage key for ordinary strict MCP progress', () => {
    const progress = compactStandaloneProseProgressStage({
      status: 'running',
      phase: 'drive_sync',
    }, { mcpTask: true, stageKey: 'mcp_drive_sync' })

    expect(progress).toEqual({
      key: 'mcp_drive_sync',
      label: '同步 Agent Drive',
      status: 'running',
      phase: 'drive_sync',
    })
  })

  test('does not let conflicting payload identity override the authoritative strict MCP stage key', () => {
    const progress = compactStandaloneProseProgressStage({
      key: 'quality_pipeline',
      stage: 'mcp_session_create',
      status: 'running',
      phase: 'drive_sync',
    }, { mcpTask: true, stageKey: 'mcp_drive_sync' })

    expect(progress).toEqual({
      key: 'mcp_drive_sync',
      label: '同步 Agent Drive',
      status: 'running',
      phase: 'drive_sync',
    })
    expect(progress).not.toHaveProperty('stage')
  })

  test('does not derive strict MCP stage identity from payload when the authoritative key is unknown', () => {
    const progress = compactStandaloneProseProgressStage({
      key: 'mcp_drive_sync',
      stage: 'mcp_drive_sync',
      status: 'running',
      phase: 'drive_sync',
    }, { mcpTask: true, stageKey: 'private-remote-stage' })

    expect(progress).toEqual({
      label: 'MCP 阶段',
      status: 'running',
      phase: 'drive_sync',
    })
    expect(JSON.stringify(progress)).not.toContain('private-remote-stage')
    expect(JSON.stringify(progress)).not.toContain('mcp_drive_sync')
  })

  test('keeps authoritative strict MCP progress identity without invoking hostile payloads', () => {
    const getterSecret = 'PRIVATE_AUTHORITATIVE_STAGE_GETTER_REMOTE_TEXT'
    const proxySecret = 'PRIVATE_AUTHORITATIVE_STAGE_PROXY_REMOTE_TEXT'
    let getterReads = 0
    let proxyTraps = 0
    const getterStage: any = {}
    Object.defineProperty(getterStage, 'key', {
      enumerable: true,
      get() {
        getterReads += 1
        throw new Error(getterSecret)
      },
    })
    const proxyStage = new Proxy({}, {
      get() {
        proxyTraps += 1
        throw new Error(proxySecret)
      },
      getOwnPropertyDescriptor() {
        proxyTraps += 1
        throw new Error(proxySecret)
      },
    })
    const revokedStage = Proxy.revocable({}, {})
    revokedStage.revoke()

    const projections = [getterStage, proxyStage, revokedStage.proxy].map(stage => (
      compactStandaloneProseProgressStage(stage, { mcpTask: true, stageKey: 'mcp_drive_sync' })
    ))

    expect(projections).toEqual(Array.from({ length: 3 }, () => ({
      key: 'mcp_drive_sync',
      label: '同步 Agent Drive',
    })))
    expect(getterReads).toBe(0)
    expect(proxyTraps).toBe(0)
    expect(JSON.stringify(projections)).not.toContain('PRIVATE_')
  })

  test('projects bounded recovery evidence without remote MCP response data', () => {
    const remoteBody = 'Server not initialized with complete remote response body'
    const sessionId = 'complete-private-session-id'
    const payload = buildStandaloneProseServiceErrorPayload({
      code: 'MCP_SERVER_NOT_READY',
      message: remoteBody,
      details: {
        phase: 'session_create',
        recovery_count: 7,
        elapsed_ms: 321,
        session_id: sessionId,
        prompt: 'private prompt',
        headers: { authorization: 'private header' },
        remote_response: { body: remoteBody },
      },
      launchGateBlocker: { body: remoteBody },
      referenceReport: { body: remoteBody },
      safetyDecision: { body: remoteBody },
      promptDiagnostics: { body: remoteBody },
      qualityLoop: { body: remoteBody },
    }, [{
      stage: 'mcp_transport_stabilizing',
      status: 'running',
      phase: 'session_create',
      recovery_count: 7,
      elapsed_ms: 321,
      percent: 90,
      word_count: 2_400,
      score: 88,
      round: 9,
      accepted: true,
      session_id: sessionId,
      body: remoteBody,
    }], { generation_source: 'mcp' })

    expect(payload).toMatchObject({
      error: 'MCP 服务尚未稳定就绪',
      error_code: 'MCP_SERVER_NOT_READY',
      phase: 'session_create',
      recovery_count: 7,
      elapsed_ms: 321,
      pipeline: [{
        stage: 'mcp_transport_stabilizing',
        status: 'running',
        phase: 'session_create',
        recovery_count: 7,
        elapsed_ms: 321,
      }],
    })
    expect(payload.pipeline).toEqual([{
      stage: 'mcp_transport_stabilizing',
      status: 'running',
      phase: 'session_create',
      recovery_count: 7,
      elapsed_ms: 321,
    }])
    expect(payload).not.toHaveProperty('details')
    const serialized = JSON.stringify(payload)
    for (const forbidden of [remoteBody, sessionId, 'private prompt', 'private header']) {
      expect(serialized).not.toContain(forbidden)
    }
  })

  test('builds source-strict MCP task errors without blocked residuals or caller metadata', () => {
    const customHeader = 'x-drive-proof-private-value'
    const sessionId = 'complete-private-session-id'
    const prompt = 'private prompt'
    const prose = 'private chapter prose'.repeat(40)
    const remoteBody = 'private remote response body'
    const unsafe = {
      admission_status: 'blocked_invalid',
      receipt_status: 'send_unknown',
      chapter_text: prose,
      finalText: prose,
      prompt,
      session_id: sessionId,
      headers: { 'X-Drive-Proof': customHeader },
      remote_response: { body: remoteBody },
      details: {
        phase: 'session_create',
        recovery_count: 8,
        elapsed_ms: 456,
        chapterText: prose,
        prompt,
        session_id: sessionId,
        custom_header: customHeader,
        remote_body: remoteBody,
      },
    }
    const pipeline = [{
      stage: 'quality_pipeline',
      status: 'failed',
      phase: 'session_create',
      recovery_count: 8,
      elapsed_ms: 456,
      nested: { session_id: sessionId, custom_header: customHeader, body: remoteBody },
    }]
    const metadata = {
      config_snapshot: { prompt, session_id: sessionId, custom_header: customHeader, chapter_text: prose },
      chapter_identity: { chapter_id: customHeader, chapter_no: customHeader, session_id: sessionId },
    }
    const notReady = buildStandaloneProseServiceErrorPayload({
      ...unsafe,
      code: 'MCP_SERVER_NOT_READY',
      message: remoteBody,
    }, pipeline, metadata.config_snapshot, metadata.chapter_identity, { mcpTask: true })
    const genericTaskError = buildStandaloneProseServiceErrorPayload({
      ...unsafe,
      code: 'PROSE_QUALITY_GATE_BLOCKED',
      message: remoteBody,
    }, pipeline, metadata.config_snapshot, metadata.chapter_identity, { mcpTask: true })

    expect(notReady).toEqual({
      error: 'MCP 服务尚未稳定就绪',
      error_code: 'MCP_SERVER_NOT_READY',
      receipt_status: 'send_unknown',
      phase: 'session_create',
      recovery_count: 8,
      elapsed_ms: 456,
      pipeline: [{
        stage: 'quality_pipeline',
        status: 'failed',
        phase: 'session_create',
        recovery_count: 8,
        elapsed_ms: 456,
      }],
    })
    expect(genericTaskError).toEqual({
      error: 'MCP 章节生成失败',
      error_code: 'MCP_GENERATION_FAILED',
      receipt_status: 'send_unknown',
      phase: 'session_create',
      recovery_count: 8,
      elapsed_ms: 456,
      pipeline: [{
        stage: 'quality_pipeline',
        status: 'failed',
        phase: 'session_create',
        recovery_count: 8,
        elapsed_ms: 456,
      }],
    })
    for (const payload of [notReady, genericTaskError]) {
      const serialized = JSON.stringify(payload)
      for (const forbidden of [customHeader, sessionId, prompt, prose, remoteBody]) {
        expect(serialized).not.toContain(forbidden)
      }
    }
  })

  test('publishes only explicitly allowlisted MCP error codes for strict task failures', () => {
    const publicCodes = [
      'MCP_SERVER_NOT_READY',
      'MCP_DRIVE_SYNC_FAILED',
      'MCP_SEND_UNKNOWN',
    ]
    for (const code of publicCodes) {
      const payload = buildStandaloneProseServiceErrorPayload(
        { code, message: 'private remote response body' },
        [],
        {},
        {},
        { mcpTask: true },
      )
      expect(payload.error_code).toBe(code)
    }

    const privateCodes = [
      'PRIVATE_COMPLETE_SESSION_ID',
      'MCP_SESSION_ID_OPAQUE_PRIVATE_COMPLETE',
    ]
    const privatePayloads = privateCodes.map(code => buildStandaloneProseServiceErrorPayload(
      { code, message: 'private remote response body' },
      [],
      {},
      {},
      { mcpTask: true },
    ))
    expect(privatePayloads.map(payload => payload.error_code)).toEqual([
      'MCP_GENERATION_FAILED',
      'MCP_GENERATION_FAILED',
    ])
    for (const [index, payload] of privatePayloads.entries()) {
      const code = privateCodes[index]
      expect(JSON.stringify(payload)).not.toContain(code)
    }
  })

  test('does not invoke service error or details accessors and proxies during strict error projection', () => {
    const codeSecret = 'PRIVATE_CODE_GETTER_REMOTE_TEXT'
    const detailsSecret = 'PRIVATE_DETAILS_GETTER_REMOTE_TEXT'
    const proxySecret = 'PRIVATE_DETAILS_PROXY_REMOTE_TEXT'
    let codeGetterReads = 0
    let detailsGetterReads = 0
    let detailsProxyTraps = 0
    const codeGetterError: any = {}
    Object.defineProperty(codeGetterError, 'code', {
      enumerable: true,
      get() {
        codeGetterReads += 1
        throw new Error(codeSecret)
      },
    })
    const detailsGetterError: any = { code: 'MCP_SESSION_FAILED' }
    Object.defineProperty(detailsGetterError, 'details', {
      enumerable: true,
      get() {
        detailsGetterReads += 1
        throw new Error(detailsSecret)
      },
    })
    const detailsProxy = new Proxy({}, {
      get() {
        detailsProxyTraps += 1
        throw new Error(proxySecret)
      },
      getOwnPropertyDescriptor() {
        detailsProxyTraps += 1
        throw new Error(proxySecret)
      },
    })
    const revokedDetails = Proxy.revocable({}, {})
    revokedDetails.revoke()
    const errors = [
      codeGetterError,
      detailsGetterError,
      { code: 'MCP_SESSION_FAILED', details: detailsProxy },
      { code: 'MCP_SESSION_FAILED', details: revokedDetails.proxy },
    ]
    const projections = errors.map(serviceError => {
      try {
        return {
          payload: buildStandaloneProseServiceErrorPayload(
            serviceError,
            [],
            {},
            {},
            { mcpTask: true },
          ),
        }
      } catch (error) {
        return { error }
      }
    })
    const thrown = projections.map(item => item.error ? String(item.error) : '')

    expect(thrown).toEqual(['', '', '', ''])
    expect(codeGetterReads).toBe(0)
    expect(detailsGetterReads).toBe(0)
    expect(detailsProxyTraps).toBe(0)
    for (const projection of projections) {
      expect(projection.payload).toEqual({
        error: 'MCP 章节生成失败',
        error_code: 'MCP_GENERATION_FAILED',
        pipeline: [],
      })
      expect(JSON.stringify(projection)).not.toContain('PRIVATE_')
    }
  })

  test('does not invoke stage accessors or proxies during strict progress projection', () => {
    const getterSecret = 'PRIVATE_STAGE_GETTER_REMOTE_TEXT'
    const proxySecret = 'PRIVATE_STAGE_PROXY_REMOTE_TEXT'
    let stageGetterReads = 0
    let stageProxyTraps = 0
    const getterStage: any = {}
    Object.defineProperty(getterStage, 'key', {
      enumerable: true,
      get() {
        stageGetterReads += 1
        throw new Error(getterSecret)
      },
    })
    const proxyStage = new Proxy({}, {
      get() {
        stageProxyTraps += 1
        throw new Error(proxySecret)
      },
      getOwnPropertyDescriptor() {
        stageProxyTraps += 1
        throw new Error(proxySecret)
      },
    })
    const revokedStage = Proxy.revocable({}, {})
    revokedStage.revoke()
    const projections = [getterStage, proxyStage, revokedStage.proxy].map(stage => {
      try {
        return { stage: compactStandaloneProseProgressStage(stage, { mcpTask: true }) }
      } catch (error) {
        return { error }
      }
    })
    const thrown = projections.map(item => item.error ? String(item.error) : '')

    expect(thrown).toEqual(['', '', ''])
    expect(stageGetterReads).toBe(0)
    expect(stageProxyTraps).toBe(0)
    for (const projection of projections) {
      expect(projection.stage).toEqual({ label: 'MCP 阶段' })
      expect(JSON.stringify(projection)).not.toContain('PRIVATE_')
    }
  })

  test('does not invoke pipeline element accessors or proxies during strict error projection', () => {
    const getterSecret = 'PRIVATE_PIPELINE_GETTER_REMOTE_TEXT'
    const proxySecret = 'PRIVATE_PIPELINE_PROXY_REMOTE_TEXT'
    let pipelineGetterReads = 0
    let pipelineProxyTraps = 0
    const getterElement: any = {}
    Object.defineProperty(getterElement, 'stage', {
      enumerable: true,
      get() {
        pipelineGetterReads += 1
        throw new Error(getterSecret)
      },
    })
    const proxyElement = new Proxy({}, {
      get() {
        pipelineProxyTraps += 1
        throw new Error(proxySecret)
      },
      getOwnPropertyDescriptor() {
        pipelineProxyTraps += 1
        throw new Error(proxySecret)
      },
    })
    const revokedElement = Proxy.revocable({}, {})
    revokedElement.revoke()
    const projections = [[getterElement], [proxyElement], [revokedElement.proxy]].map(pipeline => {
      try {
        return {
          payload: buildStandaloneProseServiceErrorPayload(
            { code: 'MCP_SESSION_FAILED' },
            pipeline,
            {},
            {},
            { mcpTask: true },
          ),
        }
      } catch (error) {
        return { error }
      }
    })
    const thrown = projections.map(item => item.error ? String(item.error) : '')

    expect(thrown).toEqual(['', '', ''])
    expect(pipelineGetterReads).toBe(0)
    expect(pipelineProxyTraps).toBe(0)
    for (const projection of projections) {
      expect(projection.payload).toEqual({
        error: 'MCP 章节生成失败',
        error_code: 'MCP_GENERATION_FAILED',
        pipeline: [],
      })
      expect(JSON.stringify(projection)).not.toContain('PRIVATE_')
    }
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
      { code: 'PROSE_GENERATION_FAILED', message: '正文生成失败' },
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
      { code: 'PROSE_GENERATION_FAILED', message: '正文生成失败' },
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

  test('scrubs credentials from non-MCP blocked-invalid recovery payloads', () => {
    const reflectedKey = 'sk_' + 'test_builder_reflection'
    const reflectedHeader = 'synthetic-builder-header-value'
    const residualText = '受保护的终止残余正文。'.repeat(40)
    const pipeline = [{ stage: 'mcp_session_wait', status: 'failed', agent_id: 'agent-1' }]
    const configSnapshot = { generation_source: 'model', provider_id: 17 }
    const payload = buildStandaloneProseServiceErrorPayload({
      code: 'PROSE_ADMISSION_BLOCKED_INVALID',
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
          source: 'model',
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
      error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
      admission_status: 'blocked_invalid',
      chapter_id: 91,
      chapter_no: 12,
      chapter_text: residualText,
      finalText: residualText,
      details: {
        chapter_text: residualText,
        receipt: { source: 'model' },
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
      code: 'PROSE_ADMISSION_BLOCKED_INVALID',
      message: `Authorization: Bearer ${unrelatedSecret}`,
      admission_status: 'blocked_invalid',
      details: {
        chapterText: residualText,
        unrelated: `Cookie: session=synthetic-unrelated-builder-cookie`,
        nested: { authorization: unrelatedSecret, safe: 'keep-nested' },
        safe: 'keep-details',
      },
    }, [{ stage: 'review', status: 'failed' }], { generation_source: 'model' }, {
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
