import React from 'react'
import { Button, Card, Space, Typography } from 'antd'
import { DownOutlined, UpOutlined } from '@ant-design/icons'
import type { StoryPlanningBoardPanelsProps } from './story-planning-board-types'
import { StoryPlanningExpandFlowCard } from './story-planning-board-panels-expand'
import { StoryPlanningCreationPipelineCard } from './story-planning-board-panels-pipeline'
import { StoryPlanningOpsPanels } from './story-planning-board-panels-ops'
import { StoryPlanningAudiencePanels } from './story-planning-board-panels-audience'
import { StoryPlanningStoryPanels } from './story-planning-board-panels-story'

export type { StoryPlanningBoardLoadingKey, StoryPlanningBoardPanelsProps } from './story-planning-board-types'

const { Text } = Typography

export function StoryPlanningBoardPanels(props: StoryPlanningBoardPanelsProps) {
  const [healthOpen, setHealthOpen] = React.useState(false)
  const [advancedOpen, setAdvancedOpen] = React.useState(false)

  return (
    <>
      {/* 主路径：扩写流程 + 六段流水线 */}
      <StoryPlanningExpandFlowCard {...props} />
      <StoryPlanningCreationPipelineCard {...props} />

      {/* 卷结构与剧情体检 */}
      <StoryPlanningStoryPanels
        {...props}
        healthBoardsOpen={healthOpen}
        onToggleHealthBoards={() => setHealthOpen(value => !value)}
      />

      <Card size="small" styles={{ body: { padding: 12 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Space direction="vertical" size={2}>
            <Text strong>长线与读者视图（高级）</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              作战台、契约雷达、发布节奏、留存/试读等默认收起，不挡大纲扩写主路径。
            </Text>
          </Space>
          <Button
            size="small"
            icon={advancedOpen ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setAdvancedOpen(value => !value)}
          >
            {advancedOpen ? '收起高级视图' : '展开高级视图'}
          </Button>
        </div>
      </Card>

      {advancedOpen ? (
        <>
          <StoryPlanningOpsPanels {...props} />
          <StoryPlanningAudiencePanels {...props} />
        </>
      ) : null}
    </>
  )
}
