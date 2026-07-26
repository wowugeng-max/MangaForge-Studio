import React from 'react'
import { Alert, Button, Card, Empty, Progress, Space, Tag, Typography } from 'antd'
import type { StoryPlanningBoardPanelsProps } from './story-planning-board-types'
import {
  governanceColor,
  battleDeskColor,
  coreContractRadarColor,
  serialReleaseColor,
  spineGuardColor,
  millionWordMilestoneColor,
  millionWordMilestoneStepColor,
  memoryCapsuleColor,
  battleLaneFallbackLabel,
  formatWords,
  actionLabel,
} from './story-planning-chrome'

const { Text } = Typography

export function StoryPlanningOpsPanels(props: StoryPlanningBoardPanelsProps) {
  const { model, loadingKey, onAction, onSelectChapter, compact } = props
  return (
    <>
      <Card
        className="novel-longform-battle-desk-card"
        title="长篇作战台"
        size="small"
        extra={(
          <Button
            size="small"
            type={model.longformBattleDesk.status === 'ready' ? 'default' : 'primary'}
            onClick={() => onAction(model.longformBattleDesk.primaryAction.key)}
          >
            {model.longformBattleDesk.primaryAction.label}
          </Button>
        )}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={battleDeskColor(model.longformBattleDesk.status)} bordered={false}>{model.longformBattleDesk.label}</Tag>
            <Tag bordered={false}>{model.longformRhythm.currentBandLabel}</Tag>
            {model.longformBattleDesk.riskChips.map(chip => (
              <Tag key={chip} color="gold" bordered={false}>{chip}</Tag>
            ))}
          </Space>
          <Text type="secondary">{model.longformBattleDesk.summary}</Text>
          <Alert
            type={model.longformBattleDesk.status === 'ready' ? 'success' : model.longformBattleDesk.status === 'blocked' ? 'error' : 'warning'}
            showIcon
            message={`今日优先：${model.longformBattleDesk.primaryAction.label}`}
            description={model.longformBattleDesk.primaryAction.reason}
          />
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
            {model.longformBattleDesk.lanes.map(lane => (
              <button
                key={lane.key}
                type="button"
                onClick={() => onAction(lane.actionKey)}
                style={{
                  border: '1px solid #edf0f5',
                  borderRadius: 8,
                  padding: '10px 12px',
                  background: lane.status === 'ok' ? '#fff' : lane.status === 'block' ? '#fff1f0' : '#fffbeb',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  font: 'inherit',
                  color: 'inherit',
                }}
              >
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color={battleDeskColor(lane.status)} bordered={false}>{lane.label || battleLaneFallbackLabel(lane.key)}</Tag>
                    <Tag bordered={false}>{lane.score}</Tag>
                  </Space>
                  <Progress
                    percent={Math.max(0, Math.min(100, lane.score))}
                    size="small"
                    showInfo={false}
                    strokeColor={battleDeskColor(lane.status) === 'green' ? '#52c41a' : battleDeskColor(lane.status) === 'red' ? '#ff4d4f' : '#faad14'}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>{lane.detail}</Text>
                </Space>
              </button>
            ))}
          </div>
        </Space>
      </Card>

      <Card
        className="novel-core-contract-radar-card"
        title="核心契约雷达"
        size="small"
        extra={(
          <Button
            size="small"
            type={model.coreContractRadar.status === 'ready' ? 'default' : 'primary'}
            onClick={() => onAction(model.coreContractRadar.primaryAction.key)}
          >
            {model.coreContractRadar.primaryAction.label}
          </Button>
        )}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={coreContractRadarColor(model.coreContractRadar.status)} bordered={false}>
              {model.coreContractRadar.label}
            </Tag>
            <Tag bordered={false}>百万字核心守门</Tag>
            {model.coreContractRadar.riskTags.map(tag => (
              <Tag key={tag} color={tag.includes('偏移') || tag.includes('缺') ? 'red' : 'gold'} bordered={false}>{tag}</Tag>
            ))}
          </Space>
          <Alert
            type={model.coreContractRadar.status === 'ready' ? 'success' : model.coreContractRadar.status === 'blocked' ? 'error' : 'warning'}
            showIcon
            message={`契约下一步：${model.coreContractRadar.primaryAction.label}`}
            description={model.coreContractRadar.summary}
          />
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
            {model.coreContractRadar.checks.map(check => (
              <button
                key={check.key}
                type="button"
                onClick={() => onAction(check.status === 'ok' ? 'enter_chapter_writing' : model.coreContractRadar.primaryAction.key)}
                style={{
                  border: '1px solid #edf0f5',
                  borderRadius: 8,
                  padding: '10px 12px',
                  background: check.status === 'ok' ? '#fff' : check.status === 'block' ? '#fff1f0' : '#fffbeb',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  font: 'inherit',
                  color: 'inherit',
                }}
              >
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color={coreContractRadarColor(check.status)} bordered={false}>{check.label}</Tag>
                    <Tag bordered={false}>{check.score}</Tag>
                  </Space>
                  <Progress
                    percent={Math.max(0, Math.min(100, check.score))}
                    size="small"
                    showInfo={false}
                    strokeColor={coreContractRadarColor(check.status) === 'green' ? '#52c41a' : coreContractRadarColor(check.status) === 'red' ? '#ff4d4f' : '#faad14'}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>{check.detail}</Text>
                </Space>
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <div style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>必须服务</Text>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                {(model.coreContractRadar.mustServe.length ? model.coreContractRadar.mustServe : ['补齐核心卖点、主角驱动、核心矛盾和本章任务。']).slice(0, 5).map(item => (
                  <Text key={item} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
                ))}
              </Space>
            </div>
            <div style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>不可偏移</Text>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                {(model.coreContractRadar.noDrift.length ? model.coreContractRadar.noDrift : ['不能改写既定核心承诺，不能把创新机制写成普通套路。']).slice(0, 5).map(item => (
                  <Text key={item} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
                ))}
              </Space>
            </div>
          </div>
        </Space>
      </Card>

      <Card
        className="novel-serial-release-desk-card"
        title="连载发布节奏台"
        size="small"
        extra={(
          <Button
            size="small"
            type={model.serialReleaseDesk.status === 'ready' ? 'default' : 'primary'}
            onClick={() => onAction(model.serialReleaseDesk.primaryAction.key)}
          >
            {model.serialReleaseDesk.primaryAction.label}
          </Button>
        )}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={serialReleaseColor(model.serialReleaseDesk.status)} bordered={false}>
              {model.serialReleaseDesk.label}
            </Tag>
            <Tag bordered={false}>日更 {model.serialReleaseDesk.dailyTargetChapters} 章</Tag>
            <Tag color={model.serialReleaseDesk.bufferDays >= model.serialReleaseDesk.minBufferDays ? 'green' : 'gold'} bordered={false}>
              存稿 {model.serialReleaseDesk.bufferDays} 天
            </Tag>
            <Tag bordered={false}>存稿安全线 {model.serialReleaseDesk.minBufferDays} 天</Tag>
            <Tag bordered={false}>已发布到第 {model.serialReleaseDesk.lastPublishedChapter} 章</Tag>
          </Space>
          <Text type="secondary">{model.serialReleaseDesk.summary}</Text>
          <Alert
            type={model.serialReleaseDesk.status === 'ready' ? 'success' : model.serialReleaseDesk.status === 'blocked' ? 'error' : 'warning'}
            showIcon
            message={`发布节奏下一步：${model.serialReleaseDesk.primaryAction.label}`}
            description={model.serialReleaseDesk.primaryAction.reason}
          />
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {[
              { label: '发布窗口', value: `${model.serialReleaseDesk.releaseWindow[0]?.chapterNo || '?'}-${model.serialReleaseDesk.releaseWindow.at(-1)?.chapterNo || '?'}`, color: serialReleaseColor(model.serialReleaseDesk.status) },
              { label: '可发布存稿', value: `${model.serialReleaseDesk.publishableChapters} 章`, color: model.serialReleaseDesk.publishableChapters > 0 ? 'green' : 'gold' },
              { label: '当前存稿', value: `${model.serialReleaseDesk.bufferDays} 天`, color: model.serialReleaseDesk.bufferDays >= model.serialReleaseDesk.minBufferDays ? 'green' : 'gold' },
              { label: '风险章节', value: `${model.serialReleaseDesk.riskChapters.length} 章`, color: model.serialReleaseDesk.riskChapters.length ? 'red' : 'green' },
            ].map(item => (
              <div key={item.label} style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
                <Space direction="vertical" size={6}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.label}</Text>
                  <Tag color={item.color} bordered={false}>{item.value}</Tag>
                </Space>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
            {model.serialReleaseDesk.pipeline.map(step => (
              <button
                key={step.key}
                type="button"
                onClick={() => onAction(step.actionKey)}
                style={{
                  border: '1px solid #edf0f5',
                  borderRadius: 8,
                  padding: '10px 12px',
                  background: step.status === 'ok' ? '#fff' : step.status === 'block' ? '#fff1f0' : '#fffbeb',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  font: 'inherit',
                  color: 'inherit',
                }}
              >
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color={serialReleaseColor(step.status)} bordered={false}>{step.label}</Tag>
                    <Tag bordered={false}>{step.count}</Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{step.detail}</Text>
                </Space>
              </button>
            ))}
          </div>
          <div style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: 10, background: '#fff' }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>发布窗口</Text>
            <div style={{ display: 'grid', gap: 6 }}>
              {model.serialReleaseDesk.releaseWindow.map(chapter => (
                <button
                  key={`${chapter.chapterNo}-${chapter.title}`}
                  type="button"
                  onClick={() => onSelectChapter(chapter.chapterNo)}
                  style={{
                    border: '1px solid #edf0f5',
                    borderRadius: 8,
                    padding: '8px 10px',
                    background: chapter.status === 'needs_revision' ? '#fff1f0' : '#fbfcfe',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    color: 'inherit',
                  }}
                >
                  <Space wrap>
                    <Tag color={serialReleaseColor(chapter.status)} bordered={false}>第{chapter.chapterNo}章</Tag>
                    <Text strong>{chapter.title}</Text>
                    <Tag bordered={false}>{chapter.wordCount} 字</Tag>
                    <Tag color={serialReleaseColor(chapter.status)} bordered={false}>
                      {chapter.status === 'publishable' ? '可发布' : chapter.status === 'needs_revision' ? '待修订' : chapter.status === 'drafting' ? '待生成正文' : chapter.status === 'published' ? '已发布' : '待补计划'}
                    </Tag>
                    {chapter.riskTags.map(tag => <Tag key={tag} color="red" bordered={false}>{tag}</Tag>)}
                  </Space>
                </button>
              ))}
            </div>
          </div>
          {model.serialReleaseDesk.riskChapters.length > 0 && (
            <Space wrap>
              {model.serialReleaseDesk.riskChapters.slice(0, 6).map(chapter => (
                <Tag key={chapter.chapterNo} color="red" bordered={false}>
                  第{chapter.chapterNo}章 {chapter.riskTags.join('、')}
                </Tag>
              ))}
            </Space>
          )}
          {model.serialReleaseDesk.nextActions.length > 0 && (
            <Space wrap>
              {model.serialReleaseDesk.nextActions.map(action => <Tag key={action} color="gold" bordered={false}>{action}</Tag>)}
            </Space>
          )}
        </Space>
      </Card>

      <Card
        className="novel-longform-spine-guard-card"
        title="全书主轴护栏"
        size="small"
        extra={(
          <Button
            size="small"
            type={model.longformSpineGuard.status === 'ready' ? 'default' : 'primary'}
            onClick={() => onAction(model.longformSpineGuard.actionKey)}
          >
            {actionLabel(model.longformSpineGuard.actionKey)}
          </Button>
        )}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={spineGuardColor(model.longformSpineGuard.status)} bordered={false}>
              {model.longformSpineGuard.label}
            </Tag>
            <Tag bordered={false}>{model.longformSpineGuard.sourceLabel}</Tag>
            {model.longformSpineGuard.missingAxes.map(axis => (
              <Tag key={axis} color="red" bordered={false}>缺{axis}</Tag>
            ))}
          </Space>
          <Text type="secondary">{model.longformSpineGuard.summary}</Text>
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
            {model.longformSpineGuard.axes.map(axis => (
              <div
                key={axis.key}
                style={{
                  border: `1px solid ${axis.status === 'ok' ? '#e8edf3' : '#ffd8bf'}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  background: axis.status === 'ok' ? '#fff' : '#fff7ed',
                  minWidth: 0,
                }}
              >
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Space wrap>
                    <Text strong>{axis.label}</Text>
                    {axis.locked && <Tag color="blue" bordered={false}>不可漂移</Tag>}
                    {axis.status === 'missing' && <Tag color="red" bordered={false}>待补</Tag>}
                  </Space>
                  <Text type={axis.value ? undefined : 'secondary'} style={{ fontSize: 12 }}>
                    {axis.value || '未设置'}
                  </Text>
                </Space>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <div style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>不可漂移边界</Text>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                {(model.longformSpineGuard.immutableRules.length ? model.longformSpineGuard.immutableRules : ['补齐核心卖点、核心矛盾和创新钩子后形成边界。']).slice(0, 4).map(rule => (
                  <Text key={rule} type="secondary" style={{ fontSize: 12 }}>{rule}</Text>
                ))}
              </Space>
            </div>
            <div style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>可调整区</Text>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                {model.longformSpineGuard.flexibleZones.slice(0, 4).map(zone => (
                  <Text key={zone} type="secondary" style={{ fontSize: 12 }}>{zone}</Text>
                ))}
              </Space>
            </div>
          </div>
        </Space>
      </Card>

      <Card
        className="novel-million-word-milestone-card"
        title="百万字里程碑地图"
        size="small"
        extra={(
          <Button
            size="small"
            type={model.millionWordMilestones.status === 'ready' ? 'default' : 'primary'}
            onClick={() => onAction(model.millionWordMilestones.actionKey)}
          >
            {actionLabel(model.millionWordMilestones.actionKey)}
          </Button>
        )}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={millionWordMilestoneColor(model.millionWordMilestones.status)} bordered={false}>
              {model.millionWordMilestones.label}
            </Tag>
            <Tag bordered={false}>{model.millionWordMilestones.sourceLabel}</Tag>
            <Tag bordered={false}>节点 {model.millionWordMilestones.total}</Tag>
            {model.millionWordMilestones.currentMilestone && (
              <Tag color="blue" bordered={false}>当前：{model.millionWordMilestones.currentMilestone.label}</Tag>
            )}
            {model.millionWordMilestones.nextMilestone && (
              <Tag color="purple" bordered={false}>下一：{model.millionWordMilestones.nextMilestone.label}</Tag>
            )}
          </Space>
          <Text type="secondary">{model.millionWordMilestones.summary}</Text>
          {model.millionWordMilestones.milestones.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="300万字以上项目需要先补齐30万、100万、300万等里程碑" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {model.millionWordMilestones.milestones.map(item => (
                <div
                  key={item.key}
                  style={{
                    border: `1px solid ${item.status === 'needs_plan' ? '#ffd8bf' : '#e8edf3'}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    background: item.status === 'needs_plan' ? '#fff7ed' : '#fff',
                    minWidth: 0,
                  }}
                >
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag color={millionWordMilestoneStepColor(item.status)} bordered={false}>
                        {item.status === 'achieved' ? '已完成' : item.status === 'current' ? '当前节点' : item.status === 'needs_plan' ? '待补规划' : '未来节点'}
                      </Tag>
                      <Text strong>{item.label}</Text>
                      <Tag bordered={false}>{formatWords(item.targetWords)}</Tag>
                      {item.targetChapter && <Tag bordered={false}>约第{item.targetChapter}章</Tag>}
                    </Space>
                    <Text>{item.theme || '未填写阶段主题'}</Text>
                    <Space direction="vertical" size={3} style={{ width: '100%' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>主角状态：{item.protagonistState || '未设置'}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>世界扩展：{item.worldExpansion || '未设置'}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>冲突升级：{item.conflictEscalation || '未设置'}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>读者回报：{item.readerPayoff || '未设置'}</Text>
                    </Space>
                    {item.riskTags.length > 0 && (
                      <Space wrap>
                        {item.riskTags.map(tag => <Tag key={tag} color="red" bordered={false}>{tag}</Tag>)}
                      </Space>
                    )}
                  </Space>
                </div>
              ))}
            </div>
          )}
          {model.millionWordMilestones.nextActions.length > 0 && (
            <Alert
              type={model.millionWordMilestones.status === 'ready' ? 'success' : model.millionWordMilestones.status === 'blocked' ? 'error' : 'warning'}
              showIcon
              message="下一步"
              description={model.millionWordMilestones.nextActions.join('；')}
            />
          )}
        </Space>
      </Card>

      <Card
        className="novel-longform-memory-capsule-card"
        title="长篇记忆胶囊"
        size="small"
        extra={(
          <Button
            size="small"
            type={model.longformMemoryCapsule.status === 'ready' ? 'default' : 'primary'}
            onClick={() => onAction(model.longformMemoryCapsule.actionKey)}
          >
            {actionLabel(model.longformMemoryCapsule.actionKey)}
          </Button>
        )}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={memoryCapsuleColor(model.longformMemoryCapsule.status)} bordered={false}>
              {model.longformMemoryCapsule.label}
            </Tag>
            <Tag bordered={false}>
              {model.longformMemoryCapsule.lastUpdatedChapter ? `第${model.longformMemoryCapsule.lastUpdatedChapter}章同步` : '未同步'}
            </Tag>
            <Tag bordered={false}>角色 {model.longformMemoryCapsule.characterStates.length}</Tag>
            <Tag bordered={false}>开放悬念 {model.longformMemoryCapsule.openQuestions.length}</Tag>
            <Tag bordered={false}>待兑现 {model.longformMemoryCapsule.payoffDebts.length}</Tag>
          </Space>
          <Text type="secondary">{model.longformMemoryCapsule.summary}</Text>
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {[
              ['核心承诺', model.longformMemoryCapsule.corePromise],
              ['主线进度', model.longformMemoryCapsule.mainlineProgress],
              ['当前卷目标', model.longformMemoryCapsule.currentVolumeGoal],
              ['角色状态', model.longformMemoryCapsule.characterStates.join('；')],
              ['开放悬念', model.longformMemoryCapsule.openQuestions.join('；')],
              ['待兑现', model.longformMemoryCapsule.payoffDebts.join('；')],
              ['正史事实', model.longformMemoryCapsule.canonFacts.join('；')],
              ['红线', model.longformMemoryCapsule.redLines.join('；')],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  border: '1px solid #edf0f5',
                  borderRadius: 8,
                  padding: '10px 12px',
                  background: label === '红线' && value ? '#fff1f0' : '#fbfcfe',
                  minWidth: 0,
                }}
              >
                <Text strong style={{ display: 'block', marginBottom: 6 }}>{label}</Text>
                <Text type={value ? undefined : 'secondary'} style={{ fontSize: 12 }}>
                  {value || '未设置'}
                </Text>
              </div>
            ))}
          </div>
          {model.longformMemoryCapsule.status !== 'ready' && (
            <Alert
              type={model.longformMemoryCapsule.status === 'needs_sync' ? 'warning' : 'error'}
              showIcon
              message={model.longformMemoryCapsule.status === 'needs_sync' ? '继续写作前建议同步故事状态' : '缺少长篇正史召回材料'}
              description={model.longformMemoryCapsule.status === 'needs_sync'
                ? '胶囊过期时，单章生成容易忘记最近角色状态、悬念和回报债。'
                : '先补写作圣经或同步故事状态，再让模型进入章节开写任务书。'}
            />
          )}
        </Space>
      </Card>

      <Card
        className="novel-governance-hub-card"
        title="连载治理中枢"
        size="small"
        extra={(
          <Button
            size="small"
            type={model.governanceHub.status === 'ready' ? 'default' : 'primary'}
            onClick={() => onAction(model.governanceHub.primaryAction.key)}
          >
            {model.governanceHub.primaryAction.label}
          </Button>
        )}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={governanceColor(model.governanceHub.status)} bordered={false}>
              {model.governanceHub.status === 'ready' ? '可继续创作' : model.governanceHub.status === 'blocked' ? '先治理阻塞' : '需要治理'}
            </Tag>
            <Text type="secondary">{model.governanceHub.summary}</Text>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            汇总交稿风险、前30章留存、读者试读、剧情线、新资产和长线材料，先给出唯一下一步。
          </Text>
          <Alert
            type={model.governanceHub.status === 'ready' ? 'success' : model.governanceHub.status === 'blocked' ? 'error' : 'warning'}
            showIcon
            message={`唯一下一步：${model.governanceHub.primaryAction.label}`}
            description={model.governanceHub.primaryAction.reason}
          />
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
            {model.governanceHub.checkpoints.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => onAction(item.actionKey)}
                style={{
                  border: '1px solid #edf0f5',
                  borderRadius: 8,
                  padding: '10px 12px',
                  background: item.status === 'ok' ? '#fff' : item.status === 'block' ? '#fff1f0' : '#fffbeb',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  font: 'inherit',
                  color: 'inherit',
                }}
              >
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color={governanceColor(item.status)} bordered={false}>{item.label}</Tag>
                    {item.count > 0 && <Tag bordered={false}>{item.count}</Tag>}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.detail}</Text>
                </Space>
              </button>
            ))}
          </div>
        </Space>
      </Card>
    </>
  )
}
