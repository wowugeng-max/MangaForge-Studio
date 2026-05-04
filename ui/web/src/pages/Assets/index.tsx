import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Col, Empty, Form, Input, message, Row, Select, Segmented, Space, Spin, Tag, Typography, Drawer, Divider } from 'antd'
import { ApiOutlined, DeleteOutlined, EditOutlined, FileTextOutlined, FilterOutlined, PictureOutlined, PlusOutlined, SaveOutlined, SearchOutlined, SendOutlined, VideoCameraOutlined } from '@ant-design/icons'
import { useDrag } from 'react-dnd'
import { useNavigate } from 'react-router-dom'
import { useAssetLibraryStore, type Asset } from '../../stores/assetLibraryStore'
import { DndItemTypes } from '../../constants/dnd'

const { Text } = Typography
const { Search } = Input

function AssetItem({ asset, onAddToCanvas, onEdit, onDelete }: { asset: Asset; onAddToCanvas?: (asset: Asset) => void; onEdit?: (asset: Asset) => void; onDelete?: (asset: Asset) => void }) {
  const [hovered, setHovered] = useState(false)
  const [{ isDragging }, drag] = useDrag(() => ({ type: DndItemTypes.ASSET, item: { asset }, collect: monitor => ({ isDragging: monitor.isDragging() }) }))
  const icon = asset.type === 'image' ? <PictureOutlined /> : asset.type === 'video' ? <VideoCameraOutlined /> : asset.type === 'workflow' ? <ApiOutlined /> : <FileTextOutlined />
  const preview = asset.thumbnail || (asset.type === 'image' ? asset.data?.file_path : null)
  return <div ref={drag} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ padding: 12, borderRadius: 16, border: '1px solid rgba(148,163,184,0.16)', background: isDragging ? '#e0f2fe' : '#fff', boxShadow: '0 10px 28px rgba(15,23,42,0.05)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {preview ? <img src={preview.startsWith('http') || preview.startsWith('data:') ? preview : `/api/assets/media/${preview}`} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', border: '1px solid rgba(148,163,184,0.15)' }} /> : <div style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', background: '#f8fafc', borderRadius: 12, color: '#334155' }}>{icon}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong ellipsis style={{ display: 'block' }}>{asset.name}</Text>
        <Text type="secondary" style={{ fontSize: 11 }}>{asset.type} · ID {asset.id}</Text>
      </div>
      {hovered && <Space>
        {onAddToCanvas && <Button size="small" icon={<SendOutlined />} onClick={(e) => { e.stopPropagation(); onAddToCanvas(asset) }} />}
        {onEdit && <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onEdit(asset) }} />}
        {onDelete && <Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); onDelete(asset) }} />}
      </Space>}
    </div>
    {asset.tags?.length ? <div style={{ marginTop: 8 }}>{asset.tags.slice(0, 3).map(tag => <Tag key={tag} style={{ fontSize: 10, borderRadius: 999, marginInlineEnd: 6 }}>{tag}</Tag>)}</div> : null}
  </div>
}

export default function AssetLibrary({ projectId, onAddToCanvas }: { projectId?: number; onAddToCanvas?: (asset: Asset) => void }) {
  const navigate = useNavigate()
  const { assets, loading, scope, filterType, searchText, setScope, setFilterType, setSearchText, fetchAssets, createAsset, updateAsset, deleteAsset } = useAssetLibraryStore()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [editingForm] = Form.useForm()
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm] = Form.useForm()
  const [createType, setCreateType] = useState<Asset['type']>('prompt')

  useEffect(() => { fetchAssets(projectId) }, [fetchAssets, projectId, scope])
  const allTags = useMemo(() => Array.from(new Set(assets.flatMap(a => a.tags || []))), [assets])
  const filteredAssets = useMemo(() => assets.filter(asset => (!filterType || asset.type === filterType) && (!searchText || asset.name.toLowerCase().includes(searchText.toLowerCase()) || String(asset.data?.content || '').toLowerCase().includes(searchText.toLowerCase())) && (!selectedTag || asset.tags?.includes(selectedTag))), [assets, filterType, searchText, selectedTag])

  const openEdit = (asset: Asset) => { setEditingAsset(asset); editingForm.setFieldsValue({ name: asset.name, description: asset.description || '', tags: asset.tags?.join(', ') || '', content: asset.data?.content || '', workflow_json: asset.data?.workflow_json ? JSON.stringify(asset.data.workflow_json, null, 2) : '', parameters: asset.data?.parameters ? JSON.stringify(asset.data.parameters, null, 2) : '' }) }
  const saveEdit = async () => { if (!editingAsset) return; const values = await editingForm.validateFields(); await updateAsset(editingAsset.id, { name: values.name, description: values.description || '', tags: String(values.tags || '').split(/[,，]/).map((s: string) => s.trim()).filter(Boolean), data: editingAsset.type === 'prompt' ? { content: values.content || '' } : editingAsset.type === 'workflow' ? { workflow_json: values.workflow_json ? JSON.parse(values.workflow_json) : {}, parameters: values.parameters ? JSON.parse(values.parameters) : {} } : editingAsset.data }); message.success('资产已更新'); setEditingAsset(null) }
  const saveCreate = async () => { const values = await createForm.validateFields(); await createAsset({ type: createType, name: values.name, description: values.description || '', tags: String(values.tags || '').split(/[,，]/).map((s: string) => s.trim()).filter(Boolean), project_id: scope === 'project' ? projectId || null : null, data: createType === 'prompt' ? { content: values.content || '' } : createType === 'workflow' ? { workflow_json: values.workflow_json ? JSON.parse(values.workflow_json) : {}, parameters: values.parameters ? JSON.parse(values.parameters) : {} } : {} }); message.success('资产已创建'); setCreateOpen(false); createForm.resetFields() }

  return <div style={{ padding: 32 }}>
    <Card style={{ borderRadius: 26, boxShadow: '0 20px 56px rgba(15, 23, 42, 0.08)', overflow: 'hidden' }} bodyStyle={{ padding: 24 }}>
      <Row justify="space-between" align="middle" gutter={16} style={{ marginBottom: 20 }}>
        <Col>
          <Space direction="vertical" size={4}>
            <Badge count={filteredAssets.length} style={{ backgroundColor: '#22c55e' }}><Text strong style={{ fontSize: 16 }}>资产库</Text></Badge>
            <Text type="secondary">管理提示词、工作流、节点模板与媒体资源</Text>
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 12 }} onClick={() => { setCreateType('prompt'); setCreateOpen(true) }}>新建资产</Button>
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 18, background: 'linear-gradient(180deg, rgba(248,250,252,0.96), rgba(255,255,255,0.98))', marginBottom: 20 }} bodyStyle={{ padding: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={14}>
          <Segmented block options={[{ label: '📦 项目专属', value: 'project' }, { label: '🌍 全局公共', value: 'global' }]} value={scope} onChange={v => setScope(v as any)} />
          <Row gutter={12}>
            <Col xs={24} md={14}><Search allowClear placeholder="搜索名称或内容..." onSearch={setSearchText} onChange={e => setSearchText(e.target.value)} prefix={<SearchOutlined />} /></Col>
            <Col xs={12} md={5}><Select allowClear placeholder="类型" value={filterType || undefined} style={{ width: '100%' }} suffixIcon={<FilterOutlined />} onChange={v => setFilterType(v || '')} options={[{ value: 'image', label: '图像' }, { value: 'prompt', label: '提示词' }, { value: 'video', label: '视频' }, { value: 'workflow', label: '工作流' }, { value: 'node_config', label: '节点配置' }, { value: 'node_template', label: '节点模板' }]} /></Col>
            <Col xs={12} md={5}><Select allowClear placeholder="标签" value={selectedTag || undefined} style={{ width: '100%' }} onChange={v => setSelectedTag(v || null)} options={allTags.map(t => ({ label: t, value: t }))} /></Col>
          </Row>
        </Space>
      </Card>

      <div style={{ display: 'grid', gap: 12 }}>
        {loading ? <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div> : filteredAssets.length ? filteredAssets.map(asset => <AssetItem key={asset.id} asset={asset} onAddToCanvas={onAddToCanvas} onEdit={openEdit} onDelete={async (a) => { await deleteAsset(a.id); message.success('已删除') }} />) : <Card bordered={false} style={{ borderRadius: 18 }}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Space direction="vertical"><span>未找到相关资产</span><Button type="primary" size="small" onClick={() => { setCreateType('prompt'); setCreateOpen(true) }}>新建资产</Button></Space>} /></Card>}
      </div>
    </Card>

    <Drawer title={editingAsset ? `编辑资产 · ${editingAsset.type}` : '编辑资产'} open={!!editingAsset} onClose={() => setEditingAsset(null)} width={520} extra={<Button type="primary" icon={<SaveOutlined />} onClick={saveEdit}>保存</Button>}>
      {editingAsset && <Form form={editingForm} layout="vertical"><Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item><Form.Item name="tags" label="标签"><Input placeholder="逗号分隔" /></Form.Item><Divider style={{ margin: '16px 0' }} />{editingAsset.type === 'prompt' && <Form.Item name="content" label="提示词"><Input.TextArea rows={6} /></Form.Item>}{editingAsset.type === 'workflow' && <><Form.Item name="workflow_json" label="工作流 JSON"><Input.TextArea rows={8} style={{ fontFamily: 'monospace' }} /></Form.Item><Form.Item name="parameters" label="参数映射 JSON"><Input.TextArea rows={5} style={{ fontFamily: 'monospace' }} /></Form.Item></>}</Form>}
    </Drawer>

    <Drawer title="铸造新资产" open={createOpen} onClose={() => setCreateOpen(false)} width={520} extra={<Button type="primary" icon={<SaveOutlined />} onClick={saveCreate}>创建</Button>}>
      <Form form={createForm} layout="vertical">
        <Form.Item label="资产类型"><Segmented block value={createType} onChange={v => setCreateType(v as any)} options={[{ value: 'prompt', label: '提示词' }, { value: 'image', label: '图像' }, { value: 'video', label: '视频' }, { value: 'workflow', label: '工作流' }]} /></Form.Item>
        <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="tags" label="标签"><Input placeholder="逗号分隔" /></Form.Item>
        <Divider style={{ margin: '16px 0' }} />
        {createType === 'prompt' && <Form.Item name="content" label="提示词" rules={[{ required: true }]}><Input.TextArea rows={6} /></Form.Item>}
        {createType === 'workflow' && <><Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/assets/workflow-config${projectId ? `?projectId=${projectId}` : ''}`)}>在完整编辑器中打开</Button><Form.Item name="workflow_json" label="工作流 JSON" rules={[{ required: true }]}><Input.TextArea rows={8} style={{ fontFamily: 'monospace' }} /></Form.Item><Form.Item name="parameters" label="参数映射 JSON"><Input.TextArea rows={5} style={{ fontFamily: 'monospace' }} /></Form.Item></>}
      </Form>
    </Drawer>
  </div>
}
