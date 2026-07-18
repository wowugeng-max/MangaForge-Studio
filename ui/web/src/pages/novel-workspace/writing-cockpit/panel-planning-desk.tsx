import React, { useEffect, useState } from 'react'
import { Button, Col, Row, Space, Tag, Typography } from 'antd'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../writingCockpitModel'
import { compactPlanValue, continuityStageLabel, plannerColor, readinessStatus } from './panel-utils'

const { Text, Paragraph } = Typography

export function ChapterPlanningDesk({
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
  const writePreparationBrief = desk.writePreparationBrief
  const coreContract = plan.coreContract
  const readerDropRisk = plan.readerDropRisk
  const storyPressure = plan.storyPressure
  const storyDrive = plan.storyDrive
  const serialRhythm = plan.serialRhythm
  const pageTurnHook = plan.pageTurnHook
  const volumeClimax = plan.volumeClimax
  const deliveryRiskCarryOver = plan.deliveryRiskCarryOver
  const qualityContinuitySceneMap = desk.qualityContinuitySceneMap || []
  const hasCoreContract = Boolean(
    coreContract.summary
    || coreContract.mustServe.length
    || coreContract.noDrift.length
    || coreContract.repairFocus.length,
  )
  const hasReaderDropRisk = Boolean(
    readerDropRisk.dropPoints.length
    || readerDropRisk.openingGuardrail
    || readerDropRisk.middleGuardrail
    || readerDropRisk.endingGuardrail,
  )
  const hasStoryPressure = Boolean(
    storyPressure.pressureSources.length
    || storyPressure.conflictEscalationGuardrail
    || storyPressure.stakesGrowthGuardrail
    || storyPressure.reversalPressureGuardrail
    || storyPressure.requiredActions.length,
  )
  const hasStoryDrive = Boolean(
    storyDrive.protagonistChoice
    || storyDrive.choiceCost
    || storyDrive.stateChange
    || storyDrive.obstacle
    || storyDrive.causalNextStep
    || storyDrive.requiredActions.length,
  )
  const hasSerialRhythm = Boolean(
    serialRhythm.openingHookDeadline
    || serialRhythm.payoffInterval
    || serialRhythm.middleGuardrail
    || serialRhythm.endingHookGuardrail
    || serialRhythm.scenePayoffBudget.length
    || serialRhythm.antiDragRules.length,
  )
  const hasPageTurnHook = Boolean(
    pageTurnHook.coreQuestion
    || pageTurnHook.visibleTrigger
    || pageTurnHook.nextChapterPull
    || pageTurnHook.finalImage
    || pageTurnHook.forbiddenResolution.length
    || pageTurnHook.requiredActions.length,
  )
  const hasVolumeClimax = Boolean(
    volumeClimax.currentChapterRole
    || volumeClimax.volumeGoal
    || volumeClimax.climaxPromise
    || volumeClimax.requiredBeats.length
    || volumeClimax.forbiddenPayoff.length
    || volumeClimax.nearbyBeats.length,
  )
  const hasDeliveryRiskCarryOver = Boolean(
    deliveryRiskCarryOver.label
    || deliveryRiskCarryOver.priorityLabel
    || deliveryRiskCarryOver.items.length
    || deliveryRiskCarryOver.evidence.length
    || deliveryRiskCarryOver.requiredActions.length
    || deliveryRiskCarryOver.openingActions.length
    || deliveryRiskCarryOver.middleActions.length
    || deliveryRiskCarryOver.endingActions.length
    || deliveryRiskCarryOver.forbiddenRepeats.length,
  )
  const hasQualityContinuitySceneMap = qualityContinuitySceneMap.length > 0

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
                {writePreparationBrief && (
                  <div className="writing-cockpit-write-preparation-brief" style={{ background: '#fff', border: '1px solid #edf0f5', borderRadius: 6, padding: 8, marginBottom: 10, minWidth: 0 }}>
                    <Space direction="vertical" size={6} style={{ width: '100%', minWidth: 0 }}>
                      <Space wrap size={[4, 4]}>
                        <Tag color={writePreparationBrief.readinessStatus === 'ready' ? 'green' : 'gold'} bordered={false}>写前准备</Tag>
                        <Tag bordered={false}>{writePreparationBrief.readinessStatus === 'ready' ? '已就绪' : '待确认'}</Tag>
                        {writePreparationBrief.sourceGaps.length > 0 && (
                          <Tag color="gold" bordered={false}>来源缺口 {writePreparationBrief.sourceGaps.length}</Tag>
                        )}
                        {writePreparationBrief.assetRisks.length > 0 && (
                          <Tag color="red" bordered={false}>资产风险 {writePreparationBrief.assetRisks.length}</Tag>
                        )}
                        {writePreparationBrief.deliveryRiskActions.length > 0 && (
                          <Tag color="volcano" bordered={false}>交稿动作 {writePreparationBrief.deliveryRiskActions.length}</Tag>
                        )}
                      </Space>
                      {writePreparationBrief.sourceGaps.length > 0 && (
                        <Text type="secondary" style={wrapTextStyle}>来源缺口：{writePreparationBrief.sourceGaps.slice(0, 2).join('；')}</Text>
                      )}
                      {writePreparationBrief.assetRisks.length > 0 && (
                        <Text type="secondary" style={wrapTextStyle}>资产关系：{writePreparationBrief.assetRisks.slice(0, 2).join('；')}</Text>
                      )}
                      {writePreparationBrief.deliveryRiskActions.length > 0 && (
                        <Text type="secondary" style={wrapTextStyle}>交稿动作：{writePreparationBrief.deliveryRiskActions.slice(0, 2).join('；')}</Text>
                      )}
                      {writePreparationBrief.mustConfirm.length > 0 && (
                        <Text style={wrapTextStyle}>确认项：{writePreparationBrief.mustConfirm.slice(0, 2).join('；')}</Text>
                      )}
                      {writePreparationBrief.mustConfirm.length === 0 && writePreparationBrief.blueprintFocus.length > 0 && (
                        <Text type="secondary" style={wrapTextStyle}>蓝图焦点：{writePreparationBrief.blueprintFocus.slice(0, 2).join('；')}</Text>
                      )}
                      {writePreparationBrief.mustConfirm.length === 0 && writePreparationBrief.readerPayoffFocus.length > 0 && (
                        <Text type="secondary" style={wrapTextStyle}>读者回报：{writePreparationBrief.readerPayoffFocus.slice(0, 2).join('；')}</Text>
                      )}
                    </Space>
                  </div>
                )}
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
                  {hasDeliveryRiskCarryOver && (
                    <div className="writing-cockpit-delivery-risk">
                      <Space wrap size={[4, 4]}>
                        <Tag color="red" bordered={false}>交稿风险转写作动作</Tag>
                        {deliveryRiskCarryOver.label && (
                          <Tag color="volcano" bordered={false}>{deliveryRiskCarryOver.label}</Tag>
                        )}
                        {deliveryRiskCarryOver.priorityLabel && (
                          <Tag color="gold" bordered={false}>{deliveryRiskCarryOver.priorityLabel}</Tag>
                        )}
                      </Space>
                      {deliveryRiskCarryOver.items.length > 0 && (
                        <Text type="secondary" style={wrapTextStyle}>风险：{deliveryRiskCarryOver.items.slice(0, 3).join('；')}</Text>
                      )}
                      {deliveryRiskCarryOver.evidence.length > 0 && (
                        <Text type="secondary" style={wrapTextStyle}>证据：{deliveryRiskCarryOver.evidence.slice(0, 2).join('；')}</Text>
                      )}
                      {deliveryRiskCarryOver.openingActions.length > 0 && (
                        <Text type="secondary" style={wrapTextStyle}>开篇修复：{deliveryRiskCarryOver.openingActions.slice(0, 2).join('；')}</Text>
                      )}
                      {deliveryRiskCarryOver.middleActions.length > 0 && (
                        <Text type="secondary" style={wrapTextStyle}>中段推进：{deliveryRiskCarryOver.middleActions.slice(0, 2).join('；')}</Text>
                      )}
                      {deliveryRiskCarryOver.endingActions.length > 0 && (
                        <Text type="secondary" style={wrapTextStyle}>章末追读：{deliveryRiskCarryOver.endingActions.slice(0, 2).join('；')}</Text>
                      )}
                      {deliveryRiskCarryOver.forbiddenRepeats.length > 0 && (
                        <Text type="secondary" style={wrapTextStyle}>禁用重复：{deliveryRiskCarryOver.forbiddenRepeats.slice(0, 2).join('；')}</Text>
                      )}
                      {deliveryRiskCarryOver.requiredActions.length > 0 && (
                        <Text type="secondary" style={wrapTextStyle}>动作：{deliveryRiskCarryOver.requiredActions.slice(0, 3).join('；')}</Text>
                      )}
                    </div>
                  )}
                  {hasQualityContinuitySceneMap && (
                    <div className="writing-cockpit-quality-continuity-scenes">
                      <Space wrap size={[4, 4]}>
                        <Tag color="gold" bordered={false}>场景续航落点</Tag>
                        <Tag bordered={false}>{qualityContinuitySceneMap.length} 场</Tag>
                      </Space>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        {qualityContinuitySceneMap.slice(0, 4).map(item => (
                          <div key={`quality-continuity-${item.sceneNo}-${item.title}`} style={{ minWidth: 0 }}>
                            <Space wrap size={[4, 4]}>
                              <Tag color={item.stage === 'opening' ? 'blue' : item.stage === 'ending' ? 'volcano' : 'cyan'} bordered={false}>
                                {continuityStageLabel(item.stage)}
                              </Tag>
                              <Tag bordered={false}>场景{item.sceneNo}</Tag>
                              <Text strong style={wrapTextStyle}>{item.title}</Text>
                            </Space>
                            <Text type="secondary" style={wrapTextStyle}>动作：{item.action}</Text>
                            {item.forbiddenRepeats.length > 0 && (
                              <Text type="secondary" style={wrapTextStyle}>禁用重复：{item.forbiddenRepeats.slice(0, 2).join('；')}</Text>
                            )}
                          </div>
                        ))}
                      </Space>
                    </div>
                  )}
                  {hasCoreContract && (
                    <div className="writing-cockpit-core-contract" style={{ borderTop: '1px solid #edf0f5', paddingTop: 8, marginTop: 2 }}>
                      <Text strong style={{ ...wrapTextStyle, fontSize: 12 }}>核心契约</Text>
                      {coreContract.summary && (
                        <Text type="secondary" style={wrapTextStyle}>{coreContract.summary}</Text>
                      )}
                      {coreContract.mustServe.length > 0 && (
                        <Space wrap size={[4, 4]}>
                          <Tag color="blue" bordered={false}>必须服务</Tag>
                          {coreContract.mustServe.slice(0, 3).map(item => (
                            <Tag key={`serve-${item}`} bordered={false}>{item}</Tag>
                          ))}
                        </Space>
                      )}
                      {coreContract.noDrift.length > 0 && (
                        <Space wrap size={[4, 4]}>
                          <Tag color="red" bordered={false}>不得漂移</Tag>
                          {coreContract.noDrift.slice(0, 3).map(item => (
                            <Tag key={`drift-${item}`} color="red" bordered={false}>{item}</Tag>
                          ))}
                        </Space>
                      )}
                      {coreContract.repairFocus.length > 0 && (
                        <Space wrap size={[4, 4]}>
                          <Tag color="gold" bordered={false}>优先修正</Tag>
                          {coreContract.repairFocus.slice(0, 3).map(item => (
                            <Tag key={`repair-${item}`} color="gold" bordered={false}>{item}</Tag>
                          ))}
                        </Space>
                      )}
                    </div>
                  )}
                  {hasStoryPressure && (
                    <div className="writing-cockpit-story-pressure">
                      <Space wrap size={[4, 4]}>
                        <Tag color="cyan" bordered={false}>故事压力</Tag>
                        {storyPressure.status && (
                          <Tag bordered={false}>{storyPressure.status === 'needs_attention' ? '需加压' : storyPressure.status}</Tag>
                        )}
                        {storyPressure.pressureSources.length > 0 && (
                          <Tag color="blue" bordered={false}>压力源 {storyPressure.pressureSources.length}</Tag>
                        )}
                      </Space>
                      {storyPressure.pressureSources.length > 0 && (
                        <Text type="secondary" style={wrapTextStyle}>压力源：{storyPressure.pressureSources.slice(0, 3).join('、')}</Text>
                      )}
                      <Space direction="vertical" size={3} style={{ width: '100%' }}>
                        {storyPressure.conflictEscalationGuardrail && (
                          <Text type="secondary" style={wrapTextStyle}>冲突升级：{storyPressure.conflictEscalationGuardrail}</Text>
                        )}
                        {storyPressure.stakesGrowthGuardrail && (
                          <Text type="secondary" style={wrapTextStyle}>赌注升级：{storyPressure.stakesGrowthGuardrail}</Text>
                        )}
                        {storyPressure.reversalPressureGuardrail && (
                          <Text type="secondary" style={wrapTextStyle}>反转逼迫：{storyPressure.reversalPressureGuardrail}</Text>
                        )}
                        {storyPressure.requiredActions.length > 0 && (
                          <Text type="secondary" style={wrapTextStyle}>动作：{storyPressure.requiredActions.slice(0, 2).join('；')}</Text>
                        )}
                      </Space>
                    </div>
                  )}
                  {hasStoryDrive && (
                    <div className="writing-cockpit-story-drive">
                      <Space wrap size={[4, 4]}>
                        <Tag color="geekblue" bordered={false}>主角能动性</Tag>
                        {storyDrive.protagonistChoice && <Tag color="blue" bordered={false}>主角选择</Tag>}
                        {storyDrive.choiceCost && <Tag color="gold" bordered={false}>选择代价</Tag>}
                        {storyDrive.stateChange && <Tag color="green" bordered={false}>状态变化</Tag>}
                      </Space>
                      <Space direction="vertical" size={3} style={{ width: '100%' }}>
                        {storyDrive.obstacle && (
                          <Text type="secondary" style={wrapTextStyle}>阻碍：{storyDrive.obstacle}</Text>
                        )}
                        {storyDrive.protagonistChoice && (
                          <Text type="secondary" style={wrapTextStyle}>主角选择：{storyDrive.protagonistChoice}</Text>
                        )}
                        {storyDrive.choiceCost && (
                          <Text type="secondary" style={wrapTextStyle}>选择代价：{storyDrive.choiceCost}</Text>
                        )}
                        {storyDrive.stateChange && (
                          <Text type="secondary" style={wrapTextStyle}>状态变化：{storyDrive.stateChange}</Text>
                        )}
                        {storyDrive.causalNextStep && (
                          <Text type="secondary" style={wrapTextStyle}>下一步因果：{storyDrive.causalNextStep}</Text>
                        )}
                      </Space>
                    </div>
                  )}
                  {hasSerialRhythm && (
                    <div className="writing-cockpit-serial-rhythm">
                      <Space wrap size={[4, 4]}>
                        <Tag color="lime" bordered={false}>连载节奏</Tag>
                        {serialRhythm.payoffInterval && <Tag color="green" bordered={false}>回报密度</Tag>}
                        {serialRhythm.scenePayoffBudget.length > 0 && (
                          <Tag color="blue" bordered={false}>场景回报 {serialRhythm.scenePayoffBudget.length}</Tag>
                        )}
                      </Space>
                      <Space direction="vertical" size={3} style={{ width: '100%' }}>
                        {serialRhythm.openingHookDeadline && (
                          <Text type="secondary" style={wrapTextStyle}>开篇钩子：{serialRhythm.openingHookDeadline}</Text>
                        )}
                        {serialRhythm.payoffInterval && (
                          <Text type="secondary" style={wrapTextStyle}>回报密度：{serialRhythm.payoffInterval}</Text>
                        )}
                        {serialRhythm.middleGuardrail && (
                          <Text type="secondary" style={wrapTextStyle}>中段防水：{serialRhythm.middleGuardrail}</Text>
                        )}
                        {serialRhythm.endingHookGuardrail && (
                          <Text type="secondary" style={wrapTextStyle}>章末追读：{serialRhythm.endingHookGuardrail}</Text>
                        )}
                        {serialRhythm.scenePayoffBudget.slice(0, 2).map(scene => (
                          <Text key={`${scene.sceneNo}-${scene.title}`} type="secondary" style={wrapTextStyle}>
                            场景{scene.sceneNo}：{scene.requiredPayoff || scene.turn || scene.endingHookSeed || '必须有可见回报'}
                          </Text>
                        ))}
                      </Space>
                    </div>
                  )}
                  {hasPageTurnHook && (
                    <div className="writing-cockpit-page-turn-hook">
                      <Space wrap size={[4, 4]}>
                        <Tag color="magenta" bordered={false}>章末翻页</Tag>
                        {pageTurnHook.hookType && <Tag bordered={false}>{pageTurnHook.hookType}</Tag>}
                        {pageTurnHook.forbiddenResolution.length > 0 && (
                          <Tag color="red" bordered={false}>禁提前解答</Tag>
                        )}
                      </Space>
                      <Space direction="vertical" size={3} style={{ width: '100%' }}>
                        {pageTurnHook.coreQuestion && (
                          <Text type="secondary" style={wrapTextStyle}>读者问题：{pageTurnHook.coreQuestion}</Text>
                        )}
                        {pageTurnHook.visibleTrigger && (
                          <Text type="secondary" style={wrapTextStyle}>可见触发：{pageTurnHook.visibleTrigger}</Text>
                        )}
                        {pageTurnHook.finalImage && (
                          <Text type="secondary" style={wrapTextStyle}>最后画面：{pageTurnHook.finalImage}</Text>
                        )}
                        {pageTurnHook.nextChapterPull && (
                          <Text type="secondary" style={wrapTextStyle}>下章拉力：{pageTurnHook.nextChapterPull}</Text>
                        )}
                        {pageTurnHook.forbiddenResolution.length > 0 && (
                          <Text type="secondary" style={wrapTextStyle}>禁提前解答：{pageTurnHook.forbiddenResolution.slice(0, 2).join('；')}</Text>
                        )}
                      </Space>
                    </div>
                  )}
                  {hasVolumeClimax && (
                    <div className="writing-cockpit-volume-climax">
                      <Space wrap size={[4, 4]}>
                        <Tag color="purple" bordered={false}>卷级爆点</Tag>
                        {volumeClimax.status && (
                          <Tag bordered={false}>{volumeClimax.status === 'needs_attention' ? '需守住预算' : volumeClimax.status}</Tag>
                        )}
                        {volumeClimax.requiredBeats.length > 0 && (
                          <Tag color="blue" bordered={false}>必兑现 {volumeClimax.requiredBeats.length}</Tag>
                        )}
                        {volumeClimax.forbiddenPayoff.length > 0 && (
                          <Tag color="red" bordered={false}>禁提前消费</Tag>
                        )}
                      </Space>
                      <Space direction="vertical" size={3} style={{ width: '100%' }}>
                        {volumeClimax.currentChapterRole && (
                          <Text type="secondary" style={wrapTextStyle}>本章爆点职责：{volumeClimax.currentChapterRole}</Text>
                        )}
                        {volumeClimax.volumeGoal && (
                          <Text type="secondary" style={wrapTextStyle}>卷目标：{volumeClimax.volumeGoal}</Text>
                        )}
                        {volumeClimax.climaxPromise && (
                          <Text type="secondary" style={wrapTextStyle}>高潮承诺：{volumeClimax.climaxPromise}</Text>
                        )}
                        {volumeClimax.requiredBeats.length > 0 && (
                          <Text type="secondary" style={wrapTextStyle}>必须兑现：{volumeClimax.requiredBeats.slice(0, 3).join('；')}</Text>
                        )}
                        {volumeClimax.forbiddenPayoff.length > 0 && (
                          <Text type="secondary" style={wrapTextStyle}>禁提前消费：{volumeClimax.forbiddenPayoff.slice(0, 3).join('；')}</Text>
                        )}
                        {volumeClimax.nearbyBeats.slice(0, 2).map(beat => (
                          <Text key={`${beat.chapterNo || 'x'}-${beat.label}`} type="secondary" style={wrapTextStyle}>
                            邻近爆点：{beat.chapterNo ? `第${beat.chapterNo}章 ` : ''}{beat.type ? `${beat.type} ` : ''}{beat.label}{beat.detail ? ` - ${beat.detail}` : ''}
                          </Text>
                        ))}
                      </Space>
                    </div>
                  )}
                  {hasReaderDropRisk && (
                    <div className="writing-cockpit-reader-drop-risk">
                      <Space wrap size={[4, 4]}>
                        <Tag color="volcano" bordered={false}>弃读预警</Tag>
                        {readerDropRisk.status && (
                          <Tag bordered={false}>{readerDropRisk.status === 'needs_repair' ? '需修复' : readerDropRisk.status}</Tag>
                        )}
                        {readerDropRisk.dropPoints.length > 0 && (
                          <Tag color="red" bordered={false}>弃读点 {readerDropRisk.dropPoints.length}</Tag>
                        )}
                      </Space>
                      {readerDropRisk.dropPoints.length > 0 && (
                        <Space direction="vertical" size={3} style={{ width: '100%' }}>
                          {readerDropRisk.dropPoints.slice(0, 2).map(item => (
                            <Text key={`drop-${item}`} type="secondary" style={wrapTextStyle}>风险：{item}</Text>
                          ))}
                        </Space>
                      )}
                      <Space direction="vertical" size={3} style={{ width: '100%' }}>
                        {readerDropRisk.openingGuardrail && (
                          <Text type="secondary" style={wrapTextStyle}>开篇防弃读：{readerDropRisk.openingGuardrail}</Text>
                        )}
                        {readerDropRisk.middleGuardrail && (
                          <Text type="secondary" style={wrapTextStyle}>中段防掉速：{readerDropRisk.middleGuardrail}</Text>
                        )}
                        {readerDropRisk.endingGuardrail && (
                          <Text type="secondary" style={wrapTextStyle}>章末防流失：{readerDropRisk.endingGuardrail}</Text>
                        )}
                      </Space>
                    </div>
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
