import React from 'react'
import { Button, Card, Empty, Progress, Space, Tag, Typography } from 'antd'
import { DownOutlined, UpOutlined } from '@ant-design/icons'
import type { StoryPlanningBoardPanelsProps } from './story-planning-board-types'
import {
  retentionColor,
  storylineStatusColor,
  characterArcBoardColor,
  storylineRiskColor,
  volumeBeatColor,
  governanceColor,
  fatigueRadarColor,
  storyPressureColor,
  storyUnitColor,
  actionLabel,
  chapterRangeLabel,
  renderStorylineEvidenceRows,
  renderStorylineDiffRows,
} from './story-planning-chrome'

const { Text } = Typography

export function StoryPlanningStoryPanels(props: StoryPlanningBoardPanelsProps) {
  const {
    model,
    loadingKey,
    onAction,
    onSelectChapter,
    compact,
    healthBoardsOpen = false,
    onToggleHealthBoards,
  } = props
  const [localHealthOpen, setLocalHealthOpen] = React.useState(false)
  const healthOpen = onToggleHealthBoards ? healthBoardsOpen : localHealthOpen
  const toggleHealth = onToggleHealthBoards || (() => setLocalHealthOpen(value => !value))
  return (
    <>
          <Card
            className="novel-volume-beat-budget-card"
            title="卷级高潮预算"
            size="small"
            extra={<Button size="small" type="link" onClick={() => onAction('complete_volume_plan')}>补齐当前卷规划</Button>}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={volumeBeatColor(model.volumeBeatBudget.status)} bordered={false}>
                  {model.volumeBeatBudget.label}
                </Tag>
                <Tag bordered={false}>{model.volumeBeatBudget.currentVolumeTitle}</Tag>
                <Tag bordered={false}>{model.volumeBeatBudget.chapterRange}</Tag>
                <Tag color={model.volumeBeatBudget.climaxCount >= model.volumeBeatBudget.climaxTarget ? 'green' : 'gold'} bordered={false}>
                  高潮 {model.volumeBeatBudget.climaxCount}/{model.volumeBeatBudget.climaxTarget}
                </Tag>
                <Tag color={model.volumeBeatBudget.payoffCount >= model.volumeBeatBudget.payoffTarget ? 'green' : 'gold'} bordered={false}>
                  爽点 {model.volumeBeatBudget.payoffCount}/{model.volumeBeatBudget.payoffTarget}
                </Tag>
              </Space>
              <Text type="secondary">{model.volumeBeatBudget.summary}</Text>
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {[
                  { label: '小高潮', description: '前段建立期待，给第一次明确反压或规则突破。' },
                  { label: '中高潮', description: '中段升级冲突，兑现阶段性爽点并抛出更大危机。' },
                  { label: '卷末爆点', description: '卷尾完成大回报、身份/势力变化或新地图钩子。' },
                ].map(item => (
                  <div key={item.label} style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: 10, background: '#fbfcfe' }}>
                    <Space direction="vertical" size={6}>
                      <Text strong>{item.label}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                    </Space>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {model.volumeBeatBudget.beats.map(beat => (
                  <button
                    key={beat.key}
                    type="button"
                    disabled={!beat.chapterNo}
                    onClick={() => beat.chapterNo && onSelectChapter(beat.chapterNo)}
                    style={{
                      border: '1px solid #edf0f5',
                      borderRadius: 8,
                      padding: '10px 12px',
                      background: beat.status === 'missing' ? '#fffbeb' : '#fff',
                      cursor: beat.chapterNo ? 'pointer' : 'default',
                      textAlign: 'left',
                      width: '100%',
                      font: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={volumeBeatColor(beat.status)} bordered={false}>{beat.type}</Tag>
                        {beat.chapterNo && <Tag bordered={false}>第{beat.chapterNo}章</Tag>}
                        <Text strong>{beat.label}</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>{beat.detail}</Text>
                    </Space>
                  </button>
                ))}
              </div>
              {model.volumeBeatBudget.nextActions.length > 0 && (
                <Space wrap>
                  {model.volumeBeatBudget.nextActions.map(action => <Tag key={action} bordered={false}>{action}</Tag>)}
                </Space>
              )}
            </Space>
          </Card>

          <Card
            className="novel-volume-segment-gate-card"
            title="卷段验收"
            size="small"
            extra={<Button size="small" type={model.volumeSegmentGate.status === 'ready' ? 'link' : 'primary'} onClick={() => onAction(model.volumeSegmentGate.actionKey)}>{actionLabel(model.volumeSegmentGate.actionKey)}</Button>}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={volumeBeatColor(model.volumeSegmentGate.status)} bordered={false}>
                  {model.volumeSegmentGate.label}
                </Tag>
                <Tag bordered={false}>{model.volumeSegmentGate.currentSegmentLabel}</Tag>
                <Tag bordered={false}>进度 {model.volumeSegmentGate.chapterProgress.written}/{model.volumeSegmentGate.chapterProgress.total}</Tag>
                <Tag color={retentionColor(model.volumeSegmentGate.score)} bordered={false}>{model.volumeSegmentGate.score} 分</Tag>
              </Space>
              <Progress percent={model.volumeSegmentGate.chapterProgress.percent} size="small" showInfo={false} />
              <Text type="secondary">{model.volumeSegmentGate.summary}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                验收项：阶段目标 / 高潮/回报 / 读者信任 / 创新/IP化 / 风险闭环
              </Text>
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
                {model.volumeSegmentGate.signals.map(signal => (
                  <button
                    key={signal.key}
                    type="button"
                    onClick={() => onAction(signal.actionKey)}
                    style={{
                      border: '1px solid #edf0f5',
                      borderRadius: 8,
                      padding: '10px 12px',
                      background: signal.status === 'ok' ? '#fff' : signal.status === 'block' ? '#fff1f0' : '#fffbeb',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      font: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={governanceColor(signal.status)} bordered={false}>{signal.label}</Tag>
                        {signal.count > 0 && <Tag bordered={false}>{signal.count}</Tag>}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>{signal.detail}</Text>
                    </Space>
                  </button>
                ))}
              </div>
              {model.volumeSegmentGate.nextActions.length > 0 && (
                <Space wrap>
                  {model.volumeSegmentGate.nextActions.map(action => <Tag key={action} bordered={false}>{action}</Tag>)}
                </Space>
              )}
            </Space>
          </Card>

          <Card size="small" styles={{ body: { padding: 12 } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Space direction="vertical" size={2}>
                <Text strong>剧情体检</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  压力阶梯、剧情单元、疲劳、人物成长与剧情线默认收起；扩纲时优先看上方流程与卷结构。
                </Text>
              </Space>
              <Button
                size="small"
                icon={healthOpen ? <UpOutlined /> : <DownOutlined />}
                onClick={toggleHealth}
              >
                {healthOpen ? '收起剧情体检' : '展开剧情体检'}
              </Button>
            </div>
          </Card>

          {healthOpen ? (
            <>
          <Card
            className="novel-story-pressure-ladder-card"
            title="故事压力阶梯"
            size="small"
            extra={<Button size="small" type={model.storyPressureLadder.status === 'ready' ? 'link' : 'primary'} onClick={() => onAction(model.storyPressureLadder.actionKey)}>{actionLabel(model.storyPressureLadder.actionKey)}</Button>}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={storyPressureColor(model.storyPressureLadder.status)} bordered={false}>
                  {model.storyPressureLadder.label}
                </Tag>
                <Tag bordered={false}>{model.storyPressureLadder.chapterRangeLabel}</Tag>
                <Tag color={retentionColor(model.storyPressureLadder.score)} bordered={false}>{model.storyPressureLadder.score} 分</Tag>
              </Space>
              <Text type="secondary">{model.storyPressureLadder.summary}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                监控项：压力源 / 冲突升级 / 赌注升级 / 反转逼迫
              </Text>
              {model.storyPressureLadder.pressureSources.length > 0 && (
                <Space wrap>
                  {model.storyPressureLadder.pressureSources.map(source => (
                    <Tag key={`${source.label}-${source.count}`} color={source.riskLevel === 'warn' ? 'gold' : 'blue'} bordered={false}>
                      {source.label} {source.count}次
                    </Tag>
                  ))}
                </Space>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                {model.storyPressureLadder.signals.map(signal => (
                  <button
                    key={signal.key}
                    type="button"
                    onClick={() => onAction(signal.actionKey)}
                    style={{
                      border: '1px solid #edf0f5',
                      borderRadius: 8,
                      padding: '10px 12px',
                      background: signal.status === 'ok' ? '#fff' : signal.status === 'block' ? '#fff1f0' : '#fffbeb',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      font: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={storyPressureColor(signal.status)} bordered={false}>{signal.label}</Tag>
                        {signal.count > 0 && <Tag bordered={false}>{signal.count}</Tag>}
                      </Space>
                      <Progress percent={signal.score} size="small" showInfo={false} strokeColor={signal.status === 'ok' ? '#52c41a' : signal.status === 'block' ? '#ff4d4f' : '#faad14'} />
                      <Text type="secondary" style={{ fontSize: 12 }}>{signal.detail}</Text>
                    </Space>
                  </button>
                ))}
              </div>
              {model.storyPressureLadder.nextActions.length > 0 && (
                <Space wrap>
                  {model.storyPressureLadder.nextActions.map(action => <Tag key={action} bordered={false}>{action}</Tag>)}
                </Space>
              )}
            </Space>
          </Card>

          <Card
            className="novel-story-unit-workshop-card"
            title="剧情单元工坊"
            size="small"
            extra={<Button size="small" type={model.storyUnitWorkshop.status === 'ready' ? 'link' : 'primary'} onClick={() => onAction(model.storyUnitWorkshop.actionKey)}>{actionLabel(model.storyUnitWorkshop.actionKey)}</Button>}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={storyUnitColor(model.storyUnitWorkshop.status)} bordered={false}>
                  {model.storyUnitWorkshop.label}
                </Tag>
                <Tag bordered={false}>{model.storyUnitWorkshop.currentUnit.chapterRangeLabel}</Tag>
                <Tag color={retentionColor(model.storyUnitWorkshop.score)} bordered={false}>{model.storyUnitWorkshop.score} 分</Tag>
              </Space>
              <Text type="secondary">{model.storyUnitWorkshop.summary}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                监控项：入口钩子 / 压力升级 / 小高潮/回报 / 伏笔/剧情线 / 出单元钩子
              </Text>
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
                {model.storyUnitWorkshop.currentUnit.signals.map(signal => (
                  <button
                    key={signal.key}
                    type="button"
                    onClick={() => onAction(signal.actionKey)}
                    style={{
                      border: '1px solid #edf0f5',
                      borderRadius: 8,
                      padding: '10px 12px',
                      background: signal.status === 'ok' ? '#fff' : signal.status === 'block' ? '#fff1f0' : '#fffbeb',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      font: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={storyUnitColor(signal.status)} bordered={false}>{signal.label}</Tag>
                        {signal.count > 0 && <Tag bordered={false}>{signal.count}</Tag>}
                      </Space>
                      <Progress percent={signal.score} size="small" showInfo={false} strokeColor={signal.status === 'ok' ? '#52c41a' : signal.status === 'block' ? '#ff4d4f' : '#faad14'} />
                      <Text type="secondary" style={{ fontSize: 12 }}>{signal.detail}</Text>
                    </Space>
                  </button>
                ))}
              </div>
              {model.storyUnitWorkshop.currentUnit.chapters.length > 0 && (
                <div style={{ display: 'grid', gap: 6 }}>
                  {model.storyUnitWorkshop.currentUnit.chapters.map(chapter => (
                    <button
                      key={`${chapter.chapterNo}-${chapter.title}`}
                      type="button"
                      onClick={() => onSelectChapter(chapter.chapterNo)}
                      style={{
                        border: '1px solid #edf0f5',
                        borderRadius: 8,
                        padding: '8px 10px',
                        background: '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      <Space wrap>
                        <Tag color="blue" bordered={false}>第{chapter.chapterNo}章</Tag>
                        <Tag bordered={false}>{chapter.role}</Tag>
                        <Text strong>{chapter.title}</Text>
                        <Text type="secondary">{chapter.goal || '未设置章节职责'}</Text>
                      </Space>
                    </button>
                  ))}
                </div>
              )}
              {model.storyUnitWorkshop.nextActions.length > 0 && (
                <Space wrap>
                  {model.storyUnitWorkshop.nextActions.map(action => <Tag key={action} bordered={false}>{action}</Tag>)}
                </Space>
              )}
            </Space>
          </Card>

          <Card
            className="novel-recent-fatigue-radar-card"
            title="近10章疲劳雷达"
            size="small"
            extra={<Button size="small" type={model.recentFatigueRadar.status === 'ready' ? 'link' : 'primary'} onClick={() => onAction(model.recentFatigueRadar.actionKey)}>{actionLabel(model.recentFatigueRadar.actionKey)}</Button>}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={fatigueRadarColor(model.recentFatigueRadar.status)} bordered={false}>
                  {model.recentFatigueRadar.label}
                </Tag>
                <Tag bordered={false}>{model.recentFatigueRadar.chapterRangeLabel}</Tag>
                <Tag color={retentionColor(model.recentFatigueRadar.score)} bordered={false}>{model.recentFatigueRadar.score} 分</Tag>
              </Space>
              <Text type="secondary">{model.recentFatigueRadar.summary}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                监控项：冲突变化 / 回报变化 / 钩子变化 / 场面新鲜度
              </Text>
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                {model.recentFatigueRadar.signals.map(signal => (
                  <button
                    key={signal.key}
                    type="button"
                    onClick={() => onAction(signal.actionKey)}
                    style={{
                      border: '1px solid #edf0f5',
                      borderRadius: 8,
                      padding: '10px 12px',
                      background: signal.status === 'ok' ? '#fff' : '#fffbeb',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      font: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={fatigueRadarColor(signal.status)} bordered={false}>{signal.label}</Tag>
                        {signal.count > 0 && <Tag bordered={false}>{signal.count}</Tag>}
                      </Space>
                      <Progress percent={signal.score} size="small" showInfo={false} strokeColor={signal.status === 'ok' ? '#52c41a' : '#faad14'} />
                      <Text type="secondary" style={{ fontSize: 12 }}>{signal.detail}</Text>
                    </Space>
                  </button>
                ))}
              </div>
              {model.recentFatigueRadar.nextActions.length > 0 && (
                <Space wrap>
                  {model.recentFatigueRadar.nextActions.map(action => <Tag key={action} bordered={false}>{action}</Tag>)}
                </Space>
              )}
            </Space>
          </Card>

          <Card
            className="novel-character-arc-board-card"
            title="人物成长看板"
            size="small"
            extra={<Button size="small" type={model.characterArcBoard.status === 'ready' ? 'link' : 'primary'} onClick={() => onAction(model.characterArcBoard.actionKey)}>{actionLabel(model.characterArcBoard.actionKey)}</Button>}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={characterArcBoardColor(model.characterArcBoard.status)} bordered={false}>
                  {model.characterArcBoard.status === 'missing' ? '未建立' : model.characterArcBoard.status === 'ready' ? '成长稳定' : '需要治理'}
                </Tag>
                <Tag bordered={false}>人物线 {model.characterArcBoard.total}</Tag>
                {model.characterArcBoard.overdueCount > 0 && <Tag color="red" bordered={false}>成长断档 {model.characterArcBoard.overdueCount}</Tag>}
                {model.characterArcBoard.relationshipRiskCount > 0 && <Tag color="gold" bordered={false}>关系待推进 {model.characterArcBoard.relationshipRiskCount}</Tag>}
                {model.characterArcBoard.growthGapCount > 0 && <Tag color="volcano" bordered={false}>弧光缺口 {model.characterArcBoard.growthGapCount}</Tag>}
              </Space>
              <Text type="secondary">{model.characterArcBoard.summary}</Text>
              {model.characterArcBoard.arcs.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="在资料设定中补齐角色线和关系线" />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {model.characterArcBoard.arcs.map(item => (
                    <div
                      key={`${item.entityType}-${item.id}-${item.name}`}
                      style={{
                        border: '1px solid #e8edf3',
                        borderRadius: 8,
                        padding: '10px 12px',
                        background: '#fff',
                        textAlign: 'left',
                        width: '100%',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Text strong>{item.name}</Text>
                          <Tag color={item.entityType === 'relationship_arc' ? 'purple' : 'blue'} bordered={false}>{item.typeLabel}</Tag>
                          {item.priority && <Tag bordered={false}>{item.priority}</Tag>}
                          {item.riskTags.map(tag => (
                            <Tag key={tag} color={tag === '成长断档' || tag === '弧光缺口' ? 'red' : tag === '关系待推进' ? 'gold' : 'blue'} bordered={false}>
                              {tag}
                            </Tag>
                          ))}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          最近：{item.lastAdvancedChapter ? `第${item.lastAdvancedChapter}章` : '未标注'} · 下次：{item.nextAdvanceChapter ? `第${item.nextAdvanceChapter}章` : '未标注'} · 角色：{item.relatedNames.join('、') || '未标注'}
                        </Text>
                        <Text>{item.summary || item.currentState || '未填写人物线简介'}</Text>
                        {(item.desire || item.flawPressure || item.growthTarget || item.relationshipShift) && (
                          <Space direction="vertical" size={2} style={{ width: '100%' }}>
                            {item.desire && <Text type="secondary" style={{ fontSize: 12 }}>欲望：{item.desire}</Text>}
                            {item.flawPressure && <Text type="secondary" style={{ fontSize: 12 }}>缺陷受压：{item.flawPressure}</Text>}
                            {item.growthTarget && <Text type="secondary" style={{ fontSize: 12 }}>成长节点：{item.growthTarget}</Text>}
                            {item.relationshipShift && <Text type="secondary" style={{ fontSize: 12 }}>关系变化：{item.relationshipShift}</Text>}
                          </Space>
                        )}
                        <Space wrap>
                          {item.voiceAnchor && <Tag bordered={false}>口吻锚点</Tag>}
                          {item.forbiddenReveal && <Tag color="red" bordered={false}>禁揭</Tag>}
                          <Button size="small" type="link" style={{ paddingInline: 0 }} onClick={() => onSelectChapter(item.actionChapterNo)}>
                            跳到第{item.actionChapterNo}章
                          </Button>
                        </Space>
                        {item.latestEvidence.length > 0 && (
                          <details className="novel-character-arc-evidence" style={{ marginTop: 4 }}>
                            <summary style={{ cursor: 'pointer', color: '#475569', fontSize: 12, fontWeight: 650 }}>人物弧光证据</summary>
                            <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 8 }}>
                              {item.latestEvidence.map(evidence => <Text key={evidence} style={{ fontSize: 12 }}>{evidence}</Text>)}
                            </Space>
                          </details>
                        )}
                      </Space>
                    </div>
                  ))}
                </div>
              )}
            </Space>
          </Card>

          <Card
            className="novel-storyline-board-card"
            title="剧情线看板"
            size="small"
            extra={(
              <Space>
                <Button size="small" type="link" onClick={() => onAction('create_storyline_decision_tasks')}>生成决策任务</Button>
                <Button size="small" type="link" onClick={() => onAction('open_story_assets')}>管理剧情线</Button>
              </Space>
            )}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={storylineStatusColor(model.storylineBoard.status)} bordered={false}>
                  {model.storylineBoard.status === 'missing' ? '未建立' : model.storylineBoard.status === 'ready' ? '调度正常' : '需要调度'}
                </Tag>
                <Tag bordered={false}>剧情线 {model.storylineBoard.total}</Tag>
                {model.storylineBoard.overdueCount > 0 && <Tag color="red" bordered={false}>逾期未推 {model.storylineBoard.overdueCount}</Tag>}
                {model.storylineBoard.debtCount > 0 && <Tag color="purple" bordered={false}>回收债务 {model.storylineBoard.debtCount}</Tag>}
                {model.storylineBoard.retentionRiskCount > 0 && <Tag color="gold" bordered={false}>影响留存 {model.storylineBoard.retentionRiskCount}</Tag>}
              </Space>
              <Text type="secondary">{model.storylineBoard.summary}</Text>
              {model.storylineBoard.groups.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="在资料设定中补齐主线、支线、角色线、关系线、势力线和伏笔线" />
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {model.storylineBoard.groups.map(group => (
                    <div key={group.key} style={{ border: '1px solid #edf0f5', borderRadius: 8, background: '#fbfcfe', padding: 10 }}>
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Space wrap>
                          <Text strong>{group.label}</Text>
                          <Tag bordered={false}>{group.count} 条</Tag>
                        </Space>
                        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                          {group.items.map(item => (
                            <div
                              key={`${item.entityType}-${item.id}-${item.name}`}
                              style={{
                                border: '1px solid #e8edf3',
                                borderRadius: 8,
                                padding: '10px 12px',
                                background: '#fff',
                                textAlign: 'left',
                                width: '100%',
                                font: 'inherit',
                                color: 'inherit',
                              }}
                            >
                              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                <Space wrap>
                                  <Text strong>{item.name}</Text>
                                  <Tag color={item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'gold' : 'default'} bordered={false}>
                                    {item.priority}
                                  </Tag>
                                  {item.riskTags.map(tag => <Tag key={tag} color={storylineRiskColor(tag)} bordered={false}>{tag}</Tag>)}
                                </Space>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  最近：{item.lastAdvancedChapter ? `第${item.lastAdvancedChapter}章` : '未标注'} · 下次：{item.nextAdvanceChapter ? `第${item.nextAdvanceChapter}章` : '未标注'} · 范围：{item.startChapter ? `第${item.startChapter}` : '?'}-{item.endChapter ? `${item.endChapter}章` : '?'}
                                </Text>
                                <Text>{item.summary || item.status || '未填写简介'}</Text>
                                {(item.retentionImpacts.length > 0 || item.forbiddenReveal) && (
                                  <Space wrap>
                                    {item.retentionImpacts.slice(0, 3).map(label => <Tag key={label} color="gold" bordered={false}>留存风险 {label}</Tag>)}
                                    {item.forbiddenReveal && <Tag color="red" bordered={false}>禁揭</Tag>}
                                  </Space>
                                )}
                                <Space wrap>
                                  {item.latestSyncChapter && <Tag color="blue" bordered={false}>复盘到第{item.latestSyncChapter}章</Tag>}
                                  {item.syncRisks.map(risk => <Tag key={risk} color={risk.includes('禁揭') ? 'red' : 'gold'} bordered={false}>{risk}</Tag>)}
                                  <Button size="small" type="link" style={{ paddingInline: 0 }} onClick={() => onSelectChapter(item.actionChapterNo)}>
                                    跳到第{item.actionChapterNo}章
                                  </Button>
                                </Space>
                                {(item.planEvidence.length > 0 || item.actualEvidence.length > 0 || item.diffEvidence.length > 0 || item.syncRisks.length > 0) && (
                                  <details className="novel-storyline-evidence" style={{ marginTop: 4 }}>
                                    <summary style={{ cursor: 'pointer', color: '#475569', fontSize: 12, fontWeight: 650 }}>剧情线证据</summary>
                                    <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                                      <div style={{ border: '1px solid #edf0f5', borderRadius: 6, padding: 8, background: '#fbfcfe' }}>
                                        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>计划推进</Text>
                                        {renderStorylineEvidenceRows(item.planEvidence, '暂无计划推进证据')}
                                      </div>
                                      <div style={{ border: '1px solid #edf0f5', borderRadius: 6, padding: 8, background: '#fbfcfe' }}>
                                        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>实际推进</Text>
                                        {renderStorylineEvidenceRows(item.actualEvidence, '暂无实际推进证据')}
                                      </div>
                                      <div style={{ border: '1px solid #edf0f5', borderRadius: 6, padding: 8, background: '#fff7ed' }}>
                                        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>差异复盘</Text>
                                        {item.syncRisks.length
                                          ? <Space wrap>{item.syncRisks.map(risk => <Tag key={risk} color={risk.includes('禁揭') ? 'red' : 'gold'} bordered={false}>{risk}</Tag>)}</Space>
                                          : <Text type="secondary" style={{ fontSize: 12 }}>暂无差异风险</Text>}
                                      </div>
                                      <div style={{ border: '1px solid #fed7aa', borderRadius: 6, padding: 8, background: '#fffbeb' }}>
                                        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>差异决策</Text>
                                        <Text type="secondary" style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
                                          动作口径：漏推回修正文，额外推进接受为新计划，禁揭风险先核对后标记误判或回修。
                                        </Text>
                                        {renderStorylineDiffRows(item.diffEvidence, onAction)}
                                      </div>
                                    </div>
                                  </details>
                                )}
                              </Space>
                            </div>
                          ))}
                        </div>
                      </Space>
                    </div>
                  ))}
                </div>
              )}
            </Space>
          </Card>
            </>
          ) : null}
    </>
  )
}
