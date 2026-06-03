import React from 'react'
import { Alert, Button, Card, Empty, Grid, Progress, Space, Tag, Tooltip, Typography } from 'antd'
import {
  BranchesOutlined,
  CheckCircleOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  NodeIndexOutlined,
  ThunderboltOutlined,
  UpOutlined,
} from '@ant-design/icons'
import type { PlanningActionKey, PlanningVolumeTreeNode, PlanningWorkspaceModel } from './planningWorkspaceModel'

const { Text, Paragraph } = Typography
const { useBreakpoint } = Grid

export type PlanningLoadingKey = 'rollingPlan' | 'future100Audit' | 'future100Generate' | 'longformPressure' | 'topic' | 'referenceDiagnosis' | 'first30Retention' | 'first30Repair'

export type StoryPlanningWorkspaceProps = {
  model: PlanningWorkspaceModel
  selectedModelId?: number
  loadingKey?: PlanningLoadingKey
  onAction: (key: PlanningActionKey) => void
  onSelectChapter: (chapterNo: number) => void
}

function healthColor(status: PlanningWorkspaceModel['topStatus']['longformHealth']['status']) {
  if (status === 'healthy') return 'green'
  if (status === 'drifting') return 'gold'
  return 'red'
}

function issueColor(severity: 'critical' | 'warning') {
  if (severity === 'critical') return 'red'
  if (severity === 'warning') return 'gold'
  return 'blue'
}

function issueIconColor(severity: 'critical' | 'warning') {
  const color = issueColor(severity)
  if (color === 'red') return '#cf1322'
  if (color === 'gold') return '#d48806'
  return '#1677ff'
}

function retentionColor(scoreOrStatus: number | string | null | undefined) {
  if (typeof scoreOrStatus === 'string') {
    if (scoreOrStatus === 'ready' || scoreOrStatus === 'ok') return 'green'
    if (scoreOrStatus === 'blocked') return 'red'
    if (scoreOrStatus === 'missing' || scoreOrStatus === 'stale') return 'gold'
    return 'gold'
  }
  const score = Number(scoreOrStatus || 0)
  if (score >= 80) return 'green'
  if (score < 65) return 'red'
  return 'gold'
}

function retentionRiskColor(level: 'ok' | 'medium' | 'high') {
  if (level === 'ok') return 'green'
  if (level === 'high') return 'red'
  return 'gold'
}

function formatWords(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return String(value || 0)
}

function actionLabel(key: PlanningActionKey) {
  const labels: Record<PlanningActionKey, string> = {
    update_rolling_plan: '更新滚动规划',
    complete_volume_plan: '补齐当前卷规划',
    enter_chapter_writing: '进入当前章写作',
    open_outline_tree: '查看完整大纲',
    future100_audit: '检查未来100章',
    future100_generate: '生成未来100章',
    longform_pressure: '运行长线压力测试',
    topic_validation: '验证原创选题',
    reference_diagnosis: '诊断参考知识',
    open_story_assets: '打开资料设定',
    update_story_state: '校正故事状态',
    open_quality_revision: '进入质检修订',
    run_first30_retention: '运行前30章诊断',
    create_first30_repair: '生成修复任务',
  }
  return labels[key]
}

function chapterRangeLabel(node: PlanningVolumeTreeNode) {
  if (node.chapterNo) return `第${node.chapterNo}章`
  if (node.startChapter && node.endChapter) return `第${node.startChapter}-${node.endChapter}章`
  if (node.startChapter) return `第${node.startChapter}章起`
  if (node.endChapter) return `至第${node.endChapter}章`
  return '章节范围未定'
}

function renderVolumeNode(node: PlanningVolumeTreeNode, depth = 0): React.ReactNode {
  return (
    <div
      key={`${node.id}-${node.title}-${depth}`}
      style={{
        borderLeft: depth === 0 ? 'none' : '1px solid #e8edf3',
        marginLeft: depth === 0 ? 0 : 12,
        paddingLeft: depth === 0 ? 0 : 12,
      }}
    >
      <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Tag color={node.level === 'chapter' ? 'default' : depth === 0 ? 'blue' : 'purple'} bordered={false}>
          {node.level === 'chapter' ? '章' : node.level || '规划'}
        </Tag>
        <Text strong={depth === 0} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.title}
        </Text>
        <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 12, whiteSpace: 'nowrap' }}>
          {chapterRangeLabel(node)}
        </Text>
        {node.wordCount !== undefined && <Tag bordered={false}>{node.wordCount} 字</Tag>}
      </div>
      {node.children.length > 0 && (
        <div style={{ display: 'grid', gap: 2 }}>
          {node.children.map(child => renderVolumeNode(child, depth + 1))}
        </div>
      )}
    </div>
  )
}

export function StoryPlanningWorkspace({
  model,
  selectedModelId,
  loadingKey,
  onAction,
  onSelectChapter,
}: StoryPlanningWorkspaceProps) {
  const screens = useBreakpoint()
  const compact = !screens.xl
  const [overviewCollapsed, setOverviewCollapsed] = React.useState(false)
  const wordPercent = model.topStatus.targetWords > 0
    ? Math.min(100, Math.round((model.topStatus.writtenWords / model.topStatus.targetWords) * 100))
    : 0

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#f6f8fb' }}>
      <div style={{ padding: '16px 20px 24px', display: 'grid', gap: 16 }}>
        <Card className="story-planning-overview-card" size="small" styles={{ body: { padding: overviewCollapsed ? 12 : 16 } }}>
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'minmax(0, 1fr) auto', gap: 16, alignItems: 'center' }}>
            <Space direction="vertical" size={8} style={{ minWidth: 0 }}>
              <Space wrap>
                <Tag color="blue" bordered={false}>{model.topStatus.currentVolume}</Tag>
                <Tag color="purple" bordered={false}>{model.topStatus.currentStage}</Tag>
                <Tag bordered={false}>{model.topStatus.currentChapterLabel}</Tag>
                <Tag color={healthColor(model.topStatus.longformHealth.status)} bordered={false}>
                  长线健康：{model.topStatus.longformHealth.label}
                </Tag>
              </Space>
              {!overviewCollapsed && (
                <>
                  <Space wrap size={[12, 6]}>
                    <Text type="secondary">已写 {formatWords(model.topStatus.writtenWords)} / 目标 {formatWords(model.topStatus.targetWords)}</Text>
                    <Text type="secondary">
                      未来10章 {model.topStatus.future10Coverage.planned}/{model.topStatus.future10Coverage.required}
                    </Text>
                    <Text type="secondary">
                      未来100章 {model.topStatus.future100Coverage.planned}/{model.topStatus.future100Coverage.required}
                    </Text>
                  </Space>
                  <Progress percent={wordPercent} size="small" showInfo={false} />
                </>
              )}
            </Space>
            <Space wrap style={{ justifyContent: 'flex-end' }}>
              <Button
                icon={overviewCollapsed ? <DownOutlined /> : <UpOutlined />}
                onClick={() => setOverviewCollapsed(value => !value)}
              >
                {overviewCollapsed ? '展开规划概览' : '收起规划概览'}
              </Button>
              {!overviewCollapsed && (
                <>
                  <Button
                    icon={<BranchesOutlined />}
                    loading={loadingKey === 'rollingPlan'}
                    disabled={!selectedModelId}
                    onClick={() => onAction('update_rolling_plan')}
                  >
                    更新滚动规划
                  </Button>
                  <Button icon={<NodeIndexOutlined />} onClick={() => onAction('complete_volume_plan')}>
                    补齐当前卷规划
                  </Button>
                </>
              )}
              <Button type="primary" icon={<EditOutlined />} onClick={() => onAction('enter_chapter_writing')}>
                进入当前章写作
              </Button>
            </Space>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'start' }}>
          <Space direction="vertical" size={16} style={{ minWidth: 0 }}>
            <Card
              className="novel-first30-retention-card"
              title="前30章留存曲线"
              size="small"
              extra={(
                <Space wrap>
                  <Button
                    size="small"
                    loading={loadingKey === 'first30Retention'}
                    onClick={() => onAction('run_first30_retention')}
                  >
                    运行前30章诊断
                  </Button>
                  {model.first30Retention.status !== 'missing' && model.first30Retention.status !== 'ready' && (
                    <Button
                      size="small"
                      type="primary"
                      loading={loadingKey === 'first30Repair'}
                      onClick={() => onAction('create_first30_repair')}
                    >
                      生成修复任务
                    </Button>
                  )}
                </Space>
              )}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={retentionColor(model.first30Retention.status)} bordered={false}>
                    {model.first30Retention.status === 'missing' ? '未诊断' : model.first30Retention.status === 'stale' ? '需重新诊断' : model.first30Retention.status}
                  </Tag>
                  {model.first30Retention.score !== null && (
                    <Tag color={retentionColor(model.first30Retention.score)} bordered={false}>留存 {model.first30Retention.score} 分</Tag>
                  )}
                  <Tag color={model.first30Retention.promiseReady ? 'green' : 'gold'} bordered={false}>
                    读者承诺{model.first30Retention.promiseReady ? '已清晰' : '待补强'}
                  </Tag>
                </Space>
                <Text type="secondary">{model.first30Retention.summary}</Text>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {(model.first30Retention.segments.length ? model.first30Retention.segments : [
                    { key: '1-3', label: '开篇三章', score: 0, coverage: 0, hookRate: 0, payoffAverage: 0, chapterCount: 0 },
                    { key: '4-10', label: '试读十章', score: 0, coverage: 0, hookRate: 0, payoffAverage: 0, chapterCount: 0 },
                    { key: '11-30', label: '付费前蓄势', score: 0, coverage: 0, hookRate: 0, payoffAverage: 0, chapterCount: 0 },
                  ]).map(segment => (
                    <div key={segment.key} style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: 10, background: '#fbfcfe' }}>
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Text strong>{segment.label}</Text>
                          <Tag color={retentionColor(segment.score)} bordered={false}>{segment.score || '-'}分</Tag>
                        </Space>
                        <Progress percent={Math.max(0, Math.min(100, Number(segment.score || 0)))} size="small" showInfo={false} strokeColor={retentionColor(segment.score) === 'green' ? '#52c41a' : retentionColor(segment.score) === 'red' ? '#ff4d4f' : '#faad14'} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          覆盖 {segment.coverage}% · 钩子 {segment.hookRate}% · 爽点/悬念 {segment.payoffAverage}
                        </Text>
                      </Space>
                    </div>
                  ))}
                </div>
                {model.first30Retention.chapterCards.length > 0 ? (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {model.first30Retention.chapterCards.slice(0, 30).map(row => (
                      <button
                        key={`${row.chapterNo}-${row.title}`}
                        type="button"
                        onClick={() => onSelectChapter(row.chapterNo)}
                        style={{
                          border: '1px solid #edf0f5',
                          borderRadius: 8,
                          padding: '8px 10px',
                          background: '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          font: 'inherit',
                          color: 'inherit',
                        }}
                      >
                        <Space wrap>
                          <Tag color={retentionRiskColor(row.riskLevel)} bordered={false}>第{row.chapterNo}章</Tag>
                          <Text strong>{row.title}</Text>
                          <Tag color={retentionColor(row.score)} bordered={false}>{row.score}分</Tag>
                          <Tag bordered={false}>{row.wordCount}字</Tag>
                          {row.flags.slice(0, 3).map(flag => <Tag key={flag} color="gold" bordered={false}>{flag}</Tag>)}
                        </Space>
                      </button>
                    ))}
                  </div>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="运行诊断后显示每章留存风险" />
                )}
                {model.first30Retention.nextActions.length > 0 && (
                  <Space wrap>
                    {model.first30Retention.nextActions.slice(0, 3).map(action => <Tag key={action} bordered={false}>{action}</Tag>)}
                  </Space>
                )}
              </Space>
            </Card>

            <Card title="主线与分卷推进" size="small">
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <Alert type="info" showIcon message="全书主线承诺" description={model.mainline.readerPromise || '未设置'} />
                <Alert
                  type={model.mainline.currentChapterServesVolume ? 'success' : 'warning'}
                  showIcon
                  message="当前章服务卷目标"
                  description={model.mainline.currentChapterServesVolume ? '当前章已有主线推进证据。' : '当前章任务或卷目标不足，需要先补规划。'}
                />
                {[
                  ['当前卷目标', model.mainline.currentVolumeGoal],
                  ['当前阶段冲突', model.mainline.currentStageConflict],
                  ['本阶段爽点模型', model.mainline.payoffModel],
                  ['关键转折', `上一转折：${model.mainline.previousTurn || '未标注'}\n下一转折：${model.mainline.nextTurn || '未标注'}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>{label}</Text>
                    <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{value || '未设置'}</Paragraph>
                  </div>
                ))}
              </div>
              {model.mainline.risks.length > 0 && (
                <Space wrap style={{ marginTop: 12 }}>
                  {model.mainline.risks.map(risk => <Tag key={risk} color="red" bordered={false}>{risk}</Tag>)}
                </Space>
              )}
            </Card>

            <Card
              title="未来 10 章路线"
              size="small"
              extra={<Button size="small" type="link" onClick={() => onAction('open_outline_tree')}>查看完整大纲</Button>}
            >
              {model.futureRoute.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无未来章节路线" />
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {model.futureRoute.map(row => (
                    <button
                      key={`${row.chapterNo}-${row.title}`}
                      type="button"
                      onClick={() => onSelectChapter(row.chapterNo)}
                      style={{
                        border: '1px solid #edf0f5',
                        borderRadius: 8,
                        padding: '10px 12px',
                        background: '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color="blue" bordered={false}>第{row.chapterNo}章</Tag>
                          <Text strong>{row.title || '无标题'}</Text>
                          {row.riskTags.map(tag => <Tag key={tag} color="gold" bordered={false}>{tag}</Tag>)}
                        </Space>
                        <Text>{row.chapterTask || '未设置章节任务'}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          主线：{row.mainlineProgress || '未标注'} · 冲突：{row.conflict || '未设置'} · 钩子：{row.endingHook || '未设置'}
                        </Text>
                      </Space>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card title="分卷结构" size="small">
              {model.volumeTree.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无分卷结构" />
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {model.volumeTree.map(node => renderVolumeNode(node))}
                </div>
              )}
            </Card>
          </Space>

          <Space direction="vertical" size={16} style={{ minWidth: 0 }}>
            <Card title="规划健康" size="small">
              {model.healthIssues.length === 0 ? (
                <Alert type="success" showIcon icon={<CheckCircleOutlined />} message="主线规划暂未发现明显风险" />
              ) : (
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  {model.healthIssues.map(issue => (
                    <div
                      key={issue.key}
                      style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fff' }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space>
                          <ExclamationCircleOutlined style={{ color: issueIconColor(issue.severity) }} />
                          <Text strong>{issue.title}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{issue.detail}</Text>
                        <Button size="small" block onClick={() => onAction(issue.actionKey)}>{actionLabel(issue.actionKey)}</Button>
                      </Space>
                    </div>
                  ))}
                </Space>
              )}
            </Card>

            <Card title="低频规划入口" size="small">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Tooltip title="检查未来 100 章骨架是否覆盖长线节奏">
                  <Button block icon={<FileSearchOutlined />} loading={loadingKey === 'future100Audit'} onClick={() => onAction('future100_audit')}>
                    未来100章骨架检查
                  </Button>
                </Tooltip>
                <Button block type="primary" icon={<ThunderboltOutlined />} loading={loadingKey === 'future100Generate'} onClick={() => onAction('future100_generate')}>
                  AI 生成未来100章骨架
                </Button>
                <Button block loading={loadingKey === 'longformPressure'} onClick={() => onAction('longform_pressure')}>300万字长线压力测试</Button>
                <Button block loading={loadingKey === 'topic'} onClick={() => onAction('topic_validation')}>原创选题验证</Button>
                <Button block loading={loadingKey === 'referenceDiagnosis'} onClick={() => onAction('reference_diagnosis')}>参考知识诊断</Button>
              </Space>
            </Card>

          </Space>
        </div>
      </div>
    </div>
  )
}
