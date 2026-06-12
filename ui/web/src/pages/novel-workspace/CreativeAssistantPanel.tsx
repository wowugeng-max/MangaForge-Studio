import React, { useMemo, useState } from 'react'
import { Alert, Button, Drawer, Input, Space, Tag, Typography } from 'antd'
import {
  BulbOutlined,
  CopyOutlined,
  FileSearchOutlined,
  GlobalOutlined,
  NodeIndexOutlined,
  PartitionOutlined,
  RadarChartOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import {
  CREATIVE_ASSISTANT_MODES,
  buildCreativeAssistantContextChips,
  buildCreativeAssistantFallbackCards,
  type CreativeAssistCard,
  type CreativeAssistResult,
  type CreativeAssistantModeKey,
} from './creativeAssistantModel'
import './CreativeAssistantPanel.css'

const { Paragraph, Text } = Typography

export const CREATIVE_ASSISTANT_PANEL_LABELS = ['正文评析', '下一章', '后续大纲', '伏笔', '人物剧情', '能力物品', '联网资料']

function modeIcon(mode: CreativeAssistantModeKey) {
  if (mode === 'prose_review') return <FileSearchOutlined />
  if (mode === 'next_chapter') return <BulbOutlined />
  if (mode === 'outline_expand') return <NodeIndexOutlined />
  if (mode === 'foreshadowing') return <RadarChartOutlined />
  if (mode === 'character_arc') return <TeamOutlined />
  if (mode === 'system_design') return <ToolOutlined />
  return <GlobalOutlined />
}

function cardTypeLabel(type: string) {
  if (type === 'evaluation') return '评析'
  if (type === 'revision') return '修订'
  if (type === 'branch') return '分支'
  if (type === 'outline') return '大纲'
  if (type === 'foreshadowing') return '伏笔'
  if (type === 'character_arc') return '人物'
  if (type === 'system_rule') return '体系'
  if (type === 'research') return '资料'
  return '建议'
}

export type CreativeAssistantPanelProps = {
  open: boolean
  loading: boolean
  mode: CreativeAssistantModeKey
  result: CreativeAssistResult | null
  project: any
  activeChapter: any
  selectedText: string
  contextPackage: any
  reviews: any[]
  error?: string
  onClose: () => void
  onModeChange: (mode: CreativeAssistantModeKey) => void
  onRun: (input: { mode: CreativeAssistantModeKey; question: string; researchQuery: string }) => void
  onCopyCard: (card: CreativeAssistCard) => void
}

export function CreativeAssistantPanel({
  open,
  loading,
  mode,
  result,
  project,
  activeChapter,
  selectedText,
  contextPackage,
  reviews,
  error,
  onClose,
  onModeChange,
  onRun,
  onCopyCard,
}: CreativeAssistantPanelProps) {
  const [question, setQuestion] = useState('')
  const [researchQuery, setResearchQuery] = useState('')
  const activeMode = CREATIVE_ASSISTANT_MODES.find(item => item.key === mode) || CREATIVE_ASSISTANT_MODES[0]
  const chips = useMemo(() => buildCreativeAssistantContextChips({
    project,
    activeChapter,
    selectedText,
    contextPackage,
    reviews,
  }), [project, activeChapter, selectedText, contextPackage, reviews])
  const fallbackCards = useMemo(() => buildCreativeAssistantFallbackCards(mode, {
    project,
    activeChapter,
    selectedText,
    reviews,
  }), [mode, project, activeChapter, selectedText, reviews])
  const cards = result?.mode === mode && result.cards.length ? result.cards : fallbackCards

  return (
    <Drawer
      className="creative-assistant-panel"
      open={open}
      width={520}
      title={(
        <Space size={8}>
          <PartitionOutlined />
          <span>创作参谋</span>
        </Space>
      )}
      onClose={onClose}
    >
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <div className="creative-assistant-context">
          <Space wrap size={[6, 6]}>
            {chips.length ? chips.map(chip => (
              <Tag key={chip.key} color={chip.tone === 'ready' ? 'blue' : chip.tone === 'warn' ? 'gold' : 'default'} bordered={false}>
                {chip.label}
              </Tag>
            )) : <Tag bordered={false}>项目级建议</Tag>}
          </Space>
        </div>

        <div className="creative-assistant-modes" aria-label="创作参谋模式">
          {CREATIVE_ASSISTANT_MODES.map(item => (
            <Button
              key={item.key}
              size="small"
              type={item.key === mode ? 'primary' : 'default'}
              icon={modeIcon(item.key)}
              onClick={() => onModeChange(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className="creative-assistant-prompt">
          <Text strong>{activeMode.label}</Text>
          <Paragraph type="secondary" style={{ margin: '4px 0 8px' }}>{activeMode.description}</Paragraph>
          <Input.TextArea
            value={question}
            rows={3}
            placeholder="写下你的创作问题、想要尝试的方向，或当前卡住的点"
            onChange={event => setQuestion(event.target.value)}
          />
          {mode === 'research_cards' && (
            <Input
              className="creative-assistant-research-input"
              value={researchQuery}
              placeholder="输入关键词或 URL"
              onChange={event => setResearchQuery(event.target.value)}
            />
          )}
          <Button
            type="primary"
            loading={loading}
            icon={<BulbOutlined />}
            onClick={() => onRun({ mode, question, researchQuery })}
          >
            生成建议
          </Button>
        </div>

        {error && <Alert type="warning" showIcon message={error} />}
        {result?.warnings?.map(item => (
          <Alert key={item} type="warning" showIcon message={item} />
        ))}

        <div className="creative-assistant-card-list">
          {cards.map(card => (
            <article key={card.id} className="creative-assistant-card">
              <div className="creative-assistant-card-head">
                <Tag bordered={false}>{cardTypeLabel(card.type)}</Tag>
                <Text strong>{card.title}</Text>
              </div>
              <Paragraph style={{ marginBottom: 8 }}>{card.suggestion}</Paragraph>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text type="secondary">目的：{card.intent}</Text>
                <Text type="secondary">依据：{card.reason}</Text>
                <Text type="secondary">风险：{card.risk}</Text>
              </Space>
              <div className="creative-assistant-card-actions">
                <Button size="small" icon={<CopyOutlined />} onClick={() => onCopyCard(card)}>复制</Button>
              </div>
            </article>
          ))}
        </div>
      </Space>
    </Drawer>
  )
}
