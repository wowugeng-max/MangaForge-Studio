import React, { useEffect, useMemo, useState } from 'react'
import { Button, Divider, Drawer, Empty, Form, Input, message, Popconfirm, Select, Segmented, Space, Spin, Tag, Tooltip, Typography, Upload, Row, Col, Badge } from 'antd'
import { DeleteOutlined, EditOutlined, FileTextOutlined, FilterOutlined, InboxOutlined, PictureOutlined, PlusOutlined, SearchOutlined, SendOutlined, SaveOutlined, VideoCameraOutlined, ApiOutlined } from '@ant-design/icons'
import { useDrag } from 'react-dnd'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { useAssetLibraryStore, type Asset } from '../stores/assetLibraryStore'
import { DndItemTypes } from '../constants/dnd'

const { Text } = Typography
const { Search } = Input

interface AssetLibraryProps {
  projectId?: number
  onAddToCanvas?: (asset: Asset) => void
}

const typeOptions = [
  { value: 'image', label: '图像' },
  { value: 'prompt', label: '提示词' },
  { value: 'video', label: '视频' },
  { value: 'workflow', label: '工作流' },
  { value: 'node_config', label: '节点配置' },
  { value: 'node_template', label: '节点模板' },
]

function AssetItem({ asset, onAddToCanvas, onEdit, onDelete }: { asset: Asset; onAddToCanvas?: (asset: Asset) => void; onEdit?: (asset: Asset) => void; onDelete?: (asset: Asset) => void }) {
  const [hovered, setHovered] = useState(false)
  const [{ isDragging }, drag] = useDrag(() => ({ type: DndItemTypes.ASSET, item: { asset }, collect: monitor => ({ isDragging: monitor.isDragging() }) }))
  const icon = asset.type === 'image' ? <PictureOutlined /> : asset.type === 'video' ? <VideoCameraOutlined /> : asset.type === 'workflow' ? <ApiOutlined /> : <FileTextOutlined />
  const preview = asset.thumbnail || (asset.type === 'image' ? asset.data?.file_path : null)

  return <div ref={drag} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ padding: 10, border: '1px solid #f0f0f0', borderRadius: 8, background: isDragging ? '#e6f7ff' : '#fff' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {preview ? <img src={preview.startsWith('http') || preview.startsWith('data:') ? preview : `/api/assets/media/${preview}`} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} /> : <div style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', background: '#fafafa', borderRadius: 4 }}>{icon}</div>}
      <div style={{ flex: 1, minWidth: 0 }}><Text strong ellipsis style={{ display: 'block' }}>{asset.name}</Text><Text type="secondary" style={{ fontSize: 11 }}>{asset.type} · ID {asset.id}</Text></div>
      {hovered && <Space>
        {onAddToCanvas && <Button size="small" icon={<SendOutlined />} onClick={(e) => { e.stopPropagation(); onAddToCanvas(asset) }} />}
        {onEdit && <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onEdit(asset) }} />}
        {onDelete && <Popconfirm title="确认删除？" onConfirm={(e) => { e?.stopPropagation(); onDelete(asset) }}><Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} /></Popconfirm>}
      </Space>}
    </div>
    {asset.tags?.length ? <div style={{ marginTop: 6 }}>{asset.tags.slice(0, 3).map(tag => <Tag key={tag} style={{ fontSize: 10 }}>{tag}</Tag>)}</div> : null}
  </div>
}

export default function AssetLibrary({ projectId, onAddToCanvas }: AssetLibraryProps) {
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

  return <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
    <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
        <Badge count={filteredAssets.length} style={{ backgroundColor: '#52c41a' }}><Text strong>资产库</Text></Badge>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { setCreateType('prompt'); setCreateOpen(true) }}>新建</Button>
      </Space>
      <Segmented block options={[{ label: '📦 项目专属', value: 'project' }, { label: '🌍 全局公共', value: 'global' }]} value={scope} onChange={v => setScope(v as any)} />
      <Search allowClear placeholder="搜索名称或内容..." onSearch={setSearchText} onChange={e => setSearchText(e.target.value)} style={{ marginTop: 12 }} prefix={<SearchOutlined />} />
      <Space style={{ marginTop: 12 }} wrap>
        <Select allowClear placeholder="类型" value={filterType || undefined} style={{ minWidth: 160 }} suffixIcon={<FilterOutlined />} onChange={v => setFilterType(v || '')} options={typeOptions} />
        <Select allowClear placeholder="标签" value={selectedTag || undefined} style={{ minWidth: 160 }} onChange={v => setSelectedTag(v || null)} options={allTags.map(t => ({ label: t, value: t }))} />
      </Space>
    </div>
    <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
      {loading ? <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div> : filteredAssets.length ? <Space direction="vertical" style={{ width: '100%' }}>
        {filteredAssets.map(asset => <AssetItem key={asset.id} asset={asset} onAddToCanvas={onAddToCanvas} onEdit={openEdit} onDelete={async (a) => { await deleteAsset(a.id); message.success('已删除') }} />)}
      </Space> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到相关资产" />}
    </div>

    <Drawer title={editingAsset ? `编辑资产 · ${editingAsset.type}` : '编辑资产'} open={!!editingAsset} onClose={() => setEditingAsset(null)} width={480} extra={<Button type="primary" icon={<SaveOutlined />} onClick={saveEdit}>保存</Button>}>
      {editingAsset && <Form form={editingForm} layout="vertical"><Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item><Form.Item name="tags" label="标签"><Input placeholder="逗号分隔" /></Form.Item>{editingAsset.type === 'prompt' && <Form.Item name="content" label="提示词"><Input.TextArea rows={6} /></Form.Item>}{editingAsset.type === 'workflow' && <><Form.Item name="workflow_json" label="工作流 JSON"><Input.TextArea rows={8} style={{ fontFamily: 'monospace' }} /></Form.Item><Form.Item name="parameters" label="参数映射 JSON"><Input.TextArea rows={5} style={{ fontFamily: 'monospace' }} /></Form.Item></>}</Form>}
    </Drawer>

    <Drawer title="铸造新资产" open={createOpen} onClose={() => setCreateOpen(false)} width={480} extra={<Button type="primary" icon={<SaveOutlined />} onClick={saveCreate}>创建</Button>}>
      <Form form={createForm} layout="vertical">
        <Form.Item label="资产类型"><Segmented block value={createType} onChange={v => setCreateType(v as any)} options={typeOptions} /></Form.Item>
        <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="tags" label="标签"><Input placeholder="逗号分隔" /></Form.Item>
        {createType === 'prompt' && <Form.Item name="content" label="提示词" rules={[{ required: true }]}><Input.TextArea rows={6} /></Form.Item>}
        {createType === 'workflow' && <><Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/assets/workflow-config${projectId ? `?projectId=${projectId}` : ''}`)}>在完整编辑器中打开</Button><Form.Item name="workflow_json" label="工作流 JSON" rules={[{ required: true }]}><Input.TextArea rows={8} style={{ fontFamily: 'monospace' }} /></Form.Item><Form.Item name="parameters" label="参数映射 JSON"><Input.TextArea rows={5} style={{ fontFamily: 'monospace' }} /></Form.Item></>}
      </Form>
    </Drawer>
  </div>
}
