import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Col, Empty, Modal, Progress, Row, Space, Spin, Tag, Typography, message } from 'antd'
import { BookOutlined, CloudUploadOutlined, DatabaseOutlined, EyeOutlined, SettingOutlined } from '@ant-design/icons'
import apiClient from '../../api/client'

const { Text, Paragraph } = Typography

const requiredProfiles = [
  { value: 'reference_profile', label: '作品画像' },
  { value: 'volume_architecture', label: '分卷结构' },
  { value: 'chapter_beat_template', label: '章节节拍' },
  { value: 'character_function_matrix', label: '角色矩阵' },
  { value: 'style_profile', label: '文风画像' },
  { value: 'payoff_model', label: '爽点模型' },
  { value: 'prose_syntax_profile', label: '文风句法' },
]

const categoryLabels: Record<string, string> = {
  reference_profile: '参考作品画像',
  volume_architecture: '分卷结构',
  chapter_beat_template: '章节节拍模板',
  character_function_matrix: '角色功能矩阵',
  resource_economy_model: '资源经济模型',
  style_profile: '文风画像',
  character_design: '人物设计',
  story_design: '故事设计',
  story_pacing: '节奏设计',
  writing_style: '写作风格',
  worldbuilding: '世界观',
  resource_economy: '资源经济',
  payoff_model: '爽点模型',
  prose_syntax_profile: '文风句法',
  dialogue_mechanism: '对话机制',
}

function normalizeReferences(config: any) {
  return Array.isArray(config?.references)
    ? config.references
      .map((item: any) => ({
        project_title: String(item?.project_title || '').trim(),
        weight: Number(item?.weight || 0.7) || 0.7,
        use_for: Array.isArray(item?.use_for) ? item.use_for : [],
        dimensions: Array.isArray(item?.dimensions) ? item.dimensions : [],
        avoid: Array.isArray(item?.avoid) ? item.avoid : [],
      }))
      .filter((item: any) => item.project_title)
    : []
}

function parseReviewPayload(review: any) {
  if (!review?.payload) return {}
  if (typeof review.payload === 'object') return review.payload
  try {
    return JSON.parse(review.payload)
  } catch {
    return {}
  }
}

function byTitle(title: string) {
  const normalized = String(title || '').trim().toLowerCase()
  return (item: any) => String(item?.project_title || item?.title || '').trim().toLowerCase() === normalized
}

function openNovelStudio(params: Record<string, string>) {
  const search = new URLSearchParams(params)
  window.location.href = `/novel?${search.toString()}`
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function scoreStatus(score: number): 'success' | 'normal' | 'exception' {
  if (score >= 80) return 'success'
  if (score >= 55) return 'normal'
  return 'exception'
}

function riskLevel(score: number) {
  if (score >= 80) return { label: '低风险', color: 'green' }
  if (score >= 55) return { label: '中风险', color: 'gold' }
  return { label: '高风险', color: 'red' }
}

export function ReferenceEngineeringModal({
  open,
  referenceConfig,
  referenceReports,
  onClose,
  onOpenReferenceConfig,
}: {
  open: boolean
  referenceConfig: any
  referenceReports: any[]
  onClose: () => void
  onOpenReferenceConfig: () => void
}) {
  const references = useMemo(() => normalizeReferences(referenceConfig), [referenceConfig])
  const [loading, setLoading] = useState(false)
  const [knowledgeProjects, setKnowledgeProjects] = useState<any[]>([])
  const [knowledgeEntries, setKnowledgeEntries] = useState<any[]>([])
  const [sourceCaches, setSourceCaches] = useState<any[]>([])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      apiClient.get('/knowledge').catch(() => ({ data: { projects: [], entries: [] } })),
      apiClient.get('/knowledge/source-caches').catch(() => ({ data: { caches: [] } })),
    ])
      .then(([knowledgeRes, cacheRes]) => {
        setKnowledgeProjects(Array.isArray(knowledgeRes.data?.projects) ? knowledgeRes.data.projects : [])
        setKnowledgeEntries(Array.isArray(knowledgeRes.data?.entries) ? knowledgeRes.data.entries : [])
        setSourceCaches(Array.isArray(cacheRes.data?.caches) ? cacheRes.data.caches : [])
      })
      .catch(() => message.error('参考工程数据加载失败'))
      .finally(() => setLoading(false))
  }, [open])

  const referenceTitles = references.map((item: any) => item.project_title)
  const referencedKnowledge = knowledgeEntries.filter((entry: any) => referenceTitles.includes(String(entry.project_title || '').trim()))
  const referencedCaches = sourceCaches.filter((cache: any) => referenceTitles.includes(String(cache.project_title || '').trim()))
  const readyProfiles = references.reduce((sum: number, ref: any) => {
    const project = knowledgeProjects.find(byTitle(ref.project_title))
    const categories = project?.categories || {}
    return sum + requiredProfiles.filter(item => Number(categories[item.value] || 0) > 0).length
  }, 0)
  const totalProfiles = references.length * requiredProfiles.length
  const readinessPercent = totalProfiles ? Math.round((readyProfiles / totalProfiles) * 100) : 0
  const latestReport = referenceReports[0] || null
  const latestPayload = parseReviewPayload(latestReport)
  const latestHits = Array.isArray(latestPayload?.copy_guard?.hits) ? latestPayload.copy_guard.hits : []
  const reportsForQuality = referenceReports.slice(0, 8).map(report => ({ report, payload: parseReviewPayload(report) }))
  const injectedCount = reportsForQuality.reduce((sum, item) => (
    sum + (Array.isArray(item.payload.injected_entries) ? item.payload.injected_entries.length : 0)
  ), 0)
  const hitCount = reportsForQuality.reduce((sum, item) => (
    sum + (Array.isArray(item.payload?.copy_guard?.hits) ? item.payload.copy_guard.hits.length : 0)
  ), 0)
  const warningCount = reportsForQuality.reduce((sum, item) => (
    sum + (Array.isArray(item.payload.warnings) ? item.payload.warnings.length : 0) + (item.report.status === 'warn' ? 1 : 0)
  ), 0)
  const cachedReferenceCount = references.filter((ref: any) => sourceCaches.some(byTitle(ref.project_title))).length
  const cacheCoveragePercent = references.length ? Math.round((cachedReferenceCount / references.length) * 100) : 0
  const dimensionCoverage = references.length
    ? references.reduce((sum: number, ref: any) => sum + Math.min(1, (ref.dimensions || []).length / 4), 0) / references.length * 100
    : 0
  const avoidCoverage = references.length
    ? references.reduce((sum: number, ref: any) => sum + Math.min(1, (ref.avoid || []).length / 4), 0) / references.length * 100
    : 0
  const injectionScore = reportsForQuality.length
    ? clampScore(Math.min(100, (injectedCount / Math.max(1, reportsForQuality.length * 3)) * 100) - warningCount * 6)
    : (references.length ? 45 : 0)
  const copySafetyScore = reportsForQuality.length
    ? clampScore(100 - hitCount * 14 - warningCount * 4)
    : (references.length ? 70 : 0)
  const originalityScore = clampScore((copySafetyScore * 0.65) + (avoidCoverage * 0.25) + (dimensionCoverage * 0.1))
  const rhythmStyleScore = clampScore(
    requiredProfiles
      .filter(item => ['chapter_beat_template', 'style_profile'].includes(item.value))
      .reduce((sum, item) => {
        const ready = references.reduce((count: number, ref: any) => {
          const project = knowledgeProjects.find(byTitle(ref.project_title))
          return count + (Number(project?.categories?.[item.value] || 0) > 0 ? 1 : 0)
        }, 0)
        return sum + (references.length ? (ready / references.length) * 50 : 0)
      }, 0),
  )
  const overallQualityScore = clampScore(
    readinessPercent * 0.25 +
    cacheCoveragePercent * 0.12 +
    injectionScore * 0.2 +
    copySafetyScore * 0.23 +
    originalityScore * 0.12 +
    rhythmStyleScore * 0.08,
  )
  const qualityRisk = riskLevel(overallQualityScore)

  return (
    <Modal
      open={open}
      title="参考工程总览"
      onCancel={onClose}
      footer={[
        <Button key="config" icon={<SettingOutlined />} onClick={onOpenReferenceConfig}>参考配置</Button>,
        <Button key="feed" icon={<CloudUploadOutlined />} onClick={() => openNovelStudio({ panel: 'knowledge', action: 'feed' })}>投喂新参考</Button>,
        <Button key="close" type="primary" onClick={onClose}>关闭</Button>,
      ]}
      width={1080}
    >
      <Spin spinning={loading}>
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="把参考配置、画像完整度、正文缓存和最近参考报告集中检查。"
            description="这里用于判断当前参考工程是否足够支撑仿写生成；缺画像、缺正文缓存或最近报告有照搬命中时，建议先补齐再生成。"
          />

          <Row gutter={12}>
            <Col span={6}><Card size="small"><Text type="secondary">参考项目</Text><br /><Text strong style={{ fontSize: 22 }}>{references.length}</Text></Card></Col>
            <Col span={6}><Card size="small"><Text type="secondary">画像完整度</Text><Progress percent={readinessPercent} size="small" /></Card></Col>
            <Col span={6}><Card size="small"><Text type="secondary">正文缓存</Text><br /><Text strong style={{ fontSize: 22 }}>{referencedCaches.length}</Text><Text type="secondary"> 本</Text></Card></Col>
            <Col span={6}><Card size="small"><Text type="secondary">知识条目</Text><br /><Text strong style={{ fontSize: 22 }}>{referencedKnowledge.length}</Text><Text type="secondary"> 条</Text></Card></Col>
          </Row>

          <Card
            size="small"
            title={<Space wrap><Text strong>仿写质量评估</Text><Tag color={qualityRisk.color} bordered={false}>{qualityRisk.label}</Tag></Space>}
          >
            <Row gutter={[12, 12]}>
              <Col xs={24} md={6}>
                <Progress type="dashboard" percent={overallQualityScore} status={scoreStatus(overallQualityScore)} size={92} />
                <div style={{ marginTop: 6 }}>
                  <Text type="secondary">综合评分</Text>
                </div>
              </Col>
              <Col xs={24} md={18}>
                <Row gutter={[12, 10]}>
                  <Col xs={24} md={8}><Text type="secondary">准备度</Text><Progress percent={readinessPercent} size="small" status={scoreStatus(readinessPercent)} /></Col>
                  <Col xs={24} md={8}><Text type="secondary">正文缓存覆盖</Text><Progress percent={cacheCoveragePercent} size="small" status={scoreStatus(cacheCoveragePercent)} /></Col>
                  <Col xs={24} md={8}><Text type="secondary">参考注入有效性</Text><Progress percent={injectionScore} size="small" status={scoreStatus(injectionScore)} /></Col>
                  <Col xs={24} md={8}><Text type="secondary">照搬安全</Text><Progress percent={copySafetyScore} size="small" status={scoreStatus(copySafetyScore)} /></Col>
                  <Col xs={24} md={8}><Text type="secondary">原创性约束</Text><Progress percent={originalityScore} size="small" status={scoreStatus(originalityScore)} /></Col>
                  <Col xs={24} md={8}><Text type="secondary">节奏/文风支撑</Text><Progress percent={rhythmStyleScore} size="small" status={scoreStatus(rhythmStyleScore)} /></Col>
                </Row>
                <Space wrap size={[6, 4]} style={{ marginTop: 10 }}>
                  <Tag bordered={false}>近 {reportsForQuality.length} 次报告</Tag>
                  <Tag color="blue" bordered={false}>注入 {injectedCount} 条</Tag>
                  <Tag color={hitCount ? 'gold' : 'green'} bordered={false}>照搬命中 {hitCount}</Tag>
                  <Tag color={warningCount ? 'gold' : 'green'} bordered={false}>预警 {warningCount}</Tag>
                  <Tag bordered={false}>避免项覆盖 {Math.round(avoidCoverage)}%</Tag>
                  <Tag bordered={false}>维度覆盖 {Math.round(dimensionCoverage)}%</Tag>
                </Space>
              </Col>
            </Row>
            {overallQualityScore < 80 && (
              <Alert
                style={{ marginTop: 12 }}
                type={overallQualityScore < 55 ? 'warning' : 'info'}
                showIcon
                message="质量改进建议"
                description={[
                  readinessPercent < 80 ? '补齐参考作品画像、章节节拍、角色矩阵和文风画像。' : '',
                  cacheCoveragePercent < 60 ? '优先拉取参考作品正文缓存，方便和提炼知识互相印证。' : '',
                  injectionScore < 70 ? '生成前先在参考配置里预览注入知识，确认当前任务能命中足够条目。' : '',
                  copySafetyScore < 75 ? '最近报告存在照搬命中，建议增加避免照搬项并替换专名、桥段顺序和原文表达。' : '',
                  rhythmStyleScore < 70 ? '补充章节节拍模板和文风画像，避免只参考设定而缺少写法蓝图。' : '',
                ].filter(Boolean).join(' ')}
              />
            )}
          </Card>

          {latestReport && (
            <Card size="small" title="最近参考报告">
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={latestReport.status === 'warn' ? 'gold' : 'green'} bordered={false}>{latestReport.status === 'warn' ? '需检查' : '正常'}</Tag>
                  <Tag color="purple" bordered={false}>{latestPayload.task_type || '生成任务'}</Tag>
                  <Tag color={latestHits.length ? 'gold' : 'green'} bordered={false}>照搬命中 {latestHits.length}</Tag>
                </Space>
                <Text>{latestReport.summary}</Text>
                {latestHits.length > 0 && <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2, expandable: true }}>疑似复用词：{latestHits.join('、')}</Paragraph>}
              </Space>
            </Card>
          )}

          {references.length === 0 ? (
            <Empty description="当前项目还没有配置参考作品">
              <Button type="primary" icon={<SettingOutlined />} onClick={onOpenReferenceConfig}>去配置参考作品</Button>
            </Empty>
          ) : references.map((ref: any) => {
            const project = knowledgeProjects.find(byTitle(ref.project_title))
            const categories = project?.categories || {}
            const missingProfiles = requiredProfiles.filter(item => Number(categories[item.value] || 0) <= 0)
            const profilePercent = Math.round(((requiredProfiles.length - missingProfiles.length) / requiredProfiles.length) * 100)
            const caches = sourceCaches.filter(byTitle(ref.project_title))
            const entries = knowledgeEntries.filter(byTitle(ref.project_title))
            const topCategories = Object.entries(categories)
              .sort((a: any, b: any) => Number(b[1] || 0) - Number(a[1] || 0))
              .slice(0, 6)
            return (
              <Card key={ref.project_title} size="small" title={<Space wrap><BookOutlined /><Text strong>{ref.project_title}</Text><Tag bordered={false}>权重 {Math.round(ref.weight * 100)}%</Tag></Space>}>
                <Row gutter={12}>
                  <Col span={7}>
                    <Text type="secondary">画像完整度</Text>
                    <Progress percent={profilePercent} size="small" status={missingProfiles.length ? 'active' : 'success'} />
                    <Space wrap size={4}>
                      {requiredProfiles.map(item => (
                        <Tag key={item.value} color={missingProfiles.some(missing => missing.value === item.value) ? 'default' : 'green'} bordered={false}>{item.label}</Tag>
                      ))}
                    </Space>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">正文缓存</Text>
                    <div style={{ marginTop: 6 }}>
                      {caches.length ? caches.slice(0, 2).map((cache: any) => (
                        <Tag key={cache.cache_key} color={cache.complete ? 'green' : 'gold'} bordered={false}>
                          {cache.chapter_count || 0}章 · {cache.complete ? '完整' : '未完'}
                        </Tag>
                      )) : <Tag bordered={false}>无缓存</Tag>}
                    </div>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">知识分布</Text>
                    <div style={{ marginTop: 6 }}>
                      {topCategories.length ? topCategories.map(([key, count]) => (
                        <Tag key={key} bordered={false}>{categoryLabels[key] || key} {String(count)}</Tag>
                      )) : <Tag bordered={false}>无知识</Tag>}
                    </div>
                  </Col>
                  <Col span={5}>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Button size="small" block icon={<EyeOutlined />} onClick={() => openNovelStudio({ panel: 'knowledge', project_title: ref.project_title })}>查看知识</Button>
                      <Button size="small" block icon={<CloudUploadOutlined />} onClick={() => openNovelStudio({ panel: 'knowledge', action: 'feed', project_title: ref.project_title })}>补充投喂</Button>
                      <Button size="small" block icon={<DatabaseOutlined />} onClick={() => openNovelStudio({ panel: 'source-cache', project_title: ref.project_title })}>正文缓存</Button>
                    </Space>
                  </Col>
                </Row>
                <Space wrap size={4} style={{ marginTop: 10 }}>
                  {(ref.use_for || []).map((item: string) => <Tag key={`use-${item}`} color="blue" bordered={false}>用途 {item}</Tag>)}
                  {(ref.dimensions || []).map((item: string) => <Tag key={`dim-${item}`} color="purple" bordered={false}>{item}</Tag>)}
                  {(ref.avoid || []).map((item: string) => <Tag key={`avoid-${item}`} color="red" bordered={false}>避 {item}</Tag>)}
                  <Tag bordered={false}>知识 {entries.length} 条</Tag>
                </Space>
              </Card>
            )
          })}
        </Space>
      </Spin>
    </Modal>
  )
}
