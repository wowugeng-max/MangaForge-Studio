import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Progress, Row, Space, Tag, Typography } from 'antd'
import {
  AuditOutlined,
  BarChartOutlined,
  BookOutlined,
  CheckCircleOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  RetweetOutlined,
  SafetyOutlined,
  TeamOutlined,
  ToolOutlined,
  UpOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { WritingCockpitActionKey, WritingCockpitModel, WritingCockpitRole } from './writingCockpitModel'
import './WritingCockpitPanel.css'

const { Paragraph, Text } = Typography

export type WritingCockpitPrimaryActionOverride = {
  label: string
  reason: string
  actionKey: WritingCockpitActionKey
  onClick: () => void
}

function roleIcon(role: WritingCockpitRole) {
  if (role === 'chief_editor') return <BookOutlined />
  if (role === 'episode_planner') return <FileSearchOutlined />
  if (role === 'draft_writer') return <EditOutlined />
  if (role === 'revision_editor') return <FileTextOutlined />
  if (role === 'continuity_auditor') return <SafetyOutlined />
  return <BarChartOutlined />
}

function actionIcon(key: WritingCockpitActionKey, role: WritingCockpitRole) {
  if (key === 'write_draft') return <PlayCircleOutlined />
  if (key === 'repair_materials' || key === 'fix_continuity') return <ToolOutlined />
  if (key === 'refresh_current_quality') return <FileSearchOutlined />
  if (key === 'create_editor_report') return <AuditOutlined />
  if (key === 'open_editor_reports') return <AuditOutlined />
  if (key === 'apply_editor_revision') return <RetweetOutlined />
  if (key === 'sync_story_state') return <SafetyOutlined />
  if (key === 'accept_chapter_and_continue') return <CheckCircleOutlined />
  if (key === 'open_version_history') return <HistoryOutlined />
  return roleIcon(role)
}

function checkColor(status: string) {
  if (status === 'pass') return 'green'
  if (status === 'warning') return 'gold'
  if (status === 'blocker') return 'red'
  return 'default'
}

function readinessPercent(model: WritingCockpitModel) {
  const checks = model.readiness.checks
  if (!checks.length) return 0
  const passed = checks.filter(check => check.status === 'pass').length
  return Math.round((passed / checks.length) * 100)
}

function readinessStatus(model: WritingCockpitModel) {
  if (model.readiness.blockers.length > 0) return 'exception'
  if (model.readiness.warnings.length > 0) return 'active'
  return 'success'
}

function plannerColor(readiness: string) {
  if (readiness === 'ready') return 'green'
  if (readiness === 'needs_scene_plan') return 'blue'
  if (readiness === 'needs_context') return 'gold'
  return 'red'
}

function acceptanceColor(status: string) {
  if (status === 'ready_to_accept' || status === 'delivered') return 'green'
  if (status === 'needs_state_sync') return 'cyan'
  if (status === 'needs_recheck') return 'blue'
  if (status === 'needs_revision') return 'red'
  if (status === 'needs_quality_check') return 'gold'
  return 'default'
}

function qualityScoreText(value: number | null) {
  return value === null ? '未复检' : `${value} 分`
}

function compactPlanValue(value: string, fallback: string) {
  return value && value.trim() ? value : fallback
}

const wrapTextStyle: React.CSSProperties = {
  display: 'block',
  minWidth: 0,
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
}

function blockerAlert(model: WritingCockpitModel, loading: boolean, onAction: (key: WritingCockpitActionKey) => void) {
  const blocker = model.readiness.blockers[0]
  if (!blocker) return null
  const actionLabel = `处理：${blocker.label}`

  return (
    <Alert
      type="warning"
      showIcon
      icon={<ExclamationCircleOutlined />}
      message={blocker.label}
      description={blocker.detail}
      action={
        <Button
          size="small"
          disabled={loading}
          title={actionLabel}
          aria-label={actionLabel}
          onClick={() => onAction(blocker.actionKey)}
          style={{ whiteSpace: 'normal', height: 'auto', lineHeight: 1.25 }}
        >
          处理
        </Button>
      }
    />
  )
}

function compactNumber(value: number) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function ChapterPlanningDesk({
  model,
  loading,
  onAction,
}: {
  model: WritingCockpitModel
  loading: boolean
  onAction: (key: WritingCockpitActionKey) => void
}) {
  const desk = model.chapterPlanningDesk
  const [expanded, setExpanded] = useState(desk.shouldAutoExpandPlanner)

  useEffect(() => {
    setExpanded(desk.shouldAutoExpandPlanner)
  }, [desk.shouldAutoExpandPlanner, model.nextChapter?.id])

  const plan = desk.episodePlan

  return (
    <div
      className={`writing-cockpit-subdesk writing-cockpit-planning-desk writing-cockpit-planning-${desk.readiness}`}
      style={{
        width: '100%',
        minWidth: 0,
      }}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Row gutter={[12, 8]} align="middle">
          <Col xs={24} lg={14} style={{ minWidth: 0 }}>
            <Space wrap size={[6, 4]}>
              <Tag color={plannerColor(desk.readiness)} bordered={false}>{desk.statusLabel}</Tag>
              <Tag bordered={false}>上下文：{desk.contextPackageStatus === 'ready' ? '已就绪' : desk.contextPackageStatus === 'insufficient' ? '不足' : '未加载'}</Tag>
              <Tag bordered={false}>场景卡：{desk.scenePlanStatus === 'ready' ? `${desk.sceneCards.length} 个` : '缺失'}</Tag>
            </Space>
            <Paragraph ellipsis={{ rows: expanded ? 3 : 1 }} style={{ ...wrapTextStyle, margin: '6px 0 0', fontSize: 12 }}>
              {desk.reasons.slice(0, 3).join('；')}
            </Paragraph>
          </Col>
          <Col xs={24} lg={10}>
            <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button size="small" onClick={() => setExpanded(value => !value)}>
                {expanded ? '收起编剧台' : '展开编剧台'}
              </Button>
              <Button
                type={desk.readiness === 'ready' ? 'primary' : 'default'}
                size="small"
                loading={loading}
                onClick={() => onAction(desk.recommendedPlannerAction.key)}
                style={{ whiteSpace: 'normal', height: 'auto', lineHeight: 1.25 }}
              >
                {desk.recommendedPlannerAction.label}
              </Button>
            </Space>
          </Col>
        </Row>

        {expanded && (
          <Row gutter={[12, 10]}>
            <Col xs={24} lg={10} style={{ minWidth: 0 }}>
              <div style={{ background: '#fafafa', borderRadius: 6, padding: 10, minWidth: 0 }}>
                <Text strong style={{ ...wrapTextStyle, marginBottom: 6 }}>本章编剧计划</Text>
                <Space direction="vertical" size={6} style={{ width: '100%', minWidth: 0 }}>
                  <Text strong style={wrapTextStyle}>{compactPlanValue(plan.chapterObjective, '待补章节目标')}</Text>
                  <Text type="secondary" style={wrapTextStyle}>承接：{compactPlanValue(plan.previousHandoff, '待确认上一章承接')}</Text>
                  <Text type="secondary" style={wrapTextStyle}>冲突：{compactPlanValue(plan.coreConflict, '待补核心冲突')}</Text>
                  <Text type="secondary" style={wrapTextStyle}>情绪：{compactPlanValue(plan.emotionalMovement, '待补情绪推进')}</Text>
                  <Text type="secondary" style={wrapTextStyle}>爽点：{compactPlanValue(plan.payoff, '待补读者回报')}</Text>
                  <Text type="secondary" style={wrapTextStyle}>钩子：{compactPlanValue(plan.endingHook, '待补结尾钩子')}</Text>
                  {plan.forbiddenRepeats.length > 0 && (
                    <Space wrap size={[4, 4]}>
                      {plan.forbiddenRepeats.slice(0, 4).map(item => (
                        <Tag key={item} color="red" bordered={false}>{item}</Tag>
                      ))}
                    </Space>
                  )}
                </Space>
              </div>
            </Col>
            <Col xs={24} lg={14} style={{ minWidth: 0 }}>
              <div style={{ background: '#fafafa', borderRadius: 6, padding: 10, minWidth: 0 }}>
                <Text strong style={{ ...wrapTextStyle, marginBottom: 6 }}>场景卡</Text>
                {desk.sceneCards.length > 0 ? (
                  <Space direction="vertical" size={8} style={{ width: '100%', minWidth: 0 }}>
                    {desk.sceneCards.slice(0, 4).map(scene => (
                      <div key={`${scene.sceneNo}-${scene.title}`} style={{ border: '1px solid #edf0f5', borderRadius: 6, padding: 8, minWidth: 0 }}>
                        <Space direction="vertical" size={3} style={{ width: '100%', minWidth: 0 }}>
                          <Space wrap size={[4, 4]}>
                            <Tag color="blue" bordered={false}>场景 {scene.sceneNo}</Tag>
                            <Text strong style={wrapTextStyle}>{scene.title}</Text>
                          </Space>
                          <Text type="secondary" style={wrapTextStyle}>目的：{compactPlanValue(scene.purpose, '待补')}</Text>
                          <Text type="secondary" style={wrapTextStyle}>冲突：{compactPlanValue(scene.conflict, '待补')}</Text>
                          <Text type="secondary" style={wrapTextStyle}>转折：{compactPlanValue(scene.turn, '待补')}</Text>
                          <Text type="secondary" style={wrapTextStyle}>钩子：{compactPlanValue(scene.endingHook, '待补')}</Text>
                        </Space>
                      </div>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary" style={wrapTextStyle}>还没有场景卡。先生成场景计划，再进入初稿。</Text>
                )}
              </div>
            </Col>
          </Row>
        )}
      </Space>
    </div>
  )
}

function ChapterAcceptanceDesk({
  model,
  loading,
  onAction,
}: {
  model: WritingCockpitModel
  loading: boolean
  onAction: (key: WritingCockpitActionKey) => void
}) {
  const desk = model.chapterAcceptanceDesk
  const [expanded, setExpanded] = useState(desk.shouldAutoExpandAcceptance)

  useEffect(() => {
    setExpanded(desk.shouldAutoExpandAcceptance)
  }, [desk.shouldAutoExpandAcceptance, model.nextChapter?.id, desk.acceptanceStatus])

  return (
    <div
      className={`writing-cockpit-subdesk writing-cockpit-acceptance-desk writing-cockpit-acceptance-${desk.acceptanceStatus}`}
      style={{
        width: '100%',
        minWidth: 0,
      }}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Row gutter={[12, 8]} align="middle">
          <Col xs={24} lg={14} style={{ minWidth: 0 }}>
            <Space wrap size={[6, 4]}>
              <Tag color={acceptanceColor(desk.acceptanceStatus)} bordered={false}>{desk.statusLabel}</Tag>
              <Tag bordered={false}>质量：{qualityScoreText(desk.qualityScore)}</Tag>
              <Tag bordered={false}>故事状态：{desk.storyStateSynced ? '已同步' : '待同步'}</Tag>
            </Space>
            <Paragraph ellipsis={{ rows: expanded ? 3 : 1 }} style={{ ...wrapTextStyle, margin: '6px 0 0', fontSize: 12 }}>
              {desk.acceptanceReasons.slice(0, 3).join('；')}
            </Paragraph>
          </Col>
          <Col xs={24} lg={10}>
            <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button size="small" onClick={() => setExpanded(value => !value)}>
                {expanded ? '收起交稿台' : '展开交稿台'}
              </Button>
              <Button
                type={desk.acceptanceStatus === 'ready_to_accept' ? 'primary' : 'default'}
                size="small"
                loading={loading}
                icon={actionIcon(desk.recommendedAcceptanceAction.key, model.modelTeam.recommendedRole)}
                onClick={() => onAction(desk.recommendedAcceptanceAction.key)}
                style={{ whiteSpace: 'normal', height: 'auto', lineHeight: 1.25 }}
              >
                {desk.recommendedAcceptanceAction.label}
              </Button>
            </Space>
          </Col>
        </Row>

        {expanded && (
          <Row gutter={[12, 10]}>
            <Col xs={24} lg={10} style={{ minWidth: 0 }}>
              <div style={{ background: '#fafafa', borderRadius: 6, padding: 10, minWidth: 0 }}>
                <Text strong style={{ ...wrapTextStyle, marginBottom: 6 }}>编辑摘要</Text>
                <Space direction="vertical" size={6} style={{ width: '100%', minWidth: 0 }}>
                  <Text type="secondary" style={wrapTextStyle}>质量状态：{compactPlanValue(desk.qualityStatus, '未复检')}</Text>
                  <Text type="secondary" style={wrapTextStyle}>编辑报告：{compactPlanValue(desk.latestEditorReportSummary, '尚未生成编辑报告')}</Text>
                  <Text type="secondary" style={wrapTextStyle}>最近修订：{compactPlanValue(desk.latestRevisionSummary, '尚未生成修订稿')}</Text>
                </Space>
              </div>
            </Col>
            <Col xs={24} lg={14} style={{ minWidth: 0 }}>
              <div style={{ background: '#fafafa', borderRadius: 6, padding: 10, minWidth: 0 }}>
                <Text strong style={{ ...wrapTextStyle, marginBottom: 6 }}>交稿问题</Text>
                <Space direction="vertical" size={8} style={{ width: '100%', minWidth: 0 }}>
                  {desk.mustFix.length > 0 ? (
                    <Space wrap size={[4, 4]}>
                      {desk.mustFix.slice(0, 5).map(item => (
                        <Tag key={item} color="red" bordered={false}>{item}</Tag>
                      ))}
                    </Space>
                  ) : (
                    <Text type="secondary" style={wrapTextStyle}>没有必须修复项。</Text>
                  )}
                  {desk.optionalImprovements.length > 0 && (
                    <Space wrap size={[4, 4]}>
                      {desk.optionalImprovements.slice(0, 5).map(item => (
                        <Tag key={item} color="blue" bordered={false}>{item}</Tag>
                      ))}
                    </Space>
                  )}
                  <Space wrap size={[6, 6]}>
                    {desk.secondaryActions.map(action => (
                      <Button
                        key={action.key}
                        size="small"
                        disabled={loading}
                        icon={actionIcon(action.key, model.modelTeam.recommendedRole)}
                        onClick={() => onAction(action.key)}
                        style={{ whiteSpace: 'normal', height: 'auto', lineHeight: 1.25, paddingTop: 3, paddingBottom: 3 }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </Space>
                </Space>
              </div>
            </Col>
          </Row>
        )}
      </Space>
    </div>
  )
}

export function WritingCockpitPanel({
  model,
  loading = false,
  forceCollapsed = false,
  primaryActionOverride,
  onAction,
}: {
  model: WritingCockpitModel
  loading?: boolean
  forceCollapsed?: boolean
  primaryActionOverride?: WritingCockpitPrimaryActionOverride | null
  onAction: (key: WritingCockpitActionKey) => void
}) {
  const recommendedRole = model.modelTeam.recommendedRole
  const [cockpitCollapsed, setCockpitCollapsed] = useState(true)
  const nextChapterLabel = model.nextChapter
    ? `第${model.nextChapter.chapterNo}章 · ${model.nextChapter.title || '未命名章节'}`
    : '等待规划下一章'
  const whyItMatters = model.nextChapter?.whyItMatters || '先补齐章节规划，再确认本章要服务的卷目标。'
  const previousHook = model.nextChapter?.previousEnding || model.previousChapter?.endingHook || '暂无上一章钩子，请先确认承接点。'
  const percent = readinessPercent(model)

  useEffect(() => {
    if (forceCollapsed) setCockpitCollapsed(true)
  }, [forceCollapsed])

  const primaryAction = primaryActionOverride ?? {
    label: model.topStatus.nextActionLabel,
    reason: '',
    actionKey: model.topStatus.primaryActionKey,
    onClick: () => onAction(model.topStatus.primaryActionKey),
  }

  if (cockpitCollapsed) {
    return (
      <div className="writing-cockpit-panel is-collapsed" style={{ width: '100%' }}>
        <Card
          className="writing-cockpit-card writing-cockpit-card-collapsed"
          size="small"
          loading={loading && model.readiness.checks.length === 0}
          styles={{ body: { padding: '6px 10px' } }}
        >
          <Row className="writing-cockpit-collapsed-row" gutter={[10, 8]} align="middle">
            <Col flex="auto" style={{ minWidth: 0 }}>
              <Space className="writing-cockpit-collapsed-meta" wrap size={[6, 4]}>
                <Tag color="blue" bordered={false}>{model.topStatus.currentRoleLabel}</Tag>
                <Tag bordered={false}>{model.topStatus.currentVolume}</Tag>
                <Tag color={model.readiness.blockers.length ? 'red' : model.readiness.warnings.length ? 'gold' : 'green'} bordered={false}>
                  准备度 {percent}%
                </Tag>
                {model.readiness.blockers.slice(0, 2).map(blocker => (
                  <Tag key={blocker.key} color="red" bordered={false}>{blocker.label}</Tag>
                ))}
                <Text strong style={{ maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nextChapterLabel}
                </Text>
              </Space>
            </Col>
            <Col flex="none">
              <Space className="writing-cockpit-collapsed-actions" wrap size={[6, 6]} style={{ justifyContent: 'flex-end' }}>
                <Button
                  type="primary"
                  size="small"
                  loading={loading}
                  icon={actionIcon(primaryAction.actionKey, recommendedRole)}
                  onClick={primaryAction.onClick}
                >
                  {primaryAction.label}
                </Button>
                {primaryActionOverride && <span className="novel-editor-recommended-badge">推荐下一步</span>}
                {primaryActionOverride?.reason && (
                  <Text className="writing-cockpit-next-action-reason" type="secondary" style={{ maxWidth: 260, fontSize: 12 }}>
                    {primaryActionOverride.reason}
                  </Text>
                )}
                <Button size="small" icon={<DownOutlined />} onClick={() => setCockpitCollapsed(false)}>
                  展开写作指挥台
                </Button>
              </Space>
            </Col>
          </Row>
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
              <Button size="small" icon={<UpOutlined />} onClick={() => setCockpitCollapsed(true)}>
                收起写作指挥台
              </Button>
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
                  <Tag color={model.readiness.blockers.length ? 'red' : model.readiness.warnings.length ? 'gold' : 'green'} bordered={false}>
                    {model.readiness.blockers.length ? `${model.readiness.blockers.length} 阻塞` : model.readiness.warnings.length ? `${model.readiness.warnings.length} 警告` : '可写'}
                  </Tag>
                </Space>
                <Progress percent={percent} size="small" status={readinessStatus(model)} />
                <Space wrap size={[4, 4]}>
                  {model.readiness.checks.map(check => (
                    <Tag key={check.key} color={checkColor(check.status)} bordered={false}>
                      {check.status === 'pass' ? <CheckCircleOutlined /> : check.status === 'warning' ? <WarningOutlined /> : <ExclamationCircleOutlined />}
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
                <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0, fontSize: 12 }}>
                  {previousHook}
                </Paragraph>
              </Space>
            </Col>

            <Col xs={24} lg={5}>
              <Button
                type="primary"
                block
                loading={loading}
                icon={actionIcon(model.topStatus.primaryActionKey, recommendedRole)}
                onClick={() => onAction(model.topStatus.primaryActionKey)}
                style={{ whiteSpace: 'normal', height: 'auto', minHeight: 36, lineHeight: 1.3, paddingTop: 6, paddingBottom: 6 }}
              >
                {model.topStatus.nextActionLabel}
              </Button>
            </Col>
          </Row>

          {blockerAlert(model, loading, onAction)}

          {model.chapterAcceptanceDesk.visible ? (
            <ChapterAcceptanceDesk model={model} loading={loading} onAction={onAction} />
          ) : (
            <ChapterPlanningDesk model={model} loading={loading} onAction={onAction} />
          )}

          <Row gutter={[12, 8]} align="top">
            <Col xs={24} lg={15}>
              <Space wrap size={[6, 6]}>
                <Tag icon={<TeamOutlined />} color="purple" bordered={false}>模型团队</Tag>
                {model.modelTeam.roles.map(role => (
                  <Button
                    key={role.key}
                    size="small"
                    type={role.active ? 'primary' : 'default'}
                    icon={roleIcon(role.key)}
                    disabled={loading}
                    onClick={() => onAction(role.actionKey)}
                    title={role.description}
                    style={{ whiteSpace: 'normal', height: 'auto', lineHeight: 1.25, paddingTop: 3, paddingBottom: 3 }}
                  >
                    {role.label}
                  </Button>
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
        </Space>
      </Card>
    </div>
  )
}
