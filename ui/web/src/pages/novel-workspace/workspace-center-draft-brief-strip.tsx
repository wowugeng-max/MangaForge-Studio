import React from 'react'
import { Button, Tag, Tooltip, Typography } from 'antd'
import {
  CheckCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'
const { Text } = Typography

export function WorkspaceDraftBriefStrip(props: Record<string, any>) {
  const { draftBriefActionLoading, draftBriefSummary, generatingProse, generationTargetWordCount, onDisableStyleSamples, onLockStyleSamples, onReplaceStyleSamples, onSavePreDraftBrief, openChapterBlueprintEditor, preDraftBriefLoading, runDraftBriefAction, styleSampleActionDisabled, styleSampleActionLoading } = props
  return (
    <>
        {draftBriefSummary.visible && (
          <div className="novel-draft-brief-strip">
            <div className="novel-draft-brief-main">
              <div className="novel-draft-brief-head">
                <span className="novel-draft-brief-label">章节开写任务书</span>
                <Tag className="novel-draft-brief-status" bordered={false}>{draftBriefSummary.statusLabel}</Tag>
                {draftBriefSummary.checks.map(check => (
                  <Tag key={check} bordered={false}>{check}</Tag>
                ))}
                <Text className="novel-draft-brief-focus">{draftBriefSummary.focus}</Text>
                {draftBriefSummary.actionKey && (
                  <Button
                    className="novel-draft-brief-action"
                    size="small"
                    type={draftBriefSummary.actionKey === 'build_brief' ? 'primary' : 'default'}
                    loading={draftBriefActionLoading}
                    onClick={runDraftBriefAction}
                  >
                    {draftBriefSummary.actionLabel}
                  </Button>
                )}
              </div>
              <div className="novel-draft-brief-grid">
                <div><span>本章目标</span><strong>{draftBriefSummary.briefFields.chapterGoal || '待补齐'}</strong></div>
                <div><span>读者承诺</span><strong>{draftBriefSummary.briefFields.readerPromise || '待生成任务书'}</strong></div>
                <div><span>核心冲突</span><strong>{draftBriefSummary.briefFields.coreConflict || '待补齐'}</strong></div>
                <div><span>情绪曲线</span><strong>{draftBriefSummary.briefFields.emotionalCurve || '待生成任务书'}</strong></div>
                <div><span>关键设定</span><strong>{draftBriefSummary.briefFields.keySettings || '无明确必用设定'}</strong></div>
                <div><span>禁揭/禁写</span><strong>{draftBriefSummary.briefFields.forbiddenContent || '无明确禁写项'}</strong></div>
                <div><span>场景预算</span><strong>{draftBriefSummary.briefFields.sceneBudget || `${sceneCards.length} 个场景`}</strong></div>
                <div><span>字数目标</span><strong>{draftBriefSummary.briefFields.wordBudget || `${generationTargetWordCount} 字`}</strong></div>
                <div><span>章末钩子</span><strong>{draftBriefSummary.briefFields.endingHook || '待补齐'}</strong></div>
              </div>
              {(draftBriefSummary.briefFields.writePreparationStatus || draftBriefSummary.briefFields.writePreparationSourceGaps || draftBriefSummary.briefFields.writePreparationMustConfirm) && (
                <div className="novel-draft-brief-write-preparation">
                  <span>写前准备确认</span>
                  <strong>状态：{draftBriefSummary.briefFields.writePreparationStatus || 'ready'}</strong>
                  <strong>来源缺口：{draftBriefSummary.briefFields.writePreparationSourceGaps || '无'}</strong>
                  <strong>资产关系：{draftBriefSummary.briefFields.writePreparationAssetRisks || '无'}</strong>
                  <strong>交稿动作：{draftBriefSummary.briefFields.writePreparationDeliveryActions || '无'}</strong>
                  <strong>蓝图焦点：{draftBriefSummary.briefFields.writePreparationBlueprintFocus || '按章节蓝图执行'}</strong>
                  <strong>读者回报：{draftBriefSummary.briefFields.writePreparationReaderPayoff || draftBriefSummary.briefFields.readerPromise || '按追读雷达兑现'}</strong>
                  <strong>必须确认：{draftBriefSummary.briefFields.writePreparationMustConfirm || '无'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.blueprintOutline || draftBriefSummary.briefFields.blueprintPlotLines || draftBriefSummary.briefFields.blueprintBeatSequence) && (
                <div className="novel-draft-brief-blueprint">
                  <span>章节蓝图合同</span>
                  <Button
                    className="novel-draft-brief-blueprint-edit"
                    size="small"
                    icon={<EditOutlined />}
                    disabled={!onSavePreDraftBrief || Boolean(preDraftBriefLoading || generatingProse)}
                    onClick={openChapterBlueprintEditor}
                  >
                    编辑蓝图
                  </Button>
                  <strong>目标情绪：{draftBriefSummary.briefFields.blueprintTargetEmotion || draftBriefSummary.briefFields.emotionalCurve || '明确本章读者情绪走向'}</strong>
                  <strong>开篇钩子：{draftBriefSummary.briefFields.blueprintOpeningHook || draftBriefSummary.briefFields.retentionOpeningHook || '前300字要有可见抓手'}</strong>
                  <strong>核心回报：{draftBriefSummary.briefFields.blueprintCorePayoff || draftBriefSummary.briefFields.readerPromise || '明确本章兑现给读者的爽点/信息/关系变化'}</strong>
                  <strong>五段式：{draftBriefSummary.briefFields.blueprintOutline || '按起因、发展、转折、高潮、收束执行'}</strong>
                  <strong>多线推进：{draftBriefSummary.briefFields.blueprintPlotLines || '主线、副线、事件线、关系线和逻辑线都要落到正文'}</strong>
                  <strong>人物顺序：{draftBriefSummary.briefFields.blueprintCharacterOrder || '按场景需要控制出场'}</strong>
                  <strong>关系变化：{draftBriefSummary.briefFields.blueprintRelationshipChange || draftBriefSummary.briefFields.characterArcRelationshipShift || '写成站队、亏欠、误解或信任变化'}</strong>
                  <strong>信息缺口：{draftBriefSummary.briefFields.blueprintInformationGap || draftBriefSummary.briefFields.retentionInformationGap || '保留可追读的问题'}</strong>
                  <strong>节拍功能：{draftBriefSummary.briefFields.blueprintBeatSequence || '每个场景要有功能标签和回报'}</strong>
                  <strong>代价收益：{draftBriefSummary.briefFields.blueprintCostAndReward || '主角选择必须有代价和读者回报'}</strong>
                  <strong>章尾承接：{draftBriefSummary.briefFields.blueprintEndingContract || draftBriefSummary.briefFields.endingHook || '最后一幕压到下一章拉力'}</strong>
                  {draftBriefSummary.briefFields.blueprintWritingIntent && (
                    <strong>写作意图：{draftBriefSummary.briefFields.blueprintWritingIntent}</strong>
                  )}
                </div>
              )}
              <div className="novel-draft-brief-retention">
                <span>追读雷达</span>
                <strong>开篇钩子：{draftBriefSummary.briefFields.retentionOpeningHook || '前300字要有抓手'}</strong>
                <strong>爽点承诺：{draftBriefSummary.briefFields.retentionPayoffPromise || draftBriefSummary.briefFields.readerPromise || '明确本章回报'}</strong>
                <strong>信息缺口：{draftBriefSummary.briefFields.retentionInformationGap || '保留待解问题'}</strong>
                <strong>短剧场面：{draftBriefSummary.briefFields.retentionShortDramaScene || '需要可视化冲突场面'}</strong>
                <strong>章末追读：{draftBriefSummary.briefFields.retentionEndingQuestion || draftBriefSummary.briefFields.endingHook || '压到最后一幕'}</strong>
              </div>
              {(draftBriefSummary.briefFields.readerDropRiskStatus || draftBriefSummary.briefFields.readerDropRisks || draftBriefSummary.briefFields.readerDropOpening) && (
                <div className="novel-draft-brief-reader-drop">
                  <span>弃读预警</span>
                  <strong>{draftBriefSummary.briefFields.readerDropRiskStatus || '起点1万均订试读基准'}</strong>
                  <strong>风险：{draftBriefSummary.briefFields.readerDropRisks || '无明确弃读点'}</strong>
                  <strong>开篇防弃读：{draftBriefSummary.briefFields.readerDropOpening || draftBriefSummary.briefFields.retentionOpeningHook || '前300字先给现场压力'}</strong>
                  <strong>中段防掉速：{draftBriefSummary.briefFields.readerDropMiddle || '减少设定解释，用行动推进'}</strong>
                  <strong>章末防流失：{draftBriefSummary.briefFields.readerDropEnding || draftBriefSummary.briefFields.retentionEndingQuestion || '留下下一章必须看的问题'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.storyDriveChoice || draftBriefSummary.briefFields.storyPressureSources || draftBriefSummary.briefFields.serialRhythmPayoffInterval || draftBriefSummary.briefFields.pageTurnQuestion) && (
                <div className="novel-draft-brief-story-pull">
                  <span>强故事节奏</span>
                  <strong>压力源：{draftBriefSummary.briefFields.storyPressureSources || draftBriefSummary.briefFields.storyDriveObstacle || '本章必须有外部阻碍'}</strong>
                  <strong>主角选择：{draftBriefSummary.briefFields.storyDriveChoice || '必须写成主动选择'}</strong>
                  <strong>选择代价：{draftBriefSummary.briefFields.storyDriveCost || draftBriefSummary.briefFields.storyPressureStakes || '选择必须有代价'}</strong>
                  <strong>回报密度：{draftBriefSummary.briefFields.serialRhythmPayoffInterval || '每800-1200字给一次回报'}</strong>
                  <strong>场景回报：{draftBriefSummary.briefFields.serialRhythmScenePayoffs || '每个场景有目标、转折和回报'}</strong>
                  <strong>章末翻页：{draftBriefSummary.briefFields.pageTurnQuestion || draftBriefSummary.briefFields.pageTurnPull || draftBriefSummary.briefFields.retentionEndingQuestion || '最后300字压追读问题'}</strong>
                  {(draftBriefSummary.briefFields.storyDriveChange || draftBriefSummary.briefFields.pageTurnTrigger || draftBriefSummary.briefFields.pageTurnForbidden) && (
                    <strong>边界：{[
                      draftBriefSummary.briefFields.storyDriveChange ? `状态变化：${draftBriefSummary.briefFields.storyDriveChange}` : '',
                      draftBriefSummary.briefFields.pageTurnTrigger ? `触发：${draftBriefSummary.briefFields.pageTurnTrigger}` : '',
                      draftBriefSummary.briefFields.pageTurnForbidden ? `禁提前解答：${draftBriefSummary.briefFields.pageTurnForbidden}` : '',
                    ].filter(Boolean).join('；')}</strong>
                  )}
                </div>
              )}
              {(draftBriefSummary.briefFields.longformBattleSummary || draftBriefSummary.briefFields.longformBattleRisks || draftBriefSummary.briefFields.longformBattleLaneRequirements) && (
                <div className="novel-draft-brief-battle">
                  <span>长篇作战承接</span>
                  <strong>状态：{draftBriefSummary.briefFields.longformBattleStatus || '待承接'}</strong>
                  <strong>风险线：{draftBriefSummary.briefFields.longformBattleRisks || draftBriefSummary.briefFields.longformBattleSummary || '无明确风险'}</strong>
                  <strong>今日优先：{draftBriefSummary.briefFields.longformBattlePrimaryAction || '按风险线补正文动作'}</strong>
                  <strong>写作动作：{draftBriefSummary.briefFields.longformBattleLaneRequirements || '保持核心、追读和剧情线不偏移'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.longformMemoryCorePromise || draftBriefSummary.briefFields.longformMemoryCharacters || draftBriefSummary.briefFields.longformMemoryQuestions || draftBriefSummary.briefFields.longformMemoryPayoffDebts) && (
                <div className="novel-draft-brief-memory-capsule">
                  <span>长篇记忆胶囊</span>
                  <strong>同步：{draftBriefSummary.briefFields.longformMemoryStatus || '待同步'}</strong>
                  <strong>核心承诺：{draftBriefSummary.briefFields.longformMemoryCorePromise || '按写作圣经执行'}</strong>
                  <strong>主线进度：{draftBriefSummary.briefFields.longformMemoryMainline || '按当前章任务推进'}</strong>
                  <strong>角色状态：{draftBriefSummary.briefFields.longformMemoryCharacters || '无明确状态'}</strong>
                  <strong>开放悬念：{draftBriefSummary.briefFields.longformMemoryQuestions || '无'}</strong>
                  <strong>待兑现：{draftBriefSummary.briefFields.longformMemoryPayoffDebts || '无'}</strong>
                  <strong>正史事实：{draftBriefSummary.briefFields.longformMemoryCanonFacts || '无'}</strong>
                  <strong>红线：{draftBriefSummary.briefFields.longformMemoryRedLines || '不得偏离核心承诺'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.governanceMemoryStatus || draftBriefSummary.briefFields.governanceMemoryEvidence || draftBriefSummary.briefFields.governanceMemoryWatchItems) && (
                <div className="novel-draft-brief-governance-memory">
                  <span>治理复查承接</span>
                  <strong>{draftBriefSummary.briefFields.governanceMemoryStatus || '治理复查已记录'}</strong>
                  <strong>摘要：{draftBriefSummary.briefFields.governanceMemorySummary || '沿用上一轮修后证据'}</strong>
                  <strong>修后证据：{draftBriefSummary.briefFields.governanceMemoryEvidence || '无'}</strong>
                  {draftBriefSummary.briefFields.governanceMemoryFailedEvidence && (
                    <strong>失效依据：{draftBriefSummary.briefFields.governanceMemoryFailedEvidence}</strong>
                  )}
                  <strong>观察项：{draftBriefSummary.briefFields.governanceMemoryWatchItems || '无'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.handoffPreviousEnding || draftBriefSummary.briefFields.handoffOpeningObligation || draftBriefSummary.briefFields.handoffMustCarry || draftBriefSummary.briefFields.handoffKeepAlive) && (
                <div className="novel-draft-brief-handoff">
                  <span>上一章承接</span>
                  <strong>最后一幕：{draftBriefSummary.briefFields.handoffPreviousEnding || '承接上一章章末钩子'}</strong>
                  <strong>开篇义务：{draftBriefSummary.briefFields.handoffOpeningObligation || '开篇接住上一章悬念'}</strong>
                  <strong>必须推进：{draftBriefSummary.briefFields.handoffMustCarry || '无跨章欠账'}</strong>
                  <strong>继续悬念：{draftBriefSummary.briefFields.handoffKeepAlive || '无跨章悬念'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.nextChapterQualityFocus || draftBriefSummary.briefFields.nextChapterQualityOpening || draftBriefSummary.briefFields.nextChapterQualityAvoid) && (
                <div className="novel-draft-brief-next-quality">
                  <span>下一章质量续航</span>
                  <strong>质量目标：{draftBriefSummary.briefFields.nextChapterQualityFocus || '承接上一章自检质量目标'}</strong>
                  <strong>开篇：{draftBriefSummary.briefFields.nextChapterQualityOpening || '前300字接住上一章风险'}</strong>
                  <strong>中段：{draftBriefSummary.briefFields.nextChapterQualityMiddle || '把风险写成可见冲突或信息变化'}</strong>
                  <strong>章末：{draftBriefSummary.briefFields.nextChapterQualityEnding || '压出下一章追读问题'}</strong>
                  <strong>禁用重复：{draftBriefSummary.briefFields.nextChapterQualityAvoid || '避免复现上一章自检指出的套路'}</strong>
                  {draftBriefSummary.briefFields.nextChapterQualityEvidence && (
                    <strong>依据：{draftBriefSummary.briefFields.nextChapterQualityEvidence}</strong>
                  )}
                </div>
              )}
              {(draftBriefSummary.briefFields.deliveryRiskLabel || draftBriefSummary.briefFields.deliveryRiskItems || draftBriefSummary.briefFields.deliveryRiskActions) && (
                <div className="novel-draft-brief-delivery-risk">
                  <span>交稿风险承接</span>
                  <strong>{draftBriefSummary.briefFields.deliveryRiskLabel || '上一章待复盘'}</strong>
                  <strong>优先：{draftBriefSummary.briefFields.deliveryRiskPriority || '先处理最高风险'}</strong>
                  <strong>风险：{draftBriefSummary.briefFields.deliveryRiskItems || '无明确残留风险'}</strong>
                  <strong>动作：{draftBriefSummary.briefFields.deliveryRiskActions || '写成开篇承接、场景推进或章末钩子'}</strong>
                  {draftBriefSummary.briefFields.deliveryRiskOpeningActions && (
                    <strong>开篇：{draftBriefSummary.briefFields.deliveryRiskOpeningActions}</strong>
                  )}
                  {draftBriefSummary.briefFields.deliveryRiskMiddleActions && (
                    <strong>中段：{draftBriefSummary.briefFields.deliveryRiskMiddleActions}</strong>
                  )}
                  {draftBriefSummary.briefFields.deliveryRiskEndingActions && (
                    <strong>章末：{draftBriefSummary.briefFields.deliveryRiskEndingActions}</strong>
                  )}
                  {draftBriefSummary.briefFields.deliveryRiskEvidence && (
                    <strong>证据：{draftBriefSummary.briefFields.deliveryRiskEvidence}</strong>
                  )}
                </div>
              )}
              {(draftBriefSummary.briefFields.expectationMustDeliver || draftBriefSummary.briefFields.expectationKeepAlive) && (
                <div className="novel-draft-brief-expectations">
                  <span>读者期待账本</span>
                  <strong>必须兑现：{draftBriefSummary.briefFields.expectationMustDeliver || '承接本章读者承诺'}</strong>
                  <strong>保持悬念：{draftBriefSummary.briefFields.expectationKeepAlive || '无明确长期悬念'}</strong>
                  <strong>禁止破坏：{draftBriefSummary.briefFields.expectationMustNotBreak || '不得只铺设定不兑现期待'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.expectationDebtMustCarry || draftBriefSummary.briefFields.expectationDebtKeepAlive || draftBriefSummary.briefFields.expectationDebtOverdue || draftBriefSummary.briefFields.expectationCarryOver) && (
                <div className="novel-draft-brief-expectation-debt">
                  <span>期待债务承接</span>
                  {draftBriefSummary.briefFields.expectationDebtOverdue && (
                    <strong>逾期优先：{draftBriefSummary.briefFields.expectationDebtOverdue}</strong>
                  )}
                  <strong>待兑现：{draftBriefSummary.briefFields.expectationDebtMustCarry || draftBriefSummary.briefFields.expectationCarryOver || '无跨章欠账'}</strong>
                  <strong>继续悬念：{draftBriefSummary.briefFields.expectationDebtKeepAlive || '无跨章悬念'}</strong>
                  {draftBriefSummary.briefFields.expectationDebtSummary && (
                    <strong>债务概览：{draftBriefSummary.briefFields.expectationDebtSummary}</strong>
                  )}
                </div>
              )}
              {(draftBriefSummary.briefFields.first30RetentionSegment || draftBriefSummary.briefFields.first30RetentionFlags) && (
                <div className="novel-draft-brief-first30">
                  <span>前30章留存修复</span>
                  <strong>{draftBriefSummary.briefFields.first30RetentionSegment || '当前章'}</strong>
                  <strong>风险：{draftBriefSummary.briefFields.first30RetentionFlags || draftBriefSummary.briefFields.first30RetentionFocus || '无明确风险'}</strong>
                  <strong>动作：{draftBriefSummary.briefFields.first30RetentionActions || '按追读雷达补强'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.recentFatigueRange || draftBriefSummary.briefFields.recentFatigueRisks || draftBriefSummary.briefFields.recentFatigueConflict) && (
                <div className="novel-draft-brief-recent-fatigue">
                  <span>近10章疲劳规避</span>
                  <strong>{draftBriefSummary.briefFields.recentFatigueRange || '近10章'}</strong>
                  <strong>风险：{draftBriefSummary.briefFields.recentFatigueRisks || '无明确疲劳风险'}</strong>
                  <strong>冲突换源：{draftBriefSummary.briefFields.recentFatigueConflict || '更换压迫来源'}</strong>
                  <strong>回报换形：{draftBriefSummary.briefFields.recentFatiguePayoff || '更换回报形态'}</strong>
                  <strong>钩子换题：{draftBriefSummary.briefFields.recentFatigueHook || '更换章末问题'}</strong>
                  <strong>场面新鲜：{draftBriefSummary.briefFields.recentFatigueScene || '补新可视化场面'}</strong>
                  {draftBriefSummary.briefFields.recentFatigueActions && (
                    <strong>动作：{draftBriefSummary.briefFields.recentFatigueActions}</strong>
                  )}
                </div>
              )}
              <div className="novel-draft-brief-innovation">
                <span>创新执行</span>
                <strong>创新角度：{draftBriefSummary.briefFields.innovationAngle || '承接长篇作品罗盘'}</strong>
                <strong>执行点：{draftBriefSummary.briefFields.innovationExecution || '用本章动作/规则/反差落地'}</strong>
                <strong>差异护栏：{draftBriefSummary.briefFields.innovationGuardrails || '不得写成普通套路章'}</strong>
                <strong>IP化场面：{draftBriefSummary.briefFields.innovationIpHooks || draftBriefSummary.briefFields.retentionShortDramaScene || '保留可视化场面'}</strong>
              </div>
              {(draftBriefSummary.briefFields.signatureScene || draftBriefSummary.briefFields.signatureSceneTarget) && (
                <div className="novel-draft-brief-signature-scene">
                  <span>强场面补位</span>
                  <strong>标志性场面：{draftBriefSummary.briefFields.signatureScene || '本章必须补一个可记忆画面'}</strong>
                  <strong>补位目标：{draftBriefSummary.briefFields.signatureSceneTarget || '修复强场面覆盖缺口'}</strong>
                  <strong>爽点回报：{draftBriefSummary.briefFields.signatureScenePayoff || '落成可见读者回报'}</strong>
                  <strong>服务主线：{draftBriefSummary.briefFields.signatureSceneStoryline || '服务当前主线推进'}</strong>
                </div>
              )}
              <div className="novel-draft-brief-storylines">
                <span>剧情线推进</span>
                <strong>必推：{draftBriefSummary.briefFields.storylineAdvances || '无'}</strong>
                <strong>埋线：{draftBriefSummary.briefFields.storylinePlants || '无'}</strong>
                <strong>回收：{draftBriefSummary.briefFields.storylinePayoffs || '无'}</strong>
                <strong>禁用：{draftBriefSummary.briefFields.storylineForbidden || '无'}</strong>
              </div>
              {(draftBriefSummary.briefFields.characterArcDesire || draftBriefSummary.briefFields.characterArcGrowthBeat || draftBriefSummary.briefFields.characterArcRelationshipShift) && (
                <div className="novel-draft-brief-character-arc">
                  <span>人物成长承接</span>
                  <strong>人物线：{draftBriefSummary.briefFields.characterArcNames || '本章角色/关系线'}</strong>
                  <strong>角色欲望：{draftBriefSummary.briefFields.characterArcDesire || '用欲望驱动行动'}</strong>
                  <strong>缺陷受压：{draftBriefSummary.briefFields.characterArcFlawPressure || '让旧习惯被冲突逼出反应'}</strong>
                  <strong>成长节点：{draftBriefSummary.briefFields.characterArcGrowthBeat || '写成选择或行动变化'}</strong>
                  <strong>关系变化：{draftBriefSummary.briefFields.characterArcRelationshipShift || '写成对话、试探、站队或亏欠'}</strong>
                  <strong>口吻锚点：{draftBriefSummary.briefFields.characterArcVoiceAnchor || '保持角色说话和行动方式差异'}</strong>
                  <strong>禁揭：{draftBriefSummary.briefFields.characterArcForbiddenReveal || '不得提前写穿后续关系/成长结果'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.storyUnitRange || draftBriefSummary.briefFields.storyUnitRole || draftBriefSummary.briefFields.storyUnitGoal) && (
                <div className="novel-draft-brief-story-unit">
                  <span>剧情单元任务</span>
                  <strong>{draftBriefSummary.briefFields.storyUnitRange || '当前剧情单元'}</strong>
                  <strong>当前职责：{draftBriefSummary.briefFields.storyUnitRole || '承接本章任务书'}</strong>
                  <strong>单元目标：{draftBriefSummary.briefFields.storyUnitGoal || '推进当前事件包'}</strong>
                  <strong>小高潮：{draftBriefSummary.briefFields.storyUnitPayoff || '后续章节兑现，不在本章抢跑'}</strong>
                  <strong>出单元钩子：{draftBriefSummary.briefFields.storyUnitExitHook || '保留追读问题'}</strong>
                  <strong>禁抢跑：{draftBriefSummary.briefFields.storyUnitForbidden || '不得提前消费后段爆点'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.volumeClimaxRange || draftBriefSummary.briefFields.volumeClimaxRole || draftBriefSummary.briefFields.volumeClimaxGoal) && (
                <div className="novel-draft-brief-volume-climax">
                  <span>卷级爆点预算</span>
                  <strong>{draftBriefSummary.briefFields.volumeClimaxRange || '当前卷爆点'}</strong>
                  <strong>本章爆点职责：{draftBriefSummary.briefFields.volumeClimaxRole || '承接当前卷节奏'}</strong>
                  <strong>卷目标：{draftBriefSummary.briefFields.volumeClimaxGoal || '服务当前卷主线推进'}</strong>
                  <strong>高潮承诺：{draftBriefSummary.briefFields.volumeClimaxPromise || '本章必须给阶段性回报'}</strong>
                  <strong>必须兑现：{draftBriefSummary.briefFields.volumeClimaxRequiredBeats || '按场景卡兑现本章爆点'}</strong>
                  <strong>禁提前消费：{draftBriefSummary.briefFields.volumeClimaxForbidden || '不得提前揭穿卷末爆点'}</strong>
                  {draftBriefSummary.briefFields.volumeClimaxNearbyBeats && (
                    <strong>邻近爆点：{draftBriefSummary.briefFields.volumeClimaxNearbyBeats}</strong>
                  )}
                  {draftBriefSummary.briefFields.volumeClimaxNextActions && (
                    <strong>动作：{draftBriefSummary.briefFields.volumeClimaxNextActions}</strong>
                  )}
                </div>
              )}
              {(draftBriefSummary.briefFields.batchGoal || draftBriefSummary.briefFields.batchCurrentRole) && (
                <div className="novel-draft-brief-batch">
                  <span>本批连载任务</span>
                  <strong>{draftBriefSummary.briefFields.batchRange || '当前批次'}</strong>
                  <strong>批次目标：{draftBriefSummary.briefFields.batchGoal || '保持连载推进'}</strong>
                  <strong>本章职责：{draftBriefSummary.briefFields.batchCurrentRole || '承接本章任务书'}</strong>
                  <strong>禁抢跑：{draftBriefSummary.briefFields.batchForbidden || '不得提前消费后续爆点'}</strong>
                </div>
              )}
              <div className="novel-draft-brief-meme">
                <span>本章网感策略</span>
                <strong>强度：{draftBriefSummary.briefFields.memeIntensity || '无'}</strong>
                <strong>功能：{draftBriefSummary.briefFields.memeFunctions || '无'}</strong>
                <strong>禁用：{draftBriefSummary.briefFields.memeForbidden || '严肃场景不玩梗'}</strong>
              </div>
              {(draftBriefSummary.briefFields.styleSampleKeys || draftBriefSummary.briefFields.styleSampleUsage || draftBriefSummary.briefFields.styleSampleControlState) && (
                <div className="novel-draft-brief-style-samples">
                  <span>本章风格样章</span>
                  <strong>状态：{draftBriefSummary.briefFields.styleSampleControlState || '系统推荐待确认'}</strong>
                  <strong>样章：{draftBriefSummary.briefFields.styleSampleKeys || '未指定'}</strong>
                  <strong>学习：{draftBriefSummary.briefFields.styleSampleUsage || '只学习节奏与句式'}</strong>
                  <strong>命中：{draftBriefSummary.briefFields.styleSampleReasons || '按本章目标与场景卡匹配'}</strong>
                  <strong>禁抄：{draftBriefSummary.briefFields.styleSampleForbidden || '原句不能照搬'}</strong>
                  <div className="novel-draft-brief-style-actions">
                    <Tooltip title="确认本章使用当前风格样章策略">
                      <Button size="small" icon={<CheckCircleOutlined />} loading={styleSampleActionLoading} disabled={styleSampleActionDisabled || !onLockStyleSamples} onClick={onLockStyleSamples}>
                        锁定样章
                      </Button>
                    </Tooltip>
                    <Tooltip title="替换为另一组更适合本章的风格样章策略">
                      <Button size="small" icon={<SyncOutlined />} loading={styleSampleActionLoading} disabled={styleSampleActionDisabled || !onReplaceStyleSamples} onClick={onReplaceStyleSamples}>
                        换一组
                      </Button>
                    </Tooltip>
                    <Tooltip title="本章不使用风格样章，只按任务书和写作圣经生成">
                      <Button size="small" icon={<StopOutlined />} loading={styleSampleActionLoading} disabled={styleSampleActionDisabled || !onDisableStyleSamples} onClick={onDisableStyleSamples}>
                        不用样章
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              )}
              {(draftBriefSummary.briefFields.chapterBenchmarkKeys || draftBriefSummary.briefFields.chapterBenchmarkUsage) && (
                <div className="novel-draft-brief-benchmark-samples">
                  <span>本章质量基准</span>
                  <strong>样例：{draftBriefSummary.briefFields.chapterBenchmarkKeys || '未指定'}</strong>
                  <strong>学习：{draftBriefSummary.briefFields.chapterBenchmarkUsage || '只学习章节结构与追读节拍'}</strong>
                  <strong>禁抄：{draftBriefSummary.briefFields.chapterBenchmarkForbidden || '不得复制桥段、角色名、设定和原句'}</strong>
                </div>
              )}
            </div>
          </div>
        )}
    </>
  )
}
