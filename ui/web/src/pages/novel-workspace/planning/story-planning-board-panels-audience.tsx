import React from 'react'
import { Button, Card, Empty, Progress, Space, Tag, Typography } from 'antd'
import type { StoryPlanningBoardPanelsProps } from './story-planning-board-types'
import {
  retentionColor,
  retentionRiskColor,
  readerTrustColor,
  readerTrialColor,
  innovationRadarColor,
  actionLabel,
} from './story-planning-chrome'

const { Text } = Typography

export function StoryPlanningAudiencePanels(props: StoryPlanningBoardPanelsProps) {
  const { model, loadingKey, onAction, onSelectChapter, compact } = props
  return (
    <>
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

          <Card
            className="novel-reader-trust-ledger-card"
            title="追读信任账本"
            size="small"
            extra={(
              <Button size="small" type={model.readerTrustLedger.status === 'needs_attention' ? 'primary' : 'link'} onClick={() => onAction(model.readerTrustLedger.actionKey)}>
                {actionLabel(model.readerTrustLedger.actionKey)}
              </Button>
            )}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={readerTrustColor(model.readerTrustLedger.status)} bordered={false}>
                  {model.readerTrustLedger.status === 'missing' ? '待复盘' : model.readerTrustLedger.status === 'ready' ? '追读稳定' : '需要修复'}
                </Tag>
                {model.readerTrustLedger.score !== null && (
                  <Tag color={retentionColor(model.readerTrustLedger.score)} bordered={false}>信任 {model.readerTrustLedger.score} 分</Tag>
                )}
                {model.readerTrustLedger.expectationDebtCount > 0 && <Tag color="red" bordered={false}>期待欠账 {model.readerTrustLedger.expectationDebtCount}</Tag>}
                {model.readerTrustLedger.payoffDebtCount > 0 && <Tag color="purple" bordered={false}>回报欠账 {model.readerTrustLedger.payoffDebtCount}</Tag>}
                {model.readerTrustLedger.retentionMissedCount > 0 && <Tag color="gold" bordered={false}>追读漏项 {model.readerTrustLedger.retentionMissedCount}</Tag>}
                {model.readerTrustLedger.keepAliveCount > 0 && <Tag color="blue" bordered={false}>继续悬念 {model.readerTrustLedger.keepAliveCount}</Tag>}
              </Space>
              <Text type="secondary">{model.readerTrustLedger.summary}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                按期待兑现、爽点回报、追读钩子、继续悬念四个维度检查读者是否还有理由追下一章。
              </Text>
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                {model.readerTrustLedger.signals.map(signal => (
                  <button
                    key={signal.key}
                    type="button"
                    onClick={() => onAction(signal.actionKey)}
                    style={{
                      border: '1px solid #edf0f5',
                      borderRadius: 8,
                      padding: '10px 12px',
                      background: signal.status === 'ok' ? '#fff' : '#fff1f0',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      font: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={readerTrustColor(signal.status)} bordered={false}>{signal.label}</Tag>
                        {signal.count > 0 && <Tag bordered={false}>{signal.count}</Tag>}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>{signal.detail}</Text>
                    </Space>
                  </button>
                ))}
              </div>
            </Space>
          </Card>

          <Card
            className="novel-reader-trial-room-card"
            title="读者试读室"
            size="small"
            extra={(
              <Space wrap>
                <Button
                  size="small"
                  type={model.readerTrialRoom.status === 'ready' ? 'link' : 'default'}
                  loading={loadingKey === 'readerTrial'}
                  onClick={() => onAction('run_reader_trial_review')}
                >
                  运行读者试读复盘
                </Button>
                {model.readerTrialRoom.status !== 'missing' && (model.readerTrialRoom.status !== 'ready' || model.readerTrialRoom.dropPoints.length > 0) && (
                  <Button
                    size="small"
                    type="primary"
                    loading={loadingKey === 'readerTrialRepair'}
                    onClick={() => onAction('create_reader_trial_repair')}
                  >
                    生成试读修复任务
                  </Button>
                )}
              </Space>
            )}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={readerTrialColor(model.readerTrialRoom.status)} bordered={false}>
                  {model.readerTrialRoom.status === 'missing' ? '待试读' : model.readerTrialRoom.status === 'ready' ? '试读稳定' : model.readerTrialRoom.status === 'blocked' ? '高危弃读' : '需要修复'}
                </Tag>
                {model.readerTrialRoom.score !== null && (
                  <Tag color={retentionColor(model.readerTrialRoom.score)} bordered={false}>试读 {model.readerTrialRoom.score} 分</Tag>
                )}
                <Tag color="geekblue" bordered={false}>{model.readerTrialRoom.qualityBar}</Tag>
                {model.readerTrialRoom.dropPoints.length > 0 && <Tag color="red" bordered={false}>弃读点 {model.readerTrialRoom.dropPoints.length}</Tag>}
              </Space>
              <Text type="secondary">{model.readerTrialRoom.summary}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                模拟爽点读者、剧情党、设定党和平台试读用户，检查前三章、试读十章和最近十章有没有继续追读的理由。
              </Text>
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                {model.readerTrialRoom.personas.map(persona => (
                  <div key={persona.key} style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={readerTrialColor(persona.riskLevel)} bordered={false}>{persona.label}</Tag>
                        {persona.score > 0 && <Tag bordered={false}>{persona.score}分</Tag>}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>{persona.focus}</Text>
                      <Text>{persona.verdict}</Text>
                    </Space>
                  </div>
                ))}
              </div>
              {model.readerTrialRoom.segments.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {model.readerTrialRoom.segments.map(segment => (
                    <div key={segment.key} style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fff' }}>
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Text strong>{segment.label}</Text>
                          <Tag color={retentionColor(segment.score)} bordered={false}>{segment.score || '-'}分</Tag>
                        </Space>
                        <Progress percent={segment.score} size="small" showInfo={false} strokeColor={retentionColor(segment.score) === 'green' ? '#52c41a' : retentionColor(segment.score) === 'red' ? '#ff4d4f' : '#faad14'} />
                        <Text type="secondary" style={{ fontSize: 12 }}>{segment.verdict}</Text>
                      </Space>
                    </div>
                  ))}
                </div>
              )}
              {(model.readerTrialRoom.dropPoints.length > 0 || model.readerTrialRoom.pullPoints.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  <div style={{ border: '1px solid #fee2e2', borderRadius: 8, padding: '10px 12px', background: '#fff7f7' }}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>弃读点</Text>
                    <Space direction="vertical" size={4}>
                      {(model.readerTrialRoom.dropPoints.length ? model.readerTrialRoom.dropPoints : ['暂无明显弃读点']).slice(0, 5).map(item => <Text key={item} type="secondary" style={{ fontSize: 12 }}>{item}</Text>)}
                    </Space>
                  </div>
                  <div style={{ border: '1px solid #dcfce7', borderRadius: 8, padding: '10px 12px', background: '#f6ffed' }}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>追读拉力</Text>
                    <Space direction="vertical" size={4}>
                      {(model.readerTrialRoom.pullPoints.length ? model.readerTrialRoom.pullPoints : ['暂无明确追读拉力']).slice(0, 5).map(item => <Text key={item} type="secondary" style={{ fontSize: 12 }}>{item}</Text>)}
                    </Space>
                  </div>
                </div>
              )}
              {model.readerTrialRoom.repairActions.length > 0 && (
                <Space wrap>
                  {model.readerTrialRoom.repairActions.slice(0, 4).map(action => <Tag key={action} color="gold" bordered={false}>{action}</Tag>)}
                </Space>
              )}
            </Space>
          </Card>

          <Card
            className="novel-innovation-radar-card"
            title="创新雷达"
            size="small"
            extra={(
              <Button size="small" type={model.innovationRadar.status === 'needs_attention' ? 'primary' : 'link'} onClick={() => onAction(model.innovationRadar.actionKey)}>
                {actionLabel(model.innovationRadar.actionKey)}
              </Button>
            )}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={innovationRadarColor(model.innovationRadar.status)} bordered={false}>
                  {model.innovationRadar.status === 'missing' ? '待复盘' : model.innovationRadar.status === 'ready' ? '创新稳定' : '需要修复'}
                </Tag>
                {model.innovationRadar.score !== null && (
                  <Tag color={retentionColor(model.innovationRadar.score)} bordered={false}>创新 {model.innovationRadar.score} 分</Tag>
                )}
                <Tag bordered={false}>兑现 {model.innovationRadar.deliveredCount}/{model.innovationRadar.plannedCount || '-'}</Tag>
                {model.innovationRadar.missedCount > 0 && <Tag color="geekblue" bordered={false}>创新缺口 {model.innovationRadar.missedCount}</Tag>}
              </Space>
              <Text type="secondary">{model.innovationRadar.summary}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                按创新角度、执行点、差异护栏、IP化场面四个维度检查本章是否滑回同题材套路。
              </Text>
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                {model.innovationRadar.signals.map(signal => (
                  <button
                    key={signal.key}
                    type="button"
                    onClick={() => onAction(signal.actionKey)}
                    style={{
                      border: '1px solid #edf0f5',
                      borderRadius: 8,
                      padding: '10px 12px',
                      background: signal.status === 'ok' ? '#fff' : '#f0f5ff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      font: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={innovationRadarColor(signal.status)} bordered={false}>{signal.label}</Tag>
                        {signal.count > 0 && <Tag bordered={false}>{signal.count}</Tag>}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>{signal.detail}</Text>
                    </Space>
                  </button>
                ))}
              </div>
              {model.innovationRadar.nextActions.length > 0 && (
                <Space wrap>
                  {model.innovationRadar.nextActions.slice(0, 3).map(action => <Tag key={action} bordered={false}>{action}</Tag>)}
                </Space>
              )}
            </Space>
          </Card>
    </>
  )
}
