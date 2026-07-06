import React from 'react'
import { Button, Progress, Space, Tag, Typography } from 'antd'
import { AppstoreOutlined, SafetyOutlined } from '@ant-design/icons'
import './ProductionGuidePanel.css'

const { Text } = Typography

function metricColor(value: number, goodAt = 70) {
  if (value >= goodAt) return 'green'
  if (value > 0) return 'gold'
  return 'default'
}

export function ProductionGuidePanel({
  proseProgress,
  chapterCount,
  proseChapterCount,
  materialScore,
  commercialReadiness,
  activeTaskCount,
  onOpenProductionDesk,
  onOpenTaskCenter,
}: {
  proseProgress: { current: number; total: number }
  chapterCount: number
  proseChapterCount: number
  materialScore?: any
  commercialReadiness?: any
  activeTaskCount: number
  onOpenProductionDesk: () => void
  onOpenTaskCenter: () => void
}) {
  const readinessScore = Number(commercialReadiness?.score ?? 0)
  const materialNumericScore = Number(materialScore?.score ?? commercialReadiness?.score ?? 0)
  const writtenPercent = chapterCount > 0 ? Math.round(proseChapterCount / chapterCount * 100) : 0
  const generationPercent = proseProgress.total > 0 ? Math.round(proseProgress.current / proseProgress.total * 100) : 0
  const primaryAction = activeTaskCount > 0
    ? { label: '任务中心', icon: <SafetyOutlined />, onClick: onOpenTaskCenter }
    : { label: '主功能区', icon: <AppstoreOutlined />, onClick: onOpenProductionDesk }

  return (
    <div className="production-guide-summary-panel">
      <div className="production-guide-summary-header">
        <Space size={6}>
          <Text strong style={{ fontSize: 13 }}>项目进度</Text>
          {readinessScore > 0 && (
            <Tag
              color={commercialReadiness?.can_batch_generate ? 'green' : metricColor(readinessScore)}
              bordered={false}
              style={{ marginRight: 0 }}
            >
              就绪 {readinessScore}%
            </Tag>
          )}
        </Space>
        <Button
          size="small"
          type="text"
          className="production-guide-summary-action"
          icon={primaryAction.icon}
          onClick={primaryAction.onClick}
        >
          {primaryAction.label}
        </Button>
      </div>

      <div className="production-guide-summary-grid">
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>章节</Text>
          <Text strong>{chapterCount}</Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>已写</Text>
          <Text strong>{proseChapterCount}</Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>材料</Text>
          <Tag color={metricColor(materialNumericScore)} bordered={false}>{materialNumericScore || '-'}</Tag>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>任务</Text>
          <Tag color={activeTaskCount > 0 ? 'processing' : 'default'} bordered={false}>{activeTaskCount}</Tag>
        </div>
      </div>

      <Progress
        percent={writtenPercent}
        size="small"
        showInfo={false}
        status={chapterCount > 0 && proseChapterCount >= chapterCount ? 'success' : 'active'}
      />
      {proseProgress.current > 0 && (
        <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 4 }}>
          正在生成 {proseProgress.current}/{proseProgress.total || '-'} · {generationPercent}%
        </Text>
      )}
    </div>
  )
}
