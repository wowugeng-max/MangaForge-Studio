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
      const { appendProseQualityReviewAnnotations } = require('./builders-annotations-prose-quality') as typeof import('./builders-annotations-prose-quality')
      appendProseQualityReviewAnnotations({
        review,
        payload,
        items,
        statuses,
        resolveChapter,
        pushReviewIssues,
        pushDeliveryRiskAnnotation,
      })
      continue
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

export * from './builders-annotations-delivery-risk'
export * from './builders-annotations-repair-tasks'
export * from './builders-annotations-prose-quality'
