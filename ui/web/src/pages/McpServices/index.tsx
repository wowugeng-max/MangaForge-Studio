import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ApiOutlined,
  CloudServerOutlined,
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import { mcpApi, type McpAgentSummary, type McpPublicKey, type McpServerRecord } from '../../api/mcp'
import { buildMcpKeyPayload, buildMcpServerPayload, defaultBudaServerForm, summarizeMcpDiagnostics } from './mcpServicesModel'

const { Title, Text, Paragraph } = Typography

function failureMessage(error: any, fallback: string) {
  return String(error?.response?.data?.error || error?.response?.data?.detail || error?.message || fallback)
}

export default function McpServices() {
  const [servers, setServers] = useState<McpServerRecord[]>([])
  const [keys, setKeys] = useState<McpPublicKey[]>([])
  const [loading, setLoading] = useState(false)
  const [serverModalOpen, setServerModalOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<McpServerRecord | null>(null)
  const [keyModalOpen, setKeyModalOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<McpPublicKey | null>(null)
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [agents, setAgents] = useState<McpAgentSummary[]>([])
  const [agentKey, setAgentKey] = useState<McpPublicKey | null>(null)
  const [agentDrawerOpen, setAgentDrawerOpen] = useState(false)
  const [agentName, setAgentName] = useState('MangaForge 小说正文 Agent')
  const [spaceId, setSpaceId] = useState('')
  const [busy, setBusy] = useState('')
  const [serverForm] = Form.useForm()
  const [keyForm] = Form.useForm()

  const serverOptions = useMemo(() => servers.map(server => ({ label: `${server.display_name} (${server.id})`, value: server.id, disabled: !server.is_active })), [servers])

  const loadData = async () => {
    setLoading(true)
    try {
      const [serverResponse, keyResponse] = await Promise.all([mcpApi.listServers(), mcpApi.listKeys()])
      setServers(serverResponse.data)
      setKeys(keyResponse.data)
    } catch (error) {
      message.error(failureMessage(error, 'MCP 配置加载失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  const openServer = (server?: McpServerRecord) => {
    setEditingServer(server || null)
    serverForm.resetFields()
    if (server) {
      serverForm.setFieldsValue({
        ...server,
        enabled_tools_text: (server.enabled_tools || []).join('\n'),
        custom_headers_list: Object.entries(server.custom_headers || {}).map(([key, value]) => ({ key, value })),
      })
    } else {
      serverForm.setFieldsValue(defaultBudaServerForm())
    }
    setServerModalOpen(true)
  }

  const saveServer = async () => {
    try {
      const payload = buildMcpServerPayload(await serverForm.validateFields())
      if (editingServer) await mcpApi.updateServer(editingServer.id, payload)
      else await mcpApi.createServer(payload)
      message.success(editingServer ? 'MCP Server 已更新' : 'MCP Server 已创建')
      setServerModalOpen(false)
      await loadData()
    } catch (error: any) {
      if (!error?.errorFields) message.error(failureMessage(error, 'MCP Server 保存失败'))
    }
  }

  const openKey = (record?: McpPublicKey) => {
    setEditingKey(record || null)
    keyForm.resetFields()
    keyForm.setFieldsValue(record ? {
      mcp_server_id: record.mcp_server_id,
      description: record.description,
      is_active: record.is_active,
      priority: record.priority,
      key: '',
    } : {
      mcp_server_id: servers.find(item => item.is_active)?.id,
      description: '',
      is_active: true,
      priority: 0,
      key: '',
    })
    setKeyModalOpen(true)
  }

  const saveKey = async () => {
    try {
      const values = await keyForm.validateFields()
      const payload = buildMcpKeyPayload(values, editingKey || undefined)
      if (editingKey) await mcpApi.updateKey(editingKey.id, payload)
      else await mcpApi.createKey(payload)
      message.success(editingKey ? 'MCP 账号已更新' : 'MCP 账号已添加')
      setKeyModalOpen(false)
      await loadData()
    } catch (error: any) {
      if (!error?.errorFields) message.error(failureMessage(error, 'MCP 账号保存失败'))
    }
  }

  const runKeyTest = async (record: McpPublicKey) => {
    setBusy(`test-${record.id}`)
    try {
      const { data } = await mcpApi.testKey(record.id)
      message.success(`连接成功：${data.latency_ms} ms，${data.agent_count} 个 Agent`)
      await loadData()
    } catch (error) {
      message.error(failureMessage(error, '连接测试失败'))
    } finally {
      setBusy('')
    }
  }

  const openDiagnostics = async (record: McpPublicKey) => {
    setBusy(`diagnostics-${record.id}`)
    try {
      const { data } = await mcpApi.diagnostics(record.mcp_server_id, record.id)
      setDiagnostics(data)
      setDiagnosticsOpen(true)
    } catch (error) {
      message.error(failureMessage(error, '诊断失败'))
    } finally {
      setBusy('')
    }
  }

  const loadAgents = async (record: McpPublicKey) => {
    setAgentKey(record)
    setAgentDrawerOpen(true)
    setBusy(`agents-${record.id}`)
    try {
      const { data } = await mcpApi.listAgents(record.id)
      setAgents(data.agents || [])
    } catch (error) {
      setAgents([])
      message.error(failureMessage(error, 'Agent 列表加载失败'))
    } finally {
      setBusy('')
    }
  }

  const createRemoteAgent = async () => {
    if (!agentKey || !agentName.trim()) return
    setBusy(`create-agent-${agentKey.id}`)
    try {
      await mcpApi.createAgent(agentKey.id, { name: agentName.trim(), ...(spaceId.trim() ? { space_id: spaceId.trim() } : {}) })
      message.success('远端 Agent 已创建')
      await loadAgents(agentKey)
    } catch (error) {
      message.error(failureMessage(error, '远端 Agent 创建失败'))
    } finally {
      setBusy('')
    }
  }

  const serverColumns = [
    { title: '服务', render: (_: any, record: McpServerRecord) => <Space direction="vertical" size={0}><Text strong>{record.display_name}</Text><Text code>{record.id}</Text></Space> },
    { title: '连接', render: (_: any, record: McpServerRecord) => <Space direction="vertical" size={0}><Text>{record.url}</Text><Text type="secondary">Streamable HTTP · {record.auth_type}</Text></Space> },
    { title: 'Adapter', dataIndex: 'adapter_id', render: (value: string) => <Tag color="purple">{value}</Tag> },
    { title: '状态', dataIndex: 'is_active', render: (value: boolean) => <Badge status={value ? 'processing' : 'default'} text={value ? '启用' : '停用'} /> },
    { title: '操作', align: 'right' as const, render: (_: any, record: McpServerRecord) => <Space><Button icon={<EditOutlined />} onClick={() => openServer(record)}>编辑</Button><Popconfirm title="删除这个 MCP Server？" onConfirm={async () => { try { await mcpApi.deleteServer(record.id); await loadData() } catch (error) { message.error(failureMessage(error, '删除失败')) } }}><Button danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
  ]

  const keyColumns = [
    { title: '账号', render: (_: any, record: McpPublicKey) => <Space direction="vertical" size={0}><Text strong>{record.description || `账号 ${record.id}`}</Text><Text type="secondary">{record.masked_key || '未设置 Key'}</Text></Space> },
    { title: 'Server', dataIndex: 'mcp_server_id', render: (value: string) => <Tag color="blue">{value}</Tag> },
    { title: '状态', render: (_: any, record: McpPublicKey) => <Space><Badge status={record.is_active ? 'processing' : 'default'} text={record.is_active ? '启用' : '停用'} />{record.bound_projects?.length ? <Tag>{record.bound_projects.length} 个项目</Tag> : null}</Space> },
    { title: '健康', render: (_: any, record: McpPublicKey) => <Text type="secondary">成功 {record.success_count || 0} / 失败 {record.failure_count || 0}</Text> },
    { title: '操作', align: 'right' as const, render: (_: any, record: McpPublicKey) => <Space wrap><Button loading={busy === `test-${record.id}`} icon={<ExperimentOutlined />} onClick={() => runKeyTest(record)}>测试</Button><Button loading={busy === `diagnostics-${record.id}`} icon={<ApiOutlined />} onClick={() => openDiagnostics(record)}>连接诊断</Button><Button loading={busy === `agents-${record.id}`} icon={<RobotOutlined />} onClick={() => loadAgents(record)}>Agents</Button><Button icon={<EditOutlined />} onClick={() => openKey(record)}>编辑</Button><Popconfirm title="删除这个 MCP 账号？" onConfirm={async () => { try { await mcpApi.deleteKey(record.id); await loadData() } catch (error) { message.error(failureMessage(error, '删除失败')) } }}><Button danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
  ]

  const diagnosticSummary = summarizeMcpDiagnostics(diagnostics)

  return <div style={{ padding: '28px 32px' }}>
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
        <div><Title level={2} style={{ margin: 0 }}>MCP Services</Title><Text type="secondary">管理 Streamable HTTP 服务、账号和远端小说 Agent。正文仍由 MangaForge 统一编排与质检。</Text></div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={loadData}>刷新</Button>
      </div>

      <Alert type="info" showIcon message="Key 当前存储为明文配置" description="界面和诊断只显示掩码；密钥加密会在项目后期统一加入。请使用 MCP API Key，不要填写网站登录密码。" />

      <Card title={<Space><CloudServerOutlined />MCP Servers</Space>} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openServer()}>新增 Server</Button>}>
        <Table rowKey="id" loading={loading} dataSource={servers} columns={serverColumns} pagination={false} scroll={{ x: 900 }} />
      </Card>

      <Card title={<Space><ApiOutlined />MCP 账号</Space>} extra={<Button type="primary" icon={<PlusOutlined />} disabled={!servers.length} onClick={() => openKey()}>新增账号</Button>}>
        <Table rowKey="id" loading={loading} dataSource={keys} columns={keyColumns} pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />
      </Card>
    </Space>

    <Modal title={editingServer ? '编辑 MCP Server' : '新增 MCP Server'} open={serverModalOpen} onOk={saveServer} onCancel={() => setServerModalOpen(false)} width={720} destroyOnHidden>
      <Form form={serverForm} layout="vertical">
        <Space align="start" style={{ width: '100%' }}><Form.Item name="id" label="Server ID" rules={[{ required: true }]}><Input disabled={!!editingServer} /></Form.Item><Form.Item name="display_name" label="显示名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="adapter_id" label="Adapter" rules={[{ required: true }]}><Input /></Form.Item></Space>
        <Form.Item name="url" label="Streamable HTTP URL" rules={[{ required: true, type: 'url' }]}><Input /></Form.Item>
        <Space align="start" wrap><Form.Item name="transport" label="Transport"><Select style={{ width: 180 }} options={[{ value: 'streamable_http', label: 'Streamable HTTP' }]} /></Form.Item><Form.Item name="auth_type" label="认证"><Select style={{ width: 150 }} options={[{ value: 'bearer', label: 'Bearer' }, { value: 'none', label: 'None' }]} /></Form.Item><Form.Item name="is_active" label="启用" valuePropName="checked"><Switch /></Form.Item></Space>
        <Space align="start" wrap><Form.Item name="startup_timeout_ms" label="启动超时 ms"><InputNumber min={1} /></Form.Item><Form.Item name="tool_timeout_ms" label="工具超时 ms"><InputNumber min={1} /></Form.Item><Form.Item name="generation_timeout_ms" label="生成总超时 ms"><InputNumber min={1} /></Form.Item><Form.Item name="poll_initial_ms" label="初始轮询 ms"><InputNumber min={1} /></Form.Item><Form.Item name="poll_max_ms" label="最大轮询 ms"><InputNumber min={1} /></Form.Item></Space>
        <Form.Item name="enabled_tools_text" label="工具白名单" extra="每行一个；留空表示使用 Adapter 所需工具"><Input.TextArea rows={3} /></Form.Item>
        <Form.List name="custom_headers_list">{(fields, { add, remove }) => <Space direction="vertical" style={{ width: '100%' }}>{fields.map(field => <Space key={field.key}><Form.Item {...field} name={[field.name, 'key']} noStyle><Input placeholder="Header" /></Form.Item><Form.Item {...field} name={[field.name, 'value']} noStyle><Input placeholder="Value" /></Form.Item><Button danger onClick={() => remove(field.name)}>删除</Button></Space>)}<Button onClick={() => add({ key: '', value: '' })}>添加自定义 Header</Button></Space>}</Form.List>
      </Form>
    </Modal>

    <Modal title={editingKey ? '编辑 MCP 账号' : '新增 MCP 账号'} open={keyModalOpen} onOk={saveKey} onCancel={() => setKeyModalOpen(false)} destroyOnHidden>
      <Form form={keyForm} layout="vertical">
        <Form.Item name="mcp_server_id" label="MCP Server" rules={[{ required: true }]}><Select options={serverOptions} /></Form.Item>
        <Form.Item name="description" label="账号备注"><Input placeholder="例如：Buda 小说账号一" /></Form.Item>
        <Form.Item name="key" label="MCP API Key" extra={editingKey ? `现有 Key：${editingKey.masked_key}；留空保持不变` : '请填写 MCP 服务颁发的 API Key'} rules={editingKey ? [] : [{ required: true, message: '请填写 MCP API Key' }]}><Input.Password autoComplete="new-password" /></Form.Item>
        <Form.Item name="priority" label="优先级"><InputNumber min={0} /></Form.Item>
        <Form.Item name="is_active" label="启用" valuePropName="checked"><Switch /></Form.Item>
      </Form>
    </Modal>

    <Drawer title="连接诊断" width={680} open={diagnosticsOpen} onClose={() => setDiagnosticsOpen(false)}>
      <Descriptions bordered column={2} items={[
        { key: 'state', label: '连接状态', children: diagnosticSummary.state },
        { key: 'adapter', label: 'Adapter', children: diagnosticSummary.adapter_id || '-' },
        { key: 'ready', label: 'Adapter Ready', children: diagnosticSummary.adapter_ready ? '是' : '否' },
        { key: 'agents', label: 'Agents', children: diagnosticSummary.agent_count },
        { key: 'tools', label: 'Tools', children: diagnosticSummary.tool_count },
      ]} />
      <Title level={5} style={{ marginTop: 24 }}>只读诊断详情</Title>
      <Paragraph><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f6f8fa', padding: 16, borderRadius: 12 }}>{JSON.stringify(diagnostics, null, 2)}</pre></Paragraph>
    </Drawer>

    <Drawer title={`远端 Agents · ${agentKey?.description || ''}`} width={620} open={agentDrawerOpen} onClose={() => setAgentDrawerOpen(false)} extra={<Button icon={<ReloadOutlined />} disabled={!agentKey} onClick={() => agentKey && loadAgents(agentKey)}>刷新</Button>}>
      <Alert type="warning" showIcon message="创建是显式远端操作" description="Buda 免费账号最多可创建两个 Agent；每个小说项目建议独占一个 Agent。" style={{ marginBottom: 16 }} />
      <Space.Compact style={{ width: '100%', marginBottom: 12 }}><Input value={agentName} onChange={event => setAgentName(event.target.value)} placeholder="Agent 名称" /><Input value={spaceId} onChange={event => setSpaceId(event.target.value)} placeholder="Space ID（需要时填写）" /></Space.Compact>
      <Popconfirm title="确认在远端新建 Agent？" description="此操作会修改 MCP 服务端状态。" onConfirm={createRemoteAgent} okText="确认创建"><Button type="primary" icon={<RobotOutlined />} loading={busy.startsWith('create-agent-')}>新建远端 Agent</Button></Popconfirm>
      <Table style={{ marginTop: 20 }} rowKey="id" dataSource={agents} pagination={false} columns={[{ title: '名称', dataIndex: 'name' }, { title: 'Agent ID', dataIndex: 'id', render: value => <Text code>{value}</Text> }, { title: '状态', dataIndex: 'status', render: value => value ? <Tag>{value}</Tag> : '-' }]} />
    </Drawer>
  </div>
}
