import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Progress, Row, Space, Tag, Typography } from 'antd'
import {
  AuditOutlined,
  BarChartOutlined,
  BookOutlined,
  CheckCircleOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  SafetyOutlined,
  TeamOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { WritingCockpitActionKey, WritingCockpitModel, WritingCockpitRole } from './writingCockpitModel'

const { Paragraph, Text } = Typography

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

function compactPlanValue(value: string, fallback: string) {
  return value && value.trim() ? value : fallback
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
    <Card
      size="small"
      style={{ borderRadius: 8, borderColor: desk.readiness === 'ready' ? '#d9f7be' : '#ffe7ba' }}
      styles={{ body: { padding: 12 } }}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Row gutter={[12, 8]} align="middle">
          <Col xs={24} lg={14}>
            <Space wrap size={[6, 4]}>
              <Tag color={plannerColor(desk.readiness)} bordered={false}>{desk.statusLabel}</Tag>
              <Tag bordered={false}>上下文：{desk.contextPackageStatus === 'ready' ? '已就绪' : desk.contextPackageStatus === 'insufficient' ? '不足' : '未加载'}</Tag>
              <Tag bordered={false}>场景卡：{desk.scenePlanStatus === 'ready' ? `${desk.sceneCards.length} 个` : '缺失'}</Tag>
            </Space>
            <Paragraph ellipsis={{ rows: expanded ? 3 : 1 }} style={{ margin: '6px 0 0', fontSize: 12 }}>
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
            <Col xs={24} lg={10}>
              <Card size="small" title="本章编剧计划" styles={{ body: { padding: 10 } }}>
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Text strong>{compactPlanValue(plan.chapterObjective, '待补章节目标')}</Text>
                  <Text type="secondary">承接：{compactPlanValue(plan.previousHandoff, '待确认上一章承接')}</Text>
                  <Text type="secondary">冲突：{compactPlanValue(plan.coreConflict, '待补核心冲突')}</Text>
                  <Text type="secondary">情绪：{compactPlanValue(plan.emotionalMovement, '待补情绪推进')}</Text>
                  <Text type="secondary">爽点：{compactPlanValue(plan.payoff, '待补读者回报')}</Text>
                  <Text type="secondary">钩子：{compactPlanValue(plan.endingHook, '待补结尾钩子')}</Text>
                  {plan.forbiddenRepeats.length > 0 && (
                    <Space wrap size={[4, 4]}>
                      {plan.forbiddenRepeats.slice(0, 4).map(item => (
                        <Tag key={item} color="red" bordered={false}>{item}</Tag>
                      ))}
                    </Space>
                  )}
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card size="small" title="场景卡" styles={{ body: { padding: 10 } }}>
                {desk.sceneCards.length > 0 ? (
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {desk.sceneCards.slice(0, 4).map(scene => (
                      <div key={`${scene.sceneNo}-${scene.title}`} style={{ border: '1px solid #edf0f5', borderRadius: 6, padding: 8 }}>
                        <Space direction="vertical" size={3} style={{ width: '100%' }}>
                          <Space wrap size={[4, 4]}>
                            <Tag color="blue" bordered={false}>场景 {scene.sceneNo}</Tag>
                            <Text strong>{scene.title}</Text>
                          </Space>
                          <Text type="secondary">目的：{compactPlanValue(scene.purpose, '待补')}</Text>
                          <Text type="secondary">冲突：{compactPlanValue(scene.conflict, '待补')}</Text>
                          <Text type="secondary">转折：{compactPlanValue(scene.turn, '待补')}</Text>
                          <Text type="secondary">钩子：{compactPlanValue(scene.endingHook, '待补')}</Text>
                        </Space>
                      </div>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">还没有场景卡。先生成场景计划，再进入初稿。</Text>
                )}
              </Card>
            </Col>
          </Row>
        )}
      </Space>
    </Card>
  )
}

export function WritingCockpitPanel({
  model,
  loading = false,
  onAction,
}: {
  model: WritingCockpitModel
  loading?: boolean
  onAction: (key: WritingCockpitActionKey) => void
}) {
  const recommendedRole = model.modelTeam.recommendedRole
  const nextChapterLabel = model.nextChapter
    ? `第${model.nextChapter.chapterNo}章 · ${model.nextChapter.title || '未命名章节'}`
    : '等待规划下一章'
  const whyItMatters = model.nextChapter?.whyItMatters || '先补齐章节规划，再确认本章要服务的卷目标。'
  const previousHook = model.nextChapter?.previousEnding || model.previousChapter?.endingHook || '暂无上一章钩子，请先确认承接点。'
  const percent = readinessPercent(model)

  return (
    <div style={{ width: '100%' }}>
      <Card
        size="small"
        loading={loading && model.readiness.checks.length === 0}
        style={{ borderRadius: 8, marginBottom: 12 }}
        styles={{ body: { padding: 12 } }}
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Row gutter={[12, 10]} align="middle">
            <Col xs={24} lg={8}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
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
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
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
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
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

          <ChapterPlanningDesk model={model} loading={loading} onAction={onAction} />

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
