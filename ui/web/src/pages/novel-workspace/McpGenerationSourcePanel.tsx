import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Divider, Empty, Input, Popconfirm, Select, Space, Spin, Tag, Tooltip, Typography, message } from 'antd'
import { CheckCircleOutlined, ReloadOutlined, RobotOutlined, SaveOutlined } from '@ant-design/icons'
import {
  CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS,
  chapterSourceApi,
  mcpApi,
  type ChapterSourceRequestOptions,
  type ChapterGenerationSourceState,
  type McpAgentSummary,
  type McpPublicKey,
  type McpServerRecord,
} from '../../api/mcp'
import {
  authorityUnknownState,
  commitConfirmedSource,
  confirmedAuthorityState,
  formatChapterSourceFailure,
  isChapterSourceAuthorityUnknownError,
  isStaleChapterSourceOperationError,
  type ChapterSourceAuthorityState,
  type ChapterSourceOperationToken,
} from './chapterGenerationSourceModel'
import {
  bindingFingerprint,
  buildSourcePayload,
  canSaveGenerationSource,
  filterKeysForServer,
  type GenerationSourceForm,
} from './mcpGenerationSourceModel'
import {
  CHAPTER_SOURCE_AUTHORITY_UNKNOWN_MESSAGE,
  CHAPTER_SOURCE_BUSY_MESSAGE,
} from './ChapterGenerationSourceControl'

const { Text } = Typography
type McpBinding = NonNullable<ChapterGenerationSourceState['mcp']>

type PanelApi = Pick<typeof chapterSourceApi, 'get' | 'testMcp' | 'saveMcp'>

type CreateMcpAgentInput = {
  request: (options: ChapterSourceRequestOptions) => Promise<{ id: string }>
  onStarted?: () => void
  refreshAgents: (agentId: string) => Promise<boolean>
  onAgentConfirmed: (agentId: string) => void
}

const staleMcpPanelLifecycleErrors = new WeakSet<object>()

class StaleMcpPanelLifecycleError extends Error {
  constructor() {
    super('MCP panel lifecycle is stale')
    staleMcpPanelLifecycleErrors.add(this)
  }
}

function isStaleMcpPanelLifecycleError(error: unknown) {
  return Boolean(error)
    && (typeof error === 'object' || typeof error === 'function')
    && staleMcpPanelLifecycleErrors.has(error as object)
}

function isStalePanelOperationError(error: unknown) {
  return isStaleChapterSourceOperationError(error) || isStaleMcpPanelLifecycleError(error)
}

export function createMcpPanelRequestGate() {
  let current: AbortController | null = null
  return {
    begin() {
      current?.abort()
      current = new AbortController()
      return current
    },
    isCurrent(controller: AbortController) {
      return current === controller && !controller.signal.aborted
    },
    finish(controller: AbortController) {
      if (current === controller) current = null
    },
    invalidate() {
      current?.abort()
      current = null
    },
  }
}

export function createMcpPanelLifecycleGate() {
  let mounted = true
  let epoch = 0
  let controller = new AbortController()
  const rejectStale = (): never => { throw new StaleMcpPanelLifecycleError() }
  const tokenValue = (value: number | { token: number }) => typeof value === 'number' ? value : value.token
  const renewController = () => {
    controller.abort()
    controller = new AbortController()
  }
  return {
    mount() {
      mounted = true
      epoch += 1
      renewController()
    },
    begin() {
      if (!mounted) rejectStale()
      return Object.freeze({ token: epoch, signal: controller.signal })
    },
    assertCurrent(token: number | { token: number }) {
      if (!mounted || tokenValue(token) !== epoch) rejectStale()
    },
    isCurrent(token: number | { token: number }) {
      return mounted && tokenValue(token) === epoch
    },
    invalidate() {
      epoch += 1
      renewController()
    },
    unmount() {
      controller.abort()
      mounted = false
      epoch += 1
    },
  }
}

type McpPanelLifecycleToken = number | Readonly<{ token: number; signal: AbortSignal }>

export type McpGenerationSourcePanelActionDependencies = {
  projectId: number
  getAuthority: () => ChapterSourceAuthorityState
  beginSourceOperation: () => ChapterSourceOperationToken
  assertSourceOperationCurrent: (token: ChapterSourceOperationToken) => void
  beginPanelLifecycle?: () => McpPanelLifecycleToken
  assertPanelLifecycleCurrent?: (token: McpPanelLifecycleToken) => void
  onAuthorityChange: (state: ChapterSourceAuthorityState) => void
  onTestedFingerprintChange: (fingerprint: string) => void
  onPendingChange: (pending: boolean, token: ChapterSourceOperationToken) => void
  notifySuccess: (text: string) => void
  notifyError: (text: string) => void
  api?: Partial<PanelApi>
}

type McpPanelOperation = {
  sourceToken: ChapterSourceOperationToken
  lifecycleToken: McpPanelLifecycleToken
  lifecycleSignal?: AbortSignal
}

function assertPanelCurrent(
  deps: McpGenerationSourcePanelActionDependencies,
  operation: McpPanelOperation,
  effect: () => void,
) {
  deps.assertSourceOperationCurrent(operation.sourceToken)
  deps.assertPanelLifecycleCurrent?.(operation.lifecycleToken)
  effect()
}

function assertSourceCurrent(
  deps: McpGenerationSourcePanelActionDependencies,
  operation: McpPanelOperation,
  effect: () => void,
) {
  deps.assertSourceOperationCurrent(operation.sourceToken)
  effect()
}

function tryPanelCurrent(
  deps: McpGenerationSourcePanelActionDependencies,
  operation: McpPanelOperation,
  effect: () => void,
) {
  try {
    assertPanelCurrent(deps, operation, effect)
    return true
  } catch (error) {
    if (isStalePanelOperationError(error)) return false
    throw error
  }
}

function beginCurrentPanelOperation(deps: McpGenerationSourcePanelActionDependencies) {
  try {
    const lifecycleToken = deps.beginPanelLifecycle?.() ?? 0
    const operation = {
      sourceToken: deps.beginSourceOperation(),
      lifecycleToken,
      lifecycleSignal: typeof lifecycleToken === 'number' ? undefined : lifecycleToken.signal,
    }
    assertPanelCurrent(deps, operation, () => {})
    return operation
  } catch (error) {
    if (isStalePanelOperationError(error)) return null
    throw error
  }
}

export function createMcpGenerationSourcePanelActions(
  deps: McpGenerationSourcePanelActionDependencies,
) {
  const api: PanelApi = {
    get: deps.api?.get || chapterSourceApi.get,
    testMcp: deps.api?.testMcp || chapterSourceApi.testMcp,
    saveMcp: deps.api?.saveMcp || chapterSourceApi.saveMcp,
  }
  const finishPending = (operation: McpPanelOperation) => {
    try {
      deps.assertSourceOperationCurrent(operation.sourceToken)
      deps.onPendingChange(false, operation.sourceToken)
    } catch (error) {
      if (!isStaleChapterSourceOperationError(error)) throw error
    }
  }

  return {
    async createAgent(input: CreateMcpAgentInput) {
      const operation = beginCurrentPanelOperation(deps)
      if (!operation) return
      assertPanelCurrent(deps, operation, () => deps.onPendingChange(true, operation.sourceToken))
      assertPanelCurrent(deps, operation, () => input.onStarted?.())
      try {
        const agent = await input.request({
          signal: operation.lifecycleSignal,
          timeout: CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS,
        })
        assertPanelCurrent(deps, operation, () => {})
        const refreshCurrent = await input.refreshAgents(agent.id)
        assertPanelCurrent(deps, operation, () => {})
        if (!refreshCurrent) return
        assertPanelCurrent(deps, operation, () => input.onAgentConfirmed(agent.id))
        assertPanelCurrent(deps, operation, () => deps.notifySuccess('MangaForge Agent 已创建，请测试后保存绑定'))
      } catch (error) {
        if (isStalePanelOperationError(error)) return
        try {
          assertPanelCurrent(deps, operation, () => {})
        } catch (staleError) {
          if (isStalePanelOperationError(staleError)) return
          throw staleError
        }
        assertPanelCurrent(deps, operation, () => deps.notifyError('Agent 创建失败'))
      } finally {
        finishPending(operation)
      }
    },
    async testBinding(mcp: McpBinding, fingerprint: string) {
      const operation = beginCurrentPanelOperation(deps)
      if (!operation) return
      assertPanelCurrent(deps, operation, () => deps.onPendingChange(true, operation.sourceToken))
      try {
        await api.testMcp(deps.projectId, mcp, {
          signal: operation.lifecycleSignal,
          timeout: CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS,
        })
        assertPanelCurrent(deps, operation, () => deps.onTestedFingerprintChange(fingerprint))
        assertPanelCurrent(deps, operation, () => deps.notifySuccess('MCP 绑定测试通过'))
      } catch (error) {
        if (isStalePanelOperationError(error)) return
        try {
          assertPanelCurrent(deps, operation, () => {})
        } catch (staleError) {
          if (isStalePanelOperationError(staleError)) return
          throw staleError
        }
        assertPanelCurrent(deps, operation, () => deps.onTestedFingerprintChange(''))
        assertPanelCurrent(deps, operation, () => deps.notifyError('MCP 绑定测试失败'))
      } finally {
        finishPending(operation)
      }
    },
    async saveBinding(mcp: McpBinding) {
      const current = deps.getAuthority()
      if (!current.source || current.authorityUnknown) return
      const operationProjectId = deps.projectId
      const operation = beginCurrentPanelOperation(deps)
      if (!operation) return
      assertPanelCurrent(deps, operation, () => deps.onPendingChange(true, operation.sourceToken))
      try {
        const result = await commitConfirmedSource({
          current: current.source,
          request: () => api.saveMcp(operationProjectId, mcp, { timeout: CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS }),
          readAuthoritative: () => api.get(operationProjectId, { timeout: CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS }),
          assertCurrent: () => assertSourceCurrent(deps, operation, () => {}),
        })
        assertSourceCurrent(deps, operation, () => deps.onAuthorityChange(confirmedAuthorityState(result.source)))
        tryPanelCurrent(deps, operation, () => deps.notifySuccess('MCP 绑定已保存；章节来源保持不变'))
      } catch (error) {
        if (isStaleChapterSourceOperationError(error)) return
        try {
          assertSourceCurrent(deps, operation, () => {})
        } catch (staleError) {
          if (isStaleChapterSourceOperationError(staleError)) return
          throw staleError
        }
        if (isChapterSourceAuthorityUnknownError(error)) {
          assertSourceCurrent(deps, operation, () => deps.onAuthorityChange(authorityUnknownState(current.source!, error)))
          tryPanelCurrent(deps, operation, () => deps.notifyError(CHAPTER_SOURCE_AUTHORITY_UNKNOWN_MESSAGE))
          return
        }
        const publicMessage = formatChapterSourceFailure(error)
        tryPanelCurrent(deps, operation, () => deps.notifyError(publicMessage))
      } finally {
        finishPending(operation)
      }
    },
  }
}

type McpBindingControlsAvailabilityInput = {
  authority: ChapterSourceAuthorityState
  locallyBusy: boolean
  pending: boolean
  agentLoading?: boolean
}

export function mcpBindingControlsAvailability({
  authority,
  locallyBusy,
  pending,
  agentLoading = false,
}: McpBindingControlsAvailabilityInput) {
  if (authority.authorityUnknown) {
    return { disabled: true, reason: CHAPTER_SOURCE_AUTHORITY_UNKNOWN_MESSAGE }
  }
  if (!authority.source) {
    return { disabled: true, reason: '章节来源加载失败，请重新加载项目' }
  }
  if (authority.source.locked || locallyBusy || pending || agentLoading) {
    return { disabled: true, reason: CHAPTER_SOURCE_BUSY_MESSAGE }
  }
  return { disabled: false, reason: '' }
}

export function mcpBindingControlsDisabled(input: McpBindingControlsAvailabilityInput) {
  return mcpBindingControlsAvailability(input).disabled
}

function formFromAuthority(authority: ChapterSourceAuthorityState): Required<GenerationSourceForm> {
  const mcp = authority.source?.source.mcp
  return {
    type: 'mcp',
    serverId: String(mcp?.server_id || ''),
    keyId: Number(mcp?.key_id || 0),
    adapterId: String(mcp?.adapter_id || ''),
    agentId: String(mcp?.agent_id || ''),
    model: String(mcp?.model || '').trim(),
  }
}

export type McpGenerationSourcePanelProps = {
  open: boolean
  projectId: number
  authority: ChapterSourceAuthorityState
  locallyBusy: boolean
  beginSourceOperation: () => ChapterSourceOperationToken
  assertSourceOperationCurrent: (token: ChapterSourceOperationToken) => void
  onAuthorityChange: (state: ChapterSourceAuthorityState) => void
  pending: boolean
  onPendingChange: (pending: boolean, token: ChapterSourceOperationToken) => void
}

export function McpGenerationSourcePanel({
  open,
  projectId,
  authority,
  locallyBusy,
  beginSourceOperation,
  assertSourceOperationCurrent,
  onAuthorityChange,
  pending: controlledPending,
  onPendingChange,
}: McpGenerationSourcePanelProps) {
  const projectIdRef = useRef(projectId)
  projectIdRef.current = projectId
  const metadataGateRef = useRef<ReturnType<typeof createMcpPanelRequestGate> | null>(null)
  if (!metadataGateRef.current) metadataGateRef.current = createMcpPanelRequestGate()
  const lifecycleGateRef = useRef<ReturnType<typeof createMcpPanelLifecycleGate> | null>(null)
  if (!lifecycleGateRef.current) lifecycleGateRef.current = createMcpPanelLifecycleGate()
  const [servers, setServers] = useState<McpServerRecord[]>([])
  const [keys, setKeys] = useState<McpPublicKey[]>([])
  const [agents, setAgents] = useState<McpAgentSummary[]>([])
  const [form, setForm] = useState<Required<GenerationSourceForm>>(() => formFromAuthority(authority))
  const [testedFingerprint, setTestedFingerprint] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentLoading, setAgentLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [bindingError, setBindingError] = useState('')
  const [agentName, setAgentName] = useState('MangaForge 小说正文 Agent')
  const [spaceId, setSpaceId] = useState('')
  const pending = controlledPending
  const controlsAvailability = mcpBindingControlsAvailability({ authority, locallyBusy, pending, agentLoading })
  const controlsDisabled = controlsAvailability.disabled
  const selectedServer = servers.find(server => server.id === form.serverId)
  const availableKeys = useMemo(() => filterKeysForServer(keys, form.serverId), [keys, form.serverId])
  const canSave = canSaveGenerationSource(form, testedFingerprint)
  const authorityBindingIdentity = authority.source?.source.mcp
    ? bindingFingerprint(formFromAuthority(authority))
    : ''
  const authorityBindingIdentityRef = useRef(authorityBindingIdentity)
  authorityBindingIdentityRef.current = authorityBindingIdentity
  const agentBindingIdentity = `${projectId}:${form.serverId}:${form.keyId}`
  const agentBindingIdentityRef = useRef(agentBindingIdentity)
  agentBindingIdentityRef.current = agentBindingIdentity

  const actions = createMcpGenerationSourcePanelActions({
    projectId,
    getAuthority: () => authority,
    beginSourceOperation,
    assertSourceOperationCurrent,
    beginPanelLifecycle: () => lifecycleGateRef.current!.begin(),
    assertPanelLifecycleCurrent: token => lifecycleGateRef.current!.assertCurrent(token),
    onAuthorityChange,
    onTestedFingerprintChange: setTestedFingerprint,
    onPendingChange,
    notifySuccess: text => message.success(text),
    notifyError: setBindingError,
  })

  const updateForm = (patch: Partial<Required<GenerationSourceForm>>) => {
    setForm(current => ({ ...current, ...patch, type: 'mcp' }))
    setTestedFingerprint('')
    setBindingError('')
  }

  const fetchAgents = async (serverId: string, keyId: number, preserveAgentId = '') => {
    const operationProjectId = projectId
    const operationBindingIdentity = `${operationProjectId}:${serverId}:${keyId}`
    let lifecycleToken: number
    try {
      lifecycleToken = lifecycleGateRef.current!.begin()
    } catch (error) {
      if (isStaleMcpPanelLifecycleError(error)) return false
      throw error
    }
    const request = metadataGateRef.current!.begin()
    const requestCurrent = () => lifecycleGateRef.current!.isCurrent(lifecycleToken)
      && metadataGateRef.current!.isCurrent(request)
      && projectIdRef.current === operationProjectId
      && agentBindingIdentityRef.current === operationBindingIdentity
    if (!serverId || !keyId) {
      if (requestCurrent()) {
        setAgents([])
        metadataGateRef.current!.finish(request)
      }
      return true
    }
    setAgentLoading(true)
    try {
      const { data } = await mcpApi.listProjectAgents(operationProjectId, serverId, keyId, {
        signal: request.signal,
        timeout: CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS,
      })
      if (!requestCurrent()) return false
      setAgents(data.agents || [])
      if (preserveAgentId && !(data.agents || []).some(agent => agent.id === preserveAgentId)) {
        setBindingError('已保存的 Agent 当前不可见，请刷新账号或重新选择。')
      }
      return true
    } catch {
      if (!requestCurrent()) return false
      setAgents([])
      setBindingError('Agent 列表加载失败')
      return true
    } finally {
      if (requestCurrent()) {
        setAgentLoading(false)
        metadataGateRef.current!.finish(request)
      }
    }
  }

  useEffect(() => {
    lifecycleGateRef.current!.mount()
    return () => {
      lifecycleGateRef.current?.unmount()
      metadataGateRef.current?.invalidate()
    }
  }, [])

  useEffect(() => {
    if (!open) lifecycleGateRef.current!.invalidate()
  }, [open])

  useEffect(() => {
    metadataGateRef.current!.invalidate()
    setLoading(false)
    setAgentLoading(false)
    setServers([])
    setKeys([])
    setAgents([])
    if (!open || !projectId || locallyBusy) return
    const request = metadataGateRef.current!.begin()
    setLoading(true)
    setLoadError('')
    setBindingError('')
    setTestedFingerprint('')
    const hydrated = formFromAuthority(authority)
    const operationProjectId = projectId
    const operationBindingIdentity = authorityBindingIdentity
    setForm(hydrated)
    const requestOptions = {
      signal: request.signal,
      timeout: CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS,
    }
    void Promise.all([mcpApi.listServers(requestOptions), mcpApi.listKeys(requestOptions)]).then(async ([serverResponse, keyResponse]) => {
      if (!metadataGateRef.current!.isCurrent(request)
        || projectIdRef.current !== operationProjectId
        || authorityBindingIdentityRef.current !== operationBindingIdentity) return
      setServers(serverResponse.data || [])
      setKeys(keyResponse.data || [])
      if (hydrated.serverId && hydrated.keyId) {
        const agentResponse = await mcpApi.listProjectAgents(
          operationProjectId,
          hydrated.serverId,
          hydrated.keyId,
          requestOptions,
        )
        if (metadataGateRef.current!.isCurrent(request)
          && projectIdRef.current === operationProjectId
          && authorityBindingIdentityRef.current === operationBindingIdentity) setAgents(agentResponse.data.agents || [])
      } else if (metadataGateRef.current!.isCurrent(request)) setAgents([])
    }).catch(() => {
      if (metadataGateRef.current!.isCurrent(request)
        && projectIdRef.current === operationProjectId
        && authorityBindingIdentityRef.current === operationBindingIdentity) setLoadError('MCP 区域加载失败')
    }).finally(() => {
      if (metadataGateRef.current!.isCurrent(request)
        && projectIdRef.current === operationProjectId
        && authorityBindingIdentityRef.current === operationBindingIdentity) {
        setLoading(false)
        metadataGateRef.current!.finish(request)
      }
    })
    return () => { metadataGateRef.current?.invalidate() }
  }, [open, projectId, authorityBindingIdentity, locallyBusy])

  const selectServer = (serverId: string) => {
    const server = servers.find(item => item.id === serverId)
    metadataGateRef.current!.invalidate()
    setAgentLoading(false)
    agentBindingIdentityRef.current = `${projectId}:${serverId}:0`
    updateForm({ serverId, adapterId: server?.adapter_id || '', keyId: 0, agentId: '' })
    setAgents([])
  }
  const selectKey = (keyId: number) => {
    agentBindingIdentityRef.current = `${projectId}:${form.serverId}:${keyId}`
    updateForm({ keyId, agentId: '' })
    void fetchAgents(form.serverId, keyId)
  }
  const testBinding = async () => {
    if (controlsDisabled) return
    const { mcp } = buildSourcePayload(form)
    await actions.testBinding(mcp, bindingFingerprint(form))
  }
  const save = async () => {
    if (!canSave || controlsDisabled) return
    const { mcp } = buildSourcePayload(form)
    await actions.saveBinding(mcp)
  }
  const createAgent = async () => {
    if (!form.serverId || !form.keyId || !agentName.trim() || controlsDisabled) return
    const operationProjectId = projectId
    const operationServerId = form.serverId
    const operationKeyId = form.keyId
    const operationName = agentName.trim()
    const operationSpaceId = spaceId.trim()
    await actions.createAgent({
      onStarted: () => setBindingError(''),
      request: async options => {
        const { data } = await mcpApi.createProjectAgent(operationProjectId, {
          server_id: operationServerId,
          key_id: operationKeyId,
          name: operationName,
          ...(operationSpaceId ? { space_id: operationSpaceId } : {}),
        }, options)
        return data.agent
      },
      refreshAgents: agentId => fetchAgents(operationServerId, operationKeyId, agentId),
      onAgentConfirmed: agentId => updateForm({ agentId }),
    })
  }

  if (loading) return <div style={{ padding: 28, textAlign: 'center' }}><Spin /><Text type="secondary" style={{ marginLeft: 8 }}>加载 MCP 绑定...</Text></div>

  return <Card size="small" title="MCP 绑定配置">
    <Tooltip title={controlsAvailability.reason}>
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
      {loadError && <Alert type="error" showIcon message="MCP 区域加载失败" description={loadError} />}
      <Alert type="info" showIcon message="保存绑定不会启用 MCP；章节来源需单独切换" />
      {!servers.length && <Empty description="请先到 MCP Services 添加服务与账号" />}
      <Space wrap align="start">
        <Space direction="vertical" size={4}><Text strong>MCP Server</Text><Select style={{ width: 220 }} value={form.serverId || undefined} disabled={controlsDisabled} onChange={selectServer} options={servers.map(server => ({ value: server.id, label: `${server.display_name} · ${server.adapter_id}`, disabled: !server.is_active }))} /></Space>
        <Space direction="vertical" size={4}><Text strong>MCP 账号</Text><Select style={{ width: 240 }} value={form.keyId || undefined} onChange={selectKey} disabled={controlsDisabled || !form.serverId} options={availableKeys.map(key => ({ value: key.id, label: `${key.description || `账号 ${key.id}`} · ${key.masked_key}` }))} /></Space>
        <Space direction="vertical" size={4}><Text strong>Adapter</Text><Input style={{ width: 150 }} value={form.adapterId || selectedServer?.adapter_id || ''} readOnly disabled={controlsDisabled} /></Space>
      </Space>
      <Space align="end" wrap>
        <Space direction="vertical" size={4}><Text strong>项目专属 Agent</Text><Select loading={agentLoading} style={{ width: 330 }} value={form.agentId || undefined} disabled={controlsDisabled || !form.keyId} onChange={agentId => updateForm({ agentId })} options={agents.map(agent => ({ value: agent.id, label: `${agent.name} (${agent.id})` }))} /></Space>
        <Button icon={<ReloadOutlined />} disabled={controlsDisabled || !form.serverId || !form.keyId} loading={agentLoading} onClick={() => fetchAgents(form.serverId, form.keyId, form.agentId)}>刷新 Agents</Button>
      </Space>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Text strong>Buda 模型</Text>
        <Input
          value={form.model}
          disabled={controlsDisabled}
          onChange={event => updateForm({ model: event.target.value })}
          maxLength={160}
          allowClear
          placeholder="例如：账号支持的模型标识"
          addonBefore={form.model.trim() ? '指定模型' : 'Auto'}
        />
        <Text type="secondary">
          留空即 Auto（Buda / Agent 默认）。Buda 当前未提供模型列表 MCP 工具，请填写账号实际支持的模型标识；无效值会由 Buda 拒绝，不会自动回退。
        </Text>
      </Space>
      <Divider style={{ margin: '4px 0' }} />
      <Text type="secondary">只有在确实需要新 Agent 时执行以下远端操作。免费 Buda 账号通常最多两个 Agent。</Text>
      <Space.Compact style={{ width: '100%' }}><Input disabled={controlsDisabled} value={agentName} onChange={event => setAgentName(event.target.value)} placeholder="Agent 名称" /><Input disabled={controlsDisabled} value={spaceId} onChange={event => setSpaceId(event.target.value)} placeholder="Space ID（需要时填写）" /></Space.Compact>
      <Popconfirm title="确认新建 MangaForge Agent？" description="此操作会修改远端 MCP 服务状态。" onConfirm={createAgent} okText="确认创建" disabled={controlsDisabled}><Button icon={<RobotOutlined />} loading={pending} disabled={controlsDisabled || !form.serverId || !form.keyId}>新建 MangaForge Agent</Button></Popconfirm>
      {bindingError && <Alert type="error" showIcon message="MCP 绑定不可用" description={bindingError} />}
      {testedFingerprint === bindingFingerprint(form) && <Tag color="success" icon={<CheckCircleOutlined />}>当前绑定已测试</Tag>}
      <Space>
        <Button onClick={testBinding} loading={pending} disabled={controlsDisabled || !bindingFingerprint(form)}>测试绑定</Button>
        <Button type="primary" icon={<SaveOutlined />} loading={pending} disabled={controlsDisabled || !canSave} onClick={save}>保存绑定</Button>
      </Space>
      </Space>
    </Tooltip>
  </Card>
}
