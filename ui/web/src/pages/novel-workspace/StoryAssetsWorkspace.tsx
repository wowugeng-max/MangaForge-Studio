import React from 'react'
import { Button, Card, Space, Statistic, Tag, Typography } from 'antd'
import { BookOutlined, DatabaseOutlined, SettingOutlined, TeamOutlined } from '@ant-design/icons'
import { SettingAssetGraphPanel } from './SettingAssetGraphPanel'
import { SettingWorkshopPanel } from './SettingWorkshopPanel'
import './StoryAssetsWorkspace.css'

const { Text, Title } = Typography

export function StoryAssetsWorkspace({
  projectId,
  activeChapter,
  selectedModelId,
  projectSettings,
  worldbuildingCount,
  characterCount,
  outlineCount,
  hasWritingBible,
  focusDiscoveredAssetsToken,
  onOpenWritingBibleEditor,
  onOpenStoryStateEditor,
  onOpenCreativeCards,
  onOpenReferenceEngineering,
  onAssetsApplied,
}: {
  projectId: number
  activeChapter?: any | null
  selectedModelId?: number
  projectSettings?: any[]
  worldbuildingCount: number
  characterCount: number
  outlineCount: number
  hasWritingBible: boolean
  focusDiscoveredAssetsToken?: number
  onOpenWritingBibleEditor: () => void
  onOpenStoryStateEditor: () => void
  onOpenCreativeCards: () => void
  onOpenReferenceEngineering: () => void
  onAssetsApplied?: () => void
}) {
  return (
    <div className="novel-story-assets-workspace">
      <section className="novel-story-assets-header">
        <div className="novel-story-assets-titleblock">
          <Space size={8} align="center">
            <DatabaseOutlined className="novel-story-assets-icon" />
            <Title level={4}>设定资产</Title>
            <Tag color={hasWritingBible ? 'green' : 'gold'} bordered={false}>
              {hasWritingBible ? '写作圣经已配置' : '待配置写作圣经'}
            </Tag>
          </Space>
          <Text type="secondary">
            集中维护角色、能力、物品、势力、地点、剧情线和新资产候选；这些资产会进入章节任务书、正文生成和交稿后的状态回填。
          </Text>
        </div>
        <Space wrap size={8}>
          <Button size="small" type="primary" icon={<BookOutlined />} onClick={onOpenWritingBibleEditor}>写作圣经</Button>
          <Button size="small" icon={<SettingOutlined />} onClick={onOpenStoryStateEditor}>故事状态机</Button>
          <Button size="small" onClick={onOpenCreativeCards}>资料卡</Button>
          <Button size="small" onClick={onOpenReferenceEngineering}>参考工程</Button>
        </Space>
      </section>

      <div className="novel-story-assets-stats">
        <Card size="small"><Statistic title="世界设定" value={worldbuildingCount} suffix="条" /></Card>
        <Card size="small"><Statistic title="角色卡" value={characterCount} suffix="张" prefix={<TeamOutlined />} /></Card>
        <Card size="small"><Statistic title="大纲节点" value={outlineCount} suffix="个" /></Card>
        <Card size="small"><Statistic title="当前章节" value={activeChapter?.chapter_no || '-'} prefix="第" suffix={activeChapter?.chapter_no ? '章' : ''} /></Card>
      </div>

      <SettingAssetGraphPanel projectId={projectId} />

      <Card className="novel-story-assets-workbench" bordered={false}>
        <SettingWorkshopPanel
          projectId={projectId}
          activeChapter={activeChapter}
          selectedModelId={selectedModelId}
          initialSettings={projectSettings}
          layout="workspace"
          focusDiscoveredAssetsToken={focusDiscoveredAssetsToken}
          onAssetsApplied={onAssetsApplied}
        />
      </Card>
    </div>
  )
}
