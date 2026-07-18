import React from 'react'
import { Alert, Card, Space, Tag, Typography } from 'antd'
import { groupIncubationCharacters, INCUBATION_CHARACTER_TIER_LABELS } from './workspace-helpers'

const { Text, Paragraph } = Typography

export function renderOriginalIncubationPreviewContentView(payload: any) {
  const directions = Array.isArray(payload.directions) ? payload.directions : []
  const selectedDirection = payload.selected_direction || directions.slice().sort((a: any, b: any) => Number(b.score || 0) - Number(a.score || 0))[0] || null
  const isSelectedDirection = (direction: any) => selectedDirection && (
    direction === selectedDirection
    || (direction.direction_id && direction.direction_id === selectedDirection.direction_id)
    || (direction.title && direction.title === selectedDirection.title)
  )
  const characterGroups = groupIncubationCharacters(payload)
  return (
    <Space direction="vertical" size={10} style={{ width: '100%' }}>
      <Alert type="info" showIcon message={directions.length > 1 ? '系统已生成多个原创方向并按商业可行性竞选；确认后会入库评分最高/模型推荐方案。' : '请先核对核心卖点、角色和前 30 章方向。确认后才会写入项目资料。'} />
      {directions.length > 0 && (
        <Card size="small" title="候选方向">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {directions.map((direction: any, index: number) => (
              <div key={direction.direction_id || direction.title || index} style={{ padding: 10, border: isSelectedDirection(direction) ? '1px solid #1677ff' : '1px solid #e5e7eb', borderRadius: 8 }}>
                <Space wrap>
                  <Tag color={isSelectedDirection(direction) ? 'blue' : 'default'} bordered={false}>{isSelectedDirection(direction) ? '推荐' : `方案${index + 1}`}</Tag>
                  <Text strong>{direction.title || direction.core_hook || '未命名方向'}</Text>
                  {direction.score !== undefined && <Tag bordered={false}>评分 {direction.score}</Tag>}
                </Space>
                <Paragraph style={{ margin: '6px 0 0' }} ellipsis={{ rows: 2, expandable: true }}>
                  {direction.core_hook || direction.selection_reason || JSON.stringify(direction.commercial_positioning || {})}
                </Paragraph>
              </div>
            ))}
          </Space>
        </Card>
      )}
      <Card size="small" title="商业定位">
        <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 5, expandable: true }}>
          {JSON.stringify(payload.commercial_positioning || {}, null, 2)}
        </Paragraph>
      </Card>
      <Card size="small" title="主要角色">
        {characterGroups.length > 0 ? (
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            {characterGroups.map(group => (
              <div key={group.tier}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                  {INCUBATION_CHARACTER_TIER_LABELS[group.tier] || group.tier}
                </Text>
                <Space wrap>
                  {group.rows.map((char: any) => (
                    <Tag key={char.name || char.title} bordered={false}>
                      {char.name || char.title} · {char.narrative_function || char.supporting_function || char.role_type || char.role || '-'}
                    </Tag>
                  ))}
                </Space>
              </div>
            ))}
          </Space>
        ) : (
          <Text type="secondary">暂无角色预览</Text>
        )}
      </Card>
      <Card size="small" title="章节方向">
        <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 6, expandable: true }}>
          {(payload.chapters || []).slice(0, 12).map((chapter: any) => `第${chapter.chapter_no}章 ${chapter.title}：${chapter.chapter_goal || chapter.chapter_summary || ''}`).join('
')}
        </Paragraph>
      </Card>
    </Space>
  )
}

export function renderOriginalIncubationEmptyErrorContentView(data: any) {
  return (
    <Space direction="vertical" size={10} style={{ width: '100%' }}>
      <Text>{data.error || '模型返回为空，请重试或切换模型。'}</Text>
      <Text type="secondary">建议：补充项目简介、题材、目标读者，或换一个更稳定的模型后再试。</Text>
      {data.raw_preview && (
        <Card size="small" title="模型原始返回片段">
          <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 8, expandable: true }}>
            {data.raw_preview}
          </Paragraph>
        </Card>
      )}
    </Space>
  )
}
