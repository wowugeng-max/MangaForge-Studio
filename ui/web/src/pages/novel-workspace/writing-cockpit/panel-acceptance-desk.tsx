import React, { useEffect, useState } from 'react'
import { Alert, Button, Col, Row, Space, Tag, Typography } from 'antd'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../writingCockpitModel'
import { acceptanceColor, actionIcon, compactPlanValue, qualityScoreText } from './panel-utils'

const { Text, Paragraph } = Typography

export function StoryStateSyncBanner({
  model,
  loading,
  onAction,
}: {
  model: WritingCockpitModel
  loading: boolean
  onAction: (key: WritingCockpitActionKey) => void
}) {
  const panel = model.chapterAcceptanceDesk.storyStatePanel
  if (!panel?.visible || panel.status === 'synced') return null
  return (
    <Alert
      type={panel.status === 'synced_with_gaps'
        ? 'warning'
        : panel.status === 'skipped'
          ? 'info'
          : 'warning'}
      showIcon
      style={{ marginTop: 2 }}
      message={panel.headline}
      description={(
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          <Text style={wrapTextStyle}>{panel.summary}</Text>
          <Text type="secondary" style={wrapTextStyle}>
            状态机进度：第 {panel.lastUpdatedChapter || 0} 章
            {panel.chapterNo ? ` ｜ 当前正文：第 ${panel.chapterNo} 章` : ''}
          </Text>
          {panel.reasons.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {panel.reasons.slice(0, 4).map(reason => (
                <li key={reason}><Text style={wrapTextStyle}>{reason}</Text></li>
              ))}
            </ul>
          )}
          <Text type="secondary" style={wrapTextStyle}>{panel.guidance}</Text>
          {panel.primaryAction && (
            <div>
              <Button
                type="primary"
                size="small"
                loading={loading}
                icon={actionIcon(panel.primaryAction.key, model.modelTeam.recommendedRole)}
                onClick={() => onAction(panel.primaryAction!.key)}
              >
                {panel.primaryAction.label}
              </Button>
            </div>
          )}
        </Space>
      )}
    />
  )
}

export function ChapterAcceptanceDesk({
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
              <Tag
                color={desk.storyStatePanel?.status === 'synced'
                  ? 'green'
                  : desk.storyStatePanel?.status === 'synced_with_gaps'
                    ? 'gold'
                    : desk.storyStateSynced ? 'green' : 'orange'}
                bordered={false}
              >
                故事状态：{desk.storyStatePanel?.statusLabel || (desk.storyStateSynced ? '已同步' : '待同步')}
              </Tag>
              {desk.coreDrift && <Tag color={desk.coreDrift.status === 'ok' ? 'green' : 'gold'} bordered={false}>{desk.coreDrift.label}</Tag>}
              {desk.readerPayoffSync && <Tag color={desk.readerPayoffSync.status === 'ok' ? 'green' : 'gold'} bordered={false}>{desk.readerPayoffSync.label}</Tag>}
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
              {desk.storyStatePanel?.primaryAction && desk.storyStatePanel.status !== 'synced' && (
                <Button
                  type={desk.recommendedAcceptanceAction.key === 'sync_story_state' ? 'primary' : 'default'}
                  size="small"
                  loading={loading}
                  icon={actionIcon('sync_story_state', model.modelTeam.recommendedRole)}
                  onClick={() => onAction(desk.storyStatePanel!.primaryAction!.key)}
                  style={{ whiteSpace: 'normal', height: 'auto', lineHeight: 1.25 }}
                >
                  {desk.storyStatePanel.primaryAction.label}
                </Button>
              )}
              {desk.recommendedAcceptanceAction.key !== 'sync_story_state' && (
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
              )}
            </Space>
          </Col>
        </Row>

        {desk.storyStatePanel?.visible && (
          <Alert
            type={desk.storyStatePanel.status === 'synced'
              ? 'success'
              : desk.storyStatePanel.status === 'synced_with_gaps'
                ? 'warning'
                : desk.storyStatePanel.status === 'skipped'
                  ? 'info'
                  : 'warning'}
            showIcon
            style={{ marginTop: 2 }}
            message={desk.storyStatePanel.headline}
            description={(
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <Text style={wrapTextStyle}>{desk.storyStatePanel.summary}</Text>
                <Text type="secondary" style={wrapTextStyle}>
                  状态机进度：第 {desk.storyStatePanel.lastUpdatedChapter || 0} 章
                  {desk.storyStatePanel.chapterNo ? ` ｜ 当前正文：第 ${desk.storyStatePanel.chapterNo} 章` : ''}
                </Text>
                {desk.storyStatePanel.reasons.length > 0 && (
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <Text strong style={wrapTextStyle}>为什么还没完全更新：</Text>
                    {desk.storyStatePanel.reasons.slice(0, 4).map(reason => (
                      <Text key={reason} type="secondary" style={wrapTextStyle}>· {reason}</Text>
                    ))}
                  </Space>
                )}
                <Text type="secondary" style={wrapTextStyle}>{desk.storyStatePanel.guidance}</Text>
                {desk.storyStatePanel.establishedEvents && (
                  <div style={{ marginTop: 8 }}>
                    <Text strong>
                      正史事件：已锁 {desk.storyStatePanel.establishedEvents.confirmedCount}
                      ／候选 {desk.storyStatePanel.establishedEvents.candidateCount}
                      ／硬锁 {desk.storyStatePanel.establishedEvents.hardCount}
                    </Text>
                    {desk.storyStatePanel.establishedEvents.preview.length > 0 ? (
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                        {desk.storyStatePanel.establishedEvents.preview.map((fact) => (
                          <li key={fact}><Text style={wrapTextStyle}>{fact}</Text></li>
                        ))}
                      </ul>
                    ) : (
                      <div>
                        <Text type="secondary" style={wrapTextStyle}>{desk.storyStatePanel.establishedEvents.guidance}</Text>
                      </div>
                    )}
                  </div>
                )}
                {desk.storyStatePanel.primaryAction && (
                  <Space wrap>
                    <Button
                      type={desk.storyStatePanel.status === 'synced' ? 'default' : 'primary'}
                      size="small"
                      loading={loading}
                      icon={actionIcon('sync_story_state', model.modelTeam.recommendedRole)}
                      onClick={() => onAction(desk.storyStatePanel!.primaryAction!.key)}
                    >
                      {desk.storyStatePanel.primaryAction.label}
                    </Button>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      正文不用重写；满意当前正文后点这里主动更新状态机。
                    </Text>
                  </Space>
                )}
              </Space>
            )}
          />
        )}

        {expanded && (
          <Row gutter={[12, 10]}>
            <Col xs={24} lg={10} style={{ minWidth: 0 }}>
              <div style={{ background: '#fafafa', borderRadius: 6, padding: 10, minWidth: 0 }}>
                <Text strong style={{ ...wrapTextStyle, marginBottom: 6 }}>编辑摘要</Text>
                <Space direction="vertical" size={6} style={{ width: '100%', minWidth: 0 }}>
                  <Text type="secondary" style={wrapTextStyle}>质量状态：{compactPlanValue(desk.qualityStatus, '未复检')}</Text>
                  <Text type="secondary" style={wrapTextStyle}>核心守恒：{desk.coreDrift ? `${desk.coreDrift.scoreLabel} · ${desk.coreDrift.label}` : '未检查'}</Text>
                  <Text type="secondary" style={wrapTextStyle}>读者回报：{desk.readerPayoffSync ? `${desk.readerPayoffSync.scoreLabel} · ${desk.readerPayoffSync.label}` : '未检查'}</Text>
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
