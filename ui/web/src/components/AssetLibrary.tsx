import React, { useEffect, useMemo, useState } from 'react'
import { Button, Divider, Drawer, Empty, Form, Input, message, Popconfirm, Select, Segmented, Space, Spin, Tag, Tooltip, Typography, Upload, Row, Col, Badge } from 'antd'
import { ApiOutlined, AppstoreAddOutlined, DeleteOutlined, EditOutlined, FileTextOutlined, FilterOutlined, InboxOutlined, PictureOutlined, PlusOutlined, SearchOutlined, SendOutlined, SaveOutlined, VideoCameraOutlined } from '@ant-design/icons'
import { useDrag } from 'react-dnd'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { useAssetLibraryStore, type Asset } from '../stores/assetLibraryStore'
import { DndItemTypes } from '../constants/dnd'
import TagsInput from './TagsInput'
import AssetLineagePanel from './AssetLineagePanel'
import { buildAssetMediaUrl } from '../utils/assetMedia'
import { assetMatchesSearch } from '../utils/assetSearch'

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
  { value: 'character', label: '角色' },
]

const quickCreateTypeOptions = [
  { value: 'image', label: '图像' },
  { value: 'prompt', label: '提示词' },
  { value: 'video', label: '视频' },
  { value: 'workflow', label: '工作流' },
] as const satisfies ReadonlyArray<{ value: Asset['type']; label: string }>

function pickWorkflowAssetMetadata(data: any) {
  const { workflow_json, parameters, ...metadata } = data || {}
  return metadata
}

function AssetItem({ asset, onAddToCanvas, onEdit, onDelete }: { asset: Asset; onAddToCanvas?: (asset: Asset) => void; onEdit?: (asset: Asset) => void; onDelete?: (asset: Asset) => void }) {
  const [hovered, setHovered] = useState(false)
  const [{ isDragging }, drag] = useDrag(() => ({ type: DndItemTypes.ASSET, item: { asset }, collect: monitor => ({ isDragging: monitor.isDragging() }) }))
  const icon = asset.type === 'image' ? <PictureOutlined /> : asset.type === 'video' ? <VideoCameraOutlined /> : asset.type === 'workflow' ? <ApiOutlined /> : asset.type === 'character' ? <AppstoreAddOutlined /> : <FileTextOutlined />
  const preview = asset.thumbnail || (asset.type === 'image' ? asset.data?.file_path : null)

  return <div ref={drag} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ padding: 10, border: '1px solid #f0f0f0', borderRadius: 8, background: isDragging ? '#e6f7ff' : '#fff' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {preview ? <img src={buildAssetMediaUrl(preview)} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} /> : <div style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', background: '#fafafa', borderRadius: 4 }}>{icon}</div>}
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
  const canvasReturnUrl = projectId ? `/project/${projectId}` : '/'
  const workflowCreateUrl = `/assets/workflow-config?returnUrl=${encodeURIComponent(canvasReturnUrl)}${projectId ? `&projectId=${projectId}` : ''}`
  const { assets, loading, scope, filterType, searchText, setScope, setFilterType, setSearchText, fetchAssets, createAsset, updateAsset, deleteAsset } = useAssetLibraryStore()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [editingForm] = Form.useForm()
  const [uploadedImageInfo, setUploadedImageInfo] = useState<any>(null)
  const [uploadedVideoInfo, setUploadedVideoInfo] = useState<any>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm] = Form.useForm()
  const [createType, setCreateType] = useState<(typeof quickCreateTypeOptions)[number]['value']>('prompt')
  const [createUploadedImage, setCreateUploadedImage] = useState<any>(null)
  const [createUploadedVideo, setCreateUploadedVideo] = useState<any>(null)

  useEffect(() => {
    setScope(projectId ? 'project' : 'global')
  }, [projectId, setScope])

  useEffect(() => { fetchAssets(projectId) }, [fetchAssets, projectId, scope])

  const allTags = useMemo(() => Array.from(new Set(assets.flatMap(a => a.tags || []))), [assets])
  const filteredAssets = useMemo(() => assets.filter(asset => (!filterType || asset.type === filterType) && assetMatchesSearch(asset, searchText) && (!selectedTag || asset.tags?.includes(selectedTag))), [assets, filterType, searchText, selectedTag])

  const parseTags = (value: unknown) => String(value || '').split(/[,，]/).map((s: string) => s.trim()).filter(Boolean)
  const uploadAssetFile = async (kind: 'image' | 'video', file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = kind === 'image'
      ? await apiClient.post('/assets/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      : await apiClient.post('/assets/upload/video', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return res.data
  }
  const resetCreateUploads = () => {
    setCreateUploadedImage(null)
    setCreateUploadedVideo(null)
  }
  const openEdit = (asset: Asset) => {
    setUploadedImageInfo(null)
    setUploadedVideoInfo(null)
    setEditingAsset(asset)
    editingForm.setFieldsValue({
      name: asset.name,
      description: asset.description || '',
      tags: asset.tags?.join(', ') || '',
      content: asset.data?.content || '',
      negative: asset.data?.negative_prompt || '',
      file_path: asset.data?.file_path || '',
      width: asset.data?.width,
      height: asset.data?.height,
      duration: asset.data?.duration,
      fps: asset.data?.fps,
      format: asset.data?.format,
      workflow_json: asset.data?.workflow_json ? JSON.stringify(asset.data.workflow_json, null, 2) : '',
      parameters: asset.data?.parameters ? JSON.stringify(asset.data.parameters, null, 2) : '',
    })
  }
  const buildEditData = (values: any) => {
    if (!editingAsset) return {}
    if (editingAsset.type === 'prompt') return { content: values.content || '', negative_prompt: values.negative || '' }
    if (editingAsset.type === 'workflow') return { ...pickWorkflowAssetMetadata(editingAsset.data), workflow_json: values.workflow_json ? JSON.parse(values.workflow_json) : {}, parameters: values.parameters ? JSON.parse(values.parameters) : {} }
    if (editingAsset.type === 'image') {
      const imgInfo = uploadedImageInfo || editingAsset.data || {}
      return { ...editingAsset.data, file_path: imgInfo.file_path, width: imgInfo.width, height: imgInfo.height, format: imgInfo.format }
    }
    if (editingAsset.type === 'video') {
      const vidInfo = uploadedVideoInfo || editingAsset.data || {}
      return { ...editingAsset.data, file_path: vidInfo.file_path, width: vidInfo.width, height: vidInfo.height, duration: vidInfo.duration, fps: vidInfo.fps, format: vidInfo.format }
    }
    return editingAsset.data
  }
  const saveEdit = async () => {
    if (!editingAsset) return
    const values = await editingForm.validateFields()
    await updateAsset(editingAsset.id, {
      name: values.name,
      description: values.description || '',
      tags: parseTags(values.tags),
      data: buildEditData(values),
    })
    message.success('资产已更新')
    setEditingAsset(null)
  }
  const buildCreateData = (values: any) => {
    if (createType === 'prompt') return { content: values.content || '', negative_prompt: values.negative || '' }
    if (createType === 'workflow') return { workflow_json: values.workflow_json ? JSON.parse(values.workflow_json) : {}, parameters: values.parameters ? JSON.parse(values.parameters) : {} }
    if (createType === 'image') {
      if (!createUploadedImage) {
        message.warning('请先上传图片')
        return null
      }
      return { file_path: createUploadedImage.file_path, width: createUploadedImage.width, height: createUploadedImage.height, format: createUploadedImage.format }
    }
    if (createType === 'video') {
      if (!createUploadedVideo) {
        message.warning('请先上传视频')
        return null
      }
      return { file_path: createUploadedVideo.file_path, width: createUploadedVideo.width, height: createUploadedVideo.height, duration: createUploadedVideo.duration, fps: createUploadedVideo.fps, format: createUploadedVideo.format }
    }
    return {}
  }
  const saveCreate = async () => {
    const values = await createForm.validateFields()
    const data = buildCreateData(values)
    if (!data) return
    await createAsset({
      type: createType,
      name: values.name,
      description: values.description || '',
      tags: parseTags(values.tags),
      project_id: scope === 'project' ? projectId || null : null,
      data,
    })
    message.success('资产已创建')
    setCreateOpen(false)
    createForm.resetFields()
    resetCreateUploads()
  }

  return <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
    <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
        <Badge count={filteredAssets.length} style={{ backgroundColor: '#52c41a' }}><Text strong>资产库</Text></Badge>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { setCreateType('prompt'); resetCreateUploads(); createForm.resetFields(); setCreateOpen(true) }}>新建</Button>
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
      {editingAsset && <Form form={editingForm} layout="vertical">
        <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="tags" label="标签"><TagsInput /></Form.Item>
        {editingAsset.type === 'prompt' && <>
          <Form.Item name="content" label="提示词"><Input.TextArea rows={6} /></Form.Item>
          <Form.Item name="negative" label="负面提示词"><Input.TextArea rows={3} /></Form.Item>
        </>}
        {editingAsset.type === 'image' && <>
          <Form.Item name="file_path" label="图片文件" rules={[{ required: true }]}>
            <Upload.Dragger
              accept="image/png,image/jpeg,image/webp,image/gif"
              showUploadList={false}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  const info = await uploadAssetFile('image', file as File)
                  setUploadedImageInfo(info)
                  editingForm.setFieldsValue({ file_path: info.file_path, width: info.width, height: info.height, format: info.format })
                  message.success('图片上传成功')
                  onSuccess?.(info)
                } catch {
                  message.error('图片上传失败')
                  onError?.(new Error('upload failed'))
                }
              }}
            >
              {uploadedImageInfo ? <div style={{ padding: 8 }}>
                <img src={buildAssetMediaUrl(uploadedImageInfo.file_path)} alt="preview" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 6, objectFit: 'contain' }} />
                <p style={{ marginTop: 8, color: '#52c41a', fontSize: 12 }}>{uploadedImageInfo.width} x {uploadedImageInfo.height} · {uploadedImageInfo.format?.toUpperCase()}</p>
              </div> : editingAsset.data?.file_path ? <div style={{ padding: 8 }}>
                <img src={buildAssetMediaUrl(editingAsset.data.file_path)} alt="current" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 6, objectFit: 'contain' }} />
                <p style={{ color: '#8c8c8c', fontSize: 12, marginTop: 8 }}>点击或拖拽新图片替换</p>
              </div> : <>
                <p className="ant-upload-drag-icon"><InboxOutlined style={{ fontSize: 32, color: '#1890ff' }} /></p>
                <p style={{ fontSize: 13 }}>点击或拖拽图片上传</p>
              </>}
            </Upload.Dragger>
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="width" label="宽度"><Input type="number" addonAfter="px" readOnly /></Form.Item></Col>
            <Col span={8}><Form.Item name="height" label="高度"><Input type="number" addonAfter="px" readOnly /></Form.Item></Col>
            <Col span={8}><Form.Item name="format" label="格式"><Input readOnly /></Form.Item></Col>
          </Row>
          {editingAsset.data?.source_model && <div style={{ background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 8, padding: 12, marginTop: 4 }}>
            <Text strong style={{ color: '#1d39c4', fontSize: 12, display: 'block', marginBottom: 8 }}>AI 生成溯源</Text>
            <Row gutter={[8, 6]}>
              <Col span={8}><Text type="secondary" style={{ fontSize: 10 }}>厂商</Text><div style={{ fontSize: 12, fontWeight: 600 }}>{editingAsset.data.source_provider || '-'}</div></Col>
              <Col span={8}><Text type="secondary" style={{ fontSize: 10 }}>模型</Text><div style={{ fontSize: 12, fontWeight: 600 }}>{editingAsset.data.source_model}</div></Col>
              <Col span={8}><Text type="secondary" style={{ fontSize: 10 }}>模式</Text><div style={{ fontSize: 12, fontWeight: 600 }}>{editingAsset.data.source_mode || '-'}</div></Col>
            </Row>
            {editingAsset.data.source_aspect_ratio && <Row gutter={[8, 6]} style={{ marginTop: 6 }}>
              <Col span={8}><Text type="secondary" style={{ fontSize: 10 }}>比例</Text><div style={{ fontSize: 12, fontWeight: 600 }}>{editingAsset.data.source_aspect_ratio}</div></Col>
              <Col span={16}><Text type="secondary" style={{ fontSize: 10 }}>分辨率</Text><div style={{ fontSize: 12, fontWeight: 600 }}>{editingAsset.data.source_size || '-'}</div></Col>
            </Row>}
            {editingAsset.data.source_prompt && <div style={{ marginTop: 6 }}>
              <Text type="secondary" style={{ fontSize: 10 }}>提示词</Text>
              <div style={{ background: '#fff', border: '1px solid #d9d9d9', borderRadius: 4, fontFamily: 'monospace', fontSize: 11, marginTop: 2, maxHeight: 80, overflow: 'auto', padding: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{editingAsset.data.source_prompt}</div>
            </div>}
            {editingAsset.data.source_camera_params && Object.keys(editingAsset.data.source_camera_params).length > 0 && <div style={{ marginTop: 6 }}>
              <Text type="secondary" style={{ fontSize: 10 }}>摄像机</Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                {Object.entries(editingAsset.data.source_camera_params).map(([key, value]) => <Tag key={key} color="blue" style={{ fontSize: 10, margin: 0 }}>{key}: {String(value)}</Tag>)}
              </div>
            </div>}
            <AssetLineagePanel data={editingAsset.data} sourceAssetIds={(editingAsset as any).source_asset_ids} fontSize={10} />
          </div>}
        </>}
        {editingAsset.type === 'video' && <>
          <Form.Item name="file_path" label="视频文件" rules={[{ required: true }]}>
            <Upload.Dragger
              accept="video/mp4,video/webm,video/quicktime"
              showUploadList={false}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  const info = await uploadAssetFile('video', file as File)
                  setUploadedVideoInfo(info)
                  editingForm.setFieldsValue({ file_path: info.file_path, width: info.width, height: info.height, duration: info.duration, fps: info.fps, format: info.format })
                  message.success('视频上传成功')
                  onSuccess?.(info)
                } catch {
                  message.error('视频上传失败')
                  onError?.(new Error('upload failed'))
                }
              }}
            >
              {uploadedVideoInfo ? <div style={{ padding: 8 }}>
                <VideoCameraOutlined style={{ fontSize: 32, color: '#eb2f96' }} />
                <p style={{ marginTop: 8, color: '#52c41a', fontSize: 12 }}>{uploadedVideoInfo.file_path?.split('/').pop()} · {uploadedVideoInfo.format?.toUpperCase()}</p>
              </div> : <>
                <p className="ant-upload-drag-icon"><InboxOutlined style={{ fontSize: 32, color: '#eb2f96' }} /></p>
                <p style={{ fontSize: 13 }}>点击或拖拽视频上传</p>
              </>}
            </Upload.Dragger>
          </Form.Item>
          <Row gutter={12}>
            <Col span={6}><Form.Item name="width" label="宽度"><Input type="number" addonAfter="px" readOnly /></Form.Item></Col>
            <Col span={6}><Form.Item name="height" label="高度"><Input type="number" addonAfter="px" readOnly /></Form.Item></Col>
            <Col span={6}><Form.Item name="duration" label="时长"><Input type="number" addonAfter="s" readOnly /></Form.Item></Col>
            <Col span={6}><Form.Item name="fps" label="帧率"><Input type="number" addonAfter="fps" readOnly /></Form.Item></Col>
          </Row>
          <Form.Item name="format" label="格式"><Input readOnly /></Form.Item>
        </>}
        {editingAsset.type === 'workflow' && <>
          <Button type="link" style={{ padding: 0, marginBottom: 12 }} onClick={() => navigate(`/assets/workflow-config/edit/${editingAsset.id}?returnUrl=${encodeURIComponent(canvasReturnUrl)}`)}>在完整编辑器中打开</Button>
          <Form.Item name="workflow_json" label="工作流 JSON"><Input.TextArea rows={8} style={{ fontFamily: 'monospace' }} /></Form.Item>
          <Form.Item name="parameters" label="参数映射 JSON"><Input.TextArea rows={5} style={{ fontFamily: 'monospace' }} /></Form.Item>
        </>}
      </Form>}
    </Drawer>

    <Drawer title="铸造新资产" open={createOpen} onClose={() => setCreateOpen(false)} width={480} extra={<Button type="primary" icon={<SaveOutlined />} onClick={saveCreate}>创建</Button>}>
      <Form form={createForm} layout="vertical">
        <Form.Item label="资产类型"><Segmented block value={createType} onChange={v => setCreateType(v as (typeof quickCreateTypeOptions)[number]['value'])} options={quickCreateTypeOptions} /></Form.Item>
        <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="tags" label="标签"><TagsInput /></Form.Item>
        {createType === 'prompt' && <>
          <Form.Item name="content" label="提示词" rules={[{ required: true }]}><Input.TextArea rows={6} /></Form.Item>
          <Form.Item name="negative" label="负面提示词"><Input.TextArea rows={3} /></Form.Item>
        </>}
        {createType === 'image' && <>
          <Form.Item label="上传图片" required>
            <Upload.Dragger
              accept="image/png,image/jpeg,image/webp,image/gif"
              showUploadList={false}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  const info = await uploadAssetFile('image', file as File)
                  setCreateUploadedImage(info)
                  message.success('图片上传成功')
                  onSuccess?.(info)
                } catch {
                  message.error('图片上传失败')
                  onError?.(new Error('upload failed'))
                }
              }}
            >
              {createUploadedImage ? <div style={{ padding: 8 }}>
                <img src={buildAssetMediaUrl(createUploadedImage.file_path)} alt="preview" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 6, objectFit: 'contain' }} />
                <p style={{ marginTop: 8, color: '#52c41a', fontSize: 12 }}>{createUploadedImage.width} x {createUploadedImage.height} · {createUploadedImage.format?.toUpperCase()}</p>
              </div> : <>
                <p className="ant-upload-drag-icon"><InboxOutlined style={{ fontSize: 32, color: '#1890ff' }} /></p>
                <p style={{ fontSize: 13 }}>点击或拖拽图片上传</p>
              </>}
            </Upload.Dragger>
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item label="宽度"><Input type="number" addonAfter="px" readOnly value={createUploadedImage?.width} /></Form.Item></Col>
            <Col span={8}><Form.Item label="高度"><Input type="number" addonAfter="px" readOnly value={createUploadedImage?.height} /></Form.Item></Col>
            <Col span={8}><Form.Item label="格式"><Input readOnly value={createUploadedImage?.format} /></Form.Item></Col>
          </Row>
        </>}
        {createType === 'video' && <>
          <Form.Item label="上传视频" required>
            <Upload.Dragger
              accept="video/mp4,video/webm,video/quicktime"
              showUploadList={false}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  const info = await uploadAssetFile('video', file as File)
                  setCreateUploadedVideo(info)
                  message.success('视频上传成功')
                  onSuccess?.(info)
                } catch {
                  message.error('视频上传失败')
                  onError?.(new Error('upload failed'))
                }
              }}
            >
              {createUploadedVideo ? <div style={{ padding: 8 }}>
                <VideoCameraOutlined style={{ fontSize: 32, color: '#eb2f96' }} />
                <p style={{ marginTop: 8, color: '#52c41a', fontSize: 12 }}>{createUploadedVideo.file_path?.split('/').pop()} · {createUploadedVideo.format?.toUpperCase()}</p>
              </div> : <>
                <p className="ant-upload-drag-icon"><InboxOutlined style={{ fontSize: 32, color: '#eb2f96' }} /></p>
                <p style={{ fontSize: 13 }}>点击或拖拽视频上传</p>
              </>}
            </Upload.Dragger>
          </Form.Item>
          <Row gutter={12}>
            <Col span={6}><Form.Item label="宽度"><Input type="number" addonAfter="px" readOnly value={createUploadedVideo?.width} /></Form.Item></Col>
            <Col span={6}><Form.Item label="高度"><Input type="number" addonAfter="px" readOnly value={createUploadedVideo?.height} /></Form.Item></Col>
            <Col span={6}><Form.Item label="时长"><Input type="number" addonAfter="s" readOnly value={createUploadedVideo?.duration} /></Form.Item></Col>
            <Col span={6}><Form.Item label="帧率"><Input type="number" addonAfter="fps" readOnly value={createUploadedVideo?.fps} /></Form.Item></Col>
          </Row>
          <Form.Item label="格式"><Input readOnly value={createUploadedVideo?.format} /></Form.Item>
        </>}
        {createType === 'workflow' && <><Button type="link" style={{ padding: 0, marginBottom: 12 }} onClick={() => navigate(workflowCreateUrl)}>在完整编辑器中打开</Button><Form.Item name="workflow_json" label="工作流 JSON" rules={[{ required: true }]}><Input.TextArea rows={8} style={{ fontFamily: 'monospace' }} /></Form.Item><Form.Item name="parameters" label="参数映射 JSON"><Input.TextArea rows={5} style={{ fontFamily: 'monospace' }} /></Form.Item></>}
      </Form>
    </Drawer>
  </div>
}
