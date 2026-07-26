import React, { useState } from 'react'
import { Button, Card, Collapse, Space, Statistic, Tag, Typography } from 'antd'
import { BookOutlined, DatabaseOutlined, SettingOutlined, TeamOutlined } from '@ant-design/icons'
import { AssetCapabilityBoard } from './AssetCapabilityBoard'
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
  const [showAssetGraph, setShowAssetGraph] = useState(false)
  const [showWorkshop, setShowWorkshop] = useState(false)

  return (
    <div className="novel-story-assets-workspace">
      <section className="novel-story-assets-header">
        <div className="novel-story-assets-titleblock">
          <Space size={8} align="center">
            <DatabaseOutlined className="novel-story-assets-icon" />
            <Title level={4}>资产</Title>
            <Tag color={hasWritingBible ? 'green' : 'gold'} bordered={false}>
              {hasWritingBible ? '写作圣经已配置' : '待配置写作圣经'}
            </Tag>
          </Space>
          <Text type="secondary">
            角色、设定与本章关联。写作缺材料时可从这里补建并回填。
          </Text>
        </div>
        <Space wrap size={8}>
          <Button size="small" className="novel-btn-crystal novel-btn-crystal-display" icon={<BookOutlined />} onClick={onOpenWritingBibleEditor}>写作圣经</Button>
          <Button size="small" className="novel-btn-crystal novel-btn-crystal-display" icon={<SettingOutlined />} onClick={onOpenStoryStateEditor}>故事状态机</Button>
          <Button size="small" className="novel-btn-crystal novel-btn-crystal-display" onClick={onOpenCreativeCards}>资料卡</Button>
          <Button size="small" className="novel-btn-crystal novel-btn-crystal-display" onClick={onOpenReferenceEngineering}>参考工程</Button>
        </Space>
      </section>

      <div className="novel-story-assets-stats">
        <Card size="small"><Statistic title="世界设定" value={worldbuildingCount} suffix="条" /></Card>
        <Card size="small"><Statistic title="角色卡" value={characterCount} suffix="张" prefix={<TeamOutlined />} /></Card>
        <Card size="small"><Statistic title="大纲节点" value={outlineCount} suffix="个" /></Card>
        <Card size="small"><Statistic title="当前章节" value={activeChapter?.chapter_no || '-'} prefix="第" suffix={activeChapter?.chapter_no ? '章' : ''} /></Card>
      </div>

      <AssetCapabilityBoard
        projectId={projectId}
        activeChapter={activeChapter}
        selectedModelId={selectedModelId}
        onAssetsChanged={onAssetsApplied}
      />

      <Collapse
        className="novel-story-assets-secondary"
        onChange={(keys) => {
          const open = Array.isArray(keys) ? keys : [keys]
          setShowAssetGraph(open.includes("graph"))
          setShowWorkshop(open.includes("workshop"))
        }}
        items={[
          {
            key: "graph",
            label: "关系图（按需加载，默认折叠以降低内存）",
            children: showAssetGraph ? (
              <SettingAssetGraphPanel projectId={projectId} selectedModelId={selectedModelId} />
            ) : (
              <Text type="secondary">展开后加载关系图</Text>
            ),
          },
          {
            key: "workshop",
            label: "设定工坊（按需加载）",
            children: showWorkshop ? (
              <SettingWorkshopPanel
                projectId={projectId}
                activeChapter={activeChapter}
                selectedModelId={selectedModelId}
                initialSettings={projectSettings}
                layout="workspace"
                focusDiscoveredAssetsToken={focusDiscoveredAssetsToken}
                onAssetsApplied={onAssetsApplied}
              />
            ) : (
              <Text type="secondary">展开后加载设定工坊</Text>
            ),
          },
        ]}
      />
    </div>
  )
}
