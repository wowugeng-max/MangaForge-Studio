import React from 'react'
import { Button, Card, Col, Descriptions, Progress, Row, Space, Tag, Tooltip, Typography } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { chapterStatusTag, displayValue, wc } from './utils'

const { Title, Text, Paragraph } = Typography

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'unsaved') return <Tooltip title="有未保存的修改"><ClockCircleOutlined style={{ color: '#faad14' }} /></Tooltip>
  if (status === 'saving') return <Tooltip title="保存中…"><SyncOutlined style={{ color: '#1677ff', animation: 'spin 1s linear infinite' }} /></Tooltip>
  if (status === 'saved') return <Tooltip title="已保存"><CheckCircleOutlined style={{ color: '#52c41a' }} /></Tooltip>
  return null
}

export function WorkspaceCenter({
  isEmptyProject,
  selectedProject,
  activeChapter,
  worldbuildingCount,
  characterCount,
  outlineCount,
  streamingChapterId,
  streamingText,
  streamingProgress,
  streamingPercent,
  streamingEndRef,
  proseEditorRef,
  saveStatus,
  planning,
  generatingProse,
  onRunPlan,
  onCreateOutline,
  onCreateChapter,
  onGenerateCurrentChapterProse,
  onEditActiveChapter,
  onChapterTextChange,
}: {
  isEmptyProject: boolean
  selectedProject: any | null
  activeChapter: any | null
  worldbuildingCount: number
  characterCount: number
  outlineCount: number
  streamingChapterId: number | null
  streamingText: string
  streamingProgress: string
  streamingPercent: number
  streamingEndRef: React.RefObject<HTMLDivElement | null>
  proseEditorRef: React.RefObject<HTMLTextAreaElement | null>
  saveStatus: SaveStatus
  planning: boolean
  generatingProse: boolean
  onRunPlan: () => void
  onCreateOutline: () => void
  onCreateChapter: () => void
  onGenerateCurrentChapterProse: () => void
  onEditActiveChapter: () => void
  onChapterTextChange: (text: string) => void
}) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fafbfc' }}>
      {isEmptyProject && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 32 }}>
          <div style={{ maxWidth: 640, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🚀</div>
            <Title level={3}>欢迎开始创作《{selectedProject?.title}》</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
              你的小说项目已创建。选择以下任一路径开始：
            </Text>
            <Row gutter={24} justify="center">
              {[
                { icon: '🤖', title: 'AI 一键初始化', desc: '自动生成世界观、角色、大纲', btn: <Button type="primary" loading={planning} onClick={onRunPlan}>开始规划</Button> },
                { icon: '✏️', title: '手动创建', desc: '从大纲开始逐步构建', btn: <Button onClick={onCreateOutline}>创建大纲</Button> },
                { icon: '📝', title: '直接写第一章', desc: '跳过规划直接写正文', btn: <Button onClick={onCreateChapter}>新增章节</Button> },
              ].map(card => (
                <Col key={card.title} xs={22} sm={12}>
                  <Card hoverable style={{ borderRadius: 16, height: '100%' }}
                    bodyStyle={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>{card.icon}</div>
                    <Title level={5}>{card.title}</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{card.desc}</Text>
                    {card.btn}
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      )}

      {!isEmptyProject && activeChapter && (
        <>
          <div style={{
            flexShrink: 0, padding: '10px 24px', background: '#fff',
            borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <Title level={5} style={{ margin: 0 }}>
              第{activeChapter.chapter_no}章《{displayValue(activeChapter.title) || '无标题'}》
            </Title>
            {chapterStatusTag(activeChapter)}
            <div style={{ flex: 1 }} />
            <Text type="secondary" style={{ fontSize: 13 }}>{wc(activeChapter.chapter_text)} 字</Text>
            <SaveIndicator status={saveStatus} />
            <Tooltip title="生成正文">
              <Button type="primary" size="small" icon={<PlayCircleOutlined />} loading={generatingProse} onClick={onGenerateCurrentChapterProse} />
            </Tooltip>
            <Button size="small" onClick={onEditActiveChapter} icon={<EditOutlined />}>元数据</Button>
          </div>

          {streamingChapterId === activeChapter.id && (
            <div style={{ flexShrink: 0, padding: '12px 24px', background: '#f0f7ff', borderBottom: '1px solid #d6e4ff' }}>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Space align="center">
                  <Text strong style={{ fontSize: 13 }}>🤖 生成进度</Text>
                  <Tag color="blue">{streamingProgress || '进行中'}</Tag>
                  <Text type="secondary">{Math.round(streamingPercent)}%</Text>
                </Space>
                <Progress percent={streamingPercent} status={streamingProgress === '生成失败' ? 'exception' : 'active'} size="small" />
                <Paragraph style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, maxHeight: 200, overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {streamingText}
                  <div ref={streamingEndRef} />
                </Paragraph>
              </Space>
            </div>
          )}

          <details style={{ flexShrink: 0, margin: 0 }}>
            <summary style={{ padding: '8px 24px', cursor: 'pointer', background: '#fafbfc', borderBottom: '1px solid #f0f0f0', fontSize: 13, color: '#999' }}>
              📋 章节上下文（展开查看章节目标、摘要、冲突、钩子）
            </summary>
            <div style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="章节目标">{displayValue(activeChapter.chapter_goal) || '-'}</Descriptions.Item>
                <Descriptions.Item label="章节摘要">{displayValue(activeChapter.chapter_summary) || '-'}</Descriptions.Item>
                <Descriptions.Item label="冲突">{displayValue(activeChapter.conflict) || '-'}</Descriptions.Item>
                <Descriptions.Item label="结尾钩子">{displayValue(activeChapter.ending_hook) || '-'}</Descriptions.Item>
                <Descriptions.Item label="状态">{displayValue(activeChapter.status) || '-'}</Descriptions.Item>
                <Descriptions.Item label="基础依赖">
                  {worldbuildingCount > 0 ? '✓ 世界观' : '✗ 世界观'} ·
                  {characterCount > 0 ? '✓ 角色' : '✗ 角色'} ·
                  {outlineCount > 0 ? '✓ 大纲' : '✗ 大纲'}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </details>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
            <textarea
              ref={proseEditorRef}
              value={activeChapter.chapter_text || ''}
              onChange={event => onChapterTextChange(event.target.value)}
              placeholder="开始写吧……（自动保存）"
              spellCheck={false}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                boxSizing: 'border-box', fontSize: 18, lineHeight: 1.85,
                fontFamily: 'Noto Serif SC, "Source Han Serif SC", Georgia, "Times New Roman", serif',
                fontWeight: 400, letterSpacing: 0, padding: '40px 80px',
                border: 'none', outline: 'none', background: '#fff',
                resize: 'none', color: '#1a1a1a', overflowY: 'auto',
                caretColor: '#1677ff', tabSize: 4,
              }}
            />
          </div>
        </>
      )}

      {!isEmptyProject && !activeChapter && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <Space direction="vertical" align="center" size={16}>
            <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <Title level={4}>请选择一个章节</Title>
            <Button type="primary" onClick={onCreateChapter}>创建第一章</Button>
          </Space>
        </div>
      )}
    </div>
  )
}
