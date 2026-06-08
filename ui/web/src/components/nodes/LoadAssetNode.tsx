import React from 'react'
import { Handle, Position, type Edge, type NodeProps, useReactFlow } from 'reactflow'
import { useDrop } from 'react-dnd'
import { Button, Empty, Input, Tooltip, Typography, message } from 'antd'
import { EditOutlined, FileImageOutlined, SaveOutlined } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import { BaseNode } from './BaseNode'
import { nodeRegistry } from '../../utils/nodeRegistry'
import { DndItemTypes } from '../../constants/dnd'
import { useCanvasStore } from '../../stores/canvasStore'
import apiClient from '../../api/client'
import { buildAssetMediaUrl } from '../../utils/assetMedia'

const { Text } = Typography
const { TextArea } = Input

type LoadableAsset = {
  id?: number
  name?: string
  type?: string
  thumbnail?: string
  data?: Record<string, any>
}

export function resolveAssetOutputType(asset: LoadableAsset | null | undefined) {
  if (!asset?.type) return 'any'
  return asset.type === 'prompt' || asset.type === 'character' ? 'text' : asset.type
}

export function buildLoadAssetNodeDataPatch(asset: LoadableAsset) {
  const outputType = resolveAssetOutputType(asset)
  return {
    asset,
    outputs: { output: { type: outputType, label: asset.name || '资产输出' } },
    label: asset.name || '资产输入',
  }
}

export function resolveAssetPreviewValue(asset: LoadableAsset | null | undefined, apiBaseURL?: string) {
  if (!asset) return ''
  const raw = asset.type === 'video'
    ? (asset.data?.file_path || asset.data?.url || asset.data?.content || '')
    : (asset.thumbnail || asset.data?.content || asset.data?.core_prompt || asset.data?.file_path || asset.data?.url || '')
  if (!raw) return ''
  const value = String(raw)
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  if (asset.type === 'image' || asset.type === 'video' || /\.(png|jpg|jpeg|webp|gif|mp4|webm|mov)$/i.test(value)) {
    return buildAssetMediaUrl(value, apiBaseURL)
  }
  if (value.startsWith('/api/')) return value
  return value
}

export function resolveEditableAssetContent(asset: LoadableAsset | null | undefined) {
  if (!asset) return ''
  return String(asset.data?.content || asset.data?.core_prompt || asset.data?.file_path || '')
}

export function buildEditedLoadAssetDataPatch(asset: LoadableAsset, content: string) {
  if (asset.type === 'character') {
    const { content: _staleContent, ...restData } = asset.data || {}
    return {
      asset: {
        ...asset,
        data: { ...restData, core_prompt: content },
      },
    }
  }
  return {
    asset: {
      ...asset,
      data: { ...(asset.data || {}), content },
    },
  }
}

export function buildLoadAssetRunPropagation(input: {
  sourceId: string
  data: Record<string, any>
  edges: Edge[]
}) {
  const assetData = input.data?.asset?.data
  if (!assetData) return { status: 'error' as const, targetPatches: {} as Record<string, { incoming_data: any }> }
  const targetPatches: Record<string, { incoming_data: any }> = {}
  input.edges.filter(edge => edge.source === input.sourceId).forEach(edge => {
    targetPatches[edge.target] = { incoming_data: assetData }
  })
  return { status: 'success' as const, targetPatches }
}

export function buildModifiedAssetPayload(input: {
  asset?: LoadableAsset | null
  content: string
  projectId?: number | null
}) {
  const type = input.asset?.type || 'prompt'
  const data: Record<string, any> = type === 'character'
    ? { core_prompt: input.content }
    : { content: input.content }
  if (type !== 'prompt' && type !== 'character') data.file_path = input.content
  return {
    name: `${input.asset?.name || '新资产'} (修改版)`,
    type,
    data,
    tags: ['Modified_Asset'],
    project_id: input.projectId ?? null,
  }
}

function handleColorForOutput(outputType: string) {
  if (outputType === 'text') return '#52c41a'
  if (outputType === 'image') return '#1890ff'
  if (outputType === 'video') return '#eb2f96'
  if (outputType === 'workflow') return '#722ed1'
  return '#d9d9d9'
}

function isVideoPreview(asset: LoadableAsset | null, previewValue: string) {
  return asset?.type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(previewValue)
}

function LoadAssetNodeImpl(props: NodeProps) {
  const { id, data, isConnectable } = props
  const { id: routeProjectId } = useParams<{ id: string }>()
  const { updateNodeData, setNodeStatus } = useCanvasStore()
  const { getEdges } = useReactFlow()
  const [asset, setAsset] = React.useState<LoadableAsset | null>(data?.asset || null)
  const [content, setContent] = React.useState(resolveEditableAssetContent(data?.asset))
  const [isSaving, setIsSaving] = React.useState(false)
  const [mediaDims, setMediaDims] = React.useState('')
  const prevSignalRef = React.useRef(data?._runSignal)
  const projectId = Number(routeProjectId || 0) || null

  React.useEffect(() => {
    if (!data?._runSignal || data._runSignal === prevSignalRef.current) return
    prevSignalRef.current = data._runSignal
    const plan = buildLoadAssetRunPropagation({ sourceId: id, data, edges: getEdges() })
    setNodeStatus(id, plan.status)
    Object.entries(plan.targetPatches).forEach(([targetId, patch]) => updateNodeData(targetId, patch))
  }, [data?._runSignal, data, id, getEdges, setNodeStatus, updateNodeData])

  React.useEffect(() => {
    if (!data?.asset) return
    setAsset(data.asset)
    setContent(resolveEditableAssetContent(data.asset))
    setMediaDims('')
  }, [data?.asset])

  const handleAssetDrop = (droppedAsset: LoadableAsset) => {
    setAsset(droppedAsset)
    setContent(resolveEditableAssetContent(droppedAsset))
    setMediaDims('')
    updateNodeData(id, buildLoadAssetNodeDataPatch(droppedAsset))
    message.success('成功载入资产')
  }

  const [{ isOver }, drop] = useDrop(() => ({
    accept: DndItemTypes.ASSET,
    drop: (item: { asset: LoadableAsset }) => { if (item.asset) handleAssetDrop(item.asset) },
    collect: monitor => ({ isOver: monitor.isOver() }),
  }), [id, updateNodeData])

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextContent = event.target.value
    setContent(nextContent)
    if (!asset) return
    const { asset: nextAsset } = buildEditedLoadAssetDataPatch(asset, nextContent)
    setAsset(nextAsset)
    updateNodeData(id, { asset: nextAsset })
  }

  const handleSaveAsNewAsset = async () => {
    if (!content.trim()) {
      message.warning('内容为空')
      return
    }
    setIsSaving(true)
    try {
      await apiClient.post('/assets/', buildModifiedAssetPayload({ asset, content, projectId }))
      message.success('已固化为新资产')
    } catch (error: any) {
      message.error(`保存失败: ${error?.response?.data?.error || error?.message || error}`)
    } finally {
      setIsSaving(false)
    }
  }

  const renderPreview = () => {
    if (!asset) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description="拖拽资产到此" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )
    }

    const previewValue = resolveAssetPreviewValue(asset)
    const isMedia = asset.type === 'image' || asset.type === 'video'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <Text strong style={{ fontSize: 13, color: '#475569' }}>
            {isMedia ? <><FileImageOutlined /> 媒体预览</> : <><EditOutlined /> 内容编辑</>}
          </Text>
          {!isMedia && (
            <Tooltip title="将修改后的内容另存为新资产">
              <Button type="primary" size="small" icon={<SaveOutlined />} loading={isSaving} onClick={handleSaveAsNewAsset}>固化</Button>
            </Tooltip>
          )}
        </div>

        <div style={{ flex: 1, position: 'relative', background: isMedia ? '#f1f5f9' : '#ffffff', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', minHeight: 80, display: isMedia ? 'flex' : 'block', alignItems: 'center', justifyContent: 'center' }}>
          {isMedia && mediaDims && (
            <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(15, 23, 42, 0.75)', color: '#f8fafc', fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, zIndex: 10, fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.1)' }}>
              {mediaDims}
            </div>
          )}
          {isMedia ? (
            isVideoPreview(asset, previewValue) ? (
              <video src={previewValue} controls loop muted style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} onLoadedMetadata={event => setMediaDims(`${(event.target as HTMLVideoElement).videoWidth} × ${(event.target as HTMLVideoElement).videoHeight}`)} />
            ) : (
              <img src={previewValue} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} onLoad={event => setMediaDims(`${(event.target as HTMLImageElement).naturalWidth} × ${(event.target as HTMLImageElement).naturalHeight}`)} />
            )
          ) : (
            <TextArea
              className="nodrag nowheel"
              value={content}
              onChange={handleContentChange}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', resize: 'none', fontSize: 13, color: '#1e293b', fontFamily: 'monospace', borderRadius: 8, border: 'none', padding: 8 }}
            />
          )}
        </div>
      </div>
    )
  }

  const renderHandle = () => {
    if (!asset) return null
    const outputType = resolveAssetOutputType(asset)
    return (
      <Tooltip title={`输出 ${outputType}`} placement="right">
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          isConnectable={isConnectable}
          style={{ background: handleColorForOutput(outputType), width: 12, height: 12, border: '2px solid #fff' }}
        />
      </Tooltip>
    )
  }

  return (
    <BaseNode {...props} data={{ ...data, label: data?._customLabel ? data.label : (asset ? `资产 ${asset.name}` : '资产输入') }}>
      {renderHandle()}
      <div
        ref={drop}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isOver ? 'rgba(24,144,255,0.05)' : 'transparent',
          transition: 'background-color 0.2s ease',
        }}
      >
        {renderPreview()}
      </div>
    </BaseNode>
  )
}

nodeRegistry.register({
  type: 'loadAsset',
  displayName: '资产输入节点',
  component: LoadAssetNodeImpl,
  defaultData: { label: '资产输入', asset: null },
})

export default LoadAssetNodeImpl
