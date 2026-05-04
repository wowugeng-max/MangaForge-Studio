import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Drawer, Empty, Form, Input, message, Popconfirm, Select, Space, Switch, Table, Tag, Typography, Divider, Row, Col, Statistic, Tooltip, Segmented } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, StarFilled, StarOutlined, CheckCircleOutlined, DatabaseOutlined, ApiOutlined, ThunderboltOutlined, FilterOutlined } from '@ant-design/icons'
import { modelApi } from '../api/models'
import { keyApi } from '../api/keys'

const { Title, Text } = Typography

export default function ModelManager() {
  const [models, setModels] = useState<any[]>([])
  const [keys, setKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [testingId, setTestingId] = useState<number | null>(null)
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const [m, k] = await Promise.all([modelApi.list(), keyApi.getAll()])
      setModels(Array.isArray(m.data) ? m.data : [])
      setKeys(Array.isArray(k.data) ? k.data : [])
    } catch {
      message.error('加载模型失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openEditor = (record?: any) => {
    setEditing(record || null)
    form.setFieldsValue(record || { is_manual: true, is_active: true, capabilities: { chat: true }, context_ui_params: {} })
    setOpen(true)
  }

  const save = async () => {
    const values = await form.validateFields()
    const payload = {
      ...values,
      capabilities: typeof values.capabilities === 'string'
        ? JSON.parse(values.capabilities)
        : (values.capabilities || { chat: true }),
      context_ui_params: typeof values.context_ui_params === 'string'
        ? JSON.parse(values.context_ui_params || '{}')
        : (values.context_ui_params || {}),
    }
    if (editing) await modelApi.update(editing.id, payload)
    else await modelApi.create(payload)
    message.success('已保存模型')
    setOpen(false)
    await load()
  }

  const remove = async (id: number) => {
    await modelApi.delete(id)
    message.success('已删除')
    await load()
  }

  const toggleFav = async (id: number, fav: boolean) => {
    await modelApi.toggleFavorite(id, fav)
    await load()
  }

  const testModel = async (id: number) => {
    setTestingId(id)
    try {
      const res = await modelApi.test(id)
      message.success(res.data?.message || '模型测试完成')
    } catch (error: any) {
      message.error(error.response?.data?.detail || '模型测试失败')
    } finally {
      setTestingId(null)
    }
  }

  const providers = useMemo(() => {
    const uniq = Array.from(new Set(models.map(m => m.provider).filter(Boolean)))
    return uniq
  }, [models])

  const filteredModels = useMemo(() => {
    return providerFilter === 'all' ? models : models.filter(m => String(m.provider) === providerFilter)
  }, [models, providerFilter])

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '名称', dataIndex: 'display_name', key: 'display_name', width: 220 },
    { title: '模型代号', dataIndex: 'model_name', key: 'model_name', width: 220 },
    { title: 'Provider', dataIndex: 'provider', key: 'provider', width: 160, render: (v: string) => <Tag color="blue" bordered={false}>{v || '-'}</Tag> },
    {
      title: '能力', dataIndex: 'capabilities', key: 'capabilities',
      render: (v: any) => <Space size={[0, 4]} wrap>{Object.entries(v || {}).filter(([, on]) => on).map(([k]) => <Tag key={k} color="geekblue" bordered={false}>{k}</Tag>)}</Space>
    },
    { title: '状态', dataIndex: 'is_active', key: 'is_active', width: 90, render: (v: boolean) => v ? <Tag color="green" bordered={false}>启用</Tag> : <Tag bordered={false}>停用</Tag> },
    { title: '收藏', dataIndex: 'is_favorite', key: 'is_favorite', width: 90, render: (v: boolean, record: any) => <Button type="text" icon={v ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />} onClick={() => toggleFav(record.id, !v)} /> },
    { title: '最近测试', dataIndex: 'last_tested_at', key: 'last_tested_at', width: 180, render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    {
      title: '操作', key: 'actions', width: 220,
      render: (_: any, record: any) => <Space>
        <Tooltip title="测试模型"><Button size="small" icon={<CheckCircleOutlined />} loading={testingId === record.id} onClick={() => testModel(record.id)}>测试</Button></Tooltip>
        <Tooltip title="编辑模型"><Button size="small" icon={<EditOutlined />} onClick={() => openEditor(record)}>编辑</Button></Tooltip>
        <Popconfirm title="确定删除？" onConfirm={() => remove(record.id)}><Button size="small" danger icon={<DeleteOutlined />}>删除</Button></Popconfirm>
      </Space>
    },
  ], [testingId, models])

  return (
    <div style={{ padding: 32, minHeight: '100%' }}>
      <Card
        style={{ borderRadius: 24, boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)', overflow: 'hidden' }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: 28, background: 'linear-gradient(180deg, rgba(248,250,252,0.95), rgba(255,255,255,0.95))', borderBottom: '1px solid rgba(148,163,184,0.16)' }}>
          <Row justify="space-between" align="middle" gutter={24}>
            <Col flex="auto">
              <Space direction="vertical" size={4}>
                <Space align="center" size={10}>
                  <div style={{ width: 34, height: 34, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #60a5fa, #7c3aed)', color: '#fff', boxShadow: '0 12px 24px rgba(99,102,241,0.24)' }}>
                    <DatabaseOutlined />
                  </div>
                  <div>
                    <Title level={3} style={{ margin: 0 }}>模型管理</Title>
                    <Text type="secondary">管理模型配置、能力、收藏与启用状态</Text>
                  </div>
                </Space>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={load} style={{ borderRadius: 12 }}>刷新</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()} style={{ borderRadius: 12, boxShadow: '0 10px 24px rgba(24, 144, 255, 0.25)' }}>新增模型</Button>
              </Space>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 20 }}>
            <Col xs={24} sm={8}>
              <Card bordered={false} style={{ borderRadius: 16, background: '#fff' }} bodyStyle={{ padding: 16 }}>
                <Statistic title="模型总数" value={models.length} prefix={<ApiOutlined style={{ color: '#1890ff' }} />} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card bordered={false} style={{ borderRadius: 16, background: '#fff' }} bodyStyle={{ padding: 16 }}>
                <Statistic title="启用模型" value={models.filter(m => m.is_active).length} prefix={<ThunderboltOutlined style={{ color: '#22c55e' }} />} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card bordered={false} style={{ borderRadius: 16, background: '#fff' }} bodyStyle={{ padding: 16 }}>
                <Statistic title="收藏模型" value={models.filter(m => m.is_favorite).length} prefix={<StarFilled style={{ color: '#faad14' }} />} />
              </Card>
            </Col>
          </Row>
        </div>

        <div style={{ padding: 24 }}>
          <Card bordered={false} style={{ borderRadius: 18, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }} bodyStyle={{ padding: 18 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                <Space wrap>
                  <Text strong style={{ color: '#334155' }}>筛选</Text>
                  <Segmented
                    options={[{ label: '全部', value: 'all' }, ...providers.map(p => ({ label: p, value: p }))]}
                    value={providerFilter}
                    onChange={(v) => setProviderFilter(String(v))}
                  />
                </Space>
                <Space>
                  <Tag color="blue" bordered={false}>总条目 {filteredModels.length}</Tag>
                </Space>
              </Space>

              <Table
                rowKey="id"
                loading={loading}
                dataSource={filteredModels}
                columns={columns}
                pagination={false}
                scroll={{ x: 1180 }}
                style={{ borderRadius: 16, overflow: 'hidden' }}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无模型"
                    />
                  ),
                }}
              />
            </Space>
          </Card>
        </div>
      </Card>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? '编辑模型' : '新增模型'}
        width={820}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="display_name" label="显示名称" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="model_name" label="模型代号" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="provider" label="Provider"><Select options={keys.map(k => ({ label: `${k.provider} #${k.id}`, value: k.provider }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="is_favorite" label="收藏" valuePropName="checked"><Switch /></Form.Item></Col>
          </Row>
          <Form.Item name="capabilities" label="能力 JSON" rules={[{ required: true }]}><Input.TextArea rows={5} style={{ fontFamily: 'monospace' }} /></Form.Item>
          <Form.Item name="context_ui_params" label="UI 参数 JSON"><Input.TextArea rows={6} style={{ fontFamily: 'monospace' }} /></Form.Item>
          <Divider />
          <Space wrap>
            <Form.Item name="is_manual" label="手动模型" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="is_active" label="启用" valuePropName="checked"><Switch /></Form.Item>
          </Space>
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={save} style={{ borderRadius: 10 }}>保存</Button>
          </div>
        </Form>
      </Drawer>
    </div>
  )
}
