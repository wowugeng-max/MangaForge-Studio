import {
  type AnyRecord,
  arrayValue,
  firstText,
  objectValue,
  text,
} from './utils'
import {
  type AnyRecord,
  arrayValue,
  firstText,
  objectValue,
  text,
} from './utils'
import {
  approvalBlockerNeedsNextChapterQualityPlan,
  compactChapterNosForPrompt,
  deliveryRiskReceiptSegmentRepairLines,
  isSingleChapterRecoveryEvidenceTask,
  metricNumber,
  normalizeApprovalBlockerRepairContext,
  normalizeBatchPlanContext,
  normalizeDefaultFiveChapterLaneTemplateRedesignQueue,
  normalizeDefaultFiveChapterLaneTemplateRepair,
  normalizeDeliveryRiskContext,
  normalizeDeslopRepairReceiptRepair,
  normalizeExpansionStructureValidationTrend,
  normalizePostBatchQualityRepair,
  normalizePostDeliveryQualityRepair,
  normalizeProseRevisionReceiptSyncRepair,
  normalizeQualityAuditRepair,
  normalizeQualityAuditRepairReceiptRepair,
  normalizeRecoveryEvidenceReview,
  normalizeRevisionCascadeImpactRepair,
  normalizeRevisionContextReceiptRepair,
  normalizeRevisionScopeGuardRepair,
  normalizeSceneCardDirectiveRepair,
  normalizeSceneCardReceiptRepair,
  repairTaskIssueType,
  summarizeEvidenceItem,
  summarizeKeyValueFlags,
} from './support'
import { appendRepairTaskQualitySyncPromptLines } from './prompt-lines-quality'

type RepairPromptContext = {
  task: AnyRecord
  run?: AnyRecord | null
  [key: string]: any
}

/** Build revision prompt text from already-normalized repair task context. */
export function buildRepairTaskRevisionPromptText(ctx: RepairPromptContext): string {
  const {
    task,
    run,
    taskIssueType,
    taskCategory,
    batchPlan,
    chapterPlan,
    recoveryEvidenceReview,
    singleChapterRecoveryEvidence,
    deliveryRisk,
    sceneCardReceiptRepair,
    sceneCardDirectiveRepair,
    deslopRepairReceiptRepair,
    revisionCascadeImpactRepair,
    revisionScopeGuardRepair,
    revisionContextReceiptRepair,
    proseRevisionReceiptSyncRepair,
    qualityAuditRepairReceiptRepair,
    qualityAuditRepair,
    approvalBlocker,
    serialRhythmReview,
    postBatchQualityRepair,
    postDeliveryQualityRepair,
    volumeSegmentReview,
    readerPullReview,
    innovationReview,
    chapterAttractionReview,
    storyDriveSync,
    wordCountSync,
    characterArcSync,
    chapterBenchmarkSync,
    styleSampleSync,
    sourceReadinessSync,
    stateTrackingSync,
    storyStateUpdateSync,
    styleBoundarySync,
    informationFlowSync,
    expectationThresholdSync,
    storyLoopSync,
    emotionalArcSync,
    chapterHookSync,
    paragraphHookSync,
    suspenseSync,
    assetLinkageSync,
    dialogueSync,
    plotDynamicsSync,
    characterRelationSync,
    characterBehaviorSync,
    conflictStructureSync,
    bridgeUnitSync,
    reversalSync,
    showdownSync,
    openingSync,
    proseCraftSync,
    punctuationToneSync,
    contentRubricSync,
    targetReaderSync,
    genrePositioningSync,
    femaleAudienceSync,
    upgradeRhythmSync,
    chapterStructureSync,
    chapterProgressionSync,
    informationLoadSync,
    longformContinuitySync,
    titleUniquenessSync,
    coreContractCheckSync,
    continuityHeatSync,
    revisionReceiptCheckSync,
    deslopRepairCheckSync,
    proseMetaSync,
    bannedWordsSync,
    blueprintConsumptionSync,
    foreshadowingDeltaSync,
    deterministicCleanupSync,
    serialRiskRepairSync,
    chapterHookQualitySync,
    readerRetentionCheckSync,
    intentConfirmationSync,
    writePreparationSync,
    benchmarkRecallSync,
    nextChapterQualityPlanReceiptPayload,
    nextChapterQualityPlanReceiptSync,
    readerTrialReview,
    first30Retention,
    expansionStructureReview,
    expansionStructureDecisionReview,
  } = ctx

  const lines = [
    '本次修订来自任务中心的商业留存/质检修复任务。',
    task.segment ? `分段：${task.segment}` : '',
    firstText(task.issue_type, task.issueType, taskIssueType, deliveryRisk?.issue_type) ? `问题类型：${firstText(task.issue_type, task.issueType, taskIssueType, deliveryRisk?.issue_type)}` : '',
    task.message ? `问题：${task.message}` : '',
    task.action ? `修复动作：${task.action}` : '',
    Array.isArray(task.acceptance_criteria) ? `验收标准：${task.acceptance_criteria.join('；')}` : '',
  ]
  if (batchPlan) {
    lines.push(
      '【批次任务书兑现】',
      batchPlan.batch_goal ? `本批目标：${batchPlan.batch_goal}` : '',
      batchPlan.reader_payoff_plan ? `读者回报：${batchPlan.reader_payoff_plan}` : '',
      batchPlan.mainline_focus ? `主线焦点：${batchPlan.mainline_focus}` : '',
      batchPlan.forbidden_boundary ? `禁抢跑边界：${batchPlan.forbidden_boundary}` : '',
      chapterPlan?.chapter_task ? `本章职责：${chapterPlan.chapter_task}` : '',
      chapterPlan?.conflict ? `本章冲突：${chapterPlan.conflict}` : '',
      chapterPlan?.mainline_progress ? `本章主线进度：${chapterPlan.mainline_progress}` : '',
      chapterPlan?.ending_hook ? `章末钩子：${chapterPlan.ending_hook}` : '',
      '修订要求：只补齐本章漏兑现内容，不新增长期方向，不提前揭示禁抢跑边界。',
    )
  }
  if (recoveryEvidenceReview) {
    if (singleChapterRecoveryEvidence) {
      lines.push(
        '【单章恢复依据回修】',
        recoveryEvidenceReview.summary ? `治理复查记忆：${recoveryEvidenceReview.summary}` : '治理复查记忆：本章需要继承上一轮恢复依据。',
        ...recoveryEvidenceReview.rows.flatMap(item => [
          item.evidence ? `失效依据：${item.evidence}` : '',
          item.riskLabels.length > 0 ? `对应风险：${item.riskLabels.join('；')}` : '',
        ]),
        recoveryEvidenceReview.allEvidence.length > 0 ? `全部恢复依据：${recoveryEvidenceReview.allEvidence.slice(0, 6).join('；')}` : '',
        recoveryEvidenceReview.watchItems.length > 0 ? `仍需观察：${recoveryEvidenceReview.watchItems.slice(0, 6).join('；')}` : '',
        '修订要求：逐项把失效依据和观察项改成本章正文可见的冲突推进、对白执行、读者回报或剧情线动作。',
        '修订后必须重新运行单章治理复查 / governance_recheck_sync，确认 status 为 ok、failed_evidence 为空，再关闭任务。',
      )
    } else {
      lines.push(
        '【恢复依据失效回修】',
        recoveryEvidenceReview.summary ? `复盘结论：${recoveryEvidenceReview.summary}` : '',
        ...recoveryEvidenceReview.rows.flatMap(item => [
          item.evidence ? `失效依据：${item.evidence}` : '',
          item.riskLabels.length > 0 ? `对应风险：${item.riskLabels.join('；')}` : '',
        ]),
        recoveryEvidenceReview.allEvidence.length > 0 ? `全部恢复依据：${recoveryEvidenceReview.allEvidence.slice(0, 6).join('；')}` : '',
        '修订要求：逐项把失效依据改成正文可见的兑现结果，优先补样章执行、读者回报、主线/剧情线和批次任务书承诺。',
        '修订后必须重新运行批次交稿复盘，确认 recovery_evidence_review.status 为 ok、failed_evidence 为空，再关闭任务。',
      )
    }
  }
  if (serialRhythmReview) {
    lines.push(
      '【连载节奏疲劳】',
      serialRhythmReview.score !== undefined ? `节奏评分：${serialRhythmReview.score}` : '',
      Array.isArray(serialRhythmReview.risks) && serialRhythmReview.risks.length > 0 ? `重复风险：${serialRhythmReview.risks.join('；')}` : '',
      Array.isArray(serialRhythmReview.evidence) && serialRhythmReview.evidence.length > 0 ? `批次证据：${serialRhythmReview.evidence.join('；')}` : '',
      '修订要求：必须轮换冲突来源、读者回报、章末追读问题和可视化场面；保留本章主线职责，但删改重复的压迫方式、重复打脸方式和重复章末悬念。',
    )
  }
  if (titleUniquenessSync) {
    const missed = arrayValue(titleUniquenessSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(titleUniquenessSync.next_actions || titleUniquenessSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【标题去重修复】',
      firstText(titleUniquenessSync.label) ? `标题结论：${firstText(titleUniquenessSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按本章核心事件重新命名重复章节，标题必须能指向本章独有冲突、物件、选择、反转或章末钩子。',
      '同步要求：同步细纲标题与正文文件名，必要时同步正文标题行；不得只改任务说明、展示标题或章节正文第一行。',
      '输出要求：必须返回 title_uniqueness_checks，不能只写自然语言改名说明。',
      'title_uniqueness_checks 每项必须包含 key, label, status, old_title, new_title, outline_title_synced, file_name_synced, chapter_title_line_synced, evidence, remaining_risk。',
      '复检要求：细纲标题、正文文件名或正文标题行未同步时 status 不能写 pass/ok；只有重复标题数量为 0 且同步项全部为 true 才能关闭。',
      '关闭口径：重新运行标题去重检查，title_uniqueness_checks / chapter_title_uniqueness 必须为 pass/ok，重复标题数量为 0。',
    )
  }
  if (postBatchQualityRepair) {
    const hasTitleUniquenessWarning = postBatchQualityRepair.checks.some(item => (
      /title_uniqueness|chapter_title_uniqueness|标题去重|标题重复/.test(`${item.key} ${item.label}`)
    ))
    const hasProseMetaWarning = postBatchQualityRepair.checks.some(item => (
      /prose_meta|正文元信息|工程词/.test(`${item.key} ${item.label}`)
    ))
    const hasChapterHookWarning = postBatchQualityRepair.checks.some(item => (
      /chapter_hook|chapter_hook_quality|章尾钩子|翻页|追读/.test(`${item.key} ${item.label}`)
    ))
    const hasBlueprintConsumptionWarning = postBatchQualityRepair.checks.some(item => (
      /blueprint_consumption|chapter_blueprint|细纲兑现|对照细纲|大纲兑现/.test(`${item.key} ${item.label}`)
    ))
    const hasBannedWordsWarning = postBatchQualityRepair.checks.some(item => (
      /banned_words|forbidden_words|禁用词|模板表达/.test(`${item.key} ${item.label}`)
    ))
    const hasForeshadowingDeltaWarning = postBatchQualityRepair.checks.some(item => (
      /foreshadowing_delta|伏笔增量/.test(`${item.key} ${item.label}`)
    ))
    const hasDeterministicCleanupWarning = postBatchQualityRepair.checks.some(item => (
      /deterministic_cleanup|deterministic_prose_cleanup|确定性清理/.test(`${item.key} ${item.label}`)
    ))
    const hasStoryStateWarning = postBatchQualityRepair.checks.some(item => (
      /story_state|state_delta|状态机|状态更新|状态回填/.test(`${item.key} ${item.label}`)
    ))
    lines.push(
      '【oh-story批次质检回修】',
      postBatchQualityRepair.source ? `来源：${postBatchQualityRepair.source}` : '',
      postBatchQualityRepair.status ? `批次质检状态：${postBatchQualityRepair.status}` : '',
      postBatchQualityRepair.chapterNos.length > 0 ? `批次章节：${compactChapterNosForPrompt(postBatchQualityRepair.chapterNos)}` : '',
      postBatchQualityRepair.averageScore !== null && postBatchQualityRepair.averageScore !== undefined ? `平均质检分：${postBatchQualityRepair.averageScore}` : '',
      postBatchQualityRepair.revisedCount > 0 ? `已修订章节：${postBatchQualityRepair.revisedCount}` : '',
      ...postBatchQualityRepair.checks.flatMap(item => {
        const summary = item.summaries.length > 0 ? item.summaries.join('；') : `warn_count ${item.warnCount}`
        return [
          `${item.label}：${summary}`,
          item.key ? `质检键：${item.key}` : '',
        ]
      }),
      '修订要求：逐项清掉 oh-story Step 3 批次交稿后质检的 warn 项；正文元信息、章尾钩子、细纲兑现、伏笔增量、确定性清理和状态机更新必须回到正文事实与状态回填里。',
      '修订范围：只修 warn 项，不得重写已通过章节或检查项，不得改动批次外章节；保留已成立的主线事实、角色状态、伏笔、钩子和有效正文。',
      hasTitleUniquenessWarning ? '标题去重闭环：按本章核心事件重新命名重复章节，并同步细纲标题与正文文件名；不得只改任务说明或只改展示标题。' : '',
      hasProseMetaWarning ? '正文元信息闭环：标题行以外不得出现上一章/本章/前文/后文/伏笔/细纲/读者等工程词；必须改成角色当下能感知的事件锚点、相对时间、物件状态或对话信息。' : '',
      hasChapterHookWarning ? '章尾钩子闭环：章尾必须兑现本章收束状态、未解决问题和下一章推动力；补出新的选择、危险、信息差或目标压力，不得只用解释性总结收尾。' : '',
      hasBlueprintConsumptionWarning ? '细纲兑现闭环：对照内容概括五段式、情节安排多线、人物关系/出场顺序、代价/收益和结尾钩子逐项补正文；爽点前危机/期待铺垫必须可指认，装逼/打脸/揭露场要补在场配角差异化反应。' : '',
      hasBannedWordsWarning ? '禁用词扫描闭环：逐条替换一级禁用词/模板表达，改成具体动作、事实、口语化对白或场景内判断；修订后必须复扫为 0，不得用同义套话替换。' : '',
      hasForeshadowingDeltaWarning ? '伏笔增量修订边界：只处理本批正文新增、推进或回收的伏笔增量；不得做全书伏笔审计，不得通读全部正文重算伏笔台账。' : '',
      hasDeterministicCleanupWarning ? '确定性清理闭环：修订后必须让 MangaForge 确定性清理阶段复检通过，deterministic_prose_cleanup.risk_count 为 0；命中长省略号、破折号、双连字符、独立横线或高危 AI 句式时必须回正文改到复扫为 0，不得只在回执里声称已处理。' : '',
      hasStoryStateWarning ? '状态机更新闭环：把本批正文实际改变的角色状态、伏笔、时间线和资产状态写回 story_state_update/state_delta、character_updates、setting_updates 或 storyline_updates；每项必须带 source_excerpt/evidence 引用正文原句，不能只写摘要结论。' : '',
      '关闭口径：重新运行批次交稿后质检，确认 post_batch_quality_check.status 为 ok，所有 warn_count 清零，再继续下一批或扩批。',
    )
  }
  if (postDeliveryQualityRepair) {
    lines.push(
      '【oh-story单章交付后质检回修】',
      postDeliveryQualityRepair.source ? `来源：${postDeliveryQualityRepair.source}` : '',
      postDeliveryQualityRepair.chapterNo ? `目标章节：第${postDeliveryQualityRepair.chapterNo}章` : '',
      postDeliveryQualityRepair.status ? `交付后质检状态：${postDeliveryQualityRepair.status}` : '',
      postDeliveryQualityRepair.score !== null && postDeliveryQualityRepair.score !== undefined ? `交付后质检分：${postDeliveryQualityRepair.score}` : '',
      postDeliveryQualityRepair.checkLabel ? `质检项：${postDeliveryQualityRepair.checkLabel}` : '',
      postDeliveryQualityRepair.checkKey ? `质检键：${postDeliveryQualityRepair.checkKey}` : '',
      postDeliveryQualityRepair.checkStatus ? `质检项状态：${postDeliveryQualityRepair.checkStatus}` : '',
      postDeliveryQualityRepair.warnCount || postDeliveryQualityRepair.unknownCount ? `残留数量：warn ${postDeliveryQualityRepair.warnCount}，unknown ${postDeliveryQualityRepair.unknownCount}` : '',
      ...postDeliveryQualityRepair.summaries.map(summary => `质检摘要：${summary}`),
      postDeliveryQualityRepair.action ? `修复动作：${postDeliveryQualityRepair.action}` : '',
      postDeliveryQualityRepair.acceptanceCriteria.length > 0 ? `验收标准：${postDeliveryQualityRepair.acceptanceCriteria.join('；')}` : '',
      '修订要求：只修当前 Step 3 质检项，把问题改成当前章正文可见的动作、对白、信息变化、关系变化、物品状态变化或状态回填；不得把单章修复扩大成批次重写。',
      '输出要求：必须返回 post_delivery_quality.status、post_delivery_quality.score、post_delivery_quality.checks，不能只写 quality_refresh 或自然语言说明。',
      'post_delivery_quality.checks 每项必须包含 key, label, status, warn_count, unknown_count, fail_count, error_count, summary；本次目标质检键必须出现在 checks 中。',
      '复检要求：所有 post_delivery_quality.checks 都必须复检为 ok/pass/passed，warn_count/unknown_count/fail_count/error_count 必须为 0；否则任务保持 needs_review。',
      '关闭口径：重新运行当前章节交付后质检，确认 post_delivery_quality.checks 中该项复检为 ok，且不再为 warn/unknown。',
      '无人值守口径：确认 Step 3 全部 ok 后，再继续无人值守下一章。',
    )
  }
  if (volumeSegmentReview) {
    const missed = arrayValue(volumeSegmentReview.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【卷级阶段验收】',
      Array.isArray(volumeSegmentReview.planned) && volumeSegmentReview.planned.length > 0 ? `阶段要求：${volumeSegmentReview.planned.join('；')}` : '',
      Array.isArray(volumeSegmentReview.actual) && volumeSegmentReview.actual.length > 0 ? `实际呈现：${volumeSegmentReview.actual.join('；')}` : '',
      missed.length > 0 ? `漏兑现：${missed.join('；')}` : '',
      volumeSegmentReview.gate_summary ? `卷段提示：${volumeSegmentReview.gate_summary}` : '',
      '修订要求：必须补成可见的阶段结果，例如身份变化、资源入场、关系改写、势力态度转变、阶段反派败退或新门槛开启。',
      '不能把阶段结算继续后移，不能用解释性旁白代替现场冲突和结果兑现，不能提前消费后续卷末爆点。',
    )
  }
  if (expansionStructureDecisionReview) {
    const review = objectValue(expansionStructureDecisionReview)
    const defaultLaneRedesign = objectValue(review.default_five_chapter_lane_redesign || review.defaultFiveChapterLaneRedesign)
    const observationMetrics = arrayValue(review.observation_metrics || review.observationMetrics)
      .map(item => text(item))
      .filter(Boolean)
    const repeatedFailureReasons = arrayValue(defaultLaneRedesign.repeated_failure_reasons || defaultLaneRedesign.repeatedFailureReasons)
      .map(item => firstText(item?.reason, item?.label, item))
      .filter(Boolean)
    const missedChapterNos = arrayValue(review.missed_chapter_nos || review.missedChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0)
    const failedItems = arrayValue(review.failed_items || review.failedItems)
      .map(item => objectValue(item))
      .map(item => ({
        chapterNo: Number(item.chapter_no ?? item.chapterNo ?? 0),
        label: firstText(item.label, item.key, '结构决策漏项'),
        text: firstText(item.text, item.description, item.reason, item.issue),
      }))
      .filter(item => item.label || item.text)
    lines.push(
      '【扩批结构决策执行】',
      firstText(review.recommendation) ? `决策：${firstText(review.recommendation)}` : '',
      Number(review.target_chapter_count ?? review.targetChapterCount ?? 0) > 0 ? `目标批次：${Number(review.target_chapter_count ?? review.targetChapterCount)}章` : '',
      firstText(review.segment_label, review.segmentLabel) ? `观察段位：${firstText(review.segment_label, review.segmentLabel)}` : '',
      firstText(review.summary) ? `复盘结论：${firstText(review.summary)}` : '',
      firstText(review.instruction) ? `执行口径：${firstText(review.instruction)}` : '',
      observationMetrics.length > 0 ? `观察指标：${observationMetrics.join('；')}` : '',
      Object.keys(defaultLaneRedesign).length ? '【默认5章档位结构重构】' : '',
      Number(defaultLaneRedesign.relapse_count ?? defaultLaneRedesign.relapseCount ?? 0) > 0 ? `恢复判定连续失效：${Number(defaultLaneRedesign.relapse_count ?? defaultLaneRedesign.relapseCount)}次` : '',
      repeatedFailureReasons.length > 0 ? `同维复发：${repeatedFailureReasons.join('、')}` : '',
      firstText(defaultLaneRedesign.segment_duty_rewrite, defaultLaneRedesign.segmentDutyRewrite) ? `段位职责重写：${firstText(defaultLaneRedesign.segment_duty_rewrite, defaultLaneRedesign.segmentDutyRewrite)}` : '',
      firstText(defaultLaneRedesign.conflict_rotation, defaultLaneRedesign.conflictRotation) ? `冲突轮换：${firstText(defaultLaneRedesign.conflict_rotation, defaultLaneRedesign.conflictRotation)}` : '',
      firstText(defaultLaneRedesign.payoff_density, defaultLaneRedesign.payoffDensity) ? `回报密度：${firstText(defaultLaneRedesign.payoff_density, defaultLaneRedesign.payoffDensity)}` : '',
      firstText(defaultLaneRedesign.ending_hook_template, defaultLaneRedesign.endingHookTemplate) ? `章末追读模板：${firstText(defaultLaneRedesign.ending_hook_template, defaultLaneRedesign.endingHookTemplate)}` : '',
      missedChapterNos.length > 0 ? `漏项章节：第${missedChapterNos.join('、')}章` : '',
      ...failedItems.map(item => `${item.chapterNo > 0 ? `第${item.chapterNo}章` : ''}${item.label}：${item.text || '未提供可见执行证据'}`),
      '修订要求：逐章补齐扩批结构决策指定的段位职责、观察指标和必要的重构原则；恢复5章时不能淡化结构约束，小批验证时必须证明观察指标，单章重构时先改结构原则再写正文。',
      Object.keys(defaultLaneRedesign).length ? '默认档位回填要求：expansion_structure_decision_execution 必须显式回填 default_lane_segment_duty_delivered、default_lane_conflict_rotation_delivered、default_lane_payoff_density_delivered、default_lane_ending_hook_template_delivered，并在 evidence 中说明四项模板如何落到正文。' : '',
      '修订后必须重新回填 expansion_structure_decision_execution，并重新运行批次复盘，确认结构决策执行为 ok 后再放行下一批。',
    )
  }
  if (expansionStructureReview) {
    const review = objectValue(expansionStructureReview)
    const repeated = objectValue(review.repeated_hotspot_segment || review.repeatedHotspotSegment)
    const repeatedLabel = firstText(repeated.label, repeated.key, '复发段位')
    const repeatedCount = Number(repeated.count || 0)
    const latestChapterNos = arrayValue(review.latest_chapter_nos || review.latestChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0)
    const affectedChapterNos = arrayValue(review.affected_chapter_nos || review.affectedChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0)
    const hotspotSummaries = arrayValue(review.hotspot_summaries || review.hotspotSummaries)
      .map(item => text(item))
      .filter(Boolean)
    const structureActions = arrayValue(review.structure_actions || review.structureActions)
      .map(item => text(item))
      .filter(Boolean)
    const rollback = objectValue(review.rollback_policy || review.rollbackPolicy)
    const validationTrend = normalizeExpansionStructureValidationTrend(task, review)
    const defaultLaneTemplateRepair = normalizeDefaultFiveChapterLaneTemplateRepair(review)
    const defaultLaneTemplateRedesignQueue = normalizeDefaultFiveChapterLaneTemplateRedesignQueue(review)
    lines.push(
      '【扩批结构修复】',
      repeatedCount > 0 ? `复发段位：${repeatedLabel}连续 ${repeatedCount} 次` : `复发段位：${repeatedLabel}`,
      latestChapterNos.length > 0 ? `最近批次：第${latestChapterNos.join('、')}章` : '',
      affectedChapterNos.length > 0 ? `高危章节：第${affectedChapterNos.join('、')}章` : '',
      firstText(review.summary) ? `结构结论：${firstText(review.summary)}` : '',
      ...hotspotSummaries.map(item => `热区证据：${item}`),
      ...structureActions.map(item => `结构动作：${item}`),
      firstText(rollback.summary) ? `回退策略：${firstText(rollback.summary)}` : '',
      '修订要求：先改批次任务书、段位职责和章间节奏，不能只修单章语句或局部爽点；每章必须重新分配冲突来源、显性回报、主线推进和章末追读。',
      '修订后必须重新运行5章扩批分段复盘，确认该段位不再成为核心/回报/追读热区，再恢复5章安全连写。',
    )
    if (defaultLaneTemplateRedesignQueue) {
      lines.push(
        '【默认档位模板重构队列】',
        defaultLaneTemplateRedesignQueue.summary ? `稳定性画像：${defaultLaneTemplateRedesignQueue.summary}` : '',
        defaultLaneTemplateRedesignQueue.latestChapterNos.length > 0 ? `最近验证批：${compactChapterNosForPrompt(defaultLaneTemplateRedesignQueue.latestChapterNos)}` : '',
        defaultLaneTemplateRedesignQueue.validationBatchCount > 0 ? `验证批统计：失败 ${defaultLaneTemplateRedesignQueue.failedBatchCount}/${defaultLaneTemplateRedesignQueue.validationBatchCount} 批` : '',
        defaultLaneTemplateRedesignQueue.topFailedRequirement ? `高频缺项：${defaultLaneTemplateRedesignQueue.topFailedRequirement.label}失败 ${defaultLaneTemplateRedesignQueue.topFailedRequirement.failedCount} 次` : '',
        ...defaultLaneTemplateRedesignQueue.redesignRequirements.map(item => `重构模板：${item.label}：${item.instruction}`),
        defaultLaneTemplateRedesignQueue.validationStandard.length > 0 ? `下一轮验证标准：${defaultLaneTemplateRedesignQueue.validationStandard.join('；')}` : '',
        '修订要求：必须先重写默认5章档位的段位职责、冲突轮换、回报密度和章末追读模板，再改正文或批次任务书；不能只修单章缺项。',
        '回填要求：下一轮验证批必须逐章回填 default_lane_segment_duty_delivered、default_lane_conflict_rotation_delivered、default_lane_payoff_density_delivered、default_lane_ending_hook_template_delivered，并在连续2批全过后再恢复默认5章档位。',
      )
    }
    if (defaultLaneTemplateRepair) {
      const hasTemplateReceiptGap = defaultLaneTemplateRepair.missingRequirements.length > 0
        || defaultLaneTemplateRepair.missingCount > 0
        || Boolean(defaultLaneTemplateRepair.missingText)
      if (hasTemplateReceiptGap) {
        lines.push(
          '【默认档位模板验证缺项】',
          defaultLaneTemplateRepair.validationChapterNos.length > 0 ? `验证批次：${compactChapterNosForPrompt(defaultLaneTemplateRepair.validationChapterNos)}` : '',
          defaultLaneTemplateRepair.summary ? `验证结论：${defaultLaneTemplateRepair.summary}` : '',
          defaultLaneTemplateRepair.missingText ? `缺项章节：${defaultLaneTemplateRepair.missingText}` : '',
          defaultLaneTemplateRepair.missingCount > 0 ? `缺项数：${defaultLaneTemplateRepair.missingCount}` : '',
          ...defaultLaneTemplateRepair.repairActions.map(item => item),
          '修订要求：把缺失模板转成下一轮批次任务书的段位职责、冲突轮换、显性回报密度和章末追读检查项；不能只在说明里承认缺项。',
          '回填要求：修订后必须重新检查 expansion_structure_decision_execution，并显式回填 default_lane_segment_duty_delivered、default_lane_conflict_rotation_delivered、default_lane_payoff_density_delivered、default_lane_ending_hook_template_delivered。',
        )
      }
      const productionRelapseVerdict = defaultLaneTemplateRepair.productionRelapseVerdict
      if (productionRelapseVerdict || defaultLaneTemplateRepair.productionFailedRequirements.length) {
        const productionFailedRequirements = defaultLaneTemplateRepair.productionFailedRequirements.length
          ? defaultLaneTemplateRepair.productionFailedRequirements
          : productionRelapseVerdict?.failedRequirements || []
        lines.push(
          '【默认档位模板生产后验】',
          productionRelapseVerdict?.templateVersionId ? `模板版本：${productionRelapseVerdict.templateVersionId}` : '',
          productionRelapseVerdict?.defaultBatchChapterNos.length ? `真实复发批：${compactChapterNosForPrompt(productionRelapseVerdict.defaultBatchChapterNos)}` : '',
          productionRelapseVerdict?.restoreChapterNos.length ? `前置恢复批：${compactChapterNosForPrompt(productionRelapseVerdict.restoreChapterNos)}` : '',
          productionRelapseVerdict?.previousValidationChapterNos.length ? `前置验证批：${compactChapterNosForPrompt(productionRelapseVerdict.previousValidationChapterNos)}` : '',
          (productionRelapseVerdict?.validationChapterNos.length || defaultLaneTemplateRepair.validationChapterNos.length)
            ? `本轮验证批：${compactChapterNosForPrompt(productionRelapseVerdict?.validationChapterNos.length ? productionRelapseVerdict.validationChapterNos : defaultLaneTemplateRepair.validationChapterNos)}`
            : '',
          productionRelapseVerdict?.summary ? `生产后验结论：${productionRelapseVerdict.summary}` : '',
          productionRelapseVerdict?.remainingFailureReasons.length ? `仍复发维度：${productionRelapseVerdict.remainingFailureReasons.join('、')}` : '',
          productionRelapseVerdict?.clearedFailureReasons.length ? `已修复维度：${productionRelapseVerdict.clearedFailureReasons.join('、')}` : '',
          ...productionFailedRequirements.map(item => {
            const chapterText = item.chapterNos.length ? `：${compactChapterNosForPrompt(item.chapterNos)}` : ''
            const reasonText = item.failureReason ? `/${item.failureReason}` : ''
            return `生产失败项：${item.label || item.key}${reasonText}${chapterText}`
          }),
          '修订要求：必须把真实5章生产复发原因改写进当前模板版本，逐项重写段位职责、冲突轮换、回报密度和章末追读模板；不能只修验证批表面字段。',
          '关闭口径：下一轮3章验证批必须输出 production_relapse_verdict.status=passed，remaining_failure_reasons 为空；不能只补 default_lane_*_delivered 字段。',
        )
      }
    }
    if (validationTrend) {
      lines.push(
        '【扩批结构验证趋势】',
        `趋势段位：${validationTrend.segmentLabel}`,
        `验证通过率：${validationTrend.passRate}%（${validationTrend.passedBatchCount}/${validationTrend.validationBatchCount}批）`,
        validationTrend.latestChapterNos.length > 0 ? `最近验证批：第${validationTrend.latestChapterNos.join('、')}章` : '',
        validationTrend.failureReasons.length > 0 ? `失败主因：${validationTrend.failureReasons.map(item => `${item.label}${item.count}`).join('；')}` : '',
        validationTrend.recurrence.visible && validationTrend.recurrence.intervalLabel ? `复发间隔：${validationTrend.recurrence.intervalLabel}` : '',
        validationTrend.recurrence.recurrenceChapterNos.length > 0 ? `复发批次：第${validationTrend.recurrence.recurrenceChapterNos.join('、')}章` : '',
        validationTrend.summary ? `趋势结论：${validationTrend.summary}` : '',
        '修订要求：必须按长期复发惯性重写批次结构，把失败主因转成固定段位职责、冲突换源、显性回报和章末追读检查项；不能只处理本批表面风险。',
      )
    }
  }
  if (readerPullReview) {
    const missed = arrayValue(readerPullReview.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【读者拉力修复】',
      readerPullReview.expectation_label ? `期待兑现：${readerPullReview.expectation_label}` : '',
      readerPullReview.retention_label ? `追读钩子：${readerPullReview.retention_label}` : '',
      missed.length > 0 ? `漏兑现：${missed.join('；')}` : '',
      '修订要求：必须补出下一页动力，把承诺写成可见行动、冲突结果、情绪回报、危险选择或章末未解问题。',
      '不能只解释背景，不能用无关插科打诨稀释高压场景，不能把本章承诺继续拖成空头支票。',
      '输出要求：必须返回 reader_retention_checks，不能只写自然语言追读已修复。',
      'reader_retention_checks 每项必须包含 key, label, status, retention_engine, emotional_payoff, information_hunger, page_turn_question, evidence, fix, remaining_risk。',
      '缺少情绪回报、信息差饥饿或章末追读证据时 status 不能写 pass/ok。',
    )
  }
  if (innovationReview) {
    const missed = arrayValue(innovationReview.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【创新/IP化执行】',
      innovationReview.label ? `创新复盘：${innovationReview.label}` : '',
      missed.length > 0 ? `漏执行：${missed.join('；')}` : '',
      '修订要求：必须写成读者能复述的差异化体验，例如独特机制、反差选择、可视化反制、关系翻转或适合短剧/漫剧化的场面。',
      '不得只换名词不换体验；创新执行必须服务本章冲突、读者回报和长期设定，不能临时改主线方向。',
      '输出要求：必须返回 innovation_checks，不能只写自然语言创新已完成。',
      'innovation_checks 每项必须包含 key, label, status, innovation_type, differentiating_mechanism, visualized_scene, reader_retellable_hook, long_term_fit, evidence, fix, remaining_risk。',
      '只是重命名术语、没有可复述场面或没有正文证据时 status 不能写 pass/ok。',
    )
  }
  if (chapterAttractionReview) {
    const weakDimensions = arrayValue(chapterAttractionReview.weak_dimensions || chapterAttractionReview.weakDimensions || chapterAttractionReview.dimensions)
      .filter((item: any) => !firstText(item?.status) || firstText(item?.status) === 'warn')
      .map((item: any) => {
        const value = objectValue(item)
        const label = firstText(value.label, value.key, '吸引力缺口')
        const issue = firstText(value.issue, value.text, value.expected, value.repair_instruction, value.repairInstruction)
        return issue ? `${label}：${issue}` : label
      })
      .filter(Boolean)
    lines.push(
      '【章节吸引力修复】',
      chapterAttractionReview.score !== undefined && chapterAttractionReview.score !== null ? `吸引力评分：${chapterAttractionReview.score}` : '',
      firstText(chapterAttractionReview.label) ? `吸引力结论：${firstText(chapterAttractionReview.label)}` : '',
      firstText(chapterAttractionReview.priority_repair, chapterAttractionReview.priorityRepair) ? `优先项：${firstText(chapterAttractionReview.priority_repair, chapterAttractionReview.priorityRepair)}` : '',
      weakDimensions.length > 0 ? `缺口维度：${weakDimensions.join('；')}` : '',
      '修订要求：必须同时补强开篇钩子、场景目标/阻碍/转折/回报、爽点密度、章末翻页和可传播场面。',
      '不能只做语言润色；每一处新增内容都要转成现场行动、冲突结果、信息增量、情绪回报或下一章压力。',
      '输出要求：必须返回 chapter_attraction_checks，不能只写自然语言吸引力已增强。',
      'chapter_attraction_checks 每项必须包含 key, label, status, attraction_dimension, opening_hook, scene_goal_obstacle_turn_reward, payoff_density, ending_page_turn, spreadable_scene, evidence, fix, remaining_risk。',
      '开篇钩子、场景推进、爽点密度、章末翻页或可传播场面缺证据时 status 不能写 pass/ok。',
    )
  }
  appendRepairTaskQualitySyncPromptLines(lines, {
    approvalBlocker,
    assetLinkageSync,
    bannedWordsSync,
    benchmarkRecallSync,
    blueprintConsumptionSync,
    bridgeUnitSync,
    chapterBenchmarkSync,
    chapterHookQualitySync,
    chapterHookSync,
    chapterProgressionSync,
    chapterStructureSync,
    characterArcSync,
    characterBehaviorSync,
    characterRelationSync,
    conflictStructureSync,
    contentRubricSync,
    continuityHeatSync,
    coreContractCheckSync,
    deslopRepairCheckSync,
    deslopRepairReceiptRepair,
    deterministicCleanupSync,
    dialogueSync,
    emotionalArcSync,
    expectationThresholdSync,
    femaleAudienceSync,
    first30Retention,
    foreshadowingDeltaSync,
    genrePositioningSync,
    informationFlowSync,
    informationLoadSync,
    intentConfirmationSync,
    longformContinuitySync,
    nextChapterQualityPlanReceiptSync,
    openingSync,
    paragraphHookSync,
    plotDynamicsSync,
    proseCraftSync,
    proseMetaSync,
    proseRevisionReceiptSyncRepair,
    punctuationToneSync,
    qualityAuditRepair,
    qualityAuditRepairReceiptRepair,
    readerRetentionCheckSync,
    readerTrialReview,
    reversalSync,
    revisionCascadeImpactRepair,
    revisionContextReceiptRepair,
    revisionReceiptCheckSync,
    revisionScopeGuardRepair,
    sceneCardDirectiveRepair,
    sceneCardReceiptRepair,
    serialRiskRepairSync,
    showdownSync,
    sourceReadinessSync,
    stateTrackingSync,
    storyDriveSync,
    storyLoopSync,
    storyStateUpdateSync,
    styleBoundarySync,
    styleSampleSync,
    suspenseSync,
    targetReaderSync,
    task,
    upgradeRhythmSync,
    wordCountSync,
    writePreparationSync,
  })

  if (deliveryRisk) {
    lines.push(
      '【交稿风险证据】',
      deliveryRisk.source_label ? `风险来源：${deliveryRisk.source_label}` : '',
      deliveryRisk.severity ? `严重级别：${deliveryRisk.severity}` : '',
      deliveryRisk.annotation_key ? `批注键：${deliveryRisk.annotation_key}` : '',
    )
    for (const group of deliveryRisk.evidenceGroups) {
      for (const item of group.items) {
        lines.push(`${group.label}：${item}`)
      }
    }
    if (deliveryRisk.failedReceiptRepairs.length > 0) {
      lines.push(
        '【分段交稿风险回执修复】',
        '修订要求：逐条修复 delivery_risk_receipts 中 delivered=false 或 remaining_risk 非空的失败项；每条都要在对应段位补出可见动作、信息变化、选择压力、读者回报或章末追读。',
        ...deliveryRisk.failedReceiptRepairs.flatMap(deliveryRiskReceiptSegmentRepairLines),
        '回执要求：修订后 revision_receipts 必须逐条对应这些失败回执，changed_evidence 引用修订后正文原句，remaining_risk 为空才算闭环。',
      )
    }
    if (deliveryRisk.openingHandoffMissed.length > 0) {
      lines.push(
        '【开篇承接修复】',
        `承接欠账：${deliveryRisk.openingHandoffMissed.join('；')}`,
        '修订要求：重写或补写本章前 300-500 字，开篇先写角色对上一章钩子、危机、欠账或未解问题的直接反应。',
        '必须让上一章最后一幕在开篇形成连续行动、选择压力、危险反馈或信息增量，再展开本章新场景。',
        '不得从泛环境描写、空泛醒来或无关解释重新开场；不得把上一章钩子拖到中后段才提一句。',
        '输出要求：必须返回 chapter_handoff_checks，不能只写自然语言承接说明。',
        'chapter_handoff_checks 每项必须包含 key, label, status, previous_handoff, opening_obligation, opening_evidence, location, continuity_action, remaining_risk；location 必须指向前300-500字内的正文位置或原句。',
        '复检要求：前300-500字没有接住上一章钩子、危机、欠账或未解问题时 status 不能写 pass/ok；只有开篇形成连续行动、选择压力、危险反馈或信息增量，并能从 chapter_text 定位时，才能关闭。',
        '关闭口径：重新运行正文自检后，chapter_handoff_checks 必须确认 previous_handoff、opening_obligations、must_deliver、keep_alive 和 overdue 已落成正文证据，全部为 pass/ok。',
      )
    }
    if (deliveryRisk.openingPullRisk) {
      lines.push(
        '【开篇吸引力修复】',
        `开篇评分：${deliveryRisk.openingHookScore ?? '-'}`,
        '修订要求：重写或补写本章前 300 字，第一屏必须出现异常、危险、欲望或反常信息。',
        '必须把钩子、危机反馈、角色反应或信息增量写成现场动作/对话/选择压力。',
        '不得从泛环境描写或设定解释开场；不得把真正的钩子拖到中后段。',
      )
    }
    if (deliveryRisk.endingPageTurnRisk) {
      lines.push(
        '【章末翻页修复】',
        `章末评分：${deliveryRisk.endingHookScore ?? '-'}`,
        '修订要求：重写或补写本章最后 300 字，把危险升级、选择压力、反转、未解答案或利益诱惑压到最后一幕。',
        '必须让最后一段形成下一章非看不可的问题，同时保持本章事件已经交付。',
        '不得用总结、说明或情绪收束代替章末钩子；不得提前展开下一章完整剧情。',
      )
    }
    if (deliveryRisk.sceneProgressionRisk) {
      lines.push(
        '【场景推进修复】',
        `场景评分：${deliveryRisk.sceneReadabilityScore ?? '-'}`,
        '修订要求：补齐每个场景的目标、阻碍、转折、回报，把中段改成可见行动链和选择压力。',
        '必须让场景中的行动、对话或危机带来信息变化、关系变化、资源代价或局面转折。',
        '不得只补说明文字、环境描写或旁白总结；不得把场景修成设定大纲。',
      )
    }
    if (deliveryRisk.payoffDensityRisk) {
      lines.push(
        '【爽点密度修复】',
        `爽点密度评分：${deliveryRisk.payoffDensityScore ?? '-'}`,
        '修订要求：按每 800-1200 字至少一次信息推进、能力展示、危机反制、关系变化或小回收补足短周期回报。',
        '必须把读者回报写成可见行动结果、信息增量、情绪反转或小兑现。',
        '不得提前透支后续大高潮；新增爽点必须服务本章目标和长期主线。',
      )
    }
    lines.push(
      '【分类修订策略】',
      ...deliveryRisk.strategy,
      '不得改长期主线方向、不得新增未确认设定、不得提前揭示禁揭信息。',
      '修订范围只限当前章节正文；需要新增人物、物品、势力或能力时，只能以本章已出现内容补清楚，不能扩写成新设定大纲。',
    )
  }
  const requiresPreDraftExecutionReceipts = Boolean(
    stateTrackingSync
      || sourceReadinessSync
      || intentConfirmationSync
      || writePreparationSync
      || benchmarkRecallSync
      || nextChapterQualityPlanReceiptSync
      || styleSampleSync,
  )
  const requiresRevisionContextReceipts = Boolean(revisionContextReceiptRepair)
  lines.push(
    '【oh-story交付回执输出】',
    '修订结果必须输出 oh_story_delivery_receipts。',
    'oh_story_delivery_receipts 必须包含 revision_receipts、scene_card_receipts、delivery_risk_receipts；如本任务涉及去AI味或质量诊断修复，还必须包含 deslop_repair_receipts 或 quality_audit_repair_receipts。',
    requiresRevisionContextReceipts ? '如本任务涉及修订上下文回执，还必须包含 revision_context_receipts；同一份上下文核对结果要写入 oh_story_delivery_receipts.revision_context_receipts，不能只放在章节顶层。' : '',
    requiresPreDraftExecutionReceipts ? '如本任务涉及状态筛选、来源就绪、写前准备、意图确认、文风召回或样章策略，或质量续航回执，还必须包含 pre_draft_execution_receipts；状态筛选写入 status_filter_receipts，来源就绪写入 source_readiness_checks，写前准备写入 write_preparation_checks，意图确认写入 intent_confirmation_checks，文风召回写入 benchmark_recall_checks，样章策略写入 style_sample_checks，质量续航写入 next_chapter_quality_plan_receipts。' : '',
    '所有 changed_evidence/evidence 必须引用修订后 chapter_text 中可定位的动作、对白、信息变化、关系变化或物品状态变化。',
    '不能只散落在章节顶层或 scene_breakdown，不能只写“已修复/已完成”。',
  )
  return lines.filter(Boolean).join('\n')

}
