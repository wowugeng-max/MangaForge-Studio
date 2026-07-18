import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../../writingCockpitModel'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'
import type {
  AnyRecord,
  AutoCreationDirectorStatus,
  AutoCreationDirectorArea,
  AutoCreationDirectorActionKey,
  AutoCreationPipelineStatus,
  AutoCreationContractStatus,
  AutoCreationBatchGuardrailStatus,
  AutoCreationBatchGuardrailSignalStatus,
  AutoCreationBatchReviewStatus,
  AutoCreationBatchReviewItemStatus,
  AutoCreationBatchRiskStatus,
  AutoCreationBatchCompletionStatus,
  AutoCreationBatchCompletionMetricStatus,
  AutoCreationBatchHandoffStatus,
  AutoCreationChapterLaunchGateStatus,
  AutoCreationLongformCapacityStatus,
  AutoCreationDeliveryRiskGateStatus,
  AutoCreationManualTestReadinessStatus,
  AutoCreationDailyBattleStepKey,
  AutoCreationRollingScriptRoomStatus,
  AutoCreationRollingScriptLayerKey,
  AutoCreationMillionWordRunwayStatus,
  AutoCreationProductionLicenseStatus,
  AutoCreationDirectorAction,
  AutoCreationRepairPlan,
  AutoCreationPipelineStep,
  AutoCreationSerialStageKey,
  AutoCreationSerialWorkflowStage,
  AutoCreationDirectorCreationPipelineStage,
  AutoCreationDirectorCreationPipeline,
  AutoCreationSerialWorkflow,
  AutoCreationContractItem,
  AutoCreationLongformCompassAxis,
  AutoCreationLongformCompass,
  AutoCreationManualTestGate,
  AutoCreationManualTestReadiness,
  AutoCreationBatchGuardrailSignal,
  AutoCreationRecoveryEvidenceTrendSource,
  AutoCreationStrengthenedRepairAcceptanceTrend,
  AutoCreationRecoveryEvidenceTrend,
  AutoCreationBatchReleaseChapter,
  AutoCreationBatchReleaseWindow,
  AutoCreationBatchPreflight,
  AutoCreationBatchBriefRepair,
  AutoCreationBatchBriefRecovery,
  AutoCreationNextBatchBriefChapter,
  AutoCreationNextBatchBriefStartChecklistKey,
  AutoCreationNextBatchBriefStartChecklistItem,
  AutoCreationNextBatchBrief,
  AutoCreationLongformCapacitySignal,
  AutoCreationLongformFuelItem,
  AutoCreationLongformCapacity,
  AutoCreationChapterLaunchSignal,
  AutoCreationChapterLaunchGate,
  AutoCreationBatchGuardrail,
  AutoCreationBatchReviewItem,
  AutoCreationBatchRiskSignal,
  AutoCreationBatchChecklistExecutionItem,
  AutoCreationBatchChecklistExecution,
  AutoCreationBatchRiskRadar,
  AutoCreationBatchCompletionMetric,
  AutoCreationBatchCompletionDashboard,
  AutoCreationBatchHandoff,
  AutoCreationBatchReviewQueue,
  AutoCreationDeliveryRiskGateCategory,
  AutoCreationDeliveryRiskResolution,
  AutoCreationDeliveryRiskGate,
  AutoCreationStorylineDecisionGate,
  AutoCreationGovernanceClosureBrief,
  AutoCreationWritingQueueFocus,
  AutoCreationDailyBattleStep,
  AutoCreationDailyBattlePlan,
  AutoCreationProductionLicense,
  AutoCreationTodayCommandFlowItem,
  AutoCreationTodayQualityGate,
  AutoCreationGovernanceRecheckMemoryStatus,
  AutoCreationGovernanceRecheckMemory,
  AutoCreationReleaseRationale,
  AutoCreationTodayCommandDeck,
  AutoCreationSerialCockpitStatus,
  AutoCreationChapterChainStatus,
  AutoCreationSerialGuardrail,
  AutoCreationChapterChainStep,
  AutoCreationRiskQueueItem,
  AutoCreationSerialCockpit,
  AutoCreationMillionWordRunwayGate,
  AutoCreationMillionWordRunwayQuestion,
  AutoCreationMillionWordRunway,
  AutoCreationRollingScriptLayer,
  AutoCreationRollingScriptRoom,
  AutoCreationDirectorModel,
  BuildAutoCreationDirectorModelInput
} from './types'
import {
  DELIVERY_RISK_CONFIG,
  batchRiskIssueResolved,
  buildResolvedDeliveryRiskEvidence,
  buildResolvedDeliveryRiskIssueKeys,
  clearedDeliveryRiskChapterKeys,
  deliveryRiskAnnotationKey,
  latestDeliveryRiskReviews,
  payloadReviewChapterId,
  payloadReviewChapterNo,
  preDraftExecutionRiskChecks,
  preDraftExecutionRiskMessage,
  qualityAuditRiskChecks,
  qualityAuditRiskHigh,
  qualityAuditRiskMessageFromChecks,
  recordTime,
  resolvedAnnotationKeys,
  reviewPayload,
  riskPayload,
  sourceStateRiskChecks,
  sourceStateRiskMessage,
} from './helpers-main'
import {
  text,
} from './helpers-basics'

export function buildDeliveryRiskGate(args: {
  reviews: AnyRecord[]
  runRecords: AnyRecord[]
  chapters: AnyRecord[]
}): AutoCreationDeliveryRiskGate {
  const reviews = args.reviews
  const resolvedKeys = resolvedAnnotationKeys(reviews)
  const clearedChapters = clearedDeliveryRiskChapterKeys(reviews)
  const repairedIssueKeys = buildResolvedDeliveryRiskIssueKeys(args)
  const recentlyResolved = buildResolvedDeliveryRiskEvidence(args).slice(0, 4)
  const categoryMap = new Map<AutoCreationDeliveryRiskGateCategory['key'], AutoCreationDeliveryRiskGateCategory>()
  const topRisks: string[] = []

  for (const review of latestDeliveryRiskReviews(reviews)) {
    const reviewType = text(review?.review_type)
    const payload = reviewPayload(review)
    if (reviewType === 'prose_quality') {
      const chapterId = payloadReviewChapterId(review, payload)
      const chapterNo = payloadReviewChapterNo(review, payload)
      const qualityAuditChecks = qualityAuditRiskChecks(payload)
      if (qualityAuditChecks.length > 0) {
        const issueType = text(qualityAuditChecks[0]?.key || qualityAuditChecks[0]?.type || 'quality_audit_gap')
        const title = `质量诊断缺口 ${qualityAuditChecks.length}`
        if (!batchRiskIssueResolved(repairedIssueKeys, { chapterId, chapterNo, status: 'success' }, issueType)) {
          const annotationKey = deliveryRiskAnnotationKey({
            source: reviewType,
            reviewId: review?.id,
            chapterId,
            chapterNo,
            kind: issueType,
            title,
          })
          const clearedAt = Math.max(
            chapterId !== null && chapterId !== undefined ? clearedChapters.get(`id:${chapterId}`) || 0 : 0,
            chapterNo > 0 ? clearedChapters.get(`no:${chapterNo}`) || 0 : 0,
          )
          if (!resolvedKeys.has(annotationKey) && clearedAt <= recordTime(review)) {
            const current = categoryMap.get('quality_audit') || {
              key: 'quality_audit',
              label: '质量诊断',
              count: 0,
              highCount: 0,
            }
            current.count += qualityAuditChecks.length
            if (qualityAuditRiskHigh(qualityAuditChecks)) current.highCount += qualityAuditChecks.length
            categoryMap.set('quality_audit', current)
            topRisks.push(`质量诊断${chapterNo > 0 ? `第${chapterNo}章` : ''}：${qualityAuditRiskMessageFromChecks(qualityAuditChecks)}`)
          }
        }
      }
      const preDraftRisks = [
        {
          issueType: 'intent_confirmation_gap',
          title: '意图确认缺口',
          checks: preDraftExecutionRiskChecks(payload, 'intent_confirmation_checks', 'intentConfirmationChecks'),
        },
        {
          issueType: 'benchmark_recall_gap',
          title: '文风召回缺口',
          checks: preDraftExecutionRiskChecks(payload, 'benchmark_recall_checks', 'benchmarkRecallChecks'),
        },
      ]
      for (const preDraftRisk of preDraftRisks) {
        if (preDraftRisk.checks.length <= 0) continue
        const title = `${preDraftRisk.title} ${preDraftRisk.checks.length}`
        if (batchRiskIssueResolved(repairedIssueKeys, { chapterId, chapterNo, status: 'success' }, preDraftRisk.issueType)) continue
        const annotationKey = deliveryRiskAnnotationKey({
          source: reviewType,
          reviewId: review?.id,
          chapterId,
          chapterNo,
          kind: preDraftRisk.issueType,
          title,
        })
        const clearedAt = Math.max(
          chapterId !== null && chapterId !== undefined ? clearedChapters.get(`id:${chapterId}`) || 0 : 0,
          chapterNo > 0 ? clearedChapters.get(`no:${chapterNo}`) || 0 : 0,
        )
        if (resolvedKeys.has(annotationKey) || clearedAt > recordTime(review)) continue
        const current = categoryMap.get('pre_draft_execution') || {
          key: 'pre_draft_execution',
          label: '写前执行',
          count: 0,
          highCount: 0,
        }
        current.count += preDraftRisk.checks.length
        current.highCount += preDraftRisk.checks.length
        categoryMap.set('pre_draft_execution', current)
        topRisks.push(`写前执行${chapterNo > 0 ? `第${chapterNo}章` : ''}：${preDraftExecutionRiskMessage(preDraftRisk.checks)}`)
      }
      const sourceStateRisks = [
        {
          category: 'source_readiness' as const,
          label: '来源就绪',
          issueType: 'source_readiness_gap',
          title: '来源就绪缺口',
          checks: sourceStateRiskChecks(payload, 'source_readiness_checks', 'sourceReadinessChecks'),
        },
        {
          category: 'state_tracking' as const,
          label: '状态跟踪',
          issueType: 'state_tracking_gap',
          title: '状态跟踪缺口',
          checks: sourceStateRiskChecks(payload, 'state_tracking_checks', 'stateTrackingChecks'),
        },
        {
          category: 'style_boundary' as const,
          label: '风格边界',
          issueType: 'style_boundary_gap',
          title: '风格边界缺口',
          checks: sourceStateRiskChecks(payload, 'style_boundary_checks', 'styleBoundaryChecks'),
        },
        {
          category: 'information_flow' as const,
          label: '信息流',
          issueType: 'information_flow_gap',
          title: '信息流缺口',
          checks: sourceStateRiskChecks(payload, 'information_flow_checks', 'informationFlowChecks'),
        },
        {
          category: 'expectation_threshold' as const,
          label: '期待阈值',
          issueType: 'expectation_threshold_gap',
          title: '期待阈值缺口',
          checks: sourceStateRiskChecks(payload, 'expectation_threshold_checks', 'expectationThresholdChecks'),
        },
        {
          category: 'story_loop' as const,
          label: '故事闭环',
          issueType: 'story_loop_gap',
          title: '故事闭环缺口',
          checks: sourceStateRiskChecks(payload, 'story_loop_checks', 'storyLoopChecks'),
        },
        {
          category: 'emotional_arc' as const,
          label: '情绪弧',
          issueType: 'emotional_arc_gap',
          title: '情绪弧缺口',
          checks: sourceStateRiskChecks(payload, 'emotional_arc_checks', 'emotionalArcChecks'),
        },
        {
          category: 'chapter_hook' as const,
          label: '章级钩子',
          issueType: 'chapter_hook_gap',
          title: '章级钩子缺口',
          checks: sourceStateRiskChecks(payload, 'chapter_hook_checks', 'chapterHookChecks'),
        },
        {
          category: 'paragraph_hook' as const,
          label: '段落级钩子',
          issueType: 'paragraph_hook_gap',
          title: '段落级钩子缺口',
          checks: sourceStateRiskChecks(payload, 'paragraph_hook_checks', 'paragraphHookChecks'),
        },
        {
          category: 'suspense' as const,
          label: '悬念编排',
          issueType: 'suspense_gap',
          title: '悬念编排缺口',
          checks: sourceStateRiskChecks(payload, 'suspense_checks', 'suspenseChecks'),
        },
        {
          category: 'reversal' as const,
          label: '反转设计',
          issueType: 'reversal_gap',
          title: '反转设计缺口',
          checks: sourceStateRiskChecks(payload, 'reversal_checks', 'reversalChecks'),
        },
        {
          category: 'showdown' as const,
          label: '高潮对抗',
          issueType: 'showdown_gap',
          title: '高潮对抗缺口',
          checks: sourceStateRiskChecks(payload, 'showdown_checks', 'showdownChecks'),
        },
        {
          category: 'prose_craft' as const,
          label: '正文工艺',
          issueType: 'prose_craft_gap',
          title: '正文工艺缺口',
          checks: sourceStateRiskChecks(payload, 'prose_craft_checks', 'proseCraftChecks'),
        },
        {
          category: 'punctuation_tone' as const,
          label: '语气标点',
          issueType: 'punctuation_tone_gap',
          title: '语气标点缺口',
          checks: sourceStateRiskChecks(payload, 'punctuation_tone_checks', 'punctuationToneChecks'),
        },
        {
          category: 'content_rubric' as const,
          label: '内容基准',
          issueType: 'content_rubric_gap',
          title: '内容基准缺口',
          checks: sourceStateRiskChecks(payload, 'content_rubric_checks', 'contentRubricChecks'),
        },
        {
          category: 'target_reader' as const,
          label: '目标读者',
          issueType: 'target_reader_gap',
          title: '目标读者缺口',
          checks: sourceStateRiskChecks(payload, 'target_reader_checks', 'targetReaderChecks'),
        },
        {
          category: 'genre_positioning' as const,
          label: '题材定位',
          issueType: 'genre_positioning_gap',
          title: '题材定位缺口',
          checks: sourceStateRiskChecks(payload, 'genre_positioning_checks', 'genrePositioningChecks'),
        },
        {
          category: 'female_audience' as const,
          label: '女频长篇',
          issueType: 'female_audience_gap',
          title: '女频长篇缺口',
          checks: sourceStateRiskChecks(payload, 'female_audience_checks', 'femaleAudienceChecks'),
        },
        {
          category: 'upgrade_rhythm' as const,
          label: '升级节奏',
          issueType: 'upgrade_rhythm_gap',
          title: '升级节奏缺口',
          checks: sourceStateRiskChecks(payload, 'upgrade_rhythm_checks', 'upgradeRhythmChecks'),
        },
        {
          category: 'chapter_structure' as const,
          label: '章节结构',
          issueType: 'chapter_structure_gap',
          title: '章节结构缺口',
          checks: sourceStateRiskChecks(payload, 'structure_checks', 'structureChecks'),
        },
        {
          category: 'chapter_progression' as const,
          label: '章节推进',
          issueType: 'chapter_progression_gap',
          title: '章节推进缺口',
          checks: sourceStateRiskChecks(payload, 'progression_checks', 'progressionChecks'),
        },
        {
          category: 'information_load' as const,
          label: '信息负载',
          issueType: 'information_load_gap',
          title: '信息负载缺口',
          checks: sourceStateRiskChecks(payload, 'information_checks', 'informationChecks'),
        },
        {
          category: 'longform_continuity' as const,
          label: '长篇连续性',
          issueType: 'longform_continuity_gap',
          title: '长篇连续性缺口',
          checks: sourceStateRiskChecks(payload, 'longform_checks', 'longformChecks'),
        },
        {
          category: 'core_contract' as const,
          label: '核心契约',
          issueType: 'core_contract_gap',
          title: '核心契约缺口',
          checks: sourceStateRiskChecks(payload, 'core_contract_checks', 'coreContractChecks'),
        },
        {
          category: 'continuity_heat' as const,
          label: '连续性热度',
          issueType: 'continuity_heat_gap',
          title: '连续性热度缺口',
          checks: sourceStateRiskChecks(payload, 'continuity_heat_checks', 'continuityHeatChecks'),
        },
        {
          category: 'revision_receipt' as const,
          label: '修订回执',
          issueType: 'revision_receipt_gap',
          title: '修订回执缺口',
          checks: sourceStateRiskChecks(payload, 'revision_receipt_checks', 'revisionReceiptChecks'),
        },
        {
          category: 'deslop_repair' as const,
          label: '去AI味修复',
          issueType: 'deslop_repair_gap',
          title: '去AI味修复缺口',
          checks: sourceStateRiskChecks(payload, 'deslop_repair_checks', 'deslopRepairChecks'),
        },
        {
          category: 'prose_meta' as const,
          label: '正文元叙事',
          issueType: 'prose_meta_gap',
          title: '正文元叙事缺口',
          checks: sourceStateRiskChecks(payload, 'prose_meta_checks', 'proseMetaChecks'),
        },
        {
          category: 'serial_risk_repair' as const,
          label: '连续风险修复',
          issueType: 'serial_risk_repair_gap',
          title: '连续风险修复缺口',
          checks: sourceStateRiskChecks(payload, 'serial_risk_repair_checks', 'serialRiskRepairChecks'),
        },
        {
          category: 'chapter_hook_quality' as const,
          label: '章钩质量',
          issueType: 'chapter_hook_quality_gap',
          title: '章钩质量缺口',
          checks: sourceStateRiskChecks(payload, 'chapter_hook_quality_checks', 'chapterHookQualityChecks'),
        },
        {
          category: 'reader_retention' as const,
          label: '追读雷达',
          issueType: 'reader_retention_gap',
          title: '追读雷达缺口',
          checks: sourceStateRiskChecks(payload, 'reader_retention_checks', 'readerRetentionChecks'),
        },
        {
          category: 'asset_linkage' as const,
          label: '资产挂钩',
          issueType: 'asset_linkage_gap',
          title: '资产挂钩缺口',
          checks: sourceStateRiskChecks(payload, 'asset_linkage_checks', 'assetLinkageChecks'),
        },
        {
          category: 'dialogue' as const,
          label: '对白质量',
          issueType: 'dialogue_gap',
          title: '对白质量缺口',
          checks: sourceStateRiskChecks(payload, 'dialogue_checks', 'dialogueChecks'),
        },
        {
          category: 'plot_dynamics' as const,
          label: '剧情动力',
          issueType: 'plot_dynamics_gap',
          title: '剧情动力缺口',
          checks: sourceStateRiskChecks(payload, 'plot_dynamics_checks', 'plotDynamicsChecks'),
        },
        {
          category: 'character_relation' as const,
          label: '角色关系',
          issueType: 'character_relation_gap',
          title: '角色关系缺口',
          checks: sourceStateRiskChecks(payload, 'character_relation_checks', 'characterRelationChecks'),
        },
        {
          category: 'character_behavior' as const,
          label: '角色行为',
          issueType: 'character_behavior_gap',
          title: '角色行为缺口',
          checks: sourceStateRiskChecks(payload, 'character_behavior_checks', 'characterBehaviorChecks'),
        },
        {
          category: 'conflict_structure' as const,
          label: '冲突结构',
          issueType: 'conflict_structure_gap',
          title: '冲突结构缺口',
          checks: sourceStateRiskChecks(payload, 'conflict_structure_checks', 'conflictStructureChecks'),
        },
        {
          category: 'bridge_unit' as const,
          label: '桥段节奏',
          issueType: 'bridge_unit_gap',
          title: '桥段节奏缺口',
          checks: sourceStateRiskChecks(payload, 'bridge_unit_checks', 'bridgeUnitChecks'),
        },
        {
          category: 'opening' as const,
          label: '开篇设计',
          issueType: 'opening_gap',
          title: '开篇设计缺口',
          checks: sourceStateRiskChecks(payload, 'opening_checks', 'openingChecks'),
        },
      ]
      for (const sourceStateRisk of sourceStateRisks) {
        if (sourceStateRisk.checks.length <= 0) continue
        const title = `${sourceStateRisk.title} ${sourceStateRisk.checks.length}`
        if (batchRiskIssueResolved(repairedIssueKeys, { chapterId, chapterNo, status: 'success' }, sourceStateRisk.issueType)) continue
        const annotationKey = deliveryRiskAnnotationKey({
          source: reviewType,
          reviewId: review?.id,
          chapterId,
          chapterNo,
          kind: sourceStateRisk.issueType,
          title,
        })
        const clearedAt = Math.max(
          chapterId !== null && chapterId !== undefined ? clearedChapters.get(`id:${chapterId}`) || 0 : 0,
          chapterNo > 0 ? clearedChapters.get(`no:${chapterNo}`) || 0 : 0,
        )
        if (resolvedKeys.has(annotationKey) || clearedAt > recordTime(review)) continue
        const current = categoryMap.get(sourceStateRisk.category) || {
          key: sourceStateRisk.category,
          label: sourceStateRisk.label,
          count: 0,
          highCount: 0,
        }
        current.count += sourceStateRisk.checks.length
        current.highCount += sourceStateRisk.checks.length
        categoryMap.set(sourceStateRisk.category, current)
        topRisks.push(`${sourceStateRisk.label}${chapterNo > 0 ? `第${chapterNo}章` : ''}：${sourceStateRiskMessage(sourceStateRisk.checks)}`)
      }
    }
    const config = DELIVERY_RISK_CONFIG[reviewType]
    if (!config) continue
    const risk = riskPayload(review, config.payloadKey)
    const count = Math.max(0, Number(config.count(review) || 0))
    if (count <= 0 && text(risk?.status) !== 'warn') continue
    const normalizedCount = Math.max(1, count)
    const chapterId = payloadReviewChapterId(review, payload)
    const chapterNo = payloadReviewChapterNo(review, payload)
    if (batchRiskIssueResolved(repairedIssueKeys, { chapterId, chapterNo, status: 'success' }, config.issueType)) continue
    const clearedAt = Math.max(
      chapterId !== null && chapterId !== undefined ? clearedChapters.get(`id:${chapterId}`) || 0 : 0,
      chapterNo > 0 ? clearedChapters.get(`no:${chapterNo}`) || 0 : 0,
    )
    if (clearedAt > recordTime(review)) continue
    const title = config.title(risk, normalizedCount)
    const annotationKey = deliveryRiskAnnotationKey({
      source: reviewType,
      reviewId: review?.id,
      chapterId,
      chapterNo,
      kind: config.kind,
      title,
    })
    if (resolvedKeys.has(annotationKey)) continue

    const high = config.high(risk, normalizedCount)
    const current = categoryMap.get(config.category) || {
      key: config.category,
      label: config.label,
      count: 0,
      highCount: 0,
    }
    current.count += normalizedCount
    if (high) current.highCount += normalizedCount
    categoryMap.set(config.category, current)
    topRisks.push(`${config.label}${chapterNo > 0 ? `第${chapterNo}章` : ''}：${config.message(risk)}`)
  }

  const categories = [...categoryMap.values()]
  const totalOpen = categories.reduce((sum, item) => sum + item.count, 0)
  const highOpen = categories.reduce((sum, item) => sum + item.highCount, 0)
  const status: AutoCreationDeliveryRiskGateStatus = highOpen > 0 ? 'block' : totalOpen > 0 ? 'warn' : 'ok'

  return {
    status,
    label: status === 'ok' ? '交稿风险已清' : status === 'block' ? `高风险 ${highOpen}` : `未清风险 ${totalOpen}`,
    summary: status === 'ok'
      ? '批注池没有未处理的交稿风险，可以按现有护栏推进。'
      : `批注池还有 ${totalOpen} 项交稿风险未清，其中高风险 ${highOpen} 项；先修正核心、追读、回报、创新、强场面、剧情线、剧情单元或可读性问题，再扩大连写批次。`,
    totalOpen,
    highOpen,
    categories,
    topRisks: topRisks.slice(0, 4),
    recentlyResolved,
  }
}

