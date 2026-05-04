import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Handle, Position, type NodeProps, useReactFlow, useUpdateNodeInternals } from 'reactflow'
import { Button, Card, Checkbox, Collapse, Divider, Input, InputNumber, Modal, Select, Space, Spin, Switch, Tag, Typography, message, Slider } from 'antd'
import { MessageOutlined, EyeOutlined, PictureOutlined, VideoCameraOutlined, PlayCircleOutlined, SaveOutlined, StopOutlined, SettingOutlined } from '@ant-design/icons'
import apiClient from '../../api/client'
import { nodeRegistry } from '../../utils/nodeRegistry'
import { useCanvasStore } from '../../stores/canvasStore'
import { useAssetLibraryStore } from '../../stores/assetLibraryStore'
import CameraControl, { buildCameraPromptSuffix } from '../CameraControl'
import CameraMovement from '../CameraMovement'

const { TextArea } = Input
const { Text } = Typography
const { Panel } = Collapse

const MODES = [
  { label: 'Chat', value: 'chat' },
  { label: 'Vision', value: 'vision' },
  { label: 'T2I', value: 'text_to_image' },
  { label: 'I2I', value: 'image_to_image' },
  { label: 'T2V', value: 'text_to_video' },
  { label: 'I2V', value: 'image_to_video' },
]

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1', size: '1024*1024' },
  { label: '3:4', value: '3:4', size: '768*1024' },
  { label: '4:3', value: '4:3', size: '1024*768' },
  { label: '16:9', value: '16:9', size: '1280*720' },
  { label: '9:16', value: '9:16', size: '720*1280' },
  { label: 'custom', value: 'custom', size: 'custom' },
]

const DEFAULT_ROLE = { id: '_free_agent', name: '🧠 自由智能体', prompt: '你是一个万能 AI 助手，严格遵循用户指令。' }

function extractJsonArray(text: string): any[] | null {
  const cleaned = text.replace(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/g, '$1').trim()
  try { const parsed = JSON.parse(cleaned); if (Array.isArray(parsed)) return parsed } catch {}
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (match) {
    try { const parsed = JSON.parse(match[0]); if (Array.isArray(parsed)) return parsed } catch {}
  }
  return null
}

function GenerateNodeImpl({ id, data }: NodeProps) {
  const updateNodeData = useCanvasStore(s => s.updateNodeData)
  const setNodeStatus = useCanvasStore(s => s.setNodeStatus)
  const { getEdges, getNodes } = useReactFlow()
  useUpdateNodeInternals(id)

  const assets = useAssetLibraryStore(s => s.assets)
  const [mode, setMode] = useState(data?.mode || 'chat')
  const [prompt, setPrompt] = useState(data?.prompt || '')
  const [systemPrompt, setSystemPrompt] = useState(data?.systemPrompt || '')
  const [model, setModel] = useState(data?.model || '')
  const [keyId, setKeyId] = useState(data?.keyId || '')
  const [aspectRatio, setAspectRatio] = useState(data?.aspectRatio || '16:9')
  const [customWidth, setCustomWidth] = useState<number>(data?.customWidth || 1920)
  const [customHeight, setCustomHeight] = useState<number>(data?.customHeight || 1080)
  const [useRoleAsset, setUseRoleAsset] = useState(Boolean(data?.useRoleAsset))
  const [roleAssetId, setRoleAssetId] = useState<number | null>(data?.roleAssetId || null)
  const [temperature, setTemperature] = useState<number>(data?.temperature ?? 0.7)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progressMsg, setProgressMsg] = useState('')
  const [result, setResult] = useState<any>(data?.result || null)

  // UI-only helper states for camera controls
  const [cameraOpen, setCameraOpen] = useState(false)
  const [movementOpen, setMovementOpen] = useState(false)
  const [cameraParams, setCameraParams] = useState<Record<string, string>>(data?.cameraParams || {})
  const [cameraCustomOptions, setCameraCustomOptions] = useState<Record<string, string[]>>(data?.cameraCustomOptions || {})
  const [customMovements, setCustomMovements] = useState<any[]>(data?.customMovements || [])

  const roleAssets = useMemo(() => assets.filter(a => a.type === 'prompt' && a.tags?.includes('SystemRole')), [assets])
  const selectedRolePrompt = useMemo(() => {
    if (useRoleAsset && roleAssetId) {
      const found = roleAssets.find(a => a.id === roleAssetId)
      return found?.data?.content || DEFAULT_ROLE.prompt
    }
    return systemPrompt || DEFAULT_ROLE.prompt
  }, [useRoleAsset, roleAssetId, roleAssets, systemPrompt])

  const selectedAspect = ASPECT_RATIOS.find(r => r.value === aspectRatio)
  const ratioSize = aspectRatio === 'custom' ? `${customWidth}*${customHeight}` : (selectedAspect?.size || '1024*1024')

  useEffect(() => {
    updateNodeData(id, {
      mode,
      prompt,
      systemPrompt,
      model,
      keyId,
      aspectRatio,
      customWidth,
      customHeight,
      useRoleAsset,
      roleAssetId,
      temperature,
      result,
      cameraParams,
      cameraCustomOptions,
      customMovements,
    })
  }, [id, mode, prompt, systemPrompt, model, keyId, aspectRatio, customWidth, customHeight, useRoleAsset, roleAssetId, temperature, result, cameraParams, cameraCustomOptions, customMovements, updateNodeData])

  useEffect(() => { setNodeStatus(id, loading ? 'running' : result ? 'success' : 'idle') }, [id, loading, result, setNodeStatus])

  useEffect(() => {
    const current = useCanvasStore.getState().nodes.find(n => n.id === id)?.data
    if (current?.result) setResult(current.result)
  }, [id])

  const resolveProvider = () => String(keyId || '')

  const buildPayload = () => {
    const edges = getEdges(); const nodes = getNodes(); const incomingEdges = edges.filter(e => e.target === id)
    let finalPromptText = prompt
    let incomingImage = ''
    let externalSystemPrompt = ''
    incomingEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      if (!sourceNode) return
      const sourceContent = sourceNode.data?.result?.content || sourceNode.data?.asset?.data?.content || sourceNode.data?.asset?.data?.file_path || sourceNode.data?.incoming_data?.content
      if (edge.targetHandle === 'text' && sourceContent) finalPromptText = finalPromptText ? `${finalPromptText}\n\n[参考素材]:\n${sourceContent}` : String(sourceContent)
      else if (edge.targetHandle === 'image' && sourceContent && !incomingImage) incomingImage = sourceContent.startsWith('http') || sourceContent.startsWith('data:') ? sourceContent : `http://localhost:8000/${sourceContent}`
      else if (edge.targetHandle === 'system' && sourceContent) externalSystemPrompt = String(sourceContent)
    })

    const activeSystemPrompt = externalSystemPrompt || selectedRolePrompt
    const cameraSuffix = buildCameraPromptSuffix(cameraParams)
    const payload: any = {
      api_key_id: Number(keyId) || undefined,
      provider: resolveProvider(),
      model,
      type: mode,
      prompt: finalPromptText + cameraSuffix,
      params: { temperature, size: ratioSize, client_id: id },
      messages: [{ role: 'system', content: activeSystemPrompt + cameraSuffix }],
    }
    if (mode === 'vision' && incomingImage) payload.messages.push({ role: 'user', content: [{ type: 'text', text: finalPromptText || '描述这张图片' }, { type: 'image_url', image_url: { url: incomingImage } }] })
    else payload.messages.push({ role: 'user', content: finalPromptText || '开始执行' })
    if (incomingImage) payload.image_url = incomingImage
    return payload
  }

  const handleRun = async () => {
    if (!keyId || !model) return message.warning('请完整选择 Key 和 模型')
    setLoading(true)
    setProgressMsg('正在唤醒云端大脑...')
    setNodeStatus(id, 'running')
    updateNodeData(id, { result: null, _finalSourcePrompt: prompt, _finalSystemPrompt: selectedRolePrompt })
    try {
      const payload = buildPayload()
      const res = await apiClient.request({ url: '/generate', method: 'POST', data: payload })
      const content = res.data?.content ?? res.data?.result?.content ?? res.data?.data?.content ?? res.data?.data ?? res.data
      let finalResult: any = typeof content === 'string' ? { content } : content || res.data

      if (typeof finalResult?.content === 'string') {
        const parsed = extractJsonArray(finalResult.content)
        if (parsed && parsed.length > 1) finalResult = { ...finalResult, _fission: true, items: parsed }
      }

      setResult(finalResult)
      updateNodeData(id, { result: finalResult })
      setNodeStatus(id, 'success')
      message.success('🧠 AI 思考完成！')

      if (!finalResult?._fission) {
        getEdges().filter(e => e.source === id).forEach(edge => {
          updateNodeData(edge.target, { incoming_data: finalResult })
        })
      }
    } catch (error: any) {
      message.error(`生成报错: ${error.response?.data?.detail || '未知错误'}`)
      setNodeStatus(id, 'error')
    } finally {
      setLoading(false)
      setProgressMsg('')
    }
  }

  const handleInterrupt = async () => {
    try { await apiClient.post(`/interrupt/${id}`); message.warning('已下发拦截指令') } catch { message.error('拦截信令发送失败') }
  }

  const handleSaveToAsset = async () => {
    if (!result?.content) return
    try {
      const contentStr = String(result.content)
      let assetType: 'prompt' | 'image' | 'video' = 'prompt'
      if (mode.includes('image') || contentStr.startsWith('http') || contentStr.startsWith('data:image')) assetType = 'image'
      else if (mode.includes('video')) assetType = 'video'
      await apiClient.post('/assets/', {
        name: `${assetType === 'image' ? '🖼️' : assetType === 'video' ? '🎬' : '📝'} ${prompt.slice(0, 10) || model}...`,
        type: assetType,
        data: {
          content: contentStr,
          source_provider: resolveProvider(),
          source_model: model,
          source_mode: mode,
          source_prompt: prompt,
          source_system: selectedRolePrompt,
          source_params: { temperature, size: ratioSize },
          source_aspect_ratio: aspectRatio,
          source_size: ratioSize,
        },
        tags: ['AI_Generated', mode, model],
        thumbnail: assetType === 'image' ? contentStr : undefined,
      })
      message.success('已携带溯源信息固化到资产库！')
    } catch {
      message.error('入库失败')
    }
  }

  const renderParams = () => null

  const renderDynamicHandles = () => (
    <>
      <Handle type="target" position={Position.Left} id="text" style={{ top: 70, background: '#52c41a', width: 12, height: 12 }} />
      {(mode === 'vision' || mode === 'image_to_image' || mode === 'image_to_video') && <Handle type="target" position={Position.Left} id="image" style={{ top: 110, background: '#1890ff', width: 12, height: 12 }} />}
      {(mode === 'chat' || mode === 'vision') && <Handle type="target" position={Position.Left} id="system" style={{ top: 30, background: '#fadb14', width: 12, height: 12 }} />}
    </>
  )

  return (
    <Card bordered={false} size="small" style={{ width: 360, borderRadius: 16, boxShadow: '0 14px 36px rgba(15,23,42,0.12)', overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
      <div className="custom-drag-handle" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, rgba(14,165,233,0.14), rgba(255,255,255,0))', borderBottom: '1px solid rgba(148,163,184,0.16)' }}>
        <Text strong>AI 大脑节点</Text>
        <Tag color="cyan">{mode.toUpperCase()}</Tag>
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Select value={mode} options={MODES} onChange={setMode} />
        <Input value={keyId} onChange={e => setKeyId(e.target.value)} placeholder="Key ID" />
        <Input value={model} onChange={e => setModel(e.target.value)} placeholder="Model name" />
        <TextArea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder="输入提示词..." />
        <Input value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="System prompt" />
        <Space wrap>
          <Select value={aspectRatio} onChange={setAspectRatio} style={{ width: 120 }} options={ASPECT_RATIOS.map(r => ({ value: r.value, label: r.label }))} />
          {aspectRatio === 'custom' && <><InputNumber value={customWidth} min={1} onChange={v => setCustomWidth(Number(v || 0))} /><InputNumber value={customHeight} min={1} onChange={v => setCustomHeight(Number(v || 0))} /></>}
          <InputNumber value={temperature} min={0} max={2} step={0.1} onChange={v => setTemperature(Number(v || 0))} />
        </Space>
        <Checkbox checked={useRoleAsset} onChange={e => setUseRoleAsset(e.target.checked)}>Use role asset</Checkbox>
        <Select value={roleAssetId ?? undefined} onChange={(v) => setRoleAssetId(v)} options={roleAssets.map(a => ({ value: a.id, label: a.name }))} placeholder="SystemRole 资产" allowClear />

        <Collapse ghost size="small" expandIconPosition="end" style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <Panel header={<Space><SettingOutlined style={{ color: '#64748b' }} /><Text style={{ color: '#334155' }}>相机与运镜</Text></Space>} key="camera">
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <CameraControl value={cameraParams} onChange={setCameraParams} open={cameraOpen} onOpenChange={setCameraOpen} customOptions={cameraCustomOptions} onCustomOptionsChange={setCameraCustomOptions} />
              <CameraMovement onInsert={(text) => setPrompt(prev => prev ? `${prev}\n${text}` : text)} open={movementOpen} onOpenChange={setMovementOpen} customPresets={customMovements} onAddCustom={(preset) => setCustomMovements(prev => [...prev, preset])} onRemoveCustom={(value) => setCustomMovements(prev => prev.filter(item => item.value !== value))} />
            </Space>
          </Panel>
        </Collapse>

        {renderParams()}
        <Space>
          <Button size="small" type="primary" onClick={handleRun} loading={loading} icon={<PlayCircleOutlined />}>运行</Button>
          <Button size="small" onClick={handleInterrupt} icon={<StopOutlined />}>中断</Button>
          <Button size="small" onClick={handleSaveToAsset} icon={<SaveOutlined />}>入库</Button>
        </Space>
        {loading && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Spin size="small" /><Text type="secondary" style={{ fontSize: 12 }}>{progressMsg}</Text></div>}
        {result?.content && <Button size="small" onClick={() => setPreviewOpen(true)} icon={<EyeOutlined />}>预览结果</Button>}
        <Divider style={{ margin: '8px 0' }} />
        <Text type="secondary" style={{ fontSize: 12 }}>节点能力已迁入完整运行链路。</Text>
      </div>
      {renderDynamicHandles()}
      <Handle type="source" position={Position.Right} style={{ background: '#0ea5e9' }} />
      <Modal open={previewOpen} onCancel={() => setPreviewOpen(false)} footer={null} title="结果预览" width={720}>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{JSON.stringify(result, null, 2)}</pre>
      </Modal>
    </Card>
  )
}

nodeRegistry.register({ type: 'generate', displayName: 'AI 大脑节点', component: GenerateNodeImpl })
export default GenerateNodeImpl
