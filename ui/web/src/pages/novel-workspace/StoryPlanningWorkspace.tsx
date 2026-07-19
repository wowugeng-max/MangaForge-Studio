import React from 'react'
import { Button, Card, Grid, Progress, Space, Tag, Typography } from 'antd'
import {
  BranchesOutlined,
  DownOutlined,
  EditOutlined,
  NodeIndexOutlined,
  UpOutlined,
} from '@ant-design/icons'
import type { PlanningActionKey, PlanningWorkspaceModel } from './planningWorkspaceModel'
import {
  healthColor,
  formatWords,
} from './planning/story-planning-chrome'
import { StoryPlanningBoardPanels } from './planning/story-planning-board-panels'

const { Text } = Typography
const { useBreakpoint } = Grid

export type PlanningLoadingKey = 'rollingPlan' | 'future100Audit' | 'future100Generate' | 'longformPressure' | 'longformCreationDiagnosis' | 'topic' | 'referenceDiagnosis' | 'first30Retention' | 'first30Repair' | 'readerTrial' | 'readerTrialRepair'

export type StoryPlanningWorkspaceProps = {
  model: PlanningWorkspaceModel
  selectedModelId?: number
  loadingKey?: PlanningLoadingKey
  onAction: (key: PlanningActionKey, options?: { intent?: any }) => void
  onSelectChapter: (chapterNo: number) => void
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

        <StoryPlanningBoardPanels
          model={model}
          selectedModelId={selectedModelId}
          loadingKey={loadingKey}
          onAction={onAction}
          onSelectChapter={onSelectChapter}
          compact={compact}
        />
      </div>
    </div>
  )
}
