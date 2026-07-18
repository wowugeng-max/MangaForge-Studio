import React, { useEffect, useState } from 'react'
import { Button, Card, Col, Progress, Row, Space, Tag, Typography } from 'antd'
import {
  AuditOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  RocketOutlined,
  TeamOutlined,
  UpOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { WritingCockpitActionKey, WritingCockpitModel } from './writingCockpitModel'
import './WritingCockpitPanel.css'
import {
  actionIcon,
  blockerAlert,
  checkColor,
  compactNumber,
  readinessPercent,
  readinessStatus,
  roleIcon,
} from './writing-cockpit/panel-utils'
import { LongformWorkflowStrip } from './writing-cockpit/panel-workflow-strip'
import { ChapterPlanningDesk } from './writing-cockpit/panel-planning-desk'
import { ChapterAcceptanceDesk, StoryStateSyncBanner } from './writing-cockpit/panel-acceptance-desk'

const { Paragraph, Text } = Typography

export type WritingCockpitPrimaryActionOverride = {
  label: string
  reason: string
  actionKey: WritingCockpitActionKey
  onClick: () => void
}

export function WritingCockpitPanel({
  model,
  loading = false,
  forceCollapsed = false,
  primaryActionOverride,
  onOpenProductionOps,
  onAction,
}: {
  model: WritingCockpitModel
  loading?: boolean
  forceCollapsed?: boolean
  primaryActionOverride?: WritingCockpitPrimaryActionOverride | null
  onOpenProductionOps?: () => void
  onAction: (key: WritingCockpitActionKey) => void
}) {
  const recommendedRole = model.modelTeam.recommendedRole
  const [cockpitCollapsed, setCockpitCollapsed] = useState(true)
  const [cockpitDetailsOpen, setCockpitDetailsOpen] = useState(false)
  const needsStoryStateSurface = Boolean(
    model.chapterAcceptanceDesk.visible
    && model.chapterAcceptanceDesk.storyStatePanel
    && model.chapterAcceptanceDesk.storyStatePanel.status !== 'synced',
  )
  const shouldSurfaceAcceptance = Boolean(
    model.chapterAcceptanceDesk.visible
    && (model.chapterAcceptanceDesk.shouldAutoExpandAcceptance || needsStoryStateSurface),
  )
  const nextChapterLabel = model.nextChapter
    ? `第${model.nextChapter.chapterNo}章 · ${model.nextChapter.title || '未命名章节'}`
    : '等待规划下一章'
  const whyItMatters = model.nextChapter?.whyItMatters || '先补齐章节规划，再确认本章要服务的卷目标。'
  const previousHook = model.nextChapter?.previousEnding || model.previousChapter?.endingHook || '暂无上一章钩子，请先确认承接点。'
  const percent = readinessPercent(model)
  const readinessTagColor = model.readiness.blockers.length ? 'red' : model.readiness.warnings.length ? 'gold' : 'green'
  const concernChecks = model.readiness.checks.filter(check => check.status !== 'pass').slice(0, 3)
  const primaryKey = primaryActionOverride?.actionKey || model.topStatus.primaryActionKey
  const primaryLabel = primaryActionOverride?.label || model.topStatus.nextActionLabel
  const runPrimary = () => {
    if (primaryActionOverride?.onClick) primaryActionOverride.onClick()
    else onAction(primaryKey)
  }

  useEffect(() => {
    if (forceCollapsed) setCockpitCollapsed(true)
  }, [forceCollapsed])

  useEffect(() => {
    if (forceCollapsed) return
    if (!shouldSurfaceAcceptance) return
    setCockpitDetailsOpen(true)
  }, [forceCollapsed, shouldSurfaceAcceptance, model.nextChapter?.id, model.chapterAcceptanceDesk.acceptanceStatus])

  if (cockpitCollapsed) {
    return (
      <div className="writing-cockpit-panel is-collapsed" style={{ width: '100%' }}>
        <Card
          className="writing-cockpit-card writing-cockpit-card-collapsed"
          size="small"
          loading={loading && model.readiness.checks.length === 0}
          styles={{ body: { padding: '6px 10px' } }}
        >
          <div className="writing-cockpit-summary-strip">
            <div className="writing-cockpit-summary-left">
              <Tag color="blue" bordered={false}>{model.topStatus.currentRoleLabel}</Tag>
              <Text strong className="writing-cockpit-summary-chapter">{nextChapterLabel}</Text>
            </div>
            <div className="writing-cockpit-summary-center">
              <Tag color={readinessTagColor} bordered={false}>准备度 {percent}%</Tag>
              {model.readiness.blockers[0] && (
                <Tag color="red" bordered={false}>{model.readiness.blockers[0].label}</Tag>
              )}
              {model.readiness.blockers.length > 1 && (
                <Tag bordered={false}>+{model.readiness.blockers.length - 1}</Tag>
              )}
            </div>
            <div className="writing-cockpit-summary-right">
              {onOpenProductionOps && (
                <Button size="small" icon={<RocketOutlined />} onClick={onOpenProductionOps}>
                  无人值守
                </Button>
              )}
              {model.chapterAcceptanceDesk.storyStatePanel?.primaryAction
                && model.chapterAcceptanceDesk.storyStatePanel.status !== 'synced' && (
                <Button
                  type="primary"
                  size="small"
                  loading={loading}
                  icon={actionIcon('sync_story_state', recommendedRole)}
                  onClick={() => onAction(model.chapterAcceptanceDesk.storyStatePanel!.primaryAction!.key)}
                >
                  {model.chapterAcceptanceDesk.storyStatePanel.primaryAction.label}
                </Button>
              )}
              <Button
                type={model.chapterAcceptanceDesk.storyStatePanel?.status && model.chapterAcceptanceDesk.storyStatePanel.status !== 'synced' ? 'default' : 'primary'}
                size="small"
                className="writing-cockpit-summary-primary"
                loading={loading}
                icon={actionIcon(primaryKey, recommendedRole)}
                onClick={runPrimary}
              >
                {primaryLabel}
              </Button>
              <Button size="small" icon={<DownOutlined />} onClick={() => setCockpitCollapsed(false)}>
                展开详情
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="writing-cockpit-panel is-expanded" style={{ width: '100%' }}>
      <Card
        className="writing-cockpit-card writing-cockpit-card-expanded"
        size="small"
        loading={loading && model.readiness.checks.length === 0}
        styles={{ body: { padding: 12 } }}
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Row className="writing-cockpit-header" align="middle" gutter={[10, 8]}>
            <Col flex="auto" style={{ minWidth: 0 }}>
              <Space wrap size={[6, 4]}>
                <Tag icon={<TeamOutlined />} color="purple" bordered={false}>写作指挥台</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>规划、交稿、质检和模型团队建议</Text>
              </Space>
            </Col>
            <Col flex="none">
              <Space wrap size={[6, 6]} style={{ justifyContent: 'flex-end' }}>
                {onOpenProductionOps && (
                  <Button size="small" icon={<RocketOutlined />} onClick={onOpenProductionOps}>
                    无人值守
                  </Button>
                )}
                <Button size="small" icon={<UpOutlined />} onClick={() => setCockpitCollapsed(true)}>
                  收起
                </Button>
              </Space>
            </Col>
          </Row>

          <Row className="writing-cockpit-command-grid" gutter={[12, 10]} align="middle">
            <Col xs={24} lg={8}>
              <Space className="writing-cockpit-target-block" direction="vertical" size={4} style={{ width: '100%' }}>
                <Space wrap size={[6, 4]}>
                  <Tag color="blue" bordered={false}>{model.topStatus.currentRoleLabel}</Tag>
                  <Tag bordered={false}>{model.topStatus.currentVolume}</Tag>
                  <Tag color="cyan" bordered={false}>{compactNumber(model.topStatus.writtenWords)} 字</Tag>
                </Space>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>今日写作目标</Text>
                <Text strong style={{ display: 'block' }}>{nextChapterLabel}</Text>
                <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0, fontSize: 12 }}>
                  {whyItMatters}
                </Paragraph>
              </Space>
            </Col>

            <Col xs={24} lg={6}>
              <Space className="writing-cockpit-readiness-block" direction="vertical" size={4} style={{ width: '100%' }}>
                <Space size={6}>
                  <Text type="secondary" style={{ fontSize: 12 }}>准备度</Text>
                  <Tag color={readinessTagColor} bordered={false}>
                    {model.readiness.blockers.length ? `${model.readiness.blockers.length} 阻塞` : model.readiness.warnings.length ? `${model.readiness.warnings.length} 警告` : '可写'}
                  </Tag>
                </Space>
                <Progress percent={percent} size="small" status={readinessStatus(model)} />
                <Space wrap size={[4, 4]}>
                  {concernChecks.map(check => (
                    <Tag key={check.key} color={checkColor(check.status)} bordered={false}>
                      {check.status === 'warning' ? <WarningOutlined /> : <ExclamationCircleOutlined />}
                      {' '}
                      {check.label}
                    </Tag>
                  ))}
                </Space>
              </Space>
            </Col>

            <Col xs={24} lg={5}>
              <Space className="writing-cockpit-pipeline-block" direction="vertical" size={4} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>草稿流水线</Text>
                <Space wrap size={[6, 4]}>
                  <Tag color={model.draftPipeline.state === 'draft_generated' ? 'green' : model.draftPipeline.state === 'no_draft' ? 'blue' : 'default'} bordered={false}>
                    {model.draftPipeline.label}
                  </Tag>
                  {model.nextChapter?.hasProse && <Tag color="green" bordered={false}>已有正文</Tag>}
                </Space>
              </Space>
            </Col>

            <Col xs={24} lg={5}>
              <Button
                type="primary"
                block
                loading={loading}
                icon={actionIcon(primaryKey, recommendedRole)}
                onClick={runPrimary}
                style={{ whiteSpace: 'normal', height: 'auto', minHeight: 36, lineHeight: 1.3, paddingTop: 6, paddingBottom: 6 }}
              >
                {primaryLabel}
              </Button>
            </Col>
          </Row>

          <LongformWorkflowStrip model={model} loading={loading} onAction={onAction} />

          {blockerAlert(model, loading, onAction)}

          {needsStoryStateSurface && (
            <StoryStateSyncBanner model={model} loading={loading} onAction={onAction} />
          )}

          <details
            className="writing-cockpit-details"
            open={cockpitDetailsOpen}
            onToggle={(e) => setCockpitDetailsOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="writing-cockpit-details-summary">
              {needsStoryStateSurface ? '写作详情 · 故事状态待同步' : '写作详情'}
            </summary>
            <div className="writing-cockpit-details-body">
              <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
                承接钩子：{previousHook}
              </Paragraph>

              {model.chapterAcceptanceDesk.visible ? (
                <ChapterAcceptanceDesk model={model} loading={loading} onAction={onAction} />
              ) : (
                <ChapterPlanningDesk model={model} loading={loading} onAction={onAction} />
              )}

              <Row gutter={[12, 8]} align="top">
                <Col xs={24} lg={15}>
                  <Space className="writing-cockpit-role-strip" wrap size={[6, 6]}>
                    <Tag icon={<TeamOutlined />} color="purple" bordered={false}>模型团队</Tag>
                    {model.modelTeam.roles.map(role => (
                      <Tag
                        key={role.key}
                        icon={roleIcon(role.key)}
                        color={role.active ? 'blue' : 'default'}
                        bordered={!role.active}
                        title={role.description}
                      >
                        {role.label}
                      </Tag>
                    ))}
                  </Space>
                </Col>
                <Col xs={24} lg={9}>
                  <Space wrap size={[6, 6]} style={{ justifyContent: 'flex-start', width: '100%' }}>
                    <Tag icon={<AuditOutlined />} bordered={false}>推荐：{model.topStatus.currentRoleLabel}</Tag>
                    {model.readiness.blockers.map(blocker => (
                      <Tag key={blocker.key} color="red" bordered={false}>{blocker.label}</Tag>
                    ))}
                    {model.readiness.warnings.map(warning => (
                      <Tag key={warning.key} color="gold" bordered={false}>{warning.label}</Tag>
                    ))}
                  </Space>
                </Col>
              </Row>
            </div>
          </details>
        </Space>
      </Card>
    </div>
  )
}
