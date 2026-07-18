import {
  buildApprovalBlockerBrief,
  pushAnnotation,
  qualityAuditFailureChecks,
  qualityAuditMessage,
  qualityAuditSeverity,
  qualityContractChecks,
  qualityContractMessage,
  qualityContractMissedRows,
  sceneCardReceiptAuditChecks,
  sceneCardReceiptAuditMessage,
  sourceReadinessChecks,
  sourceReadinessMessage,
  sourceReadinessMissedRows,
  stateTrackingChecks,
  stateTrackingMessage,
  stateTrackingMissedRows,
} from './builders'
import type { ProseQualityAnnotationContext } from './builders-annotations-prose-quality-types'

export function appendProseQualityCoreAnnotations(ctx: ProseQualityAnnotationContext) {
  const { review, payload, items, statuses, resolveChapter, pushReviewIssues, pushDeliveryRiskAnnotation, reviewPayload } = ctx
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
}
