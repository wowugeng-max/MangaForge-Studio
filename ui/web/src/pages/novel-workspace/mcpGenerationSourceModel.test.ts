import { describe, expect, test } from 'bun:test'
import {
  bindingFingerprint,
  buildSourcePayload,
  canSaveGenerationSource,
  filterKeysForServer,
  isCompleteMcpSource,
  sourceFormFromConfig,
} from './mcpGenerationSourceModel'
import * as generationSourceModel from './mcpGenerationSourceModel'

describe('project MCP generation source model', () => {
  test('formats stable MCP generation failures without suggesting a model fallback', () => {
    const formatMcpGenerationFailure = Reflect.get(generationSourceModel, 'formatMcpGenerationFailure')
    expect(typeof formatMcpGenerationFailure).toBe('function')
    if (typeof formatMcpGenerationFailure !== 'function') return
    const cases = [
      [{ error_code: 'MCP_BINDING_CHANGED', error: 'binding changed' }, '正文来源已变更'],
      [{ error_code: 'MCP_AGENT_BUSY', error: 'busy' }, '仍在处理'],
      [{ error_code: 'MCP_SEND_UNKNOWN', error: 'unknown send', receipt_status: 'send_unknown' }, '不要重新发送'],
      [{ error_code: 'MCP_AGENT_QUARANTINED', error: 'quarantined' }, '连接诊断'],
      [{ error_code: 'MCP_CANCELLED', error: 'cancelled', receipt_status: 'remote_cancel_unknown' }, '远端可能仍在运行'],
      [{ error_code: 'MCP_GENERATION_TIMEOUT', error: 'timeout', receipt_status: 'remote_cancel_unknown' }, '远端可能仍在运行'],
    ] as const
    for (const [payload, expected] of cases) {
      const formatted = formatMcpGenerationFailure(payload)
      expect(formatted).toContain(expected)
      expect(formatted).not.toContain('切换模型')
      expect(formatted).not.toContain('自动重试')
    }
    expect(formatMcpGenerationFailure({ error_code: 'UNKNOWN', error: '原始失败消息' })).toBe('原始失败消息')
    expect(formatMcpGenerationFailure({ message: 'fallback message' })).toBe('fallback message')
  })

  test('prioritizes authoritative receipt safety across MCP failure codes', () => {
    const formatMcpGenerationFailure = Reflect.get(generationSourceModel, 'formatMcpGenerationFailure')
    expect(typeof formatMcpGenerationFailure).toBe('function')
    if (typeof formatMcpGenerationFailure !== 'function') return

    const remoteCancelUnknown = formatMcpGenerationFailure({
      error_code: 'MCP_SESSION_FAILED',
      error: '远端 Session 失败',
      receipt_status: 'remote_cancel_unknown',
    })
    expect(remoteCancelUnknown).toContain('远端可能仍在运行')
    expect(remoteCancelUnknown).toContain('MCP Services')

    const sendUnknown = formatMcpGenerationFailure({
      error_code: 'MCP_STORE_IO_FAILED',
      error: '本地存储失败',
      receipt_status: 'send_unknown',
    })
    expect(sendUnknown).toContain('不要重新发送')
    expect(sendUnknown).toContain('MCP Services')

    expect(formatMcpGenerationFailure({
      error_code: 'MCP_SESSION_FAILED',
      error: '原始失败消息',
      receipt_status: 'remote_status_untrusted',
    })).toBe('原始失败消息')
  })

  test('builds a provider-neutral MCP binding payload without an active source record', () => {
    expect(buildSourcePayload({ type: 'mcp', serverId: 'buda', keyId: 3, adapterId: 'buda', agentId: 'agent_1' })).toEqual({
      mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent_1', model: '' },
    })
    const payload = buildSourcePayload({
      type: 'mcp',
      serverId: 'buda',
      keyId: 3,
      adapterId: 'buda',
      agentId: 'agent_1',
      model: '  model-x  ',
    })
    expect(payload).toEqual({
      mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent_1', model: 'model-x' },
    })
    expect(payload).not.toHaveProperty('source')
    expect(payload).not.toHaveProperty('active')
  })

  test('requires a complete tested binding before MCP save', () => {
    const form = { type: 'mcp' as const, serverId: 'buda', keyId: 3, adapterId: 'buda', agentId: 'agent_1', model: '' }
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

  test('hydrates saved bindings without exposing a temporary model override helper', () => {
    expect(sourceFormFromConfig({
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: 8, adapter_id: 'buda', agent_id: 'agent-x' },
    })).toEqual({ type: 'mcp', serverId: 'buda', keyId: 8, adapterId: 'buda', agentId: 'agent-x', model: '' })
    expect(sourceFormFromConfig({
      type: 'mcp',
      mcp: { server_id: 'buda', key_id: 8, adapter_id: 'buda', agent_id: 'agent-x', model: ' model-x ' },
    })).toMatchObject({ model: 'model-x' })
    expect(sourceFormFromConfig(undefined)).toEqual({ type: 'model', serverId: '', keyId: 0, adapterId: '', agentId: '', model: '' })
    expect(Reflect.get(generationSourceModel, 'buildTemporaryModelOverride')).toBeUndefined()
  })

  test('includes the Buda model in the tested binding identity', () => {
    const form = {
      type: 'mcp' as const,
      serverId: 'buda',
      keyId: 3,
      adapterId: 'buda',
      agentId: 'agent_1',
    }
    expect(bindingFingerprint({ ...form, model: 'model-y' }))
      .not.toBe(bindingFingerprint({ ...form, model: 'model-x' }))
    expect(bindingFingerprint({ ...form, model: '  model-x  ' }))
      .toBe(bindingFingerprint({ ...form, model: 'model-x' }))
  })

  test('builds immutable generic reference-config write payloads without dedicated sources', async () => {
    const model = await import('./mcpGenerationSourceModel')
    const buildGenericReferenceConfigWritePayload = Reflect.get(model, 'buildGenericReferenceConfigWritePayload')
    expect(typeof buildGenericReferenceConfigWritePayload).toBe('function')
    if (typeof buildGenericReferenceConfigWritePayload !== 'function') return

    const sources = [
      { version: 'prose_generation_source_v1', type: 'model' },
      {
        version: 'prose_generation_source_v1',
        type: 'mcp',
        mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent_1' },
      },
    ]
    for (const proseGenerationSource of sources) {
      const referenceConfig = {
        references: [{ project_title: '星海边境', weight: 0.8 }],
        notes: '保留参考备注',
        writing_bible: { reader_promise: '每章推进边境谜案' },
        prose_generation_source: proseGenerationSource,
        chapter_generation_source: {
          version: 'chapter_generation_source_v1',
          active: 'model',
          model: { model_id: 217 },
        },
      }
      const originalSnapshot = structuredClone(referenceConfig)

      const payload = buildGenericReferenceConfigWritePayload(referenceConfig)

      expect(payload).not.toBe(referenceConfig)
      expect(Object.prototype.hasOwnProperty.call(payload, 'prose_generation_source')).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(payload, 'chapter_generation_source')).toBe(false)
      expect(payload).toEqual({
        references: referenceConfig.references,
        notes: referenceConfig.notes,
        writing_bible: referenceConfig.writing_bible,
      })
      expect(referenceConfig).toEqual(originalSnapshot)
      expect(Object.prototype.hasOwnProperty.call(referenceConfig, 'prose_generation_source')).toBe(true)
      expect(Object.prototype.hasOwnProperty.call(referenceConfig, 'chapter_generation_source')).toBe(true)
    }

    const inheritedSourceConfig = Object.assign(
      Object.create(Object.defineProperties({}, {
        prose_generation_source: {
          get: () => { throw new Error('inherited prose source must not be read') },
        },
        chapter_generation_source: {
          get: () => { throw new Error('inherited chapter source must not be read') },
        },
      })),
      { notes: '只保留 own 字段' },
    )
    expect(buildGenericReferenceConfigWritePayload(inheritedSourceConfig)).toEqual({ notes: '只保留 own 字段' })
  })

  test('omits dedicated accessors without reading them and safely preserves other own keys', async () => {
    const model = await import('./mcpGenerationSourceModel')
    const buildGenericReferenceConfigWritePayload = Reflect.get(model, 'buildGenericReferenceConfigWritePayload')
    expect(typeof buildGenericReferenceConfigWritePayload).toBe('function')
    if (typeof buildGenericReferenceConfigWritePayload !== 'function') return
    const symbolKey = Symbol('reference-config-symbol')
    let sourceGetterReads = 0
    const referenceConfig: Record<PropertyKey, unknown> = { notes: '保留普通字段' }
    referenceConfig[symbolKey] = '保留 symbol'
    Object.defineProperty(referenceConfig, '__proto__', {
      configurable: true,
      enumerable: true,
      value: '安全的 own __proto__',
      writable: true,
    })
    for (const field of ['prose_generation_source', 'chapter_generation_source']) {
      Object.defineProperty(referenceConfig, field, {
        configurable: true,
        enumerable: true,
        get() {
          sourceGetterReads += 1
          throw new Error(`${field} accessor must not run`)
        },
      })
    }

    const payload = buildGenericReferenceConfigWritePayload(referenceConfig)

    expect(sourceGetterReads).toBe(0)
    expect(payload).not.toBe(referenceConfig)
    expect(payload.notes).toBe('保留普通字段')
    expect(payload[symbolKey]).toBe('保留 symbol')
    expect(Object.prototype.hasOwnProperty.call(payload, '__proto__')).toBe(true)
    expect(payload.__proto__).toBe('安全的 own __proto__')
    expect(Object.getPrototypeOf(payload)).toBe(Object.prototype)
    expect(Object.prototype.hasOwnProperty.call(payload, 'prose_generation_source')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(payload, 'chapter_generation_source')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(referenceConfig, 'prose_generation_source')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(referenceConfig, 'chapter_generation_source')).toBe(true)
  })

  test('fails closed with a stable message when Proxy key or descriptor inspection fails', async () => {
    const model = await import('./mcpGenerationSourceModel')
    const buildGenericReferenceConfigWritePayload = Reflect.get(model, 'buildGenericReferenceConfigWritePayload')
    expect(typeof buildGenericReferenceConfigWritePayload).toBe('function')
    if (typeof buildGenericReferenceConfigWritePayload !== 'function') return
    const trapMessage = 'synthetic private reference config trap'
    const ownKeysProxy = new Proxy({}, {
      ownKeys() {
        throw new Error(trapMessage)
      },
    })
    const descriptorProxy = new Proxy({ notes: '保留' }, {
      getOwnPropertyDescriptor() {
        throw new Error(trapMessage)
      },
    })

    for (const value of [ownKeysProxy, descriptorProxy]) {
      let failure: unknown
      try {
        buildGenericReferenceConfigWritePayload(value)
      } catch (error) {
        failure = error
      }
      expect(failure).toBeInstanceOf(Error)
      expect(String((failure as Error).message)).toBe('无法安全读取通用参考配置')
      expect(String((failure as Error).message)).not.toContain(trapMessage)
    }
  })

  test('wires both generic reference-config saves through the dedicated-source omission helper', async () => {
    const modalSource = await Bun.file(new URL('./ReferenceConfigModal.tsx', import.meta.url)).text()
    const modalSaveStart = modalSource.indexOf('  const save = async () => {')
    const modalSaveEnd = modalSource.indexOf('  const loadPreview = async () => {', modalSaveStart)
    const modalSave = modalSource.slice(modalSaveStart, modalSaveEnd)
    expect(modalSource).toContain("import { buildGenericReferenceConfigWritePayload } from './mcpGenerationSourceModel'")
    expect(modalSave).toContain('const referenceConfigWritePayload = buildGenericReferenceConfigWritePayload(nextConfig)')
    expect(modalSave).toContain('apiClient.put(`/novel/projects/${projectId}/reference-config`, referenceConfigWritePayload)')
    expect(modalSave).toContain('onSaved(res.data || nextConfig)')

    const handlersSource = await Bun.file(new URL('./shell/workspace-writing-bible-handlers.tsx', import.meta.url)).text()
    const bibleSaveStart = handlersSource.indexOf('  const saveWritingBibleEditor = async () => {')
    const bibleSaveEnd = handlersSource.indexOf('  const openStoryStateEditor = async () => {', bibleSaveStart)
    const bibleSave = handlersSource.slice(bibleSaveStart, bibleSaveEnd)
    expect(handlersSource).toContain("import { buildGenericReferenceConfigWritePayload } from '../mcpGenerationSourceModel'")
    expect(bibleSave).toContain('const referenceConfigWritePayload = buildGenericReferenceConfigWritePayload(nextReferenceConfig)')
    expect(bibleSave).toContain('apiClient.put(`/novel/projects/${projectId}/reference-config`, referenceConfigWritePayload)')
    expect(bibleSave).toContain('configRes.data || nextReferenceConfig')
  })
})
