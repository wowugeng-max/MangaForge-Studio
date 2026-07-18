import type {
  AnyRecord,
  WritingCockpitRole,
  WritingCockpitActionKey,
  WritingReadinessStatus,
  WritingReadinessCheck,
  WritingCockpitChapter,
  WritingQueueItemStatus,
  WritingQueueItem,
  WritingQueueModel,
  ChapterPlanningReadiness,
  ChapterContextPackageStatus,
  ChapterScenePlanStatus,
  ChapterPlanningDeskSceneCard,
  ChapterQualityContinuitySceneMapItem,
  ChapterWritePreparationBrief,
  ChapterPlanningDeskModel,
  ChapterAcceptanceStatus,
  DeslopGateDiagnosticsModel,
  ChapterAcceptanceDeskModel,
  ChapterHandoffStatus,
  ChapterHandoffDeskModel,
  LongformWorkflowStageKey,
  LongformWorkflowStageStatus,
  LongformWorkflowStageModel,
  LongformWorkflowModel,
  WritingCockpitModel,
  BuildWritingCockpitModelInput,
} from './types'
import { parseWorkspacePayload } from '../../payloadParseCache'


import {
  ACTION_LABELS,
  QUALITY_PASS_THRESHOLD,
  arrayValue,
  buildApprovalBlockerSummary,
  buildBlueprintReceiptSummary,
  buildDeliveryRiskReceiptSummary,
  buildDeslopGateDiagnosticsSummary,
  buildPlatformRubricSummary,
  buildQualityAuditSummary,
  buildRevisionReceiptSummary,
  buildSceneCardReceiptSummary,
  compareReviewRefs,
  countArray,
  createdTime,
  deliveryReceiptsFrom,
  firstNonEmpty,
  hasProse,
  issueText,
  latestReviewRef,
  parsedTime,
  proseQualityReviewMatchesCurrentChapter,
  qualityPayload,
  reportPayload,
  reviewPayload,
  reviewType,
  revisionPayload,
  storylineSyncPayload,
  stringArray,
  text,
  uniqueObjects,
  uniqueStrings,
} from './cockpit-basics'

import {
  contractSyncPayload,
  qualityAuditSyncEvidence,
} from './cockpit-acceptance-sync-a'

export function buildDeliveryRiskQueue(args: {
  mustFix: string[]
  storylineSync: ChapterAcceptanceDeskModel['storylineSync']
  storyUnitSync: ChapterAcceptanceDeskModel['storyUnitSync']
  signatureSceneSync: ChapterAcceptanceDeskModel['signatureSceneSync']
  readabilityReview: ChapterAcceptanceDeskModel['readabilityReview']
  coreDrift: ChapterAcceptanceDeskModel['coreDrift']
  runwaySync: ChapterAcceptanceDeskModel['runwaySync']
  readerPayoffSync: ChapterAcceptanceDeskModel['readerPayoffSync']
  readerExpectationSync: ChapterAcceptanceDeskModel['readerExpectationSync']
  qualityAuditSync: ChapterAcceptanceDeskModel['qualityAuditSync']
  qualityAuditRepairReceiptSync: ChapterAcceptanceDeskModel['qualityAuditRepairReceiptSync']
  chapterHandoffSync: ChapterAcceptanceDeskModel['chapterHandoffSync']
  chapterHandoffDeltaSync: ChapterAcceptanceDeskModel['chapterHandoffDeltaSync']
  writePreparation: ChapterAcceptanceDeskModel['writePreparation']
  intentConfirmationSync: ChapterAcceptanceDeskModel['intentConfirmationSync']
  benchmarkRecallSync: ChapterAcceptanceDeskModel['benchmarkRecallSync']
  sourceReadiness: ChapterAcceptanceDeskModel['sourceReadiness']
  stateTracking: ChapterAcceptanceDeskModel['stateTracking']
  styleBoundary: ChapterAcceptanceDeskModel['styleBoundary']
  informationFlow: ChapterAcceptanceDeskModel['informationFlow']
  expectationThreshold: ChapterAcceptanceDeskModel['expectationThreshold']
  storyLoop: ChapterAcceptanceDeskModel['storyLoop']
  emotionalArc: ChapterAcceptanceDeskModel['emotionalArc']
  chapterHook: ChapterAcceptanceDeskModel['chapterHook']
  paragraphHook: ChapterAcceptanceDeskModel['paragraphHook']
  suspense: ChapterAcceptanceDeskModel['suspense']
  assetLinkage: ChapterAcceptanceDeskModel['assetLinkage']
  dialogue: ChapterAcceptanceDeskModel['dialogue']
  plotDynamics: ChapterAcceptanceDeskModel['plotDynamics']
  characterRelation: ChapterAcceptanceDeskModel['characterRelation']
  characterBehavior: ChapterAcceptanceDeskModel['characterBehavior']
  conflictStructure: ChapterAcceptanceDeskModel['conflictStructure']
  bridgeUnit: ChapterAcceptanceDeskModel['bridgeUnit']
  reversal: ChapterAcceptanceDeskModel['reversal']
  showdown: ChapterAcceptanceDeskModel['showdown']
  opening: ChapterAcceptanceDeskModel['opening']
  proseCraft: ChapterAcceptanceDeskModel['proseCraft']
  sceneCardDirective: ChapterAcceptanceDeskModel['proseCraft']
  punctuationTone: ChapterAcceptanceDeskModel['punctuationTone']
  contentRubric: ChapterAcceptanceDeskModel['contentRubric']
  targetReader: ChapterAcceptanceDeskModel['targetReader']
  genrePositioning: ChapterAcceptanceDeskModel['genrePositioning']
  femaleAudience: ChapterAcceptanceDeskModel['femaleAudience']
  upgradeRhythm: ChapterAcceptanceDeskModel['upgradeRhythm']
  chapterStructure: ChapterAcceptanceDeskModel['chapterStructure']
  chapterProgression: ChapterAcceptanceDeskModel['chapterProgression']
  informationLoad: ChapterAcceptanceDeskModel['informationLoad']
  longformContinuity: ChapterAcceptanceDeskModel['longformContinuity']
  coreContractCheck: ChapterAcceptanceDeskModel['coreContractCheck']
  continuityHeat: ChapterAcceptanceDeskModel['continuityHeat']
  revisionReceiptCheck: ChapterAcceptanceDeskModel['revisionReceiptCheck']
  deslopRepairCheck: ChapterAcceptanceDeskModel['deslopRepairCheck']
  proseMeta: ChapterAcceptanceDeskModel['proseMeta']
  serialRiskRepair: ChapterAcceptanceDeskModel['serialRiskRepair']
  chapterHookQuality: ChapterAcceptanceDeskModel['chapterHookQuality']
  readerRetentionCheck: ChapterAcceptanceDeskModel['readerRetentionCheck']
  readerRetentionSync: ChapterAcceptanceDeskModel['readerRetentionSync']
  chapterAttraction: ChapterAcceptanceDeskModel['chapterAttraction']
  storyDriveSync: ChapterAcceptanceDeskModel['storyDriveSync']
  characterArcSync: ChapterAcceptanceDeskModel['characterArcSync']
  chapterBenchmarkSync: ChapterAcceptanceDeskModel['chapterBenchmarkSync']
  styleSampleSync: ChapterAcceptanceDeskModel['styleSampleSync']
  innovationSync: ChapterAcceptanceDeskModel['innovationSync']
  volumeBeatSync: ChapterAcceptanceDeskModel['volumeBeatSync']
  blueprintReceipt: ChapterAcceptanceDeskModel['blueprintReceipt']
  revisionReceipt: ChapterAcceptanceDeskModel['revisionReceipt']
  deliveryRiskReceipt: ChapterAcceptanceDeskModel['deliveryRiskReceipt']
  sceneCardReceipt: ChapterAcceptanceDeskModel['sceneCardReceipt']
  qualityAudit: ChapterAcceptanceDeskModel['qualityAudit']
  platformRubric: ChapterAcceptanceDeskModel['platformRubric']
  approvalBlocker: ChapterAcceptanceDeskModel['approvalBlocker']
  governanceRecheckSync: ChapterAcceptanceDeskModel['governanceRecheckSync']
}): ChapterAcceptanceDeskModel['deliveryRiskQueue'] {
  const risks: Array<{ count: number; item: string; priorityLabel: string; priorityRank?: number }> = []
  if (args.approvalBlocker) {
    risks.push({
      count: 1,
      item: `处理入库阻断：${args.approvalBlocker.label} · ${args.approvalBlocker.detail}`,
      priorityLabel: '优先处理入库阻断',
      priorityRank: 0,
    })
  }
  if (args.governanceRecheckSync && args.governanceRecheckSync.missedCount > 0) {
    risks.push({
      count: args.governanceRecheckSync.missedCount,
      item: `验恢复依据：${args.governanceRecheckSync.label}`,
      priorityLabel: '优先验恢复依据',
    })
  }
  if (args.coreDrift && args.coreDrift.riskCount > 0) {
    risks.push({ count: args.coreDrift.riskCount, item: `守核心：${args.coreDrift.label}`, priorityLabel: '优先补核心' })
  }
  if (args.blueprintReceipt && args.blueprintReceipt.missedCount > 0) {
    risks.push({ count: args.blueprintReceipt.missedCount, item: `补蓝图：${args.blueprintReceipt.label}`, priorityLabel: '优先补蓝图' })
  }
  if (args.revisionReceipt && args.revisionReceipt.riskCount > 0) {
    risks.push({ count: args.revisionReceipt.riskCount, item: `复核修订：${args.revisionReceipt.label}`, priorityLabel: '优先复核修订' })
  }
  if (args.deliveryRiskReceipt && args.deliveryRiskReceipt.riskCount > 0) {
    risks.push({ count: args.deliveryRiskReceipt.riskCount, item: `复核承接：${args.deliveryRiskReceipt.label}`, priorityLabel: '优先复核承接' })
  }
  if (args.sceneCardReceipt && args.sceneCardReceipt.riskCount > 0) {
    risks.push({ count: args.sceneCardReceipt.riskCount, item: `复核场景回执：${args.sceneCardReceipt.label}`, priorityLabel: '优先复核场景' })
  }
  if (args.sceneCardDirective && args.sceneCardDirective.missedCount > 0) {
    risks.push({
      count: args.sceneCardDirective.missedCount,
      item: `修场景卡：${args.sceneCardDirective.label}`,
      priorityLabel: '优先修场景卡',
      priorityRank: 1,
    })
  }
  if (args.qualityAudit && args.qualityAudit.riskCount > 0) {
    risks.push({ count: args.qualityAudit.riskCount, item: `修质量诊断：${args.qualityAudit.label}`, priorityLabel: '优先修质量诊断' })
  }
  if (args.qualityAuditSync && args.qualityAuditSync.missedCount > 0) {
    risks.push({ count: args.qualityAuditSync.missedCount, item: `补诊断承接：${args.qualityAuditSync.label}`, priorityLabel: '优先补质量诊断' })
  }
  if (args.qualityAuditRepairReceiptSync && args.qualityAuditRepairReceiptSync.missedCount > 0) {
    risks.push({
      count: args.qualityAuditRepairReceiptSync.missedCount,
      item: `复核质量修复回执：${args.qualityAuditRepairReceiptSync.label}`,
      priorityLabel: '优先补质量回执',
    })
  }
  if (args.chapterHandoffSync && args.chapterHandoffSync.missedCount > 0) {
    risks.push({
      count: args.chapterHandoffSync.missedCount,
      item: `补章首承接：${args.chapterHandoffSync.label}`,
      priorityLabel: '优先补章首承接',
    })
  }
  if (args.chapterHandoffDeltaSync && args.chapterHandoffDeltaSync.missedCount > 0) {
    risks.push({
      count: args.chapterHandoffDeltaSync.missedCount,
      item: `补章末交接：${args.chapterHandoffDeltaSync.label}`,
      priorityLabel: '优先补章末交接',
    })
  }
  if (args.writePreparation && args.writePreparation.missedCount > 0) {
    risks.push({
      count: args.writePreparation.missedCount,
      item: `补写前准备：${args.writePreparation.label}`,
      priorityLabel: '优先补写前准备',
    })
  }
  if (args.intentConfirmationSync && args.intentConfirmationSync.missedCount > 0) {
    risks.push({
      count: args.intentConfirmationSync.missedCount,
      item: `补意图确认：${args.intentConfirmationSync.label}`,
      priorityLabel: '优先补意图确认',
    })
  }
  if (args.benchmarkRecallSync && args.benchmarkRecallSync.missedCount > 0) {
    risks.push({
      count: args.benchmarkRecallSync.missedCount,
      item: `补文风召回：${args.benchmarkRecallSync.label}`,
      priorityLabel: '优先补文风召回',
    })
  }
  if (args.sourceReadiness && args.sourceReadiness.missedCount > 0) {
    risks.push({
      count: args.sourceReadiness.missedCount,
      item: `补来源就绪：${args.sourceReadiness.label}`,
      priorityLabel: '优先补来源',
    })
  }
  if (args.stateTracking && args.stateTracking.missedCount > 0) {
    risks.push({
      count: args.stateTracking.missedCount,
      item: `补状态跟踪：${args.stateTracking.label}`,
      priorityLabel: '优先补状态',
    })
  }
  if (args.styleBoundary && args.styleBoundary.missedCount > 0) {
    risks.push({
      count: args.styleBoundary.missedCount,
      item: `校风格边界：${args.styleBoundary.label}`,
      priorityLabel: '优先校风格边界',
    })
  }
  if (args.informationFlow && args.informationFlow.missedCount > 0) {
    risks.push({
      count: args.informationFlow.missedCount,
      item: `调信息流：${args.informationFlow.label}`,
      priorityLabel: '优先调信息流',
    })
  }
  if (args.expectationThreshold && args.expectationThreshold.missedCount > 0) {
    risks.push({
      count: args.expectationThreshold.missedCount,
      item: `补期待阈值：${args.expectationThreshold.label}`,
      priorityLabel: '优先补期待阈值',
    })
  }
  if (args.storyLoop && args.storyLoop.missedCount > 0) {
    risks.push({
      count: args.storyLoop.missedCount,
      item: `补故事闭环：${args.storyLoop.label}`,
      priorityLabel: '优先补闭环',
    })
  }
  if (args.emotionalArc && args.emotionalArc.missedCount > 0) {
    risks.push({
      count: args.emotionalArc.missedCount,
      item: `补情绪弧：${args.emotionalArc.label}`,
      priorityLabel: '优先补情绪弧',
    })
  }
  if (args.chapterHook && args.chapterHook.missedCount > 0) {
    risks.push({
      count: args.chapterHook.missedCount,
      item: `补章级钩子：${args.chapterHook.label}`,
      priorityLabel: '优先补章钩',
    })
  }
  if (args.paragraphHook && args.paragraphHook.missedCount > 0) {
    risks.push({
      count: args.paragraphHook.missedCount,
      item: `补段落钩子：${args.paragraphHook.label}`,
      priorityLabel: '优先补段钩',
    })
  }
  if (args.suspense && args.suspense.missedCount > 0) {
    risks.push({
      count: args.suspense.missedCount,
      item: `补悬念编排：${args.suspense.label}`,
      priorityLabel: '优先补悬念',
    })
  }
  if (args.assetLinkage && args.assetLinkage.missedCount > 0) {
    risks.push({
      count: args.assetLinkage.missedCount,
      item: `挂资产：${args.assetLinkage.label}`,
      priorityLabel: '优先补资产挂钩',
    })
  }
  if (args.dialogue && args.dialogue.missedCount > 0) {
    risks.push({
      count: args.dialogue.missedCount,
      item: `修对白：${args.dialogue.label}`,
      priorityLabel: '优先修对白',
    })
  }
  if (args.plotDynamics && args.plotDynamics.missedCount > 0) {
    risks.push({
      count: args.plotDynamics.missedCount,
      item: `补动力：${args.plotDynamics.label}`,
      priorityLabel: '优先补剧情动力',
    })
  }
  if (args.characterRelation && args.characterRelation.missedCount > 0) {
    risks.push({
      count: args.characterRelation.missedCount,
      item: `修关系：${args.characterRelation.label}`,
      priorityLabel: '优先修角色关系',
    })
  }
  if (args.characterBehavior && args.characterBehavior.missedCount > 0) {
    risks.push({
      count: args.characterBehavior.missedCount,
      item: `修行为：${args.characterBehavior.label}`,
      priorityLabel: '优先修角色行为',
    })
  }
  if (args.conflictStructure && args.conflictStructure.missedCount > 0) {
    risks.push({
      count: args.conflictStructure.missedCount,
      item: `加冲突：${args.conflictStructure.label}`,
      priorityLabel: '优先修冲突结构',
    })
  }
  if (args.bridgeUnit && args.bridgeUnit.missedCount > 0) {
    risks.push({
      count: args.bridgeUnit.missedCount,
      item: `补桥段：${args.bridgeUnit.label}`,
      priorityLabel: '优先补桥段节奏',
    })
  }
  if (args.reversal && args.reversal.missedCount > 0) {
    risks.push({
      count: args.reversal.missedCount,
      item: `补反转：${args.reversal.label}`,
      priorityLabel: '优先补反转设计',
    })
  }
  if (args.showdown && args.showdown.missedCount > 0) {
    risks.push({
      count: args.showdown.missedCount,
      item: `补高潮：${args.showdown.label}`,
      priorityLabel: '优先补高潮对抗',
    })
  }
  if (args.opening && args.opening.missedCount > 0) {
    risks.push({
      count: args.opening.missedCount,
      item: `改开篇：${args.opening.label}`,
      priorityLabel: '优先修开篇',
    })
  }
  if (args.proseCraft && args.proseCraft.missedCount > 0) {
    risks.push({
      count: args.proseCraft.missedCount,
      item: `修工艺：${args.proseCraft.label}`,
      priorityLabel: '优先修正文工艺',
    })
  }
  if (args.punctuationTone && args.punctuationTone.missedCount > 0) {
    risks.push({
      count: args.punctuationTone.missedCount,
      item: `调语气：${args.punctuationTone.label}`,
      priorityLabel: '优先修语气标点',
    })
  }
  if (args.contentRubric && args.contentRubric.missedCount > 0) {
    risks.push({
      count: args.contentRubric.missedCount,
      item: `补内容：${args.contentRubric.label}`,
      priorityLabel: '优先修内容基准',
    })
  }
  if (args.targetReader && args.targetReader.missedCount > 0) {
    risks.push({
      count: args.targetReader.missedCount,
      item: `创作契约：目标读者缺口 ${args.targetReader.missedCount}`,
      priorityLabel: '优先修创作契约',
      priorityRank: 1,
    })
  }
  if (args.genrePositioning && args.genrePositioning.missedCount > 0) {
    risks.push({
      count: args.genrePositioning.missedCount,
      item: `创作契约：题材定位缺口 ${args.genrePositioning.missedCount}`,
      priorityLabel: '优先修创作契约',
      priorityRank: 1,
    })
  }
  if (args.femaleAudience && args.femaleAudience.missedCount > 0) {
    risks.push({
      count: args.femaleAudience.missedCount,
      item: `补女频：${args.femaleAudience.label}`,
      priorityLabel: '优先补女频长篇',
    })
  }
  if (args.upgradeRhythm && args.upgradeRhythm.missedCount > 0) {
    risks.push({
      count: args.upgradeRhythm.missedCount,
      item: `补升级：${args.upgradeRhythm.label}`,
      priorityLabel: '优先补升级节奏',
    })
  }
  if (args.chapterStructure && args.chapterStructure.missedCount > 0) {
    risks.push({
      count: args.chapterStructure.missedCount,
      item: `补结构：${args.chapterStructure.label}`,
      priorityLabel: '优先补章节结构',
    })
  }
  if (args.chapterProgression && args.chapterProgression.missedCount > 0) {
    risks.push({
      count: args.chapterProgression.missedCount,
      item: `补推进：${args.chapterProgression.label}`,
      priorityLabel: '优先补章节推进',
    })
  }
  if (args.informationLoad && args.informationLoad.missedCount > 0) {
    risks.push({
      count: args.informationLoad.missedCount,
      item: `压信息：${args.informationLoad.label}`,
      priorityLabel: '优先压信息负载',
    })
  }
  if (args.longformContinuity && args.longformContinuity.missedCount > 0) {
    risks.push({
      count: args.longformContinuity.missedCount,
      item: `保长篇：${args.longformContinuity.label}`,
      priorityLabel: '优先保长篇连续性',
    })
  }
  if (args.coreContractCheck && args.coreContractCheck.missedCount > 0) {
    risks.push({
      count: args.coreContractCheck.missedCount,
      item: `创作契约：核心承诺缺口 ${args.coreContractCheck.missedCount}`,
      priorityLabel: '优先修创作契约',
      priorityRank: 1,
    })
  }
  if (args.continuityHeat && args.continuityHeat.missedCount > 0) {
    risks.push({
      count: args.continuityHeat.missedCount,
      item: `补热度：${args.continuityHeat.label}`,
      priorityLabel: '优先补连续性热度',
    })
  }
  if (args.revisionReceiptCheck && args.revisionReceiptCheck.missedCount > 0) {
    risks.push({
      count: args.revisionReceiptCheck.missedCount,
      item: `补回执：${args.revisionReceiptCheck.label}`,
      priorityLabel: '优先补修订回执',
    })
  }
  if (args.deslopRepairCheck && args.deslopRepairCheck.missedCount > 0) {
    risks.push({
      count: args.deslopRepairCheck.missedCount,
      item: `补去味：${args.deslopRepairCheck.label}`,
      priorityLabel: '优先补去AI味修复',
    })
  }
  if (args.proseMeta && args.proseMeta.missedCount > 0) {
    risks.push({
      count: args.proseMeta.missedCount,
      item: `删元叙：${args.proseMeta.label}`,
      priorityLabel: '优先删正文元叙事',
    })
  }
  if (args.serialRiskRepair && args.serialRiskRepair.missedCount > 0) {
    risks.push({
      count: args.serialRiskRepair.missedCount,
      item: `补连修：${args.serialRiskRepair.label}`,
      priorityLabel: '优先补连续风险修复',
    })
  }
  if (args.chapterHookQuality && args.chapterHookQuality.missedCount > 0) {
    risks.push({
      count: args.chapterHookQuality.missedCount,
      item: `强章钩：${args.chapterHookQuality.label}`,
      priorityLabel: '优先强章钩质量',
    })
  }
  if (args.readerRetentionCheck && args.readerRetentionCheck.missedCount > 0) {
    risks.push({
      count: args.readerRetentionCheck.missedCount,
      item: `创作契约：追读留存缺口 ${args.readerRetentionCheck.missedCount}`,
      priorityLabel: '优先修创作契约',
      priorityRank: 1,
    })
  }
  if (args.platformRubric && args.platformRubric.missedCount > 0) {
    risks.push({ count: args.platformRubric.missedCount, item: `平台适配：平台缺口 ${args.platformRubric.missedCount}`, priorityLabel: '优先修平台适配' })
  }
  if (args.runwaySync && args.runwaySync.riskCount > 0) {
    risks.push({ count: args.runwaySync.riskCount, item: `补航线：${args.runwaySync.label}`, priorityLabel: '优先补航线' })
  }
  if (args.storyUnitSync && args.storyUnitSync.riskCount > 0) {
    risks.push({ count: args.storyUnitSync.riskCount, item: `校剧情单元：${args.storyUnitSync.label}`, priorityLabel: '优先校单元' })
  }
  if (args.signatureSceneSync && args.signatureSceneSync.missedCount > 0) {
    risks.push({ count: args.signatureSceneSync.missedCount, item: `补强场面：${args.signatureSceneSync.label}`, priorityLabel: '优先补强场面' })
  }
  if (args.mustFix.length > 0) {
    risks.push({ count: args.mustFix.length, item: `修质量：${args.mustFix.slice(0, 2).join('；')}`, priorityLabel: '优先修质量' })
  }
  if (args.readerExpectationSync && args.readerExpectationSync.missedCount > 0) {
    risks.push(args.readerExpectationSync.openingHandoffMissedCount > 0
      ? { count: args.readerExpectationSync.missedCount, item: `修开篇承接：${args.readerExpectationSync.label}`, priorityLabel: '优先修开篇' }
      : { count: args.readerExpectationSync.missedCount, item: `补期待：${args.readerExpectationSync.label}`, priorityLabel: '优先补期待' })
  } else if (args.readerRetentionSync && args.readerRetentionSync.missedCount > 0) {
    risks.push({ count: args.readerRetentionSync.missedCount, item: `补追读：${args.readerRetentionSync.label}`, priorityLabel: '优先补追读' })
  }
  if (args.chapterAttraction && args.chapterAttraction.weakCount > 0) {
    risks.push({ count: args.chapterAttraction.weakCount, item: `修吸引力：${args.chapterAttraction.label}`, priorityLabel: args.chapterAttraction.priorityLabel || '优先修吸引力' })
  }
  if (args.storyDriveSync && args.storyDriveSync.missedCount > 0) {
    risks.push({
      count: args.storyDriveSync.missedCount,
      item: `补故事力：${args.storyDriveSync.label}`,
      priorityLabel: args.storyDriveSync.priorityLabel || '优先补故事力',
    })
  }
  if (args.characterArcSync && args.characterArcSync.missedCount > 0) {
    risks.push({
      count: args.characterArcSync.missedCount,
      item: `补人物弧光：${args.characterArcSync.label}`,
      priorityLabel: args.characterArcSync.priorityLabel || '优先补人物弧光',
    })
  }
  if (args.chapterBenchmarkSync && args.chapterBenchmarkSync.missedCount > 0) {
    risks.push({ count: args.chapterBenchmarkSync.missedCount, item: `补基准：${args.chapterBenchmarkSync.label}`, priorityLabel: '优先补基准' })
  }
  if (args.styleSampleSync && (args.styleSampleSync.missedCount > 0 || args.styleSampleSync.copyRiskCount > 0)) {
    risks.push({
      count: args.styleSampleSync.missedCount + args.styleSampleSync.copyRiskCount,
      item: `校风格：${args.styleSampleSync.label}`,
      priorityLabel: '优先校风格',
    })
  }
  if (args.innovationSync && args.innovationSync.missedCount > 0) {
    risks.push({ count: args.innovationSync.missedCount, item: `补创新：${args.innovationSync.label}`, priorityLabel: '优先补创新' })
  }
  if (args.volumeBeatSync && args.volumeBeatSync.missedCount > 0) {
    risks.push({ count: args.volumeBeatSync.missedCount, item: `补爆点：${args.volumeBeatSync.label}`, priorityLabel: '优先补爆点' })
  }
  if (!args.readerExpectationSync && args.readerPayoffSync && args.readerPayoffSync.debtCount > 0) {
    risks.push({ count: args.readerPayoffSync.debtCount, item: `补回报：${args.readerPayoffSync.label}`, priorityLabel: '优先补回报' })
  }
  if (args.storylineSync) {
    const storylineRiskCount = args.storylineSync.missedCount + args.storylineSync.unplannedCount + args.storylineSync.forbiddenCount
    if (storylineRiskCount > 0) {
      risks.push({ count: storylineRiskCount, item: `校剧情线：${args.storylineSync.label}`, priorityLabel: '优先校剧情线' })
    }
  }
  if (args.readabilityReview && args.readabilityReview.riskCount > 0) {
    risks.push(args.readabilityReview.openingHookRisk
      ? { count: args.readabilityReview.riskCount, item: `修开篇吸引力：${args.readabilityReview.riskLabel}`, priorityLabel: '优先修开篇' }
      : args.readabilityReview.endingHookRisk
        ? { count: args.readabilityReview.riskCount, item: `修章末翻页：${args.readabilityReview.riskLabel}`, priorityLabel: '优先修章末' }
        : args.readabilityReview.sceneReadabilityRisk
          ? { count: args.readabilityReview.riskCount, item: `修场景推进：${args.readabilityReview.riskLabel}`, priorityLabel: '优先修场景' }
          : args.readabilityReview.payoffDensityRisk
            ? { count: args.readabilityReview.riskCount, item: `补爽点密度：${args.readabilityReview.riskLabel}`, priorityLabel: '优先补爽点' }
            : args.readabilityReview.aiSmellRisk
              ? { count: args.readabilityReview.riskCount, item: `去AI味：${args.readabilityReview.riskLabel}`, priorityLabel: '优先去AI味' }
      : { count: args.readabilityReview.riskCount, item: `调可读性：${args.readabilityReview.riskLabel}`, priorityLabel: '优先调可读性' })
  }

  const totalCount = risks.reduce((sum, risk) => sum + risk.count, 0)
  if (totalCount <= 0) return null
  const orderedRisks = risks
    .map((risk, index) => ({ ...risk, index }))
    .sort((left, right) => (left.priorityRank ?? 2) - (right.priorityRank ?? 2) || left.index - right.index)

  return {
    totalCount,
    label: `待修复 ${totalCount}`,
    priorityLabel: orderedRisks[0]?.priorityLabel || '优先复盘本章',
    items: orderedRisks.map(risk => risk.item),
  }
}

