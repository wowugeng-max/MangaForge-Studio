import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Divider, Empty, Input, Popconfirm, Radio, Select, Space, Spin, Tag, Typography, message } from 'antd'
import { CheckCircleOutlined, ReloadOutlined, RobotOutlined, SaveOutlined } from '@ant-design/icons'
import { mcpApi, type McpAgentSummary, type McpPublicKey, type McpServerRecord } from '../../api/mcp'
import {
  bindingFingerprint,
  buildSourcePayload,
  canSaveGenerationSource,
  filterKeysForServer,
  sourceFormFromConfig,
  type GenerationSourceForm,
} from './mcpGenerationSourceModel'

const { Text } = Typography

function failureMessage(error: any, fallback: string) {
  return String(error?.response?.data?.error || error?.response?.data?.detail || error?.message || fallback)
}

export function McpGenerationSourcePanel({
  open,
  projectId,
  onSaved,
}: {
  open: boolean
  projectId: number
  onSaved?: () => void
}) {
  const sourceEndpoint = `/novel/projects/${projectId}/prose-generation-source`
  const [servers, setServers] = useState<McpServerRecord[]>([])
  const [keys, setKeys] = useState<McpPublicKey[]>([])
  const [agents, setAgents] = useState<McpAgentSummary[]>([])
  const [form, setForm] = useState<Required<GenerationSourceForm>>(sourceFormFromConfig(null))
  const [testedFingerprint, setTestedFingerprint] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentLoading, setAgentLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creatingAgent, setCreatingAgent] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [bindingError, setBindingError] = useState('')
  const [agentName, setAgentName] = useState('MangaForge 小说正文 Agent')
  const [spaceId, setSpaceId] = useState('')

  const selectedServer = servers.find(server => server.id === form.serverId)
  const availableKeys = useMemo(() => filterKeysForServer(keys, form.serverId), [keys, form.serverId])
  const canSave = canSaveGenerationSource(form, testedFingerprint)

  const updateForm = (patch: Partial<Required<GenerationSourceForm>>) => {
    setForm(current => ({ ...current, ...patch }))
    setTestedFingerprint('')
    setBindingError('')
  }

  const fetchAgents = async (serverId: string, keyId: number, preserveAgentId = '') => {
    if (!serverId || !keyId) {
      setAgents([])
      return
    }
    setAgentLoading(true)
    try {
      const { data } = await mcpApi.listProjectAgents(projectId, serverId, keyId)
      setAgents(data.agents || [])
      if (preserveAgentId && !(data.agents || []).some(agent => agent.id === preserveAgentId)) {
        setBindingError('已保存的 Agent 当前不可见，请刷新账号或重新选择。')
      }
    } catch (error) {
      setAgents([])
      setBindingError(failureMessage(error, 'Agent 列表加载失败'))
    } finally {
      setAgentLoading(false)
    }
  }

  const load = async () => {
    if (!projectId) return
    setLoading(true)
    setLoadError('')
    setBindingError('')
    setTestedFingerprint('')
    try {
      const [serverResponse, keyResponse, sourceResponse] = await Promise.all([
        mcpApi.listServers(),
        mcpApi.listKeys(),
        mcpApi.getProjectSource(projectId),
      ])
      setServers(serverResponse.data)
      setKeys(keyResponse.data)
      const hydrated = sourceFormFromConfig(sourceResponse.data.source)
      setForm(hydrated)
      if (hydrated.type === 'mcp') await fetchAgents(hydrated.serverId, hydrated.keyId, hydrated.agentId)
      else setAgents([])
    } catch (error) {
      setLoadError(failureMessage(error, 'MCP 区域加载失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && projectId) void load()
  }, [open, projectId])

  const selectServer = (serverId: string) => {
    const server = servers.find(item => item.id === serverId)
    updateForm({ serverId, adapterId: server?.adapter_id || '', keyId: 0, agentId: '' })
    setAgents([])
  }

  const selectKey = (keyId: number) => {
    updateForm({ keyId, agentId: '' })
    void fetchAgents(form.serverId, keyId)
  }

  const testBinding = async () => {
    setTesting(true)
    setBindingError('')
    try {
      const payload = buildSourcePayload(form)
      await mcpApi.testProjectSource(projectId, payload.source)
      setTestedFingerprint(bindingFingerprint(form))
      message.success('MCP 绑定测试通过')
    } catch (error) {
      setTestedFingerprint('')
      setBindingError(failureMessage(error, 'MCP 绑定测试失败'))
    } finally {
      setTesting(false)
    }
  }

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setBindingError('')
    try {
      const payload = buildSourcePayload(form)
      await mcpApi.saveProjectSource(projectId, payload.source)
      message.success(form.type === 'mcp' ? 'MCP 正文来源已绑定' : '正文来源已切换为模型')
      onSaved?.()
    } catch (error) {
      setBindingError(failureMessage(error, '正文来源保存失败'))
    } finally {
      setSaving(false)
    }
  }

  const createAgent = async () => {
    if (!form.serverId || !form.keyId || !agentName.trim()) return
    setCreatingAgent(true)
    setBindingError('')
    try {
      const { data } = await mcpApi.createProjectAgent(projectId, {
        server_id: form.serverId,
        key_id: form.keyId,
        name: agentName.trim(),
        ...(spaceId.trim() ? { space_id: spaceId.trim() } : {}),
      })
      await fetchAgents(form.serverId, form.keyId, data.agent.id)
      updateForm({ agentId: data.agent.id })
      message.success('MangaForge Agent 已创建，请测试后保存绑定')
    } catch (error) {
      setBindingError(failureMessage(error, 'Agent 创建失败'))
    } finally {
      setCreatingAgent(false)
    }
  }

  if (loading) return <div style={{ padding: 28, textAlign: 'center' }}><Spin /><Text type="secondary" style={{ marginLeft: 8 }}>加载正文来源...</Text></div>
  if (loadError) return <Alert type="error" showIcon message="MCP 区域加载失败" description={loadError} action={<Button icon={<ReloadOutlined />} onClick={load}>重试</Button>} />

  return <Card size="small" title="正文生成来源" extra={<Text type="secondary">{sourceEndpoint}</Text>}>
    <Space direction="vertical" size={14} style={{ width: '100%' }}>
      <Radio.Group value={form.type} optionType="button" buttonStyle="solid" onChange={event => updateForm({ type: event.target.value })}>
        <Radio.Button value="model">模型 API</Radio.Button>
        <Radio.Button value="mcp">MCP Agent</Radio.Button>
      </Radio.Group>

      {form.type === 'model' ? <Alert type="info" showIcon message="初稿使用当前项目的模型策略" description="已绑定 MCP 的项目也可以在单次生成请求中显式使用 generation_source_override=model 临时改用模型。" /> : <>
        {!servers.length ? <Empty description="请先到 MCP Services 添加服务与账号" /> : <>
          <Space wrap align="start">
            <Space direction="vertical" size={4}><Text strong>MCP Server</Text><Select style={{ width: 220 }} value={form.serverId || undefined} onChange={selectServer} options={servers.map(server => ({ value: server.id, label: `${server.display_name} · ${server.adapter_id}`, disabled: !server.is_active }))} /></Space>
            <Space direction="vertical" size={4}><Text strong>MCP 账号</Text><Select style={{ width: 240 }} value={form.keyId || undefined} onChange={selectKey} disabled={!form.serverId} options={availableKeys.map(key => ({ value: key.id, label: `${key.description || `账号 ${key.id}`} · ${key.masked_key}` }))} /></Space>
            <Space direction="vertical" size={4}><Text strong>Adapter</Text><Input style={{ width: 150 }} value={form.adapterId || selectedServer?.adapter_id || ''} readOnly /></Space>
          </Space>
          <Space align="end" wrap>
            <Space direction="vertical" size={4}><Text strong>项目专属 Agent</Text><Select loading={agentLoading} style={{ width: 330 }} value={form.agentId || undefined} disabled={!form.keyId} onChange={agentId => updateForm({ agentId })} options={agents.map(agent => ({ value: agent.id, label: `${agent.name} (${agent.id})` }))} /></Space>
            <Button icon={<ReloadOutlined />} disabled={!form.serverId || !form.keyId} loading={agentLoading} onClick={() => fetchAgents(form.serverId, form.keyId, form.agentId)}>刷新 Agents</Button>
          </Space>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text strong>Buda 模型</Text>
            <Input
              value={form.model}
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
          <Space.Compact style={{ width: '100%' }}><Input value={agentName} onChange={event => setAgentName(event.target.value)} placeholder="Agent 名称" /><Input value={spaceId} onChange={event => setSpaceId(event.target.value)} placeholder="Space ID（需要时填写）" /></Space.Compact>
          <Popconfirm title="确认新建 MangaForge Agent？" description="此操作会修改远端 MCP 服务状态。" onConfirm={createAgent} okText="确认创建"><Button icon={<RobotOutlined />} loading={creatingAgent} disabled={!form.serverId || !form.keyId}>新建 MangaForge Agent</Button></Popconfirm>
        </>}
      </>}

      {bindingError && <Alert type="error" showIcon message="MCP 绑定不可用" description={bindingError} />}
      {form.type === 'mcp' && testedFingerprint === bindingFingerprint(form) && <Tag color="success" icon={<CheckCircleOutlined />}>当前绑定已测试</Tag>}
      <Space>
        {form.type === 'mcp' && <Button onClick={testBinding} loading={testing} disabled={!bindingFingerprint(form)}>测试绑定</Button>}
        <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!canSave} onClick={save}>保存正文来源</Button>
      </Space>
    </Space>
  </Card>
}
