import React from 'react'
import { Alert, Card, Space, Tag, Typography } from 'antd'

const { Text } = Typography

export function CreateSummaryCard(props: {
  modeLabel: string
  title: string
  genre?: string
  framework?: string
  lengthLabel?: string
  score?: {
    overall: number
    grade: string
    statusLabel: string
    recommendCreate: boolean
  }
  volumeCount: number
  chapterCount: number
  foreshadowingCount: number
  characterCount?: number
  readinessTags?: Array<{ label: string; ok: boolean }>
  topRisks: string[]
}) {
  const scoreColor = props.score?.recommendCreate ? 'green' : 'gold'

  return (
    <Card size="small" title="开书摘要" style={{ borderRadius: 12 }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ minWidth: 72, color: '#999' }}>模式</span>
            <span>{props.modeLabel}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ minWidth: 72, color: '#999' }}>标题</span>
            <span style={{ fontWeight: 600 }}>{props.title || '-'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ minWidth: 72, color: '#999' }}>类型</span>
            <span>
              {[props.genre, props.framework].filter(Boolean).join(' / ') || '-'}
            </span>
          </div>
          {props.lengthLabel ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ minWidth: 72, color: '#999' }}>篇幅</span>
              <span>{props.lengthLabel}</span>
            </div>
          ) : null}
        </div>

        <Space wrap>
          {props.score ? (
            <Tag color={scoreColor} bordered={false}>
              评分 {props.score.overall} · {props.score.grade} · {props.score.statusLabel}
            </Tag>
          ) : null}
          <Tag color="purple" bordered={false}>分卷 {props.volumeCount}</Tag>
          <Tag color="geekblue" bordered={false}>细纲 {props.chapterCount}</Tag>
          <Tag color="cyan" bordered={false}>伏笔 {props.foreshadowingCount}</Tag>
          {typeof props.characterCount === 'number' ? (
            <Tag color="blue" bordered={false}>人物 {props.characterCount}</Tag>
          ) : null}
          {(props.readinessTags || []).map(tag => (
            <Tag key={tag.label} color={tag.ok ? 'green' : 'orange'} bordered={false}>
              {tag.label}
            </Tag>
          ))}
        </Space>

        {props.topRisks.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            message="主要风险"
            description={props.topRisks.join('；')}
          />
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            当前无高优先级风险，可在底部创建项目。
          </Text>
        )}
      </Space>
    </Card>
  )
}
