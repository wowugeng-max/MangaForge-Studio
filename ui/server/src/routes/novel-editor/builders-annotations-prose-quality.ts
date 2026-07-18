import { createHash } from 'crypto'
import {
  appendNovelRun,
  createNovelReview,
  listChapterVersions,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  updateNovelChapter,
} from '../../novel'
import { executeNovelAgent, previewNovelKnowledgeInjection } from '../../llm'
import { asArray, buildLLMResultDiagnostics, clampScore, extractLLMText, getNovelPayload, getSafetyPolicy, normalizeIssue, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'
import { mergeProseQualityWithDeliveryRisks } from '../../novel-writing/prose-quality-delivery-link'
import { collectPlanAlignmentPatchesAfterProseChange, collectProjectPlanAlignmentPatches } from '../../novel-writing/chapter-plan-from-prose'
import { buildLiveContractChapterPatch, collectClosedBeatFamiliesFromChapters } from '../../novel-writing/closed-beat-canon'

import {
  annotationKey,
  buildApprovalBlockerBrief,
  compactAuditText,
  countItems,
  countPayloadNumber,
  deliveryRiskMissedCount,
  deliveryRiskMissedMessage,
  deslopRepairReceiptCount,
  deslopRepairReceiptMessage,
  endingHookScore,
  hasWeakEndingHook,
  hasWeakOpeningHook,
  hasWeakPayoffDensity,
  hasWeakSceneProgression,
  latestAnnotationStatus,
  openingHandoffMisses,
  openingHookScore,
  payoffDensityScore,
  preDraftExecutionChecks,
  preDraftExecutionMessage,
  preDraftExecutionMissedRows,
  pushAnnotation,
  qualityAuditFailureChecks,
  qualityAuditMessage,
  qualityAuditRepairReceiptCount,
  qualityAuditRepairReceiptMessage,
  qualityAuditSeverity,
  qualityContractChecks,
  qualityContractMessage,
  qualityContractMissedRows,
  sceneCardDirectiveCheckKey,
  sceneCardReceiptAuditChecks,
  sceneCardReceiptAuditMessage,
  sceneReadabilityScore,
  sourceReadinessChecks,
  sourceReadinessMessage,
  sourceReadinessMissedRows,
  stateTrackingChecks,
  stateTrackingMessage,
  stateTrackingMissedRows,
  storyUnitSyncRiskCount,
} from './builders'

export function appendProseQualityReviewAnnotations(args: {
  review: any
  payload: any
  items: any[]
  statuses: any
  resolveChapter: (payload: any) => any
  pushReviewIssues: (review: any, payload: any, issueList: any[], defaults?: any) => void
  pushDeliveryRiskAnnotation: (review: any, payload: any, config: any) => void
}) {
  const { review, payload, items, statuses, resolveChapter, pushReviewIssues, pushDeliveryRiskAnnotation } = args
  if (review.review_type === 'prose_quality') {
    const reviewPayload = payload.self_check?.review || payload.review || {}
    const approvalBlocker = buildApprovalBlockerBrief(payload)
    if (approvalBlocker) {
      const chapter = resolveChapter(payload)
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '入库阻断',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'approval_blocker',
        severity: 'high',
        category: 'approval_blocker',
        title: approvalBlocker.label,
        message: [
          approvalBlocker.detail,
          approvalBlocker.reasons?.length ? `原因：${approvalBlocker.reasons.join('；')}` : '',
        ].filter(Boolean).join('；') || approvalBlocker.label,
        action: '先解除入库阻断：按阻断原因修订正文，重新复检并确认章节可以进入验收或入库。',
        created_at: review.created_at,
        payload: approvalBlocker,
      })
    }
    const sceneCardReceiptChecks = sceneCardReceiptAuditChecks(payload)
    if (sceneCardReceiptChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = sceneCardReceiptChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '场景回执',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: String(firstCheck?.key || firstCheck?.type || 'scene_card_receipt'),
        severity: 'high',
        category: 'scene_card_receipt',
        title: `场景回执缺口 ${sceneCardReceiptChecks.length}`,
        message: sceneCardReceiptAuditMessage(sceneCardReceiptChecks),
        action: '按场景卡回执缺口回修正文；修订后必须重写对应场景的 scene_start_anchor、scene_end_anchor 和 scene_card_receipts，scene_card_receipts.evidence 必须引用修订后对应场景正文证据，不得借用其他场景。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          checks: sceneCardReceiptChecks,
          review_type: review.review_type,
        },
      })
    }
    const qualityAuditChecks = qualityAuditFailureChecks(payload)
    if (qualityAuditChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = qualityAuditChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '质量诊断',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: String(firstCheck?.key || firstCheck?.type || 'quality_audit_gap'),
        severity: qualityAuditSeverity(qualityAuditChecks),
        category: 'quality_audit',
        title: `质量诊断缺口 ${qualityAuditChecks.length}`,
        message: qualityAuditMessage(qualityAuditChecks),
        action: '按 quality_audit_checks 回修正文：先补本章一句话概括和目的词，再重排详略、删除水文段落、强化信息跟冲突走、隐性展示卖点，并按五维评分最低项选择 rewrite/compress/de_ai/polish 策略。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          checks: qualityAuditChecks,
          review_type: review.review_type,
        },
      })
    }
    const sourceReadinessFailureChecks = sourceReadinessChecks(payload)
    if (sourceReadinessFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = sourceReadinessFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '来源就绪',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'source_readiness_gap',
        severity: 'high',
        category: 'source_readiness',
        title: `来源就绪缺口 ${sourceReadinessFailureChecks.length}`,
        message: sourceReadinessMessage(sourceReadinessFailureChecks),
        action: '按 source_readiness_checks 回修正文：先核对角色状态、相关伏笔/前史、世界约束和资产状态；missing/warn 来源不能被当作既定事实，ready 来源必须在正文中可见承接。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `来源就绪缺口 ${sourceReadinessFailureChecks.length}`,
          missed_count: sourceReadinessFailureChecks.length,
          missed: sourceReadinessMissedRows(sourceReadinessFailureChecks),
          checks: sourceReadinessFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const stateTrackingFailureChecks = stateTrackingChecks(payload)
    if (stateTrackingFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = stateTrackingFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '状态跟踪',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'state_tracking_gap',
        severity: 'high',
        category: 'state_tracking',
        title: `状态跟踪缺口 ${stateTrackingFailureChecks.length}`,
        message: stateTrackingMessage(stateTrackingFailureChecks),
        action: '按 state_tracking_checks 回修正文：核对角色状态、伏笔状态、资产归属、关系边界和世界规则；不得让昏迷、失效、未获得或未揭示的状态直接参与当前章结果。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `状态跟踪缺口 ${stateTrackingFailureChecks.length}`,
          missed_count: stateTrackingFailureChecks.length,
          missed: stateTrackingMissedRows(stateTrackingFailureChecks),
          checks: stateTrackingFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const styleBoundaryFailureChecks = qualityContractChecks(payload, 'style_boundary_checks', 'styleBoundaryChecks')
    if (styleBoundaryFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = styleBoundaryFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '风格边界',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'style_boundary_gap',
        severity: 'high',
        category: 'style_boundary',
        title: `风格边界缺口 ${styleBoundaryFailureChecks.length}`,
        message: qualityContractMessage(styleBoundaryFailureChecks, '风格边界检查存在未清 fail/warn 项。'),
        action: '按 style_boundary_checks 回修正文：保留本书承诺的语气、节奏和角色口吻，但必须重写过近的参照句式、桥段节奏、套话和模板化表达；不得复制标杆原句、专有设定或核心梗。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `风格边界缺口 ${styleBoundaryFailureChecks.length}`,
          missed_count: styleBoundaryFailureChecks.length,
          missed: qualityContractMissedRows(styleBoundaryFailureChecks),
          checks: styleBoundaryFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const informationFlowFailureChecks = qualityContractChecks(payload, 'information_flow_checks', 'informationFlowChecks')
    if (informationFlowFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = informationFlowFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '信息流',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'information_flow_gap',
        severity: 'high',
        category: 'information_flow',
        title: `信息流缺口 ${informationFlowFailureChecks.length}`,
        message: qualityContractMessage(informationFlowFailureChecks, '信息流检查存在未清 fail/warn 项。'),
        action: '按 information_flow_checks 回修正文：重排线索、解释、误判、反转和信息揭示顺序；让信息跟冲突、动作、选择和代价同步释放，避免提前泄底、补丁式旁白和上下文过载。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `信息流缺口 ${informationFlowFailureChecks.length}`,
          missed_count: informationFlowFailureChecks.length,
          missed: qualityContractMissedRows(informationFlowFailureChecks),
          checks: informationFlowFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const expectationThresholdFailureChecks = qualityContractChecks(payload, 'expectation_threshold_checks', 'expectationThresholdChecks')
    if (expectationThresholdFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = expectationThresholdFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '期待阈值',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'expectation_threshold_gap',
        severity: 'high',
        category: 'expectation_threshold',
        title: `期待阈值缺口 ${expectationThresholdFailureChecks.length}`,
        message: qualityContractMessage(expectationThresholdFailureChecks, '期待阈值检查存在未清 fail/warn 项。'),
        action: '按 expectation_threshold_checks 回修正文：强化读者必须继续阅读的问题、悬念、代价、选择压力或回报承诺；章末必须留下明确的下一章追问，不能只做氛围收束。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `期待阈值缺口 ${expectationThresholdFailureChecks.length}`,
          missed_count: expectationThresholdFailureChecks.length,
          missed: qualityContractMissedRows(expectationThresholdFailureChecks),
          checks: expectationThresholdFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const storyLoopFailureChecks = qualityContractChecks(payload, 'story_loop_checks', 'storyLoopChecks')
    if (storyLoopFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = storyLoopFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '故事闭环',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'story_loop_gap',
        severity: 'high',
        category: 'story_loop',
        title: `故事闭环缺口 ${storyLoopFailureChecks.length}`,
        message: qualityContractMessage(storyLoopFailureChecks, '故事闭环检查存在未清 fail/warn 项。'),
        action: '按 story_loop_checks 回修正文：让本章设问、阻碍、选择、代价、回报和新问题形成闭环；至少推进一个答案碎片或状态变化，并把残留问题自然挂到下一章。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `故事闭环缺口 ${storyLoopFailureChecks.length}`,
          missed_count: storyLoopFailureChecks.length,
          missed: qualityContractMissedRows(storyLoopFailureChecks),
          checks: storyLoopFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const emotionalArcFailureChecks = qualityContractChecks(payload, 'emotional_arc_checks', 'emotionalArcChecks')
    if (emotionalArcFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = emotionalArcFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '情绪弧',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'emotional_arc_gap',
        severity: 'high',
        category: 'emotional_arc',
        title: `情绪弧缺口 ${emotionalArcFailureChecks.length}`,
        message: qualityContractMessage(emotionalArcFailureChecks, '情绪弧检查存在未清 fail/warn 项。'),
        action: '按 emotional_arc_checks 回修正文：把平静、调动、释放、爽感写成可追踪递进；压迫必须落到现场选择，反制必须通过动作、对白、旁观反馈或状态变化外化。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `情绪弧缺口 ${emotionalArcFailureChecks.length}`,
          missed_count: emotionalArcFailureChecks.length,
          missed: qualityContractMissedRows(emotionalArcFailureChecks),
          checks: emotionalArcFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const chapterHookFailureChecks = qualityContractChecks(payload, 'chapter_hook_checks', 'chapterHookChecks')
    if (chapterHookFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = chapterHookFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '章级钩子',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'chapter_hook_gap',
        severity: 'high',
        category: 'chapter_hook',
        title: `章级钩子缺口 ${chapterHookFailureChecks.length}`,
        message: qualityContractMessage(chapterHookFailureChecks, '章级钩子检查存在未清 fail/warn 项。'),
        action: '按 chapter_hook_checks 回修正文：重做前100字章首钩子和最后约100字章尾翻页钩子；钩子必须形成具体问题、压力、兑现路径或下一章行动，不得是假悬念、低风险钩或机械降神。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `章级钩子缺口 ${chapterHookFailureChecks.length}`,
          missed_count: chapterHookFailureChecks.length,
          missed: qualityContractMissedRows(chapterHookFailureChecks),
          checks: chapterHookFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const paragraphHookFailureChecks = qualityContractChecks(payload, 'paragraph_hook_checks', 'paragraphHookChecks')
    if (paragraphHookFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = paragraphHookFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '段落级钩子',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'paragraph_hook_gap',
        severity: 'high',
        category: 'paragraph_hook',
        title: `段落级钩子缺口 ${paragraphHookFailureChecks.length}`,
        message: qualityContractMessage(paragraphHookFailureChecks, '段落级钩子检查存在未清 fail/warn 项。'),
        action: '按 paragraph_hook_checks 回修正文：每3-5段必须出现信息、风险、情绪或关系变化；补段落级钩子11种、钩子组合、对话情绪递进和围观者层级，修掉假悬念、低风险钩和同类型连用。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `段落级钩子缺口 ${paragraphHookFailureChecks.length}`,
          missed_count: paragraphHookFailureChecks.length,
          missed: qualityContractMissedRows(paragraphHookFailureChecks),
          checks: paragraphHookFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const suspenseFailureChecks = qualityContractChecks(payload, 'suspense_checks', 'suspenseChecks')
    if (suspenseFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = suspenseFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '悬念编排',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'suspense_gap',
        severity: 'high',
        category: 'suspense',
        title: `悬念编排缺口 ${suspenseFailureChecks.length}`,
        message: qualityContractMessage(suspenseFailureChecks, '悬念编排检查存在未清 fail/warn 项。'),
        action: '按 suspense_checks 回修正文：补疑问、误导、答案和新期待的悬念循环；先提出具体问题，再给可信提示或误导，公布局部答案后立起新期待，避免假悬念、谜语人拖延和信息延迟过久。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `悬念编排缺口 ${suspenseFailureChecks.length}`,
          missed_count: suspenseFailureChecks.length,
          missed: qualityContractMissedRows(suspenseFailureChecks),
          checks: suspenseFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const assetLinkageFailureChecks = qualityContractChecks(payload, 'asset_linkage_checks', 'assetLinkageChecks')
    if (assetLinkageFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = assetLinkageFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '资产挂钩',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'asset_linkage_gap',
        severity: 'high',
        category: 'asset_linkage',
        title: `资产挂钩缺口 ${assetLinkageFailureChecks.length}`,
        message: qualityContractMessage(assetLinkageFailureChecks, '资产挂钩检查存在未清 fail/warn 项。'),
        action: '按 asset_linkage_checks 回修正文：消灭孤立资产，让关键资产绑定功能、归属、触发条件、限制、后果和状态变化；每个资产至少接到本章目标、冲突、回报或章尾钩子之一，设定信息必须随使用、质疑、触发、误判或代价反馈释放。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `资产挂钩缺口 ${assetLinkageFailureChecks.length}`,
          missed_count: assetLinkageFailureChecks.length,
          missed: qualityContractMissedRows(assetLinkageFailureChecks),
          checks: assetLinkageFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const dialogueFailureChecks = qualityContractChecks(payload, 'dialogue_checks', 'dialogueChecks')
    if (dialogueFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = dialogueFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '对白质量',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'dialogue_gap',
        severity: 'high',
        category: 'dialogue',
        title: `对白质量缺口 ${dialogueFailureChecks.length}`,
        message: qualityContractMessage(dialogueFailureChecks, '对白质量检查存在未清 fail/warn 项。'),
        action: '按 dialogue_checks 回修正文：让每句对白承担推进剧情、增加期待或展示人设之一；补潜台词、议程、声线差异、权力博弈、信息嵌入和情绪递进，把说明书式对白改成借口、试探、回避、动作反应或信息差拉扯。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `对白质量缺口 ${dialogueFailureChecks.length}`,
          missed_count: dialogueFailureChecks.length,
          missed: qualityContractMissedRows(dialogueFailureChecks),
          checks: dialogueFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const plotDynamicsFailureChecks = qualityContractChecks(payload, 'plot_dynamics_checks', 'plotDynamicsChecks')
    if (plotDynamicsFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = plotDynamicsFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '剧情动力',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'plot_dynamics_gap',
        severity: 'high',
        category: 'plot_dynamics',
        title: `剧情动力缺口 ${plotDynamicsFailureChecks.length}`,
        message: qualityContractMessage(plotDynamicsFailureChecks, '剧情动力检查存在未清 fail/warn 项。'),
        action: '按 plot_dynamics_checks 回修正文：补目标、阻碍、行动、代价/反馈、新期待的最小剧情循环；需要时重构假胜、崩解、A/B情绪交替、多线错峰或悬置收尾，让本章推进变成可见行动链。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `剧情动力缺口 ${plotDynamicsFailureChecks.length}`,
          missed_count: plotDynamicsFailureChecks.length,
          missed: qualityContractMissedRows(plotDynamicsFailureChecks),
          checks: plotDynamicsFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const characterRelationFailureChecks = qualityContractChecks(payload, 'character_relation_checks', 'characterRelationChecks')
    if (characterRelationFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = characterRelationFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '角色关系',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'character_relation_gap',
        severity: 'high',
        category: 'character_relation',
        title: `角色关系缺口 ${characterRelationFailureChecks.length}`,
        message: qualityContractMessage(characterRelationFailureChecks, '角色关系检查存在未清 fail/warn 项。'),
        action: '按 character_relation_checks 回修正文：补关系类型、关系考验/变化、主角独立目标、目标归属、角色不止恋爱、配角期待枢纽、配角主动行动、态度变化和阶段匹配；主角必须保留自己的诉求、主动选择和代价，关系线要让目标摩擦或互补。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `角色关系缺口 ${characterRelationFailureChecks.length}`,
          missed_count: characterRelationFailureChecks.length,
          missed: qualityContractMissedRows(characterRelationFailureChecks),
          checks: characterRelationFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const characterBehaviorFailureChecks = qualityContractChecks(payload, 'character_behavior_checks', 'characterBehaviorChecks')
    if (characterBehaviorFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = characterBehaviorFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '角色行为',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'character_behavior_gap',
        severity: 'high',
        category: 'character_behavior',
        title: `角色行为缺口 ${characterBehaviorFailureChecks.length}`,
        message: qualityContractMessage(characterBehaviorFailureChecks, '角色行为检查存在未清 fail/warn 项。'),
        action: '按 character_behavior_checks 回修正文：补主角行为三必须、动机链、动机具体性、三层标签反差、人设强关联、展示优于告知、记忆锚点、配角功能、反派内在逻辑、反派分量、反派自我叙事和反派层级退场；动机必须落到具体事件、情感理由、触发变化和代价。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `角色行为缺口 ${characterBehaviorFailureChecks.length}`,
          missed_count: characterBehaviorFailureChecks.length,
          missed: qualityContractMissedRows(characterBehaviorFailureChecks),
          checks: characterBehaviorFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const coreContractFailureChecks = qualityContractChecks(payload, 'core_contract_checks', 'coreContractChecks')
    if (coreContractFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = coreContractFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '核心契约',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'core_contract_gap',
        severity: 'high',
        category: 'core_contract',
        title: `核心契约缺口 ${coreContractFailureChecks.length}`,
        message: qualityContractMessage(coreContractFailureChecks, '核心契约检查存在未清 fail/warn 项。'),
        action: '按 core_contract_checks 回修正文：守住全书核心承诺、主线服务、不得漂移红线和主题统一；把 repair_focus 写成可见事件、角色选择、代价、规则判定、主线推进或章末问题，小情绪必须服从全书核心情绪。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `核心契约缺口 ${coreContractFailureChecks.length}`,
          missed_count: coreContractFailureChecks.length,
          missed: qualityContractMissedRows(coreContractFailureChecks),
          checks: coreContractFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const revisionReceiptFailureChecks = qualityContractChecks(payload, 'revision_receipt_checks', 'revisionReceiptChecks')
    if (revisionReceiptFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = revisionReceiptFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '修订回执',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'revision_receipt_gap',
        severity: 'high',
        category: 'revision_receipt',
        title: `修订回执缺口 ${revisionReceiptFailureChecks.length}`,
        message: qualityContractMessage(revisionReceiptFailureChecks, '修订回执检查存在未清 fail/warn 项。'),
        action: '按 revision_receipt_checks 回修：逐条对齐 delivery_risk_receipts、prose revision 要求和实际改动，补齐 revision_receipts.required_action、repair_segment、applied_fix、changed_evidence；changed_evidence 必须能在修订后正文定位。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `修订回执缺口 ${revisionReceiptFailureChecks.length}`,
          missed_count: revisionReceiptFailureChecks.length,
          missed: qualityContractMissedRows(revisionReceiptFailureChecks),
          checks: revisionReceiptFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const deslopRepairFailureChecks = qualityContractChecks(payload, 'deslop_repair_checks', 'deslopRepairChecks')
    if (deslopRepairFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = deslopRepairFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '去AI味修复',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'deslop_repair_gap',
        severity: 'high',
        category: 'deslop_repair',
        title: `去AI味修复缺口 ${deslopRepairFailureChecks.length}`,
        message: qualityContractMessage(deslopRepairFailureChecks, '去AI味修复检查存在未清 fail/warn 项。'),
        action: '按 deslop_repair_checks 回修：逐条处理 story-deslop Gate A-G 残留，重写模板化对白、抽象心理、堆叠描写或AI腔，并在 deslop_repair_receipts.changed_evidence 中引用修订后正文证据。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `去AI味修复缺口 ${deslopRepairFailureChecks.length}`,
          missed_count: deslopRepairFailureChecks.length,
          missed: qualityContractMissedRows(deslopRepairFailureChecks),
          checks: deslopRepairFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const proseMetaFailureChecks = qualityContractChecks(payload, 'prose_meta_checks', 'proseMetaChecks')
    if (proseMetaFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = proseMetaFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '正文元叙事',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'prose_meta_gap',
        severity: 'high',
        category: 'prose_meta',
        title: `正文元叙事缺口 ${proseMetaFailureChecks.length}`,
        message: qualityContractMessage(proseMetaFailureChecks, '正文元叙事检查存在未清 fail/warn 项。'),
        action: '按 prose_meta_checks 回修正文：删除作者说明、创作术语、章节意图旁白和元叙事提示，把铺垫、反转、伏笔和解释改成角色现场证据、误判、行动后果或可定位信息变化。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `正文元叙事缺口 ${proseMetaFailureChecks.length}`,
          missed_count: proseMetaFailureChecks.length,
          missed: qualityContractMissedRows(proseMetaFailureChecks),
          checks: proseMetaFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const serialRiskRepairFailureChecks = qualityContractChecks(payload, 'serial_risk_repair_checks', 'serialRiskRepairChecks')
    if (serialRiskRepairFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = serialRiskRepairFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '连续风险修复',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'serial_risk_repair_gap',
        severity: 'high',
        category: 'serial_risk_repair',
        title: `连续风险修复缺口 ${serialRiskRepairFailureChecks.length}`,
        message: qualityContractMessage(serialRiskRepairFailureChecks, '连续风险修复检查存在未清 fail/warn 项。'),
        action: '按 serial_risk_repair_checks 回修正文：补齐安全批量、场景承接、连续生产风险的修复回执，并把场景承接变化、状态变化或风险解除证据落到正文可定位内容。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `连续风险修复缺口 ${serialRiskRepairFailureChecks.length}`,
          missed_count: serialRiskRepairFailureChecks.length,
          missed: qualityContractMissedRows(serialRiskRepairFailureChecks),
          checks: serialRiskRepairFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const chapterHookQualityFailureChecks = qualityContractChecks(payload, 'chapter_hook_quality_checks', 'chapterHookQualityChecks')
    if (chapterHookQualityFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = chapterHookQualityFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '章钩质量',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'chapter_hook_quality_gap',
        severity: 'high',
        category: 'chapter_hook_quality',
        title: `章钩质量缺口 ${chapterHookQualityFailureChecks.length}`,
        message: qualityContractMessage(chapterHookQualityFailureChecks, '章钩质量检查存在未清 fail/warn 项。'),
        action: '按 chapter_hook_quality_checks 回修正文：章首必须用现场异常、危险、选择、冲突、对话逼问或规则触发拉住读者；章尾必须留下具体问题、危险、发现、选择或下一章行动压力，并和后续行动直接相连。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `章钩质量缺口 ${chapterHookQualityFailureChecks.length}`,
          missed_count: chapterHookQualityFailureChecks.length,
          missed: qualityContractMissedRows(chapterHookQualityFailureChecks),
          checks: chapterHookQualityFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const continuityHeatFailureChecks = qualityContractChecks(payload, 'continuity_heat_checks', 'continuityHeatChecks')
    if (continuityHeatFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = continuityHeatFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '连续性热度',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'continuity_heat_gap',
        severity: 'high',
        category: 'continuity_heat',
        title: `连续性热度缺口 ${continuityHeatFailureChecks.length}`,
        message: qualityContractMessage(continuityHeatFailureChecks, '连续性热度检查存在未清 fail/warn 项。'),
        action: '按 continuity_heat_checks 回修正文：hot 元素必须推进，warm 元素必须有效触达，cold 回收前必须升温，archived 不得误激活；避免只点名伏笔、只说以后再说或让休眠线突然解题。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `连续性热度缺口 ${continuityHeatFailureChecks.length}`,
          missed_count: continuityHeatFailureChecks.length,
          missed: qualityContractMissedRows(continuityHeatFailureChecks),
          checks: continuityHeatFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const conflictStructureFailureChecks = qualityContractChecks(payload, 'conflict_structure_checks', 'conflictStructureChecks')
    if (conflictStructureFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = conflictStructureFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '冲突结构',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'conflict_structure_gap',
        severity: 'high',
        category: 'conflict_structure',
        title: `冲突结构缺口 ${conflictStructureFailureChecks.length}`,
        message: qualityContractMessage(conflictStructureFailureChecks, '冲突结构检查存在未清 fail/warn 项。'),
        action: '按 conflict_structure_checks 回修正文：补阻止者、有进无出、死亡赌注/退出代价、黏结剂、言语到行动再到激烈对抗的升级阶梯、明确胜负结果、压势不压人、主角主动破局、矛盾网和下一冲突种子。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `冲突结构缺口 ${conflictStructureFailureChecks.length}`,
          missed_count: conflictStructureFailureChecks.length,
          missed: qualityContractMissedRows(conflictStructureFailureChecks),
          checks: conflictStructureFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const bridgeUnitFailureChecks = qualityContractChecks(payload, 'bridge_unit_checks', 'bridgeUnitChecks')
    if (bridgeUnitFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = bridgeUnitFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '桥段节奏',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'bridge_unit_gap',
        severity: 'high',
        category: 'bridge_unit',
        title: `桥段节奏缺口 ${bridgeUnitFailureChecks.length}`,
        message: qualityContractMessage(bridgeUnitFailureChecks, '桥段节奏检查存在未清 fail/warn 项。'),
        action: '按 bridge_unit_checks 回修正文：确认四章一桥段位置，补连续期待、目标推进、章尾新目标、高潮中埋钩子或连续小期待；连续2章没有目标推进时提高冲突密度，连续2章只爆点时补关系、伏笔、状态承接余波。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `桥段节奏缺口 ${bridgeUnitFailureChecks.length}`,
          missed_count: bridgeUnitFailureChecks.length,
          missed: qualityContractMissedRows(bridgeUnitFailureChecks),
          checks: bridgeUnitFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const reversalFailureChecks = qualityContractChecks(payload, 'reversal_checks', 'reversalChecks')
    if (reversalFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = reversalFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '反转设计',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'reversal_gap',
        severity: 'high',
        category: 'reversal',
        title: `反转设计缺口 ${reversalFailureChecks.length}`,
        message: qualityContractMessage(reversalFailureChecks, '反转设计检查存在未清 fail/warn 项。'),
        action: '按 reversal_checks 回修正文：补足3处暗示、公平误导、反转类型、揭示时机、揭示后影响和打脸节奏；删除天降反转、作弊新信息和大段解释独白。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `反转设计缺口 ${reversalFailureChecks.length}`,
          missed_count: reversalFailureChecks.length,
          missed: qualityContractMissedRows(reversalFailureChecks),
          checks: reversalFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const showdownFailureChecks = qualityContractChecks(payload, 'showdown_checks', 'showdownChecks')
    if (showdownFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = showdownFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '高潮对抗',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'showdown_gap',
        severity: 'high',
        category: 'showdown',
        title: `高潮对抗缺口 ${showdownFailureChecks.length}`,
        message: qualityContractMessage(showdownFailureChecks, '高潮对抗检查存在未清 fail/warn 项。'),
        action: '按 showdown_checks 回修正文：补爽点释放、底牌管理、三压一爆三震、舞台层级、传递通道、震惊分层、战斗/智斗服务爽点、以弱胜强逻辑、三层破局和急-缓-急情绪节奏。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `高潮对抗缺口 ${showdownFailureChecks.length}`,
          missed_count: showdownFailureChecks.length,
          missed: qualityContractMissedRows(showdownFailureChecks),
          checks: showdownFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const openingFailureChecks = qualityContractChecks(payload, 'opening_checks', 'openingChecks')
    if (openingFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = openingFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '开篇设计',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'opening_gap',
        severity: 'high',
        category: 'opening',
        title: `开篇设计缺口 ${openingFailureChecks.length}`,
        message: qualityContractMessage(openingFailureChecks, '开篇设计检查存在未清 fail/warn 项。'),
        action: '按 opening_checks 回修正文：重做300字内主角登场、1000字内爽点/期待点、三大基点、开头五要诀（简单、不偏、快、爽、不平）、主角目标与本文卖点、信息分批释放；删除大段背景、天气风景、序章楔子和详细世界观。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `开篇设计缺口 ${openingFailureChecks.length}`,
          missed_count: openingFailureChecks.length,
          missed: qualityContractMissedRows(openingFailureChecks),
          checks: openingFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const proseCraftFailureChecks = qualityContractChecks(payload, 'prose_craft_checks', 'proseCraftChecks')
    if (proseCraftFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const directiveCheck = proseCraftFailureChecks.find(check => sceneCardDirectiveCheckKey(check))
      const firstCheck = directiveCheck || proseCraftFailureChecks[0] || {}
      const sceneCardDirectiveKind = sceneCardDirectiveCheckKey(firstCheck)
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '正文工艺',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: sceneCardDirectiveKind || 'prose_craft_gap',
        severity: 'high',
        category: 'prose_craft',
        title: `正文工艺缺口 ${proseCraftFailureChecks.length}`,
        message: qualityContractMessage(proseCraftFailureChecks, '正文工艺检查存在未清 fail/warn 项。'),
        action: '按 prose_craft_checks 回修正文：修深度限知、身体细节替代情绪词、连续内心独白、全场远景概括、三维度揉进、一动一静、道具/数字功能和环境交互；删除上帝视角、堆叠式描写、抽象心理总结、无交互环境和胶水词过渡。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `正文工艺缺口 ${proseCraftFailureChecks.length}`,
          missed_count: proseCraftFailureChecks.length,
          missed: qualityContractMissedRows(proseCraftFailureChecks),
          checks: proseCraftFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const punctuationToneFailureChecks = qualityContractChecks(payload, 'punctuation_tone_checks', 'punctuationToneChecks')
    if (punctuationToneFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = punctuationToneFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '语气标点',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'punctuation_tone_gap',
        severity: 'high',
        category: 'punctuation_tone',
        title: `语气标点缺口 ${punctuationToneFailureChecks.length}`,
        message: qualityContractMessage(punctuationToneFailureChecks, '语气标点检查存在未清 fail/warn 项。'),
        action: '按 punctuation_tone_checks 回修正文：修通篇句号化、随机标点堆砌、省略号/破折号硬停顿、质问/爆发/迟疑标点错配和角色声线同质；用动作打断、换行、短句或冒号落点承接语气。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `语气标点缺口 ${punctuationToneFailureChecks.length}`,
          missed_count: punctuationToneFailureChecks.length,
          missed: qualityContractMissedRows(punctuationToneFailureChecks),
          checks: punctuationToneFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const contentRubricFailureChecks = qualityContractChecks(payload, 'content_rubric_checks', 'contentRubricChecks')
    if (contentRubricFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = contentRubricFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '内容基准',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'content_rubric_gap',
        severity: 'high',
        category: 'content_rubric',
        title: `内容基准缺口 ${contentRubricFailureChecks.length}`,
        message: qualityContractMessage(contentRubricFailureChecks, '内容基准检查存在未清 fail/warn 项。'),
        action: '按 content_rubric_checks 回修正文：补核心卖点、冲突推进、情绪曲线、钩子与期待、角色动机、对话质量、设定一致性、自然文字证据、最小剧情循环和高潮构建；必须回答读者为什么翻下一页、本章改变了什么、正文证据在哪里。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `内容基准缺口 ${contentRubricFailureChecks.length}`,
          missed_count: contentRubricFailureChecks.length,
          missed: qualityContractMissedRows(contentRubricFailureChecks),
          checks: contentRubricFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const targetReaderFailureChecks = qualityContractChecks(payload, 'target_reader_checks', 'targetReaderChecks')
    if (targetReaderFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = targetReaderFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '目标读者',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'target_reader_gap',
        severity: 'high',
        category: 'target_reader',
        title: `目标读者缺口 ${targetReaderFailureChecks.length}`,
        message: qualityContractMessage(targetReaderFailureChecks, '目标读者检查存在未清 fail/warn 项。'),
        action: '按 target_reader_checks 回修正文：补清目标读者画像、读者渴望、情绪缺口、本章命中点、平台口味和可见读者回报；情绪缺口必须把核心痛苦、深层情结、高频情绪关键词和未满足需求写成冲突压力、角色选择、即时反馈或尊严/安全感/掌控感补偿。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `目标读者缺口 ${targetReaderFailureChecks.length}`,
          missed_count: targetReaderFailureChecks.length,
          missed: qualityContractMissedRows(targetReaderFailureChecks),
          checks: targetReaderFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const genrePositioningFailureChecks = qualityContractChecks(payload, 'genre_positioning_checks', 'genrePositioningChecks')
    if (genrePositioningFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = genrePositioningFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '题材定位',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'genre_positioning_gap',
        severity: 'high',
        category: 'genre_positioning',
        title: `题材定位缺口 ${genrePositioningFailureChecks.length}`,
        message: qualityContractMessage(genrePositioningFailureChecks, '题材定位检查存在未清 fail/warn 项。'),
        action: '按 genre_positioning_checks 回修正文：校准题材标签、核心梗、类型公式、金手指贴合、必备场景、微创新边界、长板聚焦和书名简介正文三位一体；拉长题材长板而非补短板，删除稀释核心卖点的支线，把同一卖点扩成至少 3 个角度的正文证据。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `题材定位缺口 ${genrePositioningFailureChecks.length}`,
          missed_count: genrePositioningFailureChecks.length,
          missed: qualityContractMissedRows(genrePositioningFailureChecks),
          checks: genrePositioningFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const femaleAudienceFailureChecks = qualityContractChecks(payload, 'female_audience_checks', 'femaleAudienceChecks')
    if (femaleAudienceFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = femaleAudienceFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '女频长篇',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'female_audience_gap',
        severity: 'high',
        category: 'female_audience',
        title: `女频长篇缺口 ${femaleAudienceFailureChecks.length}`,
        message: qualityContractMessage(femaleAudienceFailureChecks, '女频长篇检查存在未清 fail/warn 项。'),
        action: '按 female_audience_checks 回修正文：补安全感锚点、代入感、女主主动性、主情绪、感情线双轴、虐后反转或糖、平台对位和货板一致；把女主被动改成女主自己做决定、自己推进，把感情升级踩到事业/成长节点上，并控制连续虐戏剂量。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `女频长篇缺口 ${femaleAudienceFailureChecks.length}`,
          missed_count: femaleAudienceFailureChecks.length,
          missed: qualityContractMissedRows(femaleAudienceFailureChecks),
          checks: femaleAudienceFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const upgradeRhythmFailureChecks = qualityContractChecks(payload, 'upgrade_rhythm_checks', 'upgradeRhythmChecks')
    if (upgradeRhythmFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = upgradeRhythmFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '升级节奏',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'upgrade_rhythm_gap',
        severity: 'high',
        category: 'upgrade_rhythm',
        title: `升级节奏缺口 ${upgradeRhythmFailureChecks.length}`,
        message: qualityContractMessage(upgradeRhythmFailureChecks, '升级节奏检查存在未清 fail/warn 项。'),
        action: '按 upgrade_rhythm_checks 回修正文：补升级前后对比、即时反馈、延迟反馈、新门槛、金手指功能触发奖励规则和多维成长；金手指简单是核心，升级必须写成读者一眼能懂的动作反馈、资格变化、能力边界和下一层压力。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `升级节奏缺口 ${upgradeRhythmFailureChecks.length}`,
          missed_count: upgradeRhythmFailureChecks.length,
          missed: qualityContractMissedRows(upgradeRhythmFailureChecks),
          checks: upgradeRhythmFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const chapterStructureFailureChecks = qualityContractChecks(payload, 'structure_checks', 'structureChecks')
    if (chapterStructureFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = chapterStructureFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '章节结构',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'chapter_structure_gap',
        severity: 'high',
        category: 'chapter_structure',
        title: `章节结构缺口 ${chapterStructureFailureChecks.length}`,
        message: qualityContractMessage(chapterStructureFailureChecks, '章节结构检查存在未清 fail/warn 项。'),
        action: '按 structure_checks 回修正文：补开头钩子、中段推进、局势变化和章尾翻页；开头必须给具体异常/证据/危机，中段用行动推动局势，结尾落到新的发现、危机、选择或反转，而不是总结。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `章节结构缺口 ${chapterStructureFailureChecks.length}`,
          missed_count: chapterStructureFailureChecks.length,
          missed: qualityContractMissedRows(chapterStructureFailureChecks),
          checks: chapterStructureFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const chapterProgressionFailureChecks = qualityContractChecks(payload, 'progression_checks', 'progressionChecks')
    if (chapterProgressionFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = chapterProgressionFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '章节推进',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'chapter_progression_gap',
        severity: 'high',
        category: 'chapter_progression',
        title: `章节推进缺口 ${chapterProgressionFailureChecks.length}`,
        message: qualityContractMessage(chapterProgressionFailureChecks, '章节推进检查存在未清 fail/warn 项。'),
        action: '按 progression_checks 回修正文：证明删掉这章会影响理解；补本章不可删除的证据、选择、代价、关系变化、设定位移或主线位移，并压缩等待、复述、原地解释和不改变局势的段落。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `章节推进缺口 ${chapterProgressionFailureChecks.length}`,
          missed_count: chapterProgressionFailureChecks.length,
          missed: qualityContractMissedRows(chapterProgressionFailureChecks),
          checks: chapterProgressionFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const informationLoadFailureChecks = qualityContractChecks(payload, 'information_checks', 'informationChecks')
    if (informationLoadFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = informationLoadFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '信息负载',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'information_load_gap',
        severity: 'high',
        category: 'information_load',
        title: `信息负载缺口 ${informationLoadFailureChecks.length}`,
        message: qualityContractMessage(informationLoadFailureChecks, '信息负载检查存在未清 fail/warn 项。'),
        action: '按 information_checks 回修正文：压缩新概念到 3 个以内，把设定说明改成角色行动、质疑、触发、证据核对或冲突反馈中的可见信息；信息必须跟着冲突走，不得在行动前大段解释规则。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `信息负载缺口 ${informationLoadFailureChecks.length}`,
          missed_count: informationLoadFailureChecks.length,
          missed: qualityContractMissedRows(informationLoadFailureChecks),
          checks: informationLoadFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const longformContinuityFailureChecks = qualityContractChecks(payload, 'longform_checks', 'longformChecks')
    if (longformContinuityFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = longformContinuityFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '长篇连续性',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'longform_continuity_gap',
        severity: 'high',
        category: 'longform_continuity',
        title: `长篇连续性缺口 ${longformContinuityFailureChecks.length}`,
        message: qualityContractMessage(longformContinuityFailureChecks, '长篇连续性检查存在未清 fail/warn 项。'),
        action: '按 longform_checks 回修正文：检查最近 5 章是否有明确进展、爽点间隔是否过长、本章是否承接前文并推动后续；补阶段位移、状态变化、爽点回报和下一阶段牵引，避免连续多章只解释背景。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `长篇连续性缺口 ${longformContinuityFailureChecks.length}`,
          missed_count: longformContinuityFailureChecks.length,
          missed: qualityContractMissedRows(longformContinuityFailureChecks),
          checks: longformContinuityFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const readerRetentionFailureChecks = qualityContractChecks(payload, 'reader_retention_checks', 'readerRetentionChecks')
    if (readerRetentionFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = readerRetentionFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '追读雷达',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'reader_retention_gap',
        severity: 'high',
        category: 'reader_retention',
        title: `追读雷达缺口 ${readerRetentionFailureChecks.length}`,
        message: qualityContractMessage(readerRetentionFailureChecks, '追读雷达检查存在未清 fail/warn 项。'),
        action: '按 reader_retention_checks 回修正文：补前300字钩子、可见爽点、信息缺口、章末追读、留存双引擎的情绪 + 饥饿，以及 Hook上瘾模型的触发、行动、奖励、投入；饥饿缺口必须用信息差植入问号并剥洋葱卡住关键信息，奖励缺口必须补奖励随机性和沉没投入。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `追读雷达缺口 ${readerRetentionFailureChecks.length}`,
          missed_count: readerRetentionFailureChecks.length,
          missed: qualityContractMissedRows(readerRetentionFailureChecks),
          checks: readerRetentionFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const intentConfirmationChecks = preDraftExecutionChecks(payload, 'intent_confirmation_checks', 'intentConfirmationChecks')
    if (intentConfirmationChecks.length > 0) {
      const chapter = resolveChapter(payload)
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '意图确认',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'intent_confirmation_gap',
        severity: 'high',
        category: 'intent_confirmation',
        title: `意图确认缺口 ${intentConfirmationChecks.length}`,
        message: preDraftExecutionMessage(intentConfirmationChecks) || '写前意图确认没有在正文中形成可验证证据。',
        action: '按写前意图确认回执回修正文：把情绪目标、章节意图、关键承接和章尾推动力改成正文可见事件、选择、动作、对白、关系反馈或物品状态变化。',
        created_at: review.created_at,
        payload: {
          status: 'warn',
          label: `意图确认缺口 ${intentConfirmationChecks.length}`,
          missed_count: intentConfirmationChecks.length,
          missed: preDraftExecutionMissedRows(intentConfirmationChecks),
          checks: intentConfirmationChecks,
          review_type: review.review_type,
        },
      })
    }
    const benchmarkRecallChecks = preDraftExecutionChecks(payload, 'benchmark_recall_checks', 'benchmarkRecallChecks')
    if (benchmarkRecallChecks.length > 0) {
      const chapter = resolveChapter(payload)
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '文风召回',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'benchmark_recall_gap',
        severity: 'high',
        category: 'benchmark_recall',
        title: `文风召回缺口 ${benchmarkRecallChecks.length}`,
        message: preDraftExecutionMessage(benchmarkRecallChecks) || '写前文风召回没有在正文中形成可验证证据。',
        action: '按写前文风召回回执回修正文：把对标模块、节奏参照、文风召回和表达方法改成正文中的节拍分配、对白比例、动作链和情绪转折，禁止复制参照文本原句或桥段。',
        created_at: review.created_at,
        payload: {
          status: 'warn',
          label: `文风召回缺口 ${benchmarkRecallChecks.length}`,
          missed_count: benchmarkRecallChecks.length,
          missed: preDraftExecutionMissedRows(benchmarkRecallChecks),
          checks: benchmarkRecallChecks,
          review_type: review.review_type,
        },
      })
    }
    pushReviewIssues(review, payload, asArray(reviewPayload.issues), {
      source: 'prose_quality',
      source_label: '正文质检',
      category: 'quality',
      severity: Number(reviewPayload.score || 100) < 65 ? 'high' : 'medium',
    })
    if (Number(reviewPayload.score || 100) < 78) {
      const chapter = resolveChapter(payload)
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '正文质检',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'low_quality_score',
        severity: Number(reviewPayload.score || 0) < 65 ? 'high' : 'medium',
        category: 'quality',
        title: `质量分 ${reviewPayload.score || 0} 低于阈值`,
        message: review.summary || `章节质量分 ${reviewPayload.score || 0}`,
        action: '进入章节修订，补齐目标、冲突、节奏或章末钩子。',
        created_at: review.created_at,
        payload: { score: reviewPayload.score },
      })
    }
  }
}
