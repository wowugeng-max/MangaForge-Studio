import React from 'react'
import { Position, type Edge, type NodeProps, useReactFlow } from 'reactflow'
import { Button, Input, Modal, Tooltip, Typography, message } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import { BaseNode } from './BaseNode'
import { TypedHandle } from './TypedHandle'
import { nodeRegistry } from '../../utils/nodeRegistry'
import { useAssetLibraryStore } from '../../stores/assetLibraryStore'
import { useCanvasStore } from '../../stores/canvasStore'
import apiClient from '../../api/client'
import { buildAssetMediaUrl } from '../../utils/assetMedia'
import { pickMediaResultContent } from '../../utils/mediaResult'

const { Text } = Typography

type DisplayMediaType = 'text' | 'image' | 'video'

function firstDefined(...values: any[]) {
  return values.find(value => value !== undefined && value !== null)
}

function inferMediaType(content: string, rawData: any): DisplayMediaType {
  if (rawData?.type === 'video' || /\.(mp4|webm|mov|gif)(\?|$)/i.test(content) || content.startsWith('data:video')) return 'video'
  if (rawData?.type === 'image' || /\.(jpeg|jpg|png|webp|gif)(\?|$)/i.test(content) || content.startsWith('data:image')) return 'image'
  return 'text'
}

function normalizeMediaSrc(content: string, mediaType: DisplayMediaType, apiBaseURL?: string) {
  if (!content || mediaType === 'text') return content
  if (/^(https?:|data:|blob:)/i.test(content)) return content
  if (content.startsWith('/api/') && !content.startsWith('/api/assets/media/')) return content
  return buildAssetMediaUrl(content, apiBaseURL)
}

export function resolveDisplayContent(data: Record<string, any>, apiBaseURL?: string) {
  const rawData = firstDefined(data?.incoming_data, data?.result, data?.asset?.data, data?.content)
  let displayContent = ''
  if (rawData !== undefined && rawData !== null) {
    if (typeof rawData === 'string') {
      displayContent = rawData
    } else if (typeof rawData === 'object') {
      displayContent = pickMediaResultContent(rawData) || JSON.stringify(rawData, null, 2)
    } else {
      displayContent = String(rawData)
    }
  }
  if (typeof displayContent !== 'string') displayContent = String(displayContent)
  const mediaType = inferMediaType(displayContent, rawData)
  return {
    rawData,
    displayContent,
    mediaSrc: normalizeMediaSrc(displayContent, mediaType, apiBaseURL),
    mediaType,
  }
}

export function buildDisplayPropagationPlan(input: {
  sourceId: string
  data: Record<string, any>
  edges: Edge[]
}) {
  const { rawData } = resolveDisplayContent(input.data)
  if (rawData === undefined || rawData === null || rawData === '') {
    return { status: null as null, targetPatches: {} as Record<string, { incoming_data: any }> }
  }
  const outData = typeof rawData === 'object' ? rawData : { content: rawData }
  const targetPatches: Record<string, { incoming_data: any }> = {}
  input.edges.filter(edge => edge.source === input.sourceId).forEach(edge => {
    targetPatches[edge.target] = { incoming_data: outData }
  })
  return { status: 'success' as const, targetPatches }
}

function parseMediaDims(mediaDims: string) {
  const match = String(mediaDims || '').match(/(\d+)\s*[×x]\s*(\d+)/)
  if (!match) return {}
  return { width: Number(match[1]), height: Number(match[2]) }
}

function normalizeSourceAssetIds(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  const ids = value.map(item => Number(item)).filter(id => Number.isFinite(id))
  return ids.length ? ids : []
}

function displayLineageSource(data: Record<string, any>, rawData: any) {
  if (typeof rawData === 'object' && rawData) return rawData
  if (typeof data?.incoming_data === 'object' && data.incoming_data) return data.incoming_data
  if (typeof data?.result === 'object' && data.result) return data.result
  if (typeof data?.asset?.data === 'object' && data.asset.data) return data.asset.data
  return {}
}

export function buildDisplayAssetPayload(input: {
  assetName: string
  projectId?: number | null
  mediaDims?: string
  data: Record<string, any>
}) {
  const resolved = resolveDisplayContent(input.data)
  const upstream = displayLineageSource(input.data, resolved.rawData)
  const lineage = Object.fromEntries(Object.entries(upstream).filter(([key]) => key.startsWith('source_')))
  const sourceAssetIds = normalizeSourceAssetIds(upstream.source_asset_ids ?? upstream.sourceAssetIds)
  const dimensions = parseMediaDims(input.mediaDims || '')
  const assetType = resolved.mediaType === 'video' ? 'video' : (resolved.mediaType === 'image' ? 'image' : 'prompt')
  const assetData: Record<string, any> = {
    content: resolved.displayContent,
    ...lineage,
    ...(sourceAssetIds !== undefined ? { source_asset_ids: sourceAssetIds } : {}),
    ...dimensions,
  }
  if (resolved.mediaType !== 'text') {
    assetData.url = resolved.displayContent
    assetData.file_path = resolved.displayContent
  }
  return {
    name: input.assetName,
    type: assetType,
    ...(resolved.mediaType !== 'text' ? { file_path: resolved.displayContent } : {}),
    ...(sourceAssetIds !== undefined ? { source_asset_ids: sourceAssetIds } : {}),
    data: assetData,
    tags: ['Display_Saved'],
    ...(resolved.mediaType === 'image' ? { thumbnail: resolved.displayContent } : {}),
    project_id: input.projectId ?? null,
  }
}

function DisplayNodeImpl(props: NodeProps) {
  const { id, data } = props
  const { id: routeProjectId } = useParams<{ id: string }>()
  const fetchAssets = useAssetLibraryStore(state => state.fetchAssets)
  const { setNodeStatus, updateNodeData } = useCanvasStore()
  const { getEdges } = useReactFlow()
  const [assetName, setAssetName] = React.useState('')
  const [isModalVisible, setIsModalVisible] = React.useState(false)
  const [savingAsset, setSavingAsset] = React.useState(false)
  const [mediaDims, setMediaDims] = React.useState('')
  const prevSignalRef = React.useRef(data?._runSignal)
  const prevIncomingRef = React.useRef(data?.incoming_data)
  const projectId = Number(routeProjectId || 0) || null
  const { displayContent, mediaSrc, mediaType } = resolveDisplayContent(data || {})

  const propagateIfReady = React.useCallback(() => {
    const plan = buildDisplayPropagationPlan({ sourceId: id, data: data || {}, edges: getEdges() })
    if (plan.status) setNodeStatus(id, plan.status)
    Object.entries(plan.targetPatches).forEach(([targetId, patch]) => updateNodeData(targetId, patch))
  }, [id, data, getEdges, setNodeStatus, updateNodeData])

  React.useEffect(() => {
    if (!data?._runSignal || data._runSignal === prevSignalRef.current) return
    prevSignalRef.current = data._runSignal
    propagateIfReady()
  }, [data?._runSignal, propagateIfReady])

  React.useEffect(() => {
    if (!data?.incoming_data || data.incoming_data === prevIncomingRef.current) return
    prevIncomingRef.current = data.incoming_data
    propagateIfReady()
  }, [data?.incoming_data, propagateIfReady])

  React.useEffect(() => { setMediaDims('') }, [displayContent])

  const handleSaveToAsset = async () => {
    if (!displayContent) {
      message.warning('没有可保存的内容')
      return
    }
    if (!assetName.trim()) {
      message.warning('请输入资产名称')
      return
    }
    setSavingAsset(true)
    try {
      await apiClient.post('/assets/', buildDisplayAssetPayload({
        assetName: assetName.trim(),
        projectId,
        mediaDims,
        data: data || {},
      }))
      message.success('已保存到资产库')
      setIsModalVisible(false)
      setAssetName('')
      if (projectId) await fetchAssets(projectId)
    } catch (error: any) {
      message.error(`保存失败: ${error?.response?.data?.error || error?.response?.data?.detail || error?.message || error}`)
    } finally {
      setSavingAsset(false)
    }
  }

  const nodeCollapsed = Boolean(data?._collapsed)

  return (
    <>
      <TypedHandle id="in" type="target" position={Position.Left} dataType="any" label="通用输入" collapsed={nodeCollapsed} />
      <BaseNode {...props} data={{ ...data, label: data?._customLabel ? data.label : '结果展示' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
          <Text type="secondary" style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>VISUAL_OUTPUT</Text>
          {displayContent && (
            <Tooltip title="固化为资产">
              <Button type="text" size="small" icon={<SaveOutlined />} onClick={() => setIsModalVisible(true)} style={{ color: '#0ea5e9', fontSize: 16 }} />
            </Tooltip>
          )}
        </div>

        <div style={{ flex: 1, position: 'relative', background: mediaType === 'text' ? '#f8fafc' : '#f1f5f9', borderRadius: 8, border: '1px solid #cbd5e1', overflow: 'hidden', minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {mediaType !== 'text' && mediaDims && (
            <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(15,23,42,0.75)', color: '#f8fafc', fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, zIndex: 10, fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.1)' }}>
              {mediaDims}
            </div>
          )}

          {displayContent ? (
            mediaType === 'video' ? (
              <video src={mediaSrc} controls autoPlay loop muted style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} onLoadedMetadata={event => setMediaDims(`${(event.target as HTMLVideoElement).videoWidth} × ${(event.target as HTMLVideoElement).videoHeight}`)} />
            ) : mediaType === 'image' ? (
              <img src={mediaSrc} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} alt="Display" onLoad={event => setMediaDims(`${(event.target as HTMLImageElement).naturalWidth} × ${(event.target as HTMLImageElement).naturalHeight}`)} />
            ) : (
              <div className="nodrag nowheel" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: 12, overflowY: 'auto', fontSize: 13, color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {displayContent}
              </div>
            )
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text type="secondary" style={{ fontSize: 13, color: '#94a3b8' }}>等待信号输入...</Text>
            </div>
          )}
        </div>
      </div>

      </BaseNode>
      <TypedHandle id="out" type="source" position={Position.Right} dataType="any" label="通用输出" collapsed={nodeCollapsed} />

      <Modal title="保存资产" open={isModalVisible} onOk={handleSaveToAsset} onCancel={() => setIsModalVisible(false)} confirmLoading={savingAsset} okText="保存" cancelText="取消" width={320}>
        <Input placeholder="给这个资产起个名字" value={assetName} onChange={event => setAssetName(event.target.value)} autoFocus />
      </Modal>
    </>
  )
}

nodeRegistry.register({
  type: 'display',
  displayName: '结果展示节点',
  component: DisplayNodeImpl,
  defaultData: { label: '结果展示' },
})

export default DisplayNodeImpl
