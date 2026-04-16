import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Col, Input, Row, Select, Space, Tag, Typography, message } from 'antd'
import { ArrowLeftOutlined, ApartmentOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { PipelineGraphPage } from './PipelineGraphPage'
import { useGraphStore } from '../stores/graphStore'
import { useAppStore } from '../stores/appStore'
import { useCanvasStore } from '../stores/canvasStore'
import { ComfyUIEngineNode, DisplayNode, GenerateNode, GroupNode, LoadAssetNode } from '../components/nodes'
import { providerApi } from '../api/providers'
import { keyApi } from '../api/keys'
import { modelApi } from '../api/models'

const { Title, Text } = Typography

type NodeTemplate = {
  id: string
  projectId: string
  name: string
  node: string
  payload: {
    title: string
    premise: string
    panelTarget: number
    stylePreset: string
    consistencyLevel: 'low' | 'medium' | 'high'
    beatFramework: 'three-act' | 'five-act'
    premiseA: string
    premiseB: string
    rankInput: string
  }
}

export function CanvasPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { selectedNode } = useGraphStore()
  const [templateName, setTemplateName] = React.useState('')
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | undefined>(undefined)
  const [templates, setTemplates] = React.useState<NodeTemplate[]>([])

  const { nodes, nodeRunStatus, addNode, createGroup, dissolveGroup, updateNodeData } = useCanvasStore()
  const [assetId, setAssetId] = React.useState<string | undefined>(undefined)
  const [nodePrompt, setNodePrompt] = React.useState('')
  const [engineProvider, setEngineProvider] = React.useState<string | undefined>(undefined)
  const [engineKeyId, setEngineKeyId] = React.useState<string | undefined>(undefined)
  const [engineModel, setEngineModel] = React.useState<string | undefined>(undefined)

  const [providerOptions, setProviderOptions] = React.useState<Array<{ label: string; value: string }>>([])
  const [keyOptions, setKeyOptions] = React.useState<Array<{ label: string; value: string }>>([])
  const [modelOptions, setModelOptions] = React.useState<Array<{ label: string; value: string }>>([])

  const [allKeys, setAllKeys] = React.useState<Array<{ id: number; provider: string }>>([])

  React.useEffect(() => {
    async function loadEngineOptions() {
      try {
        const providerRes = await providerApi.getAll()
        const providers = Array.isArray(providerRes.data) ? providerRes.data : []
        setProviderOptions(providers.map(p => ({ label: p.display_name, value: p.id })))

        const keyRes = await keyApi.getAll()
        const keys = Array.isArray(keyRes.data) ? keyRes.data : []
        setAllKeys(keys.map(k => ({ id: k.id, provider: k.provider })))
        setKeyOptions(keys.map(k => ({ label: `${k.provider}#${k.id}`, value: String(k.id) })))

        if (keys.length > 0) {
          const modelRes = await modelApi.getByKeyId(keys[0].id)
          const models = Array.isArray(modelRes.data) ? modelRes.data : []
          setModelOptions(models.map(m => ({ label: m.model_name, value: m.model_name })))
        } else {
          setModelOptions([])
        }
      } catch (error) {
        message.warning(`加载引擎选项失败: ${String(error)}`)
      }
    }

    loadEngineOptions().catch(() => undefined)
  }, [])

  React.useEffect(() => {
    if (!engineProvider) return
    const filtered = allKeys.filter(k => k.provider === engineProvider)
    setKeyOptions(filtered.map(k => ({ label: `${k.provider}#${k.id}`, value: String(k.id) })))

    const keyStillValid = filtered.some(k => String(k.id) === engineKeyId)
    if (!keyStillValid) {
      setEngineKeyId(undefined)
      setEngineModel(undefined)
      setModelOptions([])
    }
  }, [engineProvider, allKeys])

  React.useEffect(() => {
    updateNodeData('generate', { prompt: nodePrompt })
    updateNodeData('display', {
      imageUrl: nodePrompt.trim()
        ? `https://dummyimage.com/800x450/e2e8f0/334155&text=${encodeURIComponent(nodePrompt.slice(0, 40))}`
        : undefined,
      text: nodePrompt.trim() ? `Preview: ${nodePrompt}` : '暂无生成结果',
    })
    updateNodeData('engine', {
      provider: engineProvider,
      apiKeyId: engineKeyId,
      model: engineModel,
    })
  }, [nodePrompt, engineProvider, engineKeyId, engineModel, updateNodeData])
  const {
    title,
    setTitle,
    premise,
    setPremise,
    panelTarget,
    setPanelTarget,
    stylePreset,
    setStylePreset,
    consistencyLevel,
    setConsistencyLevel,
    beatFramework,
    setBeatFramework,
    premiseA,
    setPremiseA,
    premiseB,
    setPremiseB,
    rankInput,
    setRankInput,
  } = useAppStore()

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>返回项目大厅</Button>
          <Tag color="blue">Project ID: {id}</Tag>
        </Space>
        <Space>
          <Button icon={<ApartmentOutlined />} onClick={() => navigate('/graph')}>打开 Pipeline Graph</Button>
          <Button
            onClick={() => {
              addNode({ id: 'n1', type: 'generate', position: { x: 80, y: 80 }, data: { label: '生成节点 A' } })
              addNode({ id: 'n2', type: 'load-asset', position: { x: 320, y: 80 }, data: { label: '资产节点 B' } })
              message.success('已添加示例节点')
            }}
          >
            添加示例节点
          </Button>
          <Button
            onClick={() => {
              const groupId = createGroup(['n1', 'n2'], '示例组')
              if (groupId) message.success(`已创建分组: ${groupId}`)
              else message.warning('分组失败（请先添加两个未分组节点）')
            }}
          >
            创建分组
          </Button>
          <Button
            onClick={() => {
              const latestGroup = [...nodes].reverse().find(n => n.type === 'nodeGroup')
              if (!latestGroup) return message.warning('没有可解散的分组')
              dissolveGroup(latestGroup.id)
              message.success(`已解散分组: ${latestGroup.id}`)
            }}
          >
            解散分组
          </Button>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => navigate('/pipeline')}>打开 Pipeline Workbench</Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col span={17}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Title level={3} style={{ marginTop: 0 }}>无限画布工作台</Title>
            <Text type="secondary">
              在当前项目内直接编排节点、资产与执行链路。
            </Text>

            <Row gutter={12} style={{ marginTop: 12, marginBottom: 12 }}>
              <Col span={24}>
                <GroupNode
                  status={nodeRunStatus['node-group']}
                  label="示例组"
                  nodeCount={nodes.filter(n => n.parentNode).length}
                  muted={false}
                />
              </Col>
              <Col span={12}>
                <LoadAssetNode
                  status={nodeRunStatus['load-asset']}
                  assetId={assetId}
                  onChange={setAssetId}
                  options={[
                    { label: '主角猫设定', value: 'asset-cat' },
                    { label: '星舰机库', value: 'asset-hangar' },
                    { label: '霓虹街道风格', value: 'asset-style-neon' },
                  ]}
                />
              </Col>
              <Col span={12}>
                <GenerateNode
                  status={nodeRunStatus['generate']}
                  prompt={nodePrompt}
                  onPromptChange={setNodePrompt}
                />
              </Col>
              <Col span={24}>
                <ComfyUIEngineNode
                  status={nodeRunStatus['engine']}
                  provider={engineProvider}
                  apiKeyId={engineKeyId}
                  model={engineModel}
                  providerOptions={providerOptions}
                  keyOptions={keyOptions}
                  modelOptions={modelOptions}
                  onProviderChange={setEngineProvider}
                  onKeyChange={async keyId => {
                    setEngineKeyId(keyId)
                    setEngineModel(undefined)
                    try {
                      const modelRes = await modelApi.getByKeyId(Number(keyId))
                      const models = Array.isArray(modelRes.data) ? modelRes.data : []
                      setModelOptions(models.map(m => ({ label: m.model_name, value: m.model_name })))
                      if (models.length === 0) message.info('暂无模型，请先在 Keys 中同步模型')
                    } catch (error) {
                      message.warning(`加载模型失败: ${String(error)}`)
                    }
                  }}
                  onModelChange={setEngineModel}
                />
              </Col>
              <Col span={24}>
                <DisplayNode
                  status={nodeRunStatus['display']}
                  imageUrl={(nodes.find(n => n.id === 'display')?.data?.imageUrl as string | undefined) ?? undefined}
                  text={(nodes.find(n => n.id === 'display')?.data?.text as string | undefined) ?? '暂无生成结果'}
                />
              </Col>
            </Row>

            <div style={{ marginTop: 16 }}>
              <PipelineGraphPage />
            </div>
          </Card>
        </Col>
        <Col span={7}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Title level={5} style={{ marginTop: 0 }}>节点参数侧栏</Title>
            <div style={{ marginBottom: 10, color: '#64748b', fontSize: 13 }}>
              当前项目：{id} · 选中节点：<strong>{selectedNode ?? '(none)'}</strong>
            </div>

            <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }}>
              <Input
                placeholder="模板名（例如：高张力三幕式）"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
              />
              <Space wrap>
                <Button
                  danger
                  onClick={() => {
                    if (!selectedNode) return message.warning('请先选择一个节点')
                    const scoped = templates.filter(t => t.node === selectedNode && t.projectId === (id ?? 'default'))
                    if (scoped.length === 0) return message.warning('当前节点没有可删除模板')
                    setTemplates(prev => prev.filter(t => !(t.node === selectedNode && t.projectId === (id ?? 'default'))))
                    message.success('已删除当前节点的全部模板')
                  }}
                >
                  删除本节点模板
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedNode) return message.warning('请先选择一个节点')
                    if (!templateName.trim()) return message.warning('请输入模板名称')
                    const payload = { title, premise, panelTarget, stylePreset, consistencyLevel, beatFramework, premiseA, premiseB, rankInput }
                    setTemplates(prev => [{ id: String(Date.now()), projectId: id ?? 'default', name: templateName.trim(), node: selectedNode, payload }, ...prev])
                    setTemplateName('')
                    message.success('模板已保存')
                  }}
                >
                  保存为模板
                </Button>
                <Select
                  placeholder="应用模板"
                  style={{ minWidth: 180 }}
                  value={selectedTemplateId}
                  options={templates.filter(t => t.node === selectedNode && t.projectId === (id ?? 'default')).map(t => ({ label: t.name, value: t.id }))}
                  onChange={templateId => {
                    setSelectedTemplateId(templateId)
                    const found = templates.find(t => t.id === templateId && t.node === selectedNode && t.projectId === (id ?? 'default'))
                    if (!found) return
                    setTitle(found.payload.title)
                    setPremise(found.payload.premise)
                    setPanelTarget(found.payload.panelTarget)
                    setStylePreset(found.payload.stylePreset)
                    setConsistencyLevel(found.payload.consistencyLevel)
                    setBeatFramework(found.payload.beatFramework)
                    setPremiseA(found.payload.premiseA)
                    setPremiseB(found.payload.premiseB)
                    setRankInput(found.payload.rankInput)
                    message.success('模板已应用')
                  }}
                />
                <Button
                  onClick={() => {
                    if (!selectedTemplateId) return message.warning('请先选择一个模板')
                    if (!templateName.trim()) return message.warning('请输入新模板名')
                    let renamed = false
                    setTemplates(prev => prev.map(t => {
                      if (t.id === selectedTemplateId && t.projectId === (id ?? 'default') && t.node === selectedNode) {
                        renamed = true
                        return { ...t, name: templateName.trim() }
                      }
                      return t
                    }))
                    if (renamed) {
                      setTemplateName('')
                      message.success('模板已重命名')
                    } else {
                      message.warning('未找到对应模板')
                    }
                  }}
                >
                  重命名模板
                </Button>
              </Space>
            </Space>

            {!selectedNode && (
              <div style={{ color: '#94a3b8' }}>请先在左侧图上选择一个节点。</div>
            )}

            {selectedNode === 'plot' && (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input value={title} onChange={e => setTitle(e.target.value)} addonBefore="标题" />
                <Input.TextArea value={premise} onChange={e => setPremise(e.target.value)} rows={4} placeholder="剧情设定" />
                <Input type="number" value={panelTarget} onChange={e => setPanelTarget(Number(e.target.value || 12))} addonBefore="目标分镜" />
                <Select value={beatFramework} onChange={v => setBeatFramework(v)} options={[{ label: 'three-act', value: 'three-act' }, { label: 'five-act', value: 'five-act' }]} />
              </Space>
            )}

            {selectedNode === 'storyboard' && (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input value={title} onChange={e => setTitle(e.target.value)} addonBefore="标题" />
                <Input type="number" value={panelTarget} onChange={e => setPanelTarget(Number(e.target.value || 12))} addonBefore="分镜数" />
                <Input value={stylePreset} onChange={e => setStylePreset(e.target.value)} addonBefore="风格" />
              </Space>
            )}

            {selectedNode === 'promptpack' && (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input value={stylePreset} onChange={e => setStylePreset(e.target.value)} addonBefore="风格" />
                <Select value={consistencyLevel} onChange={v => setConsistencyLevel(v)} options={[{ label: 'low', value: 'low' }, { label: 'medium', value: 'medium' }, { label: 'high', value: 'high' }]} />
              </Space>
            )}

            {selectedNode === 'compare' && (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input.TextArea value={premiseA} onChange={e => setPremiseA(e.target.value)} rows={3} placeholder="方案 A" />
                <Input.TextArea value={premiseB} onChange={e => setPremiseB(e.target.value)} rows={3} placeholder="方案 B" />
              </Space>
            )}

            {selectedNode === 'rank' && (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input.TextArea value={rankInput} onChange={e => setRankInput(e.target.value)} rows={8} placeholder="一行一个题材候选" />
              </Space>
            )}

            {(selectedNode === 'evaluate') && (
              <div style={{ color: '#475569' }}>
                Evaluate 节点使用当前 episode 上下文与规则中心阈值，无额外参数。
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
