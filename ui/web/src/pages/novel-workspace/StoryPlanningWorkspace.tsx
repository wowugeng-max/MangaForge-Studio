import React from 'react'
import { Button, Card, Grid, Progress, Space, Tag, Typography } from 'antd'
import {
  BranchesOutlined,
  DownOutlined,
  EditOutlined,
  NodeIndexOutlined,
  PartitionOutlined,
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
  const recommended = model.creationPipeline.primaryAction
  const recommendedNeedsModel = [
    'update_rolling_plan',
    'future100_generate',
    'future100_audit',
    'longform_pressure',
    'longform_creation_diagnosis',
    'topic_validation',
    'reference_diagnosis',
    'update_story_state',
    'complete_volume_plan',
  ].includes(recommended.key)
  const recommendedLoading = (
    (recommended.key === 'update_rolling_plan' && loadingKey === 'rollingPlan')
    || (recommended.key === 'future100_generate' && loadingKey === 'future100Generate')
    || (recommended.key === 'future100_audit' && loadingKey === 'future100Audit')
    || (recommended.key === 'longform_pressure' && loadingKey === 'longformPressure')
    || (recommended.key === 'longform_creation_diagnosis' && loadingKey === 'longformCreationDiagnosis')
    || (recommended.key === 'update_story_state' && loadingKey === 'rollingPlan')
  )
  const recommendedIcon = recommended.key === 'future100_generate' || recommended.key === 'future100_audit'
    ? <NodeIndexOutlined />
    : recommended.key === 'update_rolling_plan' || recommended.key === 'complete_volume_plan'
      ? <BranchesOutlined />
      : recommended.key === 'open_outline_tree'
        ? <PartitionOutlined />
        : recommended.key === 'enter_chapter_writing'
          ? <EditOutlined />
          : <PartitionOutlined />

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
                      近窗细纲 {model.topStatus.future10Coverage.planned}/{model.topStatus.future10Coverage.required}
                    </Text>
                    <Text type="secondary">
                      远景骨架 {model.topStatus.future100Coverage.planned}/{model.topStatus.future100Coverage.required}
                    </Text>
                    <Text type="secondary">
                      下一步：{recommended.label}
                    </Text>
                  </Space>
                  <Progress percent={wordPercent} size="small" showInfo={false} />
                </>
              )}
            </Space>
            <Space wrap style={{ justifyContent: 'flex-end' }}>
              <Button
                type="text"
                icon={overviewCollapsed ? <DownOutlined /> : <UpOutlined />}
                onClick={() => setOverviewCollapsed(value => !value)}
              >
                {overviewCollapsed ? '展开' : '收起'}
              </Button>
              {recommended.key !== 'enter_chapter_writing' && (
                <Button icon={<EditOutlined />} onClick={() => onAction('enter_chapter_writing')}>
                  进入写作
                </Button>
              )}
              <Button
                type="primary"
                icon={recommendedIcon}
                loading={Boolean(recommendedLoading)}
                disabled={Boolean(recommendedNeedsModel) && !selectedModelId}
                onClick={() => onAction(recommended.key)}
              >
                {recommended.label}
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
