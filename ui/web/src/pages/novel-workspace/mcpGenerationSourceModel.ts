import type { McpPublicKey, ProseGenerationSourceConfig } from '../../api/mcp'

export type GenerationSourceForm = {
  type: 'model' | 'mcp'
  serverId?: string
  keyId?: number
  adapterId?: string
  agentId?: string
  model?: string
}

export function formatMcpGenerationFailure(payload: any) {
  const code = String(payload?.error_code || payload?.code || '')
  const fallback = String(payload?.error || payload?.message || '')
  const receiptStatus = payload?.receipt_status
  if (receiptStatus === 'send_unknown') {
    return `${fallback || '正文生成失败'}：发送结果无法确认，请不要重新发送；先到 MCP Services 检查远端状态。`
  }
  if (receiptStatus === 'remote_cancel_unknown') {
    return `${fallback || '正文生成失败'}：远端可能仍在运行，请先到 MCP Services 检查远端状态。`
  }
  if (code === 'MCP_BINDING_CHANGED') {
    return `${fallback || '正文生成失败'}：正文来源已变更，请重新确认项目的 MCP 绑定后再生成。`
  }
  if (code === 'MCP_AGENT_BUSY') {
    return `${fallback || '正文生成失败'}：远端 Agent 仍在处理上一项任务，请稍后再试。`
  }
  if (code === 'MCP_SEND_UNKNOWN') {
    return `${fallback || '正文生成失败'}：发送结果无法确认，请不要重新发送；先到 MCP Services 检查远端状态。`
  }
  if (code === 'MCP_AGENT_QUARANTINED') {
    return `${fallback || '正文生成失败'}：该 Agent 已被安全隔离，请到 MCP Services 执行连接诊断。`
  }
  return fallback
}

export function isCompleteMcpSource(form: GenerationSourceForm) {
  return form.type === 'mcp'
    && Boolean(String(form.serverId || '').trim())
    && Number.isInteger(Number(form.keyId))
    && Number(form.keyId) > 0
    && Boolean(String(form.adapterId || '').trim())
    && Boolean(String(form.agentId || '').trim())
}

export function buildSourcePayload(form: GenerationSourceForm): { source: ProseGenerationSourceConfig } {
  if (form.type === 'model') {
    return { source: { version: 'prose_generation_source_v1', type: 'model' } }
  }
  if (!isCompleteMcpSource(form)) throw new Error('MCP binding is incomplete')
  return {
    source: {
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: {
        server_id: String(form.serverId),
        key_id: Number(form.keyId),
        adapter_id: String(form.adapterId),
        agent_id: String(form.agentId),
        model: String(form.model || '').trim(),
      },
    },
  }
}

export function sourceFormFromConfig(source?: Partial<ProseGenerationSourceConfig> | null): Required<GenerationSourceForm> {
  if (source?.type === 'mcp' && (source as any).mcp) {
    const binding = (source as any).mcp
    return {
      type: 'mcp',
      serverId: String(binding.server_id || ''),
      keyId: Number(binding.key_id || 0),
      adapterId: String(binding.adapter_id || ''),
      agentId: String(binding.agent_id || ''),
      model: String(binding.model || '').trim(),
    }
  }
  return { type: 'model', serverId: '', keyId: 0, adapterId: '', agentId: '', model: '' }
}

export function filterKeysForServer(keys: McpPublicKey[], serverId: string) {
  return keys.filter(key => key.is_active && key.mcp_server_id === serverId)
}

export function bindingFingerprint(form: GenerationSourceForm) {
  if (!isCompleteMcpSource(form)) return ''
  return [form.serverId, Number(form.keyId), form.adapterId, form.agentId, String(form.model || '').trim()].join('\u0000')
}

export function canSaveGenerationSource(form: GenerationSourceForm, testedFingerprint: string) {
  if (form.type === 'model') return true
  const current = bindingFingerprint(form)
  return Boolean(current && current === testedFingerprint)
}

export function buildTemporaryModelOverride() {
  return { generation_source_override: 'model' as const }
}

export function buildGenericReferenceConfigWritePayload<T extends Record<string, unknown>>(
  referenceConfig: T,
): Omit<T, 'prose_generation_source'> {
  const payload = { ...referenceConfig }
  if (Object.prototype.hasOwnProperty.call(referenceConfig, 'prose_generation_source')) {
    delete payload.prose_generation_source
  }
  return payload
}
