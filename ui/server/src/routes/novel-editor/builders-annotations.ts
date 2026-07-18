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

export function buildReviewAnnotations(project: any, chapters: any[], reviews: any[]) {
  const statuses = latestAnnotationStatus(reviews)
  const items: any[] = []
  const chapterById = new Map(chapters.map(chapter => [Number(chapter.id), chapter]))
  const chapterByNo = new Map(chapters.map(chapter => [Number(chapter.chapter_no), chapter]))
  const resolveChapter = (payload: any) => {
    const chapterId = Number(payload.chapter_id || payload.report?.chapter_id || payload.quality_card?.chapter_id || payload.context_package?.chapter_target?.id || 0)
    const chapterNo = Number(payload.chapter_no || payload.report?.chapter_no || payload.quality_card?.chapter_no || payload.context_package?.chapter_target?.chapter_no || 0)
    return chapterById.get(chapterId) || chapterByNo.get(chapterNo) || null
  }
  const clearedConvergenceByChapter = new Map<number, any>()
  reviews
    .filter(item => item.review_type === 'delivery_risk_convergence')
    .forEach(review => {
      const payload = parseJsonLikePayload(review.payload) || {}
      const convergence = payload.delivery_risk_convergence || payload.result?.delivery_risk_convergence || payload.result || payload
      const chapter = resolveChapter({
        ...payload,
        chapter_id: payload.chapter_id || convergence?.chapter_id,
        chapter_no: payload.chapter_no || convergence?.chapter_no,
      })
      const afterCount = Number(convergence?.after_count ?? convergence?.after?.total_count ?? 0)
      if (!chapter?.id || !(convergence?.status === 'cleared' || afterCount === 0)) return
      const current = clearedConvergenceByChapter.get(Number(chapter.id))
      if (!current || String(review.created_at || '').localeCompare(String(current.review.created_at || '')) > 0) {
        clearedConvergenceByChapter.set(Number(chapter.id), { review, convergence })
      }
    })
  const pushReviewIssues = (review: any, payload: any, issueList: any[], defaults: any = {}) => {
    const chapter = resolveChapter(payload)
    issueList.forEach((issue: any, index: number) => {
      const normalized = typeof issue === 'string' ? { description: issue } : issue || {}
      pushAnnotation(items, statuses, {
        source: defaults.source || review.review_type,
        source_label: defaults.source_label || review.summary || review.review_type,
        review_id: review.id,
        chapter_id: chapter?.id || defaults.chapter_id || null,
        chapter_no: chapter?.chapter_no || defaults.chapter_no || null,
        kind: normalized.type || defaults.kind || `issue-${index}`,
        severity: normalized.severity || defaults.severity || 'medium',
        category: defaults.category || normalized.type || review.review_type,
        title: normalized.title || normalized.description || normalized.message || String(issue),
        message: normalized.description || normalized.message || normalized.title || String(issue),
        action: normalized.suggestion || normalized.action || defaults.action || '',
        created_at: review.created_at,
        payload: { issue: normalized, review_type: review.review_type },
      })
    })
  }
  const pushDeliveryRiskAnnotation = (review: any, payload: any, config: {
    payloadKey: string
    sourceLabel: string
    category: string
    kind: string | ((risk: any, count: number) => string)
    title: (risk: any, count: number) => string
    message: (risk: any, count: number) => string
    action: string | ((risk: any, count: number) => string)
    count: (risk: any) => number
    severity?: (risk: any, count: number) => string
  }) => {
    const risk = payload?.[config.payloadKey] || payload?.result?.[config.payloadKey] || payload?.result || payload || {}
    const riskCount = Math.max(0, Number(config.count(risk) || 0))
    const shouldPush = riskCount > 0 || risk?.status === 'warn'
    if (!shouldPush) return
    const count = Math.max(1, riskCount)
    const chapter = resolveChapter(payload)
    const cleared = chapter?.id ? clearedConvergenceByChapter.get(Number(chapter.id)) : null
    const clearedAfterRisk = cleared && String(cleared.review.created_at || '').localeCompare(String(review.created_at || '')) > 0
    pushAnnotation(items, statuses, {
      source: review.review_type,
      source_label: config.sourceLabel,
      review_id: review.id,
      chapter_id: chapter?.id,
      chapter_no: chapter?.chapter_no,
      kind: typeof config.kind === 'function' ? config.kind(risk, count) : config.kind,
      severity: config.severity ? config.severity(risk, count) : 'medium',
      category: config.category,
      title: config.title(risk, count),
      message: config.message(risk, count),
      action: typeof config.action === 'function' ? config.action(risk, count) : config.action,
      created_at: review.created_at,
      status: clearedAfterRisk ? 'resolved' : undefined,
      resolved_at: clearedAfterRisk ? cleared.review.created_at : null,
      resolution_note: clearedAfterRisk ? `交稿风险已由风险收敛复盘清零：${cleared.convergence?.label || '风险已清零'}` : '',
      payload: risk,
    })
  }

  for (const review of reviews) {
    const payload = parseJsonLikePayload(review.payload) || {}
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
    if (review.review_type === 'editor_report') {
      const report = payload.report || {}
      pushReviewIssues(review, payload, asArray(report.must_fix), {
        source: 'editor_report',
        source_label: '编辑报告',
        category: 'editorial',
        severity: 'high',
        action: '按编辑报告生成修订稿或人工修改。',
      })
      asArray(report.optional_improvements).forEach((item: any, index: number) => {
        const chapter = resolveChapter(payload)
        pushAnnotation(items, statuses, {
          source: 'editor_report',
          source_label: '编辑报告',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: `optional-${index}`,
          severity: 'low',
          category: 'editorial',
          title: String(item),
          message: String(item),
          action: '可选优化，人工判断是否处理。',
          created_at: review.created_at,
        })
      })
    }
    if (review.review_type === 'similarity_report') {
      const report = payload.report || payload
      const chapter = resolveChapter(payload)
      const risk = Number(report.overall_risk_score || 0)
      if (risk > 35 || report.decision === 'needs_rewrite') {
        pushAnnotation(items, statuses, {
          source: 'similarity_report',
          source_label: '相似度报告',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no || report.chapter_no,
          kind: 'similarity_risk',
          severity: risk > 55 ? 'high' : 'medium',
          category: 'safety',
          title: `相似风险 ${risk}`,
          message: `相似度检测决策：${report.decision || '需复核'}`,
          action: asArray(report.suggestions)[0] || '运行参考迁移计划并重写高风险桥段。',
          created_at: review.created_at,
          payload: report,
        })
      }
      pushReviewIssues(review, payload, asArray(report.suggestions), {
        source: 'similarity_report',
        source_label: '相似度报告',
        category: 'safety',
        severity: risk > 55 ? 'high' : 'medium',
      })
    }
    if (review.review_type === 'release_repair_queue') {
      const audit = payload.release_audit || {}
      asArray(audit.blockers).concat(asArray(audit.warnings)).forEach((item: any, index: number) => {
        pushAnnotation(items, statuses, {
          source: 'release_repair_queue',
          source_label: '发布审核',
          review_id: review.id,
          kind: `release-${item.key || index}`,
          severity: item.status === 'blocker' ? 'high' : 'medium',
          category: 'release',
          title: item.label || '发布审核问题',
          message: item.message || item.label || '',
          action: item.action || '',
          created_at: review.created_at,
          payload: item,
        })
      })
    }
    if (review.review_type === 'quality_audit_repair_receipt_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'quality_audit_repair_receipt_sync',
        sourceLabel: '质量回执',
        category: 'quality_audit_repair_receipt',
        kind: 'quality_audit_repair_receipt',
        count: qualityAuditRepairReceiptCount,
        title: (risk, count) => String(risk?.label || `质量诊断修复回执缺口 ${count}`),
        message: risk => qualityAuditRepairReceiptMessage(risk),
        action: risk => asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()).filter(Boolean).join('；')
          || '重新修订并逐条输出 quality_audit_repair_receipts.changed_evidence，确保每条回执能定位到修订后正文证据。',
        severity: () => 'high',
      })
    }
    if (review.review_type === 'deslop_repair_receipt_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'deslop_repair_receipt_sync',
        sourceLabel: '去AI味回执',
        category: 'deslop_repair_receipt',
        kind: 'deslop_repair_receipt',
        count: deslopRepairReceiptCount,
        title: (risk, count) => String(risk?.label || `去AI味修复回执残留 ${count}`),
        message: risk => deslopRepairReceiptMessage(risk),
        action: risk => asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()).filter(Boolean).join('；')
          || '重新修订并逐条输出 deslop_repair_receipts.changed_evidence，确保每条回执能定位到修订后正文证据。',
        severity: () => 'high',
      })
    }
    if (review.review_type === 'revision_cascade_impact_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'revision_cascade_impact_sync',
        sourceLabel: '级联修订',
        category: 'revision_cascade_impact',
        kind: 'revision_cascade_impact',
        count: deliveryRiskMissedCount,
        title: (risk, count) => String(risk?.label || `修订级联影响 ${count}`),
        message: risk => deliveryRiskMissedMessage(risk, 'revision_receipts.cascade_impacts 存在后续章节同步义务。'),
        action: risk => [
          '复核 revision_receipts.cascade_impacts，补齐 evidence/source_excerpt，并把修订后的伏笔、时间线、角色状态、资产归属和关系边界同步到后续章节。',
          ...asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()).filter(Boolean),
        ].join('；'),
        severity: () => 'high',
      })
    }
    if (review.review_type === 'revision_scope_guard_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'revision_scope_guard_sync',
        sourceLabel: '修订幅度',
        category: 'revision_scope_guard',
        kind: 'revision_scope_guard',
        count: deliveryRiskMissedCount,
        title: (risk, count) => String(risk?.label || `修订幅度风险 ${count}`),
        message: risk => deliveryRiskMissedMessage(risk, '修订前后字数差异超过 oh-story 修订幅度警戒线。'),
        action: risk => asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()).filter(Boolean).join('；')
          || '下一轮修订不要重写整章；只按自检证据、修订回执残留和确定性检查缺口做局部修复。',
        severity: () => 'high',
      })
    }
    if (review.review_type === 'prose_revision_receipt_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'prose_revision_receipt_sync',
        sourceLabel: '修订回执',
        category: 'prose_revision_receipt',
        kind: 'prose_revision_receipt_sync',
        count: deliveryRiskMissedCount,
        title: (risk, count) => String(risk?.label || `修订回执残留 ${count}`),
        message: risk => deliveryRiskMissedMessage(risk, 'delivery_risk_receipts 存在失败项，但 revision_receipts 没有逐条闭环。'),
        action: risk => asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()).filter(Boolean).join('；')
          || '补齐 delivery_risk_receipts 对应的 revision_receipts；每条必须写 required_action、repair_segment、applied_fix 和 changed_evidence。',
        severity: () => 'high',
      })
    }
    if (review.review_type === 'chapter_core_drift') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'core_drift',
        sourceLabel: '核心偏移',
        category: 'delivery_core',
        kind: 'core_drift',
        count: risk => countPayloadNumber(risk?.risk_count ?? risk?.riskCount, countItems(risk?.drift_risks) || countItems(risk?.risks)),
        title: (risk, count) => String(risk?.label || `核心偏移 ${count}`),
        message: risk => asArray(risk?.drift_risks || risk?.risks).slice(0, 3).map((item: any) => String(item)).join('；') || '章节疑似偏离作品核心、读者承诺或本章目标。',
        action: '进入章节修订，优先守住作品核心、读者承诺、本章目标和核心冲突。',
        severity: () => 'high',
      })
    }
    if (review.review_type === 'runway_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'runway_sync',
        sourceLabel: '百万字航线',
        category: 'runway',
        kind: 'runway_sync_risk',
        count: risk => countPayloadNumber(
          risk?.risk_count ?? risk?.riskCount,
          countItems(risk?.four_question_missed) + countItems(risk?.reader_fuel_missed) + countItems(risk?.redline_touched),
        ),
        title: (risk, count) => String(risk?.label || `航线风险 ${count}`),
        message: risk => [
          ...asArray(risk?.four_question_missed).map((item: any) => `四问未兑现 ${item?.label || item?.text || item}`),
          ...asArray(risk?.reader_fuel_missed).map((item: any) => `读者燃料未兑现 ${item?.text || item?.label || item}`),
          ...asArray(risk?.redline_touched).map((item: any) => `红线风险 ${item?.text || item?.label || item}`),
        ].slice(0, 4).join('；') || '本章没有充分兑现百万字航线。',
        action: '补齐百万字航线的本章四问、读者燃料和红线约束，避免当前章偏离长期主线或提前消费后续爆点。',
        severity: risk => countItems(risk?.redline_touched) > 0 ? 'high' : 'medium',
      })
    }
    if (review.review_type === 'reader_retention_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'reader_retention_sync',
        sourceLabel: '追读兑现',
        category: 'reader_retention',
        kind: 'reader_retention_missed',
        count: risk => countPayloadNumber(risk?.missed_count ?? risk?.missedCount, countItems(risk?.missed)),
        title: (risk, count) => String(risk?.label || `漏追读 ${count}`),
        message: risk => asArray(risk?.missed).slice(0, 3).map((item: any) => String(item?.label || item?.text || item)).join('；') || '本章追读承诺没有充分兑现。',
        action: '补齐开篇钩子、信息缺口、短剧化场面和章末追读问题。',
      })
    }
    if (review.review_type === 'chapter_attraction_review') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'chapter_attraction_review',
        sourceLabel: '章节吸引力',
        category: 'chapter_attraction',
        kind: 'chapter_attraction_gap',
        count: risk => countPayloadNumber(risk?.weak_count ?? risk?.weakCount, countItems(risk?.weak_dimensions) || countItems(risk?.dimensions)),
        title: (risk, count) => String(risk?.label || `吸引力缺口 ${count}`),
        message: risk => asArray(risk?.weak_dimensions || risk?.dimensions).slice(0, 4).map((item: any) => {
          const label = String(item?.label || item?.key || '').trim()
          const issue = String(item?.issue || item?.text || item?.expected || item || '').trim()
          return label && issue && label !== issue ? `${label}：${issue}` : label || issue
        }).join('；') || '本章开篇钩子、场景推进、爽点密度、章末翻页或传播场面存在吸引力缺口。',
        action: '按吸引力执行器重修开篇钩子、场景推进、爽点密度、章末翻页和传播场面，优先补出下一页动力。',
      })
    }
    if (review.review_type === 'story_drive_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'story_drive_sync',
        sourceLabel: '故事驱动力',
        category: 'story_drive',
        kind: 'story_drive_gap',
        count: risk => countPayloadNumber(risk?.missed_count ?? risk?.missedCount, countItems(risk?.missed)),
        title: (risk, count) => String(risk?.label || `故事力缺口 ${count}`),
        message: risk => asArray(risk?.missed).slice(0, 4).map((item: any) => {
          const label = String(item?.label || item?.key || '').trim()
          const issue = String(item?.text || item?.expected || item?.issue || item || '').trim()
          return label && issue && label !== issue ? `${label}：${issue}` : label || issue
        }).join('；') || '本章主角选择、明确阻碍、选择代价、局面变化或下一步因果没有充分兑现。',
        action: '补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果，避免章节只有事件没有人物决策。',
      })
    }
    if (review.review_type === 'character_arc_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'character_arc_sync',
        sourceLabel: '人物弧光',
        category: 'character_arc',
        kind: 'character_arc_gap',
        count: risk => countPayloadNumber(risk?.missed_count ?? risk?.missedCount, countItems(risk?.missed)),
        title: (risk, count) => String(risk?.label || `人物弧光缺口 ${count}`),
        message: risk => asArray(risk?.missed).slice(0, 4).map((item: any) => {
          const label = String(item?.label || item?.key || '').trim()
          const issue = String(item?.text || item?.expected || item?.issue || item || '').trim()
          return label && issue && label !== issue ? `${label}：${issue}` : label || issue
        }).join('；') || '本章角色欲望、缺陷受压、关系变化、成长节点或口吻锚点没有充分兑现。',
        action: '补出角色欲望、缺陷受压、关系变化、成长节点和口吻锚点，避免章节只有事件推进但人物没有变化。',
      })
    }
    if (review.review_type === 'style_sample_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'style_sample_sync',
        sourceLabel: '风格样章',
        category: 'style_sample',
        kind: 'style_sample_gap',
        count: risk => countPayloadNumber(
          risk?.missed_count ?? risk?.missedCount,
          countItems(risk?.missed) + countItems(risk?.copied_phrases || risk?.copiedPhrases),
        ),
        title: (risk, count) => String(risk?.label || `风格缺口 ${count}`),
        message: risk => [
          ...asArray(risk?.missed).slice(0, 3).map((item: any) => `${item?.label || item?.key || '风格'}：${item?.text || item?.evidence || item}`),
          ...asArray(risk?.copied_phrases || risk?.copiedPhrases).slice(0, 2).map((item: any) => `照搬风险：${item}`),
        ].join('；') || '本章没有充分执行风格样章的节奏、句式、对白比例或角色口吻策略。',
        action: '按风格样章重修叙述节奏、句式密度、对白比例和角色口吻；只学习抽象表达方法，不得照搬样章原句。',
      })
    }
    if (review.review_type === 'reader_payoff_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'reader_payoff_sync',
        sourceLabel: '读者回报',
        category: 'reader_payoff',
        kind: 'reader_payoff_debt',
        count: risk => countPayloadNumber(risk?.debt_count ?? risk?.debtCount, countItems(risk?.missed) || countItems(risk?.debts)),
        title: (risk, count) => String(risk?.label || `回报欠账 ${count}`),
        message: risk => asArray(risk?.missed || risk?.debts).slice(0, 3).map((item: any) => String(item?.label || item?.text || item)).join('；') || '本章承诺的爽点、惊点或信息回收没有兑现。',
        action: '补足本章承诺的爽点、惊点、信息回收或关系变化，避免只铺垫不回报。',
      })
    }
    if (review.review_type === 'reader_expectation_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'reader_expectation_sync',
        sourceLabel: '读者期待',
        category: 'reader_expectation',
        kind: risk => openingHandoffMisses(risk).length > 0 ? 'opening_handoff_debt' : 'reader_expectation_debt',
        count: risk => countPayloadNumber(risk?.missed_count ?? risk?.missedCount, countItems(risk?.missed)),
        title: (risk, count) => openingHandoffMisses(risk).length > 0 ? `开篇承接漏写 ${Math.max(1, openingHandoffMisses(risk).length)}` : String(risk?.label || `期待欠账 ${count}`),
        message: risk => {
          const opening = openingHandoffMisses(risk)
          const source = opening.length > 0 ? opening : asArray(risk?.missed)
          return source.slice(0, 3).map((item: any) => String(item?.label && item?.text ? `${item.label}：${item.text}` : item?.label || item?.text || item)).join('；')
            || (opening.length > 0 ? '本章开篇没有接住上一章最后一幕。' : '本章读者期待账本中的必兑现项没有充分兑现。')
        },
        action: risk => openingHandoffMisses(risk).length > 0
          ? '重写或补写本章前300-500字，先接住上一章最后一幕、未解危机或读者期待，再推进本章新冲突。'
          : '补齐读者期待账本中的必兑现项，把承诺写成可见行动、冲突结果、情绪回报或章末未解问题。',
      })
    }
    if (review.review_type === 'volume_beat_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'volume_beat_sync',
        sourceLabel: '卷级爆点兑现',
        category: 'volume_beat',
        kind: 'volume_beat_missed',
        count: risk => countPayloadNumber(risk?.missed_count ?? risk?.missedCount, countItems(risk?.missed)),
        title: (risk, count) => String(risk?.label || `爆点漏兑现 ${count}`),
        message: risk => asArray(risk?.missed).slice(0, 3).map((item: any) => {
          const label = String(item?.label || item?.name || '').trim()
          const text = String(item?.text || item?.description || item?.reason || item || '').trim()
          return label && text && label !== text ? `${label}：${text}` : label || text
        }).join('；') || '本章卷级爆点、小高潮或关键反转没有充分兑现。',
        action: '补足本章卷级爆点、小高潮、中高潮或卷末爆点，把爆点写成现场冲突、选择代价、反制结果、关系变化或章末升级。',
      })
    }
    if (review.review_type === 'signature_scene_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'signature_scene_sync',
        sourceLabel: '强场面兑现',
        category: 'signature_scene',
        kind: 'signature_scene_missed',
        count: risk => countPayloadNumber(risk?.missed_count ?? risk?.missedCount, countItems(risk?.missed)),
        title: (risk, count) => String(risk?.label || `强场面漏写 ${count}`),
        message: risk => asArray(risk?.missed).slice(0, 3).map((item: any) => {
          const label = String(item?.label || item?.name || '').trim()
          const text = String(item?.text || item?.description || item?.reason || item || '').trim()
          return label && text && label !== text ? `${label}：${text}` : label || text
        }).join('；') || '开写任务书指定的标志性强场面没有充分兑现。',
        action: '补回开写任务书指定的标志性场面，把它写成可视化动作、空间冲突、规则代价、公开反转或读者可讨论的选择，不要只补气氛描写。',
      })
    }
    if (review.review_type === 'innovation_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'innovation_sync',
        sourceLabel: '创新兑现',
        category: 'innovation',
        kind: 'innovation_missed',
        count: risk => countPayloadNumber(risk?.missed_count ?? risk?.missedCount, countItems(risk?.missed)),
        title: (risk, count) => String(risk?.label || `创新缺口 ${count}`),
        message: risk => asArray(risk?.missed).slice(0, 3).map((item: any) => String(item?.label || item?.text || item)).join('；') || '本章创新执行点没有落成可见场面。',
        action: '补足本章创新执行，不把章节写成普通套路章；把创新角度写成可见选择、机制反差、规则代价或 IP 化场面。',
      })
    }
    if (review.review_type === 'storyline_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'storyline_sync',
        sourceLabel: '剧情线同步',
        category: 'storyline',
        kind: 'storyline_sync_risk',
        count: risk => countItems(risk?.missed) + countItems(risk?.unplanned) + countItems(risk?.forbidden_touched),
        title: (risk, count) => String(risk?.label || `剧情线风险 ${count}`),
        message: risk => [
          ...asArray(risk?.missed).map((item: any) => `漏推 ${item?.name || item?.label || item}`),
          ...asArray(risk?.unplanned).map((item: any) => `额外推进 ${item?.name || item?.label || item}`),
          ...asArray(risk?.forbidden_touched).map((item: any) => `禁揭风险 ${item?.name || item?.label || item}`),
        ].slice(0, 4).join('；') || '本章剧情线推进与计划不一致。',
        action: '对齐本章计划推进、埋线、回收和禁揭边界，避免临时加戏或提前揭底。',
        severity: risk => countItems(risk?.forbidden_touched) > 0 ? 'high' : 'medium',
      })
    }
    if (review.review_type === 'story_unit_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'story_unit_sync',
        sourceLabel: '剧情单元兑现',
        category: 'story_unit',
        kind: 'story_unit_sync_risk',
        count: storyUnitSyncRiskCount,
        title: (risk, count) => String(risk?.label || `剧情单元风险 ${count}`),
        message: risk => [
          ...asArray(risk?.missed).map((item: any) => `单元漏写 ${item?.label || item?.name || item?.text || item}`),
          ...asArray(risk?.rushed_ahead || risk?.rushedAhead).map((item: any) => `单元抢跑 ${item?.label || item?.name || item?.text || item}`),
          ...asArray(risk?.forbidden_touched || risk?.forbiddenTouched).map((item: any) => `禁抢跑 ${item?.label || item?.name || item?.text || item}`),
        ].slice(0, 4).join('；') || '本章剧情单元职责与计划不一致。',
        action: '补足当前剧情单元职责，把抢跑的小高潮或出单元钩子改成暗示、误导、遮挡或延迟兑现，不得提前解决禁抢跑内容。',
        severity: risk => countItems(risk?.rushed_ahead) > 0 || countItems(risk?.rushedAhead) > 0 || countItems(risk?.forbidden_touched) > 0 || countItems(risk?.forbiddenTouched) > 0 ? 'high' : 'medium',
      })
    }
    if (review.review_type === 'governance_recheck_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'governance_recheck_sync',
        sourceLabel: '恢复依据复盘',
        category: 'recovery_evidence',
        kind: 'recovery_evidence_mismatch',
        count: risk => countPayloadNumber(
          risk?.missed_count ?? risk?.missedCount,
          countItems(risk?.failed_evidence || risk?.failedEvidence)
            + countItems(risk?.missed || risk?.missed_items || risk?.missedItems),
        ),
        title: (risk, count) => String(risk?.label || `恢复依据缺口 ${count}`),
        message: risk => [
          ...asArray(risk?.failed_evidence || risk?.failedEvidence).map((item: any) => String(item?.text || item?.label || item)),
          ...asArray(risk?.missed || risk?.missed_items || risk?.missedItems).map((item: any) => String(item?.text || item?.label || item)),
          ...asArray(risk?.watch_items || risk?.watchItems).map((item: any) => `观察项：${item?.text || item?.label || item}`),
        ].slice(0, 4).join('；') || '单章交稿没有继承治理复查记忆。',
        action: '按治理复查记忆回修本章，把修后证据、失效依据和观察项写成正文可见的冲突推进、对白执行、读者回报或剧情线动作。',
        severity: () => 'high',
      })
    }
    if (review.review_type === 'readability_review') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'readability_review',
        sourceLabel: '可读性/网感',
        category: 'readability',
        kind: risk => hasWeakOpeningHook(risk)
          ? 'opening_pull_risk'
          : hasWeakEndingHook(risk)
            ? 'ending_page_turn_risk'
            : hasWeakSceneProgression(risk)
              ? 'scene_progression_risk'
              : hasWeakPayoffDensity(risk)
                ? 'payoff_density_risk'
                : 'readability_or_meme_risk',
        count: risk => {
          const immersionCount = countItems(risk?.meme_sense?.immersion_risks) || countItems(risk?.immersion_risks)
          const lowScoreCount = Number(risk?.readability_score || risk?.score || 100) < 78 ? 1 : 0
          return (immersionCount || lowScoreCount)
            + (hasWeakOpeningHook(risk) ? 1 : 0)
            + (hasWeakEndingHook(risk) ? 1 : 0)
            + (hasWeakSceneProgression(risk) ? 1 : 0)
            + (hasWeakPayoffDensity(risk) ? 1 : 0)
        },
        title: (risk, count) => hasWeakOpeningHook(risk)
          ? `开篇吸引力弱 ${openingHookScore(risk)}`
          : hasWeakEndingHook(risk)
            ? `章末翻页弱 ${endingHookScore(risk)}`
            : hasWeakSceneProgression(risk)
              ? `场景推进弱 ${sceneReadabilityScore(risk)}`
              : hasWeakPayoffDensity(risk)
                ? `爽点密度弱 ${payoffDensityScore(risk)}`
                : String(risk?.label || `可读性/网感风险 ${count}`),
        message: risk => hasWeakOpeningHook(risk)
          ? `开篇 300 字吸引力评分 ${openingHookScore(risk)}，需要更快给出异常、危险、欲望或反常信息。`
          : hasWeakEndingHook(risk)
            ? `最后 300 字翻页评分 ${endingHookScore(risk)}，需要把章末问题压成下一章非看不可。`
            : hasWeakSceneProgression(risk)
              ? `场景推进评分 ${sceneReadabilityScore(risk)}，场景目标、阻碍、转折、回报不够清楚。`
              : hasWeakPayoffDensity(risk)
                ? `爽点密度评分 ${payoffDensityScore(risk)}，每 800-1200 字的信息增量或回报不足。`
                : asArray(risk?.meme_sense?.immersion_risks || risk?.immersion_risks || risk?.issues).slice(0, 3).map((item: any) => String(item?.description || item)).join('；') || `可读性评分 ${risk?.readability_score || risk?.score || '-'}`,
        action: risk => hasWeakOpeningHook(risk)
          ? '重写前300字，把钩子、危机、角色反应和信息增量压到开篇现场，避免泛环境和解释性开场。'
          : hasWeakEndingHook(risk)
            ? '重写最后300字，把危险升级、选择压力、反转或未解答案压到最后一幕，避免用总结或说明收尾。'
            : hasWeakSceneProgression(risk)
              ? '补齐场景目标、阻碍、转折、回报，把中段改成可见行动链和选择压力。'
              : hasWeakPayoffDensity(risk)
                ? '补足信息推进、能力展示、危机反制、关系变化或小回收，提高每 800-1200 字的读者回报密度。'
                : '调整段落密度、对话比例、角色口吻和网感强度，避免热梗或说明文字打断沉浸。',
      })
    }
  }

  for (const chapter of chapters) {
    if (chapter.chapter_text && !chapter.ending_hook) {
      pushAnnotation(items, statuses, {
        source: 'local_scan',
        source_label: '本地扫描',
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        kind: 'missing_hook',
        severity: 'medium',
        category: 'continuity',
        title: '缺少章末钩子',
        message: `第${chapter.chapter_no}章已写正文但缺少章末钩子。`,
        action: '补齐能推动下一章点击的悬念、反转或目标变化。',
      })
    }
    if (chapter.chapter_text && (!Array.isArray(chapter.continuity_notes) || chapter.continuity_notes.length === 0)) {
      pushAnnotation(items, statuses, {
        source: 'local_scan',
        source_label: '本地扫描',
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        kind: 'missing_continuity_notes',
        severity: 'low',
        category: 'continuity',
        title: '缺少连续性备注',
        message: `第${chapter.chapter_no}章缺少角色、道具、伏笔或时间线变化记录。`,
        action: '补齐连续性备注或运行状态机更新。',
      })
    }
  }

  const unique = new Map<string, any>()
  items.forEach(item => unique.set(item.key, item))
  const annotations = [...unique.values()].sort((a, b) => {
    const severityWeight: Record<string, number> = { high: 0, critical: 0, medium: 1, low: 2 }
    return (severityWeight[a.severity] ?? 3) - (severityWeight[b.severity] ?? 3)
      || Number(a.chapter_no || 999999) - Number(b.chapter_no || 999999)
      || String(b.created_at || '').localeCompare(String(a.created_at || ''))
  })
  return {
    project_id: project.id,
    summary: {
      total: annotations.length,
      open: annotations.filter(item => item.status !== 'resolved').length,
      resolved: annotations.filter(item => item.status === 'resolved').length,
      high: annotations.filter(item => item.status !== 'resolved' && ['high', 'critical'].includes(item.severity)).length,
      medium: annotations.filter(item => item.status !== 'resolved' && item.severity === 'medium').length,
      low: annotations.filter(item => item.status !== 'resolved' && item.severity === 'low').length,
    },
    annotations,
    generated_at: new Date().toISOString(),
  }
}

const DELIVERY_RISK_ANNOTATION_CATEGORIES = new Set([
  'approval_blocker',
  'delivery_core',
  'reader_expectation',
  'target_reader',
  'genre_positioning',
  'female_audience',
  'upgrade_rhythm',
  'chapter_structure',
  'chapter_progression',
  'information_load',
  'longform_continuity',
  'core_contract',
  'continuity_heat',
  'revision_receipt',
  'deslop_repair',
  'prose_meta',
  'serial_risk_repair',
  'chapter_hook_quality',
  'reader_retention',
  'chapter_attraction',
  'story_drive',
  'character_arc',
  'style_sample',
  'reader_payoff',
  'volume_beat',
  'signature_scene',
  'scene_card_receipt',
  'deslop_repair_receipt',
  'revision_cascade_impact',
  'revision_scope_guard',
  'prose_revision_receipt',
  'quality_audit_repair_receipt',
  'quality_audit',
  'source_readiness',
  'state_tracking',
  'style_boundary',
  'information_flow',
  'expectation_threshold',
  'story_loop',
  'emotional_arc',
  'chapter_hook',
  'paragraph_hook',
  'suspense',
  'asset_linkage',
  'dialogue',
  'plot_dynamics',
  'character_relation',
  'character_behavior',
  'conflict_structure',
  'bridge_unit',
  'reversal',
  'showdown',
  'opening',
  'prose_craft',
  'punctuation_tone',
  'content_rubric',
  'intent_confirmation',
  'benchmark_recall',
  'runway',
  'recovery_evidence',
  'innovation',
  'storyline',
  'story_unit',
  'readability',
])

function deliveryRiskAnnotationPriority(annotation: any) {
  const category = String(annotation?.category || '')
  const order: Record<string, number> = {
    approval_blocker: 0,
    delivery_core: 1,
    content_rubric: 2,
    target_reader: 3,
    genre_positioning: 4,
    female_audience: 5,
    upgrade_rhythm: 6,
    chapter_structure: 7,
    chapter_progression: 8,
    information_load: 9,
    longform_continuity: 10,
    core_contract: 11,
    continuity_heat: 12,
    revision_receipt: 13,
    deslop_repair: 14,
    prose_meta: 15,
    serial_risk_repair: 16,
    chapter_hook_quality: 17,
    runway: 18,
    recovery_evidence: 19,
    story_unit: 20,
    signature_scene: 21,
    scene_card_receipt: 22,
    deslop_repair_receipt: 23,
    revision_cascade_impact: 21,
    revision_scope_guard: 22,
    prose_revision_receipt: 23,
    quality_audit_repair_receipt: 20,
    quality_audit: 21,
    source_readiness: 22,
    state_tracking: 23,
    style_boundary: 24,
    information_flow: 25,
    expectation_threshold: 26,
    story_loop: 27,
    emotional_arc: 28,
    chapter_hook: 29,
    paragraph_hook: 30,
    suspense: 31,
    asset_linkage: 32,
    dialogue: 33,
    plot_dynamics: 34,
    character_relation: 35,
    character_behavior: 36,
    conflict_structure: 37,
    bridge_unit: 38,
    reversal: 39,
    showdown: 40,
    opening: 41,
    prose_craft: 42,
    punctuation_tone: 43,
    intent_confirmation: 44,
    benchmark_recall: 45,
    reader_expectation: 46,
    volume_beat: 47,
    reader_retention: 48,
    chapter_attraction: 49,
    story_drive: 50,
    character_arc: 51,
    style_sample: 52,
    reader_payoff: 53,
    innovation: 54,
    storyline: 44,
    readability: 45,
  }
  return order[category] ?? 99
}

function isResolvedTaskStatus(value: any) {
  return ['resolved', 'done', 'completed', 'success', 'closed'].includes(String(value || '').trim().toLowerCase())
}

function existingReviewAnnotationRepairKeys(runs: any[]) {
  const keys = new Set<string>()
  for (const run of runs || []) {
    if (run?.run_type !== 'longform_production_repair') continue
    const payload = parseJsonLikePayload(run.output_ref) || {}
    const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
    for (const task of tasks) {
      if (task?.source !== 'review_annotation_risk') continue
      if (isResolvedTaskStatus(task?.task_status || task?.status)) continue
      const key = String(task.annotation_key || '').trim()
      if (key) keys.add(key)
    }
  }
  return keys
}

function existingStorylineDiffDecisionTaskKeys(runs: any[]) {
  const keys = new Set<string>()
  for (const run of runs || []) {
    if (run?.run_type !== 'longform_production_repair') continue
    const payload = parseJsonLikePayload(run.output_ref) || {}
    const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
    for (const task of tasks) {
      if (task?.source !== 'storyline_diff_decision') continue
      if (isResolvedTaskStatus(task?.task_status || task?.status)) continue
      const key = String(task.decision_key || '').trim()
      if (key) keys.add(key)
    }
  }
  return keys
}

function annotationTaskTitle(annotation: any) {
  const chapterNo = Number(annotation.chapter_no || 0)
  const prefix = chapterNo > 0 ? `第${chapterNo}章` : '章节'
  return `${prefix}《${annotation.title || annotation.source_label || '交稿风险'}》修复`
}

export function buildReviewAnnotationRepairTasks(annotations: any[], runs: any[] = [], options: any = {}) {
  const existingKeys = existingReviewAnnotationRepairKeys(runs)
  const tasks: any[] = []
  let skippedExisting = 0
  let skippedResolved = 0
  const limit = Math.max(1, Math.min(120, Number(options.limit || 60)))

  for (const annotation of annotations || []) {
    if (!DELIVERY_RISK_ANNOTATION_CATEGORIES.has(String(annotation?.category || ''))) continue
    if (annotation.status === 'resolved') {
      skippedResolved += 1
      continue
    }
    const annotationKey = String(annotation.key || '').trim()
    if (annotationKey && existingKeys.has(annotationKey)) {
      skippedExisting += 1
      continue
    }
    const isApprovalBlocker = String(annotation.category || '') === 'approval_blocker'
    const isSceneCardReceipt = String(annotation.category || '') === 'scene_card_receipt'
    const isDeslopRepairReceipt = String(annotation.category || '') === 'deslop_repair_receipt'
    const isRevisionCascadeImpact = String(annotation.category || '') === 'revision_cascade_impact'
    const isRevisionScopeGuard = String(annotation.category || '') === 'revision_scope_guard'
    const isProseRevisionReceipt = String(annotation.category || '') === 'prose_revision_receipt'
    const isQualityAuditRepairReceipt = String(annotation.category || '') === 'quality_audit_repair_receipt'
    const isQualityAudit = String(annotation.category || '') === 'quality_audit'
    const isSourceReadiness = String(annotation.category || '') === 'source_readiness'
    const isStateTracking = String(annotation.category || '') === 'state_tracking'
    const isStyleBoundary = String(annotation.category || '') === 'style_boundary'
    const isInformationFlow = String(annotation.category || '') === 'information_flow'
    const isExpectationThreshold = String(annotation.category || '') === 'expectation_threshold'
    const isStoryLoop = String(annotation.category || '') === 'story_loop'
    const isEmotionalArc = String(annotation.category || '') === 'emotional_arc'
    const isChapterHook = String(annotation.category || '') === 'chapter_hook'
    const isParagraphHook = String(annotation.category || '') === 'paragraph_hook'
    const isSuspense = String(annotation.category || '') === 'suspense'
    const isAssetLinkage = String(annotation.category || '') === 'asset_linkage'
    const isDialogue = String(annotation.category || '') === 'dialogue'
    const isPlotDynamics = String(annotation.category || '') === 'plot_dynamics'
    const isCharacterRelation = String(annotation.category || '') === 'character_relation'
    const isCharacterBehavior = String(annotation.category || '') === 'character_behavior'
    const isConflictStructure = String(annotation.category || '') === 'conflict_structure'
    const isBridgeUnit = String(annotation.category || '') === 'bridge_unit'
    const isReversal = String(annotation.category || '') === 'reversal'
    const isShowdown = String(annotation.category || '') === 'showdown'
    const isOpening = String(annotation.category || '') === 'opening'
    const isProseCraft = String(annotation.category || '') === 'prose_craft'
    const isPunctuationTone = String(annotation.category || '') === 'punctuation_tone'
    const isContentRubric = String(annotation.category || '') === 'content_rubric'
    const isTargetReader = String(annotation.category || '') === 'target_reader'
    const isGenrePositioning = String(annotation.category || '') === 'genre_positioning'
    const isFemaleAudience = String(annotation.category || '') === 'female_audience'
    const isUpgradeRhythm = String(annotation.category || '') === 'upgrade_rhythm'
    const isChapterStructure = String(annotation.category || '') === 'chapter_structure'
    const isChapterProgression = String(annotation.category || '') === 'chapter_progression'
    const isInformationLoad = String(annotation.category || '') === 'information_load'
    const isLongformContinuity = String(annotation.category || '') === 'longform_continuity'
    const isCoreContract = String(annotation.category || '') === 'core_contract'
    const isContinuityHeat = String(annotation.category || '') === 'continuity_heat'
    const isRevisionReceipt = String(annotation.category || '') === 'revision_receipt'
    const isDeslopRepair = String(annotation.category || '') === 'deslop_repair'
    const isProseMeta = String(annotation.category || '') === 'prose_meta'
    const isSerialRiskRepair = String(annotation.category || '') === 'serial_risk_repair'
    const isChapterHookQuality = String(annotation.category || '') === 'chapter_hook_quality'
    const isReaderRetentionCheck = String(annotation.category || '') === 'reader_retention'
      && String(annotation.kind || '') === 'reader_retention_gap'
    const isIntentConfirmation = String(annotation.category || '') === 'intent_confirmation'
    const isBenchmarkRecall = String(annotation.category || '') === 'benchmark_recall'
    tasks.push({
      task_type: 'repair_quality',
      issue_type: String(annotation.kind || annotation.source || 'delivery_risk'),
      severity: annotation.severity || 'medium',
      chapter_id: annotation.chapter_id || null,
      chapter_no: Number(annotation.chapter_no || 0) || null,
      title: annotationTaskTitle(annotation),
      message: annotation.message || annotation.title || '交稿风险需要处理。',
      action: annotation.action || '按交稿风险批注修订正文，补回核心、追读、回报、创新、剧情线或可读性缺口。',
      acceptance_criteria: [
        ...(isApprovalBlocker ? ['入库阻断已经解除，章节可重新进入验收或入库'] : []),
        ...(isSceneCardReceipt ? [
          '场景回执复检清零，scene_card_receipt 相关质量检查不再失败',
          '对应场景的 scene_start_anchor、scene_end_anchor 和 scene_card_receipts 已按修订后正文重写',
          'scene_card_receipts.evidence 可在对应场景正文定位，且不得借用其他场景证据',
        ] : []),
        ...(isDeslopRepairReceipt ? [
          'deslop_repair_receipt_sync 复检通过，missed_count=0',
          'deslop_repair_receipts 逐条对应 deslop_checks 或 story-deslop Gate A-G 原 fail/warn 项',
          'deslop_repair_receipts.changed_evidence 能在修订后正文定位',
        ] : []),
        ...(isRevisionCascadeImpact ? [
          'revision_cascade_impact_sync 复检通过，missed_count=0',
          '后续章节已同步修订后的伏笔、时间线、角色状态、资产归属或关系边界',
          'revision_receipts.cascade_impacts 的 evidence/source_excerpt 能定位到修订后正文证据',
        ] : []),
        ...(isRevisionScopeGuard ? [
          'revision_scope_guard_sync 复检通过，missed_count=0',
          '修订前后字数差异回到 max(原文 30%, 800 字) 警戒线内',
          '没有为了润色大幅删掉伏笔、钩子、角色特征、情节推进或必要转折',
        ] : []),
        ...(isProseRevisionReceipt ? [
          'prose_revision_receipt_sync 复检通过，missed_count=0',
          'revision_receipts 逐条对应 delivery_risk_receipts 的失败项',
          '每条 revision_receipts 都写清 required_action、repair_segment、applied_fix 和 changed_evidence',
        ] : []),
        ...(isQualityAuditRepairReceipt ? [
          'quality_audit_repair_receipt_sync 复检通过，missed_count=0',
          'quality_audit_repair_receipts 逐条对应 quality_audit_checks 中原 fail/warn 项',
          'quality_audit_repair_receipts.changed_evidence 能在修订后正文定位',
        ] : []),
        ...(isQualityAudit ? [
          'quality_audit_checks 里的 fail/warn 项已清零',
          '修订说明中写明本章一句话概括、目的词详略、水文压缩、信息流或五维低分项的处理证据',
          '若策略为 rewrite/compress/de_ai/polish，修订稿已按对应策略完成且没有引入新设定漂移',
        ] : []),
        ...(isSourceReadiness ? [
          'source_readiness_checks 复检通过，missed_count=0',
          '角色状态、相关伏笔/前史、世界约束和资产状态已经在正文中可见承接',
          'missing/warn 来源没有被写成既定事实，ready 来源有明确动作、对白、信息变化或状态回填证据',
        ] : []),
        ...(isStateTracking ? [
          'state_tracking_checks 复检通过，missed_count=0',
          '角色状态、伏笔状态、资产归属、关系边界和世界规则已经与正文事实一致',
          '昏迷、失效、未获得、未揭示或受限状态没有被直接写成可用结果',
        ] : []),
        ...(isStyleBoundary ? [
          'style_boundary_checks 复检通过，missed_count=0',
          '过近的参照句式、桥段节奏、套话和模板化表达已经改写为本章动作链和角色口吻',
          '没有复制标杆原句、专有设定、角色名、核心梗或可识别桥段',
        ] : []),
        ...(isInformationFlow ? [
          'information_flow_checks 复检通过，missed_count=0',
          '线索、解释、误判、反转和信息揭示顺序已经跟冲突、动作、选择和代价同步释放',
          '没有提前泄底、补丁式旁白、上下文过载或把关键信息脱离场景冲突单独说明',
        ] : []),
        ...(isExpectationThreshold ? [
          'expectation_threshold_checks 复检通过，missed_count=0',
          '章末已经形成读者必须继续阅读的具体问题、悬念、代价、选择压力或回报承诺',
          '期待不是只靠氛围、旁白或口号维持，而是落到可见事件和下一章追问',
        ] : []),
        ...(isStoryLoop ? [
          'story_loop_checks 复检通过，missed_count=0',
          '本章设问、阻碍、选择、代价、回报和新问题形成可追踪闭环',
          '至少推进一个答案碎片或状态变化，并把残留问题自然挂到下一章',
        ] : []),
        ...(isEmotionalArc ? [
          'emotional_arc_checks 复检通过，missed_count=0',
          '平静、调动、释放、爽感形成可追踪递进，压迫和反制都落到正文现场',
          '关键情绪变化通过动作、对白、旁观反馈、关系反馈或状态变化外化，而不是只靠解释规则或心理总结',
        ] : []),
        ...(isChapterHook ? [
          'chapter_hook_checks 复检通过，missed_count=0',
          '前100字章首钩子和最后约100字章尾翻页钩子都已形成具体问题、压力或行动牵引',
          '钩子有明确兑现路径，没有假悬念、机械降神、低风险钩、过度留白或同类型连用',
        ] : []),
        ...(isParagraphHook ? [
          'paragraph_hook_checks 复检通过，missed_count=0',
          '每3-5段都有信息、风险、情绪或关系变化，关键冲突段落有可指认的微钩子',
          '段落级钩子包含钩子组合、对话情绪递进或围观者层级，不再连续停留在环境、姿态或静态说明',
        ] : []),
        ...(isSuspense ? [
          'suspense_checks 复检通过，missed_count=0',
          '疑问、误导、答案、新期待形成悬念循环',
          '悬念推进落到正文可见信息变化、误判修正、局部答案或新压力，避免假悬念、谜语人拖延和信息延迟过久',
        ] : []),
        ...(isAssetLinkage ? [
          'asset_linkage_checks 复检通过，missed_count=0',
          '关键资产已经绑定功能、归属、触发条件、限制、后果和状态变化',
          '每个资产至少接到本章目标、冲突、回报或章尾钩子之一，设定信息通过使用、质疑、触发、误判或代价反馈释放',
        ] : []),
        ...(isDialogue ? [
          'dialogue_checks 复检通过，missed_count=0',
          '每句对白至少承担推进剧情、增加期待或展示人设之一',
          '潜台词、议程、声线差异、权力博弈、信息嵌入和情绪递进已经落成正文可定位对白或动作反应',
        ] : []),
        ...(isPlotDynamics ? [
          'plot_dynamics_checks 复检通过，missed_count=0',
          '目标、阻碍、行动、代价/反馈、新期待形成可追踪最小剧情循环',
          '假胜、崩解、A/B情绪交替、多线错峰或悬置收尾等原缺口已落成正文可见行动链和状态变化',
        ] : []),
        ...(isCharacterRelation ? [
          'character_relation_checks 复检通过，missed_count=0',
          '关系类型、关系考验/变化、主角独立目标、目标归属、角色不止恋爱和配角主动行动已落成正文证据',
          '主角保留自己的诉求、主动选择和代价，关系线与主角目标形成摩擦、互补或阶段性变化',
        ] : []),
        ...(isCharacterBehavior ? [
          'character_behavior_checks 复检通过，missed_count=0',
          '动机链、动机具体性、主角行为三必须、三层标签反差、人设强关联和展示证据已落成正文',
          '配角功能、反派内在逻辑、反派分量、自我叙事或层级退场等原缺口已补成可定位行动、选择、威胁或代价',
        ] : []),
        ...(isConflictStructure ? [
          'conflict_structure_checks 复检通过，missed_count=0',
          '阻止者、有进无出、退出代价/死亡赌注、黏结剂、行动阻拦和明确胜负结果已落成正文',
          '矛盾网保持2-3条互相关联的矛盾线，解决一条后已激活或加深另一条，并留下下一冲突种子',
        ] : []),
        ...(isBridgeUnit ? [
          'bridge_unit_checks 复检通过，missed_count=0',
          '本章四章一桥段位置、连续期待、目标推进、高潮时长和阶段衔接已经落成正文',
          '兑现旧期待前先挂新期待；章尾有新目标、高潮中埋钩子或连续小期待，疲劳修复不再断档',
        ] : []),
        ...(isReversal ? [
          'reversal_checks 复检通过，missed_count=0',
          '反转类型、至少3处公平暗示、误导技巧、揭示时机和非作弊性已经落成正文',
          '揭示后影响、情绪冲击和打脸节奏可定位，且没有天降反转、作弊新信息或大段解释独白',
        ] : []),
        ...(isShowdown ? [
          'showdown_checks 复检通过，missed_count=0',
          '爽点释放、底牌管理、三压一爆三震、舞台层级、传递通道和震惊分层已经落成正文',
          '战斗/智斗服务爽点，以弱胜强逻辑、三层破局和急-缓-急情绪节奏可定位',
        ] : []),
        ...(isOpening ? [
          'opening_checks 复检通过，missed_count=0',
          '300字内主角登场，1000字内出现爽点、危机或明确期待点',
          '开头五要诀（简单、不偏、快、爽、不平）已落成正文，且删除大段背景、纯天气风景、序章楔子和详细世界观',
        ] : []),
        ...(isProseCraft ? [
          'prose_craft_checks 复检通过，missed_count=0',
          '深度限知、身体细节、环境交互、镜头对象、一动一静和道具/数字功能已落成正文',
          '删除上帝视角、全场/所有人远景概括、连续内心独白、堆叠式描写、抽象心理总结和胶水词过渡',
        ] : []),
        ...(isPunctuationTone ? [
          'punctuation_tone_checks 复检通过，missed_count=0',
          '标点服务质问、试探、爆发、迟疑、信息揭示和人物声线，不再通篇句号化或随机堆砌',
          '删除省略号/破折号硬停顿、论文式长分号链和同质化语气，用动作打断、换行、短句或冒号落点承接',
        ] : []),
        ...(isContentRubric ? [
          'content_rubric_checks 复检通过，missed_count=0',
          '正文已经回答黄金三问：读者为什么翻下一页、本章改变了什么、哪个正文证据支持判断',
          '核心卖点、冲突推进、情绪曲线、角色动机、最小剧情循环、高潮构建和章末期待已落成可定位正文证据',
        ] : []),
        ...(isTargetReader ? [
          'target_reader_checks 复检通过，missed_count=0',
          '目标读者画像、读者渴望、平台口味、本章命中点和可见读者回报已经落成正文证据',
          '核心痛苦、深层情结、高频情绪关键词和未满足需求已经写成冲突压力、角色选择、即时反馈或尊严/安全感/掌控感补偿',
          '修订稿通过 oh-story 自嗨判定法：写给谁看、读者想看什么、本章给了什么，三问都有正文证据',
        ] : []),
        ...(isGenrePositioning ? [
          'genre_positioning_checks 复检通过，missed_count=0',
          '题材标签、核心梗、类型公式、金手指贴合、必备场景和平台适配已经落成正文证据',
          '题材长板被强化而不是补短板稀释核心卖点，同一卖点至少扩成 3 个角度的正文证据',
          '书名简介正文三位一体：正文兑现书名/简介承诺，没有挂羊头卖狗肉或微创新过量',
        ] : []),
        ...(isFemaleAudience ? [
          'female_audience_checks 复检通过，missed_count=0',
          '安全感、代入感、女主主动性、主情绪和平台对位已经落成正文证据',
          '女主自己做决定、自己推进，并在关键节点承担代价或获得被认可、被珍视、被尊重的回馈',
          '感情线双轴踩在事业/成长节点上，虐后有反转或糖，货板与书名简介正文保持一致',
        ] : []),
        ...(isUpgradeRhythm ? [
          'upgrade_rhythm_checks 复检通过，missed_count=0',
          '升级前压制、升级后变化、即时反馈、延迟反馈和新门槛已经落成正文可定位证据',
          '金手指功能、触发条件、奖励、限制和升级规则足够简单，读者能从动作反馈中一眼看懂',
          '升级不是只给奖励，而是同时带来资格变化、能力边界、多维成长或排行榜/层级压力',
        ] : []),
        ...(isChapterStructure ? [
          'structure_checks 复检通过，missed_count=0',
          '开头钩子、中段推进、局势变化和章尾翻页已经落成正文可定位证据',
          '结尾落到新的发现、危机、选择或反转，而不是复述、解释或总结',
        ] : []),
        ...(isChapterProgression ? [
          'progression_checks 复检通过，missed_count=0',
          '修订稿能证明删掉这章会影响理解，至少留下证据、选择、代价、关系变化、设定位移或主线位移之一',
          '等待、旧设定复述、原地解释和不改变局势的段落已经压缩或改造成行动推进',
        ] : []),
        ...(isInformationLoad ? [
          'information_checks 复检通过，missed_count=0',
          '新概念压缩到 3 个以内，设定信息通过行动、质疑、触发、证据核对或冲突反馈释放',
          '没有在行动前大段解释规则，信息传递跟着冲突和角色目标走',
        ] : []),
        ...(isLongformContinuity ? [
          'longform_checks 复检通过，missed_count=0',
          '最近 5 章进展、爽点间隔、阶段目标和下一阶段牵引已经在正文或修订说明中可定位',
          '本章承接前文状态并推动后续，不再连续多章只解释背景或原地等待',
        ] : []),
        ...(isCoreContract ? [
          'core_contract_checks 复检通过，missed_count=0',
          '全书核心承诺、主线服务、不得漂移红线和主题统一已经落成正文可定位证据',
          '小情绪服从全书核心情绪，章尾问题回到主线推进、规则判定、角色选择或读者承诺',
        ] : []),
        ...(isContinuityHeat ? [
          'continuity_heat_checks 复检通过，missed_count=0',
          'hot 元素推进、warm 元素保温、cold 回收前升温、archived 休眠边界已经落成正文证据',
          '伏笔、关系和期待不再只点名不推进，也没有用未升温的冷线突然解题',
        ] : []),
        ...(isRevisionReceipt ? [
          'revision_receipt_checks 复检通过，missed_count=0',
          'revision_receipts 逐条对应 delivery_risk_receipts、prose revision 要求或本次修订风险',
          '每条 revision_receipts 都包含 required_action、repair_segment、applied_fix 和可定位的 changed_evidence',
        ] : []),
        ...(isDeslopRepair ? [
          'deslop_repair_checks 复检通过，missed_count=0',
          'story-deslop Gate A-G 原 fail/warn 残留已经逐条回修',
          'deslop_repair_receipts.changed_evidence 能在修订后正文中定位到对白、动作、描写或叙述变化',
        ] : []),
        ...(isProseMeta ? [
          'prose_meta_checks 复检通过，missed_count=0',
          '正文中的作者说明、创作术语、章节意图旁白和元叙事提示已经删除',
          '原本的铺垫、伏笔或反转说明已经改成角色现场证据、误判、行动后果或信息变化',
        ] : []),
        ...(isSerialRiskRepair ? [
          'serial_risk_repair_checks 复检通过，missed_count=0',
          'scene_serial_risk_repair_receipt 或连续生产风险修复回执已经补齐',
          '场景承接变化、状态变化或风险解除证据能在修订后正文定位',
        ] : []),
        ...(isChapterHookQuality ? [
          'chapter_hook_quality_checks 复检通过，missed_count=0',
          '章首和章尾都已经形成现场触发的具体问题、压力、选择或行动牵引',
          '章尾钩子和下一章行动直接相连，没有只用总结、氛围或空泛预告收束',
        ] : []),
        ...(isReaderRetentionCheck ? [
          'reader_retention_checks 复检通过，missed_count=0',
          '前300字钩子、可见爽点、信息缺口和章末追读已经落成正文可定位证据',
          '留存双引擎的情绪 + 饥饿同时落地：情绪快速代入，饥饿用信息差植入问号并剥洋葱卡住关键信息',
          'Hook上瘾模型的触发、行动、奖励、投入已经形成闭环，奖励随机性和沉没投入有正文证据',
        ] : []),
        ...(isIntentConfirmation ? [
          'intent_confirmation_checks 或写前执行回执复检通过，missed_count=0',
          '情绪目标、章节意图、关键承接和章尾推动力已落成正文可见事件或状态变化',
          'oh_story_delivery_receipts.delivery_risk_receipts 或 pre_draft_execution_receipts 引用修订后正文证据',
        ] : []),
        ...(isBenchmarkRecall ? [
          'benchmark_recall_checks 或文风召回回执复检通过，missed_count=0',
          '对标模块、节奏参照、对白比例、动作链和情绪转折已在正文中兑现',
          '没有复制参照文本原句、桥段、专有设定、角色名或核心梗',
        ] : []),
        '修订后重新运行章节质量复检，质量分不低于78',
        '重新同步故事状态，确认核心、追读、回报、创新、剧情线和可读性风险没有新增',
        '交稿风险批注标记为已处理，或风险收敛复盘显示该风险清零',
      ],
      task_status: 'open',
      source: 'review_annotation_risk',
      annotation_key: annotationKey,
      annotation_source: annotation.source,
      annotation_category: annotation.category,
      source_label: annotation.source_label,
      review_id: annotation.review_id || null,
      created_from_annotation_at: annotation.created_at || '',
      payload: annotation.payload || {},
      ...(isSourceReadiness ? { source_readiness_sync: annotation.payload || {} } : {}),
      ...(isStateTracking ? { state_tracking_sync: annotation.payload || {} } : {}),
      ...(isStyleBoundary ? { style_boundary_sync: annotation.payload || {} } : {}),
      ...(isInformationFlow ? { information_flow_sync: annotation.payload || {} } : {}),
      ...(isExpectationThreshold ? { expectation_threshold_sync: annotation.payload || {} } : {}),
      ...(isStoryLoop ? { story_loop_sync: annotation.payload || {} } : {}),
      ...(isEmotionalArc ? { emotional_arc_sync: annotation.payload || {} } : {}),
      ...(isChapterHook ? { chapter_hook_sync: annotation.payload || {} } : {}),
      ...(isParagraphHook ? { paragraph_hook_sync: annotation.payload || {} } : {}),
      ...(isSuspense ? { suspense_sync: annotation.payload || {} } : {}),
      ...(isAssetLinkage ? { asset_linkage_sync: annotation.payload || {} } : {}),
      ...(isDialogue ? { dialogue_sync: annotation.payload || {} } : {}),
      ...(isPlotDynamics ? { plot_dynamics_sync: annotation.payload || {} } : {}),
      ...(isCharacterRelation ? { character_relation_sync: annotation.payload || {} } : {}),
      ...(isCharacterBehavior ? { character_behavior_sync: annotation.payload || {} } : {}),
      ...(isConflictStructure ? { conflict_structure_sync: annotation.payload || {} } : {}),
      ...(isBridgeUnit ? { bridge_unit_sync: annotation.payload || {} } : {}),
      ...(isReversal ? { reversal_sync: annotation.payload || {} } : {}),
      ...(isShowdown ? { showdown_sync: annotation.payload || {} } : {}),
      ...(isOpening ? { opening_sync: annotation.payload || {} } : {}),
      ...(isProseCraft ? { prose_craft_sync: annotation.payload || {} } : {}),
      ...(isPunctuationTone ? { punctuation_tone_sync: annotation.payload || {} } : {}),
      ...(isContentRubric ? { content_rubric_sync: annotation.payload || {} } : {}),
      ...(isTargetReader ? { target_reader_sync: annotation.payload || {} } : {}),
      ...(isGenrePositioning ? { genre_positioning_sync: annotation.payload || {} } : {}),
      ...(isFemaleAudience ? { female_audience_sync: annotation.payload || {} } : {}),
      ...(isUpgradeRhythm ? { upgrade_rhythm_sync: annotation.payload || {} } : {}),
      ...(isChapterStructure ? { chapter_structure_sync: annotation.payload || {} } : {}),
      ...(isChapterProgression ? { chapter_progression_sync: annotation.payload || {} } : {}),
      ...(isInformationLoad ? { information_load_sync: annotation.payload || {} } : {}),
      ...(isLongformContinuity ? { longform_continuity_sync: annotation.payload || {} } : {}),
      ...(isCoreContract ? { core_contract_check_sync: annotation.payload || {} } : {}),
      ...(isContinuityHeat ? { continuity_heat_sync: annotation.payload || {} } : {}),
      ...(isRevisionReceipt ? { revision_receipt_check_sync: annotation.payload || {} } : {}),
      ...(isDeslopRepair ? { deslop_repair_check_sync: annotation.payload || {} } : {}),
      ...(isProseMeta ? { prose_meta_sync: annotation.payload || {} } : {}),
      ...(isSerialRiskRepair ? { serial_risk_repair_sync: annotation.payload || {} } : {}),
      ...(isChapterHookQuality ? { chapter_hook_quality_sync: annotation.payload || {} } : {}),
      ...(isReaderRetentionCheck ? { reader_retention_check_sync: annotation.payload || {} } : {}),
      ...(isIntentConfirmation ? { intent_confirmation_sync: annotation.payload || {} } : {}),
      ...(isBenchmarkRecall ? { benchmark_recall_sync: annotation.payload || {} } : {}),
      ...(String(annotation.kind || annotation.source || '') === 'recovery_evidence_mismatch'
        ? { recovery_evidence_review: annotation.payload || {} }
        : {}),
    })
  }

  tasks.sort((a, b) => deliveryRiskAnnotationPriority({ category: a.annotation_category }) - deliveryRiskAnnotationPriority({ category: b.annotation_category })
    || String(b.created_from_annotation_at || '').localeCompare(String(a.created_from_annotation_at || '')))

  return {
    tasks: tasks.slice(0, limit),
    total_candidates: tasks.length,
    skipped_existing: skippedExisting,
    skipped_resolved: skippedResolved,
  }
}

export function buildStorylineDiffDecisionRepairTasks(reviews: any[], runs: any[] = [], options: any = {}) {
  const existingKeys = existingStorylineDiffDecisionTaskKeys(runs)
  const tasks: any[] = []
  let skippedExisting = 0
  let skippedIgnored = 0
  const limit = Math.max(1, Math.min(120, Number(options.limit || 60)))

  for (const review of reviews || []) {
    if (review?.review_type !== 'storyline_diff_decision') continue
    const payload = parseJsonLikePayload(review.payload) || {}
    const decision = String(payload.decision || '').trim()
    const decisionKey = String(payload.decision_key || '').trim()
    if (!decisionKey) continue
    if (decision === 'false_positive') {
      skippedIgnored += 1
      continue
    }
    if (!['revise_prose', 'accept_as_plan'].includes(decision)) continue
    if (existingKeys.has(decisionKey)) {
      skippedExisting += 1
      continue
    }
    const chapterNo = Number(payload.chapter_no || 0) || null
    const entityName = compactAuditText(payload.entity_name || '未命名剧情线', 120)
    const summary = compactAuditText(payload.summary || review.summary || '剧情线差异需要处理。', 500)
    const isPlanSync = decision === 'accept_as_plan'
    tasks.push({
      task_type: isPlanSync ? 'repair_assets' : 'repair_quality',
      issue_type: isPlanSync ? 'storyline_diff_accept_as_plan' : 'storyline_diff_revise_prose',
      severity: isPlanSync ? 'medium' : 'high',
      chapter_id: Number(payload.chapter_id || 0) || null,
      chapter_no: chapterNo,
      title: `${chapterNo ? `第${chapterNo}章` : '章节'}《${entityName}》${isPlanSync ? '同步计划' : '回修正文'}`,
      message: summary,
      action: isPlanSync
        ? `接受为新计划：打开资料设定，把“${entityName}”的额外推进写入剧情线计划，并调整后续章节承接。`
        : `回修正文：按已记录决策修订第${chapterNo || '-'}章，把“${entityName}”的计划推进写成可见行动、状态变化或结果回收。`,
      acceptance_criteria: isPlanSync
        ? [
          '资料设定或大纲已纳入这次额外推进，并明确后续承接章节',
          '重新运行剧情线同步复盘，确认该推进不再作为计划外风险出现',
          '确认新计划不破坏全书核心承诺、禁揭边界和当前卷爆点节奏',
        ]
        : [
          '修订后重新运行章节质量复检，质量分不低于78',
          '修订后重新运行剧情线同步复盘，确认漏推或禁揭风险清零',
          '重新同步故事状态，确认主线、伏笔和禁揭边界没有新增偏移',
        ],
      task_status: 'open',
      source: 'storyline_diff_decision',
      decision_key: decisionKey,
      decision,
      decision_label: payload.decision_label || (isPlanSync ? '接受为新计划' : '回修正文'),
      entity_id: Number(payload.entity_id || 0) || null,
      entity_name: entityName,
      entity_type: compactAuditText(payload.entity_type, 80),
      risk_type: compactAuditText(payload.risk_type, 80),
      risk_label: compactAuditText(payload.risk_label, 80),
      review_id: review.id || null,
      created_from_decision_at: review.created_at || payload.decided_at || '',
      payload,
    })
  }

  tasks.sort((a, b) => (a.decision === 'revise_prose' ? 0 : 1) - (b.decision === 'revise_prose' ? 0 : 1)
    || Number(a.chapter_no || 999999) - Number(b.chapter_no || 999999)
    || String(b.created_from_decision_at || '').localeCompare(String(a.created_from_decision_at || '')))

  return {
    tasks: tasks.slice(0, limit),
    total_candidates: tasks.length + skippedExisting,
    skipped_existing: skippedExisting,
    skipped_ignored: skippedIgnored,
  }
}
